import { useEffect, useMemo, useState } from 'react';
import { createAnnouncement, listAnnouncements, updateAnnouncement } from '../../api';
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
import { errorMessage } from '../../utils/errors';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate } from '../../utils/format';
import { useCatalog } from '../../context/CatalogContext';
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
import { titleCase } from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

const emptyForm = {
  title: '',
  body: '',
  audience: 'all',
  isActive: true,
};

function AnnouncementForm({ id, onSaved, onCancel }) {
  const { options } = useCatalog();
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
        const data = await listAnnouncements({ activeOnly: 'false' });
        const items = Array.isArray(data) ? data : data?.items || [];
        const item = items.find((a) => a._id === id);
        if (!item) {
          if (!cancelled) setError('Announcement not found');
          return;
        }
        if (!cancelled) {
          setForm({
            title: item.title || '',
            body: item.body || '',
            audience: item.audience || 'all',
            isActive: item.isActive !== false,
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

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) await updateAnnouncement(id, form);
      else await createAnnouncement(form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ErpLoadingState message="Loading announcement…" />;

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      <AdminFormSection title="Message">
        <div className="erp-form-span">
          <ErpInput
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div className="erp-form-span">
          <ErpTextarea
            label="Body"
            required
            rows={5}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
        </div>
      </AdminFormSection>
      <AdminFormSection title="Delivery">
        <ErpSelect
          label="Audience"
          value={form.audience}
          options={options('audience')}
          onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
        />
        <div />
        <div className="erp-form-span">
          <AdminSwitch
            label="Active"
            help="Active announcements are shown to the selected audience."
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
        </div>
      </AdminFormSection>
      <div className="adm-form-actions">
        <ErpButton variant="secondary" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </ErpButton>
        <ErpButton type="submit" loading={saving} icon={isEdit ? undefined : 'megaphone'}>
          {isEdit ? 'Save changes' : 'Publish'}
        </ErpButton>
      </div>
    </form>
  );
}

export default function AdminAnnouncementsPage() {
  const { options } = useCatalog();
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listAnnouncements({ activeOnly: 'false' });
      setItems(Array.isArray(data) ? data : data?.items || []);
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
    if (tab === 'active') return items.filter((a) => a.isActive !== false);
    if (tab === 'inactive') return items.filter((a) => a.isActive === false);
    return items;
  }, [items, tab]);
  const list = useListFilter(visible, (a) => [a.title, a.body, a.audience].filter(Boolean).join(' '), {
    resetKey: tab,
  });
  const activeCount = items.filter((a) => a.isActive !== false).length;
  const audienceLabel = (value) =>
    options('audience').find((o) => o.value === value)?.label || titleCase(value || 'all');

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Platform-wide notices shown to the audiences you choose."
        actions={
          <ErpButton icon="plus" onClick={openNew}>
            Create announcement
          </ErpButton>
        }
      />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}

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
                  {list.total} announcement{list.total === 1 ? '' : 's'}
                </span>
              ) : null
            }
          >
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search announcements" />
          </AdminToolbar>
        }
        footer={list.pages > 1 ? <ErpPager {...list.pagerProps} noun="announcement" /> : null}
      >
        {loading || !visible.length || list.noMatch ? (
          <AdminListState
            loading={loading}
            empty={!visible.length}
            noMatch={list.noMatch}
            emptyProps={{
              icon: 'megaphone',
              title: items.length ? 'No announcements in this view' : 'No announcements yet',
              description: items.length
                ? 'Switch tabs to see the others.'
                : 'Publish a notice to students, tutors, parents or everyone.',
              action: items.length ? null : (
                <ErpButton icon="plus" onClick={openNew}>
                  Create announcement
                </ErpButton>
              ),
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Announcement</th>
                  <th>Audience</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((a) => (
                  <tr key={a._id} className="erp-row-click" onClick={() => openEdit(a._id)}>
                    <td className="adm-primary">
                      <AdminCell title={a.title} sub={a.body || null} />
                    </td>
                    <td data-label="Audience">
                      <span className="erp-tag">{audienceLabel(a.audience)}</span>
                    </td>
                    <td data-label="Status">
                      <AdminStatus status={a.isActive === false ? 'inactive' : 'active'} />
                    </td>
                    <td data-label="Created" className="muted adm-nowrap">
                      {formatDate(a.createdAt)}
                    </td>
                    <AdminRowActions>
                      <ErpButton variant="ghost" size="sm" icon="pencil" onClick={() => openEdit(a._id)}>
                        Edit
                      </ErpButton>
                    </AdminRowActions>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      <ErpModal
        open={modalOpen}
        title={editId ? 'Edit announcement' : 'Create announcement'}
        size="md"
        onClose={close}
      >
        <AnnouncementForm
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
