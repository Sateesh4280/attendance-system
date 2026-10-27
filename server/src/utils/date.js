import { ApiError } from './ApiError.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parse a date value (ISO string or Date) and normalise it to 00:00 UTC.
 * Attendance is tracked per calendar day, so the time component is dropped.
 */
export function startOfDayUTC(value, field = 'date') {
  if (!value) throw new ApiError(400, `"${field}" is required`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new ApiError(400, `"${field}" is not a valid date`);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

export function endOfDayUTC(value, field = 'date') {
  const start = startOfDayUTC(value, field);
  return new Date(start.getTime() + DAY_MS - 1);
}

/** Today's date in UTC at midnight (used as a fallback when no date is supplied). */
export function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Format a Date as YYYY-MM-DD. */
export function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Build a { $gte, $lte } range from optional from/to query values. */
export function buildRange(from, to, defaultDays = 30) {
  const end = to ? endOfDayUTC(to, 'to') : new Date();
  const start = from
    ? startOfDayUTC(from, 'from')
    : new Date(end.getTime() - (defaultDays - 1) * DAY_MS);

  if (start > end) throw new ApiError(400, '"from" must be before "to"');
  return { start, end };
}
