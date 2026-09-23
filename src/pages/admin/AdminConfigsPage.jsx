import { useEffect, useState } from 'react';
import { listConfigs, setConfig } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { useAdminModalQuery } from './useAdminModalQuery';

const emptyForm = { key: '', value: '', description: '' };

function ConfigForm({ configKey, onSaved, onCancel }) {
  const isEdit = Boolean(configKey);
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
        const data = await listConfigs();
        const item = (data || []).find((c) => c.key === configKey);
        if (!item) {
          if (!cancelled) setError('Config not found');
          return;
        }
        if (!cancelled) {
          setForm({
            key: item.key || '',
            value: typeof item.value === 'string' ? item.value : JSON.stringify(item.value),
            description: item.description || '',
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
  }, [configKey, isEdit]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let value = form.value;
      try {
        value = JSON.parse(form.value);
      } catch {
        /* keep string */
      }
      await setConfig({ key: form.key, value, description: form.description });
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
        <label>Key</label>
        <input
          className="erp-search"
          required
          value={form.key}
          readOnly={isEdit}
          onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
          placeholder="e.g. supportEmail"
        />
      </div>
      <div className="field">
        <label>Value (JSON or text)</label>
        <input
          className="erp-search"
          required
          value={form.value}
          onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
        />
      </div>
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label>Description</label>
        <input
          className="erp-search"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="row" style={{ gridColumn: '1 / -1' }}>
        <ErpButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save config'}
        </ErpButton>
        <ErpButton variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </ErpButton>
      </div>
    </form>
  );
}

export default function AdminConfigsPage() {
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listConfigs();
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const list = useListFilter(items, (c) => [c.key, c.value, c.description].filter(Boolean).join(' '));

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Key-value platform settings. Value may be JSON or plain text." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search configs" />
        <div className="avail-bar-actions">
          <ErpButton onClick={openNew}>Create config</ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading configs…</div>
        ) : !items.length ? (
          <div className="empty">
            No configs yet.{' '}
            <button type="button" className="erp-link" onClick={openNew}>
              Create one
            </button>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No configs match that search.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((c) => (
                  <tr
                    key={c._id || c.key}
                    className="erp-row-click"
                    onClick={() => openEdit(c.key)}
                  >
                    <td>
                      <strong>{c.key}</strong>
                    </td>
                    <td>
                      <code>
                        {typeof c.value === 'string' ? c.value : JSON.stringify(c.value)}
                      </code>
                    </td>
                    <td className="muted">{c.description || '—'}</td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(c.key);
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
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="config" />}
      </ErpCard>

      <ErpModal open={modalOpen} title={editId ? 'Edit config' : 'Create config'} onClose={close}>
        <ConfigForm
          key={editId || 'new'}
          configKey={isNew ? '' : editId}
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
