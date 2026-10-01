import { useEffect, useState } from 'react';
import { adminPayments, adminSetPaymentStatus } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
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

  const list = useListFilter(
    items,
    (p) => [p.payerUserId?.name, p.payerUserId?.phone, p.status, p.description].filter(Boolean).join(' '),
    { resetKey: status }
  );
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

      <div className="avail-bar">
        <ErpTabs
          value={status || 'all'}
          onChange={(value) => setStatus(value === 'all' ? '' : value)}
          tabs={PAYMENT_STATUS_OPTIONS.map((o) => ({
            value: o.value || 'all',
            label: o.value === 'awaiting_confirmation' ? 'Awaiting' : o.label,
          }))}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search payments" />
        <div className="avail-bar-actions">
          <ErpButton variant="secondary" onClick={load}>
            Refresh
          </ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading payments…</div>
        ) : !items.length ? (
          <div className="empty">No payments.</div>
        ) : list.noMatch ? (
          <div className="empty">No payments match that search.</div>
        ) : (
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {list.items.map((p) => (
              <article key={p._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>
                    {money(p.amount, p.currency)}
                    {p.payerUserId?.role ? <span className="erp-chip">{p.payerUserId.role}</span> : null}
                  </h3>
                  <p className="muted">
                    {p.payerUserId?.name || p.payerUserId?.phone || '—'} · {formatDate(p.createdAt)}
                  </p>
                  <p className="muted">{p.description || 'Payment'}</p>
                  <div className="booking-card-status">
                    <ErpStatusBadge status={p.status}>{p.status}</ErpStatusBadge>
                  </div>
                </div>
                <div className="booking-card-actions">
                  <ErpButton variant="secondary" onClick={() => openEdit(p._id)}>
                    View
                  </ErpButton>
                </div>
              </article>
            ))}
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="payment" />}
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
