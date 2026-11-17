import { useEffect, useMemo, useState } from 'react';
import { cancelBooking, listBookings, overrideClassProof } from '../../api';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import {
  ErpBanner,
  ErpButton,
  ErpCalendar,
  ErpConfirm,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSegmented,
  ErpSelect,
  ErpTabs,
  ErpTextarea,
} from '../../components/erp';
import BookingEventModal, { ProofChip } from '../../components/BookingEventModal';
import { bookingEventVariant, bookingTooltip, dualTime, proofOf } from '../../components/bookingTime';
import { errorMessage } from '../../utils/errors';
import { formatInZone, tutorRef } from '../../utils/format';
import {
  AdminCell,
  AdminFilterChip,
  AdminKV,
  AdminListState,
  AdminRowActions,
  AdminSection,
  AdminStatus,
  AdminSummary,
  AdminTableCard,
  AdminToolbar,
} from './AdminKit';
import { titleCase } from './adminOptions';

const PAGE_SIZE = 50;

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PROOF_FILTER_OPTIONS = [
  { value: '', label: 'Any proof' },
  { value: 'missing', label: 'Missing proof' },
];

const needsOverride = (b) => b && b.status !== 'cancelled' && !b.consumed && ['missing', 'start_only', 'start_due'].includes(proofOf(b));

function tutorLabel(t) {
  if (!t) return '—';
  return [t.name, t.refCode].filter(Boolean).join(' · ') || tutorRef(t);
}

function studentLabel(s) {
  if (!s) return '—';
  return [s.name, s.phone].filter(Boolean).join(' · ') || '—';
}

// Short zone label ("GMT", "IST", "GMT+5:30") so the admin's own time is never ambiguous.
function zoneAbbr(value, timeZone) {
  try {
    const part = new Intl.DateTimeFormat(undefined, { timeZone: timeZone || undefined, timeZoneName: 'short' })
      .formatToParts(new Date(value))
      .find((p) => p.type === 'timeZoneName');
    return part?.value || '';
  } catch {
    return '';
  }
}

