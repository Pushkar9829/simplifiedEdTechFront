/** Admin page building blocks (page-local; built on the ERP kit). */
import {
  ErpAvatar,
  ErpBadge,
  ErpEmptyState,
  ErpSkeleton,
  ErpStatusBadge,
  Icon,
} from '../../components/erp';
import './admin.css';

const cx = (...parts) => parts.filter(Boolean).join(' ');

/** Flush card: optional view `tabs` node, one-row `toolbar`, content, `footer` (pager). */
export function AdminTableCard({ tabs, toolbar, children, footer, className = '' }) {
  return (
    <section className={cx('erp-card erp-card-flush adm-table-card', className)}>
      {tabs}
      {toolbar}
      {children}
      {footer}
    </section>
  );
}

/** Filter toolbar: search + filters on the left, count / actions on the right. */
export function AdminToolbar({ children, right }) {
  return (
    <div className="adm-toolbar">
      <div className="adm-toolbar-left">{children}</div>
      {right ? <div className="adm-toolbar-right">{right}</div> : null}
    </div>
  );
}

export function AdminFilterChip({ label, onClear }) {
  return (
    <span className="adm-filter-chip">
      <span>{label}</span>
      <button type="button" aria-label={`Clear filter ${label}`} onClick={onClear}>
        <Icon name="x" size={14} />
      </button>
    </span>
  );
}

/** Loading skeleton rows for a table card. */
export function AdminTableSkeleton({ rows = 6 }) {
  return (
    <div className="stack" style={{ padding: '1rem', gap: '0.875rem' }} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="row" style={{ gap: '0.75rem', flexWrap: 'nowrap' }}>
          <ErpSkeleton width="28px" height="28px" radius="999px" />
          <div style={{ flex: 1 }}>
            <ErpSkeleton lines={2} />
          </div>
          <ErpSkeleton width="72px" height="20px" radius="999px" />
        </div>
      ))}
    </div>
  );
}

/**
 * Body state for a list: loading skeleton, empty state, or no-match state.
 * Returns null when rows should render.
 */
export function AdminListState({ loading, empty, noMatch, emptyProps = {}, noMatchProps = {} }) {
  if (loading) return <AdminTableSkeleton />;
  if (empty) return <ErpEmptyState icon="inbox" {...emptyProps} />;
  if (noMatch)
    return (
      <ErpEmptyState
        icon="search"
        title="No matches"
        description="Try a different search or clear the filters."
        {...noMatchProps}
      />
    );
  return null;
}

/** Two-line cell: title + muted sub line, optional leading avatar. */
export function AdminCell({ title, sub, avatar, avatarName, tags, wrap = false }) {
  const body = (
    <div className={cx('adm-cell', wrap && 'adm-cell-wrap')}>
      <span className="adm-cell-title">
        {title}
        {tags ? <span className="adm-cell-tags"> {tags}</span> : null}
      </span>
      {sub ? <span className="adm-cell-sub">{sub}</span> : null}
    </div>
  );
  if (avatar === undefined && !avatarName) return body;
  return (
    <div className="adm-person">
      <ErpAvatar size="xs" name={avatarName || String(title || '')} src={avatar || undefined} />
      {body}
    </div>
  );
}

/** Trailing actions cell; stops row-click propagation. */
export function AdminRowActions({ children }) {
  return (
    <td className="adm-actions" onClick={(e) => e.stopPropagation()}>
      <span className="adm-actions-inner">{children}</span>
    </td>
  );
}

/** Modal summary band: eyebrow, big title, meta line, right side (status pill). */
export function AdminSummary({ eyebrow, title, meta, side, avatarName, avatarSrc }) {
  return (
    <div className="adm-summary">
      <div className="adm-summary-main">
        {avatarName ? <ErpAvatar size="lg" name={avatarName} src={avatarSrc} /> : null}
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <p className="adm-summary-eyebrow">{eyebrow}</p> : null}
          <p className="adm-summary-title">{title}</p>
          {meta ? <p className="adm-summary-meta">{meta}</p> : null}
        </div>
      </div>
      {side ? <div className="adm-summary-side">{side}</div> : null}
    </div>
  );
}

/** Titled section inside a modal. */
export function AdminSection({ title, description, actions, children }) {
  return (
    <section className="adm-section">
      {title || actions ? (
        <div className="adm-section-head">
          <div>
            {title ? <h3 className="adm-section-title">{title}</h3> : null}
            {description ? <p className="adm-section-desc">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Key-value grid. items: [{ label, value, full? }] — falsy items are skipped. */
export function AdminKV({ items }) {
  return (
    <dl className="adm-kv">
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className={item.full ? 'adm-kv-full' : undefined}>
          <dt>{item.label}</dt>
          <dd>{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Checkbox with a title + help line, for form toggles. */
export function AdminSwitch({ label, help, checked, onChange, disabled }) {
  return (
    <label className="adm-switch-row">
      <span>
        <strong>{label}</strong>
        {help ? <span>{help}</span> : null}
      </span>
      <input type="checkbox" checked={Boolean(checked)} onChange={onChange} disabled={disabled} />
    </label>
  );
}

/** Form section: overline title + two-column grid. */
export function AdminFormSection({ title, description, children }) {
  return (
    <div className="erp-form-section">
      {title ? (
        <div className="adm-form-head">
          <h3 className="adm-section-title">{title}</h3>
          {description ? <p className="adm-section-desc">{description}</p> : null}
        </div>
      ) : null}
      <div className="erp-form-grid">{children}</div>
    </div>
  );
}

const NEUTRAL_STATUSES = ['inactive', 'closed'];

/** Status pill with dot; inactive/closed read as neutral rather than danger. */
export function AdminStatus({ status, children }) {
  const label = children ?? titleCaseLocal(status);
  if (NEUTRAL_STATUSES.includes(String(status || '').toLowerCase())) {
    return (
      <ErpBadge tone="neutral" dot>
        {label}
      </ErpBadge>
    );
  }
  return (
    <ErpStatusBadge status={status} dot>
      {label}
    </ErpStatusBadge>
  );
}

function titleCaseLocal(value) {
  if (!value) return '';
  const s = String(value).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
