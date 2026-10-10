import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminPayments,
  adminWithdrawals,
  analyticsOverview,
  analyticsTutor,
  analyticsTutors,
} from '../../api';
import {
  ErpAttentionItem,
  ErpAttentionList,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpHero,
  ErpLoadingState,
  ErpModal,
  ErpSkeleton,
  ErpStat,
  ErpStatusBadge,
  ErpTabs,
  Icon,
} from '../../components/erp';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../utils/errors';
import { formatDate, money } from '../../utils/format';
import {
  AdminCell,
  AdminKV,
  AdminSection,
  AdminSummary,
  AdminTableCard,
} from './AdminKit';
import { plainAmount, titleCase } from './adminOptions';
import './AdminAnalytics.css';

/* ── helpers ─────────────────────────────────────────────── */

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function revenueRows(rows) {
  return (rows || [])
    .map((r) => ({ currency: r.currency || r._id || 'USD', total: r.total || 0, count: r.count || 0 }))
    .filter((r) => r.total || r.count)
    .sort((a, b) => b.total - a.total);
}

function moneyByCurrency(rows) {
  const list = revenueRows(rows);
  if (!list.length) return money(0);
  return list.map((r) => money(r.total, r.currency)).join(' · ');
}

const DAY = 24 * 60 * 60 * 1000;

function utcKey(d) {
  return d.toISOString().slice(0, 10);
}

/** Fill a sparse [{_id:'YYYY-MM-DD', count}] list into `days` consecutive UTC days ending today. */
function dailySeries(rows, days = 30) {
  const map = Object.fromEntries((rows || []).map((r) => [r._id, Number(r.count) || 0]));
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getTime() - (days - 1 - i) * DAY);
    const key = utcKey(d);
    return { key, date: d, count: map[key] || 0 };
  });
}

