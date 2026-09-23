import { useEffect, useState } from 'react';
import {
  addStudentNote,
  deleteStudentNote,
  getStudentProgress,
  listBookings,
  listStudentNotes,
} from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpList,
  ErpListItem,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpTabs,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { studentOptions } from './tutorOptions';

export default function TutorStudents() {
  const phone = useIsPhone();
  const [tab, setTab] = useState('notes');
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState('');
  const [notes, setNotes] = useState([]);
  const [progress, setProgress] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    listBookings()
      .then((d) => {
        const uniq = {};
        (d.items || []).forEach((b) => {
          const s = b.studentUserId;
          if (s?._id) uniq[s._id] = s;
        });
        const list = Object.values(uniq);
        setStudents(list);
        if (list[0]) setSelected(list[0]._id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    Promise.all([listStudentNotes(selected), getStudentProgress(selected)])
      .then(([n, p]) => {
        setNotes(n || []);
        setProgress(p);
      })
      .catch((err) => setError(err.message));
  }, [selected]);

  const studentList = useListFilter(students, (s) => [s.name, s.phone].filter(Boolean).join(' '));
  const noteList = useListFilter(notes, (n) => n.note || '', { resetKey: selected });

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Notes and progress for students from your bookings." />
      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <ErpCard>
          <div className="empty">Loading students…</div>
        </ErpCard>
      ) : !students.length ? (
        <ErpCard>
          <div className="empty">No students yet. Bookings will populate this list.</div>
        </ErpCard>
      ) : (
        <>
          <div className="avail-bar">
            <ErpTabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'notes', label: `Notes (${notes.length})` },
                { value: 'progress', label: 'Progress' },
              ]}
            />
            <ErpSearch
              value={studentList.search}
              onChange={studentList.setSearch}
              placeholder="Search students"
            />
            {!phone && (
              <ErpSelect
                inline
                value={selected}
                options={studentOptions(studentList.search ? studentList.items : students).filter((o) => o.value)}
                onChange={(e) => setSelected(e.target.value)}
              />
            )}
          </div>
          {phone && (
            <>
              {studentList.noMatch ? (
                <div className="empty">No students match that search.</div>
              ) : (
                <ErpList>
                  {studentList.items.map((s) => (
                    <ErpListItem
                      key={s._id}
                      title={s.name || s.phone || 'Student'}
                      meta={s.phone || ''}
                      onClick={() => setSelected(s._id)}
                      status={selected === s._id ? 'active' : undefined}
                      statusLabel={selected === s._id ? 'Selected' : undefined}
                    />
                  ))}
                </ErpList>
              )}
              {studentList.total > 0 && <ErpPager {...studentList.pagerProps} noun="student" />}
            </>
          )}

          {tab === 'notes' ? (
            <ErpCard className="erp-card-flush">
              <div className="erp-toolbar">
                <div className="erp-toolbar-left">
                  <textarea
                    className="erp-search"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a teaching note…"
                    rows={2}
                    style={{ flex: 1, minHeight: 42 }}
                  />
                </div>
                <div className="erp-toolbar-right">
                  <ErpButton
                    type="button"
                    onClick={async () => {
                      if (!note.trim()) return;
                      try {
                        await addStudentNote({ studentUserId: selected, note });
                        setNote('');
                        setNotes(await listStudentNotes(selected));
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  >
                    Add note
                  </ErpButton>
                </div>
              </div>
              <div className="erp-toolbar">
                <div className="erp-toolbar-left">
                  <ErpSearch value={noteList.search} onChange={noteList.setSearch} placeholder="Search notes" />
                </div>
              </div>
              {!notes.length ? (
                <div className="empty">No notes yet.</div>
              ) : noteList.noMatch ? (
                <div className="empty">No notes match that search.</div>
              ) : phone ? (
                <div style={{ padding: '0.65rem' }}>
                  <ErpList>
                    {noteList.items.map((n) => (
                      <ErpListItem
                        key={n._id}
                        title={n.note}
                        actions={
                          <ErpButton variant="danger" onClick={() => setPendingDelete(n)}>
                            Delete
                          </ErpButton>
                        }
                      />
                    ))}
                  </ErpList>
                </div>
              ) : (
                <div className="erp-table-scroll">
                  <ErpDataTable>
                    <thead>
                      <tr>
                        <th>Note</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                    {noteList.items.map((n) => (
                      <tr key={n._id}>
                          <td>{n.note}</td>
                          <td>
                            <ErpButton variant="danger" onClick={() => setPendingDelete(n)}>
                              Delete
                            </ErpButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </ErpDataTable>
                </div>
              )}
              {noteList.total > 0 && <ErpPager {...noteList.pagerProps} noun="note" />}
            </ErpCard>
          ) : (
            <div className="grid two">
              <div className="stat">
                <div className="label">Study streak</div>
                <div className="value">{progress?.studyStreak || 0}</div>
              </div>
              <ErpCard>
                <p>
                  <span className="muted">Weak topics:</span>{' '}
                  {(progress?.weakTopics || []).join(', ') || '—'}
                </p>
                <p style={{ marginBottom: 0 }}>
                  <span className="muted">Strong topics:</span>{' '}
                  {(progress?.strongTopics || []).join(', ') || '—'}
                </p>
              </ErpCard>
            </div>
          )}
        </>
      )}

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title="Delete note"
        message="Delete this teaching note?"
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await deleteStudentNote(pendingDelete._id);
            setPendingDelete(null);
            setNotes(await listStudentNotes(selected));
          } catch (err) {
            setError(err.message);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
