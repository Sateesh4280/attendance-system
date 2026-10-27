import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { addDays, startOfDayUTC, todayUTC, toDateKey, endOfDayUTC } from '../utils/date.js';

const round1 = (value) => Math.round(value * 10) / 10;

export const getDashboard = asyncHandler(async (req, res) => {
  const day = req.query.date ? startOfDayUTC(req.query.date) : todayUTC();
  const dayEnd = endOfDayUTC(day);
  const weekStart = addDays(day, -6);
  const monthStart = addDays(day, -29);

  const [students, classes, subjects, teachers, todayRows, trendRows, classRows, lowRows, recent] =
    await Promise.all([
      Student.countDocuments({ status: 'active' }),
      Class.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      Attendance.aggregate([
        { $match: { date: { $gte: day, $lte: dayEnd } } },
        { $unwind: '$records' },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            attended: { $sum: { $cond: [{ $in: ['$records.status', ['present', 'late']] }, 1, 0] } },
          },
        },
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: weekStart, $lte: dayEnd } } },
        { $unwind: '$records' },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } },
            total: { $sum: 1 },
            attended: { $sum: { $cond: [{ $in: ['$records.status', ['present', 'late']] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: day, $lte: dayEnd } } },
        { $unwind: '$records' },
        {
          $group: {
            _id: '$class',
            total: { $sum: 1 },
            attended: { $sum: { $cond: [{ $in: ['$records.status', ['present', 'late']] }, 1, 0] } },
          },
        },
        { $lookup: { from: 'classes', localField: '_id', foreignField: '_id', as: 'class' } },
        { $unwind: '$class' },
        { $sort: { 'class.name': 1 } },
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: monthStart, $lte: dayEnd } } },
        { $unwind: '$records' },
        {
          $group: {
            _id: '$records.student',
            total: { $sum: 1 },
            attended: { $sum: { $cond: [{ $in: ['$records.status', ['present', 'late']] }, 1, 0] } },
          },
        },
        { $match: { total: { $gte: 5 } } },
        {
          $addFields: {
            percentage: { $round: [{ $multiply: [{ $divide: ['$attended', '$total'] }, 100] }, 1] },
          },
        },
        { $match: { percentage: { $lt: 75 } } },
        { $sort: { percentage: 1 } },
        { $limit: 6 },
        { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } },
        { $unwind: '$student' },
        { $lookup: { from: 'classes', localField: 'student.class', foreignField: '_id', as: 'class' } },
        { $unwind: { path: '$class', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            studentId: '$_id',
            name: '$student.name',
            rollNo: '$student.rollNo',
            total: 1,
            attended: 1,
            percentage: 1,
            className: {
              $cond: [
                { $ifNull: ['$class', false] },
                { $concat: ['$class.name', ' - ', '$class.section'] },
                'Unassigned',
              ],
            },
          },
        },
      ]),
      Attendance.find()
        .populate('class', 'name code section')
        .populate('subject', 'name code')
        .populate('markedBy', 'name')
        .sort({ date: -1, createdAt: -1 })
        .limit(5),
    ]);

  const today = todayRows[0] || { total: 0, attended: 0 };
  const trendMap = new Map(trendRows.map((row) => [row._id, row]));

  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const key = toDateKey(date);
    const row = trendMap.get(key) || { total: 0, attended: 0 };
    return {
      date: key,
      label: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      total: row.total,
      attended: row.attended,
      percentage: row.total ? round1((row.attended / row.total) * 100) : 0,
    };
  });

  res.json({
    success: true,
    data: {
      date: toDateKey(day),
      stats: {
        students,
        classes,
        subjects,
        teachers,
        todayTotal: today.total,
        todayAttended: today.attended,
        todayPercentage: today.total ? round1((today.attended / today.total) * 100) : 0,
      },
      trend,
      classesToday: classRows.map((row) => ({
        _id: row._id,
        name: row.class.name,
        code: row.class.code,
        section: row.class.section,
        total: row.total,
        attended: row.attended,
        percentage: row.total ? round1((row.attended / row.total) * 100) : 0,
      })),
      lowAttendance: lowRows,
      recent: recent.map((session) => ({
        ...session.toJSON(),
        counts: Attendance.countsFor(session.records),
      })),
    },
  });
});
