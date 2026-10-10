import { useEffect, useState } from 'react';
import {
  createBoard,
  createClassLevel,
  createCountry,
  deleteBoard,
  deleteClassLevel,
  deleteCountry,
  listBoards,
  listClassLevels,
  listCountries,
  updateBoard,
  updateClassLevel,
  updateCountry,
} from '../../api';
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
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalError, setModalError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = async () => {
    setLoading(true);
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
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEditor = (row) => {
    setError('');
    setMsg('');
    setModalError('');
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
    setModalError('');
    try {
      if (editing.kind === 'countries') {
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
      setMsg('Saved.');
      load();
    } catch (err) {
      setModalError(errorMessage(err));
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

  const noun = tab === 'countries' ? 'country' : tab === 'boards' ? 'board' : 'class level';
  const plural = tab === 'countries' ? 'countries' : tab === 'boards' ? 'boards' : 'class levels';
  const editingNoun =
    editing?.kind === 'countries' ? 'country' : editing?.kind === 'boards' ? 'board' : 'class level';

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Countries (currency and timezone), curriculum boards and class levels used across sign-up and search."
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
            onChange={(v) => {
              setTab(v);
              setMsg('');
              setError('');
            }}
            tabs={[
              { value: 'countries', label: 'Countries', icon: 'globe', count: countries.length },
              { value: 'boards', label: 'Boards', icon: 'book-open', count: boards.length },
              { value: 'levels', label: 'Class levels', icon: 'graduation-cap', count: levels.length },
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
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder={`Search ${plural}`} />
          </AdminToolbar>
        }
        footer={list.pages > 1 ? <ErpPager {...list.pagerProps} noun="row" /> : null}
      >
        {loading || !rows.length || list.noMatch ? (
          <AdminListState
            loading={loading}
            empty={!rows.length}
            noMatch={list.noMatch}
            emptyProps={{
              icon: tab === 'countries' ? 'globe' : tab === 'boards' ? 'book-open' : 'graduation-cap',
              title: `No ${plural} yet`,
              description: 'Add the first one to make it available in dropdowns.',
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
                {tab === 'countries' ? (
                  <tr>
                    <th>Country</th>
                    <th>Currency</th>
                    <th>Default timezone</th>
                    <th>Status</th>
                    <th className="adm-actions" aria-label="Actions" />
                  </tr>
                ) : (
                  <tr>
                    <th>Name</th>
                    <th>{tab === 'boards' ? 'Code' : 'Sort order'}</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th className="adm-actions" aria-label="Actions" />
                  </tr>
                )}
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row._id} className="erp-row-click" onClick={() => openEditor(row)}>
                    {tab === 'countries' ? (
                      <>
                        <td className="adm-primary">
                          <AdminCell title={row.name} sub={row.code || null} />
                        </td>
                        <td data-label="Currency">
                          <span className="adm-nowrap">
                            {row.currency} {row.currencySymbol ? <span className="muted">({row.currencySymbol})</span> : null}
                          </span>
                        </td>
                        <td data-label="Default timezone">
                          <AdminCell
                            title={row.defaultTimezone || '—'}
                            sub={
                              (row.timezones || []).length > 1 ? `+${row.timezones.length - 1} more` : null
                            }
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="adm-primary">
                          <strong>{row.name}</strong>
                        </td>
                        <td data-label={tab === 'boards' ? 'Code' : 'Sort order'} className="muted">
                          {tab === 'boards' ? row.code || '—' : row.sortOrder ?? 0}
                        </td>
                        <td data-label="Country">{row.countryId?.name || 'All countries'}</td>
                      </>
                    )}
                    <td data-label="Status">
                      <AdminStatus status={row.isActive ? 'active' : 'inactive'} />
                    </td>
                    <AdminRowActions>
                      <ErpButton variant="ghost" size="sm" icon="pencil" onClick={() => openEditor(row)}>
                        Edit
                      </ErpButton>
                      <ErpButton
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="trash"
                        aria-label={`Remove ${row.name}`}
                        title="Remove"
                        onClick={() => {
                          setMsg('');
                          setDeleteError('');
                          setPendingDelete(row);
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
        title={`${editing?._id ? 'Edit' : 'Add'} ${editingNoun}`}
        size="md"
        onClose={() => setEditing(null)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </ErpButton>
            <ErpButton loading={saving} onClick={save}>
              {editing?._id ? 'Save changes' : `Add ${editingNoun}`}
            </ErpButton>
          </>
        }
      >
        {modalError && <ErpBanner variant="danger">{modalError}</ErpBanner>}
        {editing?.kind === 'countries' ? (
          <div className="adm-form">
            <AdminFormSection title="Country">
              <ErpInput label="Name" value={form.name} onChange={set('name')} />
              <ErpInput label="ISO code" value={form.code} onChange={set('code')} placeholder="IN" />
            </AdminFormSection>
            <AdminFormSection title="Money and time">
              <ErpInput
                label="Currency"
                value={form.currency}
                onChange={set('currency')}
                placeholder="INR"
                helper="ISO 4217 code"
              />
              <ErpInput label="Currency symbol" optional value={form.currencySymbol} onChange={set('currencySymbol')} />
              <ErpInput
                label="Default timezone"
                value={form.defaultTimezone}
                onChange={set('defaultTimezone')}
                placeholder="Asia/Kolkata"
              />
              <ErpInput
                label="All timezones"
                optional
                value={form.timezones}
                onChange={set('timezones')}
                helper="Comma separated"
              />
              <div className="erp-form-span">
                <AdminSwitch
                  label="Active"
                  help="Inactive countries are hidden from sign-up and profile forms."
                  checked={form.isActive}
                  onChange={set('isActive')}
                />
              </div>
            </AdminFormSection>
          </div>
        ) : editing ? (
          <div className="adm-form">
            <AdminFormSection>
              <ErpInput label="Name" value={form.name} onChange={set('name')} />
              {editing.kind === 'boards' ? (
                <ErpInput label="Code" optional value={form.code} onChange={set('code')} />
              ) : (
                <ErpInput label="Sort order" type="number" value={form.sortOrder} onChange={set('sortOrder')} />
              )}
              <ErpSelect label="Country" value={form.countryId} options={countryOptions} onChange={set('countryId')} />
              <div />
              <div className="erp-form-span">
                <AdminSwitch
                  label="Active"
                  help="Inactive rows are hidden from dropdowns."
                  checked={form.isActive}
                  onChange={set('isActive')}
                />
              </div>
            </AdminFormSection>
          </div>
        ) : null}
      </ErpModal>

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title={`Remove ${noun}`}
        message={
          pendingDelete ? (
            <>
              Remove {pendingDelete.name}? This list is used across the app; consider marking it
              inactive instead.
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
            if (tab === 'countries') await deleteCountry(pendingDelete._id);
            else if (tab === 'boards') await deleteBoard(pendingDelete._id);
            else await deleteClassLevel(pendingDelete._id);
            setMsg(`${pendingDelete.name} removed.`);
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
