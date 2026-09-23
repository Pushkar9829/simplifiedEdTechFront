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
import { ErpSelect } from '../../components/erp';
import { LEVEL_OPTIONS, subjectOptions } from './tutorOptions';

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
        setError(err.message);
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
      if (form.countryId) fd.append('countryId', form.countryId);
      fd.append('price', form.price);
      fd.append('currency', form.currency);
      form.lessonPlanIds.forEach((p) => fd.append('lessonPlanIds', p));
      if (file) fd.append('thumbnail', file);
      if (id) await updateCourse(id, fd);
      else await createCourse(fd);
      navigate('/tutor/courses');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>{id ? 'Edit course' : 'Launch course'}</h1>
        <Link to="/tutor/courses" className="btn secondary">
          Back
        </Link>
      </div>
      {error && <div className="error-banner">{error}</div>}
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
          options={subjectOptions(subjects)}
          onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
        />
        <ErpSelect
          label="Level"
          value={form.level}
          options={LEVEL_OPTIONS}
          onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
        />
        <ErpSelect
          label="Country"
          value={form.countryId}
          options={[
            { value: '', label: 'Any' },
            ...countries.map((c) => ({ value: c._id, label: c.name })),
          ]}
          onChange={(e) => {
            const c = countries.find((x) => x._id === e.target.value);
            setForm((f) => ({ ...f, countryId: e.target.value, currency: c?.currency || f.currency }));
          }}
        />
        <div className="field">
          <label>Price ({form.currency})</label>
          <input
            className="erp-search"
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Thumbnail</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Description</label>
          <textarea
            className="erp-search"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Lesson plans in this course</label>
          {!plans.length ? (
            <p className="muted">
              No lesson plans yet. <Link to="/tutor/lesson-plans/new">Create one</Link>
            </p>
          ) : (
            <div className="stack">
              {plans.map((p) => (
                <label key={p._id} className="row">
                  <input
                    type="checkbox"
                    checked={form.lessonPlanIds.includes(p._id)}
                    onChange={() => togglePlan(p._id)}
                  />
                  {p.title}
                  <span className="muted">{p.subjectId?.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="erp-sticky-actions" style={{ gridColumn: '1 / -1' }}>
          <button className="btn" disabled={saving}>
            {saving ? 'Saving…' : id ? 'Save course' : 'Create course'}
          </button>
          <Link to="/tutor/courses" className="btn secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
