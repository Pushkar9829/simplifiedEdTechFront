/* Small presentational helpers shared by the pages in src/pages/shared. */
import { Icon } from '../../components/erp';

const cx = (...parts) => parts.filter(Boolean).join(' ');

/** Glyphs missing from the shared Icon set (same 24×24 / 1.75 stroke style). */
const LOCAL = {
  paperclip: (
    <path d="m21 11.5-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9" />
  ),
  send: (
    <>
      <path d="M21.5 2.5 10.5 13.5" />
      <path d="M21.5 2.5 14.5 21.5l-4-8-8-4z" />
    </>
  ),
};

export function GlyphIcon({ name, size = 18 }) {
  if (!LOCAL[name]) return <Icon name={name} size={size} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {LOCAL[name]}
    </svg>
  );
}

/** Leading icon in a tinted rounded square. tone: brand | success | warning | danger | info | neutral. */
export function RowIcon({ name, tone = 'brand', size = 'md' }) {
  return (
    <span className={cx('sp-row-icon', `is-${tone}`, size === 'sm' && 'is-sm')} aria-hidden="true">
      <Icon name={name} size={size === 'sm' ? 15 : 18} />
    </span>
  );
}

/**
 * Horizontal status track. steps: [{ key, label, state: 'done' | 'current' | 'todo' | 'danger' }].
 */
export function StatusTrack({ steps, className = '' }) {
  return (
    <ol className={cx('sp-track', className)}>
      {steps.map((s) => (
        <li key={s.key} className={cx('sp-track-step', `is-${s.state}`)}>
          <span className="sp-track-dot" aria-hidden="true">
            {s.state === 'done' ? <Icon name="check" size={11} strokeWidth={2.5} /> : null}
            {s.state === 'danger' ? <Icon name="x" size={11} strokeWidth={2.5} /> : null}
          </span>
          <span className="sp-track-label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
