import { useEffect, useState } from 'react';
import { adminPayments, adminSetPaymentStatus } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPageHeader,
  ErpStatusBadge,
  ErpTabs,
  ErpToolbar,
} from '../../components/erp';
import { formatDate, money } from '../../utils/format';
import { PAYMENT_STATUS_OPTIONS } from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

export default function AdminPaymentsPage() {
  const { editId, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminPayments(status ? { status } : {});
      setItems(data.items || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const selected = items.find((p) => p._id === editId) || null;

  const setPayStatus = async (id, next) => {
    try {
      await adminSetPaymentStatus(id, {
        status: next,
        adminNote: notes[id] || '',
      });
      close();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Filter by status, then open a payment to mark paid, refund, fail, or reset." />
      {error && <div className="error-banner">{error}</div>}

      <ErpToolbar
        actions={
          <ErpButton variant="secondary" onClick={load}>
            Refresh
          </ErpButton>
        }
      />

      <ErpTabs
        value={status || 'all'}
        onChange={(value) => setStatus(value === 'all' ? '' : value)}
        tabs={PAYMENT_STATUS_OPTIONS.map((o) => ({
          value: o.value || 'all',
          label: o.value === 'awaiting_confirmation' ? 'Awaiting' : o.label,
        }))}
      />

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading payments…</div>
        ) : !items.length ? (
          <div className="empty">No payments.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Payer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id} className="erp-row-click" onClick={() => openEdit(p._id)}>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>{p.payerUserId?.phone || p.payerUserId?.name || '—'}</td>
                    <td>{money(p.amount, p.currency)}</td>
                    <td>
                      <ErpStatusBadge status={p.status}>{p.status}</ErpStatusBadge>
                    </td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p._id);
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
      </ErpCard>

      <ErpModal
        open={Boolean(editId)}
        title="Payment action"
        size="sm"
        onClose={close}
        footer={
          selected ? (
            <>
              <ErpButton variant="secondary" onClick={close}>
                Cancel
              </ErpButton>
              {['pending', 'awaiting_confirmation', 'failed'].includes(selected.status) && (
                <ErpButton onClick={() => setPayStatus(selected._id, 'paid')}>Mark paid</ErpButton>
              )}
              {selected.status === 'paid' && (
                <ErpButton variant="secondary" onClick={() => setPayStatus(selected._id, 'refunded')}>
                  Refund
                </ErpButton>
              )}
              {['pending', 'awaiting_confirmation'].includes(selected.status) && (
                <ErpButton variant="danger" onClick={() => setPayStatus(selected._id, 'failed')}>
                  Fail
                </ErpButton>
              )}
              {selected.status !== 'pending' && (
                <ErpButton variant="secondary" onClick={() => setPayStatus(selected._id, 'pending')}>
                  Reset pending
                </ErpButton>
              )}
            </>
          ) : null
        }
      >
        {!selected ? (
          <div className="empty">Payment not found.</div>
        ) : (
          <div className="stack">
            <dl className="erp-detail-grid">
              <dt>When</dt>
              <dd>{formatDate(selected.createdAt)}</dd>
              <dt>Payer</dt>
              <dd>{selected.payerUserId?.phone || selected.payerUserId?.name || '—'}</dd>
              <dt>Amount</dt>
              <dd>{money(selected.amount, selected.currency)}</dd>
              <dt>Status</dt>
              <dd>
                <ErpStatusBadge status={selected.status}>{selected.status}</ErpStatusBadge>
              </dd>
            </dl>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Admin note</label>
              <input
                className="erp-search"
                placeholder="Admin note"
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
