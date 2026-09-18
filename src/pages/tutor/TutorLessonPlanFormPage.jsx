import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addLessonPlan, listSubjects } from '../../api';
import { ErpSelect } from '../../components/erp';
import { LESSON_STATUS_OPTIONS, subjectOptions } from './tutorOptions';

const emptyForm = {
  title: '',
  subjectId: '',
  objectives: '',
  content: '',
  status: 'draft',
};

export default function TutorLessonPlanFormPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSubjects()
      .then((s) => {
        const list = s.items || [];
        setSubjects(list);
        if (list[0]) setForm((f) => ({ ...f, subjectId: list[0]._id }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await addLessonPlan(form);
      navigate('/tutor/lesson-plans');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Create lesson plan</h1>
        <Link to="/tutor/lesson-plans" className="btn secondary">
          Back to plans
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="erp-card empty">Loading…</div>
      ) : (
        <form className="erp-card grid two" onSubmit={onSubmit}>
          <div className="field">
            <label>Title</label>
            <input
              className="erp-search"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
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
          <ErpSelect
            label="Status"
            value={form.status}
            options={LESSON_STATUS_OPTIONS}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          />
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Objectives</label>
            <textarea
              className="erp-search"
              value={form.objectives}
              onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Content</label>
            <textarea
              className="erp-search"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div className="row">
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Create plan'}
            </button>
            <Link to="/tutor/lesson-plans" className="btn secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
