import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminSetUserStatus, adminUsers } from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpModal,
  ErpPageHeader,
  ErpPager,
  ErpSearch,
  ErpSelect,
  ErpTabs,
  ErpTextarea,
} from '../../components/erp';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import {
  AdminCell,
  AdminKV,
  AdminListState,
  AdminRowActions,
  AdminSection,
  AdminStatus,
  AdminSummary,
  AdminTableCard,
  AdminToolbar,
} from './AdminKit';
import { ROLE_OPTIONS, USER_STATUS_OPTIONS, USER_STATUS_SET_OPTIONS, titleCase } from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

const PAGE_SIZE = 20;
const VOIDING = ['blacklisted', 'suspended'];
const ROLE_VALUES = ROLE_OPTIONS.map((o) => o.value).filter(Boolean);
const STATUS_VALUES = USER_STATUS_OPTIONS.map((o) => o.value).filter(Boolean);

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [params] = useSearchParams();
  const myId = String(me?._id || me?.id || '');
  const { editId, openEdit, close } = useAdminModalQuery();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState(() =>
    ROLE_VALUES.includes(params.get('role')) ? params.get('role') : ''
  );
  const [status, setStatus] = useState(() =>
    STATUS_VALUES.includes(params.get('status')) ? params.get('status') : ''
  );
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);
  const [staged, setStaged] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    adminUsers({ role, status, search: query, page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setUsers(data?.items || []);
        setTotal(data?.total || 0);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [role, status, page, query, reloadKey]);

  useEffect(() => {
    setModalError('');
    setNotice('');
    setStaged('');
    setReason('');
    if (!editId) {
      setSelected(null);
      return;
    }
    const found = users.find((u) => u._id === editId);
    if (found) setSelected(found);
    // only resync when the opened user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  useEffect(() => {
    if (editId && !selected) {
      const found = users.find((u) => u._id === editId);
      if (found) setSelected(found);
    }
  }, [users, editId, selected]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isSelf = selected && String(selected._id) === myId;

  const submitSearch = () => {
    setPage(1);
    setQuery(searchInput.trim());
    setReloadKey((k) => k + 1);
  };

  const applyStatus = async () => {
    if (!selected || !staged) return;
    if (!reason.trim()) {
      setModalError('Enter a reason for this status change.');
      return;
    }
    setBusy(true);
    setModalError('');
    try {
      const extras = { reason: reason.trim() };
      if (VOIDING.includes(staged)) extras.voidOpen = true;
      const updated = await adminSetUserStatus(selected._id, staged, extras);
      const next = { ...selected, ...(updated || {}), status: updated?.status || staged };
      setSelected(next);
      setUsers((rows) => rows.map((u) => (u._id === next._id ? { ...u, ...next } : u)));
      setNotice(`Status changed to ${titleCase(next.status)}.`);
      setStaged('');
      setReason('');
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const filtered = Boolean(query || status);

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Find any account, check its standing, and suspend or restore access." />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}

      <AdminTableCard
        tabs={
          <ErpTabs
            value={role || 'all'}
            onChange={(value) => {
              setPage(1);
              setRole(value === 'all' ? '' : value);
            }}
            tabs={ROLE_OPTIONS.map((o) => ({
              value: o.value || 'all',
              label: o.value ? `${o.label}s` : 'All users',
            }))}
          />
        }
        toolbar={
          <AdminToolbar
            right={
              !loading ? (
                <span className="adm-result-count">
                  {total} user{total === 1 ? '' : 's'}
                </span>
              ) : null
            }
          >
            <ErpSearch
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search name or phone"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitSearch();
                }
              }}
            />
            <ErpSelect
              inline
              value={status}
              options={USER_STATUS_OPTIONS}
              aria-label="Filter by status"
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            />
            {filtered ? (
              <ErpButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  setQuery('');
                  setStatus('');
                  setPage(1);
                }}
              >
                Clear
              </ErpButton>
            ) : null}
          </AdminToolbar>
        }
        footer={
          total > PAGE_SIZE ? (
            <ErpPager
              page={page}
              pages={pages}
              total={total}
              noun="user"
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pages, p + 1))}
            />
          ) : null
        }
      >
        {loading || !users.length ? (
          <AdminListState
            loading={loading}
            empty
            emptyProps={{
              icon: filtered ? 'search' : 'users',
              title: filtered ? 'No users match these filters' : 'No users yet',
              description: filtered
                ? 'Try another name, phone number or status.'
                : 'Accounts appear here as people sign up.',
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="erp-row-click" onClick={() => openEdit(u._id)}>
                    <td className="adm-primary">
                      <AdminCell
                        avatarName={u.name || u.phone || 'User'}
                        avatar={u.avatarUrl || u.avatar || null}
                        title={u.name || 'Unnamed user'}
                        sub={[u.phone, u.refCode].filter(Boolean).join(' · ') || null}
                        tags={
                          String(u._id) === myId ? <span className="erp-chip erp-chip-brand">You</span> : null
                        }
                      />
                    </td>
                    <td data-label="Role">
                      <span className="erp-tag">{titleCase(u.role)}</span>
                    </td>
                    <td data-label="Status">
                      <AdminStatus status={u.status} />
                    </td>
                    <td data-label="Joined" className="muted adm-nowrap">
                      {u.createdAt ? formatDate(u.createdAt) : '—'}
                    </td>
                    <AdminRowActions>
                      <ErpButton
                        variant="ghost"
                        size="sm"
                        iconRight="chevron-right"
                        onClick={() => openEdit(u._id)}
                      >
                        Manage
                      </ErpButton>
                    </AdminRowActions>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      <ErpModal
        open={Boolean(editId)}
        title="Manage user"
        size="md"
        onClose={close}
        footer={
          <>
            <ErpButton variant="secondary" onClick={close} disabled={busy}>
              Close
            </ErpButton>
            {staged ? (
              <ErpButton
                variant={VOIDING.includes(staged) ? 'danger' : 'primary'}
                onClick={applyStatus}
                loading={busy}
                disabled={!reason.trim()}
              >
                {`Set ${titleCase(staged)}`}
              </ErpButton>
            ) : null}
          </>
        }
      >
        {modalError && <ErpBanner variant="danger">{modalError}</ErpBanner>}
        {notice && <ErpBanner variant="success">{notice}</ErpBanner>}
        {!selected ? (
          <AdminListState
            empty
            emptyProps={{
              icon: 'user',
              title: 'User not on this page',
              description: 'Close this dialog and search for the user again.',
            }}
          />
        ) : (
          <>
            <AdminSummary
              avatarName={selected.name || selected.phone || 'User'}
              avatarSrc={selected.avatarUrl || selected.avatar || undefined}
              eyebrow={titleCase(selected.role)}
              title={selected.name || 'Unnamed user'}
              meta={selected.phone}
              side={<AdminStatus status={selected.status} />}
            />
            <AdminSection title="Account">
              <AdminKV
                items={[
                  { label: 'Phone', value: selected.phone || '—' },
                  { label: 'Role', value: titleCase(selected.role) },
                  selected.refCode && { label: 'Reference', value: selected.refCode },
                  selected.email && { label: 'Email', value: selected.email },
                  selected.createdAt && { label: 'Joined', value: formatDate(selected.createdAt) },
                  selected.blacklistReason && {
                    label: 'Status reason',
                    value: selected.blacklistReason,
                    full: true,
                  },
                ]}
              />
            </AdminSection>
            <AdminSection
              title="Account status"
              description={
                isSelf ? null : 'Suspending or blacklisting cancels open bookings and voids invoices.'
              }
            >
              {isSelf ? (
                <p className="muted" style={{ margin: 0 }}>
                  You cannot change the status of your own account.
                </p>
              ) : (
                <div className="stack" style={{ gap: '0.875rem' }}>
                  <ErpSelect
                    label="Status"
                    value={staged || selected.status}
                    options={USER_STATUS_SET_OPTIONS}
                    disabled={busy}
                    onChange={(e) => {
                      const next = e.target.value;
                      setNotice('');
                      setModalError('');
                      setStaged(next === selected.status ? '' : next);
                    }}
                  />
                  {staged ? (
                    <>
                      {VOIDING.includes(staged) ? (
                        <ErpBanner variant="danger" title={`${titleCase(staged)} this account?`}>
                          This cancels the user&apos;s upcoming bookings, voids their open invoices, and
                          notifies the other parties.
                          {staged === 'blacklisted' ? ' The user will not be able to sign in.' : ''}
                        </ErpBanner>
                      ) : null}
                      <ErpTextarea
                        label="Reason"
                        id="user-status-reason"
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why is this status changing?"
                        helper="Required. Kept on the account for other admins."
                      />
                    </>
                  ) : null}
                </div>
              )}
            </AdminSection>
          </>
        )}
      </ErpModal>
    </div>
  );
}
