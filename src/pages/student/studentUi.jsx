/** Small presentational helpers shared by student (and parent-reused) pages. */
import { Link } from 'react-router-dom';
import { Icon } from '../../components/erp';

const cx = (...parts) => parts.filter(Boolean).join(' ');

const VARIANT = {
  primary: 'erp-btn-primary',
  secondary: 'erp-btn-secondary',
  ghost: 'erp-btn-ghost',
};

/** Router link styled as an ErpButton. */
export function LinkButton({ to, state, variant = 'primary', size = 'md', icon, iconRight, block, className, children, ...rest }) {
  const iconSize = size === 'sm' ? 15 : 16;
  return (
    <Link
      to={to}
      state={state}
      className={cx(VARIANT[variant] || VARIANT.primary, size === 'sm' && 'erp-btn-sm', block && 'erp-btn-block', className)}
      {...rest}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </Link>
  );
}

function partsIn(value, timeZone) {
  const d = new Date(value);
  const opt = (o) => {
    try {
      return d.toLocaleString(undefined, { ...o, timeZone: timeZone || undefined });
    } catch {
      return d.toLocaleString(undefined, o);
    }
  };
  return {
    month: opt({ month: 'short' }),
    day: opt({ day: 'numeric' }),
    weekday: opt({ weekday: 'short' }),
    time: opt({ hour: 'numeric', minute: '2-digit' }),
  };
}

/** Calendar-style date block (weekday / day / month) used as a list leading element. */
export function DateTile({ value, timeZone, tone, className }) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    return (
      <span className={cx('st-date-tile', className)} aria-hidden="true">
        <Icon name="calendar" size={18} />
      </span>
    );
  }
  const p = partsIn(value, timeZone);
  return (
    <span className={cx('st-date-tile', tone && `is-${tone}`, className)} aria-hidden="true">
      <span className="st-date-tile-month">{p.month}</span>
      <span className="st-date-tile-day">{p.day}</span>
      <span className="st-date-tile-week">{p.weekday}</span>
    </span>
  );
}

/** Square icon toggle for favourites / bookmarks. */
export function FavButton({ on, onClick, label, disabled, icon = 'heart' }) {
  return (
    <button
      type="button"
      className={cx('erp-icon-btn st-fav', on && 'is-on')}
      aria-pressed={Boolean(on)}
      aria-label={label || (on ? 'Remove from favourites' : 'Save to favourites')}
      title={label || (on ? 'Remove from favourites' : 'Save to favourites')}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

/** Rating as "★ 4.8 (12)" using the star icon, not a glyph. */
export function Rating({ value, count, className }) {
  const n = Number(value || 0);
  return (
    <span className={cx('st-rating', className)} title={`${n.toFixed(1)} out of 5`}>
      <Icon name="star" size={14} />
      <strong>{n ? n.toFixed(1) : 'New'}</strong>
      {count != null ? <span className="muted">({count})</span> : null}
    </span>
  );
}

/** Thin labelled progress bar. `value` 0–100. */
export function Meter({ value, label, hint }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="st-meter">
      {label || hint ? (
        <div className="st-meter-head">
          <span>{label}</span>
          <span className="erp-tabular">{hint}</span>
        </div>
      ) : null}
      <div className="st-meter-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className="st-meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
