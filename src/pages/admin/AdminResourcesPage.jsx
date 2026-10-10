import { useEffect, useState } from 'react';
import {
  createResource,
  deleteResource,
  getResource,
  listResources,
  listSubjects,
  updateResource,
} from '../../api';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpInput,
  ErpLoadingState,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpTabs,
  ErpTextarea,
} from '../../components/erp';
import { useCatalog } from '../../context/CatalogContext';
import { errorMessage } from '../../utils/errors';
import { money } from '../../utils/format';
import {
  AdminCell,
  AdminFormSection,
  AdminListState,
  AdminRowActions,
  AdminStatus,
  AdminSwitch,
  AdminTableCard,
  AdminToolbar,
} from './AdminKit';
import { LEVEL_OPTIONS, subjectOptions, titleCase } from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

const PAGE_SIZE = 50;

const ACCESS_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

const emptyForm = {
  title: '',
  subjectId: '',
  type: 'notes',
  level: 'HL',
  topic: '',
  description: '',
  isActive: true,
  accessType: 'free',
  price: '',
  currency: 'USD',
  isDownloadable: true,
};

function toForm(resource) {
  return {
    title: resource.title || '',
    subjectId: resource.subjectId?._id || resource.subjectId || '',
    type: resource.type || 'notes',
    level: resource.level || 'HL',
    topic: resource.topic || '',
    description: resource.description || '',
    isActive: resource.isActive !== false,
    accessType: resource.accessType || 'free',
    price: resource.price ? String(resource.price) : '',
    currency: resource.currency || 'USD',
    isDownloadable: resource.isDownloadable !== false,
  };
}

function payloadOf(form) {
  const paid = form.accessType === 'paid';
  return {
    title: form.title,
    subjectId: form.subjectId,
    type: form.type,
    level: form.level,
    topic: form.topic,
    description: form.description,
    isActive: form.isActive,
    accessType: form.accessType,
    price: paid ? Number(form.price) : 0,
    currency: String(form.currency || 'USD').toUpperCase(),
    isDownloadable: form.isDownloadable,
  };
}

