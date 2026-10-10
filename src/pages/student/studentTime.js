/** Date helpers for student/parent pages: always the viewer's zone, with its abbreviation. */

export function viewerZone(user) {
  if (user?.timezone) return user.timezone;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function fmt(value, timeZone, opts) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  try {
    return d.toLocaleString(undefined, { ...opts, timeZone: timeZone || undefined });
  } catch {
    return d.toLocaleString(undefined, opts);
  }
}

/** e.g. "7 Oct 2026, 4:30 pm GMT+1" */
export function formatWhen(value, timeZone) {
  return fmt(value, timeZone, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/** e.g. "7 Oct 2026" */
export function formatDay(value, timeZone) {
  return fmt(value, timeZone, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function idOf(v) {
  return String(v?._id || v || '');
}

/** Map subject id -> name from any lists of subjects / populated subjectId fields. */
export function subjectNameMap(...lists) {
  const map = {};
  lists.flat().forEach((row) => {
    const s = row?.subjectId && typeof row.subjectId === 'object' ? row.subjectId : row;
    if (s?._id && s.name) map[String(s._id)] = s.name;
  });
  return map;
}

/** "Good morning" / "Good afternoon" / "Good evening" from the viewer's local clock. */
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

/** Human "in 2h 10m" / "in 3 days" / "started 20m ago". */
export function timeUntil(value, now = Date.now()) {
  if (!value) return '';
  const diff = new Date(value).getTime() - now;
  if (Number.isNaN(diff)) return '';
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  let text;
  if (mins < 1) text = 'less than a minute';
  else if (mins < 60) text = `${mins}m`;
  else if (mins < 60 * 24) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    text = m ? `${h}h ${m}m` : `${h}h`;
  } else {
    const d = Math.round(mins / (60 * 24));
    text = `${d} day${d === 1 ? '' : 's'}`;
  }
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}
