import { useEffect, useMemo, useState } from 'react';
import { cancelBooking, listBookings } from '../../api';
import { useCatalog } from '../../context/CatalogContext';
import {
  ErpBanner,
  ErpButton,
  ErpConfirm,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSelect,
  ErpTabs,
} from '../../components/erp';
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

function tutorLabel(t) {
  if (!t) return '—';
  return [t.name, t.refCode].filter(Boolean).join(' · ') || tutorRef(t);
}

function studentLabel(s) {
  if (!s) return '—';
  return [s.name, s.phone].filter(Boolean).join(' · ') || '—';
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const now = new Date().toISOString();
    const params = { page, limit: PAGE_SIZE, status };
    if (tab === 'upcoming') {
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
  }, [page, tab, status, person, reloadKey]);

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
  const filtered = Boolean(status || mode || person);
  const modeChip = (b) => (
    <span className={`erp-chip ${b.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'}`}>
      {labelFor('delivery_mode', b.deliveryMode || 'online')}
    </span>
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Every class booked by students, parents or tutors. Changes appear here immediately." />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}

      <AdminTableCard
        tabs={
          <ErpTabs
            value={tab}
            onChange={resetPage(setTab)}
            tabs={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
              { value: 'all', label: 'All bookings' },
            ]}
          />
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
            {person ? (
              <AdminFilterChip
                label={`${titleCase(person.kind)}: ${person.label}`}
                onClear={() => resetPage(setPerson)(null)}
              />
            ) : null}
          </AdminToolbar>
        }
        footer={
          total > PAGE_SIZE ? (
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
        {loading || !rows.length ? (
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
                    <td data-label="When" className="adm-nowrap">
                      {formatInZone(b.startAt, b.timezone)}
                    </td>
                    <td data-label="Status">
                      <AdminStatus status={b.status} />
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
                ]}
              />
            </AdminSection>
          </>
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
