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
