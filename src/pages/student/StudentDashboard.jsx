import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudentDashboard, joinBooking, listPayable, listScheduleChanges } from '../../api';
import ClassToolsModal from '../../components/ClassToolsModal';
import {
  ErpAttentionItem,
  ErpAttentionList,
  ErpBanner,
  ErpButton,
  ErpEmptyState,
  ErpModal,
  ErpSegmented,
  ErpSkeleton,
  ErpStatusBadge,
  Icon,
} from '../../components/erp';
import { money, tutorRef } from '../../utils/format';
import { errorMessage } from '../../utils/errors';
import { missingProfileFields } from '../../utils/profileCompletion';
import { useAuth } from '../../context/AuthContext';
import { titleCase } from './studentOptions';
import { firstName, formatWhen, greeting, idOf, subjectNameMap, timeUntil, viewerZone } from './studentTime';
import { LinkButton } from './studentUi';
import './student.css';

const DAY_MS = 24 * 60 * 60 * 1000;
const TONES = ['lav', 'sky', 'mint', 'peach', 'butter', 'pink'];
const BAR_COLORS = ['#C9C2FF', '#BAE6FD', '#BBF7D0', '#FED7AA', '#FDE68A', '#E9D5FF', '#FBCFE8', '#C7D2FE'];
const LEVELS = [
  { name: 'Starter', min: 0 },
  { name: 'Rising', min: 50 },
  { name: 'Achiever', min: 100 },
  { name: 'Star', min: 200 },
];

function isOverdue(h) {
  return h.status !== 'submitted' && h.status !== 'graded' && h.deadline && new Date(h.deadline) < new Date();
}

/** Grade text without repeating the assignment title the backend may fold into the label. */
function gradeText(g) {
  let label = String(g.scoreLabel || '').trim();
  const topic = String(g.topic || '').trim();
  if (topic && label.toLowerCase().includes(topic.toLowerCase())) {
    label = label
      .replace(new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), '')
      .replace(/\bgrade\b/i, '')
      .replace(/^[\s·:,-]+|[\s·:,-]+$/g, '')
      .trim();
  }
  if (label) return label;
  return g.scoreValue ? String(g.scoreValue) : '—';
}

function placeLine(loc = {}) {
  return (
    [loc.label, loc.line1, loc.area, loc.city, loc.state, loc.postalCode, loc.address].filter(Boolean).join(', ') ||
    'See tutor profile'
  );
}

/** 'YYYY-MM-DD' for a date in the viewer's zone. */
function dayKey(value, zone) {
  const d = new Date(value);
  try {
    return d.toLocaleDateString('en-CA', { timeZone: zone || undefined });
  } catch {
    return d.toLocaleDateString('en-CA');
  }
}

/** Shift a 'YYYY-MM-DD' key by n days (calendar arithmetic, zone-free). */
function shiftKey(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10);
}

function keyDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function timeIn(value, zone) {
  const opts = { hour: 'numeric', minute: '2-digit' };
  try {
    return new Date(value).toLocaleTimeString(undefined, { ...opts, timeZone: zone || undefined });
  } catch {
    return new Date(value).toLocaleTimeString(undefined, opts);
  }
}

