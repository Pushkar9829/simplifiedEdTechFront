import { useEffect, useState } from 'react';
import {
  createBoard,
  createClassLevel,
  createCountry,
  listBoards,
  listClassLevels,
  listCountries,
  updateBoard,
  updateClassLevel,
  updateCountry,
} from '../../api';
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

const EMPTY_COUNTRY = {
  name: '',
  code: '',
  currency: '',
  currencySymbol: '',
  defaultTimezone: '',
  timezones: '',
  isActive: true,
};

function asList(x) {
  return Array.isArray(x) ? x : x?.items || [];
}

export default function AdminCatalogPage() {
  const [tab, setTab] = useState('countries');
  const [countries, setCountries] = useState([]);
  const [boards, setBoards] = useState([]);
  const [levels, setLevels] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [c, b, l] = await Promise.all([
        listCountries({ includeInactive: true }),
        listBoards({ includeInactive: true }),
        listClassLevels({ includeInactive: true }),
      ]);
      setCountries(asList(c));
      setBoards(asList(b));
      setLevels(asList(l));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEditor = (row) => {
    setError('');
    if (tab === 'countries') {
      setForm(
        row
          ? {
              ...EMPTY_COUNTRY,
              ...row,
              timezones: (row.timezones || []).join(', '),
            }
          : { ...EMPTY_COUNTRY }
      );
    } else {
      setForm({
        name: row?.name || '',
        code: row?.code || '',
        sortOrder: row?.sortOrder ?? 0,
        countryId: row?.countryId?._id || row?.countryId || '',
        isActive: row?.isActive ?? true,
      });
    }
    setEditing({ kind: tab, _id: row?._id || null });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      if (editing.kind === 'countries') {
        const body = {
          name: form.name,
          code: form.code.toUpperCase(),
          currency: form.currency.toUpperCase(),
          currencySymbol: form.currencySymbol,
          defaultTimezone: form.defaultTimezone || 'UTC',
          timezones: form.timezones
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          isActive: Boolean(form.isActive),
        };
        if (editing._id) await updateCountry(editing._id, body);
        else await createCountry(body);
      } else {
        const body = {
          name: form.name,
          countryId: form.countryId || null,
          isActive: Boolean(form.isActive),
          ...(editing.kind === 'boards' ? { code: form.code } : { sortOrder: Number(form.sortOrder) }),
        };
        const create = editing.kind === 'boards' ? createBoard : createClassLevel;
        const update = editing.kind === 'boards' ? updateBoard : updateClassLevel;
        if (editing._id) await update(editing._id, body);
        else await create(body);
      }
      setEditing(null);
      setMsg('Saved');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const countryOptions = [
    { value: '', label: 'All countries' },
    ...countries.map((c) => ({ value: c._id, label: `${c.name} (${c.currency})` })),
  ];

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const rows = tab === 'countries' ? countries : tab === 'boards' ? boards : levels;
  const list = useListFilter(
    rows,
    (row) => [row.name, row.code, row.currency, row.countryId?.name, row.defaultTimezone].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Countries (currency and timezone), curriculum boards and class levels." />
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'countries', label: `Countries (${countries.length})` },
            { value: 'boards', label: `Boards (${boards.length})` },
            { value: 'levels', label: `Class levels (${levels.length})` },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search catalog" />
        <div className="avail-bar-actions">
          <ErpButton onClick={() => openEditor(null)}>Add</ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {!rows.length ? (
          <div className="empty">Nothing here yet.</div>
        ) : list.noMatch ? (
          <div className="empty">No catalog rows match that search.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                {tab === 'countries' ? (
                  <tr>
                    <th>Country</th>
                    <th>Code</th>
                    <th>Currency</th>
                    <th>Default timezone</th>
                    <th>Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Name</th>
                    <th>Country</th>
                    <th>Status</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row._id} className="erp-row-click" onClick={() => openEditor(row)}>
                    {tab === 'countries' ? (
                      <>
                        <td>
                          <strong>{row.name}</strong>
                        </td>
                        <td>{row.code}</td>
                        <td>
                          {row.currency} {row.currencySymbol ? `(${row.currencySymbol})` : ''}
                        </td>
                        <td>{row.defaultTimezone}</td>
                      </>
                    ) : (
                      <>
                        <td>{row.name}</td>
                        <td>{row.countryId?.name || 'All countries'}</td>
                      </>
                    )}
                    <td>
                      <ErpStatusBadge status={row.isActive ? 'active' : 'inactive'}>
                        {row.isActive ? 'active' : 'inactive'}
                      </ErpStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="row" />}
      </ErpCard>

      <ErpModal
        open={Boolean(editing)}
        title={`${editing?._id ? 'Edit' : 'Add'} ${
          editing?.kind === 'countries' ? 'country' : editing?.kind === 'boards' ? 'board' : 'class level'
        }`}
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
        {editing?.kind === 'countries' ? (
          <div className="erp-form-grid">
            <div className="field">
              <label>Name</label>
              <input className="erp-search" value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label>ISO code</label>
              <input className="erp-search" value={form.code} onChange={set('code')} placeholder="IN" />
            </div>
            <div className="field">
              <label>Currency (ISO 4217)</label>
              <input className="erp-search" value={form.currency} onChange={set('currency')} placeholder="INR" />
            </div>
            <div className="field">
              <label>Currency symbol</label>
              <input className="erp-search" value={form.currencySymbol} onChange={set('currencySymbol')} />
            </div>
            <div className="field">
              <label>Default timezone</label>
              <input
                className="erp-search"
                value={form.defaultTimezone}
                onChange={set('defaultTimezone')}
                placeholder="Asia/Kolkata"
              />
            </div>
            <div className="field">
              <label>All timezones (comma separated)</label>
              <input className="erp-search" value={form.timezones} onChange={set('timezones')} />
            </div>
            <label className="row">
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={set('isActive')} /> Active
            </label>
          </div>
        ) : editing ? (
          <div className="erp-form-grid">
            <div className="field">
              <label>Name</label>
              <input className="erp-search" value={form.name} onChange={set('name')} />
            </div>
            {editing.kind === 'boards' ? (
              <div className="field">
                <label>Code</label>
                <input className="erp-search" value={form.code} onChange={set('code')} />
              </div>
            ) : (
              <div className="field">
                <label>Sort order</label>
                <input className="erp-search" type="number" value={form.sortOrder} onChange={set('sortOrder')} />
              </div>
            )}
            <ErpSelect label="Country" value={form.countryId} options={countryOptions} onChange={set('countryId')} />
            <label className="row">
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={set('isActive')} /> Active
            </label>
          </div>
        ) : null}
      </ErpModal>
    </div>
  );
}
