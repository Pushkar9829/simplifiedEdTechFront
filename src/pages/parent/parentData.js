import { useCallback, useEffect, useRef, useState } from 'react';
import { parentDashboard } from '../../api';
import { errorMessage } from '../../utils/errors';
import { money } from '../../utils/format';

export const childIdOf = (link) => String(link?.studentUserId?._id || link?.studentUserId || '');

/** Load parent dashboards for several children (cached by child id). */
export function useChildDashboards(ids) {
  const [byId, setById] = useState({});
  const requested = useRef(new Set());
  const key = ids.filter(Boolean).join(',');

  const load = useCallback((id) => {
    if (!id) return;
    requested.current.add(id);
    setById((m) => ({ ...m, [id]: { ...(m[id] || {}), loading: true, error: '' } }));
    parentDashboard(id)
      .then((data) => setById((m) => ({ ...m, [id]: { data, loading: false, error: '' } })))
      .catch((err) =>
        setById((m) => ({ ...m, [id]: { ...(m[id] || {}), loading: false, error: errorMessage(err) } }))
      );
  }, []);

  useEffect(() => {
    key
      .split(',')
      .filter(Boolean)
      .forEach((id) => {
        if (!requested.current.has(id)) load(id);
      });
  }, [key, load]);

  return { byId, reload: load };
}

export function isOverdue(h) {
  if (h?.status === 'overdue') return true;
  return h?.status === 'assigned' && h.deadline && new Date(h.deadline) < new Date();
}

/** "USD 139 · INR 500" style list from a { currency: amount } map (positive amounts only). */
export function moneyList(map) {
  return Object.entries(map || {})
    .filter(([, amt]) => Number(amt) > 0)
    .map(([cur, amt]) => money(amt, cur));
}

/** Compact per-child figures derived from a parent dashboard payload. */
export function summarize(data) {
  if (!data) return null;
  const s = data.summary || {};
  const homework = data.homework || [];
  const byStatus = data.homeworkByStatus || {};
  const listedOverdue = homework.filter(isOverdue).length;
  const overdue = Math.max(listedOverdue, byStatus.overdue || 0);
  const unpaid = (data.paymentsByStatus?.pending || 0) + (data.paymentsByStatus?.failed || 0);
  const due = moneyList(s.pendingByCurrency);
  const nextClass = (data.upcomingClasses || [])
    .filter((b) => b.status !== 'cancelled')
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0];
  const present = data.attendance?.present || 0;
  const absent = data.attendance?.absent || 0;
  return {
    upcoming: s.upcomingCount || 0,
    homeworkOpen: s.homeworkOpen || 0,
    overdue,
    unpaid,
    due,
    nextClass,
    present,
    absent,
    attendanceRate: present + absent > 0 ? Math.round((present / (present + absent)) * 100) : null,
    streak: s.studyStreak || 0,
  };
}

/** Short relative label for a future date: "in 45 min", "in 5 h", "tomorrow", "in 3 days". */
export function timeUntil(value) {
  const ms = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'now';
  const min = Math.round(ms / 60000);
  if (min < 60) return `in ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `in ${hours} h`;
  const start = new Date(value);
  const today = new Date();
  const dayDiff = Math.round(
    (new Date(start.getFullYear(), start.getMonth(), start.getDate()) -
      new Date(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000
  );
  if (dayDiff === 1) return 'tomorrow';
  return `in ${dayDiff} days`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}
