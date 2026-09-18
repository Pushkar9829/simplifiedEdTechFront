import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cancelBooking, joinBooking, listBookings, rescheduleBooking } from '../../api';
import { formatDate, statusBadge } from '../../utils/format';
import { titleCase } from './studentOptions';

export default function StudentBookings() {
  const location = useLocation();
  const findPath = location.pathname.startsWith('/parent') ? '/parent/tutors' : '/student/tutors';
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

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

      <div className="erp-card">
        {loading ? (
          <div className="empty">Loading bookings…</div>
        ) : !items.length ? (
          <div className="empty">
            No bookings yet. <Link to={findPath}>Find a tutor</Link>
          </div>
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
              {items.map((b) => (
                <tr key={b._id}>
                  <td>{b.subjectId?.name || '—'}</td>
                  <td>{b.tutorUserId?.name || '—'}</td>
                  <td>{formatDate(b.startAt)}</td>
                  <td>{b.deliveryMode || '—'}</td>
                  <td>
                    <span className={statusBadge(b.status)}>{titleCase(b.status)}</span>
                  </td>
                  <td className="row">
                    {b.status !== 'cancelled' && (
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={async () => {
                          try {
                            const j = await joinBooking(b._id);
                            if (j.deliveryMode === 'offline') {
                              const loc = j.location || {};
                              window.alert(
                                `Offline class: ${[loc.area, loc.city, loc.address].filter(Boolean).join(', ') || 'See tutor profile'}`
                              );
                            } else if (j.meetingUrl) {
                              window.open(j.meetingUrl, '_blank', 'noopener');
                            }
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        {b.deliveryMode === 'offline' ? 'Location' : 'Join Zoom'}
                      </button>
                    )}
                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                      <>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={async () => {
                            const startAt = window.prompt(
                              'New start (ISO)',
                              new Date(Date.now() + 86400000).toISOString().slice(0, 16)
                            );
                            if (!startAt) return;
                            const start = new Date(startAt);
                            const end = new Date(start.getTime() + 60 * 60 * 1000);
                            try {
                              await rescheduleBooking(b._id, {
                                startAt: start.toISOString(),
                                endAt: end.toISOString(),
                              });
                              setMsg('Rescheduled');
                              load();
                            } catch (err) {
                              setError(err.message);
                            }
                          }}
                        >
                          Reschedule
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('Cancel this booking?')) return;
                            try {
                              await cancelBooking(b._id);
                              setMsg('Cancelled');
                              load();
                            } catch (err) {
                              setError(err.message);
                            }
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
