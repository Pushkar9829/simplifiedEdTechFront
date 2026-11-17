import { useEffect, useMemo, useState } from 'react';
import { adminListSubscriptions, createPlan, listPlans, updatePlan } from '../../api';
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
} from '../../components/erp';
import { errorMessage } from '../../utils/errors';
import { useListFilter } from '../../hooks/useListFilter';
import { money } from '../../utils/format';
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
import { PLAN_AUDIENCE_OPTIONS, titleCase } from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

// Student plans (decision #2): each billing cycle is one credit period of N months.
const CYCLE_MONTHS = { one_time: 1, monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 };
const BILLING_OPTIONS = [
  { value: 'one_time', label: 'One-time · 1 month, no renewal' },
  { value: 'monthly', label: 'Monthly · 1 month, renews' },
  { value: 'quarterly', label: 'Quarterly · 3 months, renews' },
  { value: 'half_yearly', label: 'Half-yearly · 6 months, renews' },
  { value: 'yearly', label: 'Yearly · 12 months, renews' },
];
const PLAN_KIND_OPTIONS = [
  { value: 'single', label: 'Single class (1 credit)' },
  { value: 'regular', label: 'Regular · weekly pack (e.g. 4 or 8 / month)' },
  { value: 'subscription', label: 'Subscription · long-term credits' },
];
const KIND_LABEL = { single: 'Single', regular: 'Regular', subscription: 'Subscription', premium: 'Premium' };
const monthsLabel = (cycle) => {
  const m = CYCLE_MONTHS[cycle] || 1;
  return `${m} month${m === 1 ? '' : 's'}`;
};
const shortDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const emptyForm = {
  name: '',
  price: 49,
  description: '',
  currency: 'USD',
  billingCycle: 'monthly',
  features: '',
  audience: 'student',
  planKind: 'single',
  classCount: 1,
  rankBoost: 0,
  isActive: true,
};

function PlanForm({ id, onSaved, onCancel }) {
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
            planKind: plan.planKind || 'single',
            classCount: plan.classCount || 1,
            rankBoost: plan.rankBoost || 0,
            isActive: plan.isActive !== false,
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
    planKind: form.planKind,
    classCount: Number(form.classCount || 1),
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
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ErpLoadingState message="Loading plan…" />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      <AdminFormSection title="Plan">
        <ErpInput label="Name" required value={form.name} onChange={set('name')} placeholder="e.g. 10-class pass" />
        <ErpSelect
          label="Who can buy"
          value={form.audience}
          options={PLAN_AUDIENCE_OPTIONS}
          onChange={set('audience')}
        />
        <div className="erp-form-span">
          <ErpInput label="Description" optional value={form.description} onChange={set('description')} />
        </div>
        <div className="erp-form-span">
          <ErpInput
            label="Features"
            optional
            value={form.features}
            onChange={set('features')}
            helper="Comma-separated, e.g. Priority support, Recorded lessons"
          />
        </div>
      </AdminFormSection>

      <AdminFormSection title="Pricing">
        <ErpInput label="Price" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} />
        <ErpInput label="Currency" value={form.currency} onChange={set('currency')} helper="ISO code, e.g. USD" />
        <ErpSelect
          label="Billing cycle / period"
          value={form.billingCycle}
          options={
            BILLING_OPTIONS.some((o) => o.value === form.billingCycle)
              ? BILLING_OPTIONS
              : [...BILLING_OPTIONS, { value: form.billingCycle, label: titleCase(form.billingCycle) }]
          }
          onChange={set('billingCycle')}
        />
      </AdminFormSection>

      <AdminFormSection
        title={form.audience === 'tutor' ? 'Tutor benefits' : 'Student benefits'}
      >
        {form.audience !== 'tutor' ? (
          <>
            <ErpSelect
              label="Student plan type"
              value={form.planKind}
              options={PLAN_KIND_OPTIONS}
              onChange={(e) => {
                const kind = e.target.value;
                setForm((f) => ({ ...f, planKind: kind, classCount: kind === 'single' ? 1 : f.classCount }));
              }}
            />
            <ErpInput
              label="Class credits per period"
              type="number"
              min="1"
              max="500"
              value={form.classCount}
              onChange={set('classCount')}
              helper={`Usable with any tutor for ${monthsLabel(form.billingCycle)}; unused credits expire.`}
            />
          </>
        ) : (
          <ErpInput
            label="Search rank boost"
            type="number"
            min="0"
            max="100"
            value={form.rankBoost}
            onChange={set('rankBoost')}
            helper="0–100. Higher values rank Premium tutors higher in search."
          />
        )}
        <div className="erp-form-span">
          <AdminSwitch
            label="Active"
            help="Inactive plans cannot be bought; existing subscribers keep theirs."
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
          {isEdit ? 'Save changes' : 'Create plan'}
        </ErpButton>
      </div>
    </form>
  );
}

