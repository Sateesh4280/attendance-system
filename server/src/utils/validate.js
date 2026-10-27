import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';

export function assertObjectId(value, field = 'id') {
  if (!value || !mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `"${field}" must be a valid id`);
  }
  return value;
}

export function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
