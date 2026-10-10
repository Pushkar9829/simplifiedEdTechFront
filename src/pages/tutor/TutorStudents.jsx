import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addStudentNote,
  deleteStudentNote,
  getStudentProgress,
  listBookings,
  listStudentNotes,
} from '../../api';
import {
  ErpAvatar,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpEmptyState,
  ErpLoadingState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStat,
  ErpTabs,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { STUDENT_PICKER_QUERY, studentsFromBookings } from './tutorOptions';
import './tutor.css';

function TopicChips({ items, tone }) {
  if (!items?.length) return <span className="muted">None recorded yet</span>;
  return (
    <span className="tutor-chips">
      {items.map((t) => (
        <span key={t} className={`erp-status-badge ${tone}`}>
          {t}
        </span>
      ))}
    </span>
  );
}

export default function TutorStudents() {
  const [tab, setTab] = useState('notes');
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState('');
  const [notes, setNotes] = useState([]);
  const [progress, setProgress] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listBookings(STUDENT_PICKER_QUERY)
      .then((d) => {
        const list = studentsFromBookings(d.items || []);
        setStudents(list);
        if (list[0]) setSelected(list[0]._id);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDetailLoading(true);
    Promise.all([listStudentNotes(selected), getStudentProgress(selected)])
      .then(([n, p]) => {
        setNotes(n || []);
        setProgress(p);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setDetailLoading(false));
  }, [selected]);

  const studentList = useListFilter(students, (s) => [s.name, s.phone].filter(Boolean).join(' '));
  const noteList = useListFilter(notes, (n) => n.note || '', { resetKey: selected });
  const current = students.find((s) => s._id === selected) || null;

  const addNote = async () => {
    if (!note.trim()) return;
    setNoteBusy(true);
    try {
      await addStudentNote({ studentUserId: selected, note });
      setNote('');
      setNotes(await listStudentNotes(selected));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setNoteBusy(false);
    }
  };

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader subtitle="Everyone you have taught, with your private teaching notes and their progress." />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      {loading ? (
        <ErpCard>
          <ErpLoadingState message="Loading students…" />
        </ErpCard>
      ) : !students.length ? (
        <ErpCard>
          <ErpEmptyState
            icon="users"
            title="No students yet"
            description="Students appear here after they book a class with you."
            action={
              <Link to="/tutor/availability" className="erp-btn-primary">
                Open availability
              </Link>
            }
          />
        </ErpCard>
      ) : (
        <div className="tutor-split">
          <ErpCard flush className="tutor-split-list">
            <div className="tutor-split-search">
              <ErpSearch value={studentList.search} onChange={studentList.setSearch} placeholder="Search students" />
            </div>
            {studentList.noMatch ? (
              <ErpEmptyState icon="search" title="No students match" />
            ) : (
              <ul className="tutor-people">
                {studentList.items.map((s) => (
                  <li key={s._id}>
                    <button
                      type="button"
                      className={`tutor-person${selected === s._id ? ' is-active' : ''}`}
                      aria-current={selected === s._id ? 'true' : undefined}
                      onClick={() => setSelected(s._id)}
                    >
                      <ErpAvatar name={s.name || s.phone} src={s.avatar} size="sm" />
                      <span className="tutor-mini-main">
                        <strong>{s.name || s.phone || 'Student'}</strong>
                        {s.refCode || s.country ? (
                          <span className="muted">{[s.refCode, s.country].filter(Boolean).join(' · ')}</span>
                        ) : null}
                      </span>
                      <Icon name="chevron-right" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {studentList.pages > 1 && <ErpPager {...studentList.pagerProps} noun="student" />}
          </ErpCard>

          <div className="stack tutor-split-detail">
            {current && (
              <ErpCard>
                <div className="tutor-drawer-head">
                  <ErpAvatar name={current.name || current.phone} src={current.avatar} size="lg" />
                  <div className="tutor-drawer-head-text">
                    <strong>{current.name || current.phone || 'Student'}</strong>
                    <span className="muted">
                      {[current.refCode, current.country, current.timezone].filter(Boolean).join(' · ') ||
                        'Student'}
                    </span>
                  </div>
                  <span style={{ marginLeft: 'auto' }}>
                    <Link to="/tutor/homework/new" className="erp-btn-secondary erp-btn-sm">
                      <Icon name="plus" size={15} />
                      Assign homework
                    </Link>
                  </span>
                </div>
              </ErpCard>
            )}

            <ErpTabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'notes', label: 'Teaching notes', count: notes.length, icon: 'file-text' },
                { value: 'progress', label: 'Progress', icon: 'trending-up' },
              ]}
            />

            {detailLoading ? (
              <ErpCard>
                <ErpLoadingState message="Loading…" />
              </ErpCard>
            ) : tab === 'notes' ? (
              <>
                <ErpCard>
                  <ErpTextarea
                    label="New note"
                    helper="Private to you — never shown to the student or parents."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What to remember for the next class…"
                    rows={3}
                  />
                  <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                    <ErpButton icon="plus" disabled={!note.trim()} loading={noteBusy} onClick={addNote}>
                      Add note
                    </ErpButton>
                  </div>
                </ErpCard>
                <ErpCard flush>
                  {notes.length > 3 && (
                    <div className="tutor-split-search">
                      <ErpSearch value={noteList.search} onChange={noteList.setSearch} placeholder="Search notes" />
                    </div>
                  )}
                  {!notes.length ? (
                    <ErpEmptyState
                      icon="file-text"
                      title="No notes yet"
                      description="Jot down strengths, gaps and plans after each class."
                    />
                  ) : noteList.noMatch ? (
                    <ErpEmptyState icon="search" title="No notes match that search" />
                  ) : (
                    <ul className="tutor-notes">
                      {noteList.items.map((n) => (
                        <li key={n._id} className="tutor-note">
                          <span className="tutor-mini-main">
                            <span className="tutor-note-text">{n.note}</span>
                            {n.createdAt ? <span className="muted text-erp-xs">{formatDate(n.createdAt)}</span> : null}
                          </span>
                          <ErpButton
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon="trash"
                            aria-label="Delete note"
                            onClick={() => setPendingDelete(n)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  {noteList.total > 0 && noteList.pages > 1 && <ErpPager {...noteList.pagerProps} noun="note" />}
                </ErpCard>
              </>
            ) : (
              <>
                <div className="grid two">
                  <ErpStat
                    label="Study streak"
                    value={`${progress?.studyStreak || 0} day${progress?.studyStreak === 1 ? '' : 's'}`}
                    icon="flame"
                    tone="warning"
                  />
                  <ErpStat
                    label="Topics tracked"
                    value={(progress?.weakTopics?.length || 0) + (progress?.strongTopics?.length || 0)}
                    icon="target"
                  />
                </div>
                <ErpCard heading="Topics">
                  <div className="erp-divided">
                    <div className="tutor-topic-row">
                      <span className="muted text-erp-sm">Needs work</span>
                      <TopicChips items={progress?.weakTopics} tone="erp-status-pending" />
                    </div>
                    <div className="tutor-topic-row">
                      <span className="muted text-erp-sm">Strong</span>
                      <TopicChips items={progress?.strongTopics} tone="erp-status-delivered" />
                    </div>
                  </div>
                </ErpCard>
              </>
            )}
          </div>
        </div>
      )}

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title="Delete note"
        message="Delete this teaching note?"
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => !deleting && setPendingDelete(null)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteStudentNote(pendingDelete._id);
            setPendingDelete(null);
            setNotes(await listStudentNotes(selected));
          } catch (err) {
            setError(errorMessage(err));
            setPendingDelete(null);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
