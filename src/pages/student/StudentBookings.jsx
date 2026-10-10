import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  rescheduleEntitlement,
  searchTutors,
  selectRescheduleSlot,
  sendBookingFeedback,
  confirmDoorstep,
} from '../../api';
import ClassToolsModal from '../../components/ClassToolsModal';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpConfirm,
  ErpEmptyState,
  ErpLoadingState,
  ErpModal,
  ErpOverflow,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSegmented,
  ErpSelect,
  ErpSkeleton,
  ErpStatusBadge,
  ErpTabs,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { countryLine, money, tutorRef } from '../../utils/format';
import { errorMessage } from '../../utils/errors';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { childLabel, useParentChild } from '../../context/ParentChildContext';
import { titleCase } from './studentOptions';
import { formatDay, formatWhen, idOf, timeUntil, viewerZone } from './studentTime';
import { DateTile, LinkButton } from './studentUi';
import './student.css';

const PAGE_SIZE = 20;
// Classes that started within this window still count as "upcoming" so a live class stays reachable.
const LIVE_GRACE_MS = 2 * 60 * 60 * 1000;
const OPEN_CHANGE = ['pending', 'slots_offered', 'awaiting_replacement', 'awaiting_approval'];

const PAYMENT_LABEL = {
  pending: 'Unpaid',
  failed: 'Payment failed',
  awaiting_confirmation: 'Awaiting confirmation',
  paid: 'Paid',
  cancelled: 'Invoice cancelled',
  refunded: 'Refunded',
};

const isActive = (b) => Boolean(b && b.status !== 'cancelled' && b.status !== 'completed');
const hasStarted = (b) => new Date(b.startAt).getTime() <= Date.now();
const hasEnded = (b) => new Date(b.endAt || b.startAt).getTime() <= Date.now();
const hoursUntil = (startAt) => (new Date(startAt).getTime() - Date.now()) / 3600000;
const needsPayment = (b) => ['pending', 'failed'].includes(b.payment?.status) && b.status !== 'cancelled';

function canFeedback(b) {
  return Boolean(b && b.status !== 'cancelled' && !b.consumed && (b.status === 'completed' || hasEnded(b)));
}

function placeLine(loc = {}) {
  return (
    [loc.label, loc.line1, loc.area, loc.city, loc.state, loc.postalCode, loc.address].filter(Boolean).join(', ') ||
    'See tutor profile'
  );
}

function tabQuery(tab) {
  const boundary = new Date(Date.now() - LIVE_GRACE_MS).toISOString();
  if (tab === 'upcoming') return { from: boundary, sort: 'startAt', excludeStatus: 'cancelled' };
  if (tab === 'completed') return { to: boundary, sort: '-startAt' };
  return { sort: '-startAt' };
}

