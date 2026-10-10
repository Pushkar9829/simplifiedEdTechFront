import { Children, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useIsPhone } from '../../hooks/useIsPhone';
import { statusToVariant } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { Icon } from '../Icon';

export { useIsPhone, statusToVariant, Icon };

const cx = (...parts) => parts.filter(Boolean).join(' ');

/**
 * Card. Optional header row: `heading` (title), `description`, `headerActions`.
 * `flush` removes padding (for tables/lists), `interactive` adds a hover affordance.
 */
export function ErpCard({
  children,
  size = 'default',
  className = '',
  heading,
  description,
  headerActions,
  flush = false,
  interactive = false,
  ...rest
}) {
  const base = size === 'sm' ? 'erp-card-sm' : 'erp-card';
  const hasHeader = heading || description || headerActions;
  return (
    <div
      className={cx(base, flush && 'erp-card-flush', interactive && 'erp-card-interactive', className)}
      {...rest}
    >
      {hasHeader ? (
        <div className="erp-card-header">
          <div className="erp-card-header-text">
            {heading ? <h3 className="erp-card-title">{heading}</h3> : null}
            {description ? <p className="erp-card-description">{description}</p> : null}
          </div>
          {headerActions ? <div className="erp-card-actions">{headerActions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Button. variant: primary | secondary | ghost | danger | icon.
 * size: sm | md | lg. `icon` / `iconRight` take Icon names; `loading` shows a spinner;
 * `iconOnly` (+ aria-label) makes a square icon button; `block` = full width.
 */
export function ErpButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  iconOnly = false,
  loading = false,
  block = false,
  className = '',
  type = 'button',
  disabled,
  ...rest
}) {
  const map = {
    primary: 'erp-btn-primary',
    secondary: 'erp-btn-secondary',
    ghost: 'erp-btn-ghost',
    danger: 'erp-btn-danger',
    icon: 'erp-icon-btn',
  };
  const iconSize = size === 'sm' ? 15 : 16;
  return (
    <button
      type={type}
      className={cx(
        map[variant] || map.primary,
        size === 'sm' && 'erp-btn-sm',
        size === 'lg' && 'erp-btn-lg',
        iconOnly && 'erp-btn-icon-only',
        block && 'erp-btn-block',
        loading && 'erp-btn-loading',
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="erp-spinner erp-spinner-sm" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={variant === 'icon' ? 18 : iconSize} />
      ) : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
}

function FieldMessages({ id, helper, error }) {
  return (
    <>
      {error ? (
        <p className="erp-field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
      {helper && !error ? (
        <p className="erp-field-help" id={`${id}-help`}>
          {helper}
        </p>
      ) : null}
    </>
  );
}

function describedBy(id, helper, error, existing) {
  const ids = [existing, error ? `${id}-error` : null, helper && !error ? `${id}-help` : null];
  return ids.filter(Boolean).join(' ') || undefined;
}

/** Labelled text input. Optional `helper` text, `error` message, `optional` marker. */
export function ErpInput({ className = '', label, id, helper, error, optional = false, ...rest }) {
  const autoId = useId();
  const inputId = id || (rest.name ? `${rest.name}-${autoId}` : autoId);
  return (
    <div className="field">
      {label && (
        <label className="erp-label" htmlFor={inputId}>
          {label}
          {optional ? <span className="erp-label-optional"> (optional)</span> : null}
        </label>
      )}
      <input
        id={inputId}
        className={cx('erp-input', className)}
        aria-invalid={error ? true : undefined}
        {...rest}
        aria-describedby={describedBy(inputId, helper, error, rest['aria-describedby'])}
      />
      <FieldMessages id={inputId} helper={helper} error={error} />
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
  leading = null,
  helper,
  error,
  ...rest
}) {
  const autoId = useId();
  const selectId = id || (name ? `${name}-${autoId}` : autoId);
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
      top: openUp ? 'auto' : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : 'auto',
      maxHeight: Math.min(320, Math.max(120, openUp ? r.top - 12 : spaceBelow - 12)),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle({});
      return undefined;
    }
    placeMenu();
    setQuery('');
    const selectedIdx = filtered.findIndex((o) => String(o.value) === String(value ?? ''));
    setHighlight(selectedIdx >= 0 ? selectedIdx : 0);
    const onWin = () => placeMenu();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
    // filtered/value only used to seed highlight when opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const t = window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(t);
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
    const list = menuRef.current?.querySelector('.erp-select-list');
    const item = menuRef.current?.querySelector('.erp-select-option-highlight');
    if (!list || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
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
        aria-invalid={error ? true : undefined}
      >
        {leading ? <span className="erp-select-leading">{leading}</span> : null}
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

  if (!label && !helper && !error) return selectNode;

  return (
    <div className="field">
      {label ? (
        <label className="erp-label" htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      {selectNode}
      <FieldMessages id={selectId} helper={helper} error={error} />
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

/** Status pill coloured via utils `statusToVariant`. `dot` adds a leading 6px dot. */
export function ErpStatusBadge({ status, children, className = '', dot = false }) {
  const variant = statusToVariant(status);
  return (
    <span className={cx('erp-status-badge', variant, dot && 'erp-badge-dot', className)}>
      {children ?? String(status ?? '').replace(/_/g, ' ')}
    </span>
  );
}

const TONE_CLASS = {
  neutral: 'erp-status-neutral',
  brand: 'erp-status-brand',
  success: 'erp-status-delivered',
  warning: 'erp-status-pending',
  danger: 'erp-status-cancelled',
  info: 'erp-status-shipped',
};

/** Generic pill. tone: neutral | brand | success | warning | danger | info. */
export function ErpBadge({ tone = 'neutral', dot = false, icon, className = '', children }) {
  return (
    <span
      className={cx('erp-status-badge', TONE_CLASS[tone] || TONE_CLASS.neutral, dot && 'erp-badge-dot', className)}
    >
      {icon ? <Icon name={icon} size={12} strokeWidth={2} /> : null}
      {children}
    </span>
  );
}

export function ErpTextarea({ className = '', label, id, helper, error, optional = false, ...rest }) {
  const autoId = useId();
  const inputId = id || (rest.name ? `${rest.name}-${autoId}` : autoId);
  return (
    <div className="field">
      {label && (
        <label className="erp-label" htmlFor={inputId}>
          {label}
          {optional ? <span className="erp-label-optional"> (optional)</span> : null}
        </label>
      )}
      <textarea
        id={inputId}
        className={cx('erp-input', className)}
        aria-invalid={error ? true : undefined}
        {...rest}
        aria-describedby={describedBy(inputId, helper, error, rest['aria-describedby'])}
      />
      <FieldMessages id={inputId} helper={helper} error={error} />
    </div>
  );
}

/**
 * Page header: optional `title` (h2) + `badge` (e.g. a status pill), `subtitle`
 * (one-line page description), optional `meta` row; `actions` sit on the right.
 * The shell top bar already shows the short page name, so list pages usually pass only subtitle.
 */
export function ErpPageHeader({ title, subtitle, actions, badge, meta, className = '' }) {
  return (
    <div className={cx('erp-page-header', className)}>
      <div className="erp-page-header-text">
        {title ? (
          <div className="erp-page-title-row">
            <h2 className="erp-page-title">{title}</h2>
            {badge}
          </div>
        ) : null}
        {subtitle && <p className="erp-page-subtitle">{subtitle}</p>}
        {meta ? <div className="erp-page-meta">{meta}</div> : null}
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
        <ErpButton
          variant="secondary"
          size="sm"
          icon="chevron-left"
          disabled={page <= 1}
          onClick={onPrev}
        >
          Prev
        </ErpButton>
        <ErpButton
          variant="secondary"
          size="sm"
          iconRight="chevron-right"
          disabled={page >= pages}
          onClick={onNext}
        >
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
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
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
  }, [open]);

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
            <Icon name="x" size={18} />
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

/** Tabs: each { value, label, count?, icon? }. variant: 'underline' (default) | 'segmented'. */
export function ErpTabs({ tabs, value, onChange, variant = 'underline', className = '' }) {
  return (
    <div
      className={cx('erp-tabs', variant === 'segmented' && 'erp-tabs-segmented', className)}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={`erp-tab${value === tab.value ? ' erp-tab-active' : ''}`}
          onClick={() => onChange?.(tab.value)}
        >
          {tab.icon ? <Icon name={tab.icon} size={16} /> : null}
          {tab.label}
          {tab.count != null && tab.count !== '' ? (
            <span className="erp-tab-count">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** Segmented control: options [{ value, label, icon? }]. */
export function ErpSegmented({ options, value, onChange, className = '', ...rest }) {
  return (
    <div className={cx('erp-segmented', className)} role="group" {...rest}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          className={cx('erp-segmented-item', value === o.value && 'is-active')}
          onClick={() => onChange?.(o.value)}
        >
          {o.icon ? <Icon name={o.icon} size={15} /> : null}
          {o.label}
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
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

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
            <Icon name="x" size={18} />
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
 * Optional: controlled `date` + `onDateChange`, `loading`, `emptyMessage` (shown when no events).
 */
export function ErpCalendar({
  events = [],
  onEventClick,
  onRangeChange,
  initialView = 'month',
  date,
  onDateChange,
  loading = false,
  emptyMessage = '',
}) {
  const [view, setView] = useState(initialView);
  const [innerCursor, setInnerCursor] = useState(() => startOfDay(date || new Date()));
  const cursor = date ? startOfDay(date) : innerCursor;
  const setCursor = (next) => {
    if (onDateChange) onDateChange(next);
    if (!date) setInnerCursor(next);
  };
  const onRangeRef = useRef(onRangeChange);
  useLayoutEffect(() => {
    onRangeRef.current = onRangeChange;
  });

  const days = useMemo(() => {
    if (view === 'week') {
      const start = mondayOf(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = mondayOf(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cursor.getTime()]);

  const rangeKey = `${days[0].toISOString()}|${days[days.length - 1].toISOString()}`;
  useEffect(() => {
    onRangeRef.current?.(days[0], addDays(days[days.length - 1], 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  const move = (dir) => {
    const next = new Date(cursor);
    if (view === 'week') next.setDate(next.getDate() + dir * 7);
    else {
      next.setDate(1);
      next.setMonth(next.getMonth() + dir);
    }
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
          <ErpButton variant="secondary" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>
            Today
          </ErpButton>
          <ErpButton
            variant="ghost"
            size="sm"
            iconOnly
            icon="chevron-left"
            aria-label="Previous"
            onClick={() => move(-1)}
          />
          <ErpButton
            variant="ghost"
            size="sm"
            iconOnly
            icon="chevron-right"
            aria-label="Next"
            onClick={() => move(1)}
          />
        </div>
        <strong>
          {label}
          {loading ? <span className="muted"> · Loading…</span> : null}
        </strong>
        <ErpTabs
          variant="segmented"
          value={view}
          onChange={setView}
          tabs={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
          ]}
        />
      </div>
      {emptyMessage && !loading && !events.length ? (
        <div className="muted" role="status" style={{ padding: '0.35rem 0' }}>
          {emptyMessage}
        </div>
      ) : null}
      <div className="erp-calendar-grid" aria-busy={loading || undefined} style={loading ? { opacity: 0.6 } : undefined}>
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

/** Light / dark segmented switch (sun / moon). */
export function ErpThemePicker() {
  const { mode, setMode } = useTheme();

  return (
    <div className="erp-theme-picker" role="group" aria-label="Color mode">
      <button
        type="button"
        className={`erp-icon-btn${mode === 'light' ? ' erp-theme-btn-active' : ''}`}
        onClick={() => setMode('light')}
        aria-pressed={mode === 'light'}
        aria-label="Light mode"
        title="Light mode"
      >
        <Icon name="sun" size={16} />
      </button>
      <button
        type="button"
        className={`erp-icon-btn${mode === 'dark' ? ' erp-theme-btn-active' : ''}`}
        onClick={() => setMode('dark')}
        aria-pressed={mode === 'dark'}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <Icon name="moon" size={16} />
      </button>
    </div>
  );
}

/** Single icon button that toggles light / dark. */
export function ErpThemeToggle({ className = '' }) {
  const { isDark, toggleMode } = useTheme();
  return (
    <button
      type="button"
      className={cx('erp-icon-btn', className)}
      onClick={toggleMode}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
    </button>
  );
}

/* ── Display primitives ──────────────────────────────── */

function avatarInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Avatar: image (`src`, run through mediaUrl) or initials from `name`. size: xs | sm | md | lg | xl. */
export function ErpAvatar({ name, src, size = 'md', className = '' }) {
  const [broken, setBroken] = useState(false);
  const cls = cx('erp-avatar', size !== 'md' && `erp-avatar-${size}`, className);
  if (src && !broken) {
    return (
      <img
        className={cx(cls, 'erp-avatar-img')}
        src={mediaUrl(src)}
        alt=""
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className={cls} aria-hidden={name ? undefined : true}>
      {avatarInitials(name)}
    </span>
  );
}

/**
 * KPI tile. `label`, `value`, optional `hint`, `icon` (+ `tone`: brand|success|warning|danger|info|neutral),
 * `delta` text with `trend` 'up' | 'down'. Pass `to` to render as a link.
 */
export function ErpStat({ label, value, hint, icon, tone = 'brand', delta, trend, to, className = '', children }) {
  const body = (
    <>
      <div className="erp-stat-head">
        <span className="erp-stat-label">{label}</span>
        {icon ? (
          <span className={cx('erp-stat-icon', tone !== 'brand' && `is-${tone}`)}>
            <Icon name={icon} size={16} />
          </span>
        ) : null}
      </div>
      <div className="erp-stat-value">{value}</div>
      {delta ? (
        <span className={cx('erp-stat-delta', trend === 'up' && 'is-up', trend === 'down' && 'is-down')}>
          {delta}
        </span>
      ) : null}
      {hint ? <span className="erp-stat-hint">{hint}</span> : null}
      {children}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cx('erp-stat', className)}>
        {body}
      </Link>
    );
  }
  return <div className={cx('erp-stat', className)}>{body}</div>;
}

/** Empty state: icon in a tinted circle, title, one-line help, optional action node. */
export function ErpEmptyState({ icon = 'inbox', title, description, action, className = '' }) {
  return (
    <div className={cx('erp-empty-state', className)}>
      <span className="erp-empty-state-icon">
        <Icon name={icon} size={20} />
      </span>
      {title ? <p className="erp-empty-state-title">{title}</p> : null}
      {description ? <p className="erp-empty-state-text">{description}</p> : null}
      {action ? <div className="erp-empty-state-action">{action}</div> : null}
    </div>
  );
}

const BANNER_ICON = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-triangle',
  neutral: 'info',
  brand: 'sparkles',
};

/**
 * Inline banner with left icon. variant: info | success | warning | danger | neutral | brand.
 * Optional `title`, `actions`, `onDismiss` (shows a close button).
 */
export function ErpBanner({ variant = 'info', title, icon, actions, onDismiss, className = '', children }) {
  const role = variant === 'danger' ? 'alert' : 'status';
  return (
    <div className={cx('erp-banner', `erp-banner-${variant}`, className)} role={role}>
      <span className="erp-banner-icon">
        <Icon name={icon || BANNER_ICON[variant] || 'info'} size={16} />
      </span>
      <div className="erp-banner-body">
        {title ? <div className="erp-banner-title">{title}</div> : null}
        {children ? <div className="erp-banner-text">{children}</div> : null}
      </div>
      {actions || onDismiss ? (
        <div className="erp-banner-actions">
          {actions}
          {onDismiss ? (
            <button type="button" className="erp-icon-btn erp-banner-close" onClick={onDismiss} aria-label="Dismiss">
              <Icon name="x" size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ErpSpinner({ size = 'md', className = '', label = 'Loading' }) {
  return (
    <span
      className={cx('erp-spinner', size === 'sm' && 'erp-spinner-sm', size === 'lg' && 'erp-spinner-lg', className)}
      role="status"
      aria-label={label}
    />
  );
}

/** Shimmer placeholder. Pass width/height (CSS values) or `lines` for a text block. */
export function ErpSkeleton({ width, height, lines = 0, radius, className = '' }) {
  if (lines > 0) {
    return (
      <div className={cx('stack', className)} style={{ gap: '0.5rem' }} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className="erp-skeleton"
            style={{ width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }
  return (
    <span
      className={cx('erp-skeleton', className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** Centered spinner + message (page/section loading). `fullscreen` fills the viewport. */
export function ErpLoadingState({ message = 'Loading…', fullscreen = false, className = '' }) {
  return (
    <div className={cx('erp-loading-state', fullscreen && 'is-fullscreen', className)} role="status">
      <span className="erp-spinner erp-spinner-lg" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/** Greeting hero: serif `title` (e.g. "Good evening, Aanya"), `subtitle`, right-side `actions`. */
export function ErpHero({ title, subtitle, actions, className = '' }) {
  return (
    <div className={cx('erp-hero', className)}>
      <div>
        <h2 className="erp-hero-title">{title}</h2>
        {subtitle ? <p className="erp-hero-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="erp-hero-actions">{actions}</div> : null}
    </div>
  );
}

/** "Next up" card: `eyebrow` (e.g. "Starts in 2h"), `title`, `meta` (array of {icon,text}), `actions`. */
export function ErpNextUp({ icon = 'video', eyebrow, title, meta = [], actions, className = '' }) {
  return (
    <div className={cx('erp-next-up', className)}>
      <span className="erp-next-up-icon">
        <Icon name={icon} size={22} />
      </span>
      <div className="erp-next-up-body">
        {eyebrow ? <p className="erp-next-up-eyebrow">{eyebrow}</p> : null}
        <p className="erp-next-up-title">{title}</p>
        {meta.length ? (
          <p className="erp-next-up-meta">
            {meta.filter(Boolean).map((m, i) => (
              <span key={i}>
                {m.icon ? <Icon name={m.icon} size={14} /> : null}
                {m.text}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      {actions ? <div className="erp-next-up-actions">{actions}</div> : null}
    </div>
  );
}

/** "Needs your attention" list. Wrap ErpAttentionItem children. */
export function ErpAttentionList({ children, className = '' }) {
  return <ul className={cx('erp-attention-list', className)}>{children}</ul>;
}

/** Attention row: `icon`, `tone` (warning|danger|info|success|brand|neutral), `title`, `meta`, `action`. */
export function ErpAttentionItem({ icon = 'info', tone = 'neutral', title, meta, action, to }) {
  const body = (
    <>
      <span className={cx('erp-attention-icon', tone !== 'neutral' && `is-${tone}`)}>
        <Icon name={icon} size={16} />
      </span>
      <span className="erp-attention-body">
        <span className="erp-attention-title">{title}</span>
        {meta ? <span className="erp-attention-meta">{meta}</span> : null}
      </span>
    </>
  );
  return (
    <li className="erp-attention-item">
      {to ? (
        <Link to={to} className="erp-list-hit" style={{ alignItems: 'center' }}>
          {body}
        </Link>
      ) : (
        body
      )}
      {action ? <span className="erp-attention-action">{action}</span> : null}
    </li>
  );
}
