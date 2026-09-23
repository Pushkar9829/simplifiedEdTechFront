import { useEffect, useState } from 'react';
import { listTickets, updateTicket } from '../../api';
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
import { formatDate } from '../../utils/format';
import { TICKET_STATUS_OPTIONS, TICKET_STATUS_SET_OPTIONS } from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

export default function AdminTicketsPage() {
  const { editId, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listTickets(status ? { status } : {});
      const list = Array.isArray(data) ? data : data?.items || [];
      setItems(list);
      const seed = {};
      list.forEach((t) => {
        seed[t._id] = t.adminNote || '';
      });
      setNotes(seed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const list = useListFilter(
    items,
    (t) => [t.subject, t.category, t.userId?.name, t.userId?.phone, t.status].filter(Boolean).join(' '),
    { resetKey: status }
  );
  const selected = items.find((t) => t._id === editId) || null;

  const saveTicket = async (ticket, extra = {}) => {
    setSaving(true);
    setError('');
    try {
      await updateTicket(ticket._id, {
        status: extra.status ?? ticket.status,
        adminNote: extra.adminNote ?? (notes[ticket._id] || ''),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Open a ticket to change status and save an admin note." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={status || 'all'}
          onChange={(value) => setStatus(value === 'all' ? '' : value)}
          tabs={TICKET_STATUS_OPTIONS.map((o) => ({
            value: o.value || 'all',
            label: o.label,
          }))}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search tickets" />
        <div className="avail-bar-actions">
          <ErpButton variant="secondary" onClick={load}>
            Refresh
          </ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading tickets…</div>
        ) : !items.length ? (
          <div className="empty">No tickets.</div>
        ) : list.noMatch ? (
          <div className="empty">No tickets match that search.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((t) => (
                  <tr key={t._id} className="erp-row-click" onClick={() => openEdit(t._id)}>
                    <td>
                      <strong>{t.subject}</strong>
                    </td>
                    <td>{t.category}</td>
                    <td>{t.userId?.phone || t.userId?.name || '—'}</td>
                    <td>
                      <ErpStatusBadge status={t.status === 'resolved' ? 'completed' : t.status}>
                        {t.status}
                      </ErpStatusBadge>
                    </td>
                    <td>{formatDate(t.createdAt)}</td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(t._id);
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
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="ticket" />}
      </ErpCard>

      <ErpModal
        open={Boolean(editId)}
        title="Ticket"
        onClose={close}
        footer={
          selected ? (
            <>
              <ErpButton variant="secondary" onClick={close}>
                Close
              </ErpButton>
              <ErpButton
                variant="secondary"
                disabled={saving}
                onClick={async () => {
                  await saveTicket(selected, { adminNote: notes[selected._id] || '' });
                }}
              >
                Save note
              </ErpButton>
            </>
          ) : null
        }
      >
        {!selected ? (
          <div className="empty">Ticket not found.</div>
        ) : (
          <div className="stack">
            <dl className="erp-detail-grid">
              <dt>Subject</dt>
              <dd>{selected.subject}</dd>
              <dt>Category</dt>
              <dd>{selected.category}</dd>
              <dt>User</dt>
              <dd>{selected.userId?.phone || selected.userId?.name || '—'}</dd>
              <dt>Date</dt>
              <dd>{formatDate(selected.createdAt)}</dd>
            </dl>
            <p>{selected.description}</p>
            <ErpSelect
              label="Status"
              value={selected.status}
              options={TICKET_STATUS_SET_OPTIONS}
              onChange={async (e) => {
                await saveTicket(selected, {
                  status: e.target.value,
                  adminNote: notes[selected._id] || '',
                });
              }}
            />
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="erp-label">Admin note</label>
              <input
                className="erp-search"
                value={notes[selected._id] || ''}
                onChange={(e) => setNotes((n) => ({ ...n, [selected._id]: e.target.value }))}
              />
            </div>
          </div>
        )}
      </ErpModal>
    </div>
  );
}
