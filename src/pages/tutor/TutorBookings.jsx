import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  approveReplacementTutor,
  cancelBooking,
  completeBooking,
  doorstepCheckIn,
  addClassHistory,
  declineReschedule,
  getBookingChain,
  getBookingSummary,
  getStudentInsights,
  joinBooking,
  listAvailability,
  listBookings,
  listScheduleChanges,
  offerRescheduleSlots,
  saveSessionReport,
  setAttendance,
  setMeetingStatus,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  ErpAttentionItem,
  ErpAttentionList,
  ErpAvatar,
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpDrawer,
  ErpEmptyState,
  ErpInput,
  ErpLoadingState,
  ErpModal,
  ErpPageHeader,
  ErpPager,
  ErpSearch,
  ErpSegmented,
  ErpSelect,
  ErpSkeleton,
  ErpStatusBadge,
  ErpTabs,
  ErpTextarea,
  Icon,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate, formatInZone, money } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { gradeLabel, GRADING_SCHEME_OPTIONS } from '../../utils/grading';
import { ATTENDANCE_OPTIONS, idOf, localTime } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import ClassToolsModal from '../../components/ClassToolsModal';
import TutorRowMenu from './TutorRowMenu';
import './tutor.css';

const MOOD_OPTIONS = [
  { value: '', label: 'Not noted' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'confident', label: 'Confident' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'distracted', label: 'Distracted' },
  { value: 'anxious', label: 'Anxious' },
];

const HOMEWORK_COMPLETION_OPTIONS = [
  { value: '', label: 'Not noted' },
  { value: 'done', label: 'Previous homework done' },
  { value: 'partial', label: 'Partially done' },
  { value: 'not_done', label: 'Not done' },
  { value: 'none_assigned', label: 'None was assigned' },
];

const RATING_OPTIONS = [
  { value: '', label: 'Not rated' },
  { value: '5', label: '5 – Mastered' },
  { value: '4', label: '4 – Good' },
  { value: '3', label: '3 – Partial' },
  { value: '2', label: '2 – Struggling' },
  { value: '1', label: '1 – Lost' },
];

const EMPTY_REPORT = {
  summary: '',
  topicsCovered: '',
  strengths: '',
  weaknesses: '',
  studentMood: '',
  understandingRating: '',
  homeworkCompletion: '',
  nextSteps: '',
  privateNotes: '',
  sharedWithParent: true,
};

