import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  cancelBooking,
  completeBooking,
  getBookingChain,
  getBookingSummary,
  getStudentInsights,
  joinBooking,
  listBookings,
  rescheduleBooking,
  saveSessionReport,
  setAttendance,
  setMeetingStatus,
} from '../../api';
import {
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpDrawer,
  ErpModal,
  ErpList,
  ErpListItem,
  ErpOverflow,
  ErpPageHeader,
  ErpPager,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate, formatInZone, money } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { gradeLabel, GRADING_SCHEME_OPTIONS } from '../../utils/grading';
import { ATTENDANCE_OPTIONS } from './tutorOptions';

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

function canChangeBooking(b) {
  return Boolean(b && b.status !== 'cancelled' && b.status !== 'completed');
}

function toLocalInput(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rescheduleDraft(booking) {
  return {
    booking,
    startAt: toLocalInput(booking.startAt),
    endAt: toLocalInput(booking.endAt),
  };
}

function ReportFields({ form, setForm }) {
  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  return (
    <div className="erp-form-grid">
      <div className="field erp-form-span">
        <label>Session summary</label>
        <textarea className="erp-search" value={form.summary} onChange={set('summary')} rows={3} />
      </div>
      <div className="field erp-form-span">
        <label>Topics covered (comma separated)</label>
        <input className="erp-search" value={form.topicsCovered} onChange={set('topicsCovered')} />
      </div>
      <div className="field">
        <label>Strengths</label>
        <textarea className="erp-search" value={form.strengths} onChange={set('strengths')} rows={2} />
      </div>
      <div className="field">
        <label>Needs work</label>
        <textarea className="erp-search" value={form.weaknesses} onChange={set('weaknesses')} rows={2} />
      </div>
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
      <div className="field">
        <label>Plan for next session</label>
        <input className="erp-search" value={form.nextSteps} onChange={set('nextSteps')} />
      </div>
      <div className="field erp-form-span">
        <label>Private notes (only you see these)</label>
        <textarea className="erp-search" value={form.privateNotes} onChange={set('privateNotes')} rows={2} />
      </div>
      <label className="row erp-form-span">
        <input type="checkbox" checked={Boolean(form.sharedWithParent)} onChange={set('sharedWithParent')} />
        Share summary with parents
      </label>
    </div>
  );
}

function AssignmentFields({ form, setForm }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <div className="erp-form-grid">
      <div className="field erp-form-span">
        <label>Title</label>
        <input className="erp-search" value={form.title} onChange={set('title')} required />
      </div>
      <div className="field erp-form-span">
        <label>Instructions</label>
        <textarea className="erp-search" value={form.description} onChange={set('description')} rows={3} />
      </div>
      <div className="field">
        <label>Due</label>
        <input className="erp-search" type="datetime-local" value={form.deadline} onChange={set('deadline')} />
      </div>
      <ErpSelect
        label="Grading"
        value={form.gradingScheme}
        options={GRADING_SCHEME_OPTIONS}
        onChange={set('gradingScheme')}
      />
      {form.gradingScheme === 'marks' && (
        <div className="field">
          <label>Total marks</label>
          <input className="erp-search" type="number" min="1" value={form.maxScore} onChange={set('maxScore')} />
        </div>
      )}
      <div className="field erp-form-span">
        <label>Attachments (worksheets, images, audio, video)</label>
        <input
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
          onChange={(e) => setForm((f) => ({ ...f, files: Array.from(e.target.files || []) }))}
        />
        {form.files.length > 0 && <div className="muted">{form.files.map((f) => f.name).join(', ')}</div>}
      </div>
    </div>
  );
}

