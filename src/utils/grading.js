export const GRADING_SCHEME_OPTIONS = [
  { value: 'ib_1_7', label: 'IB scale (1–7)' },
  { value: 'percentage', label: 'Percentage (0–100%)' },
  { value: 'marks', label: 'Marks out of a total' },
  { value: 'letter', label: 'Letter grade (A*–U)' },
  { value: 'pass_fail', label: 'Pass / Fail' },
];

export const LETTER_OPTIONS = ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'U'].map((v) => ({ value: v, label: v }));

export const IB_OPTIONS = [7, 6, 5, 4, 3, 2, 1].map((v) => ({ value: String(v), label: `${v}` }));

export const PASS_FAIL_OPTIONS = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
];

export function schemeLabel(scheme) {
  return GRADING_SCHEME_OPTIONS.find((o) => o.value === scheme)?.label || 'IB scale (1–7)';
}

export function gradeLabel(grade) {
  if (!grade) return '';
  if (typeof grade === 'string') return grade;
  return grade.label || String(grade.value ?? '');
}

export function gradePercent(grade) {
  if (!grade || typeof grade !== 'object') return null;
  return Number.isFinite(grade.percentage) ? grade.percentage : null;
}

/** Default input value for a scheme. */
export function defaultGradeValue(scheme) {
  if (scheme === 'letter') return 'A';
  if (scheme === 'pass_fail') return 'pass';
  if (scheme === 'ib_1_7') return '5';
  return '';
}