export default function StudentBookings() {
  const location = useLocation();
  const isParent = location.pathname.startsWith('/parent');
  const base = isParent ? '/parent' : '/student';
  const findPath = `${base}/tutors`;
  const policyPath = `${base}/policy`;
  const paymentsPath = `${base}/payments`;
  const { options } = useCatalog();
  const { user } = useAuth();
  const zone = viewerZone(user);
  const when = (v) => formatWhen(v, zone);
  const parent = useParentChild();
  const childId = isParent ? parent.selectedChildId : null;
  const childName = isParent && parent.selectedChild ? childLabel(parent.selectedChild) : '';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [page, setPage] = useState(1);
  const [changes, setChanges] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [view, setView] = useState('list');
  const [modeFilter, setModeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pendingCancel, setPendingCancel] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [reschedule, setReschedule] = useState(null);
  const [replacements, setReplacements] = useState([]);
  const [joinTools, setJoinTools] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [offlinePlace, setOfflinePlace] = useState('');
  const [busy, setBusy] = useState(false);
  const reqId = useRef(0);

  const waitingForChild = isParent && (parent.loading || !childId);

  const begin = () => {
    setError('');
    setMsg('');
  };

  const load = useCallback(async () => {
    if (waitingForChild) return;
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    const scope = childId ? { studentUserId: childId } : {};
    try {
      const [d, c, up, past, all] = await Promise.all([
        listBookings({ ...scope, ...tabQuery(tab), page, limit: PAGE_SIZE }),
        listScheduleChanges(),
        listBookings({ ...scope, ...tabQuery('upcoming'), page: 1, limit: 1 }),
        listBookings({ ...scope, ...tabQuery('completed'), page: 1, limit: 1 }),
        listBookings({ ...scope, page: 1, limit: 1 }),
      ]);
      if (id !== reqId.current) return;
      setItems(d.items || []);
      setTotal(d.total ?? (d.items || []).length);
      setCounts({ upcoming: up.total ?? 0, completed: past.total ?? 0, all: all.total ?? 0 });
      setChanges(Array.isArray(c) ? c : c.items || []);
    } catch (err) {
      if (id === reqId.current) setError(errorMessage(err));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [waitingForChild, childId, tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab, childId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((b) => {
      if (tab === 'upcoming' && !isActive(b)) return false;
      if (modeFilter !== 'all' && (b.deliveryMode || 'online') !== modeFilter) return false;
      if (!q) return true;
      return [b.subjectId?.name, b.tutorUserId?.refCode, b.refCode, b.status, b.deliveryMode, b.studentUserId?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [items, tab, modeFilter, search]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openChangeFor = (bookingId) =>
    changes.find((c) => idOf(c.bookingId) === String(bookingId) && OPEN_CHANGE.includes(c.status));

  const loadReplacements = async (booking) => {
    try {
      const found = await searchTutors({
        subjectId: idOf(booking.subjectId),
        mode: booking.deliveryMode,
        available: 'true',
        limit: 12,
      });
      setReplacements(
        (found.items || []).filter((item) => idOf(item.profile?.userId) !== idOf(booking.tutorUserId))
      );
    } catch {
      setReplacements([]);
    }
  };

  const openReschedule = async (booking) => {
    begin();
    const change = openChangeFor(booking._id) || null;
    const slots = change?.status === 'slots_offered' ? change.offeredSlotIds || [] : [];
    setReplacements([]);
    setReschedule({
      booking,
      change,
      slots,
      slotId: slots[0]?._id || '',
      reason: '',
      entitlement: null,
      loadingEntitlement: true,
    });
    if (change?.status === 'awaiting_replacement') loadReplacements(booking);
    try {
      const ent = await rescheduleEntitlement(isParent ? { studentUserId: idOf(booking.studentUserId) } : {});
      setReschedule((r) => (r && r.booking._id === booking._id ? { ...r, entitlement: ent, loadingEntitlement: false } : r));
    } catch (err) {
      setReschedule((r) => (r ? { ...r, loadingEntitlement: false, entError: errorMessage(err) } : r));
    }
  };

  const sendRescheduleRequest = async () => {
    if (!reschedule) return;
    begin();
    setBusy(true);
    try {
      const data = await requestReschedule(reschedule.booking._id, { reason: reschedule.reason.trim() });
      const slots = data.change?.status === 'slots_offered' ? data.slots || [] : [];
      setReschedule((r) => ({
        ...r,
        change: data.change,
        slots,
        slotId: slots[0]?._id || '',
        entitlement: data.entitlement || r.entitlement,
      }));
      if (data.change?.status === 'awaiting_replacement') loadReplacements(reschedule.booking);
      setMsg('Reschedule request sent to the tutor.');
      load();
    } catch (err) {
      setReschedule((r) => (r ? { ...r, actionError: errorMessage(err) } : r));
    } finally {
      setBusy(false);
    }
  };

  const openClassTools = async (booking) => {
    begin();
    try {
      const j = await joinBooking(booking._id);
      if (j.deliveryMode === 'offline') {
        setOfflinePlace(placeLine(j.location || {}));
        return;
      }
      if (j.opensAt && new Date(j.opensAt) > new Date()) {
        setMsg(`The Zoom room opens at ${when(j.opensAt)}. Docs and whiteboard are ready now.`);
      }
      setJoinTools(j);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const openSummary = async (booking) => {
    begin();
    try {
      setSummary(await getBookingSummary(booking._id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const openFeedback = (b) => {
    begin();
    setFeedback({ booking: b, rating: 5, comment: '' });
  };

  const actionsFor = (b) => {
    const list = [];
    if (isActive(b) && !hasEnded(b)) {
      list.push({
        label: b.deliveryMode === 'offline' ? 'Location' : 'Class tools',
        onClick: () => openClassTools(b),
      });
    }
    if (isActive(b) && !hasStarted(b)) {
      list.push({ label: 'Reschedule', onClick: () => openReschedule(b) });
      list.push({
        label: 'Cancel',
        danger: true,
        onClick: () => {
          begin();
          setPendingCancel(b);
        },
      });
    }
    if (b.status === 'completed' && !b.consumed) list.push({ label: 'Summary', onClick: () => openSummary(b) });
    if (canFeedback(b)) list.push({ label: 'Feedback', onClick: () => openFeedback(b) });
    if (b.deliveryMode === 'offline' && b.doorstep?.checkedInAt && !b.doorstep?.confirmedAt) {
      list.push({
        label: 'Confirm doorstep',
        onClick: async () => {
          begin();
          try {
            await confirmDoorstep(b._id);
            setMsg('Doorstep check-in confirmed');
            load();
          } catch (err) {
            setError(errorMessage(err));
          }
        },
      });
    }
    return list;
  };

  const primaryAction = (b) => {
    const all = actionsFor(b);
    if (hasEnded(b)) return all.find((a) => a.label === 'Feedback') || all.find((a) => a.label === 'Summary') || null;
    // The tutor offered new times: picking one is the next step, so surface it.
    if (openChangeFor(b._id)?.status === 'slots_offered') {
      return { label: 'Choose new time', onClick: () => openReschedule(b) };
    }
    return all[0] || null;
  };

  const events = useMemo(
    () =>
      visible.map((b) => ({
        id: b._id,
        start: b.startAt,
        title: `${b.refCode || ''} ${b.subjectId?.name || 'Lesson'} · ${tutorRef(b.tutorUserId)}${
          isParent && b.studentUserId?.name ? ` · ${b.studentUserId.name}` : ''
        } · ${b.status || ''}`.trim(),
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
    [visible, isParent]
  );

  if (isParent && parent.error && !parent.children.length) {
    return (
      <div className="page stack st-page">
        <ErpBanner
          variant="danger"
          actions={
            <ErpButton variant="secondary" size="sm" onClick={() => parent.refreshChildren()}>
              Retry
            </ErpButton>
          }
        >
          {parent.error}
        </ErpBanner>
      </div>
    );
  }
  if (isParent && !parent.loading && !parent.children.length) {
    return (
      <div className="page stack st-page">
        <div className="erp-card">
          <ErpEmptyState
            icon="users"
            title="No linked children yet"
            description="Link your child's account to book and manage their classes."
            action={<LinkButton to="/parent/children/link">Link a child</LinkButton>}
          />
        </div>
      </div>
    );
  }

  const ent = reschedule?.entitlement;
  const change = reschedule?.change;
  const isLoading = loading || waitingForChild;

  // Group the visible list by calendar day for scanning.
  const groups = [];
  visible.forEach((b) => {
    const key = formatDay(b.startAt, zone);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(b);
    else groups.push({ key, items: [b] });
  });
  const timeOf = (v) => {
    try {
      return new Date(v).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: zone || undefined });
    } catch {
      return new Date(v).toLocaleTimeString();
    }
  };

  const emptyState = !counts.all ? (
    <ErpEmptyState
      icon="calendar"
      title={isParent ? `No classes booked for ${childName || 'your child'} yet` : 'No classes booked yet'}
      description="Find a verified IB tutor and book your first session."
      action={
        <LinkButton to={findPath} icon="search">
          Find a tutor
        </LinkButton>
      }
    />
  ) : !items.length ? (
    <ErpEmptyState
      icon="calendar"
      title={tab === 'upcoming' ? 'No upcoming classes' : tab === 'completed' ? 'No past classes' : 'No classes here'}
      description={tab === 'upcoming' ? 'Book your next session to keep momentum.' : undefined}
      action={
        tab === 'upcoming' ? (
          <LinkButton to={findPath} variant="secondary">
            Book a class
          </LinkButton>
        ) : null
      }
    />
  ) : (
    <ErpEmptyState
      icon="filter"
      title="No classes match these filters"
      description="Clear the search or mode filter to see everything on this page."
      action={
        <ErpButton
          variant="secondary"
          onClick={() => {
            setSearch('');
            setModeFilter('all');
          }}
        >
          Clear filters
        </ErpButton>
      }
    />
  );

  return (
    <div className="page stack st-page">
      <ErpPageHeader
        subtitle={
          isParent
            ? `Classes for ${childName || 'your child'}: join, pay, reschedule or leave feedback.`
            : 'Join your classes, pay invoices, reschedule, or leave feedback after a session.'
        }
        actions={
          <>
            <LinkButton to={policyPath} variant="secondary" icon="shield-check">
              Class policy
            </LinkButton>
            <LinkButton to={findPath} icon="plus">
              Book a class
            </LinkButton>
          </>
        }
      />

      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}

      <ErpTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'upcoming', label: 'Upcoming', count: counts.upcoming ?? 0 },
          { value: 'completed', label: 'Past', count: counts.completed ?? 0 },
          { value: 'all', label: 'All', count: counts.all ?? 0 },
        ]}
      />

      <div className="st-filter-bar">
        <ErpSearch value={search} onChange={setSearch} placeholder="Search subject, tutor or booking ID" />
        <ErpSelect
          inline
          aria-label="Class mode"
          value={modeFilter}
          options={options('delivery_mode', { all: 'All modes', allValue: 'all' })}
          onChange={(e) => setModeFilter(e.target.value)}
        />
        <div className="st-filter-bar-end">
          <ErpSegmented
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List', icon: 'list-checks' },
              { value: 'calendar', label: 'Calendar', icon: 'calendar' },
            ]}
          />
        </div>
      </div>

      <p className="muted st-hint">
        <Icon name="info" size={14} />
        <span>
          {isParent
            ? 'Your child can make one student-initiated reschedule per month; the tutor confirms a new slot in the app.'
            : 'One student-initiated reschedule per month; the tutor confirms a new slot in the app.'}{' '}
          Times shown in {zone || 'your local time'}. <Link to={policyPath}>Read the policy</Link>
        </span>
      </p>

      {view === 'calendar' ? (
        <ErpCard>
          {isLoading ? (
            <ErpLoadingState message="Loading bookings…" />
          ) : !events.length ? (
            emptyState
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
          {total > PAGE_SIZE && (
            <ErpPager
              page={page}
              pages={pages}
              total={total}
              noun="booking"
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pages, p + 1))}
            />
          )}
        </ErpCard>
      ) : (
        <ErpCard flush>
          {isLoading ? (
            <div style={{ padding: '1.25rem' }} className="stack">
              {[0, 1, 2].map((i) => (
                <div key={i} className="row" style={{ gap: '1rem', flexWrap: 'nowrap' }}>
                  <ErpSkeleton width="52px" height="56px" radius="8px" />
                  <div className="stack" style={{ gap: '0.5rem', flex: 1 }}>
                    <ErpSkeleton width="40%" height="0.9rem" />
                    <ErpSkeleton width="65%" height="0.75rem" />
                  </div>
                </div>
              ))}
            </div>
          ) : !visible.length ? (
            emptyState
          ) : (
            <div>
              {groups.map((g) => (
                <section key={g.key} aria-label={g.key}>
                  <div className="st-group-label">{g.key}</div>
                  <ul className="st-list">
                    {g.items.map((b) => {
                      const open = openChangeFor(b._id);
                      const primary = primaryAction(b);
                      const more = actionsFor(b).filter((a) => a.label !== primary?.label);
                      const pay = b.payment;
                      const unpaid = needsPayment(b);
                      const offered = open?.status === 'slots_offered';
                      const live = b.meetingStatus === 'live';
                      const past = b.status === 'cancelled' || b.status === 'completed' || hasEnded(b);
                      return (
                        <li key={b._id} className={`st-item${unpaid || offered ? ' is-attention' : ''}`}>
                          <DateTile value={b.startAt} timeZone={zone} tone={past ? 'muted' : undefined} />
                          <div className="st-item-body">
                            <p className="st-item-title">
                              {b.subjectId?.name || 'Class'}
                              {b.level ? <span className="erp-tag">{b.level}</span> : null}
                              {live && (
                                <ErpBadge tone="danger" dot>
                                  Live now
                                </ErpBadge>
                              )}
                            </p>
                            <p className="st-item-meta">
                              <span>
                                <Icon name="clock" size={14} />
                                {timeOf(b.startAt)}
                                {b.endAt ? ` – ${timeOf(b.endAt)}` : ''}
                                {!past && !live ? ` · ${timeUntil(b.startAt)}` : ''}
                              </span>
                              <span>
                                <Icon name={b.deliveryMode === 'offline' ? 'map-pin' : 'video'} size={14} />
                                {b.deliveryMode === 'offline' ? 'Offline' : 'Online'}
                              </span>
                              <span title={countryLine(b.tutorUserId?.country, b.timezone, b.currency)}>
                                <Icon name="user" size={14} />
                                {tutorRef(b.tutorUserId)}
                              </span>
                              {isParent && (
                                <span>
                                  <Icon name="graduation-cap" size={14} />
                                  For {b.studentUserId?.name || childName || 'your child'}
                                </span>
                              )}
                              {b.planType ? <span>{titleCase(b.planType)}</span> : null}
                              {b.refCode ? <span className="erp-tabular">{b.refCode}</span> : null}
                            </p>
                            <div className="st-item-badges">
                              <ErpStatusBadge status={b.status} dot>
                                {titleCase(b.status)}
                              </ErpStatusBadge>
                              {pay && (
                                <ErpStatusBadge status={pay.status}>
                                  {PAYMENT_LABEL[pay.status] || titleCase(pay.status)}
                                  {unpaid && pay.amount ? ` · ${money(pay.amount, pay.currency || b.currency)}` : ''}
                                </ErpStatusBadge>
                              )}
                              {b.consumed && <ErpBadge>Consumed</ErpBadge>}
                              {open && (
                                <span className="st-item-note">
                                  <Icon name="refresh" size={13} />
                                  {offered
                                    ? 'Tutor offered new times'
                                    : `Reschedule: ${titleCase(open.status.replaceAll('_', ' ')).toLowerCase()}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="st-item-actions">
                            {unpaid && (
                              <LinkButton to={paymentsPath} state={{ paymentId: pay._id }} icon="credit-card">
                                Pay
                              </LinkButton>
                            )}
                            {primary && (
                              <ErpButton variant={unpaid ? 'secondary' : 'primary'} onClick={primary.onClick}>
                                {primary.label}
                              </ErpButton>
                            )}
                            {more.length > 0 && <ErpOverflow items={more} label="More" />}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {total > 0 && (
            <ErpPager
              page={page}
              pages={pages}
              total={total}
              noun="booking"
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pages, p + 1))}
            />
          )}
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
              disabled={busy}
              onClick={async () => {
                begin();
                setBusy(true);
                try {
                  await sendBookingFeedback(feedback.booking._id, {
                    rating: Number(feedback.rating),
                    comment: feedback.comment,
                  });
                  setFeedback(null);
                  setMsg('Feedback sent in Messages.');
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Sending…' : 'Send feedback'}
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
            <ErpTextarea
              label="Message"
              rows={4}
              value={feedback.comment}
              onChange={(e) => setFeedback((f) => ({ ...f, comment: e.target.value }))}
              placeholder="What went well, or what to improve"
            />
          </div>
        )}
      </ErpModal>

      <ErpModal open={Boolean(summary)} title="Session summary" onClose={() => setSummary(null)}>
        {summary && (
          <div className="stack">
            <div className="muted">
              {summary.booking?.subjectId?.name} · {when(summary.booking?.startAt)}
            </div>
            {!summary.report ? (
              <div className="muted">The tutor has not written a summary yet.</div>
            ) : (
              <>
                {summary.report.summary && <p style={{ margin: 0 }}>{summary.report.summary}</p>}
                {summary.report.topicsCovered?.length > 0 && <div>Topics: {summary.report.topicsCovered.join(', ')}</div>}
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
                      {a.title} · due {when(a.deadline)} · {titleCase(a.status)}
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
        busy={cancelBusy}
        message={
          pendingCancel
            ? hoursUntil(pendingCancel.startAt) >= 24
              ? `With 24 hours’ notice the usual remedy is a reschedule (1 per month), not a refund. Cancel only if ${
                  isParent ? 'your child does' : 'you do'
                } not want another time. Any unpaid invoice for this class is cancelled.`
              : `This is under 24 hours’ notice. Scholaris may treat it as a consumed session unless an exception is approved.`
            : ''
        }
        confirmLabel={pendingCancel && hoursUntil(pendingCancel.startAt) >= 24 ? 'Cancel anyway' : 'Cancel class'}
        danger
        onCancel={() => setPendingCancel(null)}
        onConfirm={async () => {
          begin();
          setCancelBusy(true);
          try {
            const result = await cancelBooking(pendingCancel._id);
            setMsg(
              result?.policy?.consumed || result?.booking?.consumed
                ? 'Late cancellation: this class is marked consumed.'
                : 'Class cancelled with notice.'
            );
            load();
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setCancelBusy(false);
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
              <ErpButton variant="secondary" onClick={() => setReschedule(null)} disabled={busy}>
                Close
              </ErpButton>
              {change && OPEN_CHANGE.includes(change.status) && (
                <ErpButton
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    begin();
                    setBusy(true);
                    try {
                      await declineReschedule(reschedule.booking._id);
                      setReschedule(null);
                      setMsg('Original class time stays in place.');
                      load();
                    } catch (err) {
                      setReschedule((r) => (r ? { ...r, actionError: errorMessage(err) } : r));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Keep original time
                </ErpButton>
              )}
              {!change && (
                <ErpButton
                  disabled={busy || reschedule.loadingEntitlement || (ent && ent.remaining <= 0)}
                  onClick={sendRescheduleRequest}
                >
                  {busy ? 'Sending…' : 'Send request'}
                </ErpButton>
              )}
              {change?.status === 'slots_offered' && reschedule.slots.length > 0 && (
                <ErpButton
                  disabled={busy || !reschedule.slotId}
                  onClick={async () => {
                    begin();
                    setBusy(true);
                    try {
                      await selectRescheduleSlot(reschedule.booking._id, reschedule.slotId);
                      setReschedule(null);
                      setMsg('Class rescheduled in the Scholaris app.');
                      load();
                    } catch (err) {
                      setReschedule((r) => (r ? { ...r, actionError: errorMessage(err) } : r));
                    } finally {
                      setBusy(false);
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
            {reschedule.actionError && <ErpBanner variant="danger">{reschedule.actionError}</ErpBanner>}
            <p className="muted" style={{ margin: 0 }}>
              {reschedule.booking.subjectId?.name} · {tutorRef(reschedule.booking.tutorUserId)}
              {isParent && reschedule.booking.studentUserId?.name ? ` · for ${reschedule.booking.studentUserId.name}` : ''}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Current time: {when(reschedule.booking.startAt)}
            </p>
            {reschedule.loadingEntitlement ? (
              <p className="muted" style={{ margin: 0 }}>
                Checking reschedules left…
              </p>
            ) : reschedule.entError ? (
              <p className="muted" style={{ margin: 0 }}>
                {reschedule.entError}
              </p>
            ) : ent ? (
              <p className="muted" style={{ margin: 0 }}>
                {isParent ? 'Your child’s' : 'Your'} student reschedules left this month: {ent.remaining} of {ent.limit}
                {ent.cycle ? ` (${ent.cycle})` : ''}. Unused months do not carry forward.
              </p>
            ) : null}

            {!change && (
              <>
                {ent && ent.remaining <= 0 ? (
                  <p>
                    {isParent ? 'Your child has' : 'You have'} used this month’s reschedule. Ask the tutor in
                    Messages, or cancel with notice per the policy.
                  </p>
                ) : (
                  <>
                    <p style={{ margin: 0 }}>
                      Sending a request uses {isParent ? 'your child’s' : 'your'} one reschedule for this month and
                      asks the tutor to offer new times. {isParent ? 'The class' : 'Your class'} keeps its current time until a
                      new slot is confirmed.
                    </p>
                    <ErpTextarea
                      label="Reason"
                      optional
                      rows={3}
                      value={reschedule.reason}
                      onChange={(e) => setReschedule((r) => ({ ...r, reason: e.target.value }))}
                      placeholder="e.g. school exam clash"
                    />
                  </>
                )}
              </>
            )}

            {change?.status === 'pending' && (
              <p>
                Request sent{change.createdAt ? ` on ${when(change.createdAt)}` : ''}. The tutor must offer
                available slots in the Scholaris app. The original time stays until a slot is confirmed.
              </p>
            )}
            {change?.status === 'slots_offered' &&
              (reschedule.slots.length > 0 ? (
                <ErpSelect
                  label="Tutor-offered slots"
                  value={reschedule.slotId}
                  options={[
                    { value: '', label: 'Select slot' },
                    ...reschedule.slots.map((s) => ({
                      value: s._id,
                      label: `${when(s.startAt)}${s.deliveryMode ? ` · ${s.deliveryMode}` : ''}`,
                      disabled: s.isBooked,
                    })),
                  ]}
                  onChange={(e) => setReschedule((f) => ({ ...f, slotId: e.target.value }))}
                />
              ) : (
                <p className="muted">The offered slots are no longer free. Ask the tutor to offer new ones.</p>
              ))}
            {change?.status === 'awaiting_replacement' && (
              <div className="stack">
                <p>
                  No alternative slot is free with this tutor. You can move the paid class to another tutor. No
                  extra payment. The other tutor must approve.
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
                          disabled={busy}
                          onClick={async () => {
                            begin();
                            setBusy(true);
                            try {
                              await proposeReplacementTutor(reschedule.booking._id, tid);
                              setReschedule(null);
                              setMsg('Replacement tutor asked to approve. No extra payment.');
                              load();
                            } catch (err) {
                              setReschedule((r) => (r ? { ...r, actionError: errorMessage(err) } : r));
                            } finally {
                              setBusy(false);
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
            )}
            {change?.status === 'awaiting_approval' && (
              <p className="muted">Waiting for {tutorRef(change.replacementTutorUserId)} to approve.</p>
            )}
          </div>
        )}
      </ErpModal>
    </div>
  );
}