export default function TutorBookings() {
  const phone = useIsPhone();
  const [params] = useSearchParams();
  const openedFromQuery = useRef(false);
  const [items, setItems] = useState([]);
  const [view, setView] = useState('list');
  const [tab, setTab] = useState('upcoming');
  const [modeFilter, setModeFilter] = useState('all');
  const [pendingCancel, setPendingCancel] = useState(null);
  const [reschedule, setReschedule] = useState(null);
  const [range, setRange] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState({ summary: null, chain: null, insights: null, loading: false });
  const [wizard, setWizard] = useState(null);
  const [reportForm, setReportForm] = useState({ ...EMPTY_REPORT });
  const [assignForm, setAssignForm] = useState(emptyAssignment());
  const [assign, setAssign] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params =
        view === 'calendar' && range
          ? { from: range.from.toISOString(), to: range.to.toISOString(), limit: 500 }
          : { limit: 200 };
      const d = await listBookings(params);
      setItems(d.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [view, range]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = items.find((b) => b._id === selectedId) || detail.summary?.booking || null;

  const loadDetail = useCallback(async (booking) => {
    setDetail({ summary: null, chain: null, insights: null, loading: true });
    try {
      const studentId = booking.studentUserId?._id || booking.studentUserId;
      const [summary, chain, insights] = await Promise.all([
        getBookingSummary(booking._id),
        getBookingChain(booking._id),
        getStudentInsights(studentId),
      ]);
      setDetail({ summary, chain, insights, loading: false });
    } catch (err) {
      setError(err.message);
      setDetail((d) => ({ ...d, loading: false }));
    }
  }, []);

  const openBooking = (booking) => {
    setSelectedId(booking._id);
    loadDetail(booking);
  };

  useEffect(() => {
    const id = params.get('id');
    if (!id || openedFromQuery.current || !items.length) return;
    const booking = items.find((b) => b._id === id);
    if (!booking) return;
    openedFromQuery.current = true;
    openBooking(booking);
  }, [params, items]);

  const refreshSelected = async () => {
    await load();
    if (selected) loadDetail(selected);
  };

  const modeItems = useMemo(
    () => (modeFilter === 'all' ? items : items.filter((b) => (b.deliveryMode || 'online') === modeFilter)),
    [items, modeFilter]
  );

  const visible = useMemo(() => {
    if (tab === 'upcoming') {
      const now = new Date();
      return modeItems.filter((b) => new Date(b.endAt) >= now && b.status !== 'cancelled' && b.status !== 'completed');
    }
    if (tab === 'to_report') {
      return modeItems.filter(
        (b) => b.status !== 'cancelled' && new Date(b.startAt) < new Date() && (b.status !== 'completed' || !b.sessionReportId)
      );
    }
    if (tab === 'completed') return modeItems.filter((b) => b.status === 'completed');
    return modeItems;
  }, [modeItems, tab]);

  const list = useListFilter(
    visible,
    (b) =>
      [studentName(b), b.subjectId?.name, b.status, b.deliveryMode, b.meetingStatus].filter(Boolean).join(' '),
    { resetKey: `${tab}-${modeFilter}` }
  );

  const toReportCount = useMemo(
    () =>
      items.filter(
        (b) => b.status !== 'cancelled' && new Date(b.startAt) < new Date() && (b.status !== 'completed' || !b.sessionReportId)
      ).length,
    [items]
  );

  const events = useMemo(
    () =>
      (list.filtered || visible).map((b) => ({
        id: b._id,
        start: b.startAt,
        title: `${studentName(b)} · ${b.subjectId?.name || ''}`,
        variant: eventVariant(b),
        booking: b,
      })),
    [list.filtered, visible]
  );

  const bookingActions = (b) =>
    canChangeBooking(b)
      ? [
          { label: 'Reschedule', onClick: () => setReschedule(rescheduleDraft(b)) },
          { label: 'Cancel', danger: true, onClick: () => setPendingCancel(b) },
        ]
      : [];

  const join = async (b) => {
    try {
      const j = await joinBooking(b._id);
      if (j.deliveryMode === 'offline') {
        const loc = j.location || {};
        window.alert(
          `Offline class: ${[loc.label, loc.address, loc.area, loc.city].filter(Boolean).join(', ') || 'See profile location'}`
        );
      } else if (j.meetingUrl) {
        window.open(j.meetingUrl, '_blank', 'noopener');
        refreshSelected();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const openWizard = (mode) => {
    setReportForm(reportFromDoc(detail.summary?.report));
    setAssignForm(emptyAssignment());
    setAssign(false);
    setWizard({ mode, step: 1 });
  };

  const finishWizard = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      if (wizard.mode === 'report') {
        await saveSessionReport(selected._id, reportPayload(reportForm));
        setMsg('Session report saved');
      } else {
        if (assign) {
          if (!assignForm.title) throw new Error('Give the assignment a title, or choose not to assign');
          const fd = new FormData();
          fd.append('report', JSON.stringify(reportPayload(reportForm)));
          fd.append(
            'assignment',
            JSON.stringify({
              title: assignForm.title,
              description: assignForm.description,
              deadline: new Date(assignForm.deadline).toISOString(),
              gradingScheme: assignForm.gradingScheme,
              rubric: assignForm.rubric || '',
              ...(assignForm.gradingScheme === 'marks' && assignForm.maxScore
                ? { maxScore: Number(assignForm.maxScore) }
                : {}),
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
      setError(err.errors?.length ? err.errors.map((x) => x.message).join(', ') : err.message);
    } finally {
      setBusy(false);
    }
  };

  const summary = detail.summary;
  const report = summary?.report;
  const insights = detail.insights;
  const previousReport =
    insights?.recentReports?.find((r) => String(r.bookingId) !== String(selected?._id)) || null;
  const canComplete =
    selected && selected.status !== 'completed' && selected.status !== 'cancelled' && new Date(selected.startAt) <= new Date();

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Join Zoom classes, record what happened, and assign homework after each session." />
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'to_report', label: `To report (${toReportCount})` },
            { value: 'completed', label: 'Completed' },
            { value: 'all', label: `All (${items.length})` },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search student or subject" />
        <ErpTabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
        <ErpTabs
          value={modeFilter}
          onChange={setModeFilter}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'online', label: 'Online' },
            { value: 'offline', label: 'Offline' },
          ]}
        />
        <div className="avail-bar-actions">
          <ErpButton variant="secondary" onClick={load}>
            Refresh
          </ErpButton>
        </div>
      </div>

      {view === 'calendar' ? (
        <ErpCard>
          {loading ? (
            <div className="empty">Loading bookings…</div>
          ) : !events.length ? (
            <div className="empty">No bookings in this view.</div>
          ) : (
            <ErpCalendar
              events={events}
              onEventClick={(e) => openBooking(e.booking)}
              onRangeChange={(from, to) => setRange({ from, to })}
            />
          )}
        </ErpCard>
      ) : (
        <>
          <ErpCard className="erp-card-flush">
            {loading ? (
              <div className="empty">Loading bookings…</div>
            ) : !visible.length ? (
              <div className="empty">No bookings in this view.</div>
            ) : list.noMatch ? (
              <div className="empty">No bookings match that search.</div>
            ) : phone ? (
              <div style={{ padding: '0.65rem' }}>
                <ErpList>
                  {list.items.map((b) => (
                    <ErpListItem
                      key={b._id}
                      title={studentName(b)}
                      meta={`${b.subjectId?.name || 'Lesson'} · ${formatInZone(b.startAt, b.timezone)}`}
                      status={b.status}
                      statusLabel={b.status}
                      leading={(studentName(b) || 'S').slice(0, 1)}
                      onClick={() => openBooking(b)}
                      actions={bookingActions(b).length ? <ErpOverflow items={bookingActions(b)} /> : null}
                    >
                      <div className="row" style={{ marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span
                          className={`erp-chip ${b.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'}`}
                        >
                          {b.deliveryMode === 'online' ? 'Zoom' : 'offline'}
                        </span>
                        <span className="muted">
                          {(b.meetingStatus || 'scheduled').replace('_', ' ')}
                          {b.sessionReportId ? ' · summary written' : ''}
                        </span>
                      </div>
                    </ErpListItem>
                  ))}
                </ErpList>
              </div>
            ) : (
              <div className="erp-table-scroll">
                <ErpDataTable>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Subject</th>
                      <th>When</th>
                      <th>Mode</th>
                      <th>Booking</th>
                      <th>Class</th>
                      <th>Summary</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {list.items.map((b) => (
                      <tr key={b._id} className="erp-row-click" onClick={() => openBooking(b)}>
                        <td>{studentName(b)}</td>
                        <td>{b.subjectId?.name || '—'}</td>
                        <td>{formatInZone(b.startAt, b.timezone)}</td>
                        <td>
                          <span
                            className={`erp-chip ${b.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'}`}
                          >
                            {b.deliveryMode === 'online' ? 'Zoom' : 'offline'}
                          </span>
                        </td>
                        <td>
                          <ErpStatusBadge status={b.status}>{b.status}</ErpStatusBadge>
                        </td>
                        <td>
                          <ErpStatusBadge status={b.meetingStatus === 'ended' ? 'completed' : b.meetingStatus}>
                            {(b.meetingStatus || 'scheduled').replace('_', ' ')}
                          </ErpStatusBadge>
                        </td>
                        <td>{b.sessionReportId ? 'Written' : <span className="muted">—</span>}</td>
                        <td className="row" onClick={(e) => e.stopPropagation()}>
                          {canChangeBooking(b) && (
                            <>
                              <ErpButton variant="secondary" onClick={() => setReschedule(rescheduleDraft(b))}>
                                Reschedule
                              </ErpButton>
                              <ErpButton variant="danger" onClick={() => setPendingCancel(b)}>
                                Cancel
                              </ErpButton>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ErpDataTable>
              </div>
            )}
            {list.total > 0 && <ErpPager {...list.pagerProps} noun="booking" />}
          </ErpCard>
        </>
      )}

      <ErpDrawer
        open={Boolean(selectedId)}
        title={selected ? `${studentName(selected)} · ${selected.subjectId?.name || 'Session'}` : 'Booking'}
        onClose={() => {
          setSelectedId('');
          setDetail({ summary: null, chain: null, insights: null, loading: false });
        }}
        footer={
          selected ? (
            <>
              {canChangeBooking(selected) && (
                <ErpButton variant="secondary" onClick={() => join(selected)}>
                  {selected.deliveryMode === 'offline' ? 'Location' : 'Start Zoom'}
                </ErpButton>
              )}
              {canChangeBooking(selected) && (
                <ErpButton variant="secondary" onClick={() => setReschedule(rescheduleDraft(selected))}>
                  Reschedule
                </ErpButton>
              )}
              {canChangeBooking(selected) && (
                <ErpButton variant="danger" onClick={() => setPendingCancel(selected)}>
                  Cancel
                </ErpButton>
              )}
              {selected.status !== 'cancelled' && (
                <ErpButton variant="secondary" onClick={() => openWizard('report')}>
                  {report ? 'Edit summary' : 'Write summary'}
                </ErpButton>
              )}
              {canComplete && <ErpButton onClick={() => openWizard('complete')}>Complete session</ErpButton>}
            </>
          ) : null
        }
      >
        {!selected ? null : (
          <>
            <section className="erp-drawer-section">
              <dl className="erp-detail-grid">
                <dt>When</dt>
                <dd>
                  {formatInZone(selected.startAt, selected.timezone)} ({selected.timezone})
                </dd>
                <dt>Your time</dt>
                <dd>{formatInZone(selected.startAt)}</dd>
                <dt>Mode</dt>
                <dd>{selected.deliveryMode === 'online' ? 'Online (Zoom)' : 'Offline'}</dd>
                <dt>Booking</dt>
                <dd>
                  <ErpStatusBadge status={selected.status}>{selected.status}</ErpStatusBadge>
                </dd>
                <dt>Class status</dt>
                <dd className="row" style={{ flexWrap: 'wrap' }}>
                  <ErpStatusBadge status={selected.meetingStatus === 'ended' ? 'completed' : selected.meetingStatus}>
                    {(selected.meetingStatus || 'scheduled').replace('_', ' ')}
                  </ErpStatusBadge>
                  {selected.status !== 'cancelled' && selected.status !== 'completed' && (
                    <>
                      <ErpButton
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await setMeetingStatus(selected._id, 'live');
                            refreshSelected();
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        Mark live
                      </ErpButton>
                      <ErpButton
                        variant="danger"
                        onClick={async () => {
                          try {
                            await setMeetingStatus(selected._id, 'no_show');
                            refreshSelected();
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        No-show
                      </ErpButton>
                    </>
                  )}
                </dd>
                {selected.zoom?.meetingId && (
                  <>
                    <dt>Zoom</dt>
                    <dd>
                      ID {selected.zoom.meetingId}
                      {selected.zoom.password ? ` · passcode ${selected.zoom.password}` : ''}
                      {selected.zoom.provider === 'demo' ? ' · demo link' : ''}
                    </dd>
                  </>
                )}
                <dt>Amount</dt>
                <dd>
                  {money(selected.amount, selected.currency)}
                  {summary?.payment && (
                    <>
                      {' '}
                      <ErpStatusBadge status={summary.payment.status}>{summary.payment.status}</ErpStatusBadge>
                    </>
                  )}
                </dd>
              </dl>
              <div style={{ marginTop: '0.5rem' }}>
                <ErpSelect
                  label="Attendance"
                  value={selected.attendance || 'pending'}
                  options={ATTENDANCE_OPTIONS}
                  onChange={async (e) => {
                    try {
                      await setAttendance(selected._id, e.target.value);
                      refreshSelected();
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                />
              </div>
            </section>

            {detail.loading && <div className="muted">Loading session history…</div>}

            {insights && (
              <section className="erp-drawer-section erp-card-sm">
                <h4>What you know about {studentName(selected)}</h4>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <span>
                    Avg understanding: <strong>{insights.averageUnderstanding ?? '—'}</strong>/5
                  </span>
                  <ErpStatusBadge
                    status={
                      insights.trend === 'improving' ? 'approved' : insights.trend === 'declining' ? 'rejected' : 'pending'
                    }
                  >
                    {insights.trend}
                  </ErpStatusBadge>
                  <span className="muted">{insights.pendingHomework} homework pending</span>
                </div>
                {insights.topTopics?.length > 0 && (
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    Topics so far: {insights.topTopics.map((t) => t.topic).join(', ')}
                  </p>
                )}
                {insights.recentGrades?.length > 0 && (
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    Recent grades: {insights.recentGrades.map((g) => gradeLabel(g.grade)).join(', ')}
                  </p>
                )}
                {previousReport ? (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Last session ({formatDate(previousReport.createdAt)})</strong>
                    {previousReport.summary && <p style={{ margin: '0.25rem 0' }}>{previousReport.summary}</p>}
                    {previousReport.weaknesses && (
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Needs work:</strong> {previousReport.weaknesses}
                      </p>
                    )}
                    {previousReport.nextSteps && (
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Planned next:</strong> {previousReport.nextSteps}
                      </p>
                    )}
                    {previousReport.privateNotes && (
                      <p className="muted" style={{ margin: '0.25rem 0' }}>
                        Private: {previousReport.privateNotes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    No earlier session reports yet.
                  </p>
                )}
              </section>
            )}

            <section className="erp-drawer-section">
              <h4>This session's summary</h4>
              {report ? (
                <div className="stack">
                  {report.summary && <p style={{ margin: 0 }}>{report.summary}</p>}
                  {report.topicsCovered?.length > 0 && (
                    <div className="muted">Topics: {report.topicsCovered.join(', ')}</div>
                  )}
                  {report.strengths && <div>Strengths: {report.strengths}</div>}
                  {report.weaknesses && <div>Needs work: {report.weaknesses}</div>}
                  {report.understandingRating && <div>Understanding: {report.understandingRating}/5</div>}
                  {report.nextSteps && <div>Next: {report.nextSteps}</div>}
                </div>
              ) : (
                <div className="muted">Not written yet.</div>
              )}
            </section>

            <section className="erp-drawer-section">
              <h4>Homework from this session</h4>
              {!summary?.assignments?.length ? (
                <div className="muted">
                  None.{' '}
                  {selected.status === 'completed' && (
                    <Link className="erp-link" to={`/tutor/homework/new?bookingId=${selected._id}`}>
                      Assign homework
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {summary.assignments.map((a) => (
                    <li key={a._id} className="row" style={{ flexWrap: 'wrap' }}>
                      <strong>{a.title}</strong>
                      <ErpStatusBadge status={a.status}>{a.status}</ErpStatusBadge>
                      <span className="muted">due {formatDate(a.deadline)}</span>
                      {(a.attachments || []).map((f) => (
                        <a key={f.url} className="erp-link" href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                          {f.name || 'file'}
                        </a>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {detail.chain && (
              <section className="erp-drawer-section">
                <h4>
                  Booking chain ({detail.chain.completed}/{detail.chain.total} completed)
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
                      <button
                        type="button"
                        className="erp-link"
                        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                        onClick={() => openBooking(item.booking)}
                      >
                        #{item.index} · {formatInZone(item.booking.startAt, item.booking.timezone)}
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
        onClose={() => setWizard(null)}
        footer={
          wizard ? (
            <>
              <ErpButton variant="secondary" onClick={() => setWizard(null)}>
                Cancel
              </ErpButton>
              {wizard.mode === 'complete' && wizard.step === 2 && (
                <ErpButton variant="secondary" onClick={() => setWizard((w) => ({ ...w, step: 1 }))}>
                  Back
                </ErpButton>
              )}
              {wizard.mode === 'complete' && wizard.step === 1 ? (
                <ErpButton onClick={() => setWizard((w) => ({ ...w, step: 2 }))}>Next: homework</ErpButton>
              ) : (
                <ErpButton disabled={busy} onClick={finishWizard}>
                  {busy ? 'Saving…' : wizard.mode === 'complete' ? 'Complete session' : 'Save summary'}
                </ErpButton>
              )}
            </>
          ) : null
        }
      >
        {wizard?.mode === 'complete' && (
          <div className="erp-steps">
            <div className={`erp-step${wizard.step === 1 ? ' erp-step-active' : ''}`}>1. What happened</div>
            <div className={`erp-step${wizard.step === 2 ? ' erp-step-active' : ''}`}>2. Homework</div>
          </div>
        )}
        {wizard && (wizard.mode === 'report' || wizard.step === 1) && (
          <ReportFields form={reportForm} setForm={setReportForm} />
        )}
        {wizard?.mode === 'complete' && wizard.step === 2 && (
          <div className="stack">
            <div className="row">
              <label className="row">
                <input type="radio" checked={!assign} onChange={() => setAssign(false)} /> No homework this time
              </label>
              <label className="row">
                <input type="radio" checked={assign} onChange={() => setAssign(true)} /> Assign homework
              </label>
            </div>
            {assign && <AssignmentFields form={assignForm} setForm={setAssignForm} />}
          </div>
        )}
      </ErpModal>

      <ErpConfirm
        open={Boolean(pendingCancel)}
        title="Cancel booking"
        message={
          pendingCancel
            ? `Cancel ${studentName(pendingCancel)} · ${pendingCancel.subjectId?.name || 'lesson'} on ${formatInZone(
                pendingCancel.startAt,
                pendingCancel.timezone
              )}?`
            : ''
        }
        confirmLabel="Cancel class"
        danger
        onCancel={() => setPendingCancel(null)}
        onConfirm={async () => {
          try {
            await cancelBooking(pendingCancel._id);
            setPendingCancel(null);
            setSelectedId('');
            setMsg('Booking cancelled');
            load();
          } catch (err) {
            setError(err.message);
            setPendingCancel(null);
          }
        }}
      />

      <ErpModal
        open={Boolean(reschedule)}
        title="Reschedule booking"
        onClose={() => setReschedule(null)}
        footer={
          reschedule ? (
            <>
              <ErpButton variant="secondary" onClick={() => setReschedule(null)}>
                Close
              </ErpButton>
              <ErpButton
                onClick={async () => {
                  try {
                    const start = new Date(reschedule.startAt);
                    const end = new Date(reschedule.endAt);
                    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                      throw new Error('Pick a valid start and end time');
                    }
                    if (end <= start) throw new Error('End must be after start');
                    await rescheduleBooking(reschedule.booking._id, {
                      startAt: start.toISOString(),
                      endAt: end.toISOString(),
                      timezone: reschedule.booking.timezone,
                    });
                    setReschedule(null);
                    setMsg('Booking rescheduled');
                    refreshSelected();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                Save new time
              </ErpButton>
            </>
          ) : null
        }
      >
        {reschedule && (
          <div className="erp-form-grid">
            <div className="field">
              <label>Start</label>
              <input
                className="erp-search"
                type="datetime-local"
                value={reschedule.startAt}
                onChange={(e) => setReschedule((f) => ({ ...f, startAt: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>End</label>
              <input
                className="erp-search"
                type="datetime-local"
                value={reschedule.endAt}
                onChange={(e) => setReschedule((f) => ({ ...f, endAt: e.target.value }))}
              />
            </div>
            <p className="muted erp-form-span">
              {studentName(reschedule.booking)} · {reschedule.booking.subjectId?.name || 'Lesson'} ·{' '}
              {reschedule.booking.timezone}
            </p>
          </div>
        )}
      </ErpModal>
    </div>
  );
}
