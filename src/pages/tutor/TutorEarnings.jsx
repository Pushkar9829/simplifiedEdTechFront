import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tutorEarnings } from '../../api';
import { ErpCard, ErpDataTable, ErpPageHeader, ErpStatusBadge, ErpToolbar } from '../../components/erp';
import { formatDate, money } from '../../utils/format';

export default function TutorEarnings() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tutorEarnings()
      .then((d) => setItems(d.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const total = items.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Gross paid invoice totals. Your 75% share is credited on Wallet after each paid lesson." />
      {error && <div className="error-banner">{error}</div>}

      <ErpToolbar
        actions={
          <Link to="/tutor/wallet" className="erp-btn-secondary">
            Wallet (75% net)
          </Link>
        }
      />

      <div className="grid three">
        <div className="stat">
          <div className="label">Gross paid invoices</div>
          <div className="value">{money(total)}</div>
        </div>
        <div className="stat">
          <div className="label">Paid invoices</div>
          <div className="value">{items.length}</div>
        </div>
        <div className="stat">
          <div className="label">Avg payout</div>
          <div className="value">{money(items.length ? total / items.length : 0)}</div>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading earnings…</div>
        ) : !items.length ? (
          <div className="empty">No confirmed earnings yet.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDate(p.paidAt || p.createdAt)}</td>
                    <td>{p.description || '—'}</td>
                    <td>{money(p.amount, p.currency)}</td>
                    <td>
                      <ErpStatusBadge status={p.status}>{p.status}</ErpStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
      </ErpCard>
    </div>
  );
}
