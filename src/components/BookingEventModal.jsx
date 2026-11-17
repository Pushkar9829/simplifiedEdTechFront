import { useState } from 'react';
import { ErpBadge, ErpBanner, ErpButton, ErpModal, ErpStatusBadge, Icon } from './erp';
import { money, tutorRef } from '../utils/format';
import { PAYMENT_LABEL, PROOF, fullDay, googleCalendarUrl, otherZones, proofOf, sameOffset, saveBookingIcs, timeRange } from './bookingTime';
import './bookingTools.css';

/** "Add to Google Calendar" + "Download .ics". Drop into any booking detail or success screen. */
export function CalendarButtons({ booking, role, size = 'sm' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!booking?._id || booking.status === 'cancelled') return null;
  return (
    <div className="stack" style={{ gap: '0.4rem' }}>
      <div className="bk-cal-actions">
        <a
          className={`erp-btn-secondary${size === 'sm' ? ' erp-btn-sm' : ''}`}
          href={googleCalendarUrl(booking, role)}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="calendar" size={15} />
          Add to Google Calendar
        </a>
        <ErpButton
          variant="secondary"
          size={size}
          icon="download"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await saveBookingIcs(booking);
            } catch (err) {
              setError(err.message || 'Could not download the calendar file');
            } finally {
              setBusy(false);
            }
          }}
        >
          Download .ics
        </ErpButton>
      </div>
      {error ? <span className="erp-field-error">{error}</span> : null}
    </div>
  );
}

/* ── Status chips ── */

export function ProofChip({ booking, compact = false }) {
  const p = PROOF[proofOf(booking)];
  if (!p) return null;
  if (compact && proofOf(booking) === 'upcoming') return null;
  return (
    <ErpBadge tone={p.tone} icon={p.icon}>
      {p.label}
    </ErpBadge>
  );
}

export function PaymentPill({ booking }) {
  const p = booking?.payment;
  if (!p?.status) return null;
  return (
    <ErpStatusBadge status={p.status}>
      {PAYMENT_LABEL[p.status] || p.status.replaceAll('_', ' ')}
      {p.amount ? ` · ${money(p.amount, p.currency || booking.currency)}` : ''}
    </ErpStatusBadge>
  );
}

/* ── The modal ─────────────────────────────────────────────────────────────── */

/**
 * Booking details shown on calendar event click (and as "Details" from lists).
 * role: student | parent | tutor | admin. `actions`: [{ label, onClick, variant, icon, disabled, title }].
 */
export default function BookingEventModal({ open, booking, role, viewerZone, onClose, actions = [], children }) {
  if (!booking) return null;
  const b = booking;
  const staff = role === 'tutor' || role === 'admin';
  const people =
    role === 'admin'
      ? [
          { label: 'Student', value: b.studentUserId?.name || '—' },
          { label: 'Tutor', value: [b.tutorUserId?.name, tutorRef(b.tutorUserId)].filter(Boolean).join(' · ') },
        ]
      : staff
        ? [{ label: 'Student', value: b.studentUserId?.name || '—' }]
        : [
            { label: 'Tutor', value: tutorRef(b.tutorUserId) },
            role === 'parent' && b.studentUserId?.name ? { label: 'For', value: b.studentUserId.name } : null,
          ].filter(Boolean);
  const others = otherZones(b, role).filter((o) => !sameOffset(o.zone, viewerZone, b.startAt));
  const footerActions = actions.filter(Boolean);
  return (
    <ErpModal
      open={open}
      title={b.subjectId?.name || 'Class'}
      onClose={onClose}
      footer={
        <div className="bk-modal-actions">
          <ErpButton variant="secondary" onClick={onClose}>
            Close
          </ErpButton>
          {footerActions.map((a) => (
            <ErpButton
              key={a.label}
              variant={a.variant || 'primary'}
              icon={a.icon}
              disabled={a.disabled}
              title={a.title}
              onClick={a.onClick}
            >
              {a.label}
            </ErpButton>
          ))}
        </div>
      }
    >
      <div className="stack">
        <div className="bk-event-badges">
          {b.refCode ? <span className="erp-tag erp-tabular">{b.refCode}</span> : null}
          <ErpStatusBadge status={b.status} dot>
            {String(b.status || '').replaceAll('_', ' ')}
          </ErpStatusBadge>
          <PaymentPill booking={b} />
          {staff || ['verified', 'overridden'].includes(proofOf(b)) ? <ProofChip booking={b} /> : null}
          {b.consumed ? <ErpBadge>Consumed</ErpBadge> : null}
        </div>
        <div className="bk-event-when">
          <strong>{fullDay(b.startAt, viewerZone)}</strong>
          <span>{timeRange(b.startAt, b.endAt, viewerZone)}</span>
          {others.map((o) => (
            <span key={o.label} className="muted text-erp-sm">
              {o.label === 'tutor' ? 'Tutor' : 'Student'} time: {timeRange(b.startAt, b.endAt, o.zone)}
            </span>
          ))}
        </div>
        <dl className="bk-event-grid">
          {people.map((p) => (
            <FragmentRow key={p.label} label={p.label} value={p.value} />
          ))}
          <FragmentRow
            label="Mode"
            value={
              <span className="row" style={{ gap: '0.35rem' }}>
                <Icon name={b.deliveryMode === 'offline' ? 'map-pin' : 'video'} size={14} />
                {b.deliveryMode === 'offline' ? 'Offline' : 'Online'}
                {b.level ? <span className="erp-tag">{b.level}</span> : null}
              </span>
            }
          />
          {b.classProof?.override ? (
            <FragmentRow label="Override" value={b.classProof.override.reason || 'Approved by admin'} />
          ) : null}
        </dl>
        {proofOf(b) === 'missing' && (role === 'admin' || (role === 'tutor' && !['completed', 'cancelled'].includes(b.status))) ? (
          <ErpBanner variant="warning" icon="alert-triangle">
            {role === 'admin'
              ? 'This class started but the start/end codes were not both entered.'
              : 'The code window closed without both codes. Ask admin to confirm this class so you can complete it.'}
          </ErpBanner>
        ) : null}
        {children}
        <CalendarButtons booking={b} role={role} />
      </div>
    </ErpModal>
  );
}

function FragmentRow({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
