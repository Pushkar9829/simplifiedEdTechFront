import { useEffect, useMemo, useState } from 'react';
import { createSubject, deleteSubject, getSubject, listSubjects, updateSubject } from '../../api';
import { useCatalog } from '../../context/CatalogContext';
import {
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
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
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
import { LEVEL_OPTIONS, titleCase } from './adminOptions';
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
        const subject = await getSubject(id);
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
        if (!cancelled) setError(errorMessage(err));
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
      onSaved(isEdit ? 'Subject updated.' : 'Subject created.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ErpLoadingState message="Loading subject…" />;

  return (
    <form id="admin-subject-form" className="adm-form" onSubmit={onSubmit}>
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      <AdminFormSection title="Details">
        <ErpInput
          label="Name"
          required
          value={form.name}
          placeholder="e.g. Physics"
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <ErpInput
          label="Code"
          optional
          value={form.code}
          placeholder="e.g. PHYSICS"
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
        />
        <ErpSelect
          label="Category"
          value={form.category}
          placeholder="Select category"
          options={categoryOptions}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        />
        <div className="adm-field-group">
          <span className="erp-label">Levels</span>
          <div className="adm-checks">
            {LEVEL_OPTIONS.map((level) => (
              <label key={level.value} className="erp-check">
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
        <div className="erp-form-span">
          <ErpTextarea
            label="Description"
            optional
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </AdminFormSection>
      <AdminFormSection title="Visibility">
        <div className="erp-form-span">
          <AdminSwitch
            label="Active"
            help="Inactive subjects are hidden from new bookings and tutor offerings."
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
        </div>
      </AdminFormSection>
      <div className="adm-form-actions">
        <ErpButton variant="secondary" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </ErpButton>
        <ErpButton type="submit" loading={saving}>
          {isEdit ? 'Save changes' : 'Create subject'}
        </ErpButton>
      </div>
    </form>
  );
}

export default function AdminSubjectsPage() {
  const { options, reload: reloadCatalog } = useCatalog();
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const [msg, setMsg] = useState('');
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [categoryTab, setCategoryTab] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSubjects({ includeInactive: 'true', limit: 500 });
      setItems(data.items || []);
    } catch (err) {
      setError(errorMessage(err));
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
    if (categoryTab) rows = rows.filter((s) => (s.category || 'ibdp') === categoryTab);
    return rows;
  }, [items, tab, categoryTab]);
  const list = useListFilter(
    visible,
    (s) => [s.name, s.code, s.category, s.description].filter(Boolean).join(' '),
    { resetKey: `${tab}-${categoryTab}` }
  );
  const activeCount = items.filter((s) => s.isActive !== false).length;

  const removeSubject = async (mode) => {
    if (!pendingRemove) return;
    setRemoveBusy(true);
    setRemoveError('');
    try {
      if (mode === 'deactivate') {
        await updateSubject(pendingRemove._id, { isActive: false });
        setMsg(`${pendingRemove.name} deactivated.`);
      } else {
        await deleteSubject(pendingRemove._id);
        setMsg(`${pendingRemove.name} removed.`);
      }
      setPendingRemove(null);
      load();
      reloadCatalog?.();
    } catch (err) {
      setRemoveError(errorMessage(err));
    } finally {
      setRemoveBusy(false);
    }
  };

  const categoryLabel = (value) =>
    options('subject_category').find((o) => o.value === value)?.label || titleCase(value);

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="IBDP subjects and hobby or skill classes that tutors can offer."
        actions={
          <ErpButton icon="plus" onClick={openNew}>
            Create subject
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
            onChange={setTab}
            tabs={[
              { value: 'all', label: 'All', count: items.length || null },
              { value: 'active', label: 'Active', count: activeCount || null },
              { value: 'inactive', label: 'Inactive', count: items.length - activeCount || null },
            ]}
          />
        }
        toolbar={
          <AdminToolbar
            right={
              !loading ? (
                <span className="adm-result-count">
                  {list.total} subject{list.total === 1 ? '' : 's'}
                </span>
              ) : null
            }
          >
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search subjects" />
            <ErpSelect
              inline
              value={categoryTab}
              aria-label="Filter by category"
              options={[{ value: '', label: 'All categories' }, ...options('subject_category')]}
              onChange={(e) => setCategoryTab(e.target.value)}
            />
          </AdminToolbar>
        }
        footer={list.pages > 1 ? <ErpPager {...list.pagerProps} noun="subject" /> : null}
      >
        {loading || !visible.length || list.noMatch ? (
          <AdminListState
            loading={loading}
            empty={!visible.length}
            noMatch={list.noMatch}
            emptyProps={{
              icon: 'layers',
              title: items.length ? 'No subjects in this view' : 'No subjects yet',
              description: items.length
                ? 'Try another tab or category.'
                : 'Create the first subject tutors can offer.',
              action: items.length ? null : (
                <ErpButton icon="plus" onClick={openNew}>
                  Create subject
                </ErpButton>
              ),
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Levels</th>
                  <th>Status</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((s) => (
                  <tr key={s._id} className="erp-row-click" onClick={() => openEdit(s._id)}>
                    <td className="adm-primary">
                      <AdminCell
                        title={s.name}
                        sub={[s.code, s.description].filter(Boolean).join(' · ') || null}
                      />
                    </td>
                    <td data-label="Category">
                      {s.category ? <span className="erp-tag">{categoryLabel(s.category)}</span> : '—'}
                    </td>
                    <td data-label="Levels">
                      <span className="adm-cell-tags">
                        {(s.levels || []).map((l) => (
                          <span key={l} className="erp-chip">
                            {l}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td data-label="Status">
                      <AdminStatus status={s.isActive === false ? 'inactive' : 'active'} />
                    </td>
                    <AdminRowActions>
                      <ErpButton variant="ghost" size="sm" icon="pencil" onClick={() => openEdit(s._id)}>
                        Edit
                      </ErpButton>
                      <ErpButton
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="trash"
                        aria-label={`Remove ${s.name}`}
                        title="Remove"
                        onClick={() => {
                          setRemoveError('');
                          setPendingRemove(s);
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

      <ErpModal open={modalOpen} title={editId ? 'Edit subject' : 'Create subject'} size="md" onClose={close}>
        <SubjectForm
          key={editId || 'new'}
          id={isNew ? '' : editId}
          onSaved={(text) => {
            setMsg(text || '');
            close();
            load();
            reloadCatalog?.();
          }}
          onCancel={close}
        />
      </ErpModal>

      <ErpModal
        open={Boolean(pendingRemove)}
        title="Remove subject"
        size="sm"
        className="erp-modal-confirm"
        onClose={() => !removeBusy && setPendingRemove(null)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setPendingRemove(null)} disabled={removeBusy}>
              Cancel
            </ErpButton>
            {pendingRemove?.isActive !== false ? (
              <ErpButton variant="secondary" onClick={() => removeSubject('deactivate')} disabled={removeBusy}>
                {removeBusy ? 'Working…' : 'Deactivate instead'}
              </ErpButton>
            ) : null}
            <ErpButton variant="danger" onClick={() => removeSubject('delete')} disabled={removeBusy}>
              {removeBusy ? 'Working…' : 'Delete permanently'}
            </ErpButton>
          </>
        }
      >
        {removeError && <ErpBanner variant="danger">{removeError}</ErpBanner>}
        <p className="erp-confirm-message">
          {pendingRemove
            ? `Delete ${pendingRemove.name}? Subjects used by bookings, tutor offerings or resources cannot be deleted. Deactivating hides it from new bookings and keeps history intact.`
            : ''}
        </p>
      </ErpModal>
    </div>
  );
}
