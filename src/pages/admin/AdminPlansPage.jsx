import { useEffect, useMemo, useState } from 'react';
import { createPlan, listPlans, updatePlan } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { money } from '../../utils/format';
import { useCatalog } from '../../context/CatalogContext';
import { useAdminModalQuery } from './useAdminModalQuery';

const emptyForm = {
  name: '',
  price: 49,
  description: '',
  currency: 'USD',
  billingCycle: 'monthly',
  features: '',
  audience: 'student',
  rankBoost: 0,
  isActive: true,
};

function PlanForm({ id, onSaved, onCancel }) {
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
        const data = await listPlans();
        const items = Array.isArray(data) ? data : data?.items || [];
        const plan = items.find((p) => p._id === id);
        if (!plan) {
          if (!cancelled) setError('Plan not found');
          return;
        }
        if (!cancelled) {
          setForm({
            name: plan.name || '',
            price: plan.price ?? 0,
            description: plan.description || '',
            currency: plan.currency || 'USD',
            billingCycle: plan.billingCycle || 'monthly',
            features: (plan.features || []).join(', '),
            audience: plan.audience || 'student',
            rankBoost: plan.rankBoost || 0,
            isActive: plan.isActive !== false,
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

  const payload = () => ({
    name: form.name,
    price: Number(form.price),
    description: form.description,
    currency: form.currency,
    billingCycle: form.billingCycle,
    features: form.features
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean),
    audience: form.audience,
    rankBoost: Number(form.rankBoost || 0),
    isActive: form.isActive,
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) await updatePlan(id, payload());
      else await createPlan(payload());
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty">Loading plan…</div>;

  return (
    <form className="grid two" onSubmit={onSubmit}>
      {error && <div className="error-banner" style={{ gridColumn: '1 / -1' }}>{error}</div>}
      <div className="field">
        <label>Name</label>
        <input
          className="erp-search"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Price</label>
        <input
          className="erp-search"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Currency</label>
        <input
          className="erp-search"
          value={form.currency}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
        />
      </div>
      <ErpSelect
        label="Billing cycle"
        value={form.billingCycle}
        options={options('billing_cycle')}
        onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
      />
      <ErpSelect
        label="Who can buy"
        value={form.audience}
        options={options('audience').filter((o) => o.value !== 'all')}
        onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
      />
      {form.audience === 'tutor' && (
        <div className="field">
          <label>Search rank boost</label>
          <input
            className="erp-search"
            type="number"
            min="0"
            max="100"
            value={form.rankBoost}
            onChange={(e) => setForm((f) => ({ ...f, rankBoost: e.target.value }))}
          />
        </div>
      )}
      <div className="field">
        <label>Description</label>
        <input
          className="erp-search"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Features (comma-separated)</label>
        <input
          className="erp-search"
          value={form.features}
          onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
        />
      </div>
      <label className="row" style={{ alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
        Active
      </label>
      <div className="row" style={{ gridColumn: '1 / -1' }}>
        <ErpButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update plan' : 'Create plan'}
        </ErpButton>
        <ErpButton variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </ErpButton>
      </div>
    </form>
  );
}

export default function AdminPlansPage() {
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listPlans();
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
    if (tab === 'active') return items.filter((p) => p.isActive);
    if (tab === 'inactive') return items.filter((p) => !p.isActive);
    return items;
  }, [items, tab]);
  const list = useListFilter(visible, (p) => [p.name, p.description, p.billingCycle, p.audience].filter(Boolean).join(' '), {
    resetKey: tab,
  });

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Student passes and tutor Premium plans that boost search ranking." />
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
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search plans" />
        <div className="avail-bar-actions">
          <ErpButton onClick={openNew}>Create plan</ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading plans…</div>
        ) : !visible.length ? (
          <div className="empty">
            No plans yet.{' '}
            <button type="button" className="erp-link" onClick={openNew}>
              Create your first plan
            </button>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No plans match that search.</div>
        ) : (
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {list.items.map((p) => (
              <article key={p._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>
                    {p.name}
                    <span className="erp-chip">{p.audience || 'student'}</span>
                  </h3>
                  <p className="muted">
                    {money(p.price, p.currency)} · {p.billingCycle}
                    {p.rankBoost ? ` · +${p.rankBoost} rank` : ''}
                  </p>
                  {p.description ? <p className="muted">{p.description}</p> : null}
                  <div className="booking-card-status">
                    <ErpStatusBadge status={p.isActive ? 'active' : 'inactive'}>
                      {p.isActive ? 'active' : 'inactive'}
                    </ErpStatusBadge>
                  </div>
                </div>
                <div className="booking-card-actions">
                  <ErpButton variant="secondary" onClick={() => openEdit(p._id)}>
                    Edit
                  </ErpButton>
                </div>
              </article>
            ))}
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="plan" />}
      </ErpCard>

      <ErpModal open={modalOpen} title={editId ? 'Edit plan' : 'Create plan'} onClose={close}>
        <PlanForm
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
