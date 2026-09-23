import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createProject,
  getProject,
  listBookings,
  listCurrencies,
  updateProject,
} from '../../api';
import { ErpSelect } from '../../components/erp';
import { studentOptions } from './tutorOptions';

function asList(x) {
  return Array.isArray(x) ? x : x?.items || [];
}

export default function TutorProjectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState({
    studentUserId: '',
    kind: 'project',
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    deliveryDate: '',
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [bookings, cur] = await Promise.all([listBookings(), listCurrencies()]);
        const uniq = {};
        (bookings.items || []).forEach((b) => {
          if (b.studentUserId?._id) uniq[b.studentUserId._id] = b.studentUserId;
        });
        const list = Object.values(uniq);
        setStudents(list);
        setCurrencies(asList(cur));
        if (id) {
          const p = await getProject(id);
          setForm({
            studentUserId: p.studentUserId?._id || p.studentUserId || '',
            kind: p.kind || 'project',
            name: p.name || '',
            description: p.description || '',
            price: String(p.price ?? ''),
            currency: p.currency || 'USD',
            deliveryDate: p.deliveryDate ? new Date(p.deliveryDate).toISOString().slice(0, 10) : '',
          });
        } else {
          setForm((f) => ({ ...f, studentUserId: list[0]?._id || '' }));
        }
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        await updateProject(id, {
          name: form.name,
          description: form.description,
          kind: form.kind,
          price: Number(form.price || 0),
          currency: form.currency,
          deliveryDate: new Date(form.deliveryDate).toISOString(),
        });
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) =>
          fd.append(k, k === 'deliveryDate' ? new Date(v).toISOString() : v)
        );
        files.forEach((f) => fd.append('attachments', f));
        await createProject(fd);
      }
      navigate(id ? `/tutor/projects/${id}` : '/tutor/projects');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>{id ? 'Edit project' : 'New project'}</h1>
        <Link to={id ? `/tutor/projects/${id}` : '/tutor/projects'} className="btn secondary">
          Back
        </Link>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form className="erp-card grid two" onSubmit={onSubmit}>
        <ErpSelect
          label="Student"
          value={form.studentUserId}
          options={studentOptions(students)}
          disabled={Boolean(id)}
          onChange={(e) => setForm((f) => ({ ...f, studentUserId: e.target.value }))}
        />
        <ErpSelect
          label="Kind"
          value={form.kind}
          options={[
            { value: 'project', label: 'Project' },
            { value: 'assignment', label: 'Paid assignment' },
          ]}
          onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
        />
        <div className="field">
          <label>Name</label>
          <input
            className="erp-search"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Delivery date</label>
          <input
            className="erp-search"
            type="date"
            required
            value={form.deliveryDate}
            onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Price</label>
          <input
            className="erp-search"
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </div>
        <ErpSelect
          label="Currency"
          value={form.currency}
          options={(currencies.length ? currencies : [{ code: 'USD' }]).map((c) => ({
            value: c.code,
            label: c.code,
          }))}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
        />
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Description</label>
          <textarea
            className="erp-search"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        {!id && (
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Brief attachments</label>
            <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </div>
        )}
        <div className="erp-sticky-actions" style={{ gridColumn: '1 / -1' }}>
          <button className="btn" disabled={saving}>
            {saving ? 'Saving…' : id ? 'Save project' : 'Create project'}
          </button>
          <Link to="/tutor/projects" className="btn secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
