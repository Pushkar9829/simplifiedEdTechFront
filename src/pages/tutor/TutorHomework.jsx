import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomework, gradeHomework, homeworkStats, listHomework } from '../../api';
import GradeInput from '../../components/GradeInput';
import {
  ErpAvatar,
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpEmptyState,
  ErpLoadingState,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSegmented,
  ErpStat,
  ErpStatusBadge,
  ErpTabs,
  ErpTextarea,
  Icon,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import { defaultGradeValue, gradeLabel, schemeLabel } from '../../utils/grading';
import { mediaName, mediaUrl } from '../../utils/mediaUrl';
import { localTime } from './tutorOptions';
import './tutor.css';

const PAGE_SIZE = 20;
const TAB_STATUS = { to_grade: 'submitted', assigned: 'assigned', graded: 'graded' };

function isOverdue(h) {
  return h.status === 'assigned' && h.deadline && new Date(h.deadline) < new Date();
}

function existingGradeValue(grade) {
  if (grade == null || grade === '') return '';
  if (typeof grade === 'object') return grade.value == null ? '' : String(grade.value);
  return String(grade);
}

export default function TutorHomework() {
  const phone = useIsPhone();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('list');
  const [stats, setStats] = useState({ toGrade: 0, assigned: 0, graded: 0, overdue: 0 });
  const [gradeForm, setGradeForm] = useState(null);
  const [gradeBusy, setGradeBusy] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Overdue and calendar views are filtered client-side from the latest 100; other tabs page on the server.
  const serverPaged = view === 'list' && tab !== 'overdue';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = serverPaged
        ? { status: TAB_STATUS[tab], page, limit: PAGE_SIZE }
        : { status: tab === 'overdue' ? 'assigned' : TAB_STATUS[tab], limit: 100 };
      const [hw, st] = await Promise.all([listHomework(query), homeworkStats()]);
      setItems(hw.items || []);
      setTotal(Number(hw.total) || 0);
      setStats(st);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [serverPaged, tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeTab = (next) => {
    setTab(next);
    setPage(1);
  };

  const visible = tab === 'overdue' ? items.filter(isOverdue) : items;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const list = useListFilter(
    visible,
    (h) =>
      [h.title, h.studentUserId?.name, h.studentUserId?.phone, h.subjectId?.name, h.status].filter(Boolean).join(' '),
    { resetKey: `${tab}-${page}-${view}`, pageSize: serverPaged ? 1000 : 12 }
  );
  const events = useMemo(
    () =>
      (list.filtered || visible)
        .filter((h) => h.deadline)
        .map((h) => ({
          id: h._id,
          start: h.deadline,
          title: `${h.title} · ${h.studentUserId?.name || h.studentUserId?.phone || 'Student'}`,
          variant: h.status === 'graded' ? 'completed' : isOverdue(h) ? 'cancelled' : 'online',
          homework: h,
        })),
    [list.filtered, visible]
  );

  const openGrade = async (h) => {
    setError('');
    try {
      const detail = await getHomework(h._id);
      const scheme = h.gradingScheme || 'ib_1_7';
      const existing = existingGradeValue(detail.submission?.grade);
      setGradeForm({
        id: h._id,
        title: h.title,
        scheme,
        maxScore: h.maxScore,
        grade: existing || defaultGradeValue(scheme),
        hasGrade: Boolean(existing),
        feedback: detail.submission?.feedback || '',
        submission: detail.submission,
        assignment: detail.assignment,
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const saveGrade = async () => {
    if (!gradeForm) return;
    if (gradeForm.grade === '' || gradeForm.grade == null) {
      setError('Enter a grade first');
      return;
    }
    setGradeBusy(true);
    try {
      await gradeHomework(gradeForm.id, {
        grade: { scheme: gradeForm.scheme, value: gradeForm.grade, maxScore: gradeForm.maxScore },
        feedback: gradeForm.feedback,
      });
      setConfirmOverwrite(false);
      setGradeForm(null);
      setMsg('Graded');
      load();
    } catch (err) {
      setConfirmOverwrite(false);
      setError(errorMessage(err));
    } finally {
      setGradeBusy(false);
    }
  };

  const studentOf = (h) => h.studentUserId?.name || h.studentUserId?.phone || 'Student';
  const dueCell = (h) => (
    <span className="tutor-cell-stack">
      <span className="erp-tabular">{localTime(h.deadline)}</span>
      {isOverdue(h) ? (
        <ErpBadge tone="danger" dot>
          Overdue
        </ErpBadge>
      ) : null}
    </span>
  );
  const actionLabel = (h) => (h.status === 'graded' ? 'View grade' : h.status === 'submitted' ? 'Grade' : 'Open');

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        subtitle="Assign work after a class, collect submissions and grade with the right scheme."
        actions={
          <Link to="/tutor/homework/new" className="erp-btn-primary">
            <Icon name="plus" size={16} />
            Create assignment
          </Link>
        }
      />
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}
      {error && !gradeForm && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      <div className="erp-kpis">
        <ErpStat label="To grade" value={stats.toGrade} icon="clipboard-check" hint="Submitted, waiting for you" />
        <ErpStat label="Assigned" value={stats.assigned} icon="file-text" tone="info" hint="Not yet submitted" />
        <ErpStat label="Graded" value={stats.graded} icon="check-circle" tone="success" />
        <ErpStat
          label="Overdue"
          value={stats.overdue}
          icon="alert-triangle"
          tone={stats.overdue ? 'danger' : 'neutral'}
          hint="Past the deadline"
        />
      </div>

      <div className="erp-filter-bar tutor-toolbar">
        <div className="tutor-toolbar-left">
          <ErpTabs
            variant="segmented"
            value={tab}
            onChange={changeTab}
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'to_grade', label: 'To grade', count: stats.toGrade || null },
              { value: 'assigned', label: 'Assigned' },
              { value: 'graded', label: 'Graded' },
              { value: 'overdue', label: 'Overdue', count: stats.overdue || null },
            ]}
          />
          <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search title or student" />
        </div>
        <div className="tutor-toolbar-right">
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
          {loading ? (
            <ErpLoadingState message="Loading assignments…" />
          ) : !events.length ? (
            <ErpEmptyState icon="calendar" title="No deadlines in this view" />
          ) : (
            <ErpCalendar events={events} onEventClick={(e) => openGrade(e.homework)} />
          )}
        </ErpCard>
      ) : (
        <ErpCard flush>
          {loading ? (
            <ErpLoadingState message="Loading assignments…" />
          ) : !visible.length ? (
            <ErpEmptyState
              icon={tab === 'to_grade' ? 'check-circle' : 'clipboard-check'}
              title={tab === 'to_grade' ? 'Nothing to grade' : 'No assignments in this view'}
              description={
                tab === 'to_grade'
                  ? 'Submitted work will show up here.'
                  : 'Assign homework after a class, or create one now.'
              }
              action={
                <Link to="/tutor/homework/new" className="erp-btn-primary">
                  Create assignment
                </Link>
              }
            />
          ) : list.noMatch ? (
            <ErpEmptyState
              icon="search"
              title="No assignments match that search"
              action={
                <ErpButton variant="secondary" onClick={() => list.setSearch('')}>
                  Clear search
                </ErpButton>
              }
            />
          ) : phone ? (
            <ul className="tutor-booking-cards">
              {list.items.map((h) => (
                <li key={h._id} className="tutor-booking-card">
                  <button type="button" className="tutor-booking-card-hit" onClick={() => openGrade(h)}>
                    <ErpAvatar name={studentOf(h)} size="sm" />
                    <span className="tutor-booking-card-main">
                      <span className="tutor-booking-card-top">
                        <strong>{h.title}</strong>
                        <ErpStatusBadge status={h.status} dot>
                          {h.status}
                        </ErpStatusBadge>
                      </span>
                      <span className="muted">
                        {studentOf(h)} · {h.subjectId?.name || 'Homework'}
                      </span>
                      <span className="tutor-chips text-erp-sm">
                        <span className="muted">Due {localTime(h.deadline)}</span>
                        {isOverdue(h) ? (
                          <ErpBadge tone="danger" dot>
                            Overdue
                          </ErpBadge>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Scheme</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((h) => (
                    <tr key={h._id} className="erp-row-click" onClick={() => openGrade(h)}>
                      <td>
                        <span className="tutor-cell-stack">
                          <strong>{h.title}</strong>
                          <span className="muted text-erp-xs">
                            {[h.subjectId?.name, h.attachments?.length ? `${h.attachments.length} file(s)` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="tutor-cell-person">
                          <ErpAvatar name={studentOf(h)} size="xs" />
                          {studentOf(h)}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {h.bookingId?.startAt ? (
                          <Link className="erp-link" to={`/tutor/bookings?id=${h.bookingId._id || h.bookingId}`}>
                            {localTime(h.bookingId.startAt)}
                          </Link>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>{schemeLabel(h.gradingScheme)}</td>
                      <td>{dueCell(h)}</td>
                      <td>
                        <ErpStatusBadge status={h.status} dot>
                          {h.status}
                        </ErpStatusBadge>
                      </td>
                      <td className="tutor-cell-actions">
                        <ErpButton
                          variant={h.status === 'submitted' ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openGrade(h);
                          }}
                        >
                          {actionLabel(h)}
                        </ErpButton>
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
                  noun="assignment"
                  onPrev={() => setPage((x) => Math.max(1, x - 1))}
                  onNext={() => setPage((x) => Math.min(pages, x + 1))}
                />
              )
            : list.total > 0 && <ErpPager {...list.pagerProps} noun="assignment" />}
        </ErpCard>
      )}

      <ErpModal
        open={Boolean(gradeForm)}
        size="lg"
        title={gradeForm ? gradeForm.title : 'Grade'}
        onClose={() => !gradeBusy && setGradeForm(null)}
        footer={
          gradeForm ? (
            <>
              <ErpButton variant="secondary" disabled={gradeBusy} onClick={() => setGradeForm(null)}>
                Close
              </ErpButton>
              <ErpButton
                loading={gradeBusy}
                onClick={() => (gradeForm.hasGrade ? setConfirmOverwrite(true) : saveGrade())}
              >
                {gradeBusy ? 'Saving…' : gradeForm.hasGrade ? 'Update grade' : 'Save grade'}
              </ErpButton>
            </>
          ) : null
        }
      >
        {!gradeForm ? null : (
          <div className="stack" style={{ gap: '1.25rem' }}>
            {error && <ErpBanner variant="danger">{error}</ErpBanner>}
            <p className="muted" style={{ margin: 0 }}>
              {schemeLabel(gradeForm.scheme)}
              {gradeForm.maxScore ? ` · out of ${gradeForm.maxScore}` : ''}
            </p>
            {gradeForm.assignment?.attachments?.length > 0 && (
              <section>
                <h4 className="erp-section-title">Your files</h4>
                <ul className="erp-divided tutor-plain-list">
                  {gradeForm.assignment.attachments.map((f) => (
                    <li key={f.url} className="tutor-file-row">
                      <a className="erp-link tutor-file-link" href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                        <Icon name="file-text" size={14} />
                        {f.name || f.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h4 className="erp-section-title">Student work</h4>
              {gradeForm.submission ? (
                <div className="tutor-submission">
                  <p style={{ margin: 0 }}>{gradeForm.submission.notes || <span className="muted">No notes.</span>}</p>
                  {!!gradeForm.submission.files?.length && (
                    <ul className="erp-divided tutor-plain-list">
                      {gradeForm.submission.files.map((f, i) => (
                        <li key={mediaUrl(f) || i} className="tutor-file-row">
                          <a className="erp-link tutor-file-link" href={mediaUrl(f)} target="_blank" rel="noreferrer">
                            <Icon name="download" size={14} />
                            {mediaName(f)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {gradeForm.submission.grade && (
                    <p className="text-erp-sm" style={{ margin: 0 }}>
                      Current grade: <strong>{gradeLabel(gradeForm.submission.grade)}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <ErpBanner variant="neutral">Not submitted yet. You can still record a grade.</ErpBanner>
              )}
            </section>
            <section className="erp-form-section">
              <h4 className="erp-section-title">Your grade</h4>
              <div className="erp-form-grid">
                <GradeInput
                  scheme={gradeForm.scheme}
                  maxScore={gradeForm.maxScore}
                  value={gradeForm.grade}
                  onChange={(grade) => setGradeForm((f) => ({ ...f, grade }))}
                />
                <div className="erp-form-span">
                  <ErpTextarea
                    label="Feedback"
                    optional
                    rows={4}
                    helper="Shared with the student and parents"
                    value={gradeForm.feedback}
                    onChange={(e) => setGradeForm((f) => ({ ...f, feedback: e.target.value }))}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </ErpModal>
      <ErpConfirm
        open={confirmOverwrite}
        title="Replace grade"
        message={
          gradeForm?.submission?.grade
            ? `This work is already graded ${gradeLabel(gradeForm.submission.grade)}. Replace it with the new grade? The student and parents see the change.`
            : 'Replace the existing grade?'
        }
        confirmLabel="Replace grade"
        busy={gradeBusy}
        onCancel={() => setConfirmOverwrite(false)}
        onConfirm={saveGrade}
      />
    </div>
  );
}
