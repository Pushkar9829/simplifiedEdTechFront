import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createHomework, getBookingSummary, listBookings, listSubjects } from '../../api';
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
import { errorMessage } from '../../utils/errors';
import { GRADING_SCHEME_OPTIONS } from '../../utils/grading';
import {
  idOf,
  localTime,
  STUDENT_PICKER_QUERY,
  studentOptions,
  studentsFromBookings,
  subjectOptions,
} from './tutorOptions';
import './tutor.css';

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
        const preId = params.get('bookingId');
        const [bookingPage, subs, preSummary] = await Promise.all([
          listBookings(STUDENT_PICKER_QUERY),
          listSubjects(),
          preId ? getBookingSummary(preId).catch(() => null) : null,
        ]);
        let items = (bookingPage.items || []).filter((b) => b.status !== 'cancelled');
        const pre = preSummary?.booking || items.find((b) => String(b._id) === preId) || null;
        if (pre && pre.status !== 'cancelled' && !items.some((b) => String(b._id) === String(pre._id))) {
          items = [pre, ...items];
        }
        const studentList = studentsFromBookings(items);
        const subjectList = subs.items || [];
        setStudents(studentList);
        setSubjects(subjectList);
        setBookings(items);
        if (preId && !pre) setError('That booking could not be loaded. Pick the student and booking below.');
        setForm((f) => ({
          ...f,
          studentUserId: idOf(pre?.studentUserId) || studentList[0]?._id || '',
          subjectId: idOf(pre?.subjectId) || subjectList[0]?._id || '',
          bookingId: pre && pre.status !== 'cancelled' ? String(pre._id) : '',
        }));
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const studentBookings = useMemo(
    () => bookings.filter((b) => idOf(b.studentUserId) === String(form.studentUserId)),
    [bookings, form.studentUserId]
  );

  const onBooking = (bookingId) => {
    const b = bookings.find((x) => String(x._id) === String(bookingId));
    setForm((f) => ({
      ...f,
      bookingId,
      studentUserId: idOf(b?.studentUserId) || f.studentUserId,
      subjectId: idOf(b?.subjectId) || f.subjectId,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const due = new Date(form.deadline);
    if (!form.deadline || Number.isNaN(due.getTime())) {
      setError('Set a valid deadline');
      return;
    }
    if (form.gradingScheme === 'marks' && !(Number(form.maxScore) > 0)) {
      setError('Set total marks above 0');
      return;
    }
    setSaving(true);
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
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        title="New assignment"
        subtitle="Set work for a student, optionally linked to a class."
        actions={
          <Link to="/tutor/homework" className="erp-btn-ghost">
            <Icon name="arrow-left" size={16} />
            Back to homework
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
          <ErpCard heading="Student and class" description="Linking a class shows the homework in that session’s history.">
            <div className="erp-form-grid">
              <ErpSelect
                label="Student"
                required
                value={form.studentUserId}
                options={studentOptions(students)}
                helper={students.length ? undefined : 'Students appear here once they book you'}
                onChange={(e) => setForm((f) => ({ ...f, studentUserId: e.target.value, bookingId: '' }))}
              />
              <ErpSelect
                label="Linked class (optional)"
                value={form.bookingId}
                options={[
                  { value: '', label: 'No class' },
                  ...studentBookings.map((b) => ({
                    value: b._id,
                    label: `${b.subjectId?.name || 'Lesson'} · ${localTime(b.startAt)} · ${b.status}`,
                  })),
                ]}
                onChange={(e) => onBooking(e.target.value)}
              />
              <ErpSelect
                label="Subject"
                value={form.subjectId}
                options={
                  subjects.length ? subjectOptions(subjects) : [{ value: '', label: 'No subjects', disabled: true }]
                }
                onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
              />
            </div>
          </ErpCard>

          <ErpCard heading="The work">
            <div className="erp-form-grid">
              <div className="erp-form-span">
                <ErpInput
                  label="Title"
                  required
                  placeholder="e.g. Kinematics problem set 3"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="erp-form-span">
                <ErpTextarea
                  label="Instructions"
                  optional
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <ErpInput
                label="Deadline"
                type="datetime-local"
                required
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
              <div className="field">
                <label className="erp-label">
                  Attachments <span className="erp-label-optional">(optional)</span>
                </label>
                <div className="erp-file-drop tutor-file-pick">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                  <span className="muted text-erp-xs">
                    {files.length ? files.map((f) => f.name).join(', ') : 'Worksheets, images, audio or video'}
                  </span>
                </div>
              </div>
            </div>
          </ErpCard>

          <ErpCard heading="Grading">
            <div className="erp-form-grid">
              <ErpSelect
                label="Grading scheme"
                value={form.gradingScheme}
                options={GRADING_SCHEME_OPTIONS}
                onChange={(e) => setForm((f) => ({ ...f, gradingScheme: e.target.value }))}
              />
              {form.gradingScheme === 'marks' ? (
                <ErpInput
                  label="Total marks"
                  type="number"
                  min="1"
                  required
                  value={form.maxScore}
                  onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
                />
              ) : (
                <span aria-hidden="true" />
              )}
              <div className="erp-form-span">
                <ErpTextarea
                  label="Rubric"
                  optional
                  rows={3}
                  helper="What a strong answer looks like — shown to the student"
                  value={form.rubric}
                  onChange={(e) => setForm((f) => ({ ...f, rubric: e.target.value }))}
                />
              </div>
            </div>
          </ErpCard>

          <div className="tutor-form-footer">
            <span className="tutor-form-footer-note">The student is notified straight away.</span>
            <Link to="/tutor/homework" className="erp-btn-secondary">
              Cancel
            </Link>
            <ErpButton type="submit" loading={saving}>
              {saving ? 'Saving…' : 'Create assignment'}
            </ErpButton>
          </div>
        </form>
      )}
    </div>
  );
}
