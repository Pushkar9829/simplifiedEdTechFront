import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createResource,
  getResource,
  listCurrencies,
  updateResource,
  listSubjects,
} from '../../api';
import { useCatalog } from '../../context/CatalogContext';
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
import { subjectOptions } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import './tutor.css';

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
  const { options } = useCatalog();
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
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'downloadableUntil' && !v) {
          if (id) fd.append(k, '');
          return;
        }
        fd.append(k, k === 'isDownloadable' ? String(v === 'true') : v ?? '');
      });
      if (file) fd.append('file', file);
      if (id) await updateResource(id, fd);
      else await createResource(fd);
      navigate('/tutor/resources');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const currencyOptions = (currencies.length ? currencies : [{ code: form.currency || 'USD' }]).map(
    (c) => ({ value: c.code, label: `${c.code}${c.symbol ? ` (${c.symbol})` : ''}` })
  );

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        title={id ? 'Edit resource' : 'Create resource'}
        subtitle="Share notes, worksheets or videos — free or paid."
        actions={
          <Link to="/tutor/resources" className="erp-btn-ghost">
            <Icon name="arrow-left" size={16} />
            Back to resources
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
          <ErpCard heading="What it is">
            <div className="erp-form-grid">
              <div className="erp-form-span">
                <ErpInput
                  label="Title"
                  required
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
                label="Type"
                value={form.type}
                options={options('resource_type')}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              />
              <ErpSelect
                label="Level"
                value={form.level}
                options={options('subject_level')}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
              />
              <ErpInput
                label="Topic"
                optional
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              />
              <div className="erp-form-span">
                <ErpTextarea
                  label="Description"
                  optional
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
          </ErpCard>

          <ErpCard heading="File">
            <div className="field">
              <label className="erp-label" htmlFor="resource-file">
                File <span className="erp-label-optional">{id ? '(leave empty to keep current)' : '(optional)'}</span>
              </label>
              <div className="erp-file-drop tutor-file-pick">
                <input id="resource-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <span className="muted text-erp-xs">{file ? file.name : 'PDF, document, image or video'}</span>
              </div>
            </div>
          </ErpCard>

          <ErpCard heading="Access">
            <div className="erp-form-grid">
              <ErpSelect
                label="Access"
                value={form.accessType}
                options={[
                  { value: 'free', label: 'Free' },
                  { value: 'paid', label: 'Paid' },
                ]}
                onChange={(e) => setForm((f) => ({ ...f, accessType: e.target.value }))}
              />
              {form.accessType === 'paid' ? <span aria-hidden="true" /> : null}
              {form.accessType === 'paid' && (
                <>
                  <ErpSelect
                    label="Currency"
                    value={form.currency}
                    options={currencyOptions}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  />
                  <ErpInput
                    label={`Price (${form.currency})`}
                    type="number"
                    min="0"
                    inputMode="decimal"
                    required
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
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
              <ErpInput
                label="Downloadable until"
                optional
                type="date"
                value={form.downloadableUntil}
                onChange={(e) => setForm((f) => ({ ...f, downloadableUntil: e.target.value }))}
              />
            </div>
          </ErpCard>

          <div className="tutor-form-footer">
            <Link to="/tutor/resources" className="erp-btn-secondary">
              Cancel
            </Link>
            <ErpButton type="submit" loading={saving}>
              {saving ? 'Saving…' : id ? 'Save resource' : 'Publish resource'}
            </ErpButton>
          </div>
        </form>
      )}
    </div>
  );
}
