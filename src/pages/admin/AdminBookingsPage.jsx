import { useEffect, useMemo, useState } from 'react';
import { listBookings } from '../../api';
import { useCatalog } from '../../context/CatalogContext';
import {
  ErpButton,
  ErpCard,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatInZone, tutorRef } from '../../utils/format';
import { titleCase } from './adminOptions';

export default function AdminBookingsPage() {
  const { options, labelFor } = useCatalog();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [mode, setMode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listBookings({ limit: 200 });
      setItems(data.items || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    let rows = mode ? items.filter((b) => (b.deliveryMode || 'online') === mode) : items;
    if (tab === 'upcoming') {
      rows = rows.filter(
        (b) => new Date(b.endAt || b.startAt) >= now && b.status !== 'cancelled' && b.status !== 'completed'
      );
    } else if (tab === 'past') {
      rows = rows.filter(
        (b) => b.status === 'completed' || b.status === 'cancelled' || new Date(b.endAt || b.startAt) < now
      );
    }
    return rows;
  }, [items, tab, mode]);

  const list = useListFilter(
    filtered,
    (b) =>
      [
        b.subjectId?.name,
        b.studentUserId?.name,
        b.studentUserId?.phone,
        b.tutorUserId?.refCode,
        b.bookedByUserId?.role,
        b.status,
      ]
        .filter(Boolean)
        .join(' '),
    { resetKey: `${tab}-${mode}` }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Every class booked by students, parents, or tutors. Changes appear here immediately." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
            { value: 'all', label: `All (${items.length})` },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search subject, student, tutor" />
        <ErpSelect
          inline
          value={mode}
          options={options('delivery_mode', { all: 'All modes' })}
          onChange={(e) => setMode(e.target.value)}
        />
        <div className="avail-bar-actions">
          <ErpButton variant="secondary" onClick={load}>
            Refresh
          </ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading bookings…</div>
        ) : !items.length ? (
          <div className="empty">No bookings yet.</div>
        ) : list.noMatch ? (
          <div className="empty">No bookings match that search.</div>
        ) : (
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {list.items.map((b) => (
              <article key={b._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>
                    {b.subjectId?.name || 'Class'}
                    <span className={`erp-chip ${b.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'}`}>
                      {labelFor('delivery_mode', b.deliveryMode || 'online')}
                    </span>
                  </h3>
                  <p className="muted">
                    Student {b.studentUserId?.name || b.studentUserId?.phone || '—'} · {tutorRef(b.tutorUserId)}
                  </p>
                  <p className="muted">{formatInZone(b.startAt, b.timezone)}</p>
                  <div className="booking-card-status">
                    <ErpStatusBadge status={b.status}>{titleCase(b.status)}</ErpStatusBadge>
                    {b.bookedByUserId?.role && (
                      <span className="muted">Booked by {titleCase(b.bookedByUserId.role)}</span>
                    )}
                  </div>
                </div>
                <div className="booking-card-actions">
                  <ErpButton variant="secondary" onClick={() => setSelected(b)}>
                    View
                  </ErpButton>
                </div>
              </article>
            ))}
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="booking" />}
      </ErpCard>

      <ErpModal
        open={Boolean(selected)}
        title="Booking"
        onClose={() => setSelected(null)}
        footer={
          <ErpButton variant="secondary" onClick={() => setSelected(null)}>
            Close
          </ErpButton>
        }
      >
        {selected && (
          <dl className="erp-detail-grid">
            <dt>Subject</dt>
            <dd>{selected.subjectId?.name || '—'}</dd>
            <dt>Student</dt>
            <dd>{selected.studentUserId?.name || selected.studentUserId?.phone || '—'}</dd>
            <dt>Tutor</dt>
            <dd>{tutorRef(selected.tutorUserId)}</dd>
            <dt>Booked by</dt>
            <dd>{titleCase(selected.bookedByUserId?.role || 'student')}</dd>
            <dt>When</dt>
            <dd>{formatInZone(selected.startAt, selected.timezone)}</dd>
            <dt>Status</dt>
            <dd>
              <ErpStatusBadge status={selected.status}>{titleCase(selected.status)}</ErpStatusBadge>
            </dd>
          </dl>
        )}
      </ErpModal>
    </div>
  );
}
