import { useEffect, useState } from 'react';
import { deleteConfig, listConfigs, setConfig } from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpConfirm,
  ErpInput,
  ErpLoadingState,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpTextarea,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import {
  CONFIG_VALUE_TYPE_OPTIONS,
  configValueText,
  configValueType,
  parseConfigValue,
} from './adminOptions';
import {
  AdminCell,
  AdminFormSection,
  AdminListState,
  AdminRowActions,
  AdminTableCard,
  AdminToolbar,
} from './AdminKit';
import { useAdminModalQuery } from './useAdminModalQuery';

const emptyForm = { key: '', value: '', valueType: 'text', description: '' };

function ConfigForm({ configKey, existingKeys = [], onSaved, onCancel }) {
  const isEdit = Boolean(configKey);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const keyExists = !isEdit && existingKeys.includes(form.key.trim());

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
            value: configValueText(item.value),
            valueType: configValueType(item.value),
            description: item.description || '',
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
  }, [configKey, isEdit]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseConfigValue(form.value, form.valueType);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    if (!isEdit && keyExists && !overwrite) {
      setError(`A config named "${form.key.trim()}" already exists. Tick "Overwrite" to replace it.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await setConfig({ key: form.key.trim(), value: parsed.value, description: form.description });
      onSaved(isEdit ? 'Config updated.' : 'Config created.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ErpLoadingState message="Loading config…" />;

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      <AdminFormSection title="Setting">
        <div>
          <ErpInput
            label="Key"
            required
            value={form.key}
            readOnly={isEdit}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            placeholder="e.g. supportEmail"
            helper={isEdit ? 'Keys cannot be renamed.' : null}
          />
          {keyExists ? (
            <label className="erp-check" style={{ marginTop: '0.5rem' }}>
              <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
              This key already exists. Overwrite it
            </label>
          ) : null}
        </div>
        <ErpSelect
          label="Value type"
          value={form.valueType}
          options={CONFIG_VALUE_TYPE_OPTIONS}
          onChange={(e) => setForm((f) => ({ ...f, valueType: e.target.value }))}
        />
        <div className="erp-form-span">
          <ErpTextarea
            label="Value"
            className={form.valueType === 'json' ? 'adm-mono' : ''}
            rows={form.valueType === 'json' ? 8 : 2}
            value={form.value}
            placeholder={form.valueType === 'json' ? '{"key": "value"}' : 'Plain text'}
            helper={form.valueType === 'json' ? 'Must be valid JSON.' : null}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          />
        </div>
        <div className="erp-form-span">
          <ErpInput
            label="Description"
            optional
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </AdminFormSection>
      <div className="adm-form-actions">
        <ErpButton variant="secondary" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </ErpButton>
        <ErpButton type="submit" loading={saving}>
          Save config
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
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listConfigs();
      setItems(data || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const list = useListFilter(items, (c) => [c.key, c.value, c.description].filter(Boolean).join(' '));
  const create = () => {
    setMsg('');
    openNew();
  };

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Key-value platform settings read by the backend. Values can be plain text or JSON."
        actions={
          <ErpButton icon="plus" onClick={create}>
            Create config
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
        toolbar={
          <AdminToolbar
            right={
              !loading ? (
                <span className="adm-result-count">
                  {list.total} config{list.total === 1 ? '' : 's'}
                </span>
              ) : null
            }
          >
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search keys, values or descriptions" />
          </AdminToolbar>
        }
        footer={list.pages > 1 ? <ErpPager {...list.pagerProps} noun="config" /> : null}
      >
        {loading || !items.length || list.noMatch ? (
          <AdminListState
            loading={loading}
            empty={!items.length}
            noMatch={list.noMatch}
            emptyProps={{
              icon: 'list-checks',
              title: 'No configs yet',
              description: 'Add a key the backend reads, such as a support email.',
              action: (
                <ErpButton icon="plus" onClick={create}>
                  Create config
                </ErpButton>
              ),
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Type</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((c) => (
                  <tr key={c._id || c.key} className="erp-row-click" onClick={() => openEdit(c.key)}>
                    <td className="adm-primary">
                      <AdminCell title={c.key} sub={c.description || null} />
                    </td>
                    <td data-label="Value">
                      <code className="adm-code" title={typeof c.value === 'string' ? c.value : JSON.stringify(c.value)}>
                        {typeof c.value === 'string' ? c.value : JSON.stringify(c.value)}
                      </code>
                    </td>
                    <td data-label="Type">
                      <span className="erp-tag">{configValueType(c.value) === 'json' ? 'JSON' : 'Text'}</span>
                    </td>
                    <AdminRowActions>
                      <ErpButton variant="ghost" size="sm" icon="pencil" onClick={() => openEdit(c.key)}>
                        Edit
                      </ErpButton>
                      <ErpButton
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="trash"
                        aria-label={`Remove ${c.key}`}
                        title="Remove"
                        onClick={() => {
                          setDeleteError('');
                          setPendingDelete(c);
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

      <ErpModal open={modalOpen} title={editId ? 'Edit config' : 'Create config'} size="md" onClose={close}>
        <ConfigForm
          key={editId || 'new'}
          configKey={isNew ? '' : editId}
          existingKeys={items.map((c) => c.key)}
          onSaved={(text) => {
            setMsg(text || '');
            close();
            load();
          }}
          onCancel={close}
        />
      </ErpModal>

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title="Remove config"
        message={
          pendingDelete ? (
            <>
              Remove {pendingDelete.key}? Features reading this key fall back to their defaults.
              {deleteError ? (
                <span className="error-banner" style={{ display: 'block', marginTop: '0.75rem' }}>
                  {deleteError}
                </span>
              ) : null}
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Remove"
        danger
        busy={deleteBusy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          setDeleteBusy(true);
          setDeleteError('');
          try {
            await deleteConfig(pendingDelete.key);
            setMsg(`${pendingDelete.key} removed.`);
            setPendingDelete(null);
            load();
          } catch (err) {
            setDeleteError(errorMessage(err));
          } finally {
            setDeleteBusy(false);
          }
        }}
      />
    </div>
  );
}
