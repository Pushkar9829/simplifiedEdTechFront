export function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
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

export function money(amount, currency = 'USD') {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(n);
  } catch {
    return `${currency || 'USD'} ${n}`;
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

export function statusBadge(status) {
  if (['paid', 'approved', 'graded', 'completed', 'present', 'active', 'resolved'].includes(status)) {
    return 'erp-status-badge erp-status-delivered';
  }
  if (
    ['pending', 'awaiting_confirmation', 'assigned', 'submitted', 'rescheduled', 'open', 'in_progress'].includes(
      status
    )
  ) {
    return 'erp-status-badge erp-status-pending';
  }
  if (['cancelled', 'failed', 'rejected', 'absent', 'suspended', 'closed', 'inactive'].includes(status)) {
    return 'erp-status-badge erp-status-cancelled';
  }
  return 'erp-status-badge erp-status-shipped';
}
