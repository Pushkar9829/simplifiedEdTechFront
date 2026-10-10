import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createBoard,
  createClassLevel,
  createCountry,
  createLookup,
  createSubject,
  deleteBoard,
  deleteClassLevel,
  deleteConfig,
  deleteCountry,
  deleteLookup,
  deleteSubject,
  listBoards,
  listClassLevels,
  listConfigs,
  listCountries,
  listLookups,
  listSubjects,
  setConfig,
  updateBoard,
  updateClassLevel,
  updateCountry,
  updateLookup,
  updateSubject,
} from '../../api';
import { useCatalog } from '../../context/CatalogContext';
import {
  ErpBanner,
  ErpButton,
  ErpConfirm,
  ErpInput,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpTabs,
  ErpTextarea,
  Icon,
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
import {
  CONFIG_VALUE_TYPE_OPTIONS,
  LEVEL_OPTIONS,
  configValueText,
  configValueType,
  parseConfigValue,
  titleCase,
} from './adminOptions';

// Subject levels are a fixed backend enum; they are not editable as a dropdown.
const READ_ONLY_GROUPS = ['subject_level'];

function asList(x) {
  return Array.isArray(x) ? x : x?.items || [];
}

const EMPTY_COUNTRY = {
  name: '',
  code: '',
  currency: '',
  currencySymbol: '',
  defaultTimezone: '',
  timezones: '',
  isActive: true,
};

const EMPTY_LOOKUP = { value: '', label: '', sortOrder: 0, isActive: true };
const EMPTY_SUBJECT = {
  name: '',
  code: '',
  levels: ['HL', 'SL'],
  category: 'hobby',
  description: '',
  isActive: true,
};
const EMPTY_CONFIG = { key: '', value: '', valueType: 'text', description: '' };

export default function AdminSettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'dropdowns';
  const catalog = useCatalog();
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [lookups, setLookups] = useState([]);
  const [lookupGroups, setLookupGroups] = useState([]);
  const [group, setGroup] = useState('subject_category');
  const [countries, setCountries] = useState([]);
  const [boards, setBoards] = useState([]);
  const [levels, setLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [modalError, setModalError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const setTab = (value) => {
    const next = new URLSearchParams(params);
    next.set('tab', value);
    setParams(next, { replace: true });
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [lookupData, c, b, l, s, cfg] = await Promise.all([
        listLookups({ includeInactive: true }),
        listCountries({ includeInactive: true }),
        listBoards({ includeInactive: true }),
        listClassLevels({ includeInactive: true }),
        listSubjects({ includeInactive: 'true', limit: 500 }),
        listConfigs(),
      ]);
      const editableGroups = (lookupData?.groups || []).filter(
        (g) => !READ_ONLY_GROUPS.includes(g.value)
      );
      setLookups(asList(lookupData).filter((row) => !READ_ONLY_GROUPS.includes(row.group)));
      setLookupGroups(editableGroups);
      if (editableGroups[0] && !editableGroups.some((g) => g.value === group)) {
        setGroup(editableGroups[0].value);
      }
      setCountries(asList(c));
      setBoards(asList(b));
      setLevels(asList(l));
      setSubjects(asList(s));
      setConfigs(asList(cfg));
      catalog.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const countryOptions = [
    { value: '', label: 'All countries' },
    ...countries.map((c) => ({ value: c._id, label: `${c.name} (${c.currency})` })),
  ];
  const categoryOptions = catalog.options('subject_category');
  const levelOptions = LEVEL_OPTIONS;

  const rows = useMemo(() => {
    if (tab === 'dropdowns') return lookups.filter((row) => row.group === group);
    if (tab === 'countries') return countries;
    if (tab === 'boards') return boards;
    if (tab === 'levels') return levels;
    if (tab === 'subjects') return subjects;
    return configs;
  }, [tab, lookups, group, countries, boards, levels, subjects, configs]);

  const list = useListFilter(
    rows,
    (row) =>
      [row.name, row.code, row.label, row.value, row.key, row.description, row.category, row.currency]
        .filter(Boolean)
        .join(' '),
    { resetKey: `${tab}-${group}` }
  );

  const openEditor = (row) => {
    setError('');
    setMsg('');
    setModalError('');
    if (tab === 'dropdowns') {
      setForm(row ? { ...EMPTY_LOOKUP, ...row } : { ...EMPTY_LOOKUP });
    } else if (tab === 'countries') {
      setForm(
        row
          ? { ...EMPTY_COUNTRY, ...row, timezones: (row.timezones || []).join(', ') }
          : { ...EMPTY_COUNTRY }
      );
    } else if (tab === 'boards' || tab === 'levels') {
      setForm({
        name: row?.name || '',
        code: row?.code || '',
        sortOrder: row?.sortOrder ?? 0,
        countryId: row?.countryId?._id || row?.countryId || '',
        isActive: row?.isActive ?? true,
      });
    } else if (tab === 'subjects') {
      setForm(
        row
          ? {
              ...EMPTY_SUBJECT,
              ...row,
              levels: row.levels?.length ? row.levels : ['HL', 'SL'],
            }
          : { ...EMPTY_SUBJECT, category: categoryOptions[0]?.value || 'hobby' }
      );
    } else {
      setForm(
        row
          ? {
              key: row.key,
              value: configValueText(row.value),
              valueType: configValueType(row.value),
              description: row.description || '',
            }
          : { ...EMPTY_CONFIG }
      );
    }
    setEditing({ kind: tab, _id: row?._id || row?.key || null, key: row?.key });
  };

  const save = async () => {
    if (!editing) return;
    let configValue;
    if (editing.kind === 'configs') {
      const parsed = parseConfigValue(form.value, form.valueType);
      if (parsed.error) {
        setModalError(parsed.error);
        return;
      }
      const key = String(form.key || '').trim();
      if (!editing.key && configs.some((c) => c.key === key) && !form.overwrite) {
        setModalError(`A config named "${key}" already exists. Tick "Overwrite" to replace it.`);
        return;
      }
      configValue = parsed.value;
    }
    setSaving(true);
    setModalError('');
    try {
      if (editing.kind === 'dropdowns') {
        const body = {
          group,
          value: form.value,
          label: form.label,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: Boolean(form.isActive),
        };
        if (editing._id && form._id) await updateLookup(form._id, body);
        else await createLookup(body);
      } else if (editing.kind === 'countries') {
        const body = {
          name: form.name,
          code: String(form.code || '').toUpperCase(),
          currency: String(form.currency || '').toUpperCase(),
          currencySymbol: form.currencySymbol,
          defaultTimezone: form.defaultTimezone || 'UTC',
          timezones: String(form.timezones || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          isActive: Boolean(form.isActive),
        };
        if (form._id) await updateCountry(form._id, body);
        else await createCountry(body);
      } else if (editing.kind === 'boards' || editing.kind === 'levels') {
        const body = {
          name: form.name,
          countryId: form.countryId || null,
          isActive: Boolean(form.isActive),
          ...(editing.kind === 'boards' ? { code: form.code } : { sortOrder: Number(form.sortOrder) }),
        };
        if (editing.kind === 'boards') {
          if (editing._id) await updateBoard(editing._id, body);
          else await createBoard(body);
        } else if (editing._id) await updateClassLevel(editing._id, body);
        else await createClassLevel(body);
      } else if (editing.kind === 'subjects') {
        const body = {
          name: form.name,
          code: form.code,
          category: form.category,
          description: form.description,
          levels: form.levels?.length ? form.levels : ['HL', 'SL'],
          isActive: Boolean(form.isActive),
        };
        if (editing._id) await updateSubject(editing._id, body);
        else await createSubject(body);
      } else {
        await setConfig({
          key: String(form.key || '').trim(),
          value: configValue,
          description: form.description,
        });
      }
      setEditing(null);
      setMsg('Saved. Student, tutor, and parent dropdowns now use this list.');
      await load();
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const { kind, row } = pendingDelete;
      if (kind === 'dropdowns') await deleteLookup(row._id);
      else if (kind === 'countries') await deleteCountry(row._id);
      else if (kind === 'boards') await deleteBoard(row._id);
      else if (kind === 'levels') await deleteClassLevel(row._id);
      else if (kind === 'subjects') await deleteSubject(row._id);
      else await deleteConfig(row.key);
      setPendingDelete(null);
      setMsg('Removed.');
      await load();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  const setField = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const toggleLevel = (level) => {
    setForm((f) => {
      const has = (f.levels || []).includes(level);
      return { ...f, levels: has ? f.levels.filter((x) => x !== level) : [...(f.levels || []), level] };
    });
  };

  const noun =
    tab === 'dropdowns'
      ? 'option'
      : tab === 'countries'
        ? 'country'
        : tab === 'boards'
          ? 'board'
          : tab === 'levels'
            ? 'class level'
            : tab === 'subjects'
              ? 'subject'
              : 'config';

  const plural = {
    dropdowns: 'options',
    countries: 'countries',
    boards: 'boards',
    levels: 'class levels',
    subjects: 'subjects',
    configs: 'configs',
  }[tab];

  const groupOptions = lookupGroups.length
    ? lookupGroups.map((g) => ({ value: g.value, label: g.label }))
    : catalog.groups
        .filter((g) => !READ_ONLY_GROUPS.includes(g.value))
        .map((g) => ({ value: g.value, label: g.label }));
  const groupLabel = groupOptions.find((g) => g.value === group)?.label || titleCase(group);

  const rowTitle = (row) => row.name || row.label || row.key;
  const rowSub = (row) => {
    if (tab === 'dropdowns') return `Value: ${row.value}`;
    if (tab === 'countries') return row.code || null;
    if (tab === 'configs') return row.description || null;
    if (tab === 'subjects') return row.code || null;
    if (tab === 'boards') return row.code || null;
    return null;
  };
  const detailHead = {
    dropdowns: 'Sort order',
    countries: 'Currency · timezone',
    boards: 'Country',
    levels: 'Country',
    subjects: 'Category · levels',
    configs: 'Value',
  }[tab];
  const rowDetail = (row) => {
    if (tab === 'dropdowns') return row.sortOrder ?? 0;
    if (tab === 'countries')
      return `${row.currency || ''} ${row.currencySymbol || ''} · ${row.defaultTimezone || '—'}`;
    if (tab === 'boards' || tab === 'levels') return row.countryId?.name || 'All countries';
    if (tab === 'subjects')
      return (
        <span className="adm-cell-tags">
          {row.category ? <span className="erp-tag">{titleCase(row.category)}</span> : null}
          {(row.levels || []).map((l) => (
            <span key={l} className="erp-chip">
              {l}
            </span>
          ))}
        </span>
      );
    const text = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
    return (
      <code className="adm-code" title={text}>
        {text}
      </code>
    );
  };

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Every dropdown and master list used by students, tutors and parents, in one place."
        actions={
          <ErpButton icon="plus" onClick={() => openEditor(null)}>
            Add {noun}
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
              { value: 'dropdowns', label: 'Dropdowns', count: lookups.length },
              { value: 'countries', label: 'Countries', count: countries.length },
              { value: 'boards', label: 'Boards', count: boards.length },
              { value: 'levels', label: 'Class levels', count: levels.length },
              { value: 'subjects', label: 'Subjects', count: subjects.length },
              { value: 'configs', label: 'Configs', count: configs.length },
            ]}
          />
        }
        toolbar={
          <AdminToolbar
            right={
              !loading ? (
                <span className="adm-result-count">
                  {list.total} {list.total === 1 ? noun : plural}
                </span>
              ) : null
            }
          >
            {tab === 'dropdowns' && (
              <ErpSelect
                inline
                value={group}
                aria-label="Dropdown list"
                leading={<Icon name="list-checks" size={15} />}
                options={groupOptions}
                onChange={(e) => setGroup(e.target.value)}
              />
            )}
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder={`Search ${plural}`} />
          </AdminToolbar>
        }
        footer={list.pages > 1 ? <ErpPager {...list.pagerProps} noun={noun} /> : null}
      >
        {loading || !rows.length || list.noMatch ? (
          <AdminListState
            loading={loading}
            empty={!rows.length}
            noMatch={list.noMatch}
            emptyProps={{
              icon: 'list-checks',
              title: tab === 'dropdowns' ? `No options in ${groupLabel}` : `No ${plural} yet`,
              description: 'Add the first one to make it available across the app.',
              action: (
                <ErpButton icon="plus" onClick={() => openEditor(null)}>
                  Add {noun}
                </ErpButton>
              ),
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>{tab === 'dropdowns' ? 'Label' : tab === 'configs' ? 'Key' : 'Name'}</th>
                  <th className={tab === 'dropdowns' ? 'num' : undefined}>{detailHead}</th>
                  {tab !== 'configs' ? <th>Status</th> : null}
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row._id || row.key} className="erp-row-click" onClick={() => openEditor(row)}>
                    <td className="adm-primary">
                      <AdminCell title={rowTitle(row)} sub={rowSub(row)} />
                    </td>
                    <td data-label={detailHead} className={tab === 'dropdowns' ? 'num' : undefined}>
                      {rowDetail(row)}
                    </td>
                    {tab !== 'configs' ? (
                      <td data-label="Status">
                        {row.isActive !== undefined ? (
                          <AdminStatus status={row.isActive ? 'active' : 'inactive'} />
                        ) : (
                          '—'
                        )}
                      </td>
                    ) : null}
                    <AdminRowActions>
                      <ErpButton variant="ghost" size="sm" icon="pencil" onClick={() => openEditor(row)}>
                        Edit
                      </ErpButton>
                      <ErpButton
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="trash"
                        aria-label={`Remove ${rowTitle(row)}`}
                        title="Remove"
                        onClick={() => {
                          setDeleteError('');
                          setPendingDelete({ kind: tab, row });
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

      <ErpModal
        open={Boolean(editing)}
        title={`${editing?._id || editing?.key ? 'Edit' : 'Add'} ${noun}`}
        size="md"
        onClose={() => setEditing(null)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </ErpButton>
            <ErpButton loading={saving} onClick={save}>
              {editing?._id || editing?.key ? 'Save changes' : `Add ${noun}`}
            </ErpButton>
          </>
        }
      >
        {modalError && <ErpBanner variant="danger">{modalError}</ErpBanner>}
        {editing?.kind === 'dropdowns' && (
          <div className="adm-form">
            <AdminFormSection title={groupLabel} description="Shown in student, tutor and parent dropdowns.">
              <ErpInput label="Label" value={form.label || ''} onChange={setField('label')} helper="What people see" />
              <ErpInput label="Value" value={form.value || ''} onChange={setField('value')} helper="Stored value" />
              <ErpInput label="Sort order" type="number" value={form.sortOrder ?? 0} onChange={setField('sortOrder')} />
              <div />
              <div className="erp-form-span">
                <AdminSwitch
                  label="Active"
                  help="Inactive options are hidden from dropdowns."
                  checked={form.isActive}
                  onChange={setField('isActive')}
                />
              </div>
            </AdminFormSection>
          </div>
        )}
        {editing?.kind === 'countries' && (
          <div className="adm-form">
            <AdminFormSection title="Country">
              <ErpInput label="Name" value={form.name || ''} onChange={setField('name')} />
              <ErpInput label="ISO code" value={form.code || ''} onChange={setField('code')} />
            </AdminFormSection>
            <AdminFormSection title="Money and time">
              <ErpInput label="Currency" value={form.currency || ''} onChange={setField('currency')} helper="ISO 4217 code" />
              <ErpInput label="Symbol" optional value={form.currencySymbol || ''} onChange={setField('currencySymbol')} />
              <ErpInput label="Default timezone" value={form.defaultTimezone || ''} onChange={setField('defaultTimezone')} />
              <ErpInput
                label="Timezones"
                optional
                value={form.timezones || ''}
                onChange={setField('timezones')}
                helper="Comma separated"
              />
              <div className="erp-form-span">
                <AdminSwitch label="Active" checked={form.isActive} onChange={setField('isActive')} />
              </div>
            </AdminFormSection>
          </div>
        )}
        {(editing?.kind === 'boards' || editing?.kind === 'levels') && (
          <div className="adm-form">
            <AdminFormSection>
              <ErpInput label="Name" value={form.name || ''} onChange={setField('name')} />
              {editing.kind === 'boards' ? (
                <ErpInput label="Code" optional value={form.code || ''} onChange={setField('code')} />
              ) : (
                <ErpInput label="Sort order" type="number" value={form.sortOrder ?? 0} onChange={setField('sortOrder')} />
              )}
              <ErpSelect
                label="Country"
                value={form.countryId || ''}
                options={countryOptions}
                onChange={setField('countryId')}
              />
              <div />
              <div className="erp-form-span">
                <AdminSwitch label="Active" checked={form.isActive} onChange={setField('isActive')} />
              </div>
            </AdminFormSection>
          </div>
        )}
        {editing?.kind === 'subjects' && (
          <div className="adm-form">
            <AdminFormSection>
              <ErpInput label="Name" value={form.name || ''} onChange={setField('name')} />
              <ErpInput label="Code" optional value={form.code || ''} onChange={setField('code')} />
              <ErpSelect
                label="Category"
                value={form.category || ''}
                options={categoryOptions}
                onChange={setField('category')}
              />
              <div className="adm-field-group">
                <span className="erp-label">Levels</span>
                <div className="adm-checks">
                  {levelOptions.map((level) => (
                    <label key={level.value} className="erp-check">
                      <input
                        type="checkbox"
                        checked={(form.levels || []).includes(level.value)}
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
                  value={form.description || ''}
                  onChange={setField('description')}
                />
              </div>
              <div className="erp-form-span">
                <AdminSwitch label="Active" checked={form.isActive} onChange={setField('isActive')} />
              </div>
            </AdminFormSection>
          </div>
        )}
        {editing?.kind === 'configs' && (
          <div className="adm-form">
            <AdminFormSection>
              <div>
                <ErpInput
                  label="Key"
                  value={form.key || ''}
                  onChange={setField('key')}
                  readOnly={Boolean(editing.key)}
                  helper={editing.key ? 'Keys cannot be renamed.' : null}
                />
                {!editing.key && configs.some((c) => c.key === String(form.key || '').trim()) ? (
                  <label className="erp-check" style={{ marginTop: '0.5rem' }}>
                    <input type="checkbox" checked={Boolean(form.overwrite)} onChange={setField('overwrite')} />
                    This key already exists. Overwrite it
                  </label>
                ) : null}
              </div>
              <ErpSelect
                label="Value type"
                value={form.valueType || 'text'}
                options={CONFIG_VALUE_TYPE_OPTIONS}
                onChange={setField('valueType')}
              />
              <div className="erp-form-span">
                <ErpTextarea
                  label="Value"
                  className={form.valueType === 'json' ? 'adm-mono' : ''}
                  rows={form.valueType === 'json' ? 8 : 2}
                  value={form.value || ''}
                  onChange={setField('value')}
                />
              </div>
              <div className="erp-form-span">
                <ErpInput label="Description" optional value={form.description || ''} onChange={setField('description')} />
              </div>
            </AdminFormSection>
          </div>
        )}
      </ErpModal>

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title={`Remove ${noun}`}
        message={
          pendingDelete ? (
            <>
              {`Remove ${pendingDelete.row.name || pendingDelete.row.label || pendingDelete.row.key}? This list is used across student, tutor, and parent screens.`}
              {pendingDelete.kind === 'subjects'
                ? ' Subjects in use cannot be deleted; deactivate them instead from Edit.'
                : ''}
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
        onConfirm={removeRow}
      />
    </div>
  );
}
