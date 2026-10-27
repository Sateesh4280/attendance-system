import Subject from '../models/Subject.js';
import Class from '../models/Class.js';
import Attendance from '../models/Attendance.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertObjectId } from '../utils/validate.js';

export const listSubjects = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.class) {
    assertObjectId(req.query.class, 'class');
    filter.class = req.query.class;
  }
  if (req.query.all !== 'true') filter.isActive = true;

  const subjects = await Subject.find(filter)
    .populate('teacher', 'name email')
    .populate('class', 'name code section')
    .sort({ name: 1 });

  res.json({ success: true, data: subjects });
});

export const createSubject = asyncHandler(async (req, res) => {
  const { name, code, class: classId, teacher, creditHours } = req.body;
  if (!name || !code || !classId) throw new ApiError(400, 'Name, code and class are required');

  assertObjectId(classId, 'class');
  const klass = await Class.findById(classId);
  if (!klass) throw new ApiError(404, 'Class not found');
  if (teacher) assertObjectId(teacher, 'teacher');

  const exists = await Subject.findOne({ class: classId, code: String(code).toUpperCase().trim() });
  if (exists) throw new ApiError(409, 'That subject code already exists for this class');

  const subject = await Subject.create({ name, code, class: classId, teacher, creditHours });

  res.status(201).json({ success: true, message: 'Subject added', data: subject });
});

export const updateSubject = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  const subject = await Subject.findById(req.params.id);
  if (!subject) throw new ApiError(404, 'Subject not found');

  const { name, code, teacher, creditHours, isActive } = req.body;
  if (name !== undefined) subject.name = name;
  if (code !== undefined) subject.code = code;
  if (teacher !== undefined) subject.teacher = teacher || undefined;
  if (creditHours !== undefined) subject.creditHours = creditHours;
  if (isActive !== undefined) subject.isActive = Boolean(isActive);

  await subject.save();
  res.json({ success: true, message: 'Subject updated', data: subject });
});

export const deleteSubject = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  const subject = await Subject.findById(req.params.id);
  if (!subject) throw new ApiError(404, 'Subject not found');

  const sessionCount = await Attendance.countDocuments({ subject: subject._id });
  if (sessionCount > 0) {
    throw new ApiError(
      400,
      `This subject has ${sessionCount} attendance session(s). Deactivate it instead of deleting.`,
    );
  }

  await subject.deleteOne();
  res.json({ success: true, message: 'Subject deleted' });
});
