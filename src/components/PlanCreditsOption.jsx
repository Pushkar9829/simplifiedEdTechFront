import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMySubscription } from '../api';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';
import './PlanCreditsOption.css';

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * "Use plan credits (N left)" for the booking modal (decision #2).
 * Props: studentUserId (required for parents), classes (credits this booking needs, default 1),
 * checked (optional controlled value), onChange(useCredits: boolean, info).
 * Send `useCredits: true` in the createBooking body when checked.
 */
export default function PlanCreditsOption({ studentUserId, classes = 1, checked, onChange }) {
  const { user } = useAuth();
  const role = user?.role;
  const [info, setInfo] = useState(null);
  const [own, setOwn] = useState(false);
  const value = checked === undefined ? own : Boolean(checked);
  const enabled = role === 'student' || (role === 'parent' && Boolean(studentUserId));

  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    getMySubscription(role === 'parent' ? { studentUserId } : {})
      .then((d) => {
        if (live) setInfo(d || null);
      })
      .catch(() => {
        if (live) setInfo(null);
      });
    return () => {
      live = false;
    };
  }, [enabled, role, studentUserId]);

  const left = info?.active ? Number(info.creditsLeft) || 0 : 0;
  const need = Math.max(1, Number(classes) || 1);
  const enough = left >= need;

  // Drop the choice if the plan can no longer cover the booking (e.g. weekly repeat turned on).
  useEffect(() => {
    if (value && !enough) {
      setOwn(false);
      onChange?.(false, info);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enough]);

  if (!enabled || !info) return null;
  const plansPath = `/${role}/payments?tab=plans${role === 'parent' && studentUserId ? `&child=${studentUserId}` : ''}`;

  if (!info.active) {
    return (
      <div className="pco pco-empty">
        <Icon name="ticket" size={16} />
        <span>
          No active plan.{' '}
          <Link to={plansPath} className="erp-link">
            See plans
          </Link>{' '}
          to book with prepaid class credits.
        </span>
      </div>
    );
  }

  const sub = info.subscription || {};
  return (
    <label className={`pco${value ? ' pco-on' : ''}${enough ? '' : ' pco-disabled'}`}>
      <input
        type="checkbox"
        checked={value && enough}
        disabled={!enough}
        onChange={(e) => {
          setOwn(e.target.checked);
          onChange?.(e.target.checked, info);
        }}
      />
      <span className="pco-text">
        <span className="pco-title">
          Use plan credits ({left} left)
        </span>
        <span className="pco-hint">
          {enough
            ? `${sub.planName || 'Your plan'} · ${need} credit${need === 1 ? '' : 's'} for this booking · valid until ${fmtDate(sub.periodEnd)}. No invoice is created.`
            : `This booking needs ${need} credit${need === 1 ? '' : 's'}; your plan has ${left}.`}
        </span>
      </span>
    </label>
  );
}
