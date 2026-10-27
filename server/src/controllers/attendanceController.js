import mongoose from 'mongoose';
import Attendance, { ATTENDANCE_STATUSES } from '../models/Attendance.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildRange, startOfDayUTC, toDateKey } from '../utils/date.js';
import { assertObjectId, parsePagination } from '../utils/validate.js';

const round1 = (value) => Math.round(value * 10) / 10;

const percentage = (attended, total) => (total > 0 ? round1((attended / total) * 100) : 0);

/** Return the roster + an existing sheet for a class/subject/date combination. */
export const getSession = asyncHandler(async (req, res) => {
  const { class: classId, subject: subjectId, date } = req.query;
  if (!classId || !subjectId || !date) {
    throw new ApiError(400, 'class, subject and date are required');
  }
  assertObjectId(classId, 'class');
  assertObjectId(subjectId, 'subject');

  const subject = await Subject.findById(subjectId);
  if (!subject) throw new ApiError(404, 'Subject not found');
  if (String(subject.class) !== String(classId)) {
    throw new ApiError(400, 'The selected subject does not belong to the selected class');
  }

  const day = startOfDayUTC(date);

  const [students, attendance] = await Promise.all([
    Student.find({ class: classId, status: 'active' })
      .select('name rollNo email')
      .sort({ rollNo: 1 }),
    Attendance.findOne({ class: classId, subject: subjectId, date: day }).populate('markedBy', 'name'),
  ]);

  res.json({
    success: true,
    data: { students, attendance, date: toDateKey(day) },
  });
});

/** Create or replace the attendance sheet for a class/subject/date. */
export const markAttendance = asyncHandler(async (req, res) => {
  const { class: classId, subject: subjectId, date, records } = req.body;

  if (!classId || !subjectId || !date) throw new ApiError(400, 'class, subject and date are required');
  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, 'At least one attendance record is required');
  }
  assertObjectId(classId, 'class');
  assertObjectId(subjectId, 'subject');

  const [klass, subject] = await Promise.all([Class.findById(classId), Subject.findById(subjectId)]);
  if (!klass) throw new ApiError(404, 'Class not found');
  if (!subject) throw new ApiError(404, 'Subject not found');
  if (String(subject.class) !== String(classId)) {
    throw new ApiError(400, 'The selected subject does not belong to the selected class');
  }

  const roster = await Student.find({ class: classId, status: 'active' }).select('_id');
  const rosterIds = new Set(roster.map((student) => student._id.toString()));

  const seen = new Set();
  const normalised = records.map((record) => {
    const studentId = String(record?.student || '');
    if (!rosterIds.has(studentId)) {
      throw new ApiError(400, `Student ${studentId || '(unknown)'} is not active in this class`);
    }
    if (seen.has(studentId)) throw new ApiError(400, 'Each student can only appear once in a sheet');
    seen.add(studentId);

    if (!ATTENDANCE_STATUSES.includes(record.status)) {
      throw new ApiError(400, `Invalid status "${record.status}"`);
    }

    return {
      student: studentId,
      status: record.status,
      remark: record.remark ? String(record.remark).slice(0, 300) : '',
    };
  });

  const day = startOfDayUTC(date);

  const attendance = await Attendance.findOneAndUpdate(
    { class: classId, subject: subjectId, date: day },
    { $set: { records: normalised, markedBy: req.user._id } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).populate('markedBy', 'name');

  res.status(200).json({
    success: true,
    message: 'Attendance saved',
    data: attendance,
    meta: { counts: Attendance.countsFor(attendance.records) },
  });
});

/** Paginated list of saved sessions. */
export const listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.class) {
    assertObjectId(req.query.class, 'class');
    filter.class = req.query.class;
  }
  if (req.query.subject) {
    assertObjectId(req.query.subject, 'subject');
    filter.subject = req.query.subject;
  }
  if (req.query.date) {
    filter.date = startOfDayUTC(req.query.date);
  } else if (req.query.from || req.query.to) {
    const { start, end } = buildRange(req.query.from, req.query.to, 30);
    filter.date = { $gte: start, $lte: end };
  }

  const [sessions, total] = await Promise.all([
    Attendance.find(filter)
      .populate('class', 'name code section')
      .populate('subject', 'name code')
      .populate('markedBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: sessions.map((session) => ({
      ...session.toJSON(),
      counts: Attendance.countsFor(session.records),
    })),
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

export const deleteAttendance = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  const session = await Attendance.findById(req.params.id);
  if (!session) throw new ApiError(404, 'Attendance session not found');
  await session.deleteOne();
  res.json({ success: true, message: 'Attendance session deleted' });
});

