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
  { key: 'identityDoc', label: 'Identity document' },
  { key: 'degreeDoc', label: 'Degree document' },
  { key: 'certificateDoc', label: 'Teaching certificate' },
  { key: 'resumeDoc', label: 'Resume / CV' },
];

export function studentOptions(students = []) {
  return [
    { value: '', label: 'Select student' },
    ...students.map((s) => ({
      value: s._id,
      label: s.name || s.phone || 'Student',
    })),
  ];
}
