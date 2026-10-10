/** Shared option lists for tutor dropdowns */

export { LEVEL_OPTIONS, resourceTypeOptions, subjectOptions, titleCase } from '../admin/adminOptions';

export const ATTENDANCE_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
];

export const LESSON_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
];

export const VERIFICATION_DOC_FIELDS = [
  { key: 'identity', label: 'Identity documents', hint: 'Passport, national ID, driving licence' },
  { key: 'degree', label: 'Degree documents', hint: 'Degree certificates and transcripts' },
  { key: 'certificate', label: 'Teaching certificates', hint: 'B.Ed, IB workshops, examiner letters' },
  { key: 'resume', label: 'Resume / CV', hint: 'Latest CV and experience letters' },
];

export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function timezoneOptions(extra = []) {
  let zones = [];
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = ['UTC'];
  }
  const all = [...new Set([...extra.filter(Boolean), ...zones])];
  return all.map((z) => ({ value: z, label: z.replaceAll('_', ' ') }));
}

export function studentOptions(students = []) {
  return [
    { value: '', label: 'Select student' },
    ...students.map((s) => ({
      value: s._id,
      label: s.name || s.phone || 'Student',
    })),
  ];
}

/** Tutor-local date/time with the zone abbreviation, e.g. "7 Oct 2026, 18:00 GMT+5:30". */
export function localTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }) + ` ${zoneAbbr(d)}`;
  } catch {
    return d.toLocaleString();
  }
}

function zoneAbbr(d) {
  try {
    const part = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName');
    return part?.value || '';
  } catch {
    return '';
  }
}

export function idOf(v) {
  return v && typeof v === 'object' ? String(v._id ?? v.id ?? '') : String(v ?? '');
}

/** Distinct students from bookings (newest first). Stopgap until a students endpoint exists. */
export function studentsFromBookings(bookings = []) {
  const uniq = new Map();
  bookings.forEach((b) => {
    const s = b.studentUserId;
    const id = idOf(s);
    if (id && s && typeof s === 'object' && !uniq.has(id)) uniq.set(id, { ...s, _id: id });
  });
  return [...uniq.values()];
}

export const STUDENT_PICKER_QUERY = { limit: 500, sort: '-startAt' };

/** "Good morning/afternoon/evening" by the viewer's local clock. */
export function greetingWord(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

/** Short relative label for a start time: "Live now", "Starts in 2h 15m", "Tomorrow, 18:00". */
export function startsLabel(startAt, endAt) {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return '';
  const now = Date.now();
  const end = endAt ? new Date(endAt).getTime() : start.getTime() + 3600000;
  const diff = start.getTime() - now;
  if (diff <= 0 && now < end) return 'In progress';
  if (diff <= 0) return 'Started';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `Starts in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Starts in ${hours}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (start.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${start.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}, ${time}`;
}

export function studentName(b) {
  return b?.studentUserId?.name || b?.studentUserId?.phone || 'Student';
}

/** A past, non-cancelled class still missing its session summary. */
export function needsReport(b) {
  return (
    b.status !== 'cancelled' &&
    b.meetingStatus !== 'no_show' &&
    !b.consumed &&
    new Date(b.startAt) < new Date() &&
    (b.status !== 'completed' || !b.sessionReportId)
  );
}

export const OPEN_CHANGE_STATUSES = ['pending', 'slots_offered', 'awaiting_replacement', 'awaiting_approval'];
