import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createProject,
  getProject,
  listBookings,
  listCurrencies,
  updateProject,
} from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpInput,
  ErpPageHeader,
  ErpSelect,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { STUDENT_PICKER_QUERY, studentOptions, studentsFromBookings } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import './tutor.css';

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
    openToJoin: false,
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
        const [bookings, cur] = await Promise.all([listBookings(STUDENT_PICKER_QUERY), listCurrencies()]);
        const list = studentsFromBookings(bookings.items || []);
        setStudents(list);
        setCurrencies(asList(cur));
        if (id) {
          const p = await getProject(id);
          setForm({
            studentUserId: p.studentUserId?._id || p.studentUserId || '',
            openToJoin: Boolean(p.openToJoin),
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
        setError(errorMessage(err));
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
          openToJoin: form.openToJoin,
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
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const backTo = id ? `/tutor/projects/${id}` : '/tutor/projects';

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        title={id ? 'Edit project' : 'New project'}
        subtitle="The student (or parent) pays this fee before you start."
        actions={
          <Link to={backTo} className="erp-btn-ghost">
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
        <ErpCard heading="Who it’s for">
          <div className="erp-form-grid">
            <ErpSelect
              label="Student"
              value={form.studentUserId}
              options={[
                { value: '', label: 'Open to join (no student yet)' },
                ...studentOptions(students).filter((o) => o.value),
              ]}
              disabled={Boolean(id)}
              helper={id ? 'The student cannot be changed after creating the project' : undefined}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  studentUserId: e.target.value,
                  openToJoin: !e.target.value || f.openToJoin,
                }))
              }
            />
            <div className="field">
              <span className="erp-label">Visibility</span>
              <label className="erp-check tutor-check-tile">
                <input
                  type="checkbox"
                  checked={!!form.openToJoin || !form.studentUserId}
                  onChange={(e) => setForm((f) => ({ ...f, openToJoin: e.target.checked }))}
                />
                List on “Join projects” for any student
              </label>
            </div>
          </div>
        </ErpCard>

        <ErpCard heading="Project details">
          <div className="erp-form-grid">
            <div className="erp-form-span">
              <ErpInput
                label="Name"
                required
                placeholder="e.g. Physics IA draft review"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <ErpSelect
              label="Kind"
              value={form.kind}
              options={[
                { value: 'project', label: 'Project' },
                { value: 'assignment', label: 'Assignment' },
              ]}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            />
            <ErpInput
              label="Delivery date"
              type="date"
              required
              value={form.deliveryDate}
              onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
            />
            <div className="erp-form-span">
              <ErpTextarea
                label="Description"
                optional
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {!id && (
              <div className="field erp-form-span">
                <label className="erp-label" htmlFor="project-brief">
                  Brief attachments <span className="erp-label-optional">(optional)</span>
                </label>
                <div className="erp-file-drop tutor-file-pick">
                  <input id="project-brief" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                  <span className="muted text-erp-xs">
                    {files.length ? files.map((f) => f.name).join(', ') : 'Task sheet, rubric, sample work'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ErpCard>

        <ErpCard heading="Fee">
          <div className="erp-form-grid">
            <ErpInput
              label="Fee charged to student"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              required
              helper="The student or parent pays this. Students do not receive payment."
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            <ErpSelect
              label="Currency"
              value={form.currency}
              options={(currencies.length ? currencies : [{ code: 'USD' }]).map((c) => ({
                value: c.code,
                label: c.code,
              }))}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            />
          </div>
        </ErpCard>

        <div className="tutor-form-footer">
          <Link to="/tutor/projects" className="erp-btn-secondary">
            Cancel
          </Link>
          <ErpButton type="submit" loading={saving}>
            {saving ? 'Saving…' : id ? 'Save project' : 'Create project'}
          </ErpButton>
        </div>
      </form>
    </div>
  );
}
