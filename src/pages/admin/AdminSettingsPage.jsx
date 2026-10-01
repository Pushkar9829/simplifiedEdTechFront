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
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpModal,
  ErpOverflow,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';

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
const EMPTY_CONFIG = { key: '', value: '', description: '' };

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
        listSubjects({ includeInactive: 'true' }),
        listConfigs(),
      ]);
      setLookups(asList(lookupData));
      setLookupGroups(lookupData?.groups || []);
      if (lookupData?.groups?.[0] && !lookupData.groups.some((g) => g.value === group)) {
        setGroup(lookupData.groups[0].value);
      }
      setCountries(asList(c));
      setBoards(asList(b));
      setLevels(asList(l));
      setSubjects(asList(s));
      setConfigs(asList(cfg));
      catalog.reload();
    } catch (err) {
      setError(err.message);
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
  const levelOptions = catalog.options('subject_level');

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
              value: typeof row.value === 'string' ? row.value : JSON.stringify(row.value),
              description: row.description || '',
            }
          : { ...EMPTY_CONFIG }
      );
    }
    setEditing({ kind: tab, _id: row?._id || row?.key || null, key: row?.key });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
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
          levels: form.levels?.length ? form.levels : ['N/A'],
          isActive: Boolean(form.isActive),
        };
        if (editing._id) await updateSubject(editing._id, body);
        else await createSubject(body);
      } else {
        let value = form.value;
        try {
          value = JSON.parse(form.value);
        } catch {
          /* keep string */
        }
        await setConfig({ key: form.key, value, description: form.description });
      }
      setEditing(null);
      setMsg('Saved. Student, tutor, and parent dropdowns now use this list.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async () => {
    if (!pendingDelete) return;
    setError('');
    try {
      const { kind, row } = pendingDelete;
      if (kind === 'dropdowns') await deleteLookup(row._id);
      else if (kind === 'countries') await deleteCountry(row._id);
      else if (kind === 'boards') await deleteBoard(row._id);
      else if (kind === 'levels') await deleteClassLevel(row._id);
      else if (kind === 'subjects') await deleteSubject(row._id);
      else await deleteConfig(row.key);
      setPendingDelete(null);
      setMsg('Removed');
      await load();
    } catch (err) {
      setError(err.message);
      setPendingDelete(null);
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

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Add or remove every dropdown and master list used by students, tutors, and parents." />
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'dropdowns', label: `Dropdowns (${lookups.length})` },
            { value: 'countries', label: `Countries (${countries.length})` },
            { value: 'boards', label: `Boards (${boards.length})` },
            { value: 'levels', label: `Class levels (${levels.length})` },
            { value: 'subjects', label: `Subjects (${subjects.length})` },
            { value: 'configs', label: `Configs (${configs.length})` },
          ]}
        />
        {tab === 'dropdowns' && (
          <ErpSelect
            inline
            value={group}
            options={
              lookupGroups.length
                ? lookupGroups.map((g) => ({ value: g.value, label: g.label }))
                : catalog.groups.map((g) => ({ value: g.value, label: g.label }))
            }
            onChange={(e) => setGroup(e.target.value)}
          />
        )}
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder={`Search ${noun}s`} />
        <div className="avail-bar-actions">
          <ErpButton onClick={() => openEditor(null)}>Add {noun}</ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading settings…</div>
        ) : !rows.length ? (
          <div className="empty">Nothing in this list yet.</div>
        ) : list.noMatch ? (
          <div className="empty">No rows match that search.</div>
        ) : (
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {list.items.map((row) => (
              <article key={row._id || row.key} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>
                    {row.name || row.label || row.key}
                    {row.code ? <span className="erp-chip">{row.code}</span> : null}
                    {row.category ? <span className="erp-chip">{row.category}</span> : null}
                  </h3>
                  <p className="muted">
                    {tab === 'dropdowns' && `Value: ${row.value} · Sort ${row.sortOrder ?? 0}`}
                    {tab === 'countries' &&
                      `${row.currency} ${row.currencySymbol || ''} · ${row.defaultTimezone}`}
                    {(tab === 'boards' || tab === 'levels') && (row.countryId?.name || 'All countries')}
                    {tab === 'subjects' && (row.levels || []).join(', ')}
                    {tab === 'configs' &&
                      (typeof row.value === 'string' ? row.value : JSON.stringify(row.value))}
                  </p>
                  {row.description ? <p className="muted">{row.description}</p> : null}
                  {row.isActive !== undefined && (
                    <div className="booking-card-status">
                      <ErpStatusBadge status={row.isActive ? 'active' : 'inactive'}>
                        {row.isActive ? 'active' : 'inactive'}
                      </ErpStatusBadge>
                    </div>
                  )}
                </div>
                <div className="booking-card-actions">
                  <ErpButton variant="secondary" onClick={() => openEditor(row)}>
                    Edit
                  </ErpButton>
                  <ErpOverflow
                    items={[{ label: 'Remove', danger: true, onClick: () => setPendingDelete({ kind: tab, row }) }]}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun={noun} />}
      </ErpCard>

      <ErpModal
        open={Boolean(editing)}
        title={`${editing?._id || editing?.key ? 'Edit' : 'Add'} ${noun}`}
        onClose={() => setEditing(null)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </ErpButton>
            <ErpButton disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </ErpButton>
          </>
        }
      >
        {editing?.kind === 'dropdowns' && (
          <div className="erp-form-grid">
            <div className="field">
              <label>Value</label>
              <input className="erp-search" value={form.value || ''} onChange={setField('value')} />
            </div>
            <div className="field">
              <label>Label</label>
              <input className="erp-search" value={form.label || ''} onChange={setField('label')} />
            </div>
            <div className="field">
              <label>Sort order</label>
              <input className="erp-search" type="number" value={form.sortOrder ?? 0} onChange={setField('sortOrder')} />
            </div>
            <label className="row">
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={setField('isActive')} /> Active
            </label>
          </div>
        )}
        {editing?.kind === 'countries' && (
          <div className="erp-form-grid">
            <div className="field">
              <label>Name</label>
              <input className="erp-search" value={form.name || ''} onChange={setField('name')} />
            </div>
            <div className="field">
              <label>ISO code</label>
              <input className="erp-search" value={form.code || ''} onChange={setField('code')} />
            </div>
            <div className="field">
              <label>Currency</label>
              <input className="erp-search" value={form.currency || ''} onChange={setField('currency')} />
            </div>
            <div className="field">
              <label>Symbol</label>
              <input className="erp-search" value={form.currencySymbol || ''} onChange={setField('currencySymbol')} />
            </div>
            <div className="field">
              <label>Default timezone</label>
              <input className="erp-search" value={form.defaultTimezone || ''} onChange={setField('defaultTimezone')} />
            </div>
            <div className="field">
              <label>Timezones (comma separated)</label>
              <input className="erp-search" value={form.timezones || ''} onChange={setField('timezones')} />
            </div>
            <label className="row">
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={setField('isActive')} /> Active
            </label>
          </div>
        )}
        {(editing?.kind === 'boards' || editing?.kind === 'levels') && (
          <div className="erp-form-grid">
            <div className="field">
              <label>Name</label>
              <input className="erp-search" value={form.name || ''} onChange={setField('name')} />
            </div>
            {editing.kind === 'boards' ? (
              <div className="field">
                <label>Code</label>
                <input className="erp-search" value={form.code || ''} onChange={setField('code')} />
              </div>
            ) : (
              <div className="field">
                <label>Sort order</label>
                <input className="erp-search" type="number" value={form.sortOrder ?? 0} onChange={setField('sortOrder')} />
              </div>
            )}
            <ErpSelect label="Country" value={form.countryId || ''} options={countryOptions} onChange={setField('countryId')} />
            <label className="row">
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={setField('isActive')} /> Active
            </label>
          </div>
        )}
        {editing?.kind === 'subjects' && (
          <div className="erp-form-grid">
            <div className="field">
              <label>Name</label>
              <input className="erp-search" value={form.name || ''} onChange={setField('name')} />
            </div>
            <div className="field">
              <label>Code</label>
              <input className="erp-search" value={form.code || ''} onChange={setField('code')} />
            </div>
            <ErpSelect
              label="Category"
              value={form.category || ''}
              options={categoryOptions}
              onChange={setField('category')}
            />
            <div className="field">
              <label>Levels</label>
              <div className="row">
                {levelOptions.map((level) => (
                  <label key={level.value} className="row" style={{ gap: '0.35rem' }}>
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
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea className="erp-search" value={form.description || ''} onChange={setField('description')} />
            </div>
            <label className="row">
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={setField('isActive')} /> Active
            </label>
          </div>
        )}
        {editing?.kind === 'configs' && (
          <div className="erp-form-grid">
            <div className="field">
              <label>Key</label>
              <input className="erp-search" value={form.key || ''} onChange={setField('key')} readOnly={Boolean(editing.key)} />
            </div>
            <div className="field">
              <label>Value</label>
              <input className="erp-search" value={form.value || ''} onChange={setField('value')} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <input className="erp-search" value={form.description || ''} onChange={setField('description')} />
            </div>
          </div>
        )}
      </ErpModal>

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title={`Remove ${noun}`}
        message={
          pendingDelete
            ? `Remove ${pendingDelete.row.name || pendingDelete.row.label || pendingDelete.row.key}? This list is used across student, tutor, and parent screens.`
            : ''
        }
        confirmLabel="Remove"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={removeRow}
      />
    </div>
  );
}