function hashTone(text) {
  let h = 0;
  for (const ch of String(text || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

function subjectIcon(name) {
  const n = String(name || '').toLowerCase();
  if (/physic/.test(n)) return 'atom';
  if (/chem|bio|science/.test(n)) return 'flask';
  if (/math|stat/.test(n)) return 'target';
  if (/econ|business/.test(n)) return 'bar-chart';
  if (/english|lang|spanish|french|literature|tok|knowledge/.test(n)) return 'book-open';
  if (/computer/.test(n)) return 'layers';
  return 'file-text';
}

const SHORT = [
  [/^mathematics/i, 'Maths'],
  [/^computer science/i, 'Comp Sci'],
  [/^chemistry/i, 'Chem'],
  [/^economics/i, 'Econ'],
  [/^biology/i, 'Bio'],
  [/^business/i, 'Business'],
  [/^geography/i, 'Geog'],
  [/^psychology/i, 'Psych'],
];

/** Compact axis label: "Theory of Knowledge (TOK)" -> "TOK", "Mathematics AA HL" -> "Maths AA HL". */
function shortSubject(name) {
  const text = String(name || 'Subject');
  const m = text.match(/\(([^)]+)\)\s*$/);
  if (m) return m[1];
  for (const [re, short] of SHORT) if (re.test(text)) return text.replace(re, short);
  return text;
}

/** "Physics" + "HL" -> "Physics HL", without doubling a level already in the name. */
function subjectWithLevel(b) {
  const name = b?.subjectId?.name || 'Class';
  const level = String(b?.level || '').trim();
  const words = name.toLowerCase().split(/\s+/);
  if (!level || words.includes(level.toLowerCase())) return name;
  return `${name} ${level}`;
}

function AtomArt() {
  return (
    <svg className="bt-hero-art" viewBox="0 0 240 240" aria-hidden="true">
      <circle cx="132" cy="120" r="96" className="bt-art-halo" opacity=".55" />
      <circle cx="132" cy="120" r="66" className="bt-art-halo" opacity=".8" />
      <g fill="none" stroke="var(--bt-brand)" strokeWidth="3">
        <ellipse cx="132" cy="120" rx="52" ry="20" />
        <ellipse cx="132" cy="120" rx="52" ry="20" transform="rotate(60 132 120)" />
        <ellipse cx="132" cy="120" rx="52" ry="20" transform="rotate(-60 132 120)" />
      </g>
      <circle cx="132" cy="120" r="9" fill="#FF8A3D" />
      <circle cx="184" cy="120" r="6" fill="var(--bt-brand)" />
      <circle cx="106" cy="75" r="6" fill="#22C55E" />
      <circle cx="106" cy="165" r="6" fill="#0EA5E9" />
      <path
        d="M40 210 Q 120 40 222 190"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="2 7"
        strokeLinecap="round"
        opacity=".35"
      />
      <rect x="200" y="36" width="30" height="30" rx="9" fill="#FEF9C3" transform="rotate(12 215 51)" />
      <path
        d="M209 51h12M215 45v12"
        stroke="#946200"
        strokeWidth="2.6"
        strokeLinecap="round"
        transform="rotate(12 215 51)"
      />
    </svg>
  );
}

function FlameArt() {
  return (
    <svg className="bt-flame" viewBox="0 0 86 96" aria-hidden="true">
      <ellipse cx="43" cy="90" rx="28" ry="5" fill="#C2410C" opacity=".12" />
      <path
        d="M43 88c19 0 32-12 32-31 0-17-12-27-17-40-4 8-9 13-15 15 1-9-3-18-8-27C22 16 12 34 12 57c0 19 12 31 31 31Z"
        fill="#FF8A3D"
      />
      <path
        d="M43 88c10 0 17-7 17-17 0-9-6-14-9-21-3 5-6 7-10 8 0-5-2-9-5-13-6 6-10 14-10 26 0 10 7 17 17 17Z"
        fill="#FFC74A"
      />
      <circle cx="38" cy="70" r="3" fill="#fff" opacity=".8" />
    </svg>
  );
}

/** Donut ring. `value` of `max`; optional `marker` (same scale) drawn as a tick. */
function Ring({ value, max, marker, children }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.max(0, Math.min(1, value / max)) : 0;
  const mk = max && marker ? Math.max(0, Math.min(1, marker / max)) : null;
  return (
    <div className="bt-ring">
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={r} fill="none" className="bt-ring-track" strokeWidth="14" />
        {pct > 0 ? (
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="#22C55E"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${pct * c} ${c}`}
            transform="rotate(-90 64 64)"
          />
        ) : null}
        {mk != null ? (
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`1.5 ${c}`}
            strokeDashoffset={-(mk * c)}
            transform="rotate(-90 64 64)"
          />
        ) : null}
      </svg>
      <div className="bt-ring-center">{children}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page st-page bt-dash" aria-busy="true">
      <ErpSkeleton width="18rem" height="2.25rem" />
      <div className="bt-bento">
        <ErpSkeleton className="bt-sk bt-a-hero" height="15rem" radius="28px" />
        <ErpSkeleton className="bt-sk bt-a-attn" height="15rem" radius="28px" />
        <ErpSkeleton className="bt-sk bt-a-streak" height="15rem" radius="28px" />
        <ErpSkeleton className="bt-sk bt-a-ring" height="12rem" radius="28px" />
        <ErpSkeleton className="bt-sk bt-a-kpis" height="12rem" radius="28px" />
        <ErpSkeleton className="bt-sk bt-a-chart" height="12rem" radius="28px" />
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const zone = viewerZone(user);
  const [data, setData] = useState(null);
  const [unpaid, setUnpaid] = useState(null);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [joinTools, setJoinTools] = useState(null);
  const [offlinePlace, setOfflinePlace] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [joining, setJoining] = useState(false);
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [pickedDay, setPickedDay] = useState('');
  const [gradeView, setGradeView] = useState('predicted');

  useEffect(() => {
    getStudentDashboard()
      .then(setData)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
    listPayable({ limit: 200 })
      .then((r) => {
        const rows = (r?.items || []).filter((p) => ['pending', 'failed'].includes(p.status));
        const byCurrency = {};
        rows.forEach((p) => {
          const cur = p.currency || '';
          byCurrency[cur] = (byCurrency[cur] || 0) + Number(p.amount || 0);
        });
        setUnpaid({ count: rows.length, byCurrency, rows });
      })
      .catch(() => setUnpaid(null));
    listScheduleChanges()
      .then((c) => {
        const rows = Array.isArray(c) ? c : c?.items || [];
        setOffers(rows.filter((x) => x.status === 'slots_offered'));
      })
      .catch(() => setOffers([]));
  }, []);

  const when = (v) => formatWhen(v, zone);

  const upcoming = useMemo(
    () =>
      [...(data?.upcomingClasses || [])]
        .filter((b) => b.status !== 'cancelled')
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
    [data]
  );
  const homework = useMemo(
    () =>
      [...(data?.homeworkDue || [])].sort(
        (a, b) => new Date(a.deadline || 8.64e15) - new Date(b.deadline || 8.64e15)
      ),
    [data]
  );

  if (error && !data) {
    return (
      <div className="page stack st-page">
        <ErpBanner variant="danger" title="Could not load your dashboard">
          {error}
        </ErpBanner>
      </div>
    );
  }
  if (loading || !data) return <DashboardSkeleton />;

  const overdue = homework.filter(isOverdue);
  const dueSoon = homework.filter(
    (h) => !isOverdue(h) && h.deadline && new Date(h.deadline).getTime() - Date.now() < 2 * DAY_MS
  );
  const weekAhead = upcoming.filter((b) => new Date(b.startAt).getTime() - Date.now() < 7 * DAY_MS);
  const next = upcoming[0];
  const unpaidFor = (b) => (unpaid?.rows || []).find((p) => idOf(p.bookingId) === String(b?._id));
  const nextInvoice = next ? unpaidFor(next) : null;
  const missing = missingProfileFields(user, profile);
  const unpaidTotal = unpaid
    ? Object.entries(unpaid.byCurrency)
        .map(([cur, amt]) => money(amt, cur || undefined))
        .join(' · ')
    : '';

  const todayKey = dayKey(new Date(), zone);
  const todayLabel = keyDate(todayKey).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const classesToday = upcoming.filter((b) => dayKey(b.startAt, zone) === todayKey).length;

  const contextLine = (() => {
    const bits = [];
    bits.push(
      weekAhead.length
        ? `${weekAhead.length} class${weekAhead.length === 1 ? '' : 'es'} this week`
        : 'No classes in the next 7 days'
    );
    if (homework.length) bits.push(`${homework.length} assignment${homework.length === 1 ? '' : 's'} open`);
    return `${bits.join(' · ')}.`;
  })();

  const openClassTools = async (booking) => {
    setJoinMsg('');
    setJoining(true);
    try {
      const j = await joinBooking(booking._id);
      if (j.deliveryMode === 'offline') {
        setOfflinePlace(placeLine(j.location || {}));
        return;
      }
      if (j.opensAt && new Date(j.opensAt) > new Date()) {
        setJoinMsg(`The class room opens at ${when(j.opensAt)}. Docs and whiteboard are ready now.`);
      }
      setJoinTools(j);
    } catch (err) {
      setJoinMsg(errorMessage(err));
    } finally {
      setJoining(false);
    }
  };

  /* ── Needs your attention ───────────────────────────── */
  const attention = [];
  if (unpaid?.count) {
    attention.push(
      <ErpAttentionItem
        key="unpaid"
        icon="receipt"
        tone="danger"
        title={`${unpaid.count} unpaid invoice${unpaid.count === 1 ? '' : 's'}`}
        meta={`${unpaidTotal} outstanding. Classes are confirmed once paid.`}
        action={
          <LinkButton to="/student/payments" size="sm">
            Pay now
          </LinkButton>
        }
      />
    );
  }
  offers.forEach((c) => {
    const b = c.bookingId && typeof c.bookingId === 'object' ? c.bookingId : null;
    attention.push(
      <ErpAttentionItem
        key={`offer-${c._id}`}
        icon="repeat"
        tone="brand"
        title="Your tutor offered new times"
        meta={b ? `${b.subjectId?.name || 'Class'} · currently ${when(b.startAt)}` : 'Pick a slot to confirm the reschedule.'}
        action={
          <LinkButton to="/student/bookings" size="sm" variant="secondary">
            Choose new time
          </LinkButton>
        }
      />
    );
  });
  overdue.slice(0, 3).forEach((h) => {
    attention.push(
      <ErpAttentionItem
        key={`od-${h._id}`}
        icon="alert-triangle"
        tone="danger"
        title={h.title}
        meta={`Overdue · was due ${when(h.deadline)}${h.subjectId?.name ? ` · ${h.subjectId.name}` : ''}`}
        action={
          <LinkButton to={`/student/homework/${h._id}`} size="sm" variant="secondary">
            Submit
          </LinkButton>
        }
      />
    );
  });
  if (overdue.length > 3) {
    attention.push(
      <ErpAttentionItem
        key="od-more"
        icon="clipboard-check"
        tone="danger"
        title={`${overdue.length - 3} more overdue assignment${overdue.length - 3 === 1 ? '' : 's'}`}
        action={
          <LinkButton to="/student/homework" size="sm" variant="ghost">
            View all
          </LinkButton>
        }
      />
    );
  }
  dueSoon.slice(0, 3).forEach((h) => {
    attention.push(
      <ErpAttentionItem
        key={`ds-${h._id}`}
        icon="clock"
        tone="warning"
        title={h.title}
        meta={`Due ${timeUntil(h.deadline)} · ${when(h.deadline)}`}
        action={
          <LinkButton to={`/student/homework/${h._id}`} size="sm" variant="secondary">
            Open
          </LinkButton>
        }
      />
    );
  });
  if (missing.length) {
    attention.push(
      <ErpAttentionItem
        key="profile"
        icon="user"
        tone="info"
        title="Finish setting up your profile"
        meta={`Add your ${missing.join(', ')} so tutors can match your syllabus.`}
        action={
          <LinkButton to="/student/profile" size="sm" variant="secondary">
            Complete profile
          </LinkButton>
        }
      />
    );
  }
  if (!data.studyStreak && !missing.length) {
    attention.push(
      <ErpAttentionItem
        key="streak"
        icon="flame"
        tone="brand"
        title="Start a study streak"
        meta="Log today's study time to build your rhythm."
        action={
          <LinkButton to="/student/progress/log" size="sm" variant="ghost">
            Log hours
          </LinkButton>
        }
      />
    );
  }
  const ATTN_PREVIEW = 3;
  const attentionShown = showAllAttention ? attention : attention.slice(0, ATTN_PREVIEW);

  /* ── Study streak: this week's dots from the streak window ── */
  const streak = Number(data.studyStreak || 0);
  const lastActive = profile?.lastActivityDate ? String(profile.lastActivityDate).slice(0, 10) : '';
  const activeDays = new Set();
  if (streak && /^\d{4}-\d{2}-\d{2}$/.test(lastActive)) {
    for (let i = 0; i < Math.min(streak, 14); i += 1) activeDays.add(shiftKey(lastActive, -i));
  }
  const todayDow = (keyDate(todayKey).getUTCDay() + 6) % 7; // Mon = 0
  const weekStart = shiftKey(todayKey, -todayDow);
  const streakWeek = Array.from({ length: 7 }, (_, i) => {
    const key = shiftKey(weekStart, i);
    return {
      key,
      label: keyDate(key).toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' }),
      on: activeDays.has(key),
      today: key === todayKey,
    };
  });
  const activeToday = activeDays.has(todayKey);

  /* ── Grades: predicted grades + average graded score per subject ── */
  const names = subjectNameMap(
    profile?.subjectIds || [],
    data.upcomingClasses || [],
    data.homeworkDue || [],
    data.recentGrades || []
  );
  const perf = data.academicPerformanceSummary || {};
  const predicted = perf.predictedGrades || {};
  const bySubject = perf.bySubject || [];
  const avgFor = Object.fromEntries(bySubject.map((s) => [String(s._id), Number(s.avgScore || 0)]));
  const profileSubjectIds = (profile?.subjectIds || []).map((s) => idOf(s)).filter(Boolean);
  const subjectIds = [
    ...new Set([
      ...profileSubjectIds,
      ...Object.keys(predicted),
      ...bySubject.filter((s) => s.count).map((s) => String(s._id)),
    ]),
  ].filter((id) => names[id] && (Number(predicted[id]) > 0 || avgFor[id] > 0));
  const gradeRows = subjectIds.slice(0, 8).map((id, i) => ({
    id,
    name: names[id],
    predicted: Number(predicted[id]) || 0,
    avg: Math.round((avgFor[id] || 0) * 10) / 10,
    color: BAR_COLORS[i % BAR_COLORS.length],
  }));
  const ringSubjects = (profileSubjectIds.length ? profileSubjectIds : Object.keys(predicted)).filter(
    (id) => Number(predicted[id]) > 0
  );
  const predictedTotal = ringSubjects.reduce((sum, id) => sum + Number(predicted[id] || 0), 0);
  const ringMax = Math.max(ringSubjects.length, 6) * 7 + 3;
  const scored = bySubject.filter((s) => Number(s.avgScore) > 0);
  const overallAvg = scored.length ? scored.reduce((s, x) => s + Number(x.avgScore), 0) / scored.length : 0;
  const hoursLogged = bySubject.reduce((sum, s) => sum + Number(s.totalHours || 0), 0);

  /* ── Level: credits toward the next reward level ── */
  const credits = Number(data.credits || 0);
  const levelIdx = Math.max(0, LEVELS.findIndex((l) => l.name === data.level));
  const nextLevel = LEVELS[levelIdx + 1];
  const levelPct = nextLevel
    ? Math.round(((credits - LEVELS[levelIdx].min) / (nextLevel.min - LEVELS[levelIdx].min)) * 100)
    : 100;

  /* ── This week: next 7 days strip ── */
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = shiftKey(todayKey, i);
    const d = keyDate(key);
    const classes = upcoming.filter((b) => dayKey(b.startAt, zone) === key);
    return {
      key,
      dow: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
      day: d.getUTCDate(),
      classes,
    };
  });
  const defaultDay = days.find((d) => d.classes.length)?.key || todayKey;
  const activeDay = days.find((d) => d.key === pickedDay) || days.find((d) => d.key === defaultDay);
  const rangeLabel = `${keyDate(days[0].key).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })} – ${keyDate(days[6].key).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;

  const focusTopics = data.recommendedStudyPlan?.focusTopics || [];
  const nextSubject = next ? subjectWithLevel(next) : '';
  const nextOffline = next?.deliveryMode === 'offline';
  const gradeScale = 7;

  return (
    <div className="page st-page bt-dash">
      <header className="bt-greet">
        <div className="bt-greet-text">
          <p className="bt-greet-date">{todayLabel}</p>
          <h2 className="bt-greet-title">
            {greeting()}
            {firstName(user?.name) ? `, ${firstName(user?.name)}` : ''}
          </h2>
          <p className="bt-greet-sub">
            {classesToday ? (
              <b>
                {classesToday} class{classesToday === 1 ? '' : 'es'} today ·{' '}
              </b>
            ) : null}
            {contextLine}
          </p>
        </div>
        <div className="bt-greet-actions">
          <LinkButton to="/student/tutors" variant="secondary" icon="search" className="bt-search-pill">
            Find a tutor
          </LinkButton>
          <LinkButton to="/student/bookings" variant="secondary" icon="calendar" className="bt-round-pill">
            Schedule
          </LinkButton>
        </div>
      </header>

      {joinMsg && (
        <ErpBanner variant="info" onDismiss={() => setJoinMsg('')}>
          {joinMsg}
        </ErpBanner>
      )}

      <div className="bt-bento">
        {/* Next class */}
        <section className="bt-tile bt-lav bt-a-hero bt-hero" aria-label="Next class">
          <div className="bt-hero-copy">
            <div className="bt-hero-badges">
              <span className="bt-badge bt-badge-live">{next ? 'Next class' : 'No class booked'}</span>
              {next ? (
                <span className="bt-badge bt-badge-ink">
                  <Icon name="clock" size={13} strokeWidth={2.2} />
                  Starts {timeUntil(next.startAt)}
                </span>
              ) : null}
            </div>
            <h3 className="bt-hero-title">{next ? nextSubject : 'Nothing scheduled yet'}</h3>
            {next ? (
              <>
                <p className="bt-hero-sub">
                  <Icon name="calendar" size={16} />
                  {when(next.startAt)}
                </p>
                <p className="bt-hero-meta">
                  <span>
                    <span className="bt-hero-av" aria-hidden="true">
                      <Icon name="user" size={14} />
                    </span>
                    Tutor {tutorRef(next.tutorUserId)}
                  </span>
                  <span>
                    <Icon name={nextOffline ? 'map-pin' : 'video'} size={15} />
                    {titleCase(next.deliveryMode || 'online')}
                  </span>
                </p>
              </>
            ) : (
              <p className="bt-hero-sub">Pick a verified IB tutor and book a slot that suits you.</p>
            )}
            <div className="bt-hero-actions">
              {next ? (
                <>
                  {nextInvoice ? (
                    <LinkButton to="/student/payments" state={{ paymentId: nextInvoice._id }} icon="credit-card">
                      Pay {money(nextInvoice.amount, nextInvoice.currency)}
                    </LinkButton>
                  ) : null}
                  <ErpButton
                    variant={nextInvoice ? 'secondary' : 'primary'}
                    icon={nextOffline ? 'map-pin' : 'video'}
                    loading={joining}
                    onClick={() => openClassTools(next)}
                  >
                    {nextOffline ? 'Location' : 'Class tools'}
                  </ErpButton>
                  <LinkButton to="/student/bookings" variant="ghost">
                    Reschedule
                  </LinkButton>
                </>
              ) : (
                <LinkButton to="/student/tutors" icon="search">
                  Find a tutor
                </LinkButton>
              )}
            </div>
          </div>
          <AtomArt />
        </section>

        {/* Needs your attention */}
        <section className="bt-tile bt-butter bt-a-attn bt-attn" aria-label="Needs your attention">
          <div className="bt-th">
            <h3>Needs your attention</h3>
            {attention.length ? <span className="bt-num">{attention.length}</span> : null}
          </div>
          {attention.length ? (
            <>
              <ErpAttentionList className="bt-attn-list">{attentionShown}</ErpAttentionList>
              {attention.length > ATTN_PREVIEW ? (
                <button
                  type="button"
                  className="bt-more"
                  aria-expanded={showAllAttention}
                  onClick={() => setShowAllAttention((v) => !v)}
                >
                  {showAllAttention ? 'Show less' : `Show all ${attention.length}`}
                  <Icon name={showAllAttention ? 'chevron-up' : 'chevron-down'} size={15} />
                </button>
              ) : null}
            </>
          ) : (
            <div className="bt-clear">
              <span className="bt-ic bt-mint-ic">
                <Icon name="check-circle" size={18} />
              </span>
              <span>You're all caught up. No payments, overdue work or reschedule offers.</span>
            </div>
          )}
        </section>

        {/* Study streak */}
        <Link to="/student/progress" className="bt-tile bt-peach bt-a-streak bt-streak" aria-label={`Study streak: ${streak} days`}>
          <div className="bt-th">
            <h3>Study streak</h3>
          </div>
          <div className="bt-streak-big">
            <b>{streak}</b>
            <span>
              day{streak === 1 ? '' : 's'}
              <br />
              in a row
            </span>
          </div>
          <FlameArt />
          <div className="bt-week" aria-hidden="true">
            {streakWeek.map((d) => (
              <span
                key={d.key}
                className={`bt-wd${d.on && !d.today ? ' is-on' : ''}${d.today ? ' is-today' : ''}${
                  d.today && d.on ? ' is-done' : ''
                }`}
              >
                <i>
                  {d.today ? (
                    <Icon name="flame" size={14} strokeWidth={2.2} />
                  ) : d.on ? (
                    <Icon name="check" size={14} strokeWidth={2.4} />
                  ) : null}
                </i>
                {d.label}
              </span>
            ))}
          </div>
          <div className="bt-streak-foot">
            <span>{activeToday ? 'Logged today' : 'Log today to keep it going'}</span>
            <span className="bt-streak-xp">{credits} credits</span>
          </div>
        </Link>

        {/* Predicted total */}
        <Link to="/student/progress" className="bt-tile bt-mint bt-a-ring bt-ringt" aria-label="Predicted total">
          <div className="bt-th">
            <h3>Predicted total</h3>
            {overallAvg ? (
              <span className="bt-badge bt-badge-white bt-mint-txt">avg {overallAvg.toFixed(1)}</span>
            ) : null}
          </div>
          <div className="bt-ringwrap">
            <Ring value={predictedTotal} max={ringMax}>
              <b>{predictedTotal || '—'}</b>
              <small>of {ringMax}</small>
            </Ring>
            <div className="bt-ring-legend">
              <div>
                <i style={{ background: '#22C55E' }} />
                Predicted <b>{predictedTotal || '—'}</b>
              </div>
              <div>
                <i className="bt-legend-ink" />
                Subjects <b>{ringSubjects.length || '—'}</b>
              </div>
              <div>
                <i className="bt-legend-white" />
                Core <b>+3</b>
              </div>
            </div>
          </div>
        </Link>

        {/* Hours + level */}
        <div className="bt-a-kpis bt-kpis">
          <Link to="/student/progress/log" className="bt-kpi bt-sky">
            <span className="bt-kpi-ic bt-white-ic bt-sky-txt">
              <Icon name="clock" size={20} />
            </span>
            <span className="bt-kpi-body">
              <span className="bt-kpi-v">
                {Math.round(hoursLogged * 10) / 10}
                <small> hrs</small>
              </span>
              <span className="bt-kpi-l">Study time logged</span>
            </span>
            <span className="bt-badge bt-badge-white bt-sky-txt bt-kpi-badge">
              <Icon name="plus" size={12} strokeWidth={2.4} />
              Log
            </span>
          </Link>
          <Link to="/student/progress" className="bt-kpi bt-white">
            <span className="bt-kpi-ic bt-brand-ic">
              <Icon name="trophy" size={20} />
            </span>
            <span className="bt-kpi-body">
              <span className="bt-kpi-v bt-kpi-v-sm">Level · {data.level || 'Starter'}</span>
              <span className="bt-xp" aria-hidden="true">
                <i style={{ width: `${Math.max(4, Math.min(100, levelPct))}%` }} />
              </span>
              <span className="bt-kpi-l">
                {nextLevel
                  ? `${credits} / ${nextLevel.min} credits to ${nextLevel.name}`
                  : `${credits} credits · top level`}
                {data.stars ? ` · ${data.stars}★` : ''}
              </span>
            </span>
          </Link>
        </div>

        {/* Grades by subject */}
        <section className="bt-tile bt-white bt-a-chart bt-chart" aria-label="Grades by subject">
          <div className="bt-th">
            <h3>Grades by subject</h3>
            <span className="bt-legend-tgt">
              <i />
              {gradeView === 'predicted' ? 'avg score' : 'predicted'}
            </span>
            <ErpSegmented
              className="bt-seg"
              aria-label="Grade view"
              value={gradeView}
              onChange={setGradeView}
              options={[
                { value: 'predicted', label: 'Predicted' },
                { value: 'avg', label: 'Avg score' },
              ]}
            />
          </div>
          {gradeRows.length ? (
            <>
              <div className="bt-bars">
                {[7, 5, 3].map((g) => (
                  <div key={g} className="bt-grid" style={{ bottom: `${(g / gradeScale) * 100}%` }}>
                    <span>{g}</span>
                  </div>
                ))}
                {gradeRows.map((r) => {
                  const val = gradeView === 'predicted' ? r.predicted : r.avg;
                  const mark = gradeView === 'predicted' ? r.avg : r.predicted;
                  return (
                    <div
                      key={r.id}
                      className="bt-bar"
                      title={`${r.name}: predicted ${r.predicted || '—'}, avg score ${r.avg || '—'}`}
                    >
                      <div
                        className="bt-col"
                        style={{ height: `${Math.max(8, (val / gradeScale) * 100)}%`, background: r.color }}
                      >
                        <b>{val ? (Number.isInteger(val) ? val : val.toFixed(1)) : '—'}</b>
                      </div>
                      {mark ? <i className="bt-tgt" style={{ bottom: `${(mark / gradeScale) * 100}%` }} /> : null}
                    </div>
                  );
                })}
              </div>
              <div className="bt-blabels">
                {gradeRows.map((r) => (
                  <span key={r.id} title={r.name}>
                    {shortSubject(r.name)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <ErpEmptyState
              icon="bar-chart"
              title="No grades yet"
              description="Predicted grades and graded work will chart here."
            />
          )}
        </section>

        {/* This week */}
        <section className="bt-tile bt-white bt-a-week bt-sched" aria-label="This week">
          <div className="bt-th">
            <h3>This week</h3>
            <span className="bt-th-meta">
              {rangeLabel} · {weekAhead.length} class{weekAhead.length === 1 ? '' : 'es'}
            </span>
            <Link to="/student/tutors" className="bt-link">
              Book a class
              <Icon name="arrow-right" size={14} strokeWidth={2.2} />
            </Link>
          </div>
          <div className="bt-days" role="tablist" aria-label="Pick a day">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                role="tab"
                aria-selected={activeDay?.key === d.key}
                className={`bt-day${activeDay?.key === d.key ? ' is-on' : ''}`}
                onClick={() => setPickedDay(d.key)}
              >
                {d.dow}
                <b>{d.day}</b>
                <span className={`bt-day-dot${d.classes.length ? '' : ' is-none'}`} />
              </button>
            ))}
          </div>
          {activeDay?.classes.length ? (
            <ul className="bt-cls-list">
              {activeDay.classes.map((b, i) => {
                const mins = b.endAt ? Math.round((new Date(b.endAt) - new Date(b.startAt)) / 60000) : 0;
                const offline = b.deliveryMode === 'offline';
                return (
                  <li key={b._id}>
                    <Link to="/student/bookings" className="bt-cls">
                      <span className="bt-cls-tm">
                        {timeIn(b.startAt, zone)}
                        {mins > 0 ? <small>{mins} min</small> : null}
                      </span>
                      <i className="bt-cls-bar" style={{ background: i % 2 ? '#0EA5E9' : 'var(--bt-brand)' }} />
                      <span className="bt-cls-tx">
                        <b>{subjectWithLevel(b)}</b>
                        <small>Tutor {tutorRef(b.tutorUserId)}</small>
                      </span>
                      {unpaidFor(b) ? (
                        <ErpStatusBadge status="pending">Unpaid</ErpStatusBadge>
                      ) : (
                        <span className={`bt-chip ${offline ? 'bt-peach-chip' : 'bt-lav-chip'}`}>
                          <Icon name={offline ? 'map-pin' : 'video'} size={13} strokeWidth={2.2} />
                          {offline ? 'At home' : 'Online'}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="bt-empty-day">
              <span className="bt-ic bt-lav-ic">
                <Icon name="calendar" size={18} />
              </span>
              <span>
                {upcoming.length ? 'No classes this day.' : 'No upcoming classes. Book a session and it will show up here.'}
              </span>
              <LinkButton to={upcoming.length ? '/student/bookings' : '/student/tutors'} size="sm" variant="secondary">
                {upcoming.length ? 'All bookings' : 'Find a tutor'}
              </LinkButton>
            </div>
          )}
        </section>

        {/* Homework */}
        <section className="bt-tile bt-sky bt-a-hw bt-hw" aria-label="Homework">
          <div className="bt-th">
            <h3>Homework</h3>
            <span className="bt-th-meta">
              {homework.length} open{overdue.length ? ` · ${overdue.length} overdue` : ''}
            </span>
            <Link to="/student/homework" className="bt-link">
              View all
              <Icon name="arrow-right" size={14} strokeWidth={2.2} />
            </Link>
          </div>
          {!homework.length ? (
            <div className="bt-clear bt-clear-card">
              <span className="bt-ic bt-mint-ic">
                <Icon name="check-circle" size={18} />
              </span>
              <span>Nothing due. New assignments from your tutors appear here.</span>
            </div>
          ) : (
            <ul className="bt-hw-list">
              {homework.slice(0, 4).map((h) => {
                const od = isOverdue(h);
                const subj = h.subjectId?.name || '';
                return (
                  <li key={h._id} className="bt-hwi">
                    <span className={`bt-ic bt-${hashTone(subj)}-ic`}>
                      <Icon name={subjectIcon(subj)} size={17} />
                    </span>
                    <Link to={`/student/homework/${h._id}`} className="bt-hwi-tx">
                      <b>{h.title}</b>
                      <small>
                        {subj ? `${subj} · ` : ''}
                        {od ? 'Was due' : 'Due'} {when(h.deadline)}
                      </small>
                    </Link>
                    {od ? (
                      <LinkButton to={`/student/homework/${h._id}`} size="sm" icon="upload">
                        Submit
                      </LinkButton>
                    ) : (
                      <LinkButton to={`/student/homework/${h._id}`} size="sm" variant="secondary">
                        {timeUntil(h.deadline) || 'Open'}
                      </LinkButton>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Study plan */}
        <section className="bt-tile bt-lav bt-a-plan bt-plan" aria-label="Recommended study plan">
          <div className="bt-th">
            <h3>Recommended study plan</h3>
            <LinkButton to="/student/progress/log" size="sm" variant="secondary" icon="plus">
              Log hours
            </LinkButton>
          </div>
          <div className="bt-tip">
            <span className="bt-ic bt-white-ic bt-lav-txt">
              <Icon name="target" size={18} />
            </span>
            <p>{data.recommendedStudyPlan?.tip || 'Stay consistent with daily practice.'}</p>
          </div>
          {focusTopics.length ? (
            <div className="bt-topics">
              {focusTopics.map((t) => (
                <span key={t} className="bt-topic">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <Link to="/student/progress" className="bt-link bt-link-end">
            View progress
            <Icon name="arrow-right" size={14} strokeWidth={2.2} />
          </Link>
        </section>

        {/* Recent grades */}
        <section className="bt-tile bt-mint bt-a-grades bt-grades" aria-label="Recent grades">
          <div className="bt-th">
            <h3>Recent grades</h3>
            <Link to="/student/progress" className="bt-link">
              Progress
              <Icon name="arrow-right" size={14} strokeWidth={2.2} />
            </Link>
          </div>
          {!data.recentGrades?.length ? (
            <ErpEmptyState icon="award" title="No grades yet" description="Graded homework and assessments will appear here." />
          ) : (
            <ul className="bt-grade-list">
              {data.recentGrades.slice(0, 5).map((g, i) => (
                <li key={g._id || i}>
                  <span className="bt-grade-tx">
                    <b>{g.topic || 'Graded work'}</b>
                    <small>{g.subjectId?.name || 'Subject'}</small>
                  </span>
                  <span className="bt-grade">
                    {gradeText(g)}
                    <small>/7</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        {(data.recentActivity || []).length > 0 && (
          <section className="bt-tile bt-white bt-a-act bt-activity" aria-label="Recent activity">
            <div className="bt-th">
              <h3>Recent activity</h3>
            </div>
            <ul className="bt-act-list">
              {data.recentActivity.slice(0, 6).map((a, i) => {
                const body = (
                  <>
                    <span className={`bt-ic ${a.type === 'homework' ? 'bt-sky-ic' : 'bt-lav-ic'} bt-ic-sm`}>
                      <Icon name={a.type === 'homework' ? 'file-text' : 'calendar'} size={15} />
                    </span>
                    <span className="bt-act-tx">
                      <b>{a.summary}</b>
                      <small>
                        {titleCase(a.type)} · {when(a.at)}
                      </small>
                    </span>
                  </>
                );
                return (
                  <li key={i}>
                    {a.type === 'homework' && a.refId ? (
                      <Link to={`/student/homework/${a.refId}`} className="bt-act">
                        {body}
                      </Link>
                    ) : (
                      <div className="bt-act">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <ClassToolsModal open={Boolean(joinTools)} join={joinTools} onClose={() => setJoinTools(null)} />
      <ErpModal open={Boolean(offlinePlace)} title="Class location" onClose={() => setOfflinePlace('')}>
        <p style={{ margin: 0 }}>{offlinePlace}</p>
      </ErpModal>
    </div>
  );
}