function defaultDeadline() {
  const d = new Date(Date.now() + 7 * 86400000);
  d.setHours(18, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyAssignment() {
  return {
    title: '',
    description: '',
    deadline: defaultDeadline(),
    gradingScheme: 'ib_1_7',
    maxScore: '',
    rubric: '',
    files: [],
  };
}

function reportFromDoc(r) {
  if (!r) return { ...EMPTY_REPORT };
  return {
    ...EMPTY_REPORT,
    ...r,
    topicsCovered: (r.topicsCovered || []).join(', '),
    understandingRating: r.understandingRating ? String(r.understandingRating) : '',
  };
}

function reportPayload(form) {
  return {
    summary: form.summary,
    topicsCovered: form.topicsCovered
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    strengths: form.strengths,
    weaknesses: form.weaknesses,
    studentMood: form.studentMood,
    understandingRating: form.understandingRating ? Number(form.understandingRating) : null,
    homeworkCompletion: form.homeworkCompletion,
    nextSteps: form.nextSteps,
    privateNotes: form.privateNotes,
    sharedWithParent: Boolean(form.sharedWithParent),
  };
}

function eventVariant(b) {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.status === 'completed') return 'completed';
  if (b.meetingStatus === 'live') return 'live';
  return '';
}

function studentName(b) {
  return b?.studentUserId?.name || b?.studentUserId?.phone || 'Student';
}

function slotRange(s) {
  const a = new Date(s.startAt);
  const b = new Date(s.endAt);
  if (Number.isNaN(a.getTime())) return localTime(s.startAt);
  const day = a.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const t = (d) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${t(a)}${Number.isNaN(b.getTime()) ? '' : ` – ${t(b)}`}`;
}

function canChangeBooking(b) {
  return Boolean(b && b.status !== 'cancelled' && b.status !== 'completed');
}

function ReportFields({ form, setForm }) {
  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  return (
    <div className="stack" style={{ gap: '1.25rem' }}>
      <section className="erp-form-section">
        <h4 className="erp-section-title">What happened</h4>
        <div className="erp-form-grid">
          <div className="erp-form-span">
            <ErpTextarea
              label="Session summary"
              value={form.summary}
              onChange={set('summary')}
              rows={3}
              helper="Shared with the student (and parents if enabled below)"
            />
          </div>
          <div className="erp-form-span">
            <ErpInput
              label="Topics covered"
              value={form.topicsCovered}
              onChange={set('topicsCovered')}
              helper="Comma separated, e.g. Kinematics, Projectile motion"
            />
          </div>
          <ErpTextarea label="Strengths" optional value={form.strengths} onChange={set('strengths')} rows={2} />
          <ErpTextarea label="Needs work" optional value={form.weaknesses} onChange={set('weaknesses')} rows={2} />
        </div>
      </section>
      <section className="erp-form-section">
        <h4 className="erp-section-title">How the student is doing</h4>
        <div className="erp-form-grid">
          <ErpSelect
            label="Understanding"
            value={form.understandingRating}
            options={RATING_OPTIONS}
            onChange={set('understandingRating')}
          />
          <ErpSelect label="Student mood" value={form.studentMood} options={MOOD_OPTIONS} onChange={set('studentMood')} />
          <ErpSelect
            label="Previous homework"
            value={form.homeworkCompletion}
            options={HOMEWORK_COMPLETION_OPTIONS}
            onChange={set('homeworkCompletion')}
          />
          <ErpInput label="Plan for next session" optional value={form.nextSteps} onChange={set('nextSteps')} />
        </div>
      </section>
      <section className="erp-form-section">
        <h4 className="erp-section-title">Private</h4>
        <div className="erp-form-grid">
          <div className="erp-form-span">
            <ErpTextarea
              label="Private notes"
              optional
              helper="Only you see these"
              value={form.privateNotes}
              onChange={set('privateNotes')}
              rows={2}
            />
          </div>
          <label className="erp-check erp-form-span">
            <input type="checkbox" checked={Boolean(form.sharedWithParent)} onChange={set('sharedWithParent')} />
            Share summary with parents
          </label>
        </div>
      </section>
    </div>
  );
}

function AssignmentFields({ form, setForm }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <div className="erp-form-grid">
      <div className="erp-form-span">
        <ErpInput label="Title" value={form.title} onChange={set('title')} required />
      </div>
      <div className="erp-form-span">
        <ErpTextarea label="Instructions" optional value={form.description} onChange={set('description')} rows={3} />
      </div>
      <ErpInput label="Due" type="datetime-local" value={form.deadline} onChange={set('deadline')} />
      <ErpSelect
        label="Grading"
        value={form.gradingScheme}
        options={GRADING_SCHEME_OPTIONS}
        onChange={set('gradingScheme')}
      />
      {form.gradingScheme === 'marks' && (
        <ErpInput label="Total marks" type="number" min="1" value={form.maxScore} onChange={set('maxScore')} />
      )}
      <div className="field erp-form-span">
        <label className="erp-label">
          Attachments <span className="erp-label-optional">(optional)</span>
        </label>
        <div className="erp-file-drop">
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
            onChange={(e) => setForm((f) => ({ ...f, files: Array.from(e.target.files || []) }))}
          />
          <span className="muted text-erp-xs">
            {form.files.length
              ? form.files.map((f) => f.name).join(', ')
              : 'Worksheets, images, audio or video'}
          </span>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;
const OPEN_CHANGE = ['pending', 'slots_offered', 'awaiting_replacement', 'awaiting_approval'];
const RESCHEDULE_MIN_HOURS = 12;
const LIVE_EARLY_MINUTES = 15;

const CHANGE_STATUS_LABEL = {
  pending: 'Student asked to reschedule — waiting for your slots',
  slots_offered: 'Slots offered — waiting for the student to pick one',
  awaiting_replacement: 'No slot offered — student may request a replacement tutor',
  awaiting_approval: 'Replacement tutor awaiting approval',
};

function needsReport(b) {
  return (
    b.status !== 'cancelled' &&
    b.meetingStatus !== 'no_show' &&
    !b.consumed &&
    new Date(b.startAt) < new Date() &&
    (b.status !== 'completed' || !b.sessionReportId)
  );
}

function addressLine(loc) {
  if (!loc || typeof loc !== 'object') return '';
  return [loc.line1, loc.line2, loc.address, loc.landmark, loc.area, loc.city, loc.state, loc.postalCode || loc.pincode]
    .filter(Boolean)
    .join(', ');
}

function validateAssignment(form) {
  if (!form.title.trim()) return 'Give the homework a title, or choose not to assign';
  const due = new Date(form.deadline);
  if (!form.deadline || Number.isNaN(due.getTime())) return 'Set a valid due date';
  if (due <= new Date()) return 'The due date must be in the future';
  if (form.gradingScheme === 'marks' && !(Number(form.maxScore) > 0)) return 'Set total marks above 0';
  return '';
}

function ClassFileUpload({ bookingId, onSaved, onError }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await addClassHistory(bookingId, fd);
      setFile(null);
      setInputKey((k) => k + 1);
      onSaved?.();
    } catch (err) {
      onError?.(errorMessage(err, 'Could not upload the file'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="tutor-upload-row">
      <input key={inputKey} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <ErpButton variant="secondary" size="sm" icon="upload" disabled={!file} loading={busy} onClick={upload}>
        {busy ? 'Uploading…' : 'Upload'}
      </ErpButton>
    </div>
  );
}

export default function TutorBookings() {
  const { user } = useAuth();
  const me = String(user?.id ?? user?._id);
  const phone = useIsPhone();
  const [params] = useSearchParams();
  const openedFromQuery = useRef(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [reportItems, setReportItems] = useState([]);
  const [view, setView] = useState('list');
  const [tab, setTab] = useState('upcoming');
  const [modeFilter, setModeFilter] = useState('all');
  const [reschedule, setReschedule] = useState(null);
  const [changes, setChanges] = useState([]);
  const [range, setRange] = useState(null);
  const [calDate, setCalDate] = useState(() => new Date());
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState({ summary: null, chain: null, insights: null, loading: false });
  const [wizard, setWizard] = useState(null);
  const [wizardError, setWizardError] = useState('');
  const [reportForm, setReportForm] = useState({ ...EMPTY_REPORT });
  const [assignForm, setAssignForm] = useState(emptyAssignment());
  const [assign, setAssign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [joinTools, setJoinTools] = useState(null);
  const [doorstep, setDoorstep] = useState(null);
  const [doorPhoto, setDoorPhoto] = useState(null);
  const [placePhoto, setPlacePhoto] = useState(null);
  const [doorBusy, setDoorBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    if (view === 'calendar' && !range) return;
    setLoading(true);
    setError('');
    try {
      const now = new Date().toISOString();
      let query = null;
      if (view === 'calendar') {
        query = { from: range.from.toISOString(), to: range.to.toISOString(), limit: 500 };
      } else if (tab === 'upcoming') {
        query = { from: now, sort: 'startAt', excludeStatus: 'cancelled', page, limit: PAGE_SIZE };
      } else if (tab === 'completed') {
        query = { status: 'completed', sort: '-startAt', page, limit: PAGE_SIZE };
      } else if (tab === 'all') {
        query = { sort: '-startAt', page, limit: PAGE_SIZE };
      }
      const [d, c] = await Promise.all([query ? listBookings(query) : null, listScheduleChanges()]);
      if (d) {
        setItems(d.items || []);
        setTotal(Number(d.total) || 0);
      }
      setChanges(Array.isArray(c) ? c : c?.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [view, range, tab, page]);

  const loadReportQueue = useCallback(async () => {
    try {
      const d = await listBookings({ to: new Date().toISOString(), sort: '-startAt', limit: 500 });
      setReportItems(d.items || []);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadReportQueue();
  }, [loadReportQueue]);

  const reloadAll = () => {
    load();
    loadReportQueue();
  };

  const changeTab = (next) => {
    setTab(next);
    setPage(1);
  };

  const listed = useMemo(() => {
    const id = String(selectedId);
    return items.find((b) => String(b._id) === id) || reportItems.find((b) => String(b._id) === id) || null;
  }, [items, reportItems, selectedId]);
  const summaryBooking =
    detail.summary?.booking && String(detail.summary.booking._id) === String(selectedId) ? detail.summary.booking : null;
  const selected = selectedId ? (summaryBooking ? { ...listed, ...summaryBooking } : listed) : null;

  const loadDetail = useCallback(async (id, studentId) => {
    setDetail({ summary: null, chain: null, insights: null, loading: true });
    try {
      const [summary, chain] = await Promise.all([getBookingSummary(id), getBookingChain(id)]);
      const sid = studentId || idOf(summary?.booking?.studentUserId);
      const insights = sid ? await getStudentInsights(sid).catch(() => null) : null;
      setDetail({ summary, chain, insights, loading: false });
    } catch (err) {
      setError(errorMessage(err));
      setDetail((d) => ({ ...d, loading: false }));
    }
  }, []);

  const openBooking = (booking) => {
    setSelectedId(String(booking._id));
    loadDetail(booking._id, idOf(booking.studentUserId));
  };

  useEffect(() => {
    const id = params.get('id');
    if (!id || openedFromQuery.current) return;
    openedFromQuery.current = true;
    setSelectedId(String(id));
    loadDetail(id);
  }, [params, loadDetail]);

  const refreshSelected = async () => {
    reloadAll();
    if (selectedId) loadDetail(selectedId);
  };

  const openChangeFor = (bookingId) =>
    changes.find((c) => idOf(c.bookingId) === String(bookingId) && OPEN_CHANGE.includes(c.status)) || null;

  const openReschedule = async (booking) => {
    const change = openChangeFor(booking._id);
    const offered = (change?.offeredSlotIds || []).map((s) => idOf(s));
    setReschedule({ booking, change, slots: [], selected: offered, reason: '', loading: true, busy: false, error: '' });
    try {
      const data = await listAvailability();
      const rows = Array.isArray(data) ? data : data?.items || [];
      const mode = booking.deliveryMode || 'online';
      const minStart = Date.now() + RESCHEDULE_MIN_HOURS * 3600000;
      const slots = rows
        .filter(
          (s) =>
            !s.isBooked &&
            !s.clashesWithBooking &&
            (s.deliveryMode || 'online') === mode &&
            new Date(s.startAt).getTime() >= minStart
        )
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
      const ids = new Set(slots.map((s) => String(s._id)));
      setReschedule((r) =>
        r && String(r.booking._id) === String(booking._id)
          ? { ...r, slots, selected: r.selected.filter((id) => ids.has(id)), loading: false }
          : r
      );
    } catch (err) {
      setReschedule((r) => (r ? { ...r, loading: false, error: errorMessage(err) } : r));
    }
  };

  const sendReschedule = async (slotIds) => {
    const r = reschedule;
    if (!r) return;
    setReschedule((x) => ({ ...x, busy: true, error: '' }));
    try {
      await offerRescheduleSlots(r.booking._id, slotIds, { reason: r.reason });
      setReschedule(null);
      setMsg(
        slotIds.length
          ? 'Slots sent. The student must confirm one in the app.'
          : 'No slot offered. The student may keep the original time or request a replacement tutor.'
      );
      reloadAll();
    } catch (err) {
      setReschedule((x) => (x ? { ...x, busy: false, error: errorMessage(err) } : x));
    }
  };

  const incomingReplacements = changes.filter(
    (c) => c.status === 'awaiting_approval' && idOf(c.replacementTutorUserId) === me
  );
  const incomingPending = changes.filter((c) => c.status === 'pending' && idOf(c.tutorUserId) === me);

  const serverPaged = view === 'list' && tab !== 'to_report';
  const reportQueue = useMemo(() => reportItems.filter(needsReport), [reportItems]);
  const source = view === 'list' && tab === 'to_report' ? reportQueue : items;

  const visible = useMemo(
    () => (modeFilter === 'all' ? source : source.filter((b) => (b.deliveryMode || 'online') === modeFilter)),
    [source, modeFilter]
  );

  const list = useListFilter(
    visible,
    (b) =>
      [studentName(b), b.subjectId?.name, b.status, b.deliveryMode, b.meetingStatus].filter(Boolean).join(' '),
    { resetKey: `${tab}-${modeFilter}-${page}`, pageSize: serverPaged ? 1000 : 12 }
  );

  const events = useMemo(
    () =>
      list.filtered.map((b) => ({
        id: b._id,
        start: b.startAt,
        title: `${b.refCode || ''} ${studentName(b)} · ${b.subjectId?.name || ''} · ${b.status || ''}`.trim(),
        variant: eventVariant(b),
        booking: b,
      })),
    [list.filtered]
  );

  const askCancel = (b) =>
    setConfirm({
      title: 'Cancel booking',
      message: `Cancel ${studentName(b)} · ${b.subjectId?.name || 'lesson'} on ${localTime(
        b.startAt
      )}? The student keeps this session and this does not use their monthly reschedule.`,
      confirmLabel: 'Cancel class',
      danger: true,
      run: async () => {
        await cancelBooking(b._id);
        setSelectedId('');
        setMsg('Booking cancelled');
        reloadAll();
      },
    });

  const askNoShow = (b) =>
    setConfirm({
      title: 'Record no-show',
      message: `Record that ${studentName(b)} did not attend? The class is closed as consumed and parents are notified.`,
      confirmLabel: 'Record no-show',
      danger: true,
      run: async () => {
        await cancelBooking(b._id, { noShow: true });
        setMsg('No-show recorded');
        refreshSelected();
      },
    });

  const changeAttendance = (b, value) => {
    if (value === (b.attendance || 'pending')) return;
    const apply = async () => {
      await setAttendance(b._id, value);
      setMsg('Attendance updated');
      refreshSelected();
    };
    if (value === 'absent') {
      setConfirm({
        title: 'Mark absent',
        message: `Mark ${studentName(b)} absent? Parents are alerted straight away.`,
        confirmLabel: 'Mark absent',
        danger: true,
        run: apply,
      });
      return;
    }
    setActionBusy(true);
    apply()
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setActionBusy(false));
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
    } catch (err) {
      setError(errorMessage(err));
      setConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const join = async (b) => {
    try {
      const j = await joinBooking(b._id);
      if (j.deliveryMode === 'offline') {
        setDoorPhoto(null);
        setPlacePhoto(null);
        setDoorstep({ booking: b, join: j });
        return;
      }
      setJoinTools(j);
      refreshSelected();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const closeDoorstep = () => {
    setDoorstep(null);
    setDoorPhoto(null);
    setPlacePhoto(null);
  };

  const uploadDoorstep = async () => {
    if (!doorstep || !doorPhoto) return;
    setDoorBusy(true);
    try {
      const fd = new FormData();
      fd.append('photo', doorPhoto);
      if (placePhoto) fd.append('place', placePhoto);
      await doorstepCheckIn(doorstep.booking._id, fd);
      setMsg('Check-in saved. You can complete the class once it has started.');
      closeDoorstep();
      refreshSelected();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the check-in'));
    } finally {
      setDoorBusy(false);
    }
  };

  const openWizard = (mode) => {
    setReportForm(reportFromDoc(detail.summary?.report));
    setAssignForm(emptyAssignment());
    setAssign(false);
    setWizardError('');
    setWizard({ mode, step: 1 });
  };

  const goToHomeworkStep = () => {
    setWizardError('');
    setWizard((w) => ({ ...w, step: 2 }));
  };

  const finishWizard = async () => {
    if (!selected) return;
    setWizardError('');
    if (wizard.mode === 'complete' && assign) {
      const problem = validateAssignment(assignForm);
      if (problem) {
        setWizardError(problem);
        return;
      }
    }
    setBusy(true);
    try {
      if (wizard.mode === 'report') {
        await saveSessionReport(selected._id, reportPayload(reportForm));
        setMsg('Session report saved');
      } else {
        if (assign) {
          const fd = new FormData();
          fd.append('report', JSON.stringify(reportPayload(reportForm)));
          fd.append(
            'assignment',
            JSON.stringify({
              title: assignForm.title.trim(),
              description: assignForm.description,
              deadline: new Date(assignForm.deadline).toISOString(),
              gradingScheme: assignForm.gradingScheme,
              rubric: assignForm.rubric || '',
              ...(assignForm.gradingScheme === 'marks' ? { maxScore: Number(assignForm.maxScore) } : {}),
            })
          );
          assignForm.files.forEach((f) => fd.append('attachments', f));
          await completeBooking(selected._id, fd);
        } else {
          await completeBooking(selected._id, { report: reportPayload(reportForm) });
        }
        setMsg(assign ? 'Session completed and homework assigned' : 'Session completed');
      }
      setWizard(null);
      refreshSelected();
    } catch (err) {
      setWizardError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const summary = detail.summary;
  const report = summary?.report;
  const insights = detail.insights;
  const previousReport =
    insights?.recentReports?.find((r) => String(r.bookingId) !== String(selected?._id)) || null;
  const nowMs = Date.now();
  const started = selected ? new Date(selected.startAt).getTime() <= nowMs : false;
  const active = Boolean(selected && canChangeBooking(selected));
  const liveOpen = selected
    ? nowMs >= new Date(selected.startAt).getTime() - LIVE_EARLY_MINUTES * 60000
    : false;
  const needsCheckIn = selected?.deliveryMode === 'offline' && !selected?.doorstep?.checkedInAt;
  const canComplete = active && started;
  const selectedChange = selected ? openChangeFor(selected._id) : null;
  const classFiles = selected?.classHistory || [];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tabEmpty =
    tab === 'upcoming'
      ? 'No upcoming bookings.'
      : tab === 'to_report'
        ? 'Nothing waiting for a summary.'
        : 'No bookings in this view.';

  const statusLine = (b) =>
    b.meetingStatus && b.meetingStatus !== 'scheduled' ? b.meetingStatus.replace('_', ' ') : '';

  const rowActions = (b) =>
    canChangeBooking(b)
      ? [
          { label: 'Open details', icon: 'eye', onClick: () => openBooking(b) },
          { label: 'Reschedule', icon: 'calendar', onClick: () => openReschedule(b) },
          { label: 'Cancel class', icon: 'x-circle', danger: true, onClick: () => askCancel(b) },
        ]
      : [{ label: 'Open details', icon: 'eye', onClick: () => openBooking(b) }];

  const reportCell = (b) =>
    b.sessionReportId ? (
      <span className="tutor-inline-ok">
        <Icon name="check-circle" size={14} /> Written
      </span>
    ) : needsReport(b) ? (
      <ErpBadge tone="warning" dot>
        Due
      </ErpBadge>
    ) : (
      <span className="muted">—</span>
    );

  const paymentCell = (b) => (
    <span className="tutor-pay">
      <span className="num">{money(b.amount, b.currency)}</span>
      {b.payment?.status ? (
        <ErpStatusBadge status={b.payment.status}>{b.payment.status.replaceAll('_', ' ')}</ErpStatusBadge>
      ) : null}
    </span>
  );

  const modeChip = (b) => (
    <span className={`erp-chip ${b.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'}`}>
      <Icon name={b.deliveryMode === 'offline' ? 'map-pin' : 'video'} size={12} />
      {b.deliveryMode === 'offline' ? 'Offline' : 'Online'}
    </span>
  );

  const requestCount = incomingPending.length + incomingReplacements.length;
  const selectedPayment = selected ? summary?.payment || selected.payment : null;
  const tabs = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'to_report', label: 'To report', count: reportQueue.length || null },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
  ];

  const footerMenu = selected
    ? [
        active && { label: 'Reschedule', icon: 'calendar', onClick: () => openReschedule(selected) },
        active &&
          started && { label: 'Record no-show', icon: 'alert-triangle', danger: true, onClick: () => askNoShow(selected) },
        active && { label: 'Cancel class', icon: 'x-circle', danger: true, onClick: () => askCancel(selected) },
      ].filter(Boolean)
    : [];

  const runAction = async (fn, okMsg) => {
    setActionBusy(true);
    try {
      await fn();
      setMsg(okMsg);
      reloadAll();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        subtitle="Run each class from here: open class tools, mark attendance, then write the session summary."
        actions={
          <ErpButton variant="secondary" icon="refresh" onClick={reloadAll} disabled={loading}>
            Refresh
          </ErpButton>
        }
      />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}

      {requestCount > 0 && (
        <ErpCard
          heading="Requests from students"
          description="A class is not moved until the student confirms in the app."
          headerActions={<ErpBadge tone="warning">{requestCount} open</ErpBadge>}
        >
          <ErpAttentionList>
            {incomingPending.map((c) => (
              <ErpAttentionItem
                key={c._id}
                icon="calendar"
                tone="warning"
                title={`${c.studentUserId?.name || 'Student'} asked to reschedule`}
                meta={`${c.bookingId?.subjectId?.name || 'Class'} · ${localTime(c.bookingId?.startAt)}${
                  c.reason ? ` · “${c.reason}”` : ''
                }`}
                action={
                  <ErpButton
                    size="sm"
                    onClick={() =>
                      openReschedule({
                        ...(c.bookingId && typeof c.bookingId === 'object' ? c.bookingId : { _id: c.bookingId }),
                        studentUserId: c.studentUserId,
                      })
                    }
                  >
                    Offer slots
                  </ErpButton>
                }
              />
            ))}
            {incomingReplacements.map((c) => (
              <ErpAttentionItem
                key={c._id}
                icon="users"
                tone="info"
                title={`${c.studentUserId?.name || 'Student'} wants to move a paid class to you`}
                meta={`${c.bookingId?.subjectId?.name || 'Class'} · ${localTime(c.bookingId?.startAt)} · no extra payment`}
                action={
                  <span className="row" style={{ gap: '0.5rem' }}>
                    <ErpButton
                      variant="secondary"
                      size="sm"
                      disabled={actionBusy}
                      onClick={() =>
                        runAction(
                          () => declineReschedule(idOf(c.bookingId)),
                          'Request declined. Original class stays with the assigned tutor.'
                        )
                      }
                    >
                      Decline
                    </ErpButton>
                    <ErpButton
                      size="sm"
                      disabled={actionBusy}
                      onClick={() =>
                        runAction(
                          () => approveReplacementTutor(idOf(c.bookingId)),
                          'You are now the assigned tutor. No extra payment.'
                        )
                      }
                    >
                      Approve
                    </ErpButton>
                  </span>
                }
              />
            ))}
          </ErpAttentionList>
        </ErpCard>
      )}

      <div className="erp-filter-bar tutor-toolbar">
        <div className="tutor-toolbar-left">
          {view === 'list' ? <ErpTabs variant="segmented" value={tab} onChange={changeTab} tabs={tabs} /> : null}
          <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search student or subject" />
        </div>
        <div className="tutor-toolbar-right">
          <ErpSelect
            inline
            aria-label="Delivery mode"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All modes' },
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
            ]}
          />
          <ErpSegmented
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List', icon: 'list-checks' },
              { value: 'calendar', label: 'Calendar', icon: 'calendar' },
            ]}
          />
        </div>
      </div>

      {view === 'calendar' ? (
        <ErpCard>
          <ErpCalendar
            events={events}
            loading={loading}
            date={calDate}
            onDateChange={setCalDate}
            emptyMessage={list.noMatch ? 'No bookings match that search.' : 'No bookings in this period.'}
            onEventClick={(e) => openBooking(e.booking)}
            onRangeChange={(from, to) =>
              setRange((r) =>
                r && r.from.getTime() === from.getTime() && r.to.getTime() === to.getTime() ? r : { from, to }
              )
            }
          />
        </ErpCard>
      ) : (
        <ErpCard flush>
          {loading && !list.items.length ? (
            <ErpLoadingState message="Loading bookings…" />
          ) : !visible.length ? (
            <ErpEmptyState
              icon={tab === 'to_report' ? 'check-circle' : 'calendar'}
              title={tabEmpty}
              description={
                modeFilter !== 'all'
                  ? 'Try another delivery mode.'
                  : tab === 'upcoming'
                    ? 'Open more availability so students can book you.'
                    : tab === 'to_report'
                      ? 'Every past class has its summary.'
                      : undefined
              }
              action={
                tab === 'upcoming' && modeFilter === 'all' ? (
                  <Link to="/tutor/availability" className="erp-btn-primary">
                    Manage availability
                  </Link>
                ) : null
              }
            />
          ) : list.noMatch ? (
            <ErpEmptyState
              icon="search"
              title="No bookings match that search"
              action={
                <ErpButton variant="secondary" onClick={() => list.setSearch('')}>
                  Clear search
                </ErpButton>
              }
            />
          ) : phone ? (
            <ul className="tutor-booking-cards">
              {list.items.map((b) => (
                <li key={b._id} className="tutor-booking-card">
                  <button type="button" className="tutor-booking-card-hit" onClick={() => openBooking(b)}>
                    <ErpAvatar name={studentName(b)} size="sm" />
                    <span className="tutor-booking-card-main">
                      <span className="tutor-booking-card-top">
                        <strong>{studentName(b)}</strong>
                        <ErpStatusBadge status={b.status} dot>
                          {b.status}
                        </ErpStatusBadge>
                      </span>
                      <span className="muted">
                        {b.subjectId?.name || 'Lesson'} · {localTime(b.startAt)}
                      </span>
                      <span className="tutor-chips">
                        {modeChip(b)}
                        {paymentCell(b)}
                        {needsReport(b) && !b.sessionReportId ? (
                          <ErpBadge tone="warning" dot>
                            Summary due
                          </ErpBadge>
                        ) : null}
                        {statusLine(b) ? <span className="muted text-erp-xs">Class {statusLine(b)}</span> : null}
                      </span>
                    </span>
                  </button>
                  <TutorRowMenu items={rowActions(b)} label={`Actions for ${studentName(b)}`} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable className="tutor-bookings-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>When (your time)</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Summary</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((b) => (
                    <tr key={b._id} className="erp-row-click" onClick={() => openBooking(b)}>
                      <td>
                        <span className="tutor-cell-person">
                          <ErpAvatar name={studentName(b)} size="sm" />
                          <span className="tutor-cell-stack">
                            <strong>{studentName(b)}</strong>
                            {b.refCode ? <span className="muted text-erp-xs">{b.refCode}</span> : null}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="tutor-cell-stack">
                          <span>{b.subjectId?.name || '—'}</span>
                          {modeChip(b)}
                        </span>
                      </td>
                      <td className="erp-tabular">{localTime(b.startAt)}</td>
                      <td>
                        <span className="tutor-cell-stack">
                          <ErpStatusBadge status={b.status} dot>
                            {b.status}
                          </ErpStatusBadge>
                          {statusLine(b) ? <span className="muted text-erp-xs">Class {statusLine(b)}</span> : null}
                        </span>
                      </td>
                      <td>{paymentCell(b)}</td>
                      <td>{reportCell(b)}</td>
                      <td className="tutor-cell-actions">
                        <TutorRowMenu items={rowActions(b)} label={`Actions for ${studentName(b)}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
          {serverPaged
            ? total > 0 && (
                <ErpPager
                  page={page}
                  pages={pages}
                  total={total}
                  noun="booking"
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(pages, p + 1))}
                />
              )
            : list.total > 0 && <ErpPager {...list.pagerProps} noun="booking" />}
        </ErpCard>
      )}

      <ErpDrawer
        open={Boolean(selectedId)}
        title={selected ? selected.subjectId?.name || 'Session' : 'Booking'}
        onClose={() => {
          setSelectedId('');
          setDetail({ summary: null, chain: null, insights: null, loading: false });
        }}
        footer={
          selected ? (
            <div className="tutor-drawer-footer">
              <TutorRowMenu items={footerMenu} label="More booking actions" variant="secondary" size="md" align="start" />
              <span className="tutor-drawer-footer-main">
                {selected.status !== 'cancelled' && (
                  <ErpButton variant="secondary" icon="pencil" onClick={() => openWizard('report')}>
                    {report ? 'Edit summary' : 'Write summary'}
                  </ErpButton>
                )}
                {active && (
                  <ErpButton
                    variant={canComplete ? 'secondary' : 'primary'}
                    icon={selected.deliveryMode === 'offline' ? 'map-pin' : 'video'}
                    onClick={() => join(selected)}
                  >
                    {selected.deliveryMode === 'offline' ? 'Check in' : 'Class tools'}
                  </ErpButton>
                )}
                {canComplete && (
                  <ErpButton
                    icon="check"
                    disabled={needsCheckIn}
                    title={needsCheckIn ? 'Check in at the door first' : undefined}
                    onClick={() => openWizard('complete')}
                  >
                    Complete
                  </ErpButton>
                )}
              </span>
            </div>
          ) : null
        }
      >
        {!selected ? (
          detail.loading ? (
            <ErpLoadingState message="Loading booking…" />
          ) : null
        ) : (
          <>
            <div className="tutor-drawer-head">
              <ErpAvatar name={studentName(selected)} size="lg" />
              <div className="tutor-drawer-head-text">
                <strong>{studentName(selected)}</strong>
                <span className="muted">
                  {localTime(selected.startAt)}
                  {selected.refCode ? ` · ${selected.refCode}` : ''}
                </span>
                <span className="tutor-chips">
                  <ErpStatusBadge status={selected.status} dot>
                    {selected.status}
                  </ErpStatusBadge>
                  <ErpStatusBadge status={selected.meetingStatus === 'ended' ? 'completed' : selected.meetingStatus}>
                    Class {(selected.meetingStatus || 'scheduled').replace('_', ' ')}
                  </ErpStatusBadge>
                  {modeChip(selected)}
                  {selected.consumed ? <ErpBadge>consumed</ErpBadge> : null}
                </span>
              </div>
            </div>

            {selectedChange && (
              <ErpBanner variant="warning" icon="calendar" title="Reschedule in progress">
                {CHANGE_STATUS_LABEL[selectedChange.status] || selectedChange.status}
              </ErpBanner>
            )}
            {canComplete && needsCheckIn && (
              <ErpBanner variant="info" icon="map-pin" title="Check in at the door first">
                Open “Check in” and upload a door photo to enable Complete.
              </ErpBanner>
            )}

            <section className="erp-drawer-section">
              <h4>Session</h4>
              <dl className="erp-detail-grid">
                <dt>Your time</dt>
                <dd>{localTime(selected.startAt)}</dd>
                <dt>Student time</dt>
                <dd>
                  {formatInZone(selected.startAt, selected.timezone)}{' '}
                  <span className="muted">({selected.timezone})</span>
                </dd>
                <dt>Mode</dt>
                <dd>{selected.deliveryMode === 'offline' ? 'Offline (at the student’s place)' : 'Online (Zoom)'}</dd>
                {selected.zoom?.meetingId && (
                  <>
                    <dt>Zoom</dt>
                    <dd className="num">
                      ID {selected.zoom.meetingId}
                      {selected.zoom.password ? ` · passcode ${selected.zoom.password}` : ''}
                      {selected.zoom.provider === 'demo' ? ' · demo link' : ''}
                    </dd>
                  </>
                )}
                {selected.deliveryMode === 'offline' && (
                  <>
                    <dt>Check-in</dt>
                    <dd>
                      {selected.doorstep?.checkedInAt
                        ? `Checked in ${localTime(selected.doorstep.checkedInAt)}${
                            selected.doorstep.confirmedAt
                              ? ` · student confirmed ${localTime(selected.doorstep.confirmedAt)}`
                              : ''
                          }`
                        : 'Not checked in yet'}
                    </dd>
                  </>
                )}
                <dt>Amount</dt>
                <dd className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="num">{money(selected.amount, selected.currency)}</span>
                  {selectedPayment && (
                    <ErpStatusBadge status={selectedPayment.status}>
                      {String(selectedPayment.status).replaceAll('_', ' ')}
                    </ErpStatusBadge>
                  )}
                </dd>
              </dl>
            </section>

            {selected.status !== 'cancelled' && (
              <section className="erp-drawer-section">
                <h4>In class</h4>
                {started ? (
                  <ErpSelect
                    label="Attendance"
                    value={selected.attendance || 'pending'}
                    options={ATTENDANCE_OPTIONS}
                    disabled={actionBusy}
                    onChange={(e) => changeAttendance(selected, e.target.value)}
                  />
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    Attendance can be marked once the class starts.
                  </p>
                )}
                {active && liveOpen && selected.meetingStatus !== 'live' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <ErpButton
                      variant="secondary"
                      size="sm"
                      icon="video"
                      disabled={actionBusy}
                      onClick={async () => {
                        setActionBusy(true);
                        try {
                          await setMeetingStatus(selected._id, 'live');
                          refreshSelected();
                        } catch (err) {
                          setError(errorMessage(err));
                        } finally {
                          setActionBusy(false);
                        }
                      }}
                    >
                      Mark class live
                    </ErpButton>
                  </div>
                )}
              </section>
            )}

            {detail.loading && <ErpSkeleton lines={3} />}

            <section className="erp-drawer-section">
              <h4 className="tutor-section-head">
                This session’s summary
                {selected.status !== 'cancelled' && (
                  <button type="button" className="erp-link tutor-link-btn" onClick={() => openWizard('report')}>
                    {report ? 'Edit' : 'Write'}
                  </button>
                )}
              </h4>
              {report ? (
                <dl className="erp-detail-grid">
                  {report.summary && (
                    <>
                      <dt>Summary</dt>
                      <dd>{report.summary}</dd>
                    </>
                  )}
                  {report.topicsCovered?.length > 0 && (
                    <>
                      <dt>Topics</dt>
                      <dd>{report.topicsCovered.join(', ')}</dd>
                    </>
                  )}
                  {report.strengths && (
                    <>
                      <dt>Strengths</dt>
                      <dd>{report.strengths}</dd>
                    </>
                  )}
                  {report.weaknesses && (
                    <>
                      <dt>Needs work</dt>
                      <dd>{report.weaknesses}</dd>
                    </>
                  )}
                  {report.understandingRating && (
                    <>
                      <dt>Understanding</dt>
                      <dd>{report.understandingRating}/5</dd>
                    </>
                  )}
                  {report.nextSteps && (
                    <>
                      <dt>Next</dt>
                      <dd>{report.nextSteps}</dd>
                    </>
                  )}
                </dl>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  Not written yet.
                </p>
              )}
            </section>

            {insights && (
              <section className="erp-drawer-section">
                <h4>About {studentName(selected)}</h4>
                <div className="tutor-insight-stats">
                  <span>
                    <span className="muted text-erp-xs">Avg understanding</span>
                    <strong className="num">{insights.averageUnderstanding ?? '—'}/5</strong>
                  </span>
                  <span>
                    <span className="muted text-erp-xs">Trend</span>
                    <ErpStatusBadge
                      status={
                        insights.trend === 'improving'
                          ? 'approved'
                          : insights.trend === 'declining'
                            ? 'rejected'
                            : 'pending'
                      }
                    >
                      {insights.trend}
                    </ErpStatusBadge>
                  </span>
                  <span>
                    <span className="muted text-erp-xs">Homework pending</span>
                    <strong className="num">{insights.pendingHomework}</strong>
                  </span>
                </div>
                {insights.topTopics?.length > 0 && (
                  <p className="muted text-erp-sm" style={{ margin: '0.75rem 0 0' }}>
                    Topics so far: {insights.topTopics.map((t) => t.topic).join(', ')}
                  </p>
                )}
                {insights.recentGrades?.length > 0 && (
                  <p className="muted text-erp-sm" style={{ margin: '0.25rem 0 0' }}>
                    Recent grades: {insights.recentGrades.map((g) => gradeLabel(g.grade)).join(', ')}
                  </p>
                )}
                {previousReport ? (
                  <div className="tutor-prev-report">
                    <span className="erp-overline">Last session · {formatDate(previousReport.createdAt)}</span>
                    {previousReport.summary && <p>{previousReport.summary}</p>}
                    {previousReport.weaknesses && (
                      <p>
                        <strong>Needs work:</strong> {previousReport.weaknesses}
                      </p>
                    )}
                    {previousReport.nextSteps && (
                      <p>
                        <strong>Planned next:</strong> {previousReport.nextSteps}
                      </p>
                    )}
                    {previousReport.privateNotes && <p className="muted">Private: {previousReport.privateNotes}</p>}
                  </div>
                ) : (
                  <p className="muted text-erp-sm" style={{ margin: '0.75rem 0 0' }}>
                    No earlier session reports yet.
                  </p>
                )}
              </section>
            )}

            <section className="erp-drawer-section">
              <h4 className="tutor-section-head">
                Homework from this session
                {selected.status === 'completed' && !selected.consumed && (
                  <Link className="erp-link tutor-link-btn" to={`/tutor/homework/new?bookingId=${selected._id}`}>
                    Assign
                  </Link>
                )}
              </h4>
              {!summary?.assignments?.length ? (
                <p className="muted" style={{ margin: 0 }}>
                  None assigned.
                </p>
              ) : (
                <ul className="erp-divided tutor-plain-list">
                  {summary.assignments.map((a) => (
                    <li key={a._id} className="tutor-file-row">
                      <span className="tutor-mini-main">
                        <strong>{a.title}</strong>
                        <span className="muted">due {localTime(a.deadline)}</span>
                        {(a.attachments || []).length > 0 && (
                          <span className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                            {a.attachments.map((f) => (
                              <a
                                key={f.url}
                                className="erp-link text-erp-sm"
                                href={mediaUrl(f.url)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {f.name || 'file'}
                              </a>
                            ))}
                          </span>
                        )}
                      </span>
                      <ErpStatusBadge status={a.status}>{a.status}</ErpStatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {selected.status !== 'cancelled' && (
              <section className="erp-drawer-section">
                <h4>Class files</h4>
                {classFiles.length ? (
                  <ul className="erp-divided tutor-plain-list" style={{ marginBottom: '0.75rem' }}>
                    {classFiles.map((f, idx) => (
                      <li key={f.url || idx} className="tutor-file-row">
                        <a className="erp-link tutor-file-link" href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                          <Icon name="file-text" size={14} />
                          {f.label || f.name || 'Class file'}
                        </a>
                        {f.at ? <span className="muted text-erp-xs">{localTime(f.at)}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted" style={{ marginTop: 0 }}>
                    No files shared yet.
                  </p>
                )}
                <ClassFileUpload
                  key={selected._id}
                  bookingId={selected._id}
                  onSaved={() => {
                    setMsg('Class file saved');
                    refreshSelected();
                  }}
                  onError={setError}
                />
              </section>
            )}

            {detail.chain && (
              <section className="erp-drawer-section">
                <h4>
                  Booking chain · {detail.chain.completed}/{detail.chain.total} completed
                </h4>
                <ul className="erp-timeline">
                  {detail.chain.items.map((item) => (
                    <li
                      key={item.booking._id}
                      className={
                        item.isCurrent
                          ? 'erp-timeline-current'
                          : item.booking.status === 'completed'
                            ? 'erp-timeline-done'
                            : ''
                      }
                    >
                      <button type="button" className="erp-link tutor-link-btn" onClick={() => openBooking(item.booking)}>
                        #{item.index} · {localTime(item.booking.startAt)}
                      </button>{' '}
                      <ErpStatusBadge status={item.booking.status}>{item.booking.status}</ErpStatusBadge>
                      {item.report?.summary && <div className="muted">{item.report.summary}</div>}
                      {item.assignments.length > 0 && (
                        <div className="muted">
                          Homework: {item.assignments.map((a) => `${a.title} (${a.status})`).join(', ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </ErpDrawer>

      <ErpModal
        open={Boolean(wizard)}
        size="lg"
        title={wizard?.mode === 'complete' ? 'Complete session' : 'Session summary'}
        onClose={() => !busy && setWizard(null)}
        footer={
          wizard ? (
            <>
              <ErpButton variant="secondary" disabled={busy} onClick={() => setWizard(null)}>
                Cancel
              </ErpButton>
              {wizard.mode === 'complete' && wizard.step === 2 && (
                <ErpButton
                  variant="secondary"
                  icon="arrow-left"
                  disabled={busy}
                  onClick={() => {
                    setWizardError('');
                    setWizard((w) => ({ ...w, step: 1 }));
                  }}
                >
                  Back
                </ErpButton>
              )}
              {wizard.mode === 'complete' && wizard.step === 1 ? (
                <ErpButton iconRight="arrow-right" onClick={goToHomeworkStep}>
                  Next: homework
                </ErpButton>
              ) : (
                <ErpButton loading={busy} onClick={finishWizard}>
                  {busy ? 'Saving…' : wizard.mode === 'complete' ? 'Complete session' : 'Save summary'}
                </ErpButton>
              )}
            </>
          ) : null
        }
      >
        {selected && wizard ? (
          <p className="muted" style={{ margin: '0 0 1rem' }}>
            {studentName(selected)} · {selected.subjectId?.name || 'Lesson'} · {localTime(selected.startAt)}
          </p>
        ) : null}
        {wizardError && (
          <ErpBanner variant="danger" className="tutor-mb">
            {wizardError}
          </ErpBanner>
        )}
        {wizard?.mode === 'complete' && (
          <ol className="tutor-stepper" aria-label="Steps">
            <li className={wizard.step === 1 ? 'is-active' : 'is-done'}>
              <span className="tutor-stepper-dot">{wizard.step > 1 ? <Icon name="check" size={12} /> : 1}</span>
              What happened
            </li>
            <li className={wizard.step === 2 ? 'is-active' : ''}>
              <span className="tutor-stepper-dot">2</span>
              Homework
            </li>
          </ol>
        )}
        {wizard && (wizard.mode === 'report' || wizard.step === 1) && (
          <ReportFields form={reportForm} setForm={setReportForm} />
        )}
        {wizard?.mode === 'complete' && wizard.step === 2 && (
          <div className="stack">
            <ErpSegmented
              aria-label="Homework"
              value={assign ? 'yes' : 'no'}
              onChange={(v) => setAssign(v === 'yes')}
              options={[
                { value: 'no', label: 'No homework this time' },
                { value: 'yes', label: 'Assign homework', icon: 'plus' },
              ]}
            />
            {assign ? (
              <AssignmentFields form={assignForm} setForm={setAssignForm} />
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                You can still assign homework later from the Homework page.
              </p>
            )}
          </div>
        )}
      </ErpModal>

      <ErpConfirm
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        danger={Boolean(confirm?.danger)}
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirm(null)}
        onConfirm={runConfirm}
      />

      <ErpModal
        open={Boolean(reschedule)}
        title="Reschedule class"
        onClose={() => !reschedule?.busy && setReschedule(null)}
        footer={
          reschedule ? (
            <>
              {reschedule.change?.status === 'pending' && (
                <ErpButton
                  variant="ghost"
                  disabled={reschedule.busy}
                  onClick={async () => {
                    setReschedule((x) => ({ ...x, busy: true, error: '' }));
                    try {
                      await declineReschedule(reschedule.booking._id);
                      setReschedule(null);
                      setMsg('Original class time stays in place.');
                      reloadAll();
                    } catch (err) {
                      setReschedule((x) => (x ? { ...x, busy: false, error: errorMessage(err) } : x));
                    }
                  }}
                >
                  Keep original time
                </ErpButton>
              )}
              <ErpButton variant="secondary" disabled={reschedule.busy} onClick={() => setReschedule(null)}>
                Close
              </ErpButton>
              <ErpButton
                loading={reschedule.busy}
                disabled={reschedule.loading}
                onClick={() => {
                  if (reschedule.selected.length) {
                    sendReschedule(reschedule.selected);
                    return;
                  }
                  setConfirm({
                    title: 'No slot available',
                    message:
                      'Send “no slot available”? The student is told they may keep the original time or request a replacement tutor at no extra charge.',
                    confirmLabel: 'Send',
                    run: () => sendReschedule([]),
                  });
                }}
              >
                {reschedule.busy
                  ? 'Sending…'
                  : reschedule.selected.length
                    ? `Offer ${reschedule.selected.length} slot${reschedule.selected.length === 1 ? '' : 's'}`
                    : 'No slot available'}
              </ErpButton>
            </>
          ) : null
        }
      >
        {reschedule && (
          <div className="stack">
            {reschedule.error && <ErpBanner variant="danger">{reschedule.error}</ErpBanner>}
            <div className="tutor-summary-row">
              <ErpAvatar name={studentName(reschedule.booking)} size="sm" />
              <span className="tutor-mini-main">
                <strong>
                  {studentName(reschedule.booking)} · {reschedule.booking.subjectId?.name || 'Lesson'}
                </strong>
                <span className="muted">
                  {localTime(reschedule.booking.startAt)} ·{' '}
                  {reschedule.booking.deliveryMode === 'offline' ? 'Offline' : 'Online'}
                </span>
              </span>
            </div>
            {reschedule.change ? (
              <ErpBanner variant="warning" icon="calendar" title="Open change">
                {CHANGE_STATUS_LABEL[reschedule.change.status] || reschedule.change.status}
                {reschedule.change.reason ? <div>Reason: {reschedule.change.reason}</div> : null}
                {reschedule.change.offeredSlotIds?.length ? (
                  <div>
                    Offered:{' '}
                    {reschedule.change.offeredSlotIds
                      .map((s) => (typeof s === 'object' && s.startAt ? localTime(s.startAt) : null))
                      .filter(Boolean)
                      .join('; ') || `${reschedule.change.offeredSlotIds.length} slot(s)`}
                  </div>
                ) : null}
              </ErpBanner>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Tutor-initiated changes do not use the student’s monthly reschedule.
              </p>
            )}
            <div className="field">
              <span className="erp-label">Free slots at least {RESCHEDULE_MIN_HOURS} hours ahead (same mode)</span>
              {reschedule.loading ? (
                <ErpSkeleton lines={3} />
              ) : !reschedule.slots.length ? (
                <ErpEmptyState
                  icon="calendar"
                  title="No free slot"
                  description="Add availability and try again, or send “no slot available” so the student can request a replacement tutor."
                  action={
                    <Link to="/tutor/availability" className="erp-btn-secondary erp-btn-sm">
                      Open availability
                    </Link>
                  }
                />
              ) : (
                <div className="tutor-slot-pick">
                  {reschedule.slots.map((s) => {
                    const id = String(s._id);
                    const on = reschedule.selected.includes(id);
                    return (
                      <label key={id} className={`tutor-slot-option${on ? ' is-on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            setReschedule((r) => ({
                              ...r,
                              selected: e.target.checked ? [...r.selected, id] : r.selected.filter((x) => x !== id),
                            }))
                          }
                        />
                        <span className="erp-tabular">{slotRange(s)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <ErpTextarea
              label="Reason"
              helper="Shown to the student"
              rows={2}
              value={reschedule.reason}
              onChange={(e) => setReschedule((r) => ({ ...r, reason: e.target.value }))}
            />
          </div>
        )}
      </ErpModal>

      <ClassToolsModal open={Boolean(joinTools)} join={joinTools} onClose={() => setJoinTools(null)} />
      <ErpModal
        open={Boolean(doorstep)}
        title="Doorstep check-in"
        onClose={() => !doorBusy && closeDoorstep()}
        footer={
          <>
            <ErpButton variant="secondary" disabled={doorBusy} onClick={closeDoorstep}>
              Close
            </ErpButton>
            <ErpButton icon="upload" disabled={!doorPhoto} loading={doorBusy} onClick={uploadDoorstep}>
              {doorBusy ? 'Uploading…' : doorstep?.join?.doorstep?.checkedInAt ? 'Check in again' : 'Upload check-in'}
            </ErpButton>
          </>
        }
      >
        {doorstep && (
          <div className="stack">
            <div className="tutor-summary-row">
              <span className="erp-attention-icon is-brand">
                <Icon name="map-pin" size={16} />
              </span>
              <span className="tutor-mini-main">
                <strong>{addressLine(doorstep.join?.location) || 'Address on the booking / student profile'}</strong>
                {doorstep.join?.doorstep?.checkedInAt ? (
                  <span className="muted">
                    Checked in {localTime(doorstep.join.doorstep.checkedInAt)}
                    {doorstep.join.doorstep.confirmedAt
                      ? ` · student confirmed ${localTime(doorstep.join.doorstep.confirmedAt)}`
                      : ' · not confirmed by the student yet'}
                  </span>
                ) : null}
              </span>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Take a photo at the student’s door (required) and of the teaching place. Complete stays disabled until you
              check in. Student confirmation is optional.
            </p>
            <div className="field">
              <label className="erp-label" htmlFor="door-photo">
                Photo at the door
              </label>
              <div className="erp-file-drop">
                <input
                  id="door-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDoorPhoto(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="field">
              <label className="erp-label" htmlFor="place-photo">
                Place photo <span className="erp-label-optional">(optional)</span>
              </label>
              <div className="erp-file-drop">
                <input
                  id="place-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPlacePhoto(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="field">
              <span className="erp-label">
                Add a class file <span className="erp-label-optional">(optional)</span>
              </span>
              <ClassFileUpload
                bookingId={doorstep.booking._id}
                onSaved={() => {
                  setMsg('Class file saved');
                  refreshSelected();
                }}
                onError={setError}
              />
            </div>
          </div>
        )}
      </ErpModal>
    </div>
  );
}
