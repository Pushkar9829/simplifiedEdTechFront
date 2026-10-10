import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  homeworkStats,
  joinBooking,
  listBookings,
  listScheduleChanges,
  tutorEarnings,
  tutorEarningsSummary,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  ErpAttentionItem,
  ErpAttentionList,
  ErpAvatar,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpHero,
  ErpNextUp,
  ErpSkeleton,
  ErpStat,
  ErpStatusBadge,
  Icon,
} from '../../components/erp';
import ClassToolsModal from '../../components/ClassToolsModal';
import { errorMessage } from '../../utils/errors';
import { money } from '../../utils/format';
import {
  firstName,
  greetingWord,
  idOf,
  localTime,
  needsReport,
  startsLabel,
  studentName,
  titleCase,
} from './tutorOptions';
import './tutor.css';

const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
const STUDENT_WINDOW_DAYS = 90;
const JOIN_EARLY_MINUTES = 15;

function settle(p) {
  return p.then((v) => ({ ok: true, v })).catch((e) => ({ ok: false, e }));
}

function DashboardSkeleton() {
  return (
    <div className="page stack tutor-page" aria-busy="true">
      <ErpSkeleton width="18rem" height="2.25rem" />
      <ErpSkeleton width="100%" height="6rem" radius="16px" />
      <ErpSkeleton width="100%" height="10rem" radius="12px" />
      <div className="erp-kpis">
        {[0, 1, 2, 3].map((i) => (
          <ErpSkeleton key={i} width="100%" height="6.5rem" radius="12px" />
        ))}
      </div>
    </div>
  );
}

