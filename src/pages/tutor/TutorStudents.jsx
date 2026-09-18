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
  ErpPageHeader,
  ErpSelect,
  ErpTabs,
  ErpToolbar,
} from '../../components/erp';
import { studentOptions } from './tutorOptions';

export default function TutorStudents() {
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
          <ErpToolbar>
            <ErpSelect
              inline
              value={selected}
              options={studentOptions(students).filter((o) => o.value)}
              onChange={(e) => setSelected(e.target.value)}
            />
          </ErpToolbar>

          <ErpTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'notes', label: `Notes (${notes.length})` },
              { value: 'progress', label: 'Progress' },
            ]}
          />

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
              {!notes.length ? (
                <div className="empty">No notes yet.</div>
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
                      {notes.map((n) => (
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
