import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ErpButton, Icon } from '../../components/erp';

/**
 * Compact "more" menu for table rows, cards and drawer footers.
 * Rendered in a portal with fixed positioning so scroll containers never clip it.
 * items: [{ label, icon?, onClick, danger? }]. align: 'end' (menu right edge under the button) | 'start'.
 */
export default function TutorRowMenu({ items = [], label = 'More actions', variant = 'ghost', size = 'sm', text, align = 'end' }) {
  const visible = items.filter(Boolean);
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState({});

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuH = visible.length * 38 + 10;
    const up = window.innerHeight - r.bottom < menuH + 12 && r.top > menuH;
    const alignLeft = align === 'start' && r.left + 200 < window.innerWidth - 8;
    setStyle({
      position: 'fixed',
      left: alignLeft ? r.left : 'auto',
      right: alignLeft ? 'auto' : Math.max(8, window.innerWidth - r.right),
      top: up ? 'auto' : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : 'auto',
    });
  }, [open, visible.length, align]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!visible.length) return null;

  return (
    <span className="tutor-row-menu" onClick={(e) => e.stopPropagation()}>
      <span ref={btnRef} style={{ display: 'inline-flex' }}>
        <ErpButton
          variant={variant}
          size={size}
          icon={text ? undefined : 'more-horizontal'}
          iconRight={text ? 'chevron-down' : undefined}
          iconOnly={!text}
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {text}
        </ErpButton>
      </span>
      {open
        ? createPortal(
            <>
              <button
                type="button"
                className="erp-overflow-dismiss"
                aria-label="Close menu"
                style={{ zIndex: 1200 }}
                onClick={() => setOpen(false)}
              />
              <div className="erp-menu" role="menu" style={{ ...style, zIndex: 1201 }}>
                {visible.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className={`erp-menu-item${item.danger ? ' erp-menu-item-danger' : ''}`}
                    onClick={() => {
                      setOpen(false);
                      item.onClick?.();
                    }}
                  >
                    {item.icon ? <Icon name={item.icon} size={16} /> : null}
                    {item.label}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )
        : null}
    </span>
  );
}
