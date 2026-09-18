import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMyWallet, myWithdrawals, requestWithdraw } from '../../api';
import { formatDate, money } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpPageHeader,
  ErpTabs,
  ErpToolbar,
} from '../../components/erp';

export default function WalletPage() {
  const { user } = useAuth();
  const location = useLocation();
  const paymentsPath = location.pathname.replace(/\/wallet\/?$/, '/payments');
  const [wallet, setWallet] = useState(null);
  const [tx, setTx] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('overview');

  const load = async () => {
    setError('');
    try {
      const data = await getMyWallet();
      setWallet(data.wallet);
      setTx(data.transactions?.items || []);
      if (user?.role === 'tutor') {
        const w = await myWithdrawals();
        setWithdrawals(Array.isArray(w) ? w : w.items || []);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [user?.role]);

  const tabs =
    user?.role === 'tutor'
      ? [
          { value: 'overview', label: 'Overview' },
          { value: 'withdraw', label: 'Withdraw' },
          { value: 'ledger', label: 'Ledger' },
        ]
      : [
          { value: 'overview', label: 'Overview' },
          { value: 'ledger', label: 'Ledger' },
        ];

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle={
          user?.role === 'tutor'
            ? '75% lesson share after paid classes.'
            : 'Credits and invoice payments.'
        }
      />
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <ErpToolbar
        actions={
          user?.role !== 'tutor' ? (
            <Link to={paymentsPath} className="erp-btn-secondary">
              Pay invoices
            </Link>
          ) : (
            <ErpButton variant="secondary" onClick={load}>
              Refresh
            </ErpButton>
          )
        }
      />

      <ErpTabs value={tab} onChange={setTab} tabs={tabs} />

      {tab === 'overview' && (
        <div className="grid three">
          <div className="stat">
            <div className="label">Balance</div>
            <div className="value">{money(wallet?.balance || 0, wallet?.currency)}</div>
          </div>
          <div className="stat">
            <div className="label">Transactions</div>
            <div className="value">{tx.length}</div>
          </div>
          {user?.role === 'tutor' && (
            <div className="stat">
              <div className="label">Withdrawals</div>
              <div className="value">{withdrawals.length}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'withdraw' && user?.role === 'tutor' && (
        <ErpCard className="stack">
          <p className="muted">Admin approves payouts from your 75% lesson earnings.</p>
          <div className="row">
            <input
              className="erp-search"
              type="number"
              min="1"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <ErpButton
              type="button"
              onClick={async () => {
                try {
                  await requestWithdraw(Number(amount));
                  setMsg('Withdrawal requested');
                  setAmount('');
                  load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Request
            </ErpButton>
          </div>
          {!withdrawals.length ? (
            <div className="empty">No withdrawal requests.</div>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w._id}>
                      <td>{formatDate(w.createdAt)}</td>
                      <td>{money(w.amount)}</td>
                      <td>{w.status}</td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
        </ErpCard>
      )}

      {tab === 'ledger' && (
        <ErpCard className="erp-card-flush">
          {!tx.length ? (
            <div className="empty">No wallet activity yet.</div>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {tx.map((t) => (
                    <tr key={t._id}>
                      <td>{formatDate(t.createdAt)}</td>
                      <td>{t.type}</td>
                      <td>{money(t.amount, wallet?.currency)}</td>
                      <td>{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
        </ErpCard>
      )}
    </div>
  );
}
