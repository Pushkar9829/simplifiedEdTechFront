import { useEffect, useState } from 'react';
import { createTicket, listMyTickets } from '../../api';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpInput,
  ErpLoadingState,
  ErpPageHeader,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { useCatalog } from '../../context/CatalogContext';
import { formatDate } from '../../utils/format';
import { errorMessage } from '../../utils/errors';
import { titleCase } from '../admin/adminOptions';
import { StatusTrack } from './sharedUi';
import { dateOnly } from './sharedTime';
import './shared.css';
import './support.css';

const emptyForm = { subject: '', category: '', description: '' };
const FLOW = ['open', 'in_progress', 'resolved', 'closed'];
const FLOW_LABEL = { open: 'Received', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' };
const ACTIVE = ['open', 'in_progress'];

function ticketTrack(status) {
  const idx = FLOW.indexOf(status);
  return FLOW.map((key, i) => {
    let state = 'todo';
    if (idx < 0) state = i === 0 ? 'done' : 'todo';
    else if (i < idx) state = 'done';
    else if (i === idx) state = ACTIVE.includes(status) && i > 0 ? 'current' : 'done';
    return { key, label: FLOW_LABEL[key], state };
  });
}

export default function SupportPage() {
  const { options, labelFor } = useCatalog();
  const categories = options('ticket_category');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState('');
  const category = form.category || categories[0]?.value || 'general';

  const load = async () => {
    setLoading(true);
    try {
      const r = await listMyTickets();
      setItems(Array.isArray(r) ? r : r?.items || []);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your tickets'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canSubmit = form.subject.trim() && form.description.trim() && !saving;

  const activeCount = items.filter((t) => ACTIVE.includes(t.status)).length;
  const shown = items.filter((t) => {
    if (filter === 'active') return ACTIVE.includes(t.status);
    if (filter === 'done') return !ACTIVE.includes(t.status);
    return true;
  });

  return (
    <div className="page sp-page">
      <ErpPageHeader
        subtitle="Raise a ticket for bookings, payments, or account help. You'll get a notification when its status changes."
      />
      {error ? (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      ) : null}
      {msg ? (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      ) : null}

      <div className="sp-support">
        <ErpCard
          className="sp-support-form"
          heading="Raise a ticket"
          description="Tell us what happened — admin replies here."
        >
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canSubmit) return;
              setSaving(true);
              setError('');
              setMsg('');
              try {
                await createTicket({
                  subject: form.subject.trim(),
                  description: form.description.trim(),
                  category,
                });
                setForm(emptyForm);
                setMsg('Ticket submitted — admin will reply here');
                setFilter('all');
                await load();
              } catch (err) {
                setError(errorMessage(err, 'Could not submit ticket'));
              } finally {
                setSaving(false);
              }
            }}
          >
            <ErpInput
              label="Subject"
              value={form.subject}
              maxLength={200}
              placeholder="e.g. Charged twice for my Physics class"
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
            />
            <ErpSelect
              label="Category"
              value={category}
              options={categories}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <ErpTextarea
              label="Details"
              required
              rows={5}
              value={form.description}
              placeholder="Describe the issue. Include the class date or invoice if it's about a booking or payment."
              helper={`${form.description.length} characters`}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <ErpButton type="submit" icon="ticket" block loading={saving} disabled={!canSubmit}>
              {saving ? 'Sending…' : 'Submit ticket'}
            </ErpButton>
          </form>
        </ErpCard>

        <ErpCard flush className="sp-panel sp-support-list" heading="My tickets" description={items.length ? `${activeCount} active · ${items.length} total` : undefined}>
          <div className="sp-panel-tabs">
            <ErpTabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: 'all', label: 'All', count: items.length || null },
                { value: 'active', label: 'Active', count: activeCount || null },
                { value: 'done', label: 'Resolved' },
              ]}
            />
          </div>
          {loading ? (
            <ErpLoadingState message="Loading tickets…" />
          ) : !items.length ? (
            <ErpEmptyState
              icon="life-buoy"
              title="No tickets yet"
              description="When you raise a ticket, its progress and admin replies show up here."
            />
          ) : !shown.length ? (
            <ErpEmptyState
              icon="check-circle"
              title={filter === 'active' ? 'No active tickets' : 'Nothing resolved yet'}
              description="Switch to All to see every ticket."
            />
          ) : (
            <ul className="sp-rows">
              {shown.map((t) => {
                const open = expanded === t._id;
                const long = String(t.description || '').length > 180;
                return (
                  <li key={t._id} className="sp-ticket">
                    <div className="sp-ticket-head">
                      <div className="sp-invoice-main">
                        <div className="sp-invoice-title">{t.subject}</div>
                        <div className="sp-meta">
                          <ErpBadge icon="tag">{labelFor('ticket_category', t.category) || titleCase(t.category)}</ErpBadge>
                          <span title={formatDate(t.createdAt)}>Opened {dateOnly(t.createdAt)}</span>
                          {t.updatedAt && t.updatedAt !== t.createdAt ? (
                            <span title={formatDate(t.updatedAt)}>Updated {dateOnly(t.updatedAt)}</span>
                          ) : null}
                        </div>
                      </div>
                      <ErpStatusBadge status={t.status} dot>
                        {titleCase(t.status)}
                      </ErpStatusBadge>
                    </div>
                    <StatusTrack steps={ticketTrack(t.status)} />
                    <p className={`sp-ticket-desc${long && !open ? ' is-clamped' : ''}`}>{t.description}</p>
                    {long ? (
                      <button type="button" className="erp-link sp-ticket-more" onClick={() => setExpanded(open ? '' : t._id)}>
                        {open ? 'Show less' : 'Show more'}
                      </button>
                    ) : null}
                    {t.adminNote ? (
                      <div className="sp-reply">
                        <span className="sp-reply-head">
                          <Icon name="message-square" size={14} />
                          Reply from support
                        </span>
                        <p>{t.adminNote}</p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </ErpCard>
      </div>
    </div>
  );
}
