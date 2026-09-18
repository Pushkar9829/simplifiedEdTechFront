import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';

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

export function ErpSelect({
  className = '',
  label,
  id,
  children,
  options,
  inline = false,
  wrapClassName = '',
  ...rest
}) {
  const selectId = id || rest.name;
  const selectNode = (
    <div
      className={`erp-select-wrap${inline ? ' erp-select-wrap-inline' : ''}${
        wrapClassName ? ` ${wrapClassName}` : ''
      }`}
    >
      <select id={selectId} className={`erp-select${className ? ` ${className}` : ''}`} {...rest}>
        {options
          ? options.map((o) => (
              <option key={String(o.value)} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))
          : children}
      </select>
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
    <div className="erp-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`erp-tab${value === tab.value ? ' erp-tab-active' : ''}`}
          onClick={() => onChange?.(tab.value)}
        >
          {tab.label}
        </button>
      ))}
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
