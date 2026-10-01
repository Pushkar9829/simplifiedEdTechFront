import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMyWallet, listPayable, listPlans, payInvoice, paymentHistory, subscribePlan } from '../../api';
import { formatDate, money, statusBadge } from '../../utils/format';
import { titleCase } from '../admin/adminOptions';
import { ErpPager, ErpSearch, ErpTabs } from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';

export default function PaymentsPage({ showPlans = true }) {
  const location = useLocation();
  const isTutor = location.pathname.startsWith('/tutor');
  const walletPath = location.pathname.replace(/\/payments\/?$/, '/wallet');
  const [payable, setPayable] = useState([]);
  const [history, setHistory] = useState([]);
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(isTutor ? 'plans' : 'due');

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

  const dueList = useListFilter(payable, (p) => [p.description, p.status].filter(Boolean).join(' '));
  const histList = useListFilter(history, (p) => [p.description, p.status].filter(Boolean).join(' '));
  const pendingTotal = payable
    .filter((p) => ['pending', 'failed', 'awaiting_confirmation'].includes(p.status))
    .reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{isTutor ? 'Tutor Premium' : 'Payments'}</h1>
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

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'due', label: `Pay now (${payable.length})` },
            ...(showPlans ? [{ value: 'plans', label: isTutor ? 'Premium plans' : 'Plans' }] : []),
            { value: 'history', label: 'History' },
          ]}
        />
        {tab !== 'plans' && (
          <ErpSearch
            value={tab === 'history' ? histList.search : dueList.search}
            onChange={tab === 'history' ? histList.setSearch : dueList.setSearch}
            placeholder={tab === 'history' ? 'Search history' : 'Search invoices'}
          />
        )}
        <div className="avail-bar-actions">
          <Link to={walletPath} className="erp-btn-secondary">
            Open wallet
          </Link>
        </div>
      </div>

      {tab === 'due' && (
      <section className="erp-card">
        <h2>Pay now</h2>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !payable.length ? (
          <div className="empty">No payable invoices.</div>
        ) : dueList.noMatch ? (
          <div className="empty">No invoices match that search.</div>
        ) : (
          <div className="tutor-profile-list">
            {dueList.items.map((p) => (
              <article key={p._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>{p.description || 'Invoice'}</h3>
                  <p className="muted">{money(p.amount, p.currency)}</p>
                  <div className="booking-card-status">
                    <span className={statusBadge(p.status)}>{titleCase(p.status)}</span>
                  </div>
                </div>
                <div className="booking-card-actions">
                  {p.status === 'pending' || p.status === 'failed' ? (
                    <>
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
                    </>
                  ) : (
                    <span className="muted">Awaiting confirmation</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {dueList.total > 0 && <ErpPager {...dueList.pagerProps} noun="invoice" />}
      </section>
      )}

      {tab === 'plans' && showPlans && (
        <section className="erp-card stack">
          <h2>{isTutor ? 'Rank higher in student search' : 'Subscription plans'}</h2>
          {isTutor && (
            <p className="muted" style={{ marginTop: 0 }}>
              Premium tutors appear first, with a Premium badge. Pay the invoice after you subscribe.
            </p>
          )}
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
                  {plan.rankBoost > 0 && (
                    <p className="muted">Search rank boost +{plan.rankBoost}</p>
                  )}
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

      {tab === 'history' && (
      <section className="erp-card">
        <h2>History</h2>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !history.length ? (
          <div className="empty">No payment history.</div>
        ) : histList.noMatch ? (
          <div className="empty">No payments match that search.</div>
        ) : (
          <div className="tutor-profile-list">
            {histList.items.map((p) => (
              <article key={p._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>{p.description || 'Payment'}</h3>
                  <p className="muted">
                    {formatDate(p.createdAt)} · {money(p.amount, p.currency)}
                  </p>
                  <div className="booking-card-status">
                    <span className={statusBadge(p.status)}>{titleCase(p.status)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {histList.total > 0 && <ErpPager {...histList.pagerProps} noun="payment" />}
      </section>
      )}
    </div>
  );
}
