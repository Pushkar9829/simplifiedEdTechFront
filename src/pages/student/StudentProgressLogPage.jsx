import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addStudyHours, listSubjects } from '../../api';
import { ErpSelect } from '../../components/erp';
import { subjectOptions } from './studentOptions';

export default function StudentProgressLogPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ subjectId: '', hours: 1, topic: '' });
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

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Log study hours</h1>
        <Link to="/student/progress" className="btn secondary">
          Back to progress
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="erp-card empty">Loading…</div>
      ) : (
        <form
          className="erp-card grid two"
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
              setError(err.message);
            } finally {
              setSaving(false);
            }
          }}
        >
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
            <label>Hours</label>
            <input
              className="erp-search"
              type="number"
              min="0.25"
              step="0.25"
              required
              value={form.hours}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Topic</label>
            <input
              className="erp-search"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="e.g. SHM past papers"
            />
          </div>
          <div className="row">
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save hours'}
            </button>
            <Link to="/student/progress" className="btn secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
