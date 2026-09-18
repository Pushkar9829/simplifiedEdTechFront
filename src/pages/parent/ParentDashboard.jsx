import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listChildren, parentDashboard } from '../../api';
import { ErpSelect } from '../../components/erp';
import { formatDate, money, statusBadge } from '../../utils/format';
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
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Parent dashboard</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Attendance, progress, homework, and payments for linked children
          </p>
        </div>
        <div className="row">
          <Link to="/parent/tutors" className="btn">
            Find a tutor
          </Link>
          <Link to="/parent/children/link" className="btn secondary">
            Link child
          </Link>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="erp-card empty">Loading…</div>
      ) : !children.length ? (
        <div className="erp-card empty">
          No linked children yet.{' '}
          <Link to="/parent/children/link">Link a child</Link> with their registered phone.
        </div>
      ) : (
        <div className="erp-card">
          <ErpSelect
            label="Child"
            value={selected}
            options={childOptions(children)}
            onChange={(e) => setSelected(e.target.value)}
          />
        </div>
      )}

      {loadingDash && <div className="empty">Loading child dashboard…</div>}

      {data && !loadingDash && (
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
            <section className="erp-card stack">
              <h2>Attendance</h2>
              <CountRows obj={data.attendance} />
            </section>
            <section className="erp-card stack">
              <h2>Bookings by status</h2>
              <CountRows obj={data.bookingByStatus} />
            </section>
          </div>

          <div className="grid two">
            <section className="erp-card stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0 }}>Upcoming classes</h2>
              </div>
              {!(data.upcomingClasses || []).length && (
                <div className="empty">No upcoming classes.</div>
              )}
              {(data.upcomingClasses || []).map((b) => (
                <div key={b._id} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>
                    {b.subjectId?.name || 'Class'} · {b.tutorUserId?.name || 'Tutor'}
                  </span>
                  <span className="muted">{formatDate(b.startAt)}</span>
                </div>
              ))}
            </section>
            <section className="erp-card stack">
              <h2>Homework</h2>
              <CountRows obj={data.homeworkByStatus} empty="No homework." />
              <div style={{ marginTop: '0.45rem' }}>
                {(data.homework || []).slice(0, 5).map((h) => (
                  <div key={h._id} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>{h.title}</span>
                    <span className={statusBadge(h.status)}>{h.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid two">
            <section className="erp-card stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0 }}>Payments</h2>
                <Link to="/parent/payments" className="btn secondary">
                  All payments
                </Link>
              </div>
              <CountRows obj={data.paymentsByStatus} empty="No payments." />
              {(data.payments || []).slice(0, 5).map((p) => (
                <div key={p._id} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{money(p.amount, p.currency)}</span>
                  <span className={statusBadge(p.status)}>{p.status}</span>
                </div>
              ))}
            </section>
            <section className="erp-card stack">
              <h2>Academic snapshot</h2>
              <p>
                <span className="muted">Weak topics:</span>{' '}
                {(data.progress?.weakTopics || []).join(', ') || '—'}
              </p>
              <p>
                <span className="muted">Strong topics:</span>{' '}
                {(data.progress?.strongTopics || []).join(', ') || '—'}
              </p>
              <h3>Predicted grades</h3>
              {!Object.keys(data.predictedGrades || {}).length ? (
                <div className="empty">No predicted grades yet.</div>
              ) : (
                Object.entries(data.predictedGrades).map(([subject, grade]) => (
                  <div key={subject} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>{subject}</span>
                    <strong>{grade}</strong>
                  </div>
                ))
              )}
            </section>
          </div>

          {!!(data.recentClasses || []).length && (
            <section className="erp-card">
              <h2>Recent classes</h2>
              <table className="erp-data-table table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentClasses.map((b) => (
                    <tr key={b._id}>
                      <td>{formatDate(b.startAt)}</td>
                      <td>{b.subjectId?.name || '—'}</td>
                      <td>
                        <span className={statusBadge(b.status)}>{b.status}</span>
                      </td>
                      <td>
                        <span className={statusBadge(b.attendance)}>{b.attendance}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
