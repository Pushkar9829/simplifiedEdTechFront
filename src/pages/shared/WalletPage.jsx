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
import { errorMessage } from '../../utils/errors';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpEmptyState,
  ErpInput,
  ErpLoadingState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSkeleton,
  ErpStatusBadge,
  ErpTabs,
  Icon,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { RowIcon } from './sharedUi';
import { dateOnly } from './sharedTime';
import './shared.css';

const emptyBank = { holderName: '', accountNumber: '', ifsc: '', bankName: '', upiId: '' };

const bankFormFrom = (b) => ({
  ...emptyBank,
  holderName: b?.holderName || '',
  ifsc: b?.ifsc || '',
  bankName: b?.bankName || '',
  upiId: b?.upiId || '',
});

const isOutflow = (t) => t?.type === 'debit' || t?.type === 'withdrawal';

function SignedAmount({ t, cur }) {
  const out = isOutflow(t);
  return (
    <span className={`num${out ? '' : ' sp-amount-in'}`}>
      {out ? '−' : '+'}
      {money(Math.abs(Number(t.amount) || 0), t.currency || cur)}
    </span>
  );
}

function Checklist({ items }) {
  return (
    <ul className="sp-checklist">
      {items.map((it) => (
        <li key={it.key} className={it.ok ? 'is-ok' : 'is-todo'}>
          <span className="sp-check-mark" aria-hidden="true">
            <Icon name={it.ok ? 'check' : 'x'} size={12} strokeWidth={2.5} />
          </span>
          <span className="sp-check-body">
            <span className="sp-check-title">{it.title}</span>
            {it.hint ? <span className="sp-check-hint">{it.hint}</span> : null}
          </span>
          {!it.ok && it.action ? <span className="sp-check-action">{it.action}</span> : null}
          <span className="sp-sr-only">{it.ok ? 'Done' : 'Not done'}</span>
        </li>
      ))}
    </ul>
  );
}

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
  const [loading, setLoading] = useState(true);
  const [txTotal, setTxTotal] = useState(0);
  const [busy, setBusy] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const startAction = () => {
    setMsg('');
    setError('');
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyWallet();
      setWallet(data.wallet);
      setTx(data.transactions?.items || []);
      setTxTotal(data.transactions?.total ?? (data.transactions?.items || []).length);
      setBank(data.bankAccount || null);
      setBilling(data.billing || null);
      if (data.bankAccount) setBankForm(bankFormFrom(data.bankAccount));
      if (user?.role === 'tutor') {
        const w = await myWithdrawals();
        setWithdrawals(Array.isArray(w) ? w : w.items || []);
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not load wallet'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.role]);

  const txList = useListFilter(tx, (t) => [t.description, t.type, t.cycle].filter(Boolean).join(' '));
  const wdList = useListFilter(withdrawals, (w) => [w.status, w.cycle].filter(Boolean).join(' '));
  const isTutor = user?.role === 'tutor';
  const cur = wallet?.currency;
  const supportPath = location.pathname.replace(/\/wallet\/?$/, '/support');
  const firstLoad = loading && !wallet;
  const show = (v) => (firstLoad ? '…' : money(v || 0, cur));

  const balance = Number(wallet?.balance) || 0;
  const locked = Number(wallet?.lockedBalance) || 0;
  const withdrawable = Number(wallet?.withdrawableBalance) || 0;
  const cycleWithdrawal = withdrawals.find(
    (w) => ['pending', 'approved'].includes(w.status) && (!billing?.cycle || w.cycle === billing.cycle)
  );
  const withdrawBlock = !billing?.inWindow
    ? `Withdrawals open on days ${billing?.startDay ?? '—'}–${billing?.endDay ?? '—'} of the month.`
    : bank?.status !== 'verified'
      ? 'Verify your bank account with the ₹1 check first (Bank account tab).'
      : withdrawable <= 0
        ? 'Nothing is withdrawable yet this cycle.'
        : cycleWithdrawal
          ? `You already have a ${cycleWithdrawal.status} withdrawal for ${cycleWithdrawal.cycle || 'this cycle'}.`
          : '';
  const amountNum = Number(amount);
  const amountInvalid = !amount || !(amountNum > 0) || amountNum > withdrawable;

  const savedForm = bankFormFrom(bank);
  const bankDirty =
    Boolean(bankForm.accountNumber.trim()) ||
    ['holderName', 'ifsc', 'bankName', 'upiId'].some(
      (k) => (bankForm[k] || '').trim() !== (savedForm[k] || '').trim()
    );
  const tabs = isTutor
    ? [
        { value: 'overview', label: 'Overview' },
        { value: 'withdraw', label: 'Withdraw' },
        { value: 'bank', label: 'Bank account' },
        { value: 'ledger', label: 'Ledger', count: txTotal || null },
      ]
    : [
        { value: 'overview', label: 'Overview' },
        { value: 'ledger', label: 'Ledger', count: txTotal || null },
      ];

  const readiness = [
    {
      key: 'bank',
      ok: bank?.status === 'verified',
      title: 'Bank account verified',
      hint:
        bank?.status === 'verified'
          ? `Payouts go to the account ending ${bank.last4 || '—'}`
          : bank
            ? `Saved, ${String(bank.status || 'unverified').replace(/_/g, ' ')} — run the ₹1 check`
            : 'Add your payout account and run the ₹1 check',
      action: (
        <ErpButton variant="secondary" size="sm" onClick={() => setTab('bank')}>
          {bank ? 'Verify' : 'Add account'}
        </ErpButton>
      ),
    },
    {
      key: 'window',
      ok: Boolean(billing?.inWindow),
      title: billing?.inWindow ? 'Withdrawal window is open' : 'Withdrawal window is closed',
      hint: `Days ${billing?.startDay ?? '—'}–${billing?.endDay ?? '—'} of each month${
        billing?.cycle ? ` · cycle ${billing.cycle}` : ''
      }`,
    },
    {
      key: 'balance',
      ok: withdrawable > 0,
      title: withdrawable > 0 ? `${money(withdrawable, cur)} available to withdraw` : 'Nothing withdrawable yet',
      hint: locked > 0 ? `${money(locked, cur)} unlocks at month end` : 'Lesson payouts unlock at month end',
    },
    {
      key: 'open',
      ok: !cycleWithdrawal,
      title: cycleWithdrawal ? `A ${cycleWithdrawal.status} request exists this cycle` : 'No open request this cycle',
      hint: 'One withdrawal per billing cycle',
    },
  ];
  const readyCount = readiness.filter((r) => r.ok).length;

  const lockedPct = balance > 0 ? Math.min(100, Math.max(0, (locked / balance) * 100)) : 0;

  const recent = tx.slice(0, 5);

  const saveBank = async () => {
    startAction();
    setBusy('save');
    try {
      const saved = await saveBankAccount(bankForm);
      setBank(saved);
      setBankForm(bankFormFrom(saved));
      setMsg('Bank details saved — verify the account to enable withdrawals');
    } catch (err) {
      setError(errorMessage(err, 'Could not save bank details'));
    } finally {
      setBusy('');
    }
  };

  const verifyBank = async () => {
    startAction();
    setBusy('verify');
    try {
      const r = await verifyBankAccount();
      setBank(r.bankAccount);
      if (r.bankAccount?.status === 'verified') setMsg('₹1 verification passed');
      else setError(r.verification?.reason || r.bankAccount?.failReason || 'Verification failed');
    } catch (err) {
      setError(errorMessage(err, 'Verification failed'));
    } finally {
      setBusy('');
    }
  };

  const ledgerRows = (items) =>
    phone ? (
      <ul className="sp-rows">
        {items.map((t) => (
          <li key={t._id} className="sp-ledger-row">
            <RowIcon name={isOutflow(t) ? 'arrow-right' : 'arrow-left'} tone={isOutflow(t) ? 'neutral' : 'success'} size="sm" />
            <div className="sp-invoice-main">
              <div className="sp-invoice-title">{t.description || t.type}</div>
              <div className="sp-meta">
                <span>{formatDate(t.createdAt)}</span>
                {t.cycle ? <span>Cycle {t.cycle}</span> : null}
              </div>
            </div>
            <SignedAmount t={t} cur={cur} />
          </li>
        ))}
      </ul>
    ) : (
      <div className="sp-table-wrap">
        <ErpDataTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Cycle</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t._id}>
                <td className="sp-nowrap">{formatDate(t.createdAt)}</td>
                <td>
                  <strong>{t.description || '—'}</strong>
                </td>
                <td>
                  <ErpBadge tone={isOutflow(t) ? 'neutral' : 'success'}>{t.type}</ErpBadge>
                </td>
                <td>{t.cycle || '—'}</td>
                <td className="num">
                  <SignedAmount t={t} cur={cur} />
                </td>
              </tr>
            ))}
          </tbody>
        </ErpDataTable>
      </div>
    );

  return (
    <div className="page sp-page">
      <ErpPageHeader
        subtitle={
          isTutor
            ? 'Lesson payouts lock until month end. Withdraw in the last days of the month to a verified bank account.'
            : 'Your credits and invoice payments in one place.'
        }
        actions={
          isTutor ? (
            <ErpButton variant="secondary" icon="refresh" loading={loading && Boolean(wallet)} onClick={load}>
              Refresh
            </ErpButton>
          ) : null
        }
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

      <section className="sp-balance" aria-label="Wallet balance">
        <div className="sp-balance-main">
          <span className="sp-balance-label">
            <Icon name="wallet" size={16} />
            {isTutor ? 'Wallet balance' : 'Available balance'}
            {cur ? <span className="sp-balance-cur">{cur}</span> : null}
          </span>
          {firstLoad ? (
            <ErpSkeleton width="12rem" height="2.5rem" />
          ) : (
            <span className="sp-balance-value num">{money(balance, cur)}</span>
          )}
          {isTutor ? (
            <div className="sp-split">
              <div className="sp-split-bar" aria-hidden="true">
                <span className="sp-split-free" style={{ width: `${100 - lockedPct}%` }} />
                <span className="sp-split-locked" style={{ width: `${lockedPct}%` }} />
              </div>
              <div className="sp-split-legend">
                <span>
                  <i className="sp-dot is-free" /> Withdrawable <strong className="num">{show(withdrawable)}</strong>
                </span>
                <span>
                  <i className="sp-dot is-locked" /> Locked this cycle <strong className="num">{show(locked)}</strong>
                </span>
              </div>
            </div>
          ) : (
            <span className="sp-balance-sub">
              Use it to pay invoices instantly. {txTotal ? `${txTotal} transaction${txTotal === 1 ? '' : 's'} so far.` : ''}
            </span>
          )}
        </div>
        <div className="sp-balance-actions">
          {isTutor ? (
            <>
              <ErpButton icon="download" onClick={() => setTab('withdraw')}>
                Withdraw
              </ErpButton>
              <span className="sp-quiet">
                {readyCount}/{readiness.length} ready
              </span>
            </>
          ) : (
            <>
              <Link to={paymentsPath} className="erp-btn-primary">
                <Icon name="receipt" size={16} />
                Pay invoices
              </Link>
              <Link to={supportPath} className="erp-btn-secondary">
                <Icon name="life-buoy" size={16} />
                Request a top-up
              </Link>
            </>
          )}
        </div>
      </section>

      <ErpTabs value={tab} onChange={setTab} tabs={tabs} className="sp-tabs" />

      {tab === 'overview' && (
        <div className="sp-two-col">
          {isTutor ? (
            <ErpCard
              heading="Withdrawal readiness"
              description={withdrawBlock || 'Everything is in place — you can request a withdrawal now.'}
              headerActions={
                <ErpBadge tone={readyCount === readiness.length ? 'success' : 'warning'} dot>
                  {readyCount}/{readiness.length}
                </ErpBadge>
              }
            >
              <Checklist items={readiness} />
            </ErpCard>
          ) : (
            <ErpCard heading="How your wallet works">
              <ul className="sp-steps-list">
                <li>
                  <RowIcon name="sparkles" size="sm" />
                  <span>
                    <strong>Credits are added by admin</strong>
                    <span className="sp-check-hint">
                      For top-ups or goodwill credits, <Link to={supportPath}>contact support</Link>.
                    </span>
                  </span>
                </li>
                <li>
                  <RowIcon name="receipt" size="sm" />
                  <span>
                    <strong>Pay invoices from your balance</strong>
                    <span className="sp-check-hint">
                      Choose “Pay from wallet” on any invoice in the same currency.
                    </span>
                  </span>
                </li>
                <li>
                  <RowIcon name="refresh" size="sm" />
                  <span>
                    <strong>Refunds come back here</strong>
                    <span className="sp-check-hint">Approved refunds are credited to this wallet.</span>
                  </span>
                </li>
              </ul>
            </ErpCard>
          )}
          <ErpCard
            flush
            heading="Recent activity"
            headerActions={
              tx.length ? (
                <ErpButton variant="ghost" size="sm" iconRight="arrow-right" onClick={() => setTab('ledger')}>
                  View ledger
                </ErpButton>
              ) : null
            }
          >
            {firstLoad ? (
              <ErpLoadingState message="Loading activity…" />
            ) : !recent.length ? (
              <ErpEmptyState icon="wallet" title="No wallet activity yet" description="Credits and payments will show up here." />
            ) : (
              <ul className="sp-rows">
                {recent.map((t) => (
                  <li key={t._id} className="sp-ledger-row">
                    <RowIcon
                      name={isOutflow(t) ? 'arrow-right' : 'arrow-left'}
                      tone={isOutflow(t) ? 'neutral' : 'success'}
                      size="sm"
                    />
                    <div className="sp-invoice-main">
                      <div className="sp-invoice-title">{t.description || t.type}</div>
                      <div className="sp-meta">
                        <span>{dateOnly(t.createdAt)}</span>
                      </div>
                    </div>
                    <SignedAmount t={t} cur={cur} />
                  </li>
                ))}
              </ul>
            )}
          </ErpCard>
        </div>
      )}

      {tab === 'bank' && isTutor && (
        <div className="sp-two-col is-wide-first">
          <ErpCard
            heading="Payout bank account"
            description={bank?.last4 ? `Saved account ending ${bank.last4}` : 'Withdrawals are paid to this account.'}
            headerActions={
              bank ? (
                <ErpStatusBadge status={bank.status} dot>
                  {String(bank.status || '').replace(/_/g, ' ')}
                </ErpStatusBadge>
              ) : (
                <ErpBadge>Not added</ErpBadge>
              )
            }
          >
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy && bankDirty && bankForm.holderName.trim()) saveBank();
              }}
            >
              {bank?.failReason ? (
                <ErpBanner variant="danger" title="Last verification failed">
                  {bank.failReason}
                </ErpBanner>
              ) : null}
              <div className="erp-form-grid">
                <ErpInput
                  label="Account holder name"
                  value={bankForm.holderName}
                  autoComplete="name"
                  onChange={(e) => setBankForm((f) => ({ ...f, holderName: e.target.value }))}
                />
                <ErpInput
                  label="Account number"
                  inputMode="numeric"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  placeholder={bank?.last4 ? `•••• ${bank.last4}` : ''}
                  helper={bank?.last4 ? 'Leave blank to keep the saved number' : undefined}
                />
                <ErpInput
                  label="IFSC"
                  value={bankForm.ifsc}
                  onChange={(e) => setBankForm((f) => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
                />
                <ErpInput
                  label="Bank name"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
                />
                <ErpInput
                  label="UPI ID"
                  optional
                  value={bankForm.upiId}
                  onChange={(e) => setBankForm((f) => ({ ...f, upiId: e.target.value }))}
                />
              </div>
              {bank?.status === 'verified' && bankDirty ? (
                <ErpBanner variant="warning">
                  Saving changes will reset this account to unverified — you will need to verify it again before
                  withdrawing.
                </ErpBanner>
              ) : null}
              <div className="erp-form-footer">
                <ErpButton
                  variant="secondary"
                  icon="shield-check"
                  loading={busy === 'verify'}
                  disabled={Boolean(busy) || !bank || bank.status === 'verified' || bankDirty}
                  onClick={verifyBank}
                >
                  {busy === 'verify' ? 'Verifying…' : 'Verify with ₹1'}
                </ErpButton>
                <ErpButton
                  type="submit"
                  loading={busy === 'save'}
                  disabled={Boolean(busy) || !bankDirty || !bankForm.holderName.trim()}
                >
                  {busy === 'save' ? 'Saving…' : 'Save details'}
                </ErpButton>
              </div>
            </form>
          </ErpCard>
          <ErpCard heading="How verification works">
            <ol className="sp-numbered">
              <li>
                <strong>Save your details</strong>
                <span>Holder name must match your bank records.</span>
              </li>
              <li>
                <strong>Run the ₹1 check</strong>
                <span>We deposit ₹1 to confirm the account is live.</span>
              </li>
              <li>
                <strong>Withdraw at month end</strong>
                <span>Verified accounts can request payouts in the withdrawal window.</span>
              </li>
            </ol>
          </ErpCard>
        </div>
      )}

      {tab === 'withdraw' && isTutor && (
        <div className="sp-two-col is-narrow-first">
          <ErpCard heading="Request a withdrawal" description="Admin reviews and pays out to your verified account.">
            <div className="stack">
              <Checklist items={readiness} />
              <div className="sp-withdraw-box">
                <ErpInput
                  label="Amount"
                  type="number"
                  min="1"
                  max={withdrawable || undefined}
                  step="0.01"
                  inputMode="decimal"
                  placeholder={`Up to ${money(withdrawable, cur)}`}
                  value={amount}
                  disabled={Boolean(withdrawBlock)}
                  helper={withdrawBlock || `Available: ${money(withdrawable, cur)}`}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAmount(v !== '' && Number(v) > withdrawable ? String(withdrawable) : v);
                  }}
                />
                <div className="sp-withdraw-actions">
                  <ErpButton
                    variant="secondary"
                    disabled={Boolean(withdrawBlock) || withdrawable <= 0}
                    onClick={() => setAmount(String(withdrawable))}
                  >
                    Max
                  </ErpButton>
                  <ErpButton
                    icon="download"
                    disabled={Boolean(withdrawBlock) || amountInvalid || Boolean(busy)}
                    onClick={() => {
                      startAction();
                      setConfirmWithdraw(true);
                    }}
                  >
                    Request withdrawal
                  </ErpButton>
                </div>
              </div>
            </div>
          </ErpCard>
          <ErpConfirm
            open={confirmWithdraw}
            title="Request withdrawal"
            message={`Withdraw ${money(amountNum || 0, cur)} to the account ending ${bank?.last4 || '—'}? Admin reviews and pays out.`}
            confirmLabel="Request withdrawal"
            busy={busy === 'withdraw'}
            onCancel={() => busy !== 'withdraw' && setConfirmWithdraw(false)}
            onConfirm={async () => {
              setBusy('withdraw');
              try {
                await requestWithdraw(amountNum);
                setMsg('Withdrawal requested');
                setAmount('');
                setConfirmWithdraw(false);
                load();
              } catch (err) {
                setError(errorMessage(err, 'Could not request withdrawal'));
                setConfirmWithdraw(false);
              } finally {
                setBusy('');
              }
            }}
          />
          <ErpCard flush heading="Withdrawal history" className="sp-panel">
            <div className="sp-panel-filters">
              <ErpSearch value={wdList.search} onChange={wdList.setSearch} placeholder="Search withdrawals" />
            </div>
            {loading && !withdrawals.length ? (
              <ErpLoadingState message="Loading withdrawals…" />
            ) : !withdrawals.length ? (
              <ErpEmptyState
                icon="download"
                title="No withdrawals yet"
                description="Requests you make appear here with their review status."
              />
            ) : wdList.noMatch ? (
              <ErpEmptyState icon="search" title="No matching withdrawals" description="Try a different search." />
            ) : phone ? (
              <ul className="sp-rows">
                {wdList.items.map((w) => (
                  <li key={w._id} className="sp-ledger-row">
                    <div className="sp-invoice-main">
                      <div className="sp-invoice-title num">{money(w.amount, w.currency || cur)}</div>
                      <div className="sp-meta">
                        <span>{dateOnly(w.createdAt)}</span>
                        <span>{w.cycle || 'cycle'}</span>
                        {w.bankAccountId ? <span>•••• {w.bankAccountId.last4 || ''}</span> : null}
                      </div>
                      {w.adminNote ? <div className="sp-quiet">{w.adminNote}</div> : null}
                    </div>
                    <ErpStatusBadge status={w.status} dot>
                      {w.status}
                    </ErpStatusBadge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="sp-table-wrap">
                <ErpDataTable>
                  <thead>
                    <tr>
                      <th>Requested</th>
                      <th>Cycle</th>
                      <th>Bank</th>
                      <th>Status</th>
                      <th>Note</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wdList.items.map((w) => (
                      <tr key={w._id}>
                        <td className="sp-nowrap">{dateOnly(w.createdAt)}</td>
                        <td className="sp-nowrap">{w.cycle || '—'}</td>
                        <td className="sp-nowrap">{w.bankAccountId ? `•••• ${w.bankAccountId.last4 || ''}` : '—'}</td>
                        <td>
                          <ErpStatusBadge status={w.status} dot>
                            {w.status}
                          </ErpStatusBadge>
                        </td>
                        <td>{w.adminNote || '—'}</td>
                        <td className="num">
                          <strong>{money(w.amount, w.currency || cur)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ErpDataTable>
              </div>
            )}
            {wdList.total > 0 && <ErpPager {...wdList.pagerProps} noun="withdrawal" />}
          </ErpCard>
        </div>
      )}

      {tab === 'ledger' && (
        <ErpCard flush className="sp-panel">
          <div className="sp-panel-filters is-split">
            <ErpSearch value={txList.search} onChange={txList.setSearch} placeholder="Search ledger" />
            <span className="sp-quiet">
              {txTotal > tx.length
                ? `Latest ${tx.length} of ${txTotal} transactions`
                : 'Showing the latest 30 transactions'}
            </span>
          </div>
          {loading && !tx.length ? (
            <ErpLoadingState message="Loading ledger…" />
          ) : !tx.length ? (
            <ErpEmptyState icon="wallet" title="No wallet activity yet" description="Credits and payments will show up here." />
          ) : txList.noMatch ? (
            <ErpEmptyState icon="search" title="No matching transactions" description="Try a different search." />
          ) : (
            ledgerRows(txList.items)
          )}
          {txList.total > 0 && <ErpPager {...txList.pagerProps} noun="transaction" />}
        </ErpCard>
      )}
    </div>
  );
}
