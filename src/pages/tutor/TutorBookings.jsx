import { useEffect, useMemo, useState } from 'react';
import { completeBooking, joinBooking, listBookings, setAttendance } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPageHeader,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
  ErpToolbar,
} from '../../components/erp';
import { formatDate } from '../../utils/format';
import { ATTENDANCE_OPTIONS } from './tutorOptions';

export default function TutorBookings() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

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

  const visible = useMemo(() => {
    if (tab === 'upcoming') {
      const now = new Date();
      return items.filter((b) => new Date(b.startAt) >= now && b.status !== 'cancelled');
    }
    if (tab === 'completed') return items.filter((b) => b.status === 'completed');
    return items;
  }, [items, tab]);

  const selected = items.find((b) => b._id === selectedId) || null;

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Join class, mark attendance, and complete sessions." />
      {error && <div className="error-banner">{error}</div>}

      <ErpToolbar
        actions={
          <ErpButton variant="secondary" onClick={load}>
            Refresh
          </ErpButton>
        }
      />

      <ErpTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'completed', label: 'Completed' },
          { value: 'all', label: `All (${items.length})` },
        ]}
      />

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading bookings…</div>
        ) : !visible.length ? (
          <div className="empty">No bookings in this view.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>When</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => (
                  <tr
                    key={b._id}
                    className="erp-row-click"
                    onClick={() => setSelectedId(b._id)}
                  >
                    <td>{b.studentUserId?.name || b.studentUserId?.phone || '—'}</td>
                    <td>{b.subjectId?.name || '—'}</td>
                    <td>{formatDate(b.startAt)}</td>
                    <td>
                      <span
                        className={`erp-chip ${
                          b.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'
                        }`}
                      >
                        {b.deliveryMode || '—'}
                      </span>
                    </td>
                    <td>
                      <ErpStatusBadge status={b.status}>{b.status}</ErpStatusBadge>
                    </td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(b._id);
                        }}
                      >
                        View
                      </ErpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
      </ErpCard>

      <ErpModal
        open={Boolean(selected)}
        title="Booking"
        onClose={() => setSelectedId('')}
        footer={
          selected ? (
            <>
              <ErpButton variant="secondary" onClick={() => setSelectedId('')}>
                Close
              </ErpButton>
              <ErpButton
                variant="secondary"
                onClick={async () => {
                  try {
                    const j = await joinBooking(selected._id);
                    if (j.deliveryMode === 'offline') {
                      const loc = j.location || {};
                      window.alert(
                        `Offline class: ${[loc.address, loc.area, loc.city].filter(Boolean).join(', ') || 'See profile location'}`
                      );
                    } else if (j.meetingUrl) {
                      window.open(j.meetingUrl, '_blank', 'noopener');
                    }
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                {selected.deliveryMode === 'offline' ? 'Location' : 'Join Zoom'}
              </ErpButton>
              {selected.status !== 'completed' && selected.status !== 'cancelled' && (
                <ErpButton
                  onClick={async () => {
                    try {
                      await completeBooking(selected._id);
                      setSelectedId('');
                      load();
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Complete
                </ErpButton>
              )}
            </>
          ) : null
        }
      >
        {!selected ? null : (
          <div className="stack">
            <dl className="erp-detail-grid">
              <dt>Student</dt>
              <dd>{selected.studentUserId?.name || selected.studentUserId?.phone || '—'}</dd>
              <dt>Subject</dt>
              <dd>{selected.subjectId?.name || '—'}</dd>
              <dt>When</dt>
              <dd>{formatDate(selected.startAt)}</dd>
              <dt>Mode</dt>
              <dd>{selected.deliveryMode || '—'}</dd>
              <dt>Status</dt>
              <dd>
                <ErpStatusBadge status={selected.status}>{selected.status}</ErpStatusBadge>
              </dd>
            </dl>
            <ErpSelect
              label="Attendance"
              value={selected.attendance || 'pending'}
              options={ATTENDANCE_OPTIONS}
              onChange={async (e) => {
                try {
                  await setAttendance(selected._id, e.target.value);
                  load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            />
          </div>
        )}
      </ErpModal>
    </div>
  );
}