export default function AdminBookingsPage() {
  const { options, labelFor } = useCatalog();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('upcoming');
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('');
  const [person, setPerson] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalError, setModalError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { user } = useAuth();
  const zone = user?.timezone || undefined;
  const [view, setView] = useState('list');
  const [proof, setProof] = useState('');
  const [range, setRange] = useState(null);
  const [eventBooking, setEventBooking] = useState(null);
  const [override, setOverride] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (view === 'calendar' && !range) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    const now = new Date().toISOString();
    const params = { page, limit: PAGE_SIZE, status, proof };
    if (view === 'calendar') {
      params.page = 1;
      params.limit = 500;
      params.from = range.from.toISOString();
      params.to = range.to.toISOString();
      params.sort = 'startAt';
    } else if (tab === 'upcoming') {
      params.from = now;
      params.sort = 'startAt';
    } else if (tab === 'past') {
      params.to = now;
      params.sort = '-startAt';
    } else {
      params.sort = '-startAt';
    }
    if (person?.kind === 'tutor') params.tutorUserId = person.id;
    if (person?.kind === 'student') params.studentUserId = person.id;
    listBookings(params)
      .then((data) => {
        if (cancelled) return;
        setItems(data?.items || []);
        setTotal(data?.total || 0);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, tab, status, person, reloadKey, proof, view, range]);

  const rows = useMemo(
    () => (mode ? items.filter((b) => (b.deliveryMode || 'online') === mode) : items),
    [items, mode]
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const reload = () => setReloadKey((k) => k + 1);
  const resetPage = (fn) => (value) => {
    fn(value);
    setPage(1);
  };

  const openBooking = (b) => {
    setModalError('');
    setSelected(b);
  };

  const filterBy = (kind, user) => {
    const id = user?._id || user;
    if (!id) return;
    setPerson({ kind, id: String(id), label: kind === 'tutor' ? tutorLabel(user) : studentLabel(user) });
    setPage(1);
    setSelected(null);
  };

  const doCancel = async () => {
    if (!selected) return;
    setBusy(true);
    setModalError('');
    try {
      await cancelBooking(selected._id, { reason: 'Cancelled by admin' });
      setConfirmCancel(false);
      setSelected(null);
      reload();
    } catch (err) {
      setConfirmCancel(false);
      setModalError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canCancel = selected && !['cancelled', 'completed'].includes(selected.status);
  const filtered = Boolean(status || mode || person || proof);

  const submitOverride = async () => {
    if (!override) return;
    setOverride((o) => ({ ...o, busy: true, error: '' }));
    try {
      await overrideClassProof(override.booking._id, override.reason.trim());
      setOverride(null);
      setSelected(null);
      setNotice('Class proof overridden. The tutor can complete the class now.');
      reload();
    } catch (err) {
      setOverride((o) => (o ? { ...o, busy: false, error: errorMessage(err) } : o));
    }
  };
  const askOverride = (b) => setOverride({ booking: b, reason: '', busy: false, error: '' });

  const events = rows.map((b) => ({
    id: b._id,
    start: b.startAt,
    title: `${b.studentUserId?.name || 'Student'} · ${b.subjectId?.name || 'Class'}`,
    tooltip: bookingTooltip(b, 'admin', zone),
    variant: bookingEventVariant(b, { proof: true }),
    booking: b,
  }));
  const modeChip = (b) => (
    <span className={`erp-chip ${b.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'}`}>
      {labelFor('delivery_mode', b.deliveryMode || 'online')}
    </span>
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Every class booked by students, parents or tutors. Changes appear here immediately." />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      {notice && (
        <ErpBanner variant="success" onDismiss={() => setNotice('')}>
          {notice}
        </ErpBanner>
      )}

      <AdminTableCard
        tabs={
          view === 'calendar' ? null : (
          <ErpTabs
            value={tab}
            onChange={resetPage(setTab)}
            tabs={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
              { value: 'all', label: 'All bookings' },
            ]}
          />
          )
        }
        toolbar={
          <AdminToolbar
            right={
              <>
                {!loading ? (
                  <span className="adm-result-count">
                    {mode ? `${rows.length} of ${total}` : total} booking{total === 1 ? '' : 's'}
                  </span>
                ) : null}
                <ErpButton variant="ghost" size="sm" icon="refresh" onClick={reload}>
                  Refresh
                </ErpButton>
              </>
            }
          >
            <ErpSegmented
              aria-label="View"
              value={view}
              onChange={(v) => {
                setView(v);
                setPage(1);
              }}
              options={[
                { value: 'list', label: 'List', icon: 'list-checks' },
                { value: 'calendar', label: 'Calendar', icon: 'calendar' },
              ]}
            />
            <ErpSelect
              inline
              value={status}
              options={STATUS_FILTER_OPTIONS}
              aria-label="Filter by status"
              onChange={(e) => resetPage(setStatus)(e.target.value)}
            />
            <ErpSelect
              inline
              value={mode}
              options={options('delivery_mode', { all: 'All modes' })}
              aria-label="Filter by delivery mode"
              onChange={(e) => setMode(e.target.value)}
            />
            <ErpSelect
              inline
              value={proof}
              options={PROOF_FILTER_OPTIONS}
              aria-label="Filter by class proof"
              onChange={(e) => resetPage(setProof)(e.target.value)}
            />
            {person ? (
              <AdminFilterChip
                label={`${titleCase(person.kind)}: ${person.label}`}
                onClear={() => resetPage(setPerson)(null)}
              />
            ) : null}
          </AdminToolbar>
        }
        footer={
          view === 'list' && total > PAGE_SIZE ? (
            <ErpPager
              page={page}
              pages={pages}
              total={total}
              noun="booking"
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pages, p + 1))}
            />
          ) : null
        }
      >
        {view === 'calendar' ? (
          <div style={{ padding: '1rem' }}>
            <ErpCalendar
              events={events}
              loading={loading}
              timeZone={zone}
              emptyMessage={filtered ? 'No bookings match these filters in this period.' : 'No bookings in this period.'}
              onEventClick={(e) => setEventBooking(e.booking)}
              onRangeChange={(from, to) =>
                setRange((r) =>
                  r && r.from.getTime() === from.getTime() && r.to.getTime() === to.getTime() ? r : { from, to }
                )
              }
            />
          </div>
        ) : loading || !rows.length ? (
          <AdminListState
            loading={loading}
            empty
            emptyProps={{
              icon: 'calendar',
              title: filtered ? 'No bookings match these filters' : `No ${tab === 'all' ? '' : `${tab} `}bookings`,
              description: filtered
                ? 'Clear a filter to see more classes.'
                : 'Classes appear here as soon as they are booked.',
              action: filtered ? (
                <ErpButton
                  variant="secondary"
                  onClick={() => {
                    setStatus('');
                    setMode('');
                    setProof('');
                    setPerson(null);
                    setPage(1);
                  }}
                >
                  Clear filters
                </ErpButton>
              ) : null,
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Student</th>
                  <th>Tutor</th>
                  <th>When</th>
                  <th>Status</th>
                  <th>Proof</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b._id} className="erp-row-click" onClick={() => openBooking(b)}>
                    <td className="adm-primary">
                      <AdminCell
                        title={b.subjectId?.name || 'Class'}
                        tags={modeChip(b)}
                        sub={
                          b.bookedByUserId?.role ? `Booked by ${titleCase(b.bookedByUserId.role)}` : null
                        }
                      />
                    </td>
                    <td data-label="Student">
                      <AdminCell
                        avatarName={b.studentUserId?.name || b.studentUserId?.phone || 'Student'}
                        title={b.studentUserId?.name || b.studentUserId?.phone || '—'}
                      />
                    </td>
                    <td data-label="Tutor">
                      <AdminCell
                        title={b.tutorUserId?.name || tutorRef(b.tutorUserId)}
                        sub={b.tutorUserId?.name && b.tutorUserId?.refCode ? b.tutorUserId.refCode : null}
                      />
                    </td>
                    <td data-label="When">
                      <AdminCell title={`${formatInZone(b.startAt, zone)} ${zoneAbbr(b.startAt, zone)}`.trim()} sub={dualTime(b, 'admin', zone).split(' · ').slice(1).join(' · ') || null} />
                    </td>
                    <td data-label="Status">
                      <AdminStatus status={b.status} />
                    </td>
                    <td data-label="Proof">
                      {proofOf(b) && proofOf(b) !== 'n/a' && proofOf(b) !== 'upcoming' ? <ProofChip booking={b} /> : <span className="muted">—</span>}
                    </td>
                    <AdminRowActions>
                      <ErpButton variant="ghost" size="sm" iconRight="chevron-right" onClick={() => openBooking(b)}>
                        View
                      </ErpButton>
                    </AdminRowActions>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      <ErpModal
        open={Boolean(selected) && !confirmCancel}
        title="Booking"
        onClose={() => setSelected(null)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setSelected(null)} disabled={busy}>
              Close
            </ErpButton>
            {needsOverride(selected) && new Date(selected.startAt) <= new Date() ? (
              <ErpButton variant="secondary" icon="shield-check" onClick={() => askOverride(selected)} disabled={busy}>
                Override proof
              </ErpButton>
            ) : null}
            {canCancel ? (
              <ErpButton variant="danger" onClick={() => setConfirmCancel(true)} disabled={busy}>
                Cancel booking
              </ErpButton>
            ) : null}
          </>
        }
      >
        {modalError && <ErpBanner variant="danger">{modalError}</ErpBanner>}
        {selected && (
          <>
            <AdminSummary
              eyebrow={labelFor('delivery_mode', selected.deliveryMode || 'online')}
              title={selected.subjectId?.name || 'Class'}
              meta={formatInZone(selected.startAt, selected.timezone)}
              side={<AdminStatus status={selected.status} />}
            />
            <AdminSection title="People">
              <AdminKV
                items={[
                  {
                    label: 'Student',
                    value: (
                      <>
                        {studentLabel(selected.studentUserId)}
                        {selected.studentUserId ? (
                          <div>
                            <button
                              type="button"
                              className="erp-link"
                              onClick={() => filterBy('student', selected.studentUserId)}
                            >
                              Show their bookings
                            </button>
                          </div>
                        ) : null}
                      </>
                    ),
                  },
                  {
                    label: 'Tutor',
                    value: (
                      <>
                        {tutorLabel(selected.tutorUserId)}
                        {selected.tutorUserId ? (
                          <div>
                            <button
                              type="button"
                              className="erp-link"
                              onClick={() => filterBy('tutor', selected.tutorUserId)}
                            >
                              Show their bookings
                            </button>
                          </div>
                        ) : null}
                      </>
                    ),
                  },
                  {
                    label: 'Booked by',
                    value: `${titleCase(selected.bookedByUserId?.role || 'student')}${
                      selected.bookedByUserId?.name ? ` · ${selected.bookedByUserId.name}` : ''
                    }`,
                  },
                ]}
              />
            </AdminSection>
            <AdminSection title="Session">
              <AdminKV
                items={[
                  { label: 'Starts', value: formatInZone(selected.startAt, selected.timezone) },
                  selected.timezone && { label: 'Timezone', value: selected.timezone },
                  {
                    label: 'Mode',
                    value: labelFor('delivery_mode', selected.deliveryMode || 'online'),
                  },
                  selected.attendance && { label: 'Attendance', value: titleCase(selected.attendance) },
                  { label: 'Times', value: dualTime(selected, 'admin', zone, { range: true }), full: true },
                ]}
              />
            </AdminSection>
            <AdminSection title="Class proof" actions={<ProofChip booking={selected} />}>
              <AdminKV
                items={[
                  {
                    label: 'Start code',
                    value: selected.classProof?.startVerifiedAt
                      ? formatInZone(selected.classProof.startVerifiedAt, zone)
                      : 'Not entered',
                  },
                  {
                    label: 'End code',
                    value: selected.classProof?.endVerifiedAt
                      ? formatInZone(selected.classProof.endVerifiedAt, zone)
                      : 'Not entered',
                  },
                  selected.classProof?.override && {
                    label: 'Override',
                    value: `${selected.classProof.override.reason} · ${formatInZone(selected.classProof.override.at, zone)}`,
                    full: true,
                  },
                  selected.classProof?.lockedUntil && {
                    label: 'Locked until',
                    value: formatInZone(selected.classProof.lockedUntil, zone),
                  },
                ]}
              />
            </AdminSection>
          </>
        )}
      </ErpModal>

      <BookingEventModal
        open={Boolean(eventBooking)}
        booking={eventBooking}
        role="admin"
        viewerZone={zone}
        onClose={() => setEventBooking(null)}
        actions={
          eventBooking
            ? [
                needsOverride(eventBooking) && new Date(eventBooking.startAt) <= new Date()
                  ? {
                      label: 'Override proof',
                      icon: 'shield-check',
                      variant: 'secondary',
                      onClick: () => {
                        const b = eventBooking;
                        setEventBooking(null);
                        askOverride(b);
                      },
                    }
                  : null,
                {
                  label: 'Full details',
                  icon: 'eye',
                  onClick: () => {
                    const b = eventBooking;
                    setEventBooking(null);
                    openBooking(b);
                  },
                },
              ]
            : []
        }
      />

      <ErpModal
        open={Boolean(override)}
        title="Override class proof"
        onClose={() => !override?.busy && setOverride(null)}
        footer={
          <>
            <ErpButton variant="secondary" disabled={override?.busy} onClick={() => setOverride(null)}>
              Cancel
            </ErpButton>
            <ErpButton
              icon="shield-check"
              loading={override?.busy}
              disabled={(override?.reason || '').trim().length < 3}
              onClick={submitOverride}
            >
              Approve without codes
            </ErpButton>
          </>
        }
      >
        {override && (
          <div className="stack">
            {override.error && <ErpBanner variant="danger">{override.error}</ErpBanner>}
            <p className="muted" style={{ margin: 0 }}>
              {override.booking.subjectId?.name || 'Class'} · {studentLabel(override.booking.studentUserId)} with{' '}
              {tutorLabel(override.booking.tutorUserId)} · {formatInZone(override.booking.startAt, zone)}
            </p>
            <p style={{ margin: 0 }}>
              Confirms the class took place even though the start/end codes were not both entered. The tutor can then
              complete it. Your name, the time and the reason are recorded.
            </p>
            <ErpTextarea
              label="Reason"
              rows={3}
              value={override.reason}
              placeholder="e.g. Student’s phone was off; confirmed with the parent by phone"
              onChange={(e) => setOverride((o) => ({ ...o, reason: e.target.value }))}
            />
          </div>
        )}
      </ErpModal>

      <ErpConfirm
        open={confirmCancel && Boolean(selected)}
        title="Cancel booking"
        danger
        busy={busy}
        confirmLabel="Cancel booking"
        cancelLabel="Keep"
        message={
          selected
            ? `Cancel ${selected.subjectId?.name || 'this class'} on ${formatInZone(
                selected.startAt,
                selected.timezone
              )} for ${studentLabel(selected.studentUserId)} with ${tutorLabel(
                selected.tutorUserId
              )}? Both sides will be notified.`
            : ''
        }
        onConfirm={doCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
