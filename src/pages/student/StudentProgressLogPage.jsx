import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addStudyHours, listSubjects } from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpInput,
  ErpLoadingState,
  ErpPageHeader,
  ErpSelect,
  Icon,
} from '../../components/erp';
import { subjectOptions } from './studentOptions';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../utils/errors';
import { LinkButton } from './studentUi';
import './student.css';

const QUICK_HOURS = [0.5, 1, 1.5, 2, 3];

export default function StudentProgressLogPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ subjectId: '', hours: 1, topic: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSubjects()
      .then((s) => {
        const all = s.items || [];
        const mine = new Set((profile?.subjectIds || []).map((x) => String(x?._id || x)));
        // The student's own subjects first, then the rest of the catalogue.
        const list = [...all.filter((x) => mine.has(String(x._id))), ...all.filter((x) => !mine.has(String(x._id)))];
        setSubjects(list);
        if (list[0]) setForm((f) => (f.subjectId ? f : { ...f, subjectId: list[0]._id }));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [profile]);

  return (
    <div className="page stack st-page" style={{ maxWidth: 720 }}>
      <Link to="/student/progress" className="st-back">
        <Icon name="chevron-left" size={16} /> Progress
      </Link>
      <ErpPageHeader title="Log study hours" subtitle="Record time spent studying. It counts towards your streak and credits." />

      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      {loading ? (
        <ErpLoadingState message="Loading subjects…" />
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setError('');
            try {
              await addStudyHours({
                ...form,
                hours: Number(form.hours),
              });
              navigate('/student/progress');
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setSaving(false);
            }
          }}
        >
          <ErpCard>
            <div className="erp-form-grid">
              <div className="erp-form-span">
                <ErpSelect
                  label="Subject"
                  value={form.subjectId}
                  options={
                    subjects.length ? subjectOptions(subjects) : [{ value: '', label: 'No subjects', disabled: true }]
                  }
                  onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
                  helper="Your selected subjects are listed first."
                />
              </div>
              <div className="erp-form-span">
                <ErpInput
                  label="Hours"
                  type="number"
                  min="0.25"
                  step="0.25"
                  required
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                />
                <div className="row" style={{ gap: '0.375rem', marginTop: '-0.25rem' }}>
                  {QUICK_HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`st-active-chip${Number(form.hours) === h ? '' : ' st-chip-off'}`}
                      style={{ padding: '0.25rem 0.625rem' }}
                      onClick={() => setForm((f) => ({ ...f, hours: h }))}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <div className="erp-form-span">
                <ErpInput
                  label="Topic"
                  optional
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. SHM past papers"
                />
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <LinkButton to="/student/progress" variant="secondary">
                Cancel
              </LinkButton>
              <ErpButton type="submit" icon="check" loading={saving} disabled={!form.subjectId}>
                {saving ? 'Saving…' : 'Save hours'}
              </ErpButton>
            </div>
          </ErpCard>
        </form>
      )}
    </div>
  );
}
