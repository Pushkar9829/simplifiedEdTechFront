import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomework, gradeHomework, homeworkStats, listHomework } from '../../api';
import GradeInput from '../../components/GradeInput';
import {
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpList,
  ErpListItem,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate } from '../../utils/format';
import { defaultGradeValue, gradeLabel, schemeLabel } from '../../utils/grading';
import { mediaName, mediaUrl } from '../../utils/mediaUrl';

function isOverdue(h) {
  return h.status !== 'graded' && h.deadline && new Date(h.deadline) < new Date();
}

export default function TutorHomework() {
  const phone = useIsPhone();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('list');
  const [stats, setStats] = useState({ toGrade: 0, assigned: 0, graded: 0, overdue: 0 });
  const [gradeForm, setGradeForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [hw, st] = await Promise.all([listHomework(), homeworkStats()]);
      setItems(hw.items || []);
      setStats(st);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = items.filter((h) => {
    if (tab === 'to_grade') return h.status === 'submitted';
    if (tab === 'assigned') return h.status === 'assigned';
    if (tab === 'graded') return h.status === 'graded';
    if (tab === 'overdue') return isOverdue(h);
    return true;
  });
  const list = useListFilter(
    visible,
    (h) =>
      [h.title, h.studentUserId?.name, h.studentUserId?.phone, h.subjectId?.name, h.status].filter(Boolean).join(' '),
    { resetKey: tab }
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
    try {
      const detail = await getHomework(h._id);
      setGradeForm({
        id: h._id,
        title: h.title,
        scheme: h.gradingScheme || 'ib_1_7',
        maxScore: h.maxScore,
        grade: defaultGradeValue(h.gradingScheme || 'ib_1_7'),
        feedback: detail.submission?.feedback || '',
        submission: detail.submission,
        assignment: detail.assignment,
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Assign work after a class, collect files, and grade with a proper scheme." />
      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="erp-kpis">
        <div className="stat">
          <div className="label">To grade</div>
          <div className="value">{stats.toGrade}</div>
        </div>
        <div className="stat">
          <div className="label">Assigned</div>
          <div className="value">{stats.assigned}</div>
        </div>
        <div className="stat">
          <div className="label">Graded</div>
          <div className="value">{stats.graded}</div>
        </div>
        <div className="stat">
          <div className="label">Overdue</div>
          <div className="value">{stats.overdue}</div>
        </div>
      </div>

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'to_grade', label: `To grade (${stats.toGrade})` },
            { value: 'assigned', label: 'Assigned' },
            { value: 'graded', label: 'Graded' },
            { value: 'overdue', label: `Overdue (${stats.overdue})` },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search title or student" />
        <ErpTabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
        <div className="avail-bar-actions">
          <Link to="/tutor/homework/new" className="erp-btn-primary">
            Create assignment
          </Link>
        </div>
      </div>

      {view === 'calendar' ? (
        <ErpCard>
          {loading ? (
            <div className="empty">Loading assignments…</div>
          ) : !events.length ? (
            <div className="empty">No assignments with a deadline in this view.</div>
          ) : (
            <ErpCalendar events={events} onEventClick={(e) => openGrade(e.homework)} />
          )}
        </ErpCard>
      ) : (
      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading assignments…</div>
        ) : !visible.length ? (
          <div className="empty">
            No assignments in this view.{' '}
            <Link to="/tutor/homework/new">Create an assignment</Link>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No assignments match that search.</div>
        ) : phone ? (
          <div style={{ padding: '0.65rem' }}>
            <ErpList>
              {list.items.map((h) => (
                <ErpListItem
                  key={h._id}
                  title={h.title}
                  meta={`${h.studentUserId?.name || h.studentUserId?.phone || 'Student'} · due ${formatDate(h.deadline)}`}
                  status={h.status}
                  actions={
                    <ErpButton variant="secondary" onClick={() => openGrade(h)}>
                      {h.status === 'graded' ? 'View' : 'Grade'}
                    </ErpButton>
                  }
                >
                  <div className="muted" style={{ marginTop: '0.25rem' }}>
                    {h.subjectId?.name || 'Homework'} · {schemeLabel(h.gradingScheme)}
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
                  <th>Title</th>
                  <th>Student</th>
                  <th>Booking</th>
                  <th>Scheme</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((h) => (
                  <tr key={h._id}>
                    <td>
                      <strong>{h.title}</strong>
                      {h.subjectId?.name && <div className="muted">{h.subjectId.name}</div>}
                      {h.attachments?.length > 0 && (
                        <div className="muted">{h.attachments.length} file(s)</div>
                      )}
                    </td>
                    <td>{h.studentUserId?.name || h.studentUserId?.phone || '—'}</td>
                    <td>
                      {h.bookingId?.startAt ? (
                        <Link to={`/tutor/bookings?id=${h.bookingId._id || h.bookingId}`}>
                          {formatDate(h.bookingId.startAt)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{schemeLabel(h.gradingScheme)}</td>
                    <td>{formatDate(h.deadline)}</td>
                    <td>
                      <ErpStatusBadge status={h.status}>{h.status}</ErpStatusBadge>
                    </td>
                    <td>
                      <ErpButton variant="secondary" onClick={() => openGrade(h)}>
                        {h.status === 'graded' ? 'View grade' : 'Grade'}
                      </ErpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="assignment" />}
      </ErpCard>
      )}

      <ErpModal
        open={Boolean(gradeForm)}
        title={gradeForm ? `Grade: ${gradeForm.title}` : 'Grade'}
        onClose={() => setGradeForm(null)}
      >
        {!gradeForm ? null : (
          <div className="stack">
            {gradeForm.assignment?.attachments?.length > 0 && (
              <div>
                <strong>Teacher files</strong>
                <ul>
                  {gradeForm.assignment.attachments.map((f) => (
                    <li key={f.url}>
                      <a href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                        {f.name || f.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {gradeForm.submission ? (
              <div>
                <strong>Student work</strong>
                <p>{gradeForm.submission.notes || 'No notes.'}</p>
                {!!gradeForm.submission.files?.length && (
                  <ul>
                    {gradeForm.submission.files.map((f, i) => (
                      <li key={mediaUrl(f) || i}>
                        <a href={mediaUrl(f)} target="_blank" rel="noreferrer">
                          {mediaName(f)}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {gradeForm.submission.grade && (
                  <p>
                    Current grade: <strong>{gradeLabel(gradeForm.submission.grade)}</strong>
                  </p>
                )}
              </div>
            ) : (
              <p className="muted">Student has not submitted yet. You can still record a grade.</p>
            )}
            <GradeInput
              scheme={gradeForm.scheme}
              maxScore={gradeForm.maxScore}
              value={gradeForm.grade}
              onChange={(grade) => setGradeForm((f) => ({ ...f, grade }))}
            />
            <div className="field">
              <label>Feedback</label>
              <textarea
                className="erp-search"
                value={gradeForm.feedback}
                onChange={(e) => setGradeForm((f) => ({ ...f, feedback: e.target.value }))}
              />
            </div>
            <div className="erp-sticky-actions">
              <ErpButton
                onClick={async () => {
                  try {
                    await gradeHomework(gradeForm.id, {
                      grade: { scheme: gradeForm.scheme, value: gradeForm.grade, maxScore: gradeForm.maxScore },
                      feedback: gradeForm.feedback,
                    });
                    setGradeForm(null);
                    setMsg('Graded');
                    load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                Save grade
              </ErpButton>
              <ErpButton variant="secondary" onClick={() => setGradeForm(null)}>
                Close
              </ErpButton>
            </div>
          </div>
        )}
      </ErpModal>
    </div>
  );
}
