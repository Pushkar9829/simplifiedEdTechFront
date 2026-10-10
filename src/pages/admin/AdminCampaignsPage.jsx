import { useEffect, useState } from 'react';
import { createCampaign, listCampaigns, updateCampaign } from '../../api';
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
  ErpStat,
  ErpTextarea,
} from '../../components/erp';
import { errorMessage } from '../../utils/errors';
import { useListFilter } from '../../hooks/useListFilter';
import { money } from '../../utils/format';
import { useCatalog } from '../../context/CatalogContext';
import {
  AdminCell,
  AdminFormSection,
  AdminListState,
  AdminRowActions,
  AdminTableCard,
  AdminToolbar,
} from './AdminKit';
import { plainAmount, titleCase } from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

const emptyForm = {
  name: '',
  channel: 'organic',
  spend: 0,
  leads: 0,
  conversions: 0,
  notes: '',
  periodStart: '',
  periodEnd: '',
};

function toDateInput(v) {
  if (!v) return '';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function CampaignForm({ id, onSaved, onCancel }) {
  const { options } = useCatalog();
  const catalogChannels = options('campaign_channel');
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
        const data = await listCampaigns();
        const items = Array.isArray(data) ? data : data?.items || [];
        const campaign = items.find((c) => c._id === id);
        if (!campaign) {
          if (!cancelled) setError('Campaign not found');
          return;
        }
        if (!cancelled) {
          setForm({
            name: campaign.name || '',
            channel: campaign.channel || 'organic',
            spend: campaign.spend ?? 0,
            leads: campaign.leads ?? 0,
            conversions: campaign.conversions ?? 0,
            notes: campaign.notes || '',
            periodStart: toDateInput(campaign.periodStart),
            periodEnd: toDateInput(campaign.periodEnd),
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

  const channelOptions = catalogChannels.some((o) => o.value === form.channel)
    ? catalogChannels
    : [
        ...catalogChannels,
        {
          value: form.channel,
          label: form.channel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        },
      ];

  const payload = () => ({
    name: form.name,
    channel: form.channel,
    spend: Number(form.spend),
    leads: Number(form.leads),
    conversions: Number(form.conversions),
    notes: form.notes,
    periodStart: form.periodStart || undefined,
    periodEnd: form.periodEnd || undefined,
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) await updateCampaign(id, payload());
      else await createCampaign(payload());
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ErpLoadingState message="Loading campaign…" />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      <AdminFormSection title="Campaign">
        <ErpInput label="Name" required value={form.name} onChange={set('name')} />
        <ErpSelect label="Channel" value={form.channel} options={channelOptions} onChange={set('channel')} />
        <ErpInput label="Period start" optional type="date" value={form.periodStart} onChange={set('periodStart')} />
        <ErpInput label="Period end" optional type="date" value={form.periodEnd} onChange={set('periodEnd')} />
      </AdminFormSection>
      <AdminFormSection title="Results" description="Entered manually; shown on the overview Campaigns tab.">
        <ErpInput label="Spend" type="number" min="0" value={form.spend} onChange={set('spend')} />
        <ErpInput label="Leads" type="number" min="0" value={form.leads} onChange={set('leads')} />
        <ErpInput label="Conversions" type="number" min="0" value={form.conversions} onChange={set('conversions')} />
        <div className="erp-form-span">
          <ErpTextarea label="Notes" optional rows={3} value={form.notes} onChange={set('notes')} />
        </div>
      </AdminFormSection>
      <div className="adm-form-actions">
        <ErpButton variant="secondary" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </ErpButton>
        <ErpButton type="submit" loading={saving}>
          {isEdit ? 'Save changes' : 'Create campaign'}
        </ErpButton>
      </div>
    </form>
  );
}

function shortDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminCampaignsPage() {
  const { labelFor } = useCatalog();
  const { isNew, editId, modalOpen, openNew, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listCampaigns();
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

  const list = useListFilter(items, (c) => [c.name, c.channel, c.notes].filter(Boolean).join(' '));
  const totals = items.reduce(
    (acc, c) => ({
      spend: acc.spend + (Number(c.spend) || 0),
      leads: acc.leads + (Number(c.leads) || 0),
      conversions: acc.conversions + (Number(c.conversions) || 0),
    }),
    { spend: 0, leads: 0, conversions: 0 }
  );
  const rate = totals.leads ? Math.round((totals.conversions / totals.leads) * 1000) / 10 : 0;
  const channelLabel = (value) => {
    const label = labelFor ? labelFor('campaign_channel', value) : '';
    return label && label !== value ? label : titleCase(value);
  };

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Marketing spend, leads and conversions entered by admins."
        actions={
          <ErpButton icon="plus" onClick={openNew}>
            Create campaign
          </ErpButton>
        }
      />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}

      {items.length ? (
        <div className="adm-kpis adm-kpis-3">
          <ErpStat label="Total spend" icon="credit-card" tone="neutral" value={plainAmount(totals.spend)} hint={`${items.length} campaigns`} />
          <ErpStat label="Leads" icon="users" value={totals.leads.toLocaleString()} />
          <ErpStat
            label="Conversions"
            icon="target"
            tone="success"
            value={totals.conversions.toLocaleString()}
            hint={`${rate}% of leads`}
          />
        </div>
      ) : null}

      <AdminTableCard
        toolbar={
          <AdminToolbar
            right={
              !loading ? (
                <span className="adm-result-count">
                  {list.total} campaign{list.total === 1 ? '' : 's'}
                </span>
              ) : null
            }
          >
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search campaigns" />
          </AdminToolbar>
        }
        footer={list.pages > 1 ? <ErpPager {...list.pagerProps} noun="campaign" /> : null}
      >
        {loading || !items.length || list.noMatch ? (
          <AdminListState
            loading={loading}
            empty={!items.length}
            noMatch={list.noMatch}
            emptyProps={{
              icon: 'trending-up',
              title: 'No campaigns yet',
              description: 'Track spend, leads and conversions for each marketing channel.',
              action: (
                <ErpButton icon="plus" onClick={openNew}>
                  Create campaign
                </ErpButton>
              ),
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Channel</th>
                  <th className="num">Spend</th>
                  <th className="num">Leads</th>
                  <th className="num">Conversions</th>
                  <th className="num">Rate</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((c) => {
                  const period = [shortDate(c.periodStart), shortDate(c.periodEnd)].filter(Boolean).join(' – ');
                  const cRate = c.leads > 0 ? Math.round((c.conversions / c.leads) * 1000) / 10 : 0;
                  return (
                    <tr key={c._id} className="erp-row-click" onClick={() => openEdit(c._id)}>
                      <td className="adm-primary">
                        <AdminCell title={c.name} sub={[period, c.notes].filter(Boolean).join(' · ') || null} />
                      </td>
                      <td data-label="Channel">
                        <span className="erp-tag">{channelLabel(c.channel)}</span>
                      </td>
                      <td className="num" data-label="Spend">
                        <span className="adm-money">
                          {c.currency ? money(c.spend, c.currency) : plainAmount(c.spend)}
                        </span>
                      </td>
                      <td className="num" data-label="Leads">
                        {c.leads}
                      </td>
                      <td className="num" data-label="Conversions">
                        {c.conversions}
                      </td>
                      <td className="num" data-label="Rate">
                        {cRate}%
                      </td>
                      <AdminRowActions>
                        <ErpButton variant="ghost" size="sm" icon="pencil" onClick={() => openEdit(c._id)}>
                          Edit
                        </ErpButton>
                      </AdminRowActions>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      <ErpModal open={modalOpen} title={editId ? 'Edit campaign' : 'Create campaign'} size="md" onClose={close}>
        <CampaignForm
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