function shortDay(d) {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/* ── charts ──────────────────────────────────────────────── */

function BarList({ rows, empty = 'No data yet.', format = titleCase }) {
  if (!rows?.length) return <p className="muted" style={{ margin: 0 }}>{empty}</p>;
  const total = rows.reduce((s, r) => s + (Number(r.count) || 0), 0) || 1;
  const max = Math.max(...rows.map((r) => Number(r.count) || 0), 1);
  return (
    <ul className="adm-bars">
      {rows.map((r) => {
        const key = r._id ?? r.key ?? r.name ?? 'unknown';
        const count = Number(r.count) || 0;
        return (
          <li key={String(key)}>
            <div className="adm-bar-meta">
              <span>{typeof key === 'string' ? format(key) || 'Unset' : String(key)}</span>
              <strong>
                {count.toLocaleString()}
                <span className="adm-bar-share">{Math.round((count / total) * 100)}%</span>
              </strong>
            </div>
            <div className="adm-bar-track" aria-hidden="true">
              <div className="adm-bar-fill" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Daily column chart (single series) with hover / focus readout. */
function TrendCard({ title, rows, noun, to, linkLabel }) {
  const series = useMemo(() => dailySeries(rows, 30), [rows]);
  const [hover, setHover] = useState(null);
  const total = series.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...series.map((d) => d.count), 1);
  const active = hover != null ? series[hover] : null;

  return (
    <ErpCard
      heading={title}
      description="Last 30 days"
      headerActions={
        to ? (
          <Link to={to} className="erp-link" style={{ fontSize: 'var(--erp-font-sm)' }}>
            {linkLabel || 'View'}
          </Link>
        ) : null
      }
    >
      <div className="adm-trend-head">
        <span className="adm-trend-total">{total.toLocaleString()}</span>
        <span className="adm-trend-readout" aria-live="polite">
          {active ? (
            <>
              {shortDay(active.date)} · <strong>{active.count}</strong> {noun}
              {active.count === 1 ? '' : 's'}
            </>
          ) : (
            `Peak ${max === 1 && total === 0 ? 0 : max} / day`
          )}
        </span>
      </div>
      <ul
        className="adm-columns"
        aria-label={`${title}, daily counts for the last 30 days`}
        onMouseLeave={() => setHover(null)}
      >
        {series.map((d, i) => (
          <li
            key={d.key}
            tabIndex={0}
            aria-label={`${shortDay(d.date)}: ${d.count} ${noun}${d.count === 1 ? '' : 's'}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <span
              className={`adm-column${d.count ? '' : ' is-zero'}`}
              style={d.count ? { height: `${Math.max(4, (d.count / max) * 100)}%` } : undefined}
            />
          </li>
        ))}
      </ul>
      <div className="adm-trend-axis" aria-hidden="true">
        <span>{shortDay(series[0].date)}</span>
        <span>{shortDay(series[series.length - 1].date)}</span>
      </div>
    </ErpCard>
  );
}

function MiniStats({ items }) {
  return (
    <dl className="adm-mini-stats">
      {items.map((i) => (
        <div key={i.label} className="adm-mini-stat">
          <dt>{i.label}</dt>
          <dd>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CardLink({ to, children }) {
  return (
    <Link to={to} className="erp-link" style={{ fontSize: 'var(--erp-font-sm)' }}>
      {children}
    </Link>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [queueExtra, setQueueExtra] = useState({ refunds: null, withdrawals: null });
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    setError('');
    setRefreshing(true);
    try {
      const [o, t] = await Promise.all([analyticsOverview(), analyticsTutors()]);
      setOverview(o);
      setTutors(Array.isArray(t) ? t : t?.items || []);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
    // Queue extras are best-effort: a failure leaves the count unknown.
    const [refunds, withdrawals] = await Promise.allSettled([
      adminPayments({ refundStatus: 'open', page: 1, limit: 1 }),
      adminWithdrawals(),
    ]);
    const wList =
      withdrawals.status === 'fulfilled'
        ? Array.isArray(withdrawals.value)
          ? withdrawals.value
          : withdrawals.value?.items || []
        : null;
    setQueueExtra({
      refunds: refunds.status === 'fulfilled' ? refunds.value?.total ?? 0 : null,
      withdrawals: wList ? wList.filter((w) => w.status === 'pending').length : null,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const live = overview?.live;
  const adminFed = overview?.adminFed;
  const summary = live?.summary;

  const revenueByCurrency = useMemo(
    () => revenueRows(summary?.revenueByCurrency || live?.revenueByCurrency || live?.revenue),
    [live, summary]
  );

  const bookingsThisWeek = useMemo(() => {
    const series = dailySeries(live?.bookingTrend, 7);
    return series.reduce((s, d) => s + d.count, 0);
  }, [live]);

  const openTutor = async (tutorUserId) => {
    setLoadingDetail(true);
    setDetailError('');
    setDetail(null);
    try {
      const data = await analyticsTutor(tutorUserId);
      setDetail(data);
    } catch (err) {
      setDetailError(errorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const firstName = String(user?.name || '').trim().split(/\s+/)[0] || 'admin';
  const awaiting =
    (live?.paymentsByStatus || []).find((p) => p._id === 'awaiting_confirmation')?.count || 0;

  const queue = overview
    ? [
        {
          key: 'verifications',
          icon: 'shield-check',
          tone: 'warning',
          count: summary?.pendingVerifications ?? 0,
          title: 'Tutor verifications to review',
          meta: 'Documents and references waiting for a decision',
          to: '/admin/verifications?status=pending',
          action: 'Review',
        },
        {
          key: 'awaiting',
          icon: 'credit-card',
          tone: 'info',
          count: awaiting,
          title: 'Payments awaiting confirmation',
          meta: 'Manual payments to confirm as paid or failed',
          to: '/admin/payments?status=awaiting_confirmation',
          action: 'Confirm',
        },
        {
          key: 'refunds',
          icon: 'receipt',
          tone: 'danger',
          count: queueExtra.refunds,
          title: 'Open refund requests',
          meta: 'Requested, accepted or disputed refunds',
          to: '/admin/payments?status=refunds',
          action: 'Resolve',
        },
        {
          key: 'withdrawals',
          icon: 'wallet',
          tone: 'brand',
          count: queueExtra.withdrawals,
          title: 'Pending tutor withdrawals',
          meta: 'Payout requests to approve or reject',
          to: '/admin/wallets?tab=withdrawals&status=pending',
          action: 'Review',
        },
        {
          key: 'tickets',
          icon: 'life-buoy',
          tone: 'warning',
          count: summary?.openTickets ?? 0,
          title: 'Open support tickets',
          meta: 'Open or in progress',
          to: '/admin/tickets?status=active',
          action: 'Open',
        },
      ]
    : [];
  const pendingQueue = queue.filter((q) => q.count == null || q.count > 0);
  const clearQueue = queue.filter((q) => q.count === 0);
  const queueTotal = queue.reduce((s, q) => s + (q.count || 0), 0);

  const primaryRevenue = revenueByCurrency[0];

  return (
    <div className="page stack analytics-page">
      <ErpHero
        title={`${greeting()}, ${firstName}`}
        subtitle={
          overview
            ? queueTotal
              ? `${queueTotal} item${queueTotal === 1 ? '' : 's'} across the platform need a decision.`
              : 'Everything is up to date. Here is how the platform is doing.'
            : 'Loading the latest platform numbers…'
        }
        actions={
          <>
            {updatedAt ? (
              <span className="muted adm-nowrap">
                Updated {updatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
            <ErpButton variant="secondary" icon="refresh" loading={refreshing} onClick={load}>
              Refresh
            </ErpButton>
          </>
        }
      />

      {error ? (
        <ErpBanner
          variant="danger"
          title="Could not load analytics"
          actions={
            <ErpButton size="sm" variant="secondary" onClick={load}>
              Try again
            </ErpButton>
          }
        >
          {error}
        </ErpBanner>
      ) : null}

      <ErpTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview', icon: 'layout-dashboard' },
          { value: 'tutors', label: 'Tutor performance', icon: 'award', count: tutors.length || null },
          { value: 'campaigns', label: 'Campaigns', icon: 'megaphone' },
        ]}
      />

      {!overview && !error ? (
        <div className="adm-overview-grid">
          <ErpCard>
            <ErpSkeleton lines={6} />
          </ErpCard>
          <div className="adm-kpis" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="erp-stat">
                <ErpSkeleton lines={2} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {overview && tab === 'overview' && (
        <>
          <div className="adm-overview-grid">
            <ErpCard
              flush
              heading="Needs attention"
              description="Queues that are waiting on an admin"
            >
              {pendingQueue.length ? (
                <ErpAttentionList>
                  {pendingQueue.map((q) => (
                    <ErpAttentionItem
                      key={q.key}
                      icon={q.icon}
                      tone={q.tone}
                      title={q.title}
                      meta={q.count == null ? `${q.meta} · count unavailable` : q.meta}
                      action={
                        <span className="adm-queue-action">
                          {q.count != null ? (
                            <span className="adm-queue-count is-hot">{q.count}</span>
                          ) : null}
                          <Link to={q.to} className="erp-btn-secondary erp-btn-sm">
                            {q.action}
                            <Icon name="arrow-right" size={14} />
                          </Link>
                        </span>
                      }
                    />
                  ))}
                </ErpAttentionList>
              ) : (
                <ErpEmptyState
                  icon="check-circle"
                  title="All caught up"
                  description="No verifications, payments, refunds, withdrawals or tickets are waiting."
                />
              )}
              {clearQueue.length && pendingQueue.length ? (
                <p className="adm-all-clear" style={{ padding: '0.75rem 1.25rem 1rem' }}>
                  <Icon name="check-circle" size={16} />
                  Clear: {clearQueue.map((q) => q.title.toLowerCase()).join(', ')}.
                </p>
              ) : null}
            </ErpCard>

            <div className="adm-kpis" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <ErpStat
                label="Paid revenue"
                icon="trending-up"
                tone="success"
                to="/admin/payments?status=paid"
                value={primaryRevenue ? money(primaryRevenue.total, primaryRevenue.currency) : money(0)}
                hint={
                  revenueByCurrency.length > 1
                    ? null
                    : `${summary?.paidPaymentCount ?? 0} paid invoices`
                }
              >
                {revenueByCurrency.length > 1 ? (
                  <div className="adm-currency-list">
                    {revenueByCurrency.slice(1, 4).map((r) => (
                      <span key={r.currency} className="adm-currency-row">
                        <span>{r.currency}</span>
                        <span>{money(r.total, r.currency)}</span>
                      </span>
                    ))}
                    <span className="adm-currency-row">
                      <span>{summary?.paidPaymentCount ?? 0} paid invoices</span>
                    </span>
                  </div>
                ) : null}
              </ErpStat>
              <ErpStat
                label="Bookings this week"
                icon="calendar"
                tone="info"
                to="/admin/bookings"
                value={bookingsThisWeek.toLocaleString()}
                hint={`${(summary?.totalBookings ?? 0).toLocaleString()} all time`}
              />
              <ErpStat
                label="Students"
                icon="graduation-cap"
                to="/admin/users?role=student"
                value={(summary?.studentCount ?? 0).toLocaleString()}
                hint={`${summary?.parentCount ?? 0} parents · ${summary?.parentLinks ?? 0} linked`}
              />
              <ErpStat
                label="Approved tutors"
                icon="award"
                tone="neutral"
                to="/admin/users?role=tutor"
                value={(summary?.approvedTutors ?? 0).toLocaleString()}
                hint={`of ${summary?.tutorCount ?? 0} tutors · ${summary?.pendingTutors ?? 0} pending`}
              />
            </div>
          </div>

          <div className="adm-chart-grid adm-chart-grid-3">
            <TrendCard
              title="Bookings created"
              rows={live?.bookingTrend}
              noun="booking"
              to="/admin/bookings"
              linkLabel="Bookings"
            />
            <TrendCard
              title="Paid payments"
              rows={live?.paymentTrend}
              noun="payment"
              to="/admin/payments?status=paid"
              linkLabel="Payments"
            />
            <TrendCard
              title="New registrations"
              rows={live?.registrations}
              noun="sign-up"
              to="/admin/users"
              linkLabel="Users"
            />
          </div>

          <h2 className="erp-section-title" style={{ margin: '0.5rem 0 0' }}>
            Platform breakdown
          </h2>

          <div className="adm-chart-grid adm-chart-grid-3">
            <ErpCard heading="Bookings by status" headerActions={<CardLink to="/admin/bookings">Manage</CardLink>}>
              <BarList rows={live?.bookingStatus} empty="No bookings yet." />
            </ErpCard>
            <ErpCard heading="Payments by status" headerActions={<CardLink to="/admin/payments">Manage</CardLink>}>
              <BarList rows={live?.paymentsByStatus} empty="No payments yet." />
              {revenueByCurrency.length > 0 && (
                <p className="adm-card-foot">
                  Paid revenue:{' '}
                  {revenueByCurrency
                    .map((r) => `${money(r.total, r.currency)} (${r.count} txns)`)
                    .join(' · ')}
                </p>
              )}
            </ErpCard>
            <ErpCard
              heading="Users by role"
              description={`${(summary?.totalUsers ?? 0).toLocaleString()} accounts`}
              headerActions={<CardLink to="/admin/users">Manage</CardLink>}
            >
              <BarList rows={live?.usersByRole} empty="No users yet." />
            </ErpCard>
            <ErpCard heading="Users by status">
              <BarList rows={live?.usersByStatus} />
            </ErpCard>
            <ErpCard heading="Attendance">
              <BarList rows={live?.attendanceSummary} empty="No attendance recorded." />
            </ErpCard>
            <ErpCard heading="Support & engagement" headerActions={<CardLink to="/admin/tickets">Tickets</CardLink>}>
              <BarList rows={live?.support?.byStatus} empty="No tickets." />
              <p className="adm-card-foot">
                {live?.engagement?.conversations ?? 0} conversations · {live?.engagement?.messages ?? 0}{' '}
                messages · {summary?.unreadNotifications ?? 0} unread notifications
              </p>
            </ErpCard>
          </div>

          <div className="adm-chart-grid">
            <ErpCard
              heading="Tutor verification"
              headerActions={<CardLink to="/admin/verifications">Review</CardLink>}
            >
              <MiniStats
                items={[
                  { label: 'Pending documents', value: live?.verification?.pending ?? 0 },
                  { label: 'Approved tutors', value: live?.verification?.approvedTutors ?? 0 },
                  { label: 'Pending tutors', value: live?.verification?.pendingTutors ?? 0 },
                  { label: 'Rejected tutors', value: live?.verification?.rejectedTutors ?? 0 },
                ]}
              />
              <p className="adm-card-foot" style={{ marginTop: 0 }}>
                Uploaded: identity {live?.verification?.docs?.withIdentity ?? 0} · degree{' '}
                {live?.verification?.docs?.withDegree ?? 0} · certificate{' '}
                {live?.verification?.docs?.withCertificate ?? 0} · resume{' '}
                {live?.verification?.docs?.withResume ?? 0}
              </p>
            </ErpCard>
            <ErpCard heading="Homework & learning">
              <MiniStats
                items={[
                  { label: 'Completion rate', value: `${live?.homework?.completionRate ?? 0}%` },
                  { label: 'Submissions', value: live?.homework?.submissionCount ?? 0 },
                  { label: 'Study hours logged', value: live?.learning?.progressHours ?? 0 },
                  { label: 'Badges awarded', value: live?.learning?.badgesAwarded ?? 0 },
                ]}
              />
              <BarList rows={live?.homework?.byStatus} empty="No homework data." />
              <p className="adm-card-foot">
                Avg streak {live?.learning?.studyStreak?.avg ?? 0} · max{' '}
                {live?.learning?.studyStreak?.max ?? 0} · {live?.learning?.lessonPlans ?? 0} lesson plans
              </p>
            </ErpCard>
          </div>

          <div className="adm-chart-grid">
            <AdminTableCard
              tabs={
                <div className="erp-card-header" style={{ margin: 0 }}>
                  <div className="erp-card-header-text">
                    <h3 className="erp-card-title">Subject popularity</h3>
                    <p className="erp-card-description">Tutors offering and bookings per subject</p>
                  </div>
                  <div className="erp-card-actions">
                    <CardLink to="/admin/subjects">Subjects</CardLink>
                  </div>
                </div>
              }
            >
              {!live?.subjectPopularity?.length ? (
                <ErpEmptyState icon="layers" title="No subject data yet" />
              ) : (
                <div className="erp-table-scroll" style={{ maxHeight: '26rem' }}>
                  <table className="erp-data-table adm-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th className="num">Tutors</th>
                        <th className="num">Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {live.subjectPopularity.map((s) => (
                        <tr key={s.subjectId}>
                          <td className="adm-primary">
                            <AdminCell title={s.name} sub={s.code || null} />
                          </td>
                          <td className="num" data-label="Tutors">
                            {s.tutors}
                          </td>
                          <td className="num" data-label="Bookings">
                            {s.bookings}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminTableCard>
            <ErpCard
              heading="Resources by type"
              description={`${live?.learning?.activeResources ?? 0} active resources · ${
                live?.subscriptions?.activePlans ?? summary?.activePlans ?? 0
              } active plans`}
              headerActions={<CardLink to="/admin/resources">Resources</CardLink>}
            >
              <BarList
                rows={(live?.learning?.resourcesByType || []).map((r) => ({ _id: r._id, count: r.count }))}
                empty="No active resources."
              />
            </ErpCard>
          </div>
        </>
      )}

      {overview && tab === 'tutors' && (
        <AdminTableCard>
          {!tutors.length ? (
            <ErpEmptyState
              icon="award"
              title="No tutor performance yet"
              description="Tutors appear here once they have bookings."
            />
          ) : (
            <div className="erp-table-scroll">
              <table className="erp-data-table adm-table">
                <thead>
                  <tr>
                    <th>Tutor</th>
                    <th className="num">Bookings</th>
                    <th className="num">Completed</th>
                    <th className="num">Attendance</th>
                    <th className="num">Revenue</th>
                    <th className="num">Homework graded</th>
                    <th className="num">Rating</th>
                    <th className="adm-actions" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {tutors.map((t) => (
                    <tr key={t.tutorUserId} className="erp-row-click" onClick={() => openTutor(t.tutorUserId)}>
                      <td className="adm-primary">
                        <AdminCell
                          avatarName={t.name || t.phone || 'Tutor'}
                          title={t.name || t.phone || 'Tutor'}
                          sub={t.name ? t.phone : null}
                        />
                      </td>
                      <td className="num" data-label="Bookings">{t.totalBookings}</td>
                      <td className="num" data-label="Completed">{t.completedBookings}</td>
                      <td className="num" data-label="Attendance">{t.attendanceRate}%</td>
                      <td className="num" data-label="Revenue">
                        <span className="adm-money">
                          {t.revenueByCurrency ? moneyByCurrency(t.revenueByCurrency) : plainAmount(t.revenue)}
                        </span>
                      </td>
                      <td className="num" data-label="Homework graded">
                        {t.assignmentsGraded}/{t.assignmentsCreated}
                      </td>
                      <td className="num" data-label="Rating">
                        <span className="adm-nowrap">
                          <Icon name="star" size={13} /> {t.ratingAvg}{' '}
                          <span className="muted">({t.ratingCount})</span>
                        </span>
                      </td>
                      <td className="adm-actions">
                        <ErpButton
                          variant="ghost"
                          size="sm"
                          iconRight="chevron-right"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTutor(t.tutorUserId);
                          }}
                        >
                          Details
                        </ErpButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminTableCard>
      )}

      {overview && tab === 'campaigns' && (
        <>
          <div className="adm-kpis adm-kpis-3">
            <ErpStat label="Campaigns" icon="megaphone" value={adminFed?.campaignSummary?.count ?? 0} />
            <ErpStat
              label="Total spend"
              icon="credit-card"
              tone="neutral"
              value={plainAmount(adminFed?.campaignSummary?.totalSpend)}
            />
            <ErpStat
              label="Leads → conversions"
              icon="target"
              tone="success"
              value={`${adminFed?.campaignSummary?.totalLeads ?? 0} → ${
                adminFed?.campaignSummary?.totalConversions ?? 0
              }`}
              hint={`${adminFed?.campaignSummary?.conversionRate ?? 0}% conversion`}
            />
          </div>
          <AdminTableCard
            tabs={
              <div className="erp-card-header" style={{ margin: 0 }}>
                <div className="erp-card-header-text">
                  <h3 className="erp-card-title">Campaign metrics</h3>
                  <p className="erp-card-description">Entered by admins on the Campaigns page</p>
                </div>
                <div className="erp-card-actions">
                  <Link to="/admin/campaigns" className="erp-btn-secondary erp-btn-sm">
                    Manage campaigns
                  </Link>
                </div>
              </div>
            }
          >
            {!adminFed?.campaigns?.length ? (
              <ErpEmptyState
                icon="megaphone"
                title="No campaign metrics"
                description="Add a campaign to track spend, leads and conversions."
                action={
                  <Link to="/admin/campaigns?new=1" className="erp-btn-primary">
                    Create campaign
                  </Link>
                }
              />
            ) : (
              <div className="erp-table-scroll">
                <table className="erp-data-table adm-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Channel</th>
                      <th className="num">Spend</th>
                      <th className="num">Leads</th>
                      <th className="num">Conversions</th>
                      <th className="num">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminFed.campaigns.map((c) => {
                      const rate = c.leads > 0 ? Math.round((c.conversions / c.leads) * 1000) / 10 : 0;
                      return (
                        <tr key={c._id}>
                          <td className="adm-primary">
                            <AdminCell title={c.name} sub={c.notes || null} />
                          </td>
                          <td data-label="Channel">
                            <span className="erp-tag">{titleCase(c.channel)}</span>
                          </td>
                          <td className="num" data-label="Spend">
                            <span className="adm-money">
                              {c.currency ? money(c.spend, c.currency) : plainAmount(c.spend)}
                            </span>
                          </td>
                          <td className="num" data-label="Leads">{c.leads}</td>
                          <td className="num" data-label="Conversions">{c.conversions}</td>
                          <td className="num" data-label="Rate">{rate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminTableCard>
        </>
      )}

      <ErpModal
        open={loadingDetail || Boolean(detail) || Boolean(detailError)}
        title="Tutor performance"
        size="lg"
        onClose={() => {
          setDetail(null);
          setDetailError('');
        }}
      >
        {loadingDetail && <ErpLoadingState message="Loading tutor…" />}
        {detailError && <ErpBanner variant="danger">{detailError}</ErpBanner>}
        {detail && (
          <>
            <AdminSummary
              avatarName={detail.name || detail.phone || 'Tutor'}
              eyebrow="Tutor"
              title={detail.name || detail.phone || '—'}
              meta={detail.name && detail.phone ? detail.phone : null}
              side={
                <span className="adm-nowrap">
                  <Icon name="star" size={14} /> <strong>{detail.ratingAvg ?? '—'}</strong>{' '}
                  <span className="muted">({detail.ratingCount ?? 0} reviews)</span>
                </span>
              }
            />
            <AdminSection title="Performance">
              <MiniStats
                items={[
                  {
                    label: 'Revenue',
                    value: detail.revenueByCurrency
                      ? moneyByCurrency(detail.revenueByCurrency)
                      : plainAmount(detail.revenue),
                  },
                  { label: 'Bookings', value: detail.totalBookings ?? 0 },
                  { label: 'Attendance', value: `${detail.attendanceRate ?? 0}%` },
                  {
                    label: 'Homework graded',
                    value: `${detail.assignmentsGraded ?? 0}/${detail.assignmentsCreated ?? 0}`,
                  },
                ]}
              />
            </AdminSection>

            {!!detail.subjects?.length && (
              <AdminSection title="Subjects offered">
                <div className="adm-chip-list">
                  {detail.subjects.map((s, i) => (
                    <span key={`${s.name}-${i}`} className="erp-chip">
                      {s.name} {s.level} · {plainAmount(s.hourlyRate)}/hr
                    </span>
                  ))}
                </div>
              </AdminSection>
            )}

            {!!detail.recentBookings?.length && (
              <AdminSection title="Recent bookings">
                <div className="erp-table-scroll" style={{ border: '1px solid var(--erp-border)', borderRadius: 'var(--erp-radius-lg)' }}>
                  <table className="erp-data-table adm-table">
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
                          <td className="adm-primary adm-nowrap">{formatDate(b.startAt)}</td>
                          <td data-label="Student">{b.studentUserId?.name || b.studentUserId?.phone || '—'}</td>
                          <td data-label="Subject">{b.subjectId?.name || '—'}</td>
                          <td data-label="Status">
                            <ErpStatusBadge status={b.status} dot>
                              {titleCase(b.status)}
                            </ErpStatusBadge>
                          </td>
                          <td data-label="Attendance">{b.attendance ? titleCase(b.attendance) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminSection>
            )}

            {!!detail.recentReviews?.length && (
              <AdminSection title="Recent reviews">
                {detail.recentReviews.map((r) => (
                  <div key={r._id} className="adm-review">
                    <div className="adm-review-head">
                      <span className="erp-chip erp-chip-brand">
                        <Icon name="star" size={12} /> {r.rating}/5
                      </span>
                      <span className="muted">
                        {r.studentUserId?.name || 'Student'} · {formatDate(r.createdAt)}
                      </span>
                    </div>
                    {r.comment && <p>{r.comment}</p>}
                  </div>
                ))}
              </AdminSection>
            )}
            {!detail.subjects?.length && !detail.recentBookings?.length && !detail.recentReviews?.length ? (
              <AdminSection>
                <AdminKV items={[{ label: 'Activity', value: 'No subjects, bookings or reviews yet.', full: true }]} />
              </AdminSection>
            ) : null}
          </>
        )}
      </ErpModal>
    </div>
  );
}
