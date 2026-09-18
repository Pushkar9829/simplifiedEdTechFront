import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBookings, listHomework, tutorEarnings } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ErpPageHeader } from '../../components/erp';
import { formatDate, money, statusBadge } from '../../utils/format';
import { titleCase } from './tutorOptions';

export default function TutorDashboard() {
  const { profile } = useAuth();
  const verification = profile?.verificationStatus || 'not_submitted';
  const [bookings, setBookings] = useState([]);
  const [homework, setHomework] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([listBookings(), listHomework(), tutorEarnings()])
      .then(([b, h, e]) => {
        setBookings(b.items || []);
        setHomework(h.items || []);
        setEarnings(e.items || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = bookings.filter(
      (b) => new Date(b.startAt) >= now && b.status !== 'cancelled'
    );
    const byStatus = {};
    bookings.forEach((b) => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    });
    const attendance = { present: 0, absent: 0, pending: 0 };
    bookings.forEach((b) => {
      const key = b.attendance || 'pending';
      attendance[key] = (attendance[key] || 0) + 1;
    });
    const hwByStatus = {};
    homework.forEach((h) => {
      hwByStatus[h.status] = (hwByStatus[h.status] || 0) + 1;
    });
    const revenue = earnings.reduce((sum, p) => sum + (p.amount || 0), 0);
    const students = new Set(
      bookings.map((b) => b.studentUserId?._id || b.studentUserId).filter(Boolean)
    );
    return {
      upcoming,
      byStatus,
      attendance,
      hwByStatus,
      revenue,
      studentCount: students.size,
      paidCount: earnings.length,
    };
  }, [bookings, homework, earnings]);

  if (loading) return <div className="empty">Loading dashboard…</div>;

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Teaching analytics from your live bookings, homework, and earnings"
        actions={
          <Link to="/tutor/availability" className="erp-btn-secondary">
            Manage availability
          </Link>
        }
      />

      {error && <div className="error-banner">{error}</div>}
      {verification !== 'approved' && (
        <div className={verification === 'rejected' ? 'error-banner' : 'erp-card'}>
          Verification is {titleCase(verification.replaceAll('_', ' '))}. Students cannot find you
          until an admin approves you.{' '}
          <Link to="/tutor/verification">Open verification</Link>
        </div>
      )}

      <div className="grid three">
        <div className="stat">
          <div className="label">Upcoming classes</div>
          <div className="value">{stats.upcoming.length}</div>
        </div>
        <div className="stat">
          <div className="label">Active students</div>
          <div className="value">{stats.studentCount}</div>
        </div>
        <div className="stat">
          <div className="label">Confirmed earnings</div>
          <div className="value">{money(stats.revenue)}</div>
        </div>
        <div className="stat">
          <div className="label">Paid lessons</div>
          <div className="value">{stats.paidCount}</div>
        </div>
        <div className="stat">
          <div className="label">Homework open</div>
          <div className="value">
            {(stats.hwByStatus.assigned || 0) + (stats.hwByStatus.submitted || 0)}
          </div>
        </div>
        <div className="stat">
          <div className="label">Present sessions</div>
          <div className="value">{stats.attendance.present || 0}</div>
        </div>
      </div>

      <div className="grid two">
        <section className="erp-card stack">
          <h2>Bookings by status</h2>
          {!Object.keys(stats.byStatus).length ? (
            <div className="empty">No bookings yet.</div>
          ) : (
            Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{titleCase(status)}</span>
                <strong>{count}</strong>
              </div>
            ))
          )}
        </section>
        <section className="erp-card stack">
          <h2>Attendance</h2>
          {['present', 'absent', 'pending'].map((key) => (
            <div key={key} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{titleCase(key)}</span>
              <strong>{stats.attendance[key] || 0}</strong>
            </div>
          ))}
        </section>
      </div>

      <div className="grid two">
        <section className="erp-card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Next classes</h2>
            <Link to="/tutor/bookings" className="btn secondary">
              All bookings
            </Link>
          </div>
          {stats.upcoming.slice(0, 6).map((b) => (
            <div key={b._id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                {b.subjectId?.name} with {b.studentUserId?.name || b.studentUserId?.phone}
              </span>
              <span className="muted">{formatDate(b.startAt)}</span>
            </div>
          ))}
          {!stats.upcoming.length && <div className="empty">No upcoming classes.</div>}
        </section>
        <section className="erp-card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Homework pipeline</h2>
            <Link to="/tutor/homework" className="btn secondary">
              Manage
            </Link>
          </div>
          {['assigned', 'submitted', 'graded', 'overdue'].map((status) => (
            <div key={status} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                <span className={statusBadge(status)}>{titleCase(status)}</span>
              </span>
              <strong>{stats.hwByStatus[status] || 0}</strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
