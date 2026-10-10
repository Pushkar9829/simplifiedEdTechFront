import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  createCourse,
  getCourse,
  listCountries,
  listLessonPlans,
  listSubjects,
  updateCourse,
} from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpInput,
  ErpPageHeader,
  ErpSelect,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { useCatalog } from '../../context/CatalogContext';
import { subjectOptions } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import './tutor.css';

const empty = {
  title: '',
  description: '',
  subjectId: '',
  level: 'HL',
  countryId: '',
  price: '0',
  currency: 'USD',
  lessonPlanIds: [],
};

export default function TutorCourseFormPage() {
  const { id } = useParams();
  const { options } = useCatalog();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [subjects, setSubjects] = useState([]);
  const [countries, setCountries] = useState([]);
  const [plans, setPlans] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [subs, ctry, lp] = await Promise.all([listSubjects(), listCountries(), listLessonPlans()]);
        const subjectList = subs.items || [];
        const countryList = Array.isArray(ctry) ? ctry : ctry.items || [];
        const planList = Array.isArray(lp) ? lp : lp.items || [];
        setSubjects(subjectList);
        setCountries(countryList);
        setPlans(planList);
        const prePlans = (params.get('plans') || '').split(',').filter(Boolean);
        if (id) {
          const { course } = await getCourse(id);
          setForm({
            title: course.title,
            description: course.description || '',
            subjectId: course.subjectId?._id || course.subjectId,
            level: course.level || 'HL',
            countryId: course.countryId?._id || '',
            price: String(course.price || 0),
            currency: course.currency || 'USD',
            lessonPlanIds: (course.lessonPlanIds || []).map((p) => p._id || p),
          });
        } else {
          setForm((f) => ({
            ...f,
            subjectId: subjectList[0]?._id || '',
            currency: countryList[0]?.currency || 'USD',
            lessonPlanIds: prePlans,
          }));
        }
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, [id, params]);

  const togglePlan = (planId) =>
    setForm((f) => ({
      ...f,
      lessonPlanIds: f.lessonPlanIds.includes(planId)
        ? f.lessonPlanIds.filter((x) => x !== planId)
        : [...f.lessonPlanIds, planId],
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('subjectId', form.subjectId);
      fd.append('level', form.level);
      fd.append('countryId', form.countryId || '');
      fd.append('price', form.price);
      fd.append('currency', form.currency);
      if (form.lessonPlanIds.length) form.lessonPlanIds.forEach((p) => fd.append('lessonPlanIds', p));
      else fd.append('lessonPlanIds', '[]');
      if (file) fd.append('thumbnail', file);
      if (id) await updateCourse(id, fd);
      else await createCourse(fd);
      navigate('/tutor/courses');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        title={id ? 'Edit course' : 'Launch course'}
        subtitle="Bundle lesson plans, set a price and publish when it’s ready."
        actions={
          <Link to="/tutor/courses" className="erp-btn-ghost">
            <Icon name="arrow-left" size={16} />
            Back
          </Link>
        }
      />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}
      <form className="tutor-form" onSubmit={onSubmit}>
        <ErpCard heading="Basics">
          <div className="erp-form-grid">
            <div className="erp-form-span">
              <ErpInput
                label="Title"
                required
                placeholder="e.g. Math AA HL — calculus in 6 weeks"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <ErpSelect
              label="Subject"
              value={form.subjectId}
              options={subjectOptions(subjects)}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            />
            <ErpSelect
              label="Level"
              value={form.level}
              options={options('subject_level')}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
            />
            <div className="erp-form-span">
              <ErpTextarea
                label="Description"
                optional
                rows={4}
                helper="What students will be able to do by the end"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
        </ErpCard>

        <ErpCard heading="Price and region">
          <div className="erp-form-grid">
            <ErpSelect
              label="Country"
              value={form.countryId}
              options={[{ value: '', label: 'Any' }, ...countries.map((c) => ({ value: c._id, label: c.name }))]}
              helper="Sets the currency"
              onChange={(e) => {
                const c = countries.find((x) => x._id === e.target.value);
                setForm((f) => ({ ...f, countryId: e.target.value, currency: c?.currency || f.currency }));
              }}
            />
            <ErpInput
              label={`Price (${form.currency})`}
              type="number"
              min="0"
              inputMode="decimal"
              helper="0 makes the course free"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            <div className="field erp-form-span">
              <label className="erp-label" htmlFor="course-thumb">
                Thumbnail <span className="erp-label-optional">(optional)</span>
              </label>
              <div className="erp-file-drop tutor-file-pick">
                <input
                  id="course-thumb"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <span className="muted text-erp-xs">{file ? file.name : 'A wide image works best'}</span>
              </div>
            </div>
          </div>
        </ErpCard>

        <ErpCard
          heading="Lesson plans"
          description="Pick the plans students get when they enrol."
          headerActions={
            plans.length ? (
              <span className="muted text-erp-sm">
                {form.lessonPlanIds.length} of {plans.length} selected
              </span>
            ) : null
          }
        >
          {!plans.length ? (
            <ErpEmptyState
              icon="list-checks"
              title="No lesson plans yet"
              action={
                <Link to="/tutor/lesson-plans/new" className="erp-btn-secondary">
                  Create a lesson plan
                </Link>
              }
            />
          ) : (
            <div className="tutor-pick-list">
              {plans.map((p) => {
                const on = form.lessonPlanIds.includes(p._id);
                return (
                  <label key={p._id} className={`tutor-slot-option${on ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => togglePlan(p._id)} />
                    <span className="tutor-mini-main">
                      <strong>{p.title}</strong>
                      {p.subjectId?.name ? <span className="muted">{p.subjectId.name}</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </ErpCard>

        <div className="tutor-form-footer">
          <Link to="/tutor/courses" className="erp-btn-secondary">
            Cancel
          </Link>
          <ErpButton type="submit" loading={saving}>
            {saving ? 'Saving…' : id ? 'Save course' : 'Create course'}
          </ErpButton>
        </div>
      </form>
    </div>
  );
}
