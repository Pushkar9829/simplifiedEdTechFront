import { useEffect, useState } from 'react';
import { createCampaign, listCampaigns, updateCampaign } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { money } from '../../utils/format';
import { useCatalog } from '../../context/CatalogContext';
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
        if (!cancelled) setError(err.message);
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
        <label>Name</label>
        <input
          className="erp-search"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <ErpSelect
        label="Channel"
        value={form.channel}
        options={channelOptions}
        onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
      />
      <div className="field">
        <label>Spend</label>
        <input
          className="erp-search"
          type="number"
          min="0"
          value={form.spend}
          onChange={(e) => setForm((f) => ({ ...f, spend: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Leads</label>
        <input
          className="erp-search"
          type="number"
          min="0"
          value={form.leads}
          onChange={(e) => setForm((f) => ({ ...f, leads: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Conversions</label>
        <input
          className="erp-search"
          type="number"
          min="0"
          value={form.conversions}
          onChange={(e) => setForm((f) => ({ ...f, conversions: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Period start</label>
        <input
          className="erp-search"
          type="date"
          value={form.periodStart}
          onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Period end</label>
        <input
          className="erp-search"
          type="date"
          value={form.periodEnd}
          onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
        />
      </div>
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label>Notes</label>
        <textarea
          className="erp-search"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
      <div className="row" style={{ gridColumn: '1 / -1' }}>
        <ErpButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update campaign' : 'Create campaign'}
        </ErpButton>
        <ErpButton variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </ErpButton>
      </div>
    </form>
  );
}

export default function AdminCampaignsPage() {
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const list = useListFilter(items, (c) => [c.name, c.channel, c.notes].filter(Boolean).join(' '));

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Admin-fed marketing spend, leads, and conversions." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search campaigns" />
        <div className="avail-bar-actions">
          <ErpButton onClick={openNew}>Create campaign</ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading campaigns…</div>
        ) : !items.length ? (
          <div className="empty">
            No campaigns.{' '}
            <button type="button" className="erp-link" onClick={openNew}>
              Create your first campaign
            </button>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No campaigns match that search.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Channel</th>
                  <th>Spend</th>
                  <th>Leads</th>
                  <th>Conversions</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((c) => (
                  <tr key={c._id} className="erp-row-click" onClick={() => openEdit(c._id)}>
                    <td>
                      <strong>{c.name}</strong>
                      {c.notes && <div className="muted">{c.notes}</div>}
                    </td>
                    <td>{c.channel}</td>
                    <td>{money(c.spend)}</td>
                    <td>{c.leads}</td>
                    <td>{c.conversions}</td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(c._id);
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
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="campaign" />}
      </ErpCard>

      <ErpModal
        open={modalOpen}
        title={editId ? 'Edit campaign' : 'Create campaign'}
        onClose={close}
      >
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
