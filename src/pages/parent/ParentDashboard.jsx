import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSubjects } from '../../api';
import {
  ErpAttentionItem,
  ErpAttentionList,
  ErpAvatar,
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpHero,
  ErpLoadingState,
  ErpNextUp,
  ErpSkeleton,
  ErpStat,
  ErpStatusBadge,
  ErpTabs,
  Icon,
} from '../../components/erp';
import { money, tutorRef } from '../../utils/format';
import { gradeLabel } from '../../utils/grading';
import { useAuth } from '../../context/AuthContext';
import { childLabel, useParentChild } from '../../context/ParentChildContext';
import { formatDay, formatWhen, subjectNameMap, viewerZone } from '../student/studentTime';
import { titleCase } from './parentOptions';
import {
  childIdOf,
  firstName,
  greeting,
  isOverdue,
  moneyList,
  summarize,
  timeUntil,
  useChildDashboards,
} from './parentData';
import './parent.css';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const GLANCE_LIMIT = 8;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : /(s|ch|sh)$/.test(word) ? 'es' : 's'}`;

function StatusStrip({ obj, label }) {
  const entries = Object.entries(obj || {}).filter(([, n]) => Number(n) > 0);
  if (!entries.length) return null;
  return (
    <p className="pd-status-line">
      {label ? <span className="pd-status-label">{label}</span> : null}
      {entries.map(([key, n]) => (
        <span key={key}>
          {titleCase(key)} <strong>{n}</strong>
        </span>
      ))}
    </p>
  );
}

function DashboardSkeleton() {
  return (
    <div className="stack" aria-busy="true">
      <ErpSkeleton height="96px" radius="16px" />
      <ErpCard>
        <ErpSkeleton lines={3} />
      </ErpCard>
      <div className="pd-stats">
        {[0, 1, 2, 3].map((i) => (
          <ErpSkeleton key={i} height="96px" radius="12px" />
        ))}
      </div>
    </div>
  );
}

function ChildGlance({ links, byId, selectedChildId, onSelect }) {
  return (
    <div className="pd-glance" role="group" aria-label="Your children">
      {links.map((c) => {
        const id = childIdOf(c);
        const entry = byId[id];
        const s = summarize(entry?.data);
        const active = id === selectedChildId;
        let meta = 'Loading…';
        let flag = null;
        if (entry?.error) meta = 'Could not load summary';
        else if (s) {
          meta = [
            s.upcoming ? plural(s.upcoming, 'upcoming class') : 'No upcoming classes',
            s.overdue ? `${s.overdue} overdue` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          if (s.due.length) flag = <ErpBadge tone="warning">{s.due[0]} due</ErpBadge>;
          else if (s.overdue) flag = <ErpBadge tone="danger">Overdue</ErpBadge>;
          else flag = <ErpBadge tone="success" dot>On track</ErpBadge>;
        }
        return (
          <button
            key={id}
            type="button"
            className={`pd-glance-item${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onSelect(id)}
          >
            <ErpAvatar name={childLabel(c)} src={entry?.data?.student?.avatar} size="lg" />
            <span className="pd-glance-body">
              <span className="pd-glance-name">{childLabel(c)}</span>
              <span className="pd-glance-meta">{meta}</span>
            </span>
            {flag ? <span className="pd-glance-flag">{flag}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// "Mathematics AA HL" already carries its level; only append HL/SL when it's missing.
function withLevel(name, level) {
  if (!level || level === 'N/A') return name;
  const base = String(name || '').trim();
  return base === level || base.endsWith(` ${level}`) ? base : `${base} ${level}`;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const zone = viewerZone(user);
  const when = (v) => formatWhen(v, zone);
  const {
    children,
    selectedChildId,
    selectedChild,
    setSelectedChildId,
    loading,
    error: childError,
    refreshChildren,
  } = useParentChild();
  const [subjects, setSubjects] = useState([]);
  const [tab, setTab] = useState('classes');

  const glanceIds = useMemo(() => {
    const ids = children.slice(0, GLANCE_LIMIT).map(childIdOf);
    if (selectedChildId && !ids.includes(selectedChildId)) ids.push(selectedChildId);
    return ids;
  }, [children, selectedChildId]);
  const { byId, reload } = useChildDashboards(glanceIds);

  useEffect(() => {
    listSubjects({ limit: 500 })
      .then((d) => setSubjects(d.items || []))
      .catch(() => {});
  }, []);

  const entry = selectedChildId ? byId[selectedChildId] : null;
  const data = entry?.data || null;
  const loadingDash = Boolean(selectedChildId) && (!entry || (entry.loading && !data));
  const error = entry?.error || '';

  const names = useMemo(
    () =>
      subjectNameMap(
        subjects,
        data?.progress?.records || [],
        data?.upcomingClasses || [],
        data?.recentClasses || [],
        data?.homework || []
      ),
    [subjects, data]
  );
  const subjectName = (id) => {
    const key = String(id?._id || id || '');
    return names[key] || id?.name || (key && !OBJECT_ID.test(key) ? key : 'Subject');
  };

  const s = summarize(data);
  const progress = data?.progress;
  const predicted = Object.entries(data?.predictedGrades || progress?.predictedGrades || {});
  const bySubject = progress?.bySubject || [];
  const childName = selectedChild ? childLabel(selectedChild) : 'your child';
  const childFirst = firstName(childName) || childName;
  const q = selectedChildId ? `?child=${selectedChildId}` : '';
  const parentFirst = firstName(user?.name);

  const heroSub = !children.length
    ? 'Link your child to follow their classes, homework and payments in one place.'
    : s
      ? [
          `Here’s how ${childFirst} is doing`,
          s.nextClass ? `next class ${timeUntil(s.nextClass.startAt)}` : null,
        ]
          .filter(Boolean)
          .join(' — ') + '.'
      : `Your family overview for ${childFirst}.`;

  /* ── Needs attention ─────────────────────────────────── */
  const attention = [];
  if (data && s) {
    const unpaidRows = (data.payments || []).filter((p) => ['pending', 'failed'].includes(p.status));
    Object.entries(data.summary?.pendingByCurrency || {})
      .filter(([, amt]) => Number(amt) > 0)
      .forEach(([cur, amt]) => {
        const rows = unpaidRows.filter((p) => (p.currency || 'USD') === cur);
        const failed = rows.filter((p) => p.status === 'failed').length;
        attention.push(
          <ErpAttentionItem
            key={`due-${cur}`}
            icon="credit-card"
            tone="warning"
            title={`${money(amt, cur)} unpaid`}
            meta={
              rows.length
                ? `${plural(rows.length, 'invoice')}${failed ? ` · ${failed} failed` : ''} — pay to keep classes confirmed`
                : 'Outstanding invoices for this child'
            }
            action={
              <Link
                className="erp-btn-primary erp-btn-sm"
                to={`/parent/payments${q}`}
                state={rows.length === 1 ? { paymentId: rows[0]._id } : undefined}
              >
                Pay
              </Link>
            }
          />
        );
      });

    (data.homework || [])
      .filter(isOverdue)
      .slice(0, 3)
      .forEach((h) => {
        attention.push(
          <ErpAttentionItem
            key={`hw-${h._id}`}
            icon="clipboard-check"
            tone="danger"
            title={`${h.title} is overdue`}
            meta={`${subjectName(h.subjectId)} · was due ${formatDay(h.deadline, zone)}`}
            action={
              <Link className="erp-btn-secondary erp-btn-sm" to="/parent/messages">
                Message tutor
              </Link>
            }
          />
        );
      });
    if (s.overdue > 3) {
      attention.push(
        <ErpAttentionItem
          key="hw-more"
          icon="clipboard-check"
          tone="danger"
          title={`${s.overdue - 3} more overdue assignments`}
          meta="See the Homework section below"
        />
      );
    }

    const dueSoon = (data.homework || []).filter((h) => {
      if (h.status !== 'assigned' || !h.deadline || isOverdue(h)) return false;
      const ms = new Date(h.deadline) - Date.now();
      return ms > 0 && ms < 3 * 86400000;
    });
    dueSoon.slice(0, 2).forEach((h) => {
      attention.push(
        <ErpAttentionItem
          key={`soon-${h._id}`}
          icon="clock"
          tone="info"
          title={`${h.title} due ${timeUntil(h.deadline)}`}
          meta={`${subjectName(h.subjectId)} · not submitted yet`}
        />
      );
    });

    const unconfirmed = (data.upcomingClasses || []).filter((b) => b.status === 'pending');
    if (unconfirmed.length) {
      attention.push(
        <ErpAttentionItem
          key="unconfirmed"
          icon="calendar"
          tone="info"
          title={`${plural(unconfirmed.length, 'class')} awaiting confirmation`}
          meta={`Next: ${subjectName(unconfirmed[0].subjectId)} · ${when(unconfirmed[0].startAt)}`}
          action={
            <Link className="erp-btn-secondary erp-btn-sm" to={`/parent/bookings${q}`}>
              Review
            </Link>
          }
        />
      );
    }

    if (s.absent > 0) {
      attention.push(
        <ErpAttentionItem
          key="absent"
          icon="x-circle"
          tone="warning"
          title={plural(s.absent, 'missed class')}
          meta={`${childFirst} was marked absent by the tutor`}
          action={
            <Link className="erp-btn-secondary erp-btn-sm" to={`/parent/bookings${q}`}>
              View classes
            </Link>
          }
        />
      );
    }

    const verifying = data.paymentsByStatus?.awaiting_confirmation || 0;
    if (verifying) {
      attention.push(
        <ErpAttentionItem
          key="verifying"
          icon="refresh"
          tone="neutral"
          title={`${plural(verifying, 'payment')} being verified`}
          meta="No action needed — we’ll confirm shortly"
          action={
            <Link className="erp-btn-ghost erp-btn-sm" to={`/parent/payments${q}`}>
              View
            </Link>
          }
        />
      );
    }
  }

  /* ── Next up ─────────────────────────────────────────── */
  let nextUp = null;
  if (data && s) {
    const b = s.nextClass;
    if (b) {
      const joinUrl = b.zoom?.joinUrl || b.meetingUrl;
      const msToStart = new Date(b.startAt) - Date.now();
      const live = new Date(b.endAt || b.startAt) > Date.now() && msToStart < 30 * 60000;
      const pending = b.status === 'pending';
      nextUp = (
        <ErpNextUp
          icon={b.deliveryMode === 'offline' ? 'map-pin' : 'video'}
          eyebrow={`Next class · starts ${timeUntil(b.startAt)}${pending ? ' · awaiting confirmation' : ''}`}
          title={withLevel(b.subjectId?.name || subjectName(b.subjectId), b.level)}
          meta={[
            { icon: 'calendar', text: when(b.startAt) },
            b.tutorUserId ? { icon: 'user', text: tutorRef(b.tutorUserId) } : null,
            { icon: b.deliveryMode === 'offline' ? 'map-pin' : 'globe', text: titleCase(b.deliveryMode || 'online') },
          ]}
          actions={
            <>
              {pending && s.unpaid > 0 ? (
                <Link className="erp-btn-primary" to={`/parent/payments${q}`}>
                  Pay invoice
                </Link>
              ) : null}
              {!pending && joinUrl && live ? (
                <a className="erp-btn-primary" href={joinUrl} target="_blank" rel="noreferrer">
                  Join class
                </a>
              ) : null}
              <Link className="erp-btn-secondary" to={`/parent/bookings${q}`}>
                View booking
              </Link>
            </>
          }
        />
      );
    } else {
      nextUp = (
        <ErpNextUp
          icon="calendar"
          eyebrow="Nothing scheduled"
          title={`No upcoming classes for ${childFirst}`}
          meta={[{ icon: 'search', text: 'Find a verified IB tutor and book a first class' }]}
          actions={
            <Link className="erp-btn-secondary" to="/parent/tutors">
              Book a class
            </Link>
          }
        />
      );
    }
  }

  const upcoming = data?.upcomingClasses || [];
  const recent = data?.recentClasses || [];
  const homework = data?.homework || [];

  return (
    <div className="page stack">
      <ErpHero
        title={`${greeting()}${parentFirst ? `, ${parentFirst}` : ''}`}
        subtitle={heroSub}
        actions={
          <>
            <Link to="/parent/children/link" className="erp-btn-secondary">
              <Icon name="plus" size={16} />
              Link child
            </Link>
            <Link to="/parent/tutors" className="erp-btn-primary">
              <Icon name="search" size={16} />
              Find a tutor
            </Link>
          </>
        }
      />

      {childError && !children.length ? (
        <ErpBanner
          variant="danger"
          title="Could not load your children"
          actions={
            <ErpButton variant="secondary" size="sm" icon="refresh" onClick={() => refreshChildren()}>
              Retry
            </ErpButton>
          }
        >
          {childError}
        </ErpBanner>
      ) : loading && !children.length ? (
        <ErpLoadingState message="Loading your family…" />
      ) : !children.length ? (
        <ErpCard>
          <ErpEmptyState
            icon="users"
            title="Link your first child"
            description="Use the phone number your child registered with. You’ll then see their classes, homework, progress and invoices here."
            action={
              <Link to="/parent/children/link" className="erp-btn-primary">
                Link a child
              </Link>
            }
          />
        </ErpCard>
      ) : (
        <>
          {children.length > 1 ? (
            <section className="stack" style={{ gap: '0.5rem' }}>
              <h3 className="erp-section-title" style={{ margin: 0 }}>
                Your children
                <Link to="/parent/children" className="erp-btn-ghost erp-btn-sm">
                  Manage
                  <Icon name="chevron-right" size={15} />
                </Link>
              </h3>
              <ChildGlance
                links={children}
                byId={byId}
                selectedChildId={selectedChildId}
                onSelect={setSelectedChildId}
              />
            </section>
          ) : null}

          <div className="pd-child-bar">
            <ErpAvatar name={childName} src={data?.student?.avatar} size="xl" />
            <div className="pd-child-bar-text">
              <h2 className="pd-child-bar-name">{childName}</h2>
              <p className="pd-child-bar-meta">
                {data?.student?.refCode ? <span>{data.student.refCode}</span> : null}
                <span>{titleCase(data?.relationship || selectedChild?.relationship || 'parent')}</span>
                {progress?.level ? (
                  <span>
                    <Icon name="award" size={14} />
                    {progress.level}
                  </span>
                ) : null}
                {s?.streak ? (
                  <span>
                    <Icon name="flame" size={14} />
                    {plural(s.streak, 'day')} streak
                  </span>
                ) : null}
              </p>
            </div>
            <div className="pd-child-bar-actions">
              <Link className="erp-btn-secondary" to={`/parent/bookings${q}`}>
                <Icon name="calendar" size={16} />
                Classes
              </Link>
              <Link className="erp-btn-secondary" to={`/parent/payments${q}`}>
                <Icon name="credit-card" size={16} />
                Payments
              </Link>
            </div>
          </div>

          {error && !data ? (
            <ErpBanner
              variant="danger"
              title={`Could not load ${childFirst}’s dashboard`}
              actions={
                <ErpButton variant="secondary" size="sm" icon="refresh" onClick={() => reload(selectedChildId)}>
                  Retry
                </ErpButton>
              }
            >
              {error}
            </ErpBanner>
          ) : null}

          {loadingDash ? <DashboardSkeleton /> : null}

          {data && s ? (
            <>
              {nextUp}

              <ErpCard
                heading="Needs your attention"
                description={attention.length ? `${plural(attention.length, 'item')} for ${childFirst}` : undefined}
              >
                {attention.length ? (
                  <ErpAttentionList className="pd-attention">{attention}</ErpAttentionList>
                ) : (
                  <div className="pd-all-clear">
                    <span className="erp-attention-icon">
                      <Icon name="check-circle" size={16} />
                    </span>
                    <span>All clear — no unpaid invoices, overdue homework or missed classes.</span>
                  </div>
                )}
              </ErpCard>

              <div className="pd-stats">
                <ErpStat
                  label="Upcoming classes"
                  value={s.upcoming}
                  icon="calendar"
                  hint={s.nextClass ? `Next ${formatDay(s.nextClass.startAt, zone)}` : 'None booked'}
                  to={`/parent/bookings${q}`}
                />
                <ErpStat
                  label="Attendance"
                  value={s.attendanceRate == null ? '—' : `${s.attendanceRate}%`}
                  icon="check-circle"
                  tone="success"
                  hint={
                    s.present + s.absent
                      ? `${s.present} attended · ${s.absent} missed`
                      : 'No classes marked yet'
                  }
                />
                <ErpStat
                  label="Homework open"
                  value={s.homeworkOpen}
                  icon="clipboard-check"
                  tone={s.overdue ? 'warning' : 'info'}
                  hint={s.overdue ? `${s.overdue} overdue` : 'Nothing overdue'}
                />
                <ErpStat
                  label="Study streak"
                  value={plural(s.streak, 'day')}
                  icon="flame"
                  tone="neutral"
                  hint="Consecutive days of study"
                />
              </div>

              <div className="pd-split">
                <ErpCard heading="Progress & predicted grades" description="IB scale 1–7, from tutor-recorded scores">
                  {!predicted.length && !bySubject.length ? (
                    <ErpEmptyState
                      icon="trending-up"
                      title="No scores yet"
                      description={`Grades appear once ${childFirst}’s tutors record progress.`}
                    />
                  ) : (
                    <>
                      {predicted.length ? (
                        <>
                          <p className="pd-subhead" style={{ marginTop: 0 }}>
                            Predicted grades
                          </p>
                          <div className="pd-grade-chips">
                            {predicted.map(([sid, grade]) => (
                              <span key={sid} className="pd-grade-chip">
                                {subjectName(sid)}
                                <strong>{gradeLabel(grade) || grade}</strong>
                              </span>
                            ))}
                          </div>
                        </>
                      ) : null}
                      {bySubject.length ? (
                        <>
                          <p className="pd-subhead">Average score by subject</p>
                          <div className="erp-divided">
                            {bySubject.map((row) => {
                              const avg = row.avgScore == null ? null : Number(row.avgScore);
                              return (
                                <div key={row._id} className="pd-grade-row">
                                  <span className="pd-grade-name">{subjectName(row._id)}</span>
                                  <span className="pd-grade-value">
                                    {avg == null ? '—' : avg.toFixed(1)}
                                    {avg == null ? null : <small> / 7</small>}
                                  </span>
                                  <span className="pd-meter" aria-hidden="true">
                                    <span style={{ width: `${Math.max(0, Math.min(100, ((avg || 0) / 7) * 100))}%` }} />
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : null}
                      {(progress?.weakTopics || []).length > 0 ? (
                        <>
                          <p className="pd-subhead">Topics to work on</p>
                          <div className="pd-topics">
                            {progress.weakTopics.map((t) => (
                              <ErpBadge key={t} tone="warning">
                                {t}
                              </ErpBadge>
                            ))}
                          </div>
                        </>
                      ) : null}
                      {(progress?.strongTopics || []).length > 0 ? (
                        <>
                          <p className="pd-subhead">Strong topics</p>
                          <div className="pd-topics">
                            {progress.strongTopics.map((t) => (
                              <ErpBadge key={t} tone="success">
                                {t}
                              </ErpBadge>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </>
                  )}
                  <p className="pd-foot-note">
                    {progress?.credits || 0} credits · Level {progress?.level || 'Starter'}
                  </p>
                </ErpCard>

                <ErpCard heading="Payments" description={`Invoices for ${childFirst}’s classes and purchases`}>
                  <div className="pd-money-grid">
                    <div className="pd-money-tile">
                      <span className="pd-money-label">Outstanding</span>
                      <span className={`pd-money-value${s.due.length ? ' is-due' : ''}`}>
                        {s.due.length ? s.due.join(' · ') : 'Nothing due'}
                      </span>
                    </div>
                    <div className="pd-money-tile">
                      <span className="pd-money-label">Paid to date</span>
                      <span className="pd-money-value">
                        {moneyList(data.summary?.paidByCurrency).join(' · ') || '—'}
                      </span>
                    </div>
                  </div>
                  <StatusStrip obj={data.paymentsByStatus} label="Invoices" />
                  {!(data.payments || []).length ? (
                    <ErpEmptyState icon="receipt" title="No payments yet" />
                  ) : (
                    <div className="erp-divided">
                      {(data.payments || []).slice(0, 5).map((p) => (
                        <div key={p._id} className="pd-row">
                          <div className="pd-row-main">
                            <span className="pd-row-title">{p.description || 'Class payment'}</span>
                            <span className="pd-row-meta">{p.createdAt ? formatDay(p.createdAt, zone) : '—'}</span>
                          </div>
                          <div className="pd-row-end">
                            <span className="pd-amount">{money(p.amount, p.currency)}</span>
                            <ErpStatusBadge status={p.status}>{titleCase(p.status)}</ErpStatusBadge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pd-card-foot">
                    <Link to={`/parent/payments${q}`} className="erp-btn-secondary erp-btn-sm">
                      All payments
                      <Icon name="arrow-right" size={15} />
                    </Link>
                  </div>
                </ErpCard>
              </div>

              <ErpCard
                heading="Classes & homework"
                headerActions={
                  <ErpTabs
                    variant="segmented"
                    value={tab}
                    onChange={setTab}
                    tabs={[
                      { value: 'classes', label: 'Classes', count: upcoming.length + recent.length },
                      { value: 'homework', label: 'Homework', count: data.summary?.homeworkCount ?? homework.length },
                    ]}
                  />
                }
              >
                {tab === 'classes' ? (
                  <>
                    <StatusStrip obj={data.attendance} label="Attendance" />
                    <StatusStrip obj={data.bookingByStatus} label="Bookings" />
                    {!upcoming.length && !recent.length ? (
                      <ErpEmptyState
                        icon="calendar"
                        title="No classes yet"
                        description={`Book a tutor for ${childFirst} to get started.`}
                        action={
                          <Link to="/parent/tutors" className="erp-btn-secondary">
                            Find a tutor
                          </Link>
                        }
                      />
                    ) : (
                      <>
                        {upcoming.length ? <p className="pd-subhead">Upcoming</p> : null}
                        <div className="erp-divided">
                          {upcoming.map((b) => (
                            <div key={b._id} className="pd-row">
                              <span className="pd-row-icon is-brand">
                                <Icon name={b.deliveryMode === 'offline' ? 'map-pin' : 'video'} size={16} />
                              </span>
                              <div className="pd-row-main">
                                <span className="pd-row-title">{b.subjectId?.name || subjectName(b.subjectId)}</span>
                                <span className="pd-row-meta">
                                  {tutorRef(b.tutorUserId)} · {when(b.startAt)}
                                </span>
                              </div>
                              <div className="pd-row-end">
                                <ErpStatusBadge status={b.status}>
                                  {b.status === 'confirmed' ? 'Upcoming' : titleCase(b.status)}
                                </ErpStatusBadge>
                              </div>
                            </div>
                          ))}
                        </div>
                        {recent.length ? <p className="pd-subhead">Recent</p> : null}
                        <div className="erp-divided">
                          {recent.map((b) => (
                            <div key={b._id} className="pd-row">
                              <span className="pd-row-icon">
                                <Icon name="clock" size={16} />
                              </span>
                              <div className="pd-row-main">
                                <span className="pd-row-title">{b.subjectId?.name || subjectName(b.subjectId)}</span>
                                <span className="pd-row-meta">
                                  {when(b.startAt)}
                                  {b.attendance ? ` · ${titleCase(b.attendance)}` : ''}
                                </span>
                              </div>
                              <div className="pd-row-end">
                                <ErpStatusBadge status={b.status}>{titleCase(b.status)}</ErpStatusBadge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    <div className="pd-card-foot">
                      <Link to={`/parent/bookings${q}`} className="erp-btn-secondary erp-btn-sm">
                        All classes
                        <Icon name="arrow-right" size={15} />
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <StatusStrip obj={data.homeworkByStatus} label="Status" />
                    {!homework.length ? (
                      <ErpEmptyState
                        icon="clipboard-check"
                        title="No homework"
                        description="Assignments set by tutors will appear here."
                      />
                    ) : (
                      <div className="erp-divided">
                        {homework.map((h) => {
                          const grade = h.grade ?? h.submission?.grade;
                          const overdue = isOverdue(h);
                          const hasGrade = grade !== undefined && grade !== null && grade !== '';
                          return (
                            <div key={h._id} className="pd-row">
                              <span className="pd-row-icon">
                                <Icon name="file-text" size={16} />
                              </span>
                              <div className="pd-row-main">
                                <span className="pd-row-title">{h.title}</span>
                                <span className="pd-row-meta">
                                  {h.subjectId?.name || subjectName(h.subjectId)} ·{' '}
                                  {overdue ? 'was due' : 'due'} {formatDay(h.deadline, zone)}
                                  {hasGrade ? ` · grade ${gradeLabel(grade)}` : ''}
                                </span>
                              </div>
                              <div className="pd-row-end">
                                <ErpStatusBadge status={overdue ? 'overdue' : h.status}>
                                  {overdue ? 'Overdue' : titleCase(h.status)}
                                </ErpStatusBadge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </ErpCard>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
