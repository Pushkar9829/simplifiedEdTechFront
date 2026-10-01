import { useEffect, useMemo, useState } from 'react';
import { createSubject, deleteSubject, listSubjects, updateSubject } from '../../api';
import { useCatalog } from '../../context/CatalogContext';
import {
  ErpButton,
  ErpCard,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpOverflow,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { useAdminModalQuery } from './useAdminModalQuery';

const emptyForm = {
  name: '',
  code: '',
  levels: ['HL', 'SL'],
  category: 'hobby',
  description: '',
  isActive: true,
};

function SubjectForm({ id, onSaved, onCancel }) {
  const { options } = useCatalog();
  const categoryOptions = options('subject_category');
  const levelChoices = options('subject_level');
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      setForm(emptyForm);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await listSubjects({ includeInactive: 'true' });
        const subject = (data.items || []).find((s) => s._id === id);
        if (!subject) {
          if (!cancelled) setError('Subject not found');
          return;
        }
        if (!cancelled) {
          setForm({
            name: subject.name || '',
            code: subject.code || '',
            levels: subject.levels?.length ? subject.levels : ['HL', 'SL'],
            category: subject.category || '',
            description: subject.description || '',
            isActive: subject.isActive !== false,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const toggleLevel = (level) => {
    setForm((f) => {
      const has = f.levels.includes(level);
      return {
        ...f,
        levels: has ? f.levels.filter((l) => l !== level) : [...f.levels, level],
      };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        levels: form.levels.length ? form.levels : ['HL', 'SL'],
      };
      if (isEdit) await updateSubject(id, body);
      else await createSubject(body);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty">Loading subject…</div>;

  return (
    <form id="admin-subject-form" className="grid two" onSubmit={onSubmit}>
      {error && <div className="error-banner" style={{ gridColumn: '1 / -1' }}>{error}</div>}
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
        <label>Code</label>
        <input
          className="erp-search"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Category</label>
        <select
          className="erp-search"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        >
          <option value="">Select category</option>
          {categoryOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Levels</label>
        <div className="row">
          {levelChoices.map((level) => (
            <label key={level.value} className="row" style={{ gap: '0.35rem' }}>
              <input
                type="checkbox"
                checked={form.levels.includes(level.value)}
                onChange={() => toggleLevel(level.value)}
              />
              {level.label}
            </label>
          ))}
        </div>
      </div>
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label>Description</label>
        <textarea
          className="erp-search"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <label className="row" style={{ alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
        Active
      </label>
      <div className="row" style={{ gridColumn: '1 / -1' }}>
        <ErpButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update subject' : 'Create subject'}
        </ErpButton>
        <ErpButton variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </ErpButton>
      </div>
    </form>
  );
}

export default function AdminSubjectsPage() {
  const { options } = useCatalog();
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [categoryTab, setCategoryTab] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSubjects({ includeInactive: 'true' });
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    let rows = items;
    if (tab === 'active') rows = rows.filter((s) => s.isActive !== false);
    if (tab === 'inactive') rows = rows.filter((s) => s.isActive === false);
    if (categoryTab !== 'all') rows = rows.filter((s) => (s.category || 'ibdp') === categoryTab);
    return rows;
  }, [items, tab, categoryTab]);
  const list = useListFilter(
    visible,
    (s) => [s.name, s.code, s.category, s.description].filter(Boolean).join(' '),
    { resetKey: `${tab}-${categoryTab}` }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="IBDP and hobby / skill classes. Add or edit any class from this list." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        <ErpTabs
          value={categoryTab}
          onChange={setCategoryTab}
          tabs={[
            { value: 'all', label: 'All types' },
            ...options('subject_category').map((o) => ({ value: o.value, label: o.label })),
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search subjects" />
        <div className="avail-bar-actions">
          <ErpButton onClick={openNew}>Create subject</ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading subjects…</div>
        ) : !visible.length ? (
          <div className="empty">
            No subjects.{' '}
            <button type="button" className="erp-link" onClick={openNew}>
              Create your first subject
            </button>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No subjects match that search.</div>
        ) : (
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {list.items.map((s) => (
              <article key={s._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>
                    {s.name}
                    {s.category ? <span className="erp-chip">{s.category}</span> : null}
                  </h3>
                  <p className="muted">
                    {s.code || '—'} · {(s.levels || []).join(', ')}
                  </p>
                  {s.description ? <p className="muted">{s.description}</p> : null}
                  <div className="booking-card-status">
                    <ErpStatusBadge status={s.isActive === false ? 'inactive' : 'active'}>
                      {s.isActive === false ? 'inactive' : 'active'}
                    </ErpStatusBadge>
                  </div>
                </div>
                <div className="booking-card-actions">
                  <ErpButton variant="secondary" onClick={() => openEdit(s._id)}>
                    Edit
                  </ErpButton>
                  <ErpOverflow
                    items={[
                      {
                        label: 'Remove',
                        danger: true,
                        onClick: async () => {
                          try {
                            await deleteSubject(s._id);
                            load();
                          } catch (err) {
                            setError(err.message);
                          }
                        },
                      },
                    ]}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="subject" />}
      </ErpCard>

      <ErpModal
        open={modalOpen}
        title={editId ? 'Edit subject' : 'Create subject'}
        onClose={close}
      >
        <SubjectForm
          key={editId || 'new'}
          id={isNew ? '' : editId}
          onSaved={() => {
            close();
            load();
          }}
          onCancel={close}
        />
      </ErpModal>
    </div>
  );
}
