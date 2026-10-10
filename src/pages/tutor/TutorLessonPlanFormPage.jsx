import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addLessonPlan, getLessonPlan, listSubjects, updateLessonPlan } from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpInput,
  ErpPageHeader,
  ErpSelect,
  ErpSkeleton,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { LESSON_STATUS_OPTIONS, subjectOptions } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import './tutor.css';

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
        setError(errorMessage(err));
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
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        title={id ? 'Edit lesson plan' : 'Create lesson plan'}
        subtitle="Objectives first, then the content you will teach."
        actions={
          <Link to="/tutor/lesson-plans" className="erp-btn-ghost">
            <Icon name="arrow-left" size={16} />
            Back to plans
          </Link>
        }
      />

      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      {loading ? (
        <ErpCard>
          <ErpSkeleton lines={6} />
        </ErpCard>
      ) : (
        <form className="tutor-form" onSubmit={onSubmit}>
          <ErpCard heading="Basics">
            <div className="erp-form-grid">
              <div className="erp-form-span">
                <ErpInput
                  label="Title"
                  required
                  placeholder="e.g. Projectile motion — worked examples"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <ErpSelect
                label="Subject"
                value={form.subjectId}
                options={
                  subjects.length ? subjectOptions(subjects) : [{ value: '', label: 'No subjects', disabled: true }]
                }
                onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
              />
              <ErpSelect
                label="Status"
                value={form.status}
                options={LESSON_STATUS_OPTIONS}
                helper="Ready plans can be bundled into a course"
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              />
            </div>
          </ErpCard>

          <ErpCard heading="Lesson">
            <div className="stack">
              <ErpTextarea
                label="Objectives"
                optional
                rows={3}
                helper="What the student should be able to do afterwards"
                value={form.objectives}
                onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
              />
              <ErpTextarea
                label="Content"
                optional
                rows={8}
                helper="Outline, examples, practice questions"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
          </ErpCard>

          <div className="tutor-form-footer">
            <Link to="/tutor/lesson-plans" className="erp-btn-secondary">
              Cancel
            </Link>
            <ErpButton type="submit" loading={saving}>
              {saving ? 'Saving…' : id ? 'Save plan' : 'Create plan'}
            </ErpButton>
          </div>
        </form>
      )}
    </div>
  );
}