export default function TutorDashboard() {
  const { user, profile } = useAuth();
  const verification = profile?.verificationStatus || 'not_submitted';
  const [upcoming, setUpcoming] = useState({ items: [], total: 0 });
  const [byStatus, setByStatus] = useState({});
  const [studentCount, setStudentCount] = useState(0);
  const [reportQueue, setReportQueue] = useState([]);
  const [changes, setChanges] = useState([]);
  const [hw, setHw] = useState(null);
  const [earn, setEarn] = useState(null);
  const [paidCount, setPaidCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [joinTools, setJoinTools] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const now = new Date();
    const since = new Date(now.getTime() - STUDENT_WINDOW_DAYS * 86400000);
    Promise.all([
      settle(listBookings({ from: now.toISOString(), sort: 'startAt', excludeStatus: 'cancelled', limit: 20 })),
      settle(Promise.all(BOOKING_STATUSES.map((status) => listBookings({ status, limit: 1 })))),
      settle(listBookings({ from: since.toISOString(), sort: '-startAt', limit: 500 })),
      settle(homeworkStats()),
      settle(tutorEarningsSummary()),
      settle(tutorEarnings({ limit: 1 })),
      settle(listScheduleChanges()),
    ])
      .then(([up, counts, recent, stats, summary, paid, sched]) => {
        const failed = [up, counts, recent, stats, summary, paid, sched].find((r) => !r.ok);
        if (failed) setError(errorMessage(failed.e, 'Some dashboard figures could not be loaded'));
        if (up.ok) setUpcoming({ items: up.v.items || [], total: Number(up.v.total) || 0 });
        if (counts.ok) {
          setByStatus(Object.fromEntries(BOOKING_STATUSES.map((s, i) => [s, Number(counts.v[i]?.total) || 0])));
        }
        if (recent.ok) {
          const items = recent.v.items || [];
          const ids = new Set(
            items
              .filter((b) => b.status !== 'cancelled')
              .map((b) => idOf(b.studentUserId))
              .filter(Boolean)
          );
          setStudentCount(ids.size);
          setReportQueue(items.filter(needsReport));
        }
        if (stats.ok) setHw(stats.v);
        if (summary.ok) setEarn(summary.v);
        if (paid.ok) setPaidCount(Number(paid.v.total) || 0);
        if (sched.ok) setChanges(Array.isArray(sched.v) ? sched.v : sched.v?.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const me = String(user?.id ?? user?._id ?? '');
  const name = firstName(user?.name);
  const currency = earn?.currency;
  const nextClasses = upcoming.items.filter((b) => b.status !== 'cancelled');
  const next = nextClasses[0] || null;
  const later = nextClasses.slice(1, 6);
  const rescheduleAsks = changes.filter((c) => c.status === 'pending' && idOf(c.tutorUserId) === me);
  const replacementAsks = changes.filter(
    (c) => c.status === 'awaiting_approval' && idOf(c.replacementTutorUserId) === me
  );
  const toGrade = Number(hw?.toGrade) || 0;
  const overdue = Number(hw?.overdue) || 0;
  const billing = earn?.billing;
  const withdrawable = Number(earn?.withdrawable) || 0;
  const rating = Number(profile?.ratingAvg) || 0;
  const ratingCount = Number(profile?.ratingCount) || 0;

  const nextIsOnline = next && next.deliveryMode !== 'offline';
  const canJoinNext =
    next && nextIsOnline && Date.now() >= new Date(next.startAt).getTime() - JOIN_EARLY_MINUTES * 60000;

  const openTools = async (b) => {
    setJoining(true);
    try {
      setJoinTools(await joinBooking(b._id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setJoining(false);
    }
  };

  const contextLine = (() => {
    const todayCount = nextClasses.filter(
      (b) => new Date(b.startAt).toDateString() === new Date().toDateString()
    ).length;
    if (todayCount) return `You have ${todayCount} class${todayCount === 1 ? '' : 'es'} today.`;
    if (next) return `Next class: ${startsLabel(next.startAt, next.endAt)}.`;
    return 'No classes on the calendar yet — open more slots to get booked.';
  })();

  const attention = [];
  if (verification !== 'approved') {
    attention.push(
      <ErpAttentionItem
        key="verify"
        icon="shield-check"
        tone={verification === 'rejected' ? 'danger' : 'warning'}
        title={`Verification ${titleCase(verification.replaceAll('_', ' ')).toLowerCase()}`}
        meta="Students cannot find you until an admin approves your profile."
        action={
          <Link to="/tutor/verification" className="erp-btn-secondary erp-btn-sm">
            {verification === 'pending' ? 'View status' : 'Complete'}
          </Link>
        }
      />
    );
  }
  if (rescheduleAsks.length) {
    attention.push(
      <ErpAttentionItem
        key="resched"
        icon="calendar"
        tone="warning"
        title={`${rescheduleAsks.length} reschedule request${rescheduleAsks.length === 1 ? '' : 's'}`}
        meta={`${studentName({ studentUserId: rescheduleAsks[0].studentUserId })} · ${
          rescheduleAsks[0].bookingId?.subjectId?.name || 'Class'
        } · offer new slots`}
        action={
          <Link to="/tutor/bookings" className="erp-btn-primary erp-btn-sm">
            Offer slots
          </Link>
        }
      />
    );
  }
  if (replacementAsks.length) {
    attention.push(
      <ErpAttentionItem
        key="replace"
        icon="users"
        tone="info"
        title={`${replacementAsks.length} replacement class request${replacementAsks.length === 1 ? '' : 's'}`}
        meta="A student wants to move a paid class to you."
        action={
          <Link to="/tutor/bookings" className="erp-btn-secondary erp-btn-sm">
            Review
          </Link>
        }
      />
    );
  }
  if (toGrade) {
    attention.push(
      <ErpAttentionItem
        key="grade"
        icon="clipboard-check"
        tone="brand"
        title={`${toGrade} submission${toGrade === 1 ? '' : 's'} to grade`}
        meta={overdue ? `${overdue} homework overdue` : 'Students are waiting for feedback'}
        action={
          <Link to="/tutor/homework" className="erp-btn-secondary erp-btn-sm">
            Grade
          </Link>
        }
      />
    );
  }
  if (reportQueue.length) {
    const first = reportQueue[0];
    attention.push(
      <ErpAttentionItem
        key="report"
        icon="file-text"
        tone="warning"
        title={`${reportQueue.length} session summar${reportQueue.length === 1 ? 'y' : 'ies'} to write`}
        meta={`Latest: ${studentName(first)} · ${first.subjectId?.name || 'Lesson'} · ${localTime(first.startAt)}`}
        action={
          <Link to={`/tutor/bookings?id=${first._id}`} className="erp-btn-secondary erp-btn-sm">
            Write
          </Link>
        }
      />
    );
  }
  if (billing?.inWindow && withdrawable > 0) {
    attention.push(
      <ErpAttentionItem
        key="withdraw"
        icon="wallet"
        tone="success"
        title={`Withdrawal window is open — ${money(withdrawable, currency)} available`}
        meta={`Open until day ${billing.endDay} of the month.`}
        action={
          <Link to="/tutor/wallet" className="erp-btn-primary erp-btn-sm">
            Withdraw
          </Link>
        }
      />
    );
  }

  return (
    <div className="page stack tutor-page">
      <ErpHero
        title={`${greetingWord()}${name ? `, ${name}` : ''}`}
        subtitle={contextLine}
        actions={
          <>
            <Link to="/tutor/availability" className="erp-btn-secondary">
              Manage availability
            </Link>
            <Link to="/tutor/bookings" className="erp-btn-primary">
              View bookings
            </Link>
          </>
        }
      />

      {error && <ErpBanner variant="danger">{error}</ErpBanner>}

      {next ? (
        <ErpNextUp
          icon={nextIsOnline ? 'video' : 'map-pin'}
          eyebrow={`Next class · ${startsLabel(next.startAt, next.endAt)}`}
          title={`${next.subjectId?.name || 'Lesson'} with ${studentName(next)}`}
          meta={[
            { icon: 'clock', text: localTime(next.startAt) },
            { icon: nextIsOnline ? 'globe' : 'map-pin', text: nextIsOnline ? 'Online' : 'At student’s place' },
            next.refCode ? { icon: 'tag', text: next.refCode } : null,
          ]}
          actions={
            <>
              <Link to={`/tutor/bookings?id=${next._id}`} className="erp-btn-secondary">
                Details
              </Link>
              {nextIsOnline ? (
                <ErpButton icon="video" loading={joining} onClick={() => openTools(next)}>
                  {canJoinNext ? 'Join class' : 'Class tools'}
                </ErpButton>
              ) : null}
            </>
          }
        />
      ) : (
        <ErpCard>
          <ErpEmptyState
            icon="calendar"
            title="No upcoming classes"
            description="Publish availability so students can book you."
            action={
              <Link to="/tutor/availability" className="erp-btn-primary">
                Add availability
              </Link>
            }
          />
        </ErpCard>
      )}

      <ErpCard
        heading={attention.length ? `Needs your attention · ${attention.length}` : 'Needs your attention'}
      >
        {attention.length ? (
          <ErpAttentionList>{attention}</ErpAttentionList>
        ) : (
          <div className="tutor-all-clear">
            <span className="erp-attention-icon is-success">
              <Icon name="check" size={16} />
            </span>
            <span>
              <strong>You’re all caught up.</strong>
              <span className="muted"> Nothing to grade, report or reschedule.</span>
            </span>
          </div>
        )}
      </ErpCard>

      <div className="erp-kpis">
        <ErpStat
          label="Earned this month"
          value={money(earn?.thisMonth || 0, currency)}
          hint={earn ? `Lifetime ${money(earn.lifetime || 0, currency)}` : undefined}
          icon="wallet"
          tone="success"
          to="/tutor/earnings"
        />
        <ErpStat
          label="Upcoming classes"
          value={upcoming.total}
          hint={`${byStatus.pending || 0} awaiting payment`}
          icon="calendar"
          to="/tutor/bookings"
        />
        <ErpStat
          label="Active students"
          value={studentCount}
          hint={`Last ${STUDENT_WINDOW_DAYS} days`}
          icon="users"
          tone="info"
          to="/tutor/students"
        />
        <ErpStat
          label="Rating"
          value={rating ? rating.toFixed(1) : '—'}
          hint={ratingCount ? `From ${ratingCount} review${ratingCount === 1 ? '' : 's'}` : 'No reviews yet'}
          icon="star"
          tone="warning"
        />
      </div>

      <div className="grid two">
        <ErpCard
          heading="Coming up"
          description="Your next classes, in your time zone"
          headerActions={
            <Link to="/tutor/bookings" className="erp-btn-ghost erp-btn-sm">
              All bookings
            </Link>
          }
        >
          {later.length ? (
            <ul className="tutor-mini-list">
              {later.map((b) => (
                <li key={b._id}>
                  <Link to={`/tutor/bookings?id=${b._id}`} className="tutor-mini-row">
                    <ErpAvatar name={studentName(b)} size="sm" />
                    <span className="tutor-mini-main">
                      <strong>{studentName(b)}</strong>
                      <span className="muted">
                        {b.subjectId?.name || 'Lesson'} · {b.deliveryMode === 'offline' ? 'Offline' : 'Online'}
                      </span>
                    </span>
                    <span className="tutor-mini-side">
                      <span className="num">{localTime(b.startAt)}</span>
                      {b.status === 'pending' ? (
                        <ErpStatusBadge status="pending">awaiting payment</ErpStatusBadge>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              {next ? 'Nothing else scheduled after your next class.' : 'No classes scheduled.'}
            </p>
          )}
        </ErpCard>

        <ErpCard
          heading="Teaching snapshot"
          description="Bookings and homework at a glance"
          headerActions={
            <Link to="/tutor/homework" className="erp-btn-ghost erp-btn-sm">
              Homework
            </Link>
          }
        >
          <div className="tutor-snapshot">
            <div>
              <p className="erp-overline">Bookings</p>
              <div className="erp-divided">
                {BOOKING_STATUSES.map((status) => (
                  <div key={status} className="erp-kv-row">
                    <ErpStatusBadge status={status} dot>
                      {titleCase(status)}
                    </ErpStatusBadge>
                    <strong className="num">{byStatus[status] || 0}</strong>
                  </div>
                ))}
                <div className="erp-kv-row">
                  <span className="muted">Paid lessons</span>
                  <strong className="num">{paidCount}</strong>
                </div>
              </div>
            </div>
            <div>
              <p className="erp-overline">Homework</p>
              <div className="erp-divided">
                {[
                  ['assigned', 'Assigned', hw?.assigned],
                  ['submitted', 'To grade', hw?.toGrade],
                  ['graded', 'Graded', hw?.graded],
                  ['overdue', 'Overdue', hw?.overdue],
                ].map(([status, label, count]) => (
                  <div key={status} className="erp-kv-row">
                    <ErpStatusBadge status={status} dot>
                      {label}
                    </ErpStatusBadge>
                    <strong className="num">{count || 0}</strong>
                  </div>
                ))}
                <div className="erp-kv-row">
                  <span className="muted">Open in total</span>
                  <strong className="num">{(hw?.assigned || 0) + (hw?.toGrade || 0)}</strong>
                </div>
              </div>
            </div>
          </div>
          {billing && !billing.inWindow ? (
            <p className="muted text-erp-sm" style={{ margin: '1rem 0 0' }}>
              Withdrawals open on days {billing.startDay}–{billing.endDay} of each month
              {withdrawable > 0 ? ` · ${money(withdrawable, currency)} ready` : ''}.
            </p>
          ) : null}
        </ErpCard>
      </div>

      <ClassToolsModal open={Boolean(joinTools)} join={joinTools} onClose={() => setJoinTools(null)} />
    </div>
  );
}

