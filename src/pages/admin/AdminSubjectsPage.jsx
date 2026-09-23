import { useEffect, useMemo, useState } from 'react';
import { createSubject, listSubjects, updateSubject } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { useAdminModalQuery } from './useAdminModalQuery';

const emptyForm = {
  name: '',
  code: '',
  levels: ['HL', 'SL'],
  category: '',
  description: '',
  isActive: true,
};

function SubjectForm({ id, onSaved, onCancel }) {
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
        const data = await listSubjects();
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
        <input
          className="erp-search"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Levels</label>
        <div className="row">
          {['HL', 'SL', 'N/A'].map((level) => (
            <label key={level} className="row" style={{ gap: '0.35rem' }}>
              <input
                type="checkbox"
                checked={form.levels.includes(level)}
                onChange={() => toggleLevel(level)}
              />
              {level}
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
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSubjects();
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
    if (tab === 'active') return items.filter((s) => s.isActive !== false);
    if (tab === 'inactive') return items.filter((s) => s.isActive === false);
    return items;
  }, [items, tab]);
  const list = useListFilter(
    visible,
    (s) => [s.name, s.code, s.category, s.description].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="IBDP subjects used across tutors, resources, and bookings." />
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
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Levels</th>
                  <th>Category</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((s) => (
                  <tr key={s._id} className="erp-row-click" onClick={() => openEdit(s._id)}>
                    <td>
                      <strong>{s.name}</strong>
                      {s.description && <div className="muted">{s.description}</div>}
                    </td>
                    <td>{s.code || '—'}</td>
                    <td>{(s.levels || []).join(', ')}</td>
                    <td>{s.category || '—'}</td>
                    <td>
                      <ErpStatusBadge status={s.isActive === false ? 'inactive' : 'active'}>
                        {s.isActive === false ? 'no' : 'yes'}
                      </ErpStatusBadge>
                    </td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(s._id);
                        }}
                      >
                        View
                      </ErpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
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