function SubscribersTable() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('active');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setRows(null);
    adminListSubscriptions({ status, limit: 100 })
      .then((d) => live && setRows(d?.items || []))
      .catch((err) => {
        if (!live) return;
        setError(errorMessage(err));
        setRows([]);
      });
    return () => {
      live = false;
    };
  }, [status]);

  return (
    <>
      <AdminToolbar right={rows ? <span className="adm-result-count">{rows.length} shown</span> : null}>
        <ErpSelect
          inline
          aria-label="Filter by status"
          value={status}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: '', label: 'All statuses' },
          ]}
          onChange={(e) => setStatus(e.target.value)}
        />
      </AdminToolbar>
      {error ? <ErpBanner variant="danger">{error}</ErpBanner> : null}
      {!rows || !rows.length ? (
        <AdminListState
          loading={!rows}
          empty={Boolean(rows) && !rows.length}
          emptyProps={{
            icon: 'ticket',
            title: 'No subscriptions here',
            description: 'Student plans appear once their invoice is paid.',
          }}
        />
      ) : (
        <div className="erp-table-scroll">
          <table className="erp-data-table adm-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Plan</th>
                <th className="num">Credits left</th>
                <th>Period</th>
                <th>Auto-renew</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s._id}>
                  <td className="adm-primary">
                    <AdminCell
                      title={s.studentUserId?.name || s.studentUserId?.phone || 'Student'}
                      sub={
                        s.payerUserId && s.payerUserId._id !== s.studentUserId?._id
                          ? `Paid by ${s.payerUserId.name || s.payerUserId.role || 'parent'}`
                          : s.studentUserId?.phone || null
                      }
                    />
                  </td>
                  <td data-label="Plan">
                    <AdminCell title={s.planName || s.planId?.name || '—'} sub={KIND_LABEL[s.planKind] || null} />
                  </td>
                  <td className="num" data-label="Credits left">
                    {s.creditsLeft} / {s.classesTotal}
                  </td>
                  <td data-label="Period" className="muted">
                    {shortDate(s.periodStart)} – {shortDate(s.periodEnd)}
                  </td>
                  <td data-label="Auto-renew">{s.autoRenew ? 'On' : 'Off'}</td>
                  <td data-label="Status">
                    <AdminStatus status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminPlansPage() {
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [audience, setAudience] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listPlans();
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
    let rows = items;
    if (tab === 'active') rows = rows.filter((p) => p.isActive);
    if (tab === 'inactive') rows = rows.filter((p) => !p.isActive);
    if (audience) rows = rows.filter((p) => (p.audience || 'student') === audience);
    return rows;
  }, [items, tab, audience]);
  const list = useListFilter(
    visible,
    (p) => [p.name, p.description, p.billingCycle, p.audience].filter(Boolean).join(' '),
    { resetKey: `${tab}-${audience}` }
  );
  const activeCount = items.filter((p) => p.isActive).length;

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Student class passes and tutor Premium plans that boost search ranking."
        actions={
          <ErpButton icon="plus" onClick={openNew}>
            Create plan
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
              { value: 'subscribers', label: 'Student subscriptions' },
            ]}
          />
        }
        toolbar={
          tab === 'subscribers' ? null : (
          <AdminToolbar
            right={
              !loading ? (
                <span className="adm-result-count">
                  {list.total} plan{list.total === 1 ? '' : 's'}
                </span>
              ) : null
            }
          >
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search plans" />
            <ErpSelect
              inline
              value={audience}
              aria-label="Filter by audience"
              options={[{ value: '', label: 'All audiences' }, ...PLAN_AUDIENCE_OPTIONS]}
              onChange={(e) => setAudience(e.target.value)}
            />
          </AdminToolbar>
          )
        }
        footer={tab !== 'subscribers' && list.pages > 1 ? <ErpPager {...list.pagerProps} noun="plan" /> : null}
      >
        {tab === 'subscribers' ? (
          <SubscribersTable />
        ) : loading || !visible.length || list.noMatch ? (
          <AdminListState
            loading={loading}
            empty={!visible.length}
            noMatch={list.noMatch}
            emptyProps={{
              icon: 'tag',
              title: items.length ? 'No plans in this view' : 'No plans yet',
              description: items.length
                ? 'Try another tab or audience.'
                : 'Create a class pass for students or a Premium plan for tutors.',
              action: items.length ? null : (
                <ErpButton icon="plus" onClick={openNew}>
                  Create plan
                </ErpButton>
              ),
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Audience</th>
                  <th>Includes</th>
                  <th className="num">Price</th>
                  <th>Status</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p._id} className="erp-row-click" onClick={() => openEdit(p._id)}>
                    <td className="adm-primary">
                      <AdminCell title={p.name} sub={p.description || null} />
                    </td>
                    <td data-label="Audience">
                      <span className={`erp-tag${p.audience === 'tutor' ? ' erp-chip-brand' : ''}`}>
                        {p.audience === 'tutor' ? 'Tutors' : 'Students'}
                      </span>
                    </td>
                    <td data-label="Includes" className="muted">
                      {p.audience === 'tutor'
                        ? p.rankBoost
                          ? `+${p.rankBoost} search rank`
                          : '—'
                        : `${p.classCount || 1} class${(p.classCount || 1) === 1 ? '' : 'es'}${
                            p.planKind ? ` · ${KIND_LABEL[p.planKind] || titleCase(p.planKind)}` : ''
                          } · ${monthsLabel(p.billingCycle)}`}
                    </td>
                    <td className="num" data-label="Price">
                      <AdminCell title={<span className="adm-money">{money(p.price, p.currency)}</span>} sub={titleCase(p.billingCycle)} />
                    </td>
                    <td data-label="Status">
                      <AdminStatus status={p.isActive ? 'active' : 'inactive'} />
                    </td>
                    <AdminRowActions>
                      <ErpButton variant="ghost" size="sm" icon="pencil" onClick={() => openEdit(p._id)}>
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

      <ErpModal open={modalOpen} title={editId ? 'Edit plan' : 'Create plan'} size="md" onClose={close}>
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
