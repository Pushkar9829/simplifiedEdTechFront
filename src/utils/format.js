export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatInZone(value, timeZone) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      timeZone: timeZone || undefined,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return new Date(value).toLocaleString();
  }
}

/** Format an amount; with no currency the number is shown without a symbol. */
export function money(amount, currency) {
  const n = Number(amount || 0);
  if (!currency) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}

export function countryLine(country, timezone, currency) {
  return [country, timezone, currency].filter(Boolean).join(' · ') || '—';
}

export function formatPlace(location = {}, country) {
  const loc = location || {};
  return [loc.area, loc.city, loc.state, country].filter(Boolean).join(', ') || '—';
}

export function tutorRef(user) {
  return user?.refCode || '—';
}

const STATUS_VARIANTS = {
  delivered: [
    'paid', 'approved', 'graded', 'completed', 'present', 'active', 'resolved', 'delivered',
    'verified', 'format_ok', 'confirmed', 'consumed', 'success', 'succeeded', 'settled', 'released',
  ],
  pending: [
    'pending', 'draft', 'awaiting_confirmation', 'assigned', 'unverified', 'not_submitted',
    'pending_review', 'processing', 'requested', 'held', 'on_hold', 'scheduled', 'rescheduled',
  ],
  shipped: ['submitted', 'in_review', 'shipped', 'open', 'in_progress', 'ready', 'refunded', 'partially_refunded'],
  cancelled: [
    'cancelled', 'canceled', 'failed', 'rejected', 'absent', 'suspended', 'closed', 'inactive',
    'blacklisted', 'blocked', 'expired', 'declined', 'no_show', 'disputed', 'overdue',
  ],
};

const STATUS_MAP = Object.fromEntries(
  Object.entries(STATUS_VARIANTS).flatMap(([variant, list]) =>
    list.map((status) => [status, `erp-status-${variant}`])
  )
);

/** Single source of truth: status value -> `erp-status-*` colour class. */
export function statusToVariant(status) {
  return STATUS_MAP[String(status || '').toLowerCase()] || 'erp-status-shipped';
}

export function statusBadge(status) {
  return `erp-status-badge ${statusToVariant(status)}`;
}
