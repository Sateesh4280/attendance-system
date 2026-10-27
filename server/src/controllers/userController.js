import User from '../models/User.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertObjectId } from '../utils/validate.js';

/** List all team members (admin only). */
export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).trim(), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const users = await User.find(filter).sort({ createdAt: 1 });
  res.json({ success: true, data: users });
});

/** Lightweight teacher list used to populate dropdowns. */
export const listTeachers = asyncHandler(async (_req, res) => {
  const teachers = await User.find({ role: 'teacher', isActive: true }).select('name email');
  res.json({ success: true, data: teachers });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'teacher', phone = '' } = req.body;

  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password are required');
  if (String(password).length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
  if (!['admin', 'teacher'].includes(role)) throw new ApiError(400, 'Role must be admin or teacher');

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new ApiError(409, 'A user with that email already exists');

  const user = await User.create({ name, email, password, role, phone });
  res.status(201).json({ success: true, message: 'Team member added', data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');

  const { name, email, role, phone, isActive, password } = req.body;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) {
    if (!['admin', 'teacher'].includes(role)) throw new ApiError(400, 'Role must be admin or teacher');
    if (user._id.equals(req.user._id) && role !== 'admin') {
      throw new ApiError(400, 'You cannot remove your own admin role');
    }
    user.role = role;
  }
  if (phone !== undefined) user.phone = phone;
  if (isActive !== undefined) {
    if (user._id.equals(req.user._id) && isActive === false) {
      throw new ApiError(400, 'You cannot deactivate your own account');
    }
    user.isActive = Boolean(isActive);
  }
  if (password) {
    if (String(password).length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
    user.password = password;
  }

  await user.save();
  res.json({ success: true, message: 'Team member updated', data: user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'id');
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  // Detach the teacher from any classes/subjects instead of blocking the delete.
  await Promise.all([
    Class.updateMany({ teacher: user._id }, { $unset: { teacher: 1 } }),
    Subject.updateMany({ teacher: user._id }, { $unset: { teacher: 1 } }),
  ]);

  await user.deleteOne();
  res.json({ success: true, message: 'Team member removed' });
});
