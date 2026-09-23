import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addLessonPlan, getLessonPlan, listSubjects, updateLessonPlan } from '../../api';
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await listSubjects();
        const list = s.items || [];
        setSubjects(list);
        if (id) {
          const plan = await getLessonPlan(id);
          setForm({
            title: plan.title || '',
            subjectId: plan.subjectId?._id || plan.subjectId || '',
            objectives: plan.objectives || '',
            content: plan.content || '',
            status: plan.status || 'draft',
          });
        } else if (list[0]) {
          setForm((f) => ({ ...f, subjectId: f.subjectId || list[0]._id }));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (id) await updateLessonPlan(id, form);
      else await addLessonPlan(form);
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
        <h1 style={{ margin: 0 }}>{id ? 'Edit lesson plan' : 'Create lesson plan'}</h1>
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
          <div className="erp-sticky-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : id ? 'Save plan' : 'Create plan'}
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
