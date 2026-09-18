import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createHomework,
  listBookings,
  listSubjects,
} from '../../api';
import { ErpSelect } from '../../components/erp';
import { studentOptions, subjectOptions } from './tutorOptions';

const emptyForm = {
  studentUserId: '',
  subjectId: '',
  title: '',
  description: '',
  deadline: '',
  rubric: '',
};

export default function TutorHomeworkFormPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bookings, subs] = await Promise.all([listBookings(), listSubjects()]);
        const uniq = {};
        (bookings.items || []).forEach((b) => {
          const s = b.studentUserId;
          if (s?._id) uniq[s._id] = s;
        });
        const studentList = Object.values(uniq);
        const subjectList = subs.items || [];
        setStudents(studentList);
        setSubjects(subjectList);
        setForm((f) => ({
          ...f,
          studentUserId: studentList[0]?._id || '',
          subjectId: subjectList[0]?._id || '',
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createHomework({
        ...form,
        deadline: new Date(form.deadline).toISOString(),
      });
      navigate('/tutor/homework');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Create assignment</h1>
        <Link to="/tutor/homework" className="btn secondary">
          Back to homework
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="erp-card empty">Loading…</div>
      ) : (
        <form className="erp-card grid two" onSubmit={onSubmit}>
          <ErpSelect
            label="Student"
            required
            value={form.studentUserId}
            options={studentOptions(students)}
            onChange={(e) => setForm((f) => ({ ...f, studentUserId: e.target.value }))}
          />
          <ErpSelect
            label="Subject"
            value={form.subjectId}
            options={
              subjects.length
                ? subjectOptions(subjects)
                : [{ value: '', label: 'No subjects', disabled: true }]
            }
            onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
          />
          <div className="field">
            <label>Title</label>
            <input
              className="erp-search"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Deadline</label>
            <input
              className="erp-search"
              type="datetime-local"
              required
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              className="erp-search"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Rubric</label>
            <textarea
              className="erp-search"
              value={form.rubric}
              onChange={(e) => setForm((f) => ({ ...f, rubric: e.target.value }))}
            />
          </div>
          <div className="row">
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Create assignment'}
            </button>
            <Link to="/tutor/homework" className="btn secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
