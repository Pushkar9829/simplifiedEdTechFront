import { ErpAvatar, ErpSelect } from '../../components/erp';
import { childLabel } from '../../context/ParentChildContext';
import { childIdOf } from './parentData';
import './parent.css';

/** Prominent "Booking for {child}" context bar with an inline child switcher. */
export default function BookingForBar({ links, selectedId, onChange, help, actions }) {
  const current = links.find((c) => childIdOf(c) === String(selectedId));
  const name = current ? childLabel(current) : 'Select a child';
  return (
    <div className="pt-context" role="region" aria-label="Booking for">
      <ErpAvatar name={name} size="lg" />
      <div className="pt-context-text">
        <p className="pt-context-eyebrow">Booking for</p>
        <p className="pt-context-name">{name}</p>
        {help ? <p className="pt-context-help">{help}</p> : null}
      </div>
      <div className="pt-context-actions">
        {links.length > 1 ? (
          <ErpSelect
            inline
            aria-label="Change child"
            value={selectedId || ''}
            options={links.map((c) => ({ value: childIdOf(c), label: childLabel(c) }))}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : null}
        {actions}
      </div>
    </div>
  );
}
