import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createHomework, listBookings, listSubjects } from '../../api';
import { ErpSelect } from '../../components/erp';
import { formatDate } from '../../utils/format';
import { GRADING_SCHEME_OPTIONS } from '../../utils/grading';
import { studentOptions, subjectOptions } from './tutorOptions';

const emptyForm = {
  studentUserId: '',
  subjectId: '',
  bookingId: '',
  title: '',
  description: '',
  deadline: '',
  rubric: '',
  gradingScheme: 'ib_1_7',
  maxScore: '',
};

export default function TutorHomeworkFormPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, bookingId: params.get('bookingId') || '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bookingPage, subs] = await Promise.all([listBookings(), listSubjects()]);
        const items = bookingPage.items || [];
        const uniq = {};
        items.forEach((b) => {
          const s = b.studentUserId;
          if (s?._id) uniq[s._id] = s;
        });
        const studentList = Object.values(uniq);
        const subjectList = subs.items || [];
        setStudents(studentList);
        setSubjects(subjectList);
        setBookings(items);
        const pre = items.find((b) => b._id === params.get('bookingId'));
        setForm((f) => ({
          ...f,
          studentUserId: pre?.studentUserId?._id || studentList[0]?._id || '',
          subjectId: pre?.subjectId?._id || subjectList[0]?._id || '',
          bookingId: pre?._id || f.bookingId,
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const studentBookings = useMemo(
    () => bookings.filter((b) => (b.studentUserId?._id || b.studentUserId) === form.studentUserId),
    [bookings, form.studentUserId]
  );

  const onBooking = (bookingId) => {
    const b = bookings.find((x) => x._id === bookingId);
    setForm((f) => ({
      ...f,
      bookingId,
      studentUserId: b?.studentUserId?._id || f.studentUserId,
      subjectId: b?.subjectId?._id || f.subjectId,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('studentUserId', form.studentUserId);
      fd.append('subjectId', form.subjectId);
      if (form.bookingId) fd.append('bookingId', form.bookingId);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('deadline', new Date(form.deadline).toISOString());
      fd.append('rubric', form.rubric);
      fd.append('gradingScheme', form.gradingScheme);
      if (form.gradingScheme === 'marks' && form.maxScore) fd.append('maxScore', form.maxScore);
      files.forEach((f) => fd.append('attachments', f));
      await createHomework(fd);
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
            onChange={(e) => setForm((f) => ({ ...f, studentUserId: e.target.value, bookingId: '' }))}
          />
          <ErpSelect
            label="Linked booking (optional)"
            value={form.bookingId}
            options={[
              { value: '', label: 'No booking' },
              ...studentBookings.map((b) => ({
                value: b._id,
                label: `${b.subjectId?.name || 'Lesson'} · ${formatDate(b.startAt)}`,
              })),
            ]}
            onChange={(e) => onBooking(e.target.value)}
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
          <ErpSelect
            label="Grading scheme"
            value={form.gradingScheme}
            options={GRADING_SCHEME_OPTIONS}
            onChange={(e) => setForm((f) => ({ ...f, gradingScheme: e.target.value }))}
          />
          {form.gradingScheme === 'marks' && (
            <div className="field">
              <label>Total marks</label>
              <input
                className="erp-search"
                type="number"
                min="1"
                required
                value={form.maxScore}
                onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
              />
            </div>
          )}
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
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Instructions</label>
            <textarea
              className="erp-search"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Rubric</label>
            <textarea
              className="erp-search"
              value={form.rubric}
              onChange={(e) => setForm((f) => ({ ...f, rubric: e.target.value }))}
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Attachments (worksheets, images, audio, video)</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            {files.length > 0 && <div className="muted">{files.map((f) => f.name).join(', ')}</div>}
          </div>
          <div className="erp-sticky-actions" style={{ gridColumn: '1 / -1' }}>
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
