import { useEffect, useMemo, useState } from 'react';
import { createAnnouncement, listAnnouncements, updateAnnouncement } from '../../api';
import {
  ErpButton,
  ErpCard,
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
import { formatDate } from '../../utils/format';
import { useCatalog } from '../../context/CatalogContext';
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
      if (isEdit) await updateAnnouncement(id, form);
      else await createAnnouncement(form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty">Loading…</div>;

  return (
    <form className="stack" onSubmit={onSubmit}>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Title</label>
        <input
          className="erp-search"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Body</label>
        <textarea
          className="erp-search"
          required
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />
      </div>
      <div className="grid two">
        <ErpSelect
          label="Audience"
          value={form.audience}
          options={options('audience')}
          onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
        />
        <label className="row" style={{ alignItems: 'center', marginTop: '1.4rem' }}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          Active
        </label>
      </div>
      <div className="row">
        <ErpButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update' : 'Publish'}
        </ErpButton>
        <ErpButton variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </ErpButton>
      </div>
    </form>
  );
}

export default function AdminAnnouncementsPage() {
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
      setError(err.message);
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

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Platform-wide notices shown to selected audiences." />
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
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search announcements" />
        <div className="avail-bar-actions">
          <ErpButton onClick={openNew}>Create announcement</ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !visible.length ? (
          <div className="empty">
            No announcements.{' '}
            <button type="button" className="erp-link" onClick={openNew}>
              Create one
            </button>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No announcements match that search.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Audience</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((a) => (
                  <tr key={a._id} className="erp-row-click" onClick={() => openEdit(a._id)}>
                    <td>
                      <strong>{a.title}</strong>
                      {a.body && <div className="muted">{a.body}</div>}
                    </td>
                    <td>{a.audience}</td>
                    <td>
                      <ErpStatusBadge status={a.isActive === false ? 'inactive' : 'active'}>
                        {a.isActive === false ? 'inactive' : 'active'}
                      </ErpStatusBadge>
                    </td>
                    <td>{formatDate(a.createdAt)}</td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(a._id);
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
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="announcement" />}
      </ErpCard>

      <ErpModal
        open={modalOpen}
        title={editId ? 'Edit announcement' : 'Create announcement'}
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
