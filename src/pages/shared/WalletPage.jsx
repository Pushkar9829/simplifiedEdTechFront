import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  getMyWallet,
  myWithdrawals,
  requestWithdraw,
  saveBankAccount,
  verifyBankAccount,
} from '../../api';
import { formatDate, money } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpList,
  ErpListItem,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';

const emptyBank = { holderName: '', accountNumber: '', ifsc: '', bankName: '', upiId: '' };

export default function WalletPage() {
  const phone = useIsPhone();
  const { user } = useAuth();
  const location = useLocation();
  const paymentsPath = location.pathname.replace(/\/wallet\/?$/, '/payments');
  const [wallet, setWallet] = useState(null);
  const [tx, setTx] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [bank, setBank] = useState(null);
  const [billing, setBilling] = useState(null);
  const [bankForm, setBankForm] = useState(emptyBank);
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
      setBank(data.bankAccount || null);
      setBilling(data.billing || null);
      if (data.bankAccount) {
        setBankForm((f) => ({
          ...f,
          holderName: data.bankAccount.holderName || '',
          ifsc: data.bankAccount.ifsc || '',
          bankName: data.bankAccount.bankName || '',
          upiId: data.bankAccount.upiId || '',
        }));
      }
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

  const txList = useListFilter(tx, (t) => [t.description, t.type, t.cycle].filter(Boolean).join(' '));
  const wdList = useListFilter(withdrawals, (w) => [w.status, w.cycle].filter(Boolean).join(' '));
  const isTutor = user?.role === 'tutor';
  const tabs = isTutor
    ? [
        { value: 'overview', label: 'Overview' },
        { value: 'bank', label: 'Bank account' },
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
          isTutor
            ? 'Lesson payouts lock until month end. Withdraw in the last days of the month to a verified bank account.'
            : 'Credits and invoice payments.'
        }
      />
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <div className="avail-bar">
        <ErpTabs value={tab} onChange={setTab} tabs={tabs} />
        <div className="avail-bar-actions">
          {!isTutor ? (
            <Link to={paymentsPath} className="erp-btn-secondary">
              Pay invoices
            </Link>
          ) : (
            <ErpButton variant="secondary" onClick={load}>
              Refresh
            </ErpButton>
          )}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid three">
            <div className="stat">
              <div className="label">Balance</div>
              <div className="value">{money(wallet?.balance || 0, wallet?.currency)}</div>
            </div>
            {isTutor && (
              <>
                <div className="stat">
                  <div className="label">Locked this cycle</div>
                  <div className="value">{money(wallet?.lockedBalance || 0, wallet?.currency)}</div>
                </div>
                <div className="stat">
                  <div className="label">Withdrawable</div>
                  <div className="value">{money(wallet?.withdrawableBalance || 0, wallet?.currency)}</div>
                </div>
              </>
            )}
            {!isTutor && (
              <div className="stat">
                <div className="label">Transactions</div>
                <div className="value">{tx.length}</div>
              </div>
            )}
          </div>
          {isTutor && billing && (
            <ErpCard>
              <strong>Billing cycle {billing.cycle}</strong>
              <p className="muted">
                Withdrawal window: days {billing.startDay}–{billing.endDay} of the month.{' '}
                {billing.inWindow ? 'Window is open now.' : 'Window is closed until month end.'}
              </p>
            </ErpCard>
          )}
        </>
      )}

      {tab === 'bank' && isTutor && (
        <ErpCard className="stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Payout bank account</h3>
            {bank && <ErpStatusBadge status={bank.status}>{bank.status}</ErpStatusBadge>}
          </div>
          {bank?.last4 && <p className="muted">Saved account ending {bank.last4}</p>}
          {bank?.failReason && <p className="error-banner">{bank.failReason}</p>}
          <div className="erp-form-grid">
            <div className="field">
              <label>Account holder name</label>
              <input
                className="erp-search"
                value={bankForm.holderName}
                onChange={(e) => setBankForm((f) => ({ ...f, holderName: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Account number</label>
              <input
                className="erp-search"
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))}
                placeholder={bank?.last4 ? `•••• ${bank.last4}` : ''}
              />
            </div>
            <div className="field">
              <label>IFSC</label>
              <input
                className="erp-search"
                value={bankForm.ifsc}
                onChange={(e) => setBankForm((f) => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="field">
              <label>Bank name</label>
              <input
                className="erp-search"
                value={bankForm.bankName}
                onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>UPI (optional)</label>
              <input
                className="erp-search"
                value={bankForm.upiId}
                onChange={(e) => setBankForm((f) => ({ ...f, upiId: e.target.value }))}
              />
            </div>
          </div>
          <div className="row">
            <ErpButton
              onClick={async () => {
                try {
                  const saved = await saveBankAccount(bankForm);
                  setBank(saved);
                  setMsg('Bank details saved');
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Save details
            </ErpButton>
            <ErpButton
              variant="secondary"
              onClick={async () => {
                try {
                  const r = await verifyBankAccount();
                  setBank(r.bankAccount);
                  setMsg(
                    r.bankAccount?.status === 'verified'
                      ? '₹1 verification passed'
                      : r.verification?.reason || 'Verification failed'
                  );
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Verify with ₹1
            </ErpButton>
          </div>
        </ErpCard>
      )}

      {tab === 'withdraw' && isTutor && (
        <ErpCard className="stack">
          <p className="muted">
            You can withdraw {money(wallet?.withdrawableBalance || 0, wallet?.currency)} after a verified bank
            account, only during the month-end window.
          </p>
          <div className="stack">
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
          <ErpSearch value={wdList.search} onChange={wdList.setSearch} placeholder="Search withdrawals" />
          {!withdrawals.length ? (
            <div className="empty">No withdrawal requests.</div>
          ) : wdList.noMatch ? (
            <div className="empty">No withdrawals match that search.</div>
          ) : phone ? (
            <ErpList>
              {wdList.items.map((w) => (
                <ErpListItem
                  key={w._id}
                  title={money(w.amount)}
                  meta={`${formatDate(w.createdAt)} · ${w.cycle || 'cycle'}`}
                  status={w.status}
                />
              ))}
            </ErpList>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Cycle</th>
                    <th>Amount</th>
                    <th>Bank</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {wdList.items.map((w) => (
                    <tr key={w._id}>
                      <td>{formatDate(w.createdAt)}</td>
                      <td>{w.cycle || '—'}</td>
                      <td>{money(w.amount)}</td>
                      <td>{w.bankAccountId ? `•••• ${w.bankAccountId.last4 || ''}` : '—'}</td>
                      <td>
                        <ErpStatusBadge status={w.status}>{w.status}</ErpStatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
          {wdList.total > 0 && <ErpPager {...wdList.pagerProps} noun="withdrawal" />}
        </ErpCard>
      )}

      {tab === 'ledger' && (
        <ErpCard className="erp-card-flush">
          <div className="erp-toolbar">
            <div className="erp-toolbar-left">
              <ErpSearch value={txList.search} onChange={txList.setSearch} placeholder="Search ledger" />
            </div>
          </div>
          {!tx.length ? (
            <div className="empty">No wallet activity yet.</div>
          ) : txList.noMatch ? (
            <div className="empty">No transactions match that search.</div>
          ) : phone ? (
            <div style={{ padding: '0.65rem' }}>
              <ErpList>
                {txList.items.map((t) => (
                  <ErpListItem
                    key={t._id}
                    title={t.description || t.type}
                    meta={formatDate(t.createdAt)}
                    status={t.type === 'debit' || t.type === 'withdrawal' ? 'pending' : 'paid'}
                    statusLabel={t.type}
                  >
                    <div className="muted">{money(t.amount, wallet?.currency)}</div>
                  </ErpListItem>
                ))}
              </ErpList>
            </div>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Cycle</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {txList.items.map((t) => (
                    <tr key={t._id}>
                      <td>{formatDate(t.createdAt)}</td>
                      <td>{t.type}</td>
                      <td>{money(t.amount, wallet?.currency)}</td>
                      <td>{t.cycle || '—'}</td>
                      <td>{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
          {txList.total > 0 && <ErpPager {...txList.pagerProps} noun="transaction" />}
        </ErpCard>
      )}
    </div>
  );
}
