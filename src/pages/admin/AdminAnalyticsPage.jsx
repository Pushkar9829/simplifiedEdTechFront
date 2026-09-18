import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsOverview, analyticsTutor, analyticsTutors } from '../../api';
import { ErpButton, ErpModal, ErpPageHeader, ErpTabs, ErpToolbar } from '../../components/erp';
import { formatDate, money } from '../../utils/format';
import { titleCase } from './adminOptions';
import './AdminAnalytics.css';

function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="muted" style={{ marginTop: '0.2rem' }}>{hint}</div> : null}
    </div>
  );
}

function CountList({ rows, empty = 'No data.' }) {
  if (!rows?.length) return <div className="empty">{empty}</div>;
  const max = Math.max(...rows.map((r) => Number(r.count) || 0), 1);
  return (
    <div className="analytics-bars">
      {rows.map((r) => {
        const key = r._id ?? r.key ?? r.name ?? '—';
        const count = Number(r.count) || 0;
        return (
          <div key={String(key)} className="analytics-bar-row">
            <div className="analytics-bar-meta">
              <span>{typeof key === 'string' ? titleCase(key) : key}</span>
              <strong>{count}</strong>
            </div>
            <div className="analytics-bar-track">
              <div className="analytics-bar-fill" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendList({ rows, empty = 'No trend data.' }) {
  if (!rows?.length) return <div className="empty">{empty}</div>;
  const ordered = [...rows].reverse();
  const max = Math.max(...ordered.map((r) => Number(r.count) || 0), 1);
  return (
    <div className="analytics-bars">
      {ordered.map((r) => {
        const count = Number(r.count) || 0;
        return (
          <div key={r._id} className="analytics-bar-row">
            <div className="analytics-bar-meta">
              <span>{r._id}</span>
              <strong>{count}</strong>
            </div>
            <div className="analytics-bar-track">
              <div className="analytics-bar-fill" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section className="erp-card stack analytics-section">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function AdminAnalyticsPage() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    Promise.all([analyticsOverview(), analyticsTutors()])
      .then(([o, t]) => {
        setOverview(o);
        setTutors(Array.isArray(t) ? t : t?.items || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  const live = overview?.live;
  const adminFed = overview?.adminFed;
  const summary = live?.summary;

  const revenueTotal = useMemo(() => {
    if (!live?.revenue?.length) return summary?.totalRevenue || 0;
    return live.revenue.reduce((s, r) => s + (r.total || 0), 0);
  }, [live, summary]);

  const openTutor = async (tutorUserId) => {
    setLoadingDetail(true);
    setDetailError('');
    setDetail(null);
    try {
      const data = await analyticsTutor(tutorUserId);
      setDetail(data);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (error) return <div className="error-banner">{error}</div>;
  if (!overview) return <div className="empty">Loading analytics…</div>;

  const refresh = () => {
    setError('');
    setOverview(null);
    Promise.all([analyticsOverview(), analyticsTutors()])
      .then(([o, t]) => {
        setOverview(o);
        setTutors(Array.isArray(t) ? t : t?.items || []);
      })
      .catch((err) => setError(err.message));
  };

  return (
    <div className="page stack analytics-page">
      <ErpPageHeader subtitle="Live aggregates + admin-fed campaign metrics" />
      <ErpToolbar actions={<ErpButton variant="secondary" onClick={refresh}>Refresh</ErpButton>} />
      <ErpTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'tutors', label: 'Tutors' },
          { value: 'campaigns', label: 'Campaigns' },
        ]}
      />

      {tab === 'overview' && (
        <>
      <div className="grid three">
        <Stat label="Total users" value={summary?.totalUsers ?? 0} />
        <Stat
          label="Students / Tutors / Parents"
          value={`${summary?.studentCount ?? 0} / ${summary?.tutorCount ?? 0} / ${summary?.parentCount ?? 0}`}
        />
        <Stat
          label="Approved tutors"
          value={summary?.approvedTutors ?? 0}
          hint={`${summary?.pendingVerifications ?? 0} pending verification`}
        />
        <Stat label="Total bookings" value={summary?.totalBookings ?? 0} />
        <Stat
          label="Paid revenue"
          value={money(revenueTotal)}
          hint={`${summary?.paidPaymentCount ?? 0} paid invoices`}
        />
        <Stat
          label="Open tickets"
          value={summary?.openTickets ?? 0}
          hint={`${summary?.unreadNotifications ?? 0} unread notifications`}
        />
      </div>

      <div className="grid two">
        <Section
          title="Users by role"
          action={
            <Link to="/admin/users" className="btn secondary">
              Manage
            </Link>
          }
        >
          <CountList rows={live?.usersByRole} empty="No user stats." />
        </Section>
        <Section title="Users by status">
          <CountList rows={live?.usersByStatus} />
        </Section>
      </div>

      <div className="grid two">
        <Section
          title="Bookings by status"
          action={
            <Link to="/admin/payments" className="btn secondary">
              Payments
            </Link>
          }
        >
          <CountList rows={live?.bookingStatus} />
        </Section>
        <Section title="Attendance summary">
          <CountList rows={live?.attendanceSummary} />
        </Section>
      </div>

      <div className="grid two">
        <Section title="Payments by status">
          <CountList rows={live?.paymentsByStatus} />
          {(live?.revenue || []).length > 0 && (
            <div className="stack" style={{ marginTop: '0.5rem' }}>
              <div className="muted">Paid revenue by currency</div>
              {live.revenue.map((r) => (
                <div key={r._id} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{r._id || 'USD'}</span>
                  <strong>
                    {money(r.total, r._id)} · {r.count} txns
                  </strong>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Paid payment trend (30d)">
          <TrendList rows={live?.paymentTrend} />
        </Section>
      </div>

      <div className="grid two">
        <Section title="Registration trend (30d)">
          <TrendList rows={live?.registrations} />
        </Section>
        <Section title="Booking trend (30d)">
          <TrendList rows={live?.bookingTrend} />
        </Section>
      </div>

      <Section title="Subject popularity">
        {!live?.subjectPopularity?.length ? (
          <div className="empty">No subject popularity data.</div>
        ) : (
          <table className="erp-data-table table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th>Tutors offering</th>
                <th>Bookings</th>
              </tr>
            </thead>
            <tbody>
              {live.subjectPopularity.map((s) => (
                <tr key={s.subjectId}>
                  <td>{s.name}</td>
                  <td>{s.code || '—'}</td>
                  <td>{s.tutors}</td>
                  <td>{s.bookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <div className="grid two">
        <Section title="Homework & learning">
          <div className="grid two" style={{ marginBottom: '0.65rem' }}>
            <Stat label="Completion rate" value={`${live?.homework?.completionRate ?? 0}%`} />
            <Stat label="Submissions" value={live?.homework?.submissionCount ?? 0} />
            <Stat label="Study hours logged" value={live?.learning?.progressHours ?? 0} />
            <Stat label="Badges awarded" value={live?.learning?.badgesAwarded ?? 0} />
          </div>
          <CountList rows={live?.homework?.byStatus} empty="No homework data." />
          <div className="muted" style={{ marginTop: '0.55rem' }}>
            Avg streak {live?.learning?.studyStreak?.avg ?? 0} · max{' '}
            {live?.learning?.studyStreak?.max ?? 0} · lesson plans{' '}
            {live?.learning?.lessonPlans ?? 0}
          </div>
        </Section>
        <Section title="Resources by type">
          <CountList
            rows={(live?.learning?.resourcesByType || []).map((r) => ({
              _id: r._id,
              count: r.count,
            }))}
            empty="No active resources."
          />
          <div className="muted" style={{ marginTop: '0.55rem' }}>
            {live?.learning?.activeResources ?? 0} active resources ·{' '}
            {live?.subscriptions?.activePlans ?? 0} active plans
          </div>
        </Section>
      </div>

      <div className="grid two">
        <Section
          title="Tutor verification"
          action={
            <Link to="/admin/verifications" className="btn secondary">
              Review
            </Link>
          }
        >
          <div className="grid two">
            <Stat label="Pending docs" value={live?.verification?.pending ?? 0} />
            <Stat label="Approved" value={live?.verification?.approvedTutors ?? 0} />
            <Stat label="Pending status" value={live?.verification?.pendingTutors ?? 0} />
            <Stat label="Rejected" value={live?.verification?.rejectedTutors ?? 0} />
          </div>
          <div className="muted" style={{ marginTop: '0.55rem' }}>
            Docs uploaded — identity {live?.verification?.docs?.withIdentity ?? 0}, degree{' '}
            {live?.verification?.docs?.withDegree ?? 0}, certificate{' '}
            {live?.verification?.docs?.withCertificate ?? 0}, resume{' '}
            {live?.verification?.docs?.withResume ?? 0}
          </div>
        </Section>
        <Section
          title="Support & engagement"
          action={
            <Link to="/admin/tickets" className="btn secondary">
              Tickets
            </Link>
          }
        >
          <CountList rows={live?.support?.byStatus} empty="No tickets." />
          <div className="muted" style={{ marginTop: '0.55rem' }}>
            {live?.engagement?.conversations ?? 0} conversations ·{' '}
            {live?.engagement?.messages ?? 0} messages · {live?.engagement?.parentLinks ?? 0} parent
            links
          </div>
        </Section>
      </div>
        </>
      )}

      {tab === 'tutors' && (
      <Section title="Tutor performance">
        {!tutors.length ? (
          <div className="empty">No tutor performance data.</div>
        ) : (
          <table className="erp-data-table table">
            <thead>
              <tr>
                <th>Tutor</th>
                <th>Bookings</th>
                <th>Completed</th>
                <th>Attendance</th>
                <th>Revenue</th>
                <th>Homework</th>
                <th>Rating</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tutors.map((t) => (
                <tr
                  key={t.tutorUserId}
                  className="erp-row-click"
                  onClick={() => openTutor(t.tutorUserId)}
                >
                  <td>
                    <strong>{t.name || t.phone}</strong>
                    <div className="muted">{t.phone}</div>
                  </td>
                  <td>{t.totalBookings}</td>
                  <td>{t.completedBookings}</td>
                  <td>{t.attendanceRate}%</td>
                  <td>{money(t.revenue)}</td>
                  <td>
                    {t.assignmentsGraded}/{t.assignmentsCreated}
                  </td>
                  <td>
                    {t.ratingAvg} ({t.ratingCount})
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTutor(t.tutorUserId);
                      }}
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
      )}

      <ErpModal
        open={loadingDetail || Boolean(detail) || Boolean(detailError)}
        title="Tutor detail"
        size="lg"
        onClose={() => {
          setDetail(null);
          setDetailError('');
        }}
      >
          {loadingDetail && <div className="empty">Loading detail…</div>}
          {detailError && <div className="error-banner">{detailError}</div>}
          {detail && (
            <div className="stack">
              <div className="grid three">
                <Stat label="Tutor" value={detail.name || detail.phone || '—'} />
                <Stat label="Revenue" value={money(detail.revenue)} />
                <Stat
                  label="Rating"
                  value={`${detail.ratingAvg ?? '—'} (${detail.ratingCount ?? 0})`}
                />
                <Stat label="Bookings" value={detail.totalBookings ?? 0} />
                <Stat label="Attendance" value={`${detail.attendanceRate ?? 0}%`} />
                <Stat
                  label="Homework graded"
                  value={`${detail.assignmentsGraded ?? 0}/${detail.assignmentsCreated ?? 0}`}
                />
              </div>

              {!!detail.subjects?.length && (
                <div>
                  <h3>Subjects</h3>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    {detail.subjects.map((s, i) => (
                      <span key={`${s.name}-${i}`} className="badge">
                        {s.name} {s.level} · {money(s.hourlyRate)}/hr
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!!detail.recentBookings?.length && (
                <div>
                  <h3>Recent bookings</h3>
                  <table className="erp-data-table table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Student</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.recentBookings.map((b) => (
                        <tr key={b._id}>
                          <td>{formatDate(b.startAt)}</td>
                          <td>{b.studentUserId?.name || b.studentUserId?.phone || '—'}</td>
                          <td>{b.subjectId?.name || '—'}</td>
                          <td>{b.status}</td>
                          <td>{b.attendance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!!detail.recentReviews?.length && (
                <div>
                  <h3>Recent reviews</h3>
                  {detail.recentReviews.map((r) => (
                    <div key={r._id} style={{ marginBottom: '0.45rem' }}>
                      <strong>{r.rating}/5</strong>{' '}
                      <span className="muted">
                        {r.studentUserId?.name || 'Student'} · {formatDate(r.createdAt)}
                      </span>
                      {r.comment && <div>{r.comment}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </ErpModal>

      {tab === 'campaigns' && (
      <Section
        title="Campaign metrics (admin-fed)"
        action={
          <Link to="/admin/campaigns" className="btn secondary">
            Manage
          </Link>
        }
      >
        <div className="grid three" style={{ marginBottom: '0.65rem' }}>
          <Stat label="Campaigns" value={adminFed?.campaignSummary?.count ?? 0} />
          <Stat label="Total spend" value={money(adminFed?.campaignSummary?.totalSpend)} />
          <Stat
            label="Leads → conversions"
            value={`${adminFed?.campaignSummary?.totalLeads ?? 0} → ${adminFed?.campaignSummary?.totalConversions ?? 0}`}
            hint={`${adminFed?.campaignSummary?.conversionRate ?? 0}% conversion`}
          />
        </div>
        {!adminFed?.campaigns?.length ? (
          <div className="empty">No campaign metrics.</div>
        ) : (
          <table className="erp-data-table table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Channel</th>
                <th>Spend</th>
                <th>Leads</th>
                <th>Conversions</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {adminFed.campaigns.map((c) => {
                const rate =
                  c.leads > 0 ? Math.round((c.conversions / c.leads) * 1000) / 10 : 0;
                return (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.name}</strong>
                      {c.notes && <div className="muted">{c.notes}</div>}
                    </td>
                    <td>{titleCase(c.channel)}</td>
                    <td>{money(c.spend)}</td>
                    <td>{c.leads}</td>
                    <td>{c.conversions}</td>
                    <td>{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>
      )}
    </div>
  );
}
