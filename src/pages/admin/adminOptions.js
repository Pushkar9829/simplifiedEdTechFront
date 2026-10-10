/** Shared option lists + label helpers for admin dropdowns */

export function titleCase(value) {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'student', label: 'Student' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'parent', label: 'Parent' },
  { value: 'admin', label: 'Admin' },
];

export const USER_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

export const USER_STATUS_SET_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'awaiting_confirmation', label: 'Awaiting confirmation' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Admin payment transitions, mirrored from the backend (payment.service ADMIN_TRANSITIONS). */
export const PAYMENT_TRANSITIONS = {
  pending: ['paid', 'failed'],
  awaiting_confirmation: ['paid', 'failed', 'pending'],
  failed: ['paid', 'pending'],
  paid: ['refunded'],
  refunded: [],
  cancelled: [],
};

export const PAYMENT_ACTION_LABELS = {
  paid: 'Mark paid',
  failed: 'Mark failed',
  pending: 'Reset to pending',
  refunded: 'Refund',
};

export const REFUND_OPEN_STATUSES = ['requested', 'accepted', 'disputed'];

export const TICKET_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const TICKET_STATUS_SET_OPTIONS = TICKET_STATUS_OPTIONS.filter((o) => o.value);

export const BILLING_CYCLE_OPTIONS = [
  { value: 'one_time', label: 'One time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'student', label: 'Students' },
  { value: 'tutor', label: 'Tutors' },
  { value: 'parent', label: 'Parents' },
  { value: 'admin', label: 'Admins' },
];

export const LEVEL_OPTIONS = [
  { value: 'HL', label: 'HL' },
  { value: 'SL', label: 'SL' },
  { value: 'N/A', label: 'N/A' },
];

export function resourceTypeOptions(includeAll = false) {
  const types = [
    'notes',
    'question_bank',
    'past_paper',
    'markscheme',
    'formula_sheet',
    'flashcards',
    'mind_map',
    'practice_test',
  ].map((t) => ({ value: t, label: titleCase(t) }));
  return includeAll ? [{ value: '', label: 'All types' }, ...types] : types;
}

export function subjectOptions(subjects = []) {
  return subjects.map((s) => ({ value: s._id, label: s.name }));
}

export const CAMPAIGN_CHANNEL_OPTIONS = [
  { value: 'organic', label: 'Organic' },
  { value: 'paid_ads', label: 'Paid ads' },
  { value: 'email', label: 'Email' },
  { value: 'referral', label: 'Referral' },
  { value: 'social', label: 'Social' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
];

export const CONFIG_VALUE_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'json', label: 'JSON' },
];

export function configValueType(value) {
  return typeof value === 'string' ? 'text' : 'json';
}

export function configValueText(value) {
  if (value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

/** Returns { value } or { error } for a config value typed as text or JSON. */
export function parseConfigValue(text, type) {
  if (type !== 'json') return { value: String(text ?? '') };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: 'Value is not valid JSON. Switch the type to Text to save it as plain text.' };
  }
}

/** Amount without a currency symbol (for values stored without a currency). */
export function plainAmount(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Plans are bought by students (parents pay as students) or tutors.
export const PLAN_AUDIENCE_OPTIONS = [
  { value: 'student', label: 'Students and parents' },
  { value: 'tutor', label: 'Tutors' },
];

/** Display name for a populated user ref. */
export function personName(u, fallback = '—') {
  if (!u) return fallback;
  return u.name || u.phone || fallback;
}
