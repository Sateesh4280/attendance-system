import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Attendance from '../models/Attendance.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertObjectId, escapeRegex, parsePagination } from '../utils/validate.js';

export const listStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.class) {
    assertObjectId(req.query.class, 'class');
    filter.class = req.query.class;
  }
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    filter.$or = [{ name: rx }, { rollNo: rx }, { email: rx }, { phone: rx }];
  }

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('class', 'name code section')
      .sort({ rollNo: 1 })
      .skip(skip)
      .limit(limit),
    Student.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: students,
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

export const getStudent = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  const student = await Student.findById(req.params.id).populate('class', 'name code section');
  if (!student) throw new ApiError(404, 'Student not found');
  res.json({ success: true, data: student });
});

async function assertClassExists(classId) {
  assertObjectId(classId, 'class');
  const klass = await Class.findById(classId);
  if (!klass) throw new ApiError(404, 'Class not found');
  return klass;
}

export const createStudent = asyncHandler(async (req, res) => {
  const { name, rollNo, email, phone, class: classId, guardianName, guardianPhone, admissionDate } = req.body;
  if (!name || !rollNo || !classId) throw new ApiError(400, 'Name, roll number and class are required');

  await assertClassExists(classId);

  const exists = await Student.findOne({ rollNo: String(rollNo).toUpperCase().trim() });
  if (exists) throw new ApiError(409, 'A student with that roll number already exists');

  const student = await Student.create({
    name,
    rollNo,
    email: email || '',
    phone: phone || '',
    class: classId,
    guardianName: guardianName || '',
    guardianPhone: guardianPhone || '',
    admissionDate: admissionDate || undefined,
  });

  res.status(201).json({ success: true, message: 'Student added', data: student });
});

export const updateStudent = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  const { name, rollNo, email, phone, class: classId, guardianName, guardianPhone, status } = req.body;

  if (classId && String(classId) !== String(student.class)) {
    await assertClassExists(classId);
    student.class = classId;
  }
  if (rollNo && rollNo.toUpperCase().trim() !== student.rollNo) {
    const exists = await Student.findOne({ rollNo: String(rollNo).toUpperCase().trim() });
    if (exists) throw new ApiError(409, 'A student with that roll number already exists');
  }

  if (name !== undefined) student.name = name;
  if (rollNo !== undefined) student.rollNo = rollNo;
  if (email !== undefined) student.email = email;
  if (phone !== undefined) student.phone = phone;
  if (guardianName !== undefined) student.guardianName = guardianName;
  if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
  if (status !== undefined) student.status = status;

  await student.save();
  res.json({ success: true, message: 'Student updated', data: student });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  await Attendance.updateMany(
    { 'records.student': student._id },
    { $pull: { records: { student: student._id } } },
  );
  await Attendance.deleteMany({ records: { $size: 0 } });
  await student.deleteOne();

  res.json({ success: true, message: 'Student and related attendance entries were removed' });
});
