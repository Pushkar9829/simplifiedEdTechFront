import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMyWallet, listPayable, listPlans, payInvoice, paymentHistory, subscribePlan } from '../../api';
import { formatDate, money, statusBadge } from '../../utils/format';
import { titleCase } from '../admin/adminOptions';

export default function PaymentsPage({ showPlans = true }) {
  const location = useLocation();
  const walletPath = location.pathname.replace(/\/payments\/?$/, '/wallet');
  const [payable, setPayable] = useState([]);
  const [history, setHistory] = useState([]);
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, h, pl, w] = await Promise.all([
        listPayable(),
        paymentHistory(),
        showPlans ? listPlans() : Promise.resolve([]),
        getMyWallet().catch(() => null),
      ]);
      setPayable(p.items || []);
      setHistory(h.items || []);
      setPlans(Array.isArray(pl) ? pl : pl?.items || []);
      setWallet(w?.wallet || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [showPlans]);

  const pendingTotal = payable
    .filter((p) => ['pending', 'failed', 'awaiting_confirmation'].includes(p.status))
    .reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Payments</h1>
        <Link to={walletPath} className="btn secondary">
          Open wallet
        </Link>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <div className="grid three">
        <div className="stat">
          <div className="label">Payable invoices</div>
          <div className="value">{payable.length}</div>
        </div>
        <div className="stat">
          <div className="label">Amount due</div>
          <div className="value">{money(pendingTotal)}</div>
        </div>
        <div className="stat">
          <div className="label">Wallet</div>
          <div className="value">{money(wallet?.balance || 0, wallet?.currency)}</div>
        </div>
      </div>

      <section className="erp-card">
        <h2>Pay now</h2>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !payable.length ? (
          <div className="empty">No payable invoices.</div>
        ) : (
          <table className="erp-data-table table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payable.map((p) => (
                <tr key={p._id}>
                  <td>{p.description || 'Invoice'}</td>
                  <td>{money(p.amount, p.currency)}</td>
                  <td>
                    <span className={statusBadge(p.status)}>{titleCase(p.status)}</span>
                  </td>
                  <td>
                    {p.status === 'pending' || p.status === 'failed' ? (
                      <div className="row">
                        <button
                          className="btn"
                          type="button"
                          onClick={async () => {
                            try {
                              await payInvoice(p._id, 'manual');
                              setMsg('Payment submitted for admin confirmation');
                              load();
                            } catch (err) {
                              setError(err.message);
                            }
                          }}
                        >
                          Pay
                        </button>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={async () => {
                            try {
                              await payInvoice(p._id, 'wallet');
                              setMsg('Paid from wallet (25% platform / 75% tutor)');
                              load();
                            } catch (err) {
                              setError(err.message);
                            }
                          }}
                        >
                          Wallet
                        </button>
                      </div>
                    ) : (
                      <span className="muted">Awaiting confirmation</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showPlans && (
        <section className="erp-card stack">
          <h2>Subscription plans</h2>
          {!plans.length ? (
            <div className="empty">No plans available.</div>
          ) : (
            <div className="grid three">
              {plans.map((plan) => (
                <div
                  key={plan._id}
                  style={{
                    border: '1px solid var(--erp-border)',
                    borderRadius: '0.55rem',
                    padding: '0.65rem',
                  }}
                >
                  <h3 style={{ margin: 0 }}>{plan.name}</h3>
                  <p className="muted">{plan.description}</p>
                  <p>
                    <strong>{money(plan.price, plan.currency)}</strong>
                    <span className="muted"> · {titleCase(plan.billingCycle)}</span>
                  </p>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={async () => {
                      try {
                        await subscribePlan(plan._id);
                        setMsg('Plan invoice created — use Pay above');
                        load();
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  >
                    Subscribe
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="erp-card">
        <h2>History</h2>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !history.length ? (
          <div className="empty">No payment history.</div>
        ) : (
          <table className="erp-data-table table">
            <thead>
              <tr>
                <th>When</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p._id}>
                  <td>{formatDate(p.createdAt)}</td>
                  <td>{p.description || '—'}</td>
                  <td>{money(p.amount, p.currency)}</td>
                  <td>
                    <span className={statusBadge(p.status)}>{titleCase(p.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
