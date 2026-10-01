import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  cancelBooking,
  declineReschedule,
  getBookingSummary,
  joinBooking,
  listBookings,
  listScheduleChanges,
  proposeReplacementTutor,
  requestReschedule,
  searchTutors,
  selectRescheduleSlot,
  sendBookingFeedback,
} from '../../api';
import ClassToolsModal from '../../components/ClassToolsModal';
import {
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpConfirm,
  ErpModal,
  ErpOverflow,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { countryLine, formatInZone, tutorRef } from '../../utils/format';
import { useCatalog } from '../../context/CatalogContext';
import { slotOptions, titleCase } from './studentOptions';

function canChangeBooking(b) {
  return Boolean(b && b.status !== 'cancelled' && b.status !== 'completed');
}

function hoursUntil(startAt) {
  return (new Date(startAt).getTime() - Date.now()) / 3600000;
}

function canFeedback(b) {
  return Boolean(
    b && b.status !== 'cancelled' && (b.status === 'completed' || new Date(b.endAt) <= new Date())
  );
}

function placeLine(loc = {}) {
  return [loc.label, loc.area, loc.city, loc.state, loc.address].filter(Boolean).join(', ') || 'See tutor profile';
}

export default function StudentBookings() {
  const location = useLocation();
  const isParent = location.pathname.startsWith('/parent');
  const findPath = isParent ? '/parent/tutors' : '/student/tutors';
  const { options } = useCatalog();
  const policyPath = isParent ? '/parent/policy' : '/student/policy';
  const [items, setItems] = useState([]);
  const [changes, setChanges] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [view, setView] = useState('list');
  const [modeFilter, setModeFilter] = useState('all');
  const [pendingCancel, setPendingCancel] = useState(null);
  const [reschedule, setReschedule] = useState(null);
  const [replacements, setReplacements] = useState([]);
  const [joinTools, setJoinTools] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [offlinePlace, setOfflinePlace] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [d, c] = await Promise.all([listBookings(), listScheduleChanges()]);
      setItems(d.items || []);
      setChanges(Array.isArray(c) ? c : c.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const modeItems = useMemo(
    () => (modeFilter === 'all' ? items : items.filter((b) => (b.deliveryMode || 'online') === modeFilter)),
    [items, modeFilter]
  );

  const upcoming = useMemo(() => {
    const now = new Date();
    return modeItems.filter(
      (b) => new Date(b.endAt || b.startAt) >= now && b.status !== 'cancelled' && b.status !== 'completed'
    );
  }, [modeItems]);

  const past = useMemo(
    () => modeItems.filter((b) => b.status === 'completed' || b.status === 'cancelled' || new Date(b.endAt || b.startAt) < new Date()),
    [modeItems]
  );

  const visible = tab === 'upcoming' ? upcoming : tab === 'completed' ? past : modeItems;

  const list = useListFilter(
    visible,
    (b) =>
      [b.subjectId?.name, b.tutorUserId?.refCode, b.status, b.deliveryMode].filter(Boolean).join(' '),
    { resetKey: `${tab}-${modeFilter}` }
  );

  const events = useMemo(
    () =>
      (list.filtered || visible).map((b) => ({
        id: b._id,
        start: b.startAt,
        title: `${b.subjectId?.name || 'Lesson'} · ${tutorRef(b.tutorUserId)}`,
        variant:
          b.status === 'cancelled'
            ? 'cancelled'
            : b.status === 'completed'
              ? 'completed'
              : b.deliveryMode === 'offline'
                ? 'offline'
                : 'online',
        booking: b,
      })),
    [list.filtered, visible]
  );

  const openChangeFor = (bookingId) =>
    changes.find(
      (c) =>
        String(c.bookingId?._id || c.bookingId) === String(bookingId) &&
        ['pending', 'slots_offered', 'awaiting_replacement', 'awaiting_approval'].includes(c.status)
    );

  const openReschedule = async (booking) => {
    try {
      const data = await requestReschedule(booking._id);
      const status = data.change?.status;
      const slots = data.slots || [];
      setReschedule({
        booking,
        change: data.change,
        slots,
        entitlement: data.entitlement,
        slotId: slots[0]?._id || '',
        replacementId: '',
      });
      if (status === 'awaiting_replacement') {
        const found = await searchTutors({
          subjectId: booking.subjectId?._id || booking.subjectId,
          mode: booking.deliveryMode,
          available: 'true',
          limit: 12,
        });
        setReplacements(
          (found.items || []).filter((item) => {
            const tid = item.profile?.userId?._id || item.profile?.userId;
            return String(tid) !== String(booking.tutorUserId?._id || booking.tutorUserId);
          })
        );
      } else {
        setReplacements([]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const openClassTools = async (booking) => {
    try {
      const j = await joinBooking(booking._id);
      if (j.deliveryMode === 'offline') {
        setOfflinePlace(placeLine(j.location || {}));
        return;
      }
      if (j.opensAt && new Date(j.opensAt) > new Date()) {
        setMsg(`The Zoom room opens at ${formatInZone(j.opensAt, booking.timezone)}. Docs and whiteboard are ready now.`);
      }
      setJoinTools(j);
    } catch (err) {
      setError(err.message);
    }
  };

  const openSummary = async (booking) => {
    try {
      setSummary(await getBookingSummary(booking._id));
    } catch (err) {
      setError(err.message);
    }
  };

  const actionsFor = (b) => {
    const items = [];
    if (canChangeBooking(b)) {
      items.push({
        label: b.deliveryMode === 'offline' ? 'Location' : 'Class tools',
        onClick: () => openClassTools(b),
      });
      items.push({ label: 'Reschedule', onClick: () => openReschedule(b) });
      items.push({ label: 'Cancel', danger: true, onClick: () => setPendingCancel(b) });
    }
    if (b.status === 'completed') items.push({ label: 'Summary', onClick: () => openSummary(b) });
    if (canFeedback(b)) items.push({ label: 'Feedback', onClick: () => setFeedback({ booking: b, rating: 5, comment: '' }) });
    return items;
  };

  const primaryAction = (b) => {
    if (canChangeBooking(b)) {
      return {
        label: b.deliveryMode === 'offline' ? 'Location' : 'Class tools',
        onClick: () => openClassTools(b),
      };
    }
    if (canFeedback(b)) {
      return { label: 'Feedback', onClick: () => setFeedback({ booking: b, rating: 5, comment: '' }) };
    }
    if (b.status === 'completed') return { label: 'Summary', onClick: () => openSummary(b) };
    return null;
  };

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Join class tools, reschedule in the app, or leave feedback after a session."
        actions={
          <div className="row">
            <Link to={policyPath} className="btn secondary">
              Class policy
            </Link>
            <Link to={findPath} className="btn">
              Book a class
            </Link>
          </div>
        }
      />

      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <p className="muted" style={{ margin: 0 }}>
        One student-initiated reschedule per month. The tutor must confirm a slot in the app.{' '}
        <Link to={policyPath}>Read the policy</Link>
      </p>

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { value: 'completed', label: `Past (${past.length})` },
            { value: 'all', label: `All (${modeItems.length})` },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search bookings" />
        <ErpSelect
          inline
          value={view}
          options={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
          onChange={(e) => setView(e.target.value)}
        />
        <ErpSelect
          inline
          value={modeFilter}
          options={options('delivery_mode', { all: 'All modes', allValue: 'all' })}
          onChange={(e) => setModeFilter(e.target.value)}
        />
      </div>

      {view === 'calendar' ? (
        <ErpCard>
          {loading ? (
            <div className="empty">Loading bookings…</div>
          ) : !events.length ? (
            <div className="empty">No bookings in this view.</div>
          ) : (
            <ErpCalendar
              events={events}
              onEventClick={(e) => {
                const b = e.booking;
                if (!b) return;
                const first = primaryAction(b);
                if (first) first.onClick();
              }}
            />
          )}
        </ErpCard>
      ) : (
        <ErpCard className="erp-card-flush">
          {loading ? (
            <div className="empty">Loading bookings…</div>
          ) : !items.length ? (
            <div className="empty">
              No bookings yet. <Link to={findPath}>Find a tutor</Link>
            </div>
          ) : !visible.length ? (
            <div className="empty">No bookings in this view.</div>
          ) : list.noMatch ? (
            <div className="empty">No bookings match that search.</div>
          ) : (
            <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
              {list.items.map((b) => {
                const open = openChangeFor(b._id);
                const primary = primaryAction(b);
                const more = actionsFor(b).filter((a) => a.label !== primary?.label);
                return (
                  <article key={b._id} className="tutor-profile-row booking-card">
                    <div className="booking-card-main">
                      <h3>
                        {b.subjectId?.name || 'Class'}
                        {b.deliveryMode === 'offline' ? (
                          <span className="erp-chip erp-chip-offline">Offline</span>
                        ) : (
                          <span className="erp-chip erp-chip-online">Online</span>
                        )}
                        {b.meetingStatus === 'live' && (
                          <span className="erp-chip erp-chip-offline">Live now</span>
                        )}
                        {b.consumed && <span className="erp-chip">Consumed</span>}
                      </h3>
                      <p className="muted">
                        {tutorRef(b.tutorUserId)} · {formatInZone(b.startAt, b.timezone)}
                      </p>
                      <p className="muted">{countryLine(b.tutorUserId?.country, b.timezone, b.currency)}</p>
                      <div className="booking-card-status">
                        <ErpStatusBadge status={b.status}>{titleCase(b.status)}</ErpStatusBadge>
                        {open && (
                          <span className="muted">{titleCase(open.status.replaceAll('_', ' '))}</span>
                        )}
                      </div>
                    </div>
                    <div className="booking-card-actions">
                      {primary && (
                        <ErpButton variant="secondary" onClick={primary.onClick}>
                          {primary.label}
                        </ErpButton>
                      )}
                      <ErpOverflow items={more} label="More" />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {list.total > 0 && <ErpPager {...list.pagerProps} noun="booking" />}
        </ErpCard>
      )}

      <ClassToolsModal open={Boolean(joinTools)} join={joinTools} onClose={() => setJoinTools(null)} />

      <ErpModal open={Boolean(offlinePlace)} title="Class location" onClose={() => setOfflinePlace('')}>
        <p style={{ margin: 0 }}>{offlinePlace}</p>
      </ErpModal>

      <ErpModal
        open={Boolean(feedback)}
        title="Class feedback"
        onClose={() => setFeedback(null)}
        footer={
          feedback ? (
            <ErpButton
              onClick={async () => {
                try {
                  await sendBookingFeedback(feedback.booking._id, {
                    rating: Number(feedback.rating),
                    comment: feedback.comment,
                  });
                  setFeedback(null);
                  setMsg('Feedback sent in Messages.');
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Send feedback
            </ErpButton>
          ) : null
        }
      >
        {feedback && (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              {feedback.booking.subjectId?.name} · {tutorRef(feedback.booking.tutorUserId)}
            </p>
            <ErpSelect
              label="Rating"
              value={String(feedback.rating)}
              options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} / 5` }))}
              onChange={(e) => setFeedback((f) => ({ ...f, rating: e.target.value }))}
            />
            <div className="field">
              <label>Message</label>
              <textarea
                className="erp-search"
                rows={4}
                value={feedback.comment}
                onChange={(e) => setFeedback((f) => ({ ...f, comment: e.target.value }))}
                placeholder="What went well, or what to improve"
              />
            </div>
          </div>
        )}
      </ErpModal>

      <ErpModal open={Boolean(summary)} title="Session summary" onClose={() => setSummary(null)}>
        {summary && (
          <div className="stack">
            <div className="muted">
              {summary.booking?.subjectId?.name} · {formatInZone(summary.booking?.startAt, summary.booking?.timezone)}
            </div>
            {!summary.report ? (
              <div className="muted">Your tutor has not written a summary yet.</div>
            ) : (
              <>
                {summary.report.summary && <p style={{ margin: 0 }}>{summary.report.summary}</p>}
                {summary.report.topicsCovered?.length > 0 && (
                  <div>Topics: {summary.report.topicsCovered.join(', ')}</div>
                )}
                {summary.report.strengths && <div>Strengths: {summary.report.strengths}</div>}
                {summary.report.weaknesses && <div>Work on: {summary.report.weaknesses}</div>}
                {summary.report.nextSteps && <div>Next time: {summary.report.nextSteps}</div>}
              </>
            )}
            {summary.assignments?.length > 0 && (
              <div>
                <strong>Homework</strong>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
                  {summary.assignments.map((a) => (
                    <li key={a._id}>
                      {a.title} · due {formatInZone(a.deadline, summary.booking?.timezone)} · {titleCase(a.status)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </ErpModal>

      <ErpConfirm
        open={Boolean(pendingCancel)}
        title="Cancel class"
        message={
          pendingCancel
            ? hoursUntil(pendingCancel.startAt) >= 24
              ? `With 24 hours’ notice the usual remedy is a reschedule (1 per month), not a refund. Cancel only if you do not want another time.`
              : `This is under 24 hours’ notice. Scholaris may treat it as a consumed session unless an exception is approved.`
            : ''
        }
        confirmLabel={pendingCancel && hoursUntil(pendingCancel.startAt) >= 24 ? 'Cancel anyway' : 'Cancel class'}
        danger
        onCancel={() => setPendingCancel(null)}
        onConfirm={async () => {
          try {
            const result = await cancelBooking(pendingCancel._id);
            setPendingCancel(null);
            setMsg(
              result.policy?.consumed
                ? 'Late cancellation: this class is marked consumed.'
                : 'Class cancelled with notice.'
            );
            load();
          } catch (err) {
            setError(err.message);
            setPendingCancel(null);
          }
        }}
      />

      <ErpModal
        open={Boolean(reschedule)}
        title="Reschedule class"
        onClose={() => setReschedule(null)}
        footer={
          reschedule ? (
            <>
              <ErpButton
                variant="secondary"
                onClick={async () => {
                  try {
                    await declineReschedule(reschedule.booking._id);
                    setReschedule(null);
                    setMsg('Original class time stays in place.');
                    load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                Keep original time
              </ErpButton>
              {reschedule.change?.status === 'slots_offered' && reschedule.slots.length > 0 && (
                <ErpButton
                  onClick={async () => {
                    try {
                      if (!reschedule.slotId) throw new Error('Pick an available slot');
                      await selectRescheduleSlot(reschedule.booking._id, reschedule.slotId);
                      setReschedule(null);
                      setMsg('Class rescheduled in the Scholaris app.');
                      load();
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Confirm slot
                </ErpButton>
              )}
            </>
          ) : null
        }
      >
        {reschedule && (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              {reschedule.booking.subjectId?.name} · {tutorRef(reschedule.booking.tutorUserId)}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Current: {formatInZone(reschedule.booking.startAt, reschedule.booking.timezone)}
            </p>
            {reschedule.entitlement && (
              <p className="muted" style={{ margin: 0 }}>
                Monthly student reschedules left: {reschedule.entitlement.remaining} of{' '}
                {reschedule.entitlement.limit} ({reschedule.entitlement.cycle}). Unused months do not carry
                forward.
              </p>
            )}
            {reschedule.change?.status === 'pending' && (
              <p>
                Request sent. The assigned tutor must confirm available slots in the Scholaris app. The
                original time stays until a slot is confirmed.
              </p>
            )}
            {reschedule.change?.status === 'slots_offered' && reschedule.slots.length > 0 ? (
              <ErpSelect
                label="Tutor-confirmed slots"
                value={reschedule.slotId}
                options={slotOptions(reschedule.slots)}
                onChange={(e) => setReschedule((f) => ({ ...f, slotId: e.target.value }))}
              />
            ) : reschedule.change?.status === 'awaiting_replacement' ? (
              <div className="stack">
                <p>
                  No alternative slot is free with this tutor. You can move the paid class to another tutor.
                  No extra payment. The other tutor must approve.
                </p>
                {!replacements.length ? (
                  <div className="muted">No other tutors with a free matching slot right now.</div>
                ) : (
                  replacements.map((item) => {
                    const u = item.profile?.userId || {};
                    const tid = u._id || item.profile?.userId;
                    return (
                      <div key={tid} className="tutor-profile-row">
                        <div>
                          <strong>{tutorRef(u)}</strong>
                          <div className="muted">{countryLine(u.country, u.timezone, item.profile?.currency)}</div>
                        </div>
                        <ErpButton
                          variant="secondary"
                          onClick={async () => {
                            try {
                              await proposeReplacementTutor(reschedule.booking._id, tid);
                              setReschedule(null);
                              setMsg('Replacement tutor asked to approve. No extra payment.');
                              load();
                            } catch (err) {
                              setError(err.message);
                            }
                          }}
                        >
                          Request this tutor
                        </ErpButton>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
            {reschedule.change?.status === 'awaiting_approval' && (
              <p className="muted">
                Waiting for {tutorRef(reschedule.change.replacementTutorUserId)} to approve.
              </p>
            )}
          </div>
        )}
      </ErpModal>
    </div>
  );
}
