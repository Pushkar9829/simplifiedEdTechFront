import { Children, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useIsPhone } from '../../hooks/useIsPhone';

export { useIsPhone };

export function ErpCard({ children, size = 'default', className = '', ...rest }) {
  const base = size === 'sm' ? 'erp-card-sm' : 'erp-card';
  return (
    <div className={`${base}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </div>
  );
}

export function ErpButton({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}) {
  const map = {
    primary: 'erp-btn-primary',
    secondary: 'erp-btn-secondary',
    danger: 'erp-btn-danger',
    icon: 'erp-icon-btn',
  };
  return (
    <button
      type={type}
      className={`${map[variant] || map.primary}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ErpInput({ className = '', label, id, ...rest }) {
  const inputId = id || rest.name;
  return (
    <div className="field">
      {label && (
        <label className="erp-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input id={inputId} className={`erp-input${className ? ` ${className}` : ''}`} {...rest} />
    </div>
  );
}

function flattenLabel(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenLabel).join('');
  if (node?.props?.children) return flattenLabel(node.props.children);
  return '';
}

function optionsFromChildren(children) {
  return Children.toArray(children)
    .filter((child) => child && typeof child === 'object' && 'props' in child)
    .map((child) => ({
      value: child.props.value,
      label: flattenLabel(child.props.children) || String(child.props.value ?? ''),
      disabled: Boolean(child.props.disabled),
    }));
}

export function ErpSelect({
  className = '',
  label,
  id,
  children,
  options,
  inline = false,
  wrapClassName = '',
  value,
  onChange,
  name,
  disabled = false,
  required = false,
  placeholder = 'Select',
  ...rest
}) {
  const selectId = id || name;
  const listId = useId();
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState({});

  const opts = useMemo(
    () => (options ? options : optionsFromChildren(children)),
    [options, children]
  );

  const selected = opts.find((o) => String(o.value) === String(value ?? ''));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opts;
    return opts.filter(
      (o) =>
        String(o.label).toLowerCase().includes(q) || String(o.value ?? '').toLowerCase().includes(q)
    );
  }, [opts, query]);

  const emit = (next) => {
    onChange?.({
      target: { value: next, name: name || '', type: 'select-one' },
      currentTarget: { value: next, name: name || '', type: 'select-one' },
    });
  };

  const placeMenu = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < 240 && r.top > spaceBelow;
    setMenuStyle({
      position: 'fixed',
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 180) - 8)),
      width: Math.max(r.width, 180),
      top: openUp ? undefined : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
      maxHeight: Math.min(320, openUp ? r.top - 12 : spaceBelow - 12),
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    placeMenu();
    setQuery('');
    const selectedIdx = filtered.findIndex((o) => String(o.value) === String(value ?? ''));
    setHighlight(selectedIdx >= 0 ? selectedIdx : 0);
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    const onWin = () => placeMenu();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
    // filtered/value only used to seed highlight when opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onEsc, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onEsc, true);
    };
  }, [open]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(filtered.length ? filtered.length - 1 : 0);
  }, [filtered.length, highlight]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector('.erp-select-option-highlight')?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const pick = (opt) => {
    if (!opt || opt.disabled) return;
    emit(opt.value);
    setOpen(false);
  };

  const moveHighlight = (dir) => {
    if (!filtered.length) return;
    let i = highlight;
    for (let n = 0; n < filtered.length; n += 1) {
      i = (i + dir + filtered.length) % filtered.length;
      if (!filtered[i].disabled) {
        setHighlight(i);
        return;
      }
    }
  };

  const onTriggerKey = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      wrapRef.current?.querySelector('.erp-select-trigger')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveHighlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(filtered[highlight]);
    }
  };

  const selectNode = (
    <div
      ref={wrapRef}
      className={`erp-select-wrap${inline ? ' erp-select-wrap-inline' : ''}${
        open ? ' erp-select-wrap-open' : ''
      }${wrapClassName ? ` ${wrapClassName}` : ''}`}
    >
      <select
        className="erp-select-sr"
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        required={required}
        disabled={disabled}
        value={value ?? ''}
        onChange={onChange}
      >
        {!opts.some((o) => String(o.value) === String(value ?? '')) ? (
          <option value={value ?? ''} />
        ) : null}
        {opts.map((o) => (
          <option key={`sr-${String(o.value)}`} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        {...rest}
        type="button"
        id={selectId}
        className={`erp-select erp-select-trigger${className ? ` ${className}` : ''}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
      >
        <span
          className={`erp-select-trigger-label${
            selected ? '' : ' erp-select-trigger-placeholder'
          }`}
        >
          {selected?.label || placeholder}
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="erp-select-menu"
              style={menuStyle}
              onKeyDown={onMenuKey}
            >
              <input
                ref={searchRef}
                type="search"
                className="erp-select-search"
                value={query}
                placeholder="Search"
                autoComplete="off"
                aria-label="Search options"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
              />
              <ul id={listId} className="erp-select-list" role="listbox">
                {filtered.length ? (
                  filtered.map((o, i) => (
                    <li key={String(o.value)}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={String(o.value) === String(value ?? '')}
                        disabled={o.disabled}
                        className={`erp-select-option${
                          String(o.value) === String(value ?? '') ? ' erp-select-option-active' : ''
                        }${i === highlight ? ' erp-select-option-highlight' : ''}`}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => pick(o)}
                      >
                        {o.label}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="erp-select-empty">No matches</li>
                )}
              </ul>
            </div>,
            document.body
          )
        : null}
    </div>
  );

  if (!label) return selectNode;

  return (
    <div className="field">
      <label className="erp-label" htmlFor={selectId}>
        {label}
      </label>
      {selectNode}
    </div>
  );
}

export function ErpDataTable({ children, className = '', ...rest }) {
  return (
    <table className={`erp-data-table${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </table>
  );
}

const STATUS_MAP = {
  pending: 'erp-status-pending',
  draft: 'erp-status-pending',
  awaiting_confirmation: 'erp-status-pending',
  assigned: 'erp-status-pending',
  submitted: 'erp-status-shipped',
  in_review: 'erp-status-shipped',
  shipped: 'erp-status-shipped',
  open: 'erp-status-shipped',
  in_progress: 'erp-status-shipped',
  approved: 'erp-status-delivered',
  paid: 'erp-status-delivered',
  graded: 'erp-status-delivered',
  completed: 'erp-status-delivered',
  present: 'erp-status-delivered',
  active: 'erp-status-delivered',
  resolved: 'erp-status-delivered',
  delivered: 'erp-status-delivered',
  cancelled: 'erp-status-cancelled',
  failed: 'erp-status-cancelled',
  rejected: 'erp-status-cancelled',
  absent: 'erp-status-cancelled',
  suspended: 'erp-status-cancelled',
  closed: 'erp-status-cancelled',
  inactive: 'erp-status-cancelled',
};

export function statusToVariant(status) {
  return STATUS_MAP[status] || 'erp-status-shipped';
}

export function ErpStatusBadge({ status, children, className = '' }) {
  const variant = statusToVariant(status);
  return (
    <span className={`erp-status-badge ${variant}${className ? ` ${className}` : ''}`}>
      {children ?? status}
    </span>
  );
}

export function ErpTextarea({ className = '', label, id, ...rest }) {
  const inputId = id || rest.name;
  return (
    <div className="field">
      {label && (
        <label className="erp-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <textarea id={inputId} className={`erp-input${className ? ` ${className}` : ''}`} {...rest} />
    </div>
  );
}

export function ErpPageHeader({ title, subtitle, actions }) {
  return (
    <div className="erp-page-header">
      <div>
        {title ? <h1 className="erp-page-title">{title}</h1> : null}
        {subtitle && <p className="erp-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="erp-header-actions">{actions}</div>}
    </div>
  );
}

export function ErpToolbar({ children, actions, className = '' }) {
  return (
    <div className={`erp-toolbar${className ? ` ${className}` : ''}`}>
      <div className="erp-toolbar-left">{children}</div>
      {actions ? <div className="erp-toolbar-right">{actions}</div> : null}
    </div>
  );
}

export function ErpSearch({ value, onChange, placeholder = 'Search', className = '', ...rest }) {
  return (
    <input
      type="search"
      className={`erp-search${className ? ` ${className}` : ''}`}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

export function ErpPager({ page, pages, total, noun = 'row', onPrev, onNext }) {
  return (
    <div className="erp-pager">
      <span className="muted">
        {total} {noun}
        {total === 1 ? '' : 's'} · page {page}/{pages}
      </span>
      <div className="row">
        <ErpButton variant="secondary" disabled={page <= 1} onClick={onPrev}>
          Prev
        </ErpButton>
        <ErpButton variant="secondary" disabled={page >= pages} onClick={onNext}>
          Next
        </ErpButton>
      </div>
    </div>
  );
}

export function ErpModal({
  open,
  title,
  size = 'md',
  onClose,
  footer,
  children,
  className = '',
}) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      const node = dialogRef.current;
      if (!node) return;
      const focusable = node.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || node).focus?.();
    }, 0);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={`modal erp-modal erp-modal-${size}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="erp-modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="erp-icon-btn" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>
        <div className="erp-modal-body">{children}</div>
        {footer ? <footer className="erp-modal-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}

export function ErpConfirm({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <ErpModal
      open={open}
      title={title}
      size="sm"
      onClose={onCancel}
      className="erp-modal-confirm"
      footer={
        <>
          <ErpButton variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </ErpButton>
          <ErpButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </ErpButton>
        </>
      }
    >
      <p className="erp-confirm-message">{message}</p>
    </ErpModal>
  );
}

export function ErpTabs({ tabs, value, onChange }) {
  return (
    <div className="erp-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={`erp-tab${value === tab.value ? ' erp-tab-active' : ''}`}
          onClick={() => onChange?.(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ErpList({ children, className = '' }) {
  return <ul className={`erp-list${className ? ` ${className}` : ''}`}>{children}</ul>;
}

export function ErpListItem({
  title,
  meta,
  status,
  statusLabel,
  leading,
  actions,
  onClick,
  to,
  children,
}) {
  const body = (
    <>
      {leading ? <div className="erp-list-leading">{leading}</div> : null}
      <div className="erp-list-main">
        <div className="erp-list-title-row">
          <strong className="erp-list-title">{title}</strong>
          {status ? <ErpStatusBadge status={status}>{statusLabel ?? status}</ErpStatusBadge> : null}
        </div>
        {meta ? <p className="erp-list-meta">{meta}</p> : null}
        {children}
      </div>
    </>
  );

  return (
    <li className="erp-list-item">
      {to ? (
        <Link className="erp-list-hit" to={to}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" className="erp-list-hit" onClick={onClick}>
          {body}
        </button>
      ) : (
        <div className="erp-list-hit">{body}</div>
      )}
      {actions ? <div className="erp-list-actions">{actions}</div> : null}
    </li>
  );
}

export function ErpOverflow({ items = [], label = 'More' }) {
  const [open, setOpen] = useState(false);
  const visible = (items || []).filter(Boolean);
  if (!visible.length) return null;

  return (
    <div className="erp-overflow">
      <ErpButton
        variant="secondary"
        className="erp-overflow-trigger"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </ErpButton>
      {open ? (
        <>
          <button
            type="button"
            className="erp-overflow-dismiss"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="erp-overflow-menu" role="menu">
            {visible.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  role="menuitem"
                  className={`erp-overflow-item${item.danger ? ' erp-overflow-item-danger' : ''}`}
                  to={item.to}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={`erp-overflow-item${item.danger ? ' erp-overflow-item-danger' : ''}`}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ErpStickyActions({ children, className = '' }) {
  return <div className={`erp-sticky-actions${className ? ` ${className}` : ''}`}>{children}</div>;
}

export function ErpDrawer({ open, title, onClose, footer, children }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="erp-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="erp-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="erp-modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="erp-icon-btn" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>
        <div className="erp-drawer-body">{children}</div>
        {footer ? <footer className="erp-modal-footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body
  );
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function mondayOf(d) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  return addDays(x, -day);
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/**
 * Month / week calendar. `events` items need { id, start, title, variant }.
 * `onRangeChange(from, to)` fires when the visible range changes.
 */
export function ErpCalendar({ events = [], onEventClick, onRangeChange, initialView = 'month' }) {
  const [view, setView] = useState(initialView);
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  const days = useMemo(() => {
    if (view === 'week') {
      const start = mondayOf(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = mondayOf(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const rangeKey = `${days[0].toISOString()}|${days[days.length - 1].toISOString()}`;
  useEffect(() => {
    onRangeChange?.(days[0], addDays(days[days.length - 1], 1));
  }, [rangeKey]);

  const move = (dir) => {
    const next = new Date(cursor);
    if (view === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    setCursor(next);
  };

  const today = new Date();
  const label =
    view === 'week'
      ? `${days[0].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(
          undefined,
          { day: 'numeric', month: 'short', year: 'numeric' }
        )}`
      : cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className={`erp-calendar${view === 'week' ? ' erp-calendar-week' : ''}`}>
      <div className="erp-calendar-head">
        <div className="row">
          <ErpButton variant="secondary" onClick={() => move(-1)}>
            Prev
          </ErpButton>
          <ErpButton variant="secondary" onClick={() => setCursor(startOfDay(new Date()))}>
            Today
          </ErpButton>
          <ErpButton variant="secondary" onClick={() => move(1)}>
            Next
          </ErpButton>
        </div>
        <strong>{label}</strong>
        <ErpTabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
          ]}
        />
      </div>
      <div className="erp-calendar-grid">
        {DOW.map((d) => (
          <div key={d} className="erp-calendar-dow">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = events
            .filter((e) => sameDay(new Date(e.start), day))
            .sort((a, b) => new Date(a.start) - new Date(b.start));
          const muted = view === 'month' && day.getMonth() !== cursor.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={`erp-calendar-cell${muted ? ' erp-calendar-cell-muted' : ''}${
                sameDay(day, today) ? ' erp-calendar-cell-today' : ''
              }`}
            >
              <span className="erp-calendar-date">{day.getDate()}</span>
              {dayEvents.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`erp-calendar-event${e.variant ? ` erp-calendar-event-${e.variant}` : ''}`}
                  title={e.title}
                  onClick={() => onEventClick?.(e)}
                >
                  {new Date(e.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}{' '}
                  {e.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ErpThemePicker() {
  const { mode, setMode } = useTheme();

  return (
    <div className="erp-theme-picker" role="group" aria-label="Color mode">
      <button
        type="button"
        className={`erp-icon-btn${mode === 'light' ? ' erp-theme-btn-active' : ''}`}
        onClick={() => setMode('light')}
        aria-pressed={mode === 'light'}
        title="Classic light mode"
      >
        Light
      </button>
      <button
        type="button"
        className={`erp-icon-btn${mode === 'dark' ? ' erp-theme-btn-active' : ''}`}
        onClick={() => setMode('dark')}
        aria-pressed={mode === 'dark'}
        title="Classic dark mode"
      >
        Dark
      </button>
    </div>
  );
}
