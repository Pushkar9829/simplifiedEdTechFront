import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gradeHomework, listHomework } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPageHeader,
  ErpStatusBadge,
  ErpToolbar,
} from '../../components/erp';
import { formatDate } from '../../utils/format';

export default function TutorHomework() {
  const [items, setItems] = useState([]);
  const [gradeForm, setGradeForm] = useState({ id: '', grade: '', feedback: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const hw = await listHomework();
      setItems(hw.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Create assignments and grade student submissions." />
      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <ErpToolbar
        actions={
          <Link to="/tutor/homework/new" className="erp-btn-primary">
            Create assignment
          </Link>
        }
      />

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading assignments…</div>
        ) : !items.length ? (
          <div className="empty">
            No assignments yet.{' '}
            <Link to="/tutor/homework/new">Create your first assignment</Link>
          </div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Student</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((h) => (
                  <tr key={h._id}>
                    <td>
                      <strong>{h.title}</strong>
                      {h.subjectId?.name && <div className="muted">{h.subjectId.name}</div>}
                    </td>
                    <td>{h.studentUserId?.name || h.studentUserId?.phone || '—'}</td>
                    <td>{formatDate(h.deadline)}</td>
                    <td>
                      <ErpStatusBadge status={h.status}>{h.status}</ErpStatusBadge>
                    </td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={() => setGradeForm({ id: h._id, grade: '', feedback: '' })}
                      >
                        Grade
                      </ErpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
      </ErpCard>

      <ErpModal
        open={Boolean(gradeForm.id)}
        title="Grade assignment"
        onClose={() => setGradeForm({ id: '', grade: '', feedback: '' })}
      >
        <div className="stack">
          <div className="field">
            <label>Grade</label>
            <input
              className="erp-search"
              value={gradeForm.grade}
              onChange={(e) => setGradeForm((f) => ({ ...f, grade: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Feedback</label>
            <textarea
              className="erp-search"
              value={gradeForm.feedback}
              onChange={(e) => setGradeForm((f) => ({ ...f, feedback: e.target.value }))}
            />
          </div>
          <div className="row">
            <ErpButton
              type="button"
              onClick={async () => {
                try {
                  await gradeHomework(gradeForm.id, {
                    grade: gradeForm.grade,
                    feedback: gradeForm.feedback,
                  });
                  setGradeForm({ id: '', grade: '', feedback: '' });
                  setMsg('Graded');
                  load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Save grade
            </ErpButton>
            <ErpButton
              variant="secondary"
              type="button"
              onClick={() => setGradeForm({ id: '', grade: '', feedback: '' })}
            >
              Close
            </ErpButton>
          </div>
        </div>
      </ErpModal>
    </div>
  );
}
