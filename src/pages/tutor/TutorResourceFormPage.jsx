import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createResource, listSubjects } from '../../api';
import { ErpSelect } from '../../components/erp';
import {
  LEVEL_OPTIONS,
  resourceTypeOptions,
  subjectOptions,
} from './tutorOptions';

const emptyForm = {
  title: '',
  subjectId: '',
  type: 'notes',
  level: 'HL',
  topic: '',
  description: '',
};

export default function TutorResourceFormPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSubjects()
      .then((d) => {
        const list = d.items || [];
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
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      if (file) fd.append('file', file);
      await createResource(fd);
      navigate('/tutor/resources');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Create resource</h1>
        <Link to="/tutor/resources" className="btn secondary">
          Back to resources
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
            label="Type"
            value={form.type}
            options={resourceTypeOptions()}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          />
          <ErpSelect
            label="Level"
            value={form.level}
            options={LEVEL_OPTIONS}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
          />
          <div className="field">
            <label>Topic</label>
            <input
              className="erp-search"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>File (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea
              className="erp-search"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="row">
            <button className="btn" disabled={saving}>
              {saving ? 'Publishing…' : 'Publish resource'}
            </button>
            <Link to="/tutor/resources" className="btn secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
