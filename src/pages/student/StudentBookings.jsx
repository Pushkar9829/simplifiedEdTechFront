import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  cancelBooking,
  getBookingSummary,
  joinBooking,
  listBookings,
  rescheduleBooking,
} from '../../api';
import {
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpConfirm,
  ErpModal,
  ErpPager,
  ErpSearch,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate, statusBadge } from '../../utils/format';
import { titleCase } from './studentOptions';

function canChangeBooking(b) {
  return Boolean(b && b.status !== 'cancelled' && b.status !== 'completed');
}

function toLocalInput(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StudentBookings() {
  const location = useLocation();
  const findPath = location.pathname.startsWith('/parent') ? '/parent/tutors' : '/student/tutors';
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [view, setView] = useState('list');
  const [modeFilter, setModeFilter] = useState('all');
  const [pendingCancel, setPendingCancel] = useState(null);
  const [reschedule, setReschedule] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await listBookings();
      setItems(d.items || []);
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

  const visible = useMemo(() => {
    if (tab === 'upcoming') {
      const now = new Date();
      return modeItems.filter((b) => new Date(b.endAt || b.startAt) >= now && b.status !== 'cancelled' && b.status !== 'completed');
    }
    if (tab === 'completed') return modeItems.filter((b) => b.status === 'completed' || b.status === 'cancelled');
    return modeItems;
  }, [modeItems, tab]);

  const list = useListFilter(
    visible,
    (b) => [b.subjectId?.name, b.tutorUserId?.name, b.status, b.deliveryMode].filter(Boolean).join(' '),
    { resetKey: `${tab}-${modeFilter}` }
  );

  const events = useMemo(
    () =>
      (list.filtered || visible).map((b) => ({
        id: b._id,
        start: b.startAt,
        title: `${b.subjectId?.name || 'Lesson'} · ${b.tutorUserId?.name || 'Tutor'}`,
        variant: b.status === 'cancelled' ? 'cancelled' : b.status === 'completed' ? 'completed' : b.deliveryMode === 'offline' ? 'offline' : 'online',
        booking: b,
      })),
    [list.filtered, visible]
  );

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>My bookings</h1>
        <Link to={findPath} className="btn">
          Book a class
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'completed', label: 'Past' },
            { value: 'all', label: `All (${items.length})` },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search bookings" />
        <ErpTabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
        <ErpTabs
          value={modeFilter}
          onChange={setModeFilter}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'online', label: 'Online' },
            { value: 'offline', label: 'Offline' },
          ]}
        />
      </div>

      {view === 'calendar' ? (
        <ErpCard>
          {loading ? (
            <div className="empty">Loading bookings…</div>
          ) : !events.length ? (
            <div className="empty">No bookings in this view.</div>
          ) : (
            <ErpCalendar events={events} />
          )}
        </ErpCard>
      ) : (
        <div className="erp-card">
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
            <table className="erp-data-table table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Tutor</th>
                  <th>When</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((b) => (
                  <tr key={b._id}>
                    <td>{b.subjectId?.name || '—'}</td>
                    <td>{b.tutorUserId?.name || '—'}</td>
                    <td>{formatDate(b.startAt)}</td>
                    <td>{b.deliveryMode === 'online' ? 'Zoom' : b.deliveryMode || '—'}</td>
                    <td>
                      <span className={statusBadge(b.status)}>{titleCase(b.status)}</span>
                      {b.meetingStatus === 'live' && <span className="erp-chip erp-chip-offline"> live now</span>}
                    </td>
                    <td className="row">
                      {b.status === 'completed' && (
                        <ErpButton
                          variant="secondary"
                          onClick={async () => {
                            try {
                              setSummary(await getBookingSummary(b._id));
                            } catch (err) {
                              setError(err.message);
                            }
                          }}
                        >
                          Summary
                        </ErpButton>
                      )}
                      {canChangeBooking(b) && (
                        <>
                          <ErpButton
                            variant="secondary"
                            onClick={async () => {
                              try {
                                const j = await joinBooking(b._id);
                                if (j.deliveryMode === 'offline') {
                                  const loc = j.location || {};
                                  window.alert(
                                    `Offline class: ${[loc.area, loc.city, loc.address].filter(Boolean).join(', ') || 'See tutor profile'}`
                                  );
                                } else if (j.meetingUrl) {
                                  if (j.opensAt && new Date(j.opensAt) > new Date()) {
                                    setMsg(
                                      `The Zoom room opens at ${formatDate(j.opensAt)}.${
                                        j.password ? ` Passcode: ${j.password}` : ''
                                      }`
                                    );
                                  }
                                  window.open(j.meetingUrl, '_blank', 'noopener');
                                }
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                          >
                            {b.deliveryMode === 'offline' ? 'Location' : 'Join Zoom'}
                          </ErpButton>
                          <ErpButton
                            variant="secondary"
                            onClick={() =>
                              setReschedule({
                                booking: b,
                                startAt: toLocalInput(b.startAt),
                                endAt: toLocalInput(b.endAt),
                              })
                            }
                          >
                            Reschedule
                          </ErpButton>
                          <ErpButton variant="danger" onClick={() => setPendingCancel(b)}>
                            Cancel
                          </ErpButton>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {view === 'list' && list.total > 0 && <ErpPager {...list.pagerProps} noun="booking" />}
        </div>
      )}

      <ErpModal open={Boolean(summary)} title="Session summary" onClose={() => setSummary(null)}>
        {summary && (
          <div className="stack">
            <div className="muted">
              {summary.booking?.subjectId?.name} · {formatDate(summary.booking?.startAt)}
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
                      {a.title} · due {formatDate(a.deadline)} · {titleCase(a.status)}
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
        title="Cancel booking"
        message={
          pendingCancel
            ? `Cancel ${pendingCancel.subjectId?.name || 'this lesson'} with ${pendingCancel.tutorUserId?.name || 'your tutor'}?`
            : ''
        }
        confirmLabel="Cancel class"
        danger
        onCancel={() => setPendingCancel(null)}
        onConfirm={async () => {
          try {
            await cancelBooking(pendingCancel._id);
            setPendingCancel(null);
            setMsg('Booking cancelled');
            load();
          } catch (err) {
            setError(err.message);
            setPendingCancel(null);
          }
        }}
      />

      <ErpModal
        open={Boolean(reschedule)}
        title="Reschedule booking"
        onClose={() => setReschedule(null)}
        footer={
          reschedule ? (
            <>
              <ErpButton variant="secondary" onClick={() => setReschedule(null)}>
                Close
              </ErpButton>
              <ErpButton
                onClick={async () => {
                  try {
                    const start = new Date(reschedule.startAt);
                    const end = new Date(reschedule.endAt);
                    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                      throw new Error('Pick a valid start and end time');
                    }
                    if (end <= start) throw new Error('End must be after start');
                    await rescheduleBooking(reschedule.booking._id, {
                      startAt: start.toISOString(),
                      endAt: end.toISOString(),
                    });
                    setReschedule(null);
                    setMsg('Booking rescheduled');
                    load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                Save new time
              </ErpButton>
            </>
          ) : null
        }
      >
        {reschedule && (
          <div className="erp-form-grid">
            <div className="field">
              <label>Start</label>
              <input
                className="erp-search"
                type="datetime-local"
                value={reschedule.startAt}
                onChange={(e) => setReschedule((f) => ({ ...f, startAt: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>End</label>
              <input
                className="erp-search"
                type="datetime-local"
                value={reschedule.endAt}
                onChange={(e) => setReschedule((f) => ({ ...f, endAt: e.target.value }))}
              />
            </div>
          </div>
        )}
      </ErpModal>
    </div>
  );
}
