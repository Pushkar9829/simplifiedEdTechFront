import { useEffect, useMemo, useState } from 'react';
import {
  createResource,
  deleteResource,
  listResources,
  listSubjects,
  updateResource,
} from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { LEVEL_OPTIONS, resourceTypeOptions, subjectOptions } from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

const emptyForm = {
  title: '',
  subjectId: '',
  type: 'notes',
  level: 'HL',
  topic: '',
  description: '',
  isActive: true,
};

function ResourceForm({ id, onSaved, onCancel }) {
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [subjects, setSubjects] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const s = await listSubjects();
        const subjectList = s.items || [];
        if (cancelled) return;
        setSubjects(subjectList);

        if (isEdit) {
          const r = await listResources({ includeInactive: 'true' });
          const resource = (r.items || []).find((item) => item._id === id);
          if (!resource) {
            setError('Resource not found');
            return;
          }
          setForm({
            title: resource.title || '',
            subjectId: resource.subjectId?._id || resource.subjectId || '',
            type: resource.type || 'notes',
            level: resource.level || 'HL',
            topic: resource.topic || '',
            description: resource.description || '',
            isActive: resource.isActive !== false,
          });
        } else if (subjectList[0]) {
          setForm({ ...emptyForm, subjectId: subjectList[0]._id });
        } else {
          setForm(emptyForm);
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

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateResource(id, {
          title: form.title,
          subjectId: form.subjectId,
          type: form.type,
          level: form.level,
          topic: form.topic,
          description: form.description,
          isActive: form.isActive,
        });
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, String(v ?? '')));
        if (file) fd.append('file', file);
        await createResource(fd);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty">Loading…</div>;

  return (
    <form className="grid two" onSubmit={onSubmit}>
      {error && <div className="error-banner" style={{ gridColumn: '1 / -1' }}>{error}</div>}
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
      {!isEdit && (
        <div className="field">
          <label>File (optional)</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      )}
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
          {saving ? 'Saving…' : isEdit ? 'Update resource' : 'Create resource'}
        </ErpButton>
        <ErpButton variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </ErpButton>
      </div>
    </form>
  );
}

export default function AdminResourcesPage() {
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await listResources({
        includeInactive: 'true',
        type: filterType,
        search,
      });
      setItems(r.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterType]);

  const visible = useMemo(() => {
    if (tab === 'active') return items.filter((r) => r.isActive !== false);
    if (tab === 'inactive') return items.filter((r) => r.isActive === false);
    return items;
  }, [items, tab]);
  const list = useListFilter(visible, (r) => [r.title, r.topic, r.subjectId?.name, r.type].filter(Boolean).join(' '), {
    resetKey: `${tab}-${filterType}`,
  });

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Notes, papers, and other learning files for students." />
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
        <ErpSearch value={search} onChange={setSearch} placeholder="Search resources" />
        <ErpSelect
          inline
          value={filterType}
          options={resourceTypeOptions(true)}
          onChange={(e) => setFilterType(e.target.value)}
        />
        <div className="avail-bar-actions">
          <ErpButton variant="secondary" onClick={load}>
            Search
          </ErpButton>
          <ErpButton onClick={openNew}>Create resource</ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading resources…</div>
        ) : !visible.length ? (
          <div className="empty">
            No resources.{' '}
            <button type="button" className="erp-link" onClick={openNew}>
              Create your first resource
            </button>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No resources match that search.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((r) => (
                  <tr key={r._id} className="erp-row-click" onClick={() => openEdit(r._id)}>
                    <td>
                      <strong>{r.title}</strong>
                      {r.topic && <div className="muted">{r.topic}</div>}
                    </td>
                    <td>{r.type}</td>
                    <td>{r.subjectId?.name || '—'}</td>
                    <td>
                      <ErpStatusBadge status={r.isActive === false ? 'inactive' : 'active'}>
                        {r.isActive === false ? 'no' : 'yes'}
                      </ErpStatusBadge>
                    </td>
                    <td>
                      <div className="row" onClick={(e) => e.stopPropagation()}>
                        <ErpButton variant="secondary" onClick={() => openEdit(r._id)}>
                          View
                        </ErpButton>
                        <ErpButton variant="danger" onClick={() => setPendingDelete(r)}>
                          Delete
                        </ErpButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="resource" />}
      </ErpCard>

      <ErpModal
        open={modalOpen}
        title={editId ? 'Edit resource' : 'Create resource'}
        onClose={close}
      >
        <ResourceForm
          key={editId || 'new'}
          id={isNew ? '' : editId}
          onSaved={() => {
            close();
            load();
          }}
          onCancel={close}
        />
      </ErpModal>

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title="Delete resource"
        message={pendingDelete ? `Delete “${pendingDelete.title}”?` : ''}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await deleteResource(pendingDelete._id);
            setPendingDelete(null);
            load();
          } catch (err) {
            setError(err.message);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