function ResourceForm({ id, onSaved, onCancel }) {
  const { options } = useCatalog();
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
        const s = await listSubjects({ limit: 500 });
        const subjectList = s.items || [];
        if (cancelled) return;
        setSubjects(subjectList);

        if (isEdit) {
          const resource = await getResource(id);
          if (cancelled) return;
          if (!resource) {
            setError('Resource not found');
            return;
          }
          setForm(toForm(resource));
        } else if (subjectList[0]) {
          setForm({ ...emptyForm, subjectId: subjectList[0]._id });
        } else {
          setForm(emptyForm);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
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
    if (form.accessType === 'paid' && !(Number(form.price) > 0)) {
      setError('Paid resources need a price greater than 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = payloadOf(form);
      if (isEdit) {
        await updateResource(id, body);
      } else {
        const fd = new FormData();
        Object.entries(body).forEach(([k, v]) => fd.append(k, String(v ?? '')));
        if (file) fd.append('file', file);
        await createResource(fd);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ErpLoadingState message="Loading resource…" />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      <AdminFormSection title="Details">
        <div className="erp-form-span">
          <ErpInput label="Title" required value={form.title} onChange={set('title')} />
        </div>
        <ErpSelect
          label="Subject"
          value={form.subjectId}
          options={
            subjects.length
              ? subjectOptions(subjects)
              : [{ value: '', label: 'No subjects', disabled: true }]
          }
          onChange={set('subjectId')}
        />
        <ErpSelect label="Type" value={form.type} options={options('resource_type')} onChange={set('type')} />
        <ErpSelect label="Level" value={form.level} options={LEVEL_OPTIONS} onChange={set('level')} />
        <ErpInput label="Topic" optional value={form.topic} onChange={set('topic')} />
        <div className="erp-form-span">
          <ErpTextarea label="Description" optional rows={3} value={form.description} onChange={set('description')} />
        </div>
        {!isEdit && (
          <div className="erp-form-span adm-field-group">
            <label className="erp-label" htmlFor="resource-file">
              File <span className="erp-label-optional">(optional)</span>
            </label>
            <input id="resource-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        )}
      </AdminFormSection>

      <AdminFormSection title="Access">
        <ErpSelect label="Access" value={form.accessType} options={ACCESS_OPTIONS} onChange={set('accessType')} />
        <div />
        {form.accessType === 'paid' ? (
          <>
            <ErpInput
              id="resource-price"
              label="Price"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price}
              onChange={set('price')}
            />
            <ErpInput
              id="resource-currency"
              label="Currency"
              maxLength={3}
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
            />
          </>
        ) : null}
        <AdminSwitch
          label="Active"
          help="Visible to students"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
        <AdminSwitch
          label="Downloadable"
          help="Students can download the file"
          checked={form.isDownloadable}
          onChange={(e) => setForm((f) => ({ ...f, isDownloadable: e.target.checked }))}
        />
      </AdminFormSection>

      <div className="adm-form-actions">
        <ErpButton variant="secondary" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </ErpButton>
        <ErpButton type="submit" loading={saving}>
          {isEdit ? 'Save changes' : 'Create resource'}
        </ErpButton>
      </div>
    </form>
  );
}

export default function AdminResourcesPage() {
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const { options, labelFor } = useCatalog();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = { includeInactive: 'true', type: filterType, search, page, limit: PAGE_SIZE };
    if (tab === 'active') params.isActive = 'true';
    if (tab === 'inactive') params.isActive = 'false';
    listResources(params)
      .then((r) => {
        if (cancelled) return;
        setItems(r?.items || []);
        setTotal(r?.total || 0);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filterType, search, tab, page, reloadKey]);

  const load = () => setReloadKey((k) => k + 1);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const removeOrDeactivate = async (mode) => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      if (mode === 'deactivate') {
        await updateResource(pendingDelete._id, { isActive: false });
        setMsg(`“${pendingDelete.title}” deactivated.`);
      } else {
        await deleteResource(pendingDelete._id);
        setMsg(`“${pendingDelete.title}” deleted.`);
      }
      setPendingDelete(null);
      load();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  const filtered = Boolean(search || filterType || tab !== 'all');
  const create = () => {
    setMsg('');
    openNew();
  };
  const typeLabel = (value) => {
    const label = labelFor ? labelFor('resource_type', value) : '';
    return label && label !== value ? label : titleCase(value);
  };

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Notes, past papers and other learning files for students."
        actions={
          <ErpButton icon="plus" onClick={create}>
            Create resource
          </ErpButton>
        }
      />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}

      <AdminTableCard
        tabs={
          <ErpTabs
            value={tab}
            onChange={(v) => {
              setTab(v);
              setPage(1);
            }}
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        }
        toolbar={
          <AdminToolbar
            right={
              <>
                {!loading ? (
                  <span className="adm-result-count">
                    {total} resource{total === 1 ? '' : 's'}
                  </span>
                ) : null}
                <ErpButton variant="ghost" size="sm" icon="refresh" onClick={load}>
                  Refresh
                </ErpButton>
              </>
            }
          >
            <ErpSearch value={searchInput} onChange={setSearchInput} placeholder="Search resources" />
            <ErpSelect
              inline
              value={filterType}
              aria-label="Filter by type"
              options={options('resource_type', { all: 'All types' })}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
            />
          </AdminToolbar>
        }
        footer={
          total > PAGE_SIZE ? (
            <ErpPager
              page={page}
              pages={pages}
              total={total}
              noun="resource"
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pages, p + 1))}
            />
          ) : null
        }
      >
        {loading || !items.length ? (
          <AdminListState
            loading={loading}
            empty
            emptyProps={{
              icon: filtered ? 'search' : 'file-text',
              title: filtered ? 'No resources match these filters' : 'No resources yet',
              description: filtered
                ? 'Try another search, type or tab.'
                : 'Upload notes, past papers or question banks for students.',
              action: filtered ? null : (
                <ErpButton icon="plus" onClick={create}>
                  Create resource
                </ErpButton>
              ),
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r._id} className="erp-row-click" onClick={() => openEdit(r._id)}>
                    <td className="adm-primary">
                      <AdminCell
                        title={r.title}
                        sub={[r.topic, r.level].filter(Boolean).join(' · ') || null}
                      />
                    </td>
                    <td data-label="Type">
                      <span className="erp-tag">{typeLabel(r.type)}</span>
                    </td>
                    <td data-label="Subject">{r.subjectId?.name || '—'}</td>
                    <td data-label="Access">
                      {r.accessType === 'paid' ? (
                        <span className="adm-money">
                          {money(Number(r.price || 0), r.currency || 'USD')}
                        </span>
                      ) : (
                        <ErpBadge tone="success">Free</ErpBadge>
                      )}
                    </td>
                    <td data-label="Status">
                      <AdminStatus status={r.isActive === false ? 'inactive' : 'active'} />
                    </td>
                    <AdminRowActions>
                      <ErpButton variant="ghost" size="sm" icon="pencil" onClick={() => openEdit(r._id)}>
                        Edit
                      </ErpButton>
                      <ErpButton
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="trash"
                        aria-label={`Delete ${r.title}`}
                        title="Delete"
                        onClick={() => {
                          setDeleteError('');
                          setPendingDelete(r);
                        }}
                      />
                    </AdminRowActions>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      <ErpModal open={modalOpen} title={editId ? 'Edit resource' : 'Create resource'} size="md" onClose={close}>
        <ResourceForm
          key={editId || 'new'}
          id={isNew ? '' : editId}
          onSaved={() => {
            setMsg(editId ? 'Resource updated.' : 'Resource created.');
            close();
            load();
          }}
          onCancel={close}
        />
      </ErpModal>

      <ErpModal
        open={Boolean(pendingDelete)}
        title="Delete resource"
        size="sm"
        className="erp-modal-confirm"
        onClose={() => !deleteBusy && setPendingDelete(null)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setPendingDelete(null)} disabled={deleteBusy}>
              Cancel
            </ErpButton>
            {pendingDelete?.isActive !== false ? (
              <ErpButton variant="secondary" onClick={() => removeOrDeactivate('deactivate')} disabled={deleteBusy}>
                {deleteBusy ? 'Working…' : 'Deactivate instead'}
              </ErpButton>
            ) : null}
            <ErpButton variant="danger" onClick={() => removeOrDeactivate('delete')} disabled={deleteBusy}>
              {deleteBusy ? 'Working…' : 'Delete permanently'}
            </ErpButton>
          </>
        }
      >
        {deleteError && <ErpBanner variant="danger">{deleteError}</ErpBanner>}
        <p className="erp-confirm-message">
          {pendingDelete
            ? `Delete “${pendingDelete.title}”? This cannot be undone and removes it for students who bought or bookmarked it.`
            : ''}
          {pendingDelete?.isActive !== false
            ? ' Deactivating hides it from students but keeps it recoverable.'
            : ''}
        </p>
      </ErpModal>
    </div>
  );
}