async function buildSummary({ classId, from, to }) {
  const { start, end } = buildRange(from, to, 30);

  // Aggregation pipelines bypass Mongoose casting, so query strings must be
  // converted to ObjectIds explicitly before being used in a $match stage.
  const classObjectId = classId ? new mongoose.Types.ObjectId(String(classId)) : null;

  const attendanceFilter = { date: { $gte: start, $lte: end } };
  if (classObjectId) attendanceFilter.class = classObjectId;

  const studentFilter = { status: 'active' };
  if (classId) studentFilter.class = classId;

  const [students, aggregates, sessionCount] = await Promise.all([
    Student.find(studentFilter).populate('class', 'name code section').sort({ name: 1 }),
    Attendance.aggregate([
      { $match: attendanceFilter },
      { $unwind: '$records' },
      {
        $group: {
          _id: '$records.student',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$records.status', 'excused'] }, 1, 0] } },
          attended: {
            $sum: { $cond: [{ $in: ['$records.status', ['present', 'late']] }, 1, 0] },
          },
        },
      },
    ]),
    Attendance.countDocuments(attendanceFilter),
  ]);

  const byStudent = new Map(aggregates.map((row) => [row._id.toString(), row]));

  const summary = students.map((student) => {
    const stats = byStudent.get(student._id.toString()) || {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attended: 0,
    };
    const percent = percentage(stats.attended, stats.total);

    return {
      student: {
        _id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        email: student.email,
        status: student.status,
      },
      class: student.class
        ? { _id: student.class._id, name: student.class.name, code: student.class.code, section: student.class.section }
        : null,
      sessions: stats.total,
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      excused: stats.excused,
      attended: stats.attended,
      percentage: percent,
    };
  });

  const withSessions = summary.filter((row) => row.sessions > 0);
  const average = withSessions.length
    ? round1(withSessions.reduce((sum, row) => sum + row.percentage, 0) / withSessions.length)
    : 0;

  return {
    summary,
    meta: {
      totalStudents: summary.length,
      sessions: sessionCount,
      average,
      atRisk: summary.filter((row) => row.sessions > 0 && row.percentage < 75).length,
      from: toDateKey(start),
      to: toDateKey(end),
    },
  };
}

/** Per-student attendance percentages for a class and date range. */
export const getSummary = asyncHandler(async (req, res) => {
  if (req.query.class) assertObjectId(req.query.class, 'class');
  const { summary, meta } = await buildSummary({
    classId: req.query.class,
    from: req.query.from,
    to: req.query.to,
  });

  res.json({ success: true, data: summary, meta });
});

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

/** CSV export of the same summary used by the reports screen. */
export const exportSummary = asyncHandler(async (req, res) => {
  if (req.query.class) assertObjectId(req.query.class, 'class');
  const { summary, meta } = await buildSummary({
    classId: req.query.class,
    from: req.query.from,
    to: req.query.to,
  });

  const header = ['Roll No', 'Student Name', 'Class', 'Sessions', 'Present', 'Absent', 'Late', 'Excused', 'Attendance %'];
  const rows = summary.map((row) => [
    row.student.rollNo,
    row.student.name,
    row.class ? `${row.class.name} - ${row.class.section}` : '',
    row.sessions,
    row.present,
    row.absent,
    row.late,
    row.excused,
    row.percentage,
  ]);

  const csv = [header, ...rows].map((line) => line.map(csvCell).join(',')).join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendance_${meta.from}_to_${meta.to}.csv"`);
  res.send(`\uFEFF${csv}`);
});

/** Per-student session history (used on the student detail drawer). */
export const getStudentAttendance = asyncHandler(async (req, res) => {
  assertObjectId(req.params.studentId, 'studentId');
  const student = await Student.findById(req.params.studentId);
  if (!student) throw new ApiError(404, 'Student not found');

  const { start, end } = buildRange(req.query.from, req.query.to, 30);

  const sessions = await Attendance.find({
    'records.student': student._id,
    date: { $gte: start, $lte: end },
  })
    .populate('class', 'name code section')
    .populate('subject', 'name code')
    .sort({ date: -1 });

  const history = sessions.map((session) => {
    const record = session.records.find((item) => item.student.equals(student._id));
    return {
      _id: session._id,
      date: session.date,
      class: session.class,
      subject: session.subject,
      status: record?.status,
      remark: record?.remark || '',
    };
  });

  const attended = history.filter((entry) => entry.status === 'present' || entry.status === 'late').length;

  res.json({
    success: true,
    data: history,
    meta: {
      student: { _id: student._id, name: student.name, rollNo: student.rollNo },
      total: history.length,
      attended,
      percentage: percentage(attended, history.length),
    },
  });
});
