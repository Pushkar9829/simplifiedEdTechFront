import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listChildren, parentDashboard } from '../../api';
import { ErpCard, ErpPageHeader, ErpSelect, ErpStatusBadge, ErpTabs } from '../../components/erp';
import { formatDate, money, tutorRef } from '../../utils/format';
import { childOptions, titleCase } from './parentOptions';

function CountRows({ obj, empty = 'No data.' }) {
  const entries = Object.entries(obj || {});
  if (!entries.length) return <div className="empty">{empty}</div>;
  return entries.map(([key, count]) => (
    <div key={key} className="row" style={{ justifyContent: 'space-between' }}>
      <span>{titleCase(key)}</span>
      <strong>{count}</strong>
    </div>
  ));
}

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDash, setLoadingDash] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    listChildren()
      .then((links) => {
        setChildren(links || []);
        const first = links?.[0]?.studentUserId;
        if (first?._id) setSelected(first._id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) {
      setData(null);
      return;
    }
    setLoadingDash(true);
    parentDashboard(selected)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDash(false));
  }, [selected]);

  const summary = data?.summary;

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Attendance, progress, homework, and payments for linked children"
        actions={
          <div className="row">
            <Link to="/parent/tutors" className="btn">
              Find a tutor
            </Link>
            <Link to="/parent/children/link" className="btn secondary">
              Link child
            </Link>
          </div>
        }
      />

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <ErpCard>
          <div className="empty">Loading…</div>
        </ErpCard>
      ) : !children.length ? (
        <ErpCard>
          <div className="empty">
            No linked children yet. <Link to="/parent/children/link">Link a child</Link> with their registered phone.
          </div>
        </ErpCard>
      ) : (
        <div className="avail-bar">
          <ErpTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'overview', label: 'Overview' },
              { value: 'classes', label: 'Classes' },
              { value: 'homework', label: 'Homework' },
              { value: 'payments', label: 'Payments' },
            ]}
          />
          <ErpSelect
            inline
            value={selected}
            options={childOptions(children)}
            onChange={(e) => setSelected(e.target.value)}
          />
        </div>
      )}

      {loadingDash && <div className="empty">Loading child dashboard…</div>}

      {data && !loadingDash && tab === 'overview' && (
        <>
          <div className="grid three">
            <div className="stat">
              <div className="label">Upcoming classes</div>
              <div className="value">{summary?.upcomingCount ?? 0}</div>
            </div>
            <div className="stat">
              <div className="label">Homework open</div>
              <div className="value">{summary?.homeworkOpen ?? 0}</div>
            </div>
            <div className="stat">
              <div className="label">Study streak</div>
              <div className="value">{summary?.studyStreak ?? 0}</div>
            </div>
            <div className="stat">
              <div className="label">Present sessions</div>
              <div className="value">{summary?.attendancePresent ?? 0}</div>
            </div>
            <div className="stat">
              <div className="label">Paid total</div>
              <div className="value">{money(summary?.paidTotal)}</div>
            </div>
            <div className="stat">
              <div className="label">Pending payments</div>
              <div className="value">{money(summary?.pendingTotal)}</div>
            </div>
          </div>
          <div className="grid two">
            <ErpCard className="stack">
              <h2 style={{ margin: 0 }}>Attendance</h2>
              <CountRows obj={data.attendance} />
            </ErpCard>
            <ErpCard className="stack">
              <h2 style={{ margin: 0 }}>Bookings by status</h2>
              <CountRows obj={data.bookingByStatus} />
            </ErpCard>
          </div>
        </>
      )}

      {data && !loadingDash && tab === 'classes' && (
        <ErpCard className="erp-card-flush">
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {!(data.upcomingClasses || []).length && !(data.recentClasses || []).length && (
              <div className="empty">No classes yet.</div>
            )}
            {(data.upcomingClasses || []).map((b) => (
              <article key={b._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>{b.subjectId?.name || 'Class'}</h3>
                  <p className="muted">
                    {tutorRef(b.tutorUserId)} · {formatDate(b.startAt)}
                  </p>
                </div>
                <ErpStatusBadge status="confirmed">Upcoming</ErpStatusBadge>
              </article>
            ))}
            {(data.recentClasses || []).map((b) => (
              <article key={b._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>{b.subjectId?.name || 'Class'}</h3>
                  <p className="muted">{formatDate(b.startAt)}</p>
                  <div className="booking-card-status">
                    <ErpStatusBadge status={b.status}>{titleCase(b.status)}</ErpStatusBadge>
                    <span className="muted">{titleCase(b.attendance)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </ErpCard>
      )}

      {data && !loadingDash && tab === 'homework' && (
        <ErpCard className="erp-card-flush">
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            <CountRows obj={data.homeworkByStatus} empty="No homework." />
            {(data.homework || []).slice(0, 8).map((h) => (
              <article key={h._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>{h.title}</h3>
                </div>
                <ErpStatusBadge status={h.status}>{titleCase(h.status)}</ErpStatusBadge>
              </article>
            ))}
          </div>
        </ErpCard>
      )}

      {data && !loadingDash && tab === 'payments' && (
        <ErpCard className="erp-card-flush">
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            <div className="row" style={{ justifyContent: 'space-between', padding: '0 0.25rem' }}>
              <CountRows obj={data.paymentsByStatus} empty="No payments." />
              <Link to="/parent/payments" className="btn secondary">
                All payments
              </Link>
            </div>
            {(data.payments || []).slice(0, 8).map((p) => (
              <article key={p._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>{money(p.amount, p.currency)}</h3>
                  <p className="muted">{p.description || 'Class payment'}</p>
                </div>
                <ErpStatusBadge status={p.status}>{titleCase(p.status)}</ErpStatusBadge>
              </article>
            ))}
          </div>
        </ErpCard>
      )}
    </div>
  );
}
