export const STATUS_META = {
  present: { label: 'Present', short: 'P', tone: 'success' },
  absent: { label: 'Absent', short: 'A', tone: 'danger' },
  late: { label: 'Late', short: 'L', tone: 'warning' },
  excused: { label: 'Excused', short: 'E', tone: 'info' },
};

export const ATTENDANCE_STATUSES = Object.keys(STATUS_META);

export function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function shiftISO(days) {
  const base = new Date(`${todayISO()}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function classLabel(cls) {
  if (!cls) return 'Unassigned';
  if (typeof cls === 'string') return cls;
  return `${cls.name}${cls.section ? ` · ${cls.section}` : ''}`;
}

export function attendanceTone(percentage) {
  if (percentage >= 85) return 'success';
  if (percentage >= 75) return 'warning';
  return 'danger';
}

export function attendanceLabel(percentage) {
  if (percentage >= 85) return 'Good';
  if (percentage >= 75) return 'Watch';
  return 'At risk';
}
