import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createResource,
  getResource,
  listCurrencies,
  updateResource,
  listSubjects,
} from '../../api';
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
  accessType: 'free',
  price: '0',
  currency: 'USD',
  isDownloadable: 'true',
  downloadableUntil: '',
};

function asList(x) {
  return Array.isArray(x) ? x : x?.items || [];
}

export default function TutorResourceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [subs, cur] = await Promise.all([listSubjects(), listCurrencies()]);
        const list = subs.items || [];
        setSubjects(list);
        setCurrencies(asList(cur));
        if (id) {
          const r = await getResource(id);
          setForm({
            title: r.title || '',
            subjectId: r.subjectId?._id || r.subjectId || '',
            type: r.type || 'notes',
            level: r.level || 'HL',
            topic: r.topic || '',
            description: r.description || '',
            accessType: r.accessType || 'free',
            price: String(r.price || 0),
            currency: r.currency || 'USD',
            isDownloadable: r.isDownloadable === false ? 'false' : 'true',
            downloadableUntil: r.downloadableUntil
              ? new Date(r.downloadableUntil).toISOString().slice(0, 10)
              : '',
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
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'downloadableUntil' && !v) return;
        fd.append(k, k === 'isDownloadable' ? String(v === 'true') : v ?? '');
      });
      if (file) fd.append('file', file);
      if (id) await updateResource(id, fd);
      else await createResource(fd);
      navigate('/tutor/resources');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const currencyOptions = (currencies.length ? currencies : [{ code: form.currency || 'USD' }]).map(
    (c) => ({ value: c.code, label: `${c.code}${c.symbol ? ` (${c.symbol})` : ''}` })
  );

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{id ? 'Edit resource' : 'Create resource'}</h1>
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
          <ErpSelect
            label="Access"
            value={form.accessType}
            options={[
              { value: 'free', label: 'Free' },
              { value: 'paid', label: 'Paid' },
            ]}
            onChange={(e) => setForm((f) => ({ ...f, accessType: e.target.value }))}
          />
          {form.accessType === 'paid' && (
            <>
              <ErpSelect
                label="Currency"
                value={form.currency}
                options={currencyOptions}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
              <div className="field">
                <label>Price ({form.currency})</label>
                <input
                  className="erp-search"
                  type="number"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
            </>
          )}
          <ErpSelect
            label="Downloadable"
            value={form.isDownloadable}
            options={[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No — view only' },
            ]}
            onChange={(e) => setForm((f) => ({ ...f, isDownloadable: e.target.value }))}
          />
          <div className="field">
            <label>Downloadable until</label>
            <input
              className="erp-search"
              type="date"
              value={form.downloadableUntil}
              onChange={(e) => setForm((f) => ({ ...f, downloadableUntil: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>File {id ? '(leave empty to keep current)' : '(optional)'}</label>
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
          <div className="erp-sticky-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : id ? 'Save resource' : 'Publish resource'}
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
