import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertObjectId } from '../utils/validate.js';

export const listClasses = asyncHandler(async (_req, res) => {
  const classes = await Class.find().populate('teacher', 'name email').sort({ name: 1, section: 1 });

  const [studentCounts, subjectCounts] = await Promise.all([
    Student.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$class', count: { $sum: 1 } } },
    ]),
    Subject.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$class', count: { $sum: 1 } } },
    ]),
  ]);

  const studentsByClass = new Map(studentCounts.map((row) => [row._id.toString(), row.count]));
  const subjectsByClass = new Map(subjectCounts.map((row) => [row._id.toString(), row.count]));

  res.json({
    success: true,
    data: classes.map((klass) => ({
      ...klass.toJSON(),
      studentCount: studentsByClass.get(klass._id.toString()) || 0,
      subjectCount: subjectsByClass.get(klass._id.toString()) || 0,
    })),
  });
});

export const createClass = asyncHandler(async (req, res) => {
  const { name, code, section, academicYear, room, teacher } = req.body;
  if (!name || !code) throw new ApiError(400, 'Class name and code are required');
  if (teacher) assertObjectId(teacher, 'teacher');

  const exists = await Class.findOne({ code: String(code).toUpperCase().trim() });
  if (exists) throw new ApiError(409, 'A class with that code already exists');

  const klass = await Class.create({
    name,
    code,
    section: section || 'A',
    academicYear: academicYear || undefined,
    room: room || '',
    teacher: teacher || undefined,
  });

  res.status(201).json({ success: true, message: 'Class created', data: klass });
});

export const updateClass = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  const klass = await Class.findById(req.params.id);
  if (!klass) throw new ApiError(404, 'Class not found');

  const { name, code, section, academicYear, room, teacher, isActive } = req.body;
  if (code && code.toUpperCase().trim() !== klass.code) {
    const exists = await Class.findOne({ code: String(code).toUpperCase().trim() });
    if (exists) throw new ApiError(409, 'A class with that code already exists');
  }

  if (name !== undefined) klass.name = name;
  if (code !== undefined) klass.code = code;
  if (section !== undefined) klass.section = section;
  if (academicYear !== undefined) klass.academicYear = academicYear;
  if (room !== undefined) klass.room = room;
  if (teacher !== undefined) klass.teacher = teacher || undefined;
  if (isActive !== undefined) klass.isActive = Boolean(isActive);

  await klass.save();
  res.json({ success: true, message: 'Class updated', data: klass });
});

export const deleteClass = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  const klass = await Class.findById(req.params.id);
  if (!klass) throw new ApiError(404, 'Class not found');

  const studentCount = await Student.countDocuments({ class: klass._id });
  if (studentCount > 0) {
    throw new ApiError(
      400,
      `This class still has ${studentCount} student(s). Move or remove them before deleting the class.`,
    );
  }

  await Promise.all([
    Subject.deleteMany({ class: klass._id }),
    Attendance.deleteMany({ class: klass._id }),
  ]);
  await klass.deleteOne();

  res.json({ success: true, message: 'Class and its subjects were deleted' });
});
