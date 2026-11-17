import { downloadBookingIcs } from '../api';
import { tutorRef } from '../utils/format';

/* ── Time helpers: the viewer's zone first, then the other party's ─────────── */

function fmt(value, timeZone, opts) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString(undefined, { ...opts, timeZone: timeZone || undefined });
  } catch {
    return d.toLocaleString(undefined, opts);
  }
}

const TIME = { hour: 'numeric', minute: '2-digit' };

/** "4:30 – 5:30 PM IST" in `timeZone`. */
export function timeRange(start, end, timeZone) {
  const a = fmt(start, timeZone, TIME);
  const b = end ? fmt(end, timeZone, { ...TIME, timeZoneName: 'short' }) : '';
  return b ? `${a} – ${b}` : fmt(start, timeZone, { ...TIME, timeZoneName: 'short' });
}

export function fullDay(value, timeZone) {
  return fmt(value, timeZone, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function sameOffset(a, b, at) {
  if (!a || !b) return !a && !b;
  if (a === b) return true;
  const o = (tz) => fmt(at, tz, { timeZoneName: 'longOffset' }).split(' ').pop();
  return o(a) === o(b);
}

/**
 * Other party's zone(s) for this viewer: students/parents see the tutor, tutors see the student,
 * admins see both. Returns [{ label, zone }].
 */
export function otherZones(b, role) {
  const tutorZone = b?.tutorUserId?.timezone;
  const studentZone = b?.studentUserId?.timezone || b?.timezone;
  if (role === 'student' || role === 'parent') return tutorZone ? [{ label: 'tutor', zone: tutorZone }] : [];
  if (role === 'tutor') return studentZone ? [{ label: 'student', zone: studentZone }] : [];
  return [
    studentZone && { label: 'student', zone: studentZone },
    tutorZone && { label: 'tutor', zone: tutorZone },
  ].filter(Boolean);
}

/** "4:30 PM IST · tutor 12:00 PM GMT" (other part dropped when the zones match). */
export function dualTime(b, role, viewerZone, { range = false } = {}) {
  if (!b?.startAt) return '';
  const mine = range
    ? timeRange(b.startAt, b.endAt, viewerZone)
    : fmt(b.startAt, viewerZone, { ...TIME, timeZoneName: 'short' });
  // Parties sharing one offset collapse into one entry ("student & tutor 5:30 PM GMT").
  const groups = [];
  otherZones(b, role)
    .filter((o) => !sameOffset(o.zone, viewerZone, b.startAt))
    .forEach((o) => {
      const g = groups.find((x) => sameOffset(x.zone, o.zone, b.startAt));
      if (g) g.labels.push(o.label);
      else groups.push({ zone: o.zone, labels: [o.label] });
    });
  const others = groups.map((g) => `${g.labels.join(' & ')} ${fmt(b.startAt, g.zone, { ...TIME, timeZoneName: 'short' })}`);
  return [mine, ...others].join(' · ');
}

/* ── Calendar export ───────────────────────────────────────────────────────── */

function gcalStamp(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function counterpart(b, role) {
  if (role === 'student' || role === 'parent') return `Tutor ${tutorRef(b.tutorUserId)}`;
  return b.studentUserId?.name || 'Student';
}

export function googleCalendarUrl(b, role) {
  const subject = b.subjectId?.name || 'Class';
  const link = b.meetingUrl || b.zoom?.joinUrl || '';
  const details = [
    `${subject}${b.level ? ` (${b.level})` : ''} · ${counterpart(b, role)}`,
    b.refCode ? `Booking ${b.refCode}` : '',
    b.deliveryMode === 'offline' ? 'Offline class' : link ? `Join: ${link}` : 'Online class — link in the Scholaris app',
    'Your class start and end codes are in the Scholaris app.',
  ]
    .filter(Boolean)
    .join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${subject} · ${counterpart(b, role)}`,
    dates: `${gcalStamp(b.startAt)}/${gcalStamp(b.endAt || b.startAt)}`,
    details,
  });
  if (b.deliveryMode !== 'offline' && link) params.set('location', link);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function saveBookingIcs(b) {
  const blob = await downloadBookingIcs(b._id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${b.refCode || 'class'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ── Status helpers ────────────────────────────────────────────────────────── */

export const PROOF = {
  verified: { tone: 'success', label: 'Codes verified', icon: 'shield-check' },
  overridden: { tone: 'info', label: 'Admin override', icon: 'shield-check' },
  start_due: { tone: 'warning', label: 'Start code due', icon: 'lock' },
  start_only: { tone: 'warning', label: 'End code due', icon: 'lock' },
  missing: { tone: 'danger', label: 'Missing proof', icon: 'alert-triangle' },
  upcoming: { tone: 'neutral', label: 'Codes at class time', icon: 'lock' },
};

export function proofOf(b) {
  return b?.proofStatus || b?.classProof?.status || '';
}

export const PAYMENT_LABEL = {
  pending: 'Unpaid',
  failed: 'Payment failed',
  awaiting_confirmation: 'Awaiting confirmation',
  paid: 'Paid',
  cancelled: 'Invoice cancelled',
  refunded: 'Refunded',
};

/** Calendar chip colour from booking status (+ missing proof for staff). */
export function bookingEventVariant(b, { proof = false } = {}) {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.status === 'completed') return proof && proofOf(b) === 'missing' ? 'missing' : 'completed';
  if (b.meetingStatus === 'live') return 'live';
  if (proof && proofOf(b) === 'missing') return 'missing';
  if (b.status === 'rescheduled') return 'rescheduled';
  if (b.status === 'pending') return 'pending';
  return b.deliveryMode === 'offline' ? 'offline' : 'online';
}

export function bookingTooltip(b, role, viewerZone) {
  const who = role === 'student' || role === 'parent' ? `Tutor ${tutorRef(b.tutorUserId)}` : b.studentUserId?.name || 'Student';
  return [
    `${b.subjectId?.name || 'Class'} · ${who}`,
    `${fullDay(b.startAt, viewerZone)} · ${dualTime(b, role, viewerZone, { range: true })}`,
    `${b.deliveryMode === 'offline' ? 'Offline' : 'Online'} · ${String(b.status || '').replaceAll('_', ' ')}${
      b.payment?.status ? ` · ${PAYMENT_LABEL[b.payment.status] || b.payment.status}` : ''
    }`,
    b.refCode || '',
  ]
    .filter(Boolean)
    .join('\n');
}

