import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  adminGetUser,
  adminSetUserStatus,
  adminUserBlocks,
  adminUsers,
  adminVoidUserOpen,
  adminVerifyTax,
} from '../../api';
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
import { useCatalog } from '../../context/CatalogContext';
import { mediaUrl } from '../../utils/mediaUrl';
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

// DOB is a calendar date stored at UTC midnight; never shift it by the viewer's zone.
function dobText(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const PAGE_SIZE = 20;
const VOIDING = ['blacklisted', 'suspended'];
const BLOCK_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
};
const BLOCK_HEAD = { margin: '0 0 0.5rem', fontSize: 'var(--erp-font-sm)', fontWeight: 600 };
const BLOCK_LIST = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' };
const BLOCK_ITEM = { display: 'flex', flexDirection: 'column', minWidth: 0, overflowWrap: 'anywhere' };

function BlockRows({ rows, field, empty }) {
  if (!rows?.length) return <p className="muted" style={{ margin: 0 }}>{empty}</p>;
  return (
    <ul style={BLOCK_LIST}>
      {rows.map((r) => {
        const u = r[field] || {};
        return (
          <li key={r._id} style={BLOCK_ITEM}>
            <strong>{u.name || u.refCode || 'User'}</strong>
            <span className="muted">
              {[titleCase(u.role || ''), u.refCode, r.createdAt ? formatDate(r.createdAt) : '']
                .filter(Boolean)
                .join(' · ')}
            </span>
            {r.reason ? <span className="muted" style={{ fontStyle: 'italic' }}>“{r.reason}”</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

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
  const { labelFor } = useCatalog();
  const [detail, setDetail] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidBusy, setVoidBusy] = useState(false);
  const [taxBusy, setTaxBusy] = useState(false);

  // Full record (DOB/age, sex, currency, emergency contact, intro page, links, blocks) for the modal.
  useEffect(() => {
    setDetail(null);
    setBlocks(null);
    setVoidOpen(false);
    setVoidReason('');
    setTaxBusy(false);
    if (!editId) return undefined;
    let cancelled = false;
    adminGetUser(editId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        if (d?.user) {
          setSelected((cur) => (cur && String(cur._id) === String(d.user._id) ? cur : d.user));
        }
      })
      .catch(() => {});
    adminUserBlocks(editId)
      .then((b) => !cancelled && setBlocks(b))
      .catch(() => !cancelled && setBlocks({ byUser: [], againstUser: [] }));
    return () => {
      cancelled = true;
    };
  }, [editId, reloadKey]);

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
      adminGetUser(next._id)
        .then(setDetail)
        .catch(() => {});
      setStaged('');
      setReason('');
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const voidOpenItems = async () => {
    if (!selected) return;
    setVoidBusy(true);
    setModalError('');
    try {
      const res = await adminVoidUserOpen(selected._id, voidReason.trim());
      setNotice(
        `Voided ${res?.cancelledBookings ?? 0} upcoming booking${res?.cancelledBookings === 1 ? '' : 's'} and ${
          res?.failedPayments ?? 0
        } open invoice${res?.failedPayments === 1 ? '' : 's'}. Account status unchanged.`
      );
      setVoidOpen(false);
      setVoidReason('');
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setVoidBusy(false);
    }
  };

  const recheckTax = async () => {
    if (!selected) return;
    setTaxBusy(true);
    setModalError('');
    try {
      await adminVerifyTax(selected._id);
      const next = await adminGetUser(selected._id);
      setDetail(next);
      setNotice('GST checksum / portal lookup and identity checksums re-ran.');
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setTaxBusy(false);
    }
  };

  const d = detail?.details || {};
  const ec = d.emergencyContact || {};
  const hasEc = Boolean(ec.name || ec.phone || ec.email);
  const links = detail?.links || [];

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
              avatarSrc={d.avatar || selected.avatarUrl || selected.avatar || undefined}
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
            {selected.role !== 'admin' ? (
              <AdminSection title="Personal">
                {!detail ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Loading…
                  </p>
                ) : (
                  <AdminKV
                    items={[
                      {
                        label: 'Date of birth',
                        value: d.dateOfBirth
                          ? `${dobText(d.dateOfBirth)}${d.age != null ? ` · age ${d.age}` : ''}`
                          : 'Not set',
                      },
                      { label: 'Sex', value: d.sex ? labelFor('sex', d.sex) : 'Not set' },
                      { label: 'Preferred currency', value: d.preferredCurrency || 'Not set' },
                      selected.role === 'tutor' && {
                        label: 'Teaching currency',
                        value: detail?.profile?.currency || '—',
                      },
                      {
                        label: 'Intro page',
                        value: d.introPageUrl ? (
                          <a href={mediaUrl(d.introPageUrl)} target="_blank" rel="noreferrer">
                            Open intro page
                          </a>
                        ) : (
                          'Not added'
                        ),
                      },
                      {
                        label: 'Profile picture',
                        value: d.avatar ? (
                          <a href={mediaUrl(d.avatar)} target="_blank" rel="noreferrer">
                            View picture
                          </a>
                        ) : (
                          'Not added'
                        ),
                      },
                      {
                        label: 'Emergency contact',
                        full: true,
                        value: hasEc
                          ? [ec.name, ec.relationship ? `(${titleCase(ec.relationship)})` : '', ec.phone, ec.email]
                              .filter(Boolean)
                              .join(' · ')
                          : 'Not added',
                      },
                      links.length && {
                        label: selected.role === 'parent' ? 'Linked children' : 'Linked parents',
                        full: true,
                        value: links
                          .map((l) => {
                            const o = selected.role === 'parent' ? l.studentUserId : l.parentUserId;
                            return [o?.name || o?.refCode || 'User', o?.phone].filter(Boolean).join(' · ');
                          })
                          .join(', '),
                      },
                      detail?.blacklist?.length && {
                        label: 'Signup blocklist',
                        full: true,
                        value: detail.blacklist.map((b) => `${b.kind}: ${b.value}`).join(', '),
                      },
                    ]}
                  />
                )}
              </AdminSection>
            ) : null}
            {selected.role !== 'admin' ? (
              <AdminSection
                title="Tax & identity"
                description="GSTIN uses the official GSTN checksum then a live taxpayer lookup. Aadhaar uses UIDAI Verhoeff; SSN uses SSA issuance rules."
                actions={
                  <ErpButton variant="secondary" size="sm" icon="refresh" loading={taxBusy} onClick={recheckTax}>
                    Re-check
                  </ErpButton>
                }
              >
                {!detail ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Loading…
                  </p>
                ) : (
                  <AdminKV
                    items={[
                      detail?.profile?.gst?.hasGst && {
                        label: 'GSTIN',
                        value: [detail.profile.gst.number, detail.profile.gst.legalName].filter(Boolean).join(' · ') || '—',
                      },
                      (detail?.profile?.gst?.status || detail?.profile?.gst?.hasGst) && {
                        label: 'GST status',
                        value: [
                          titleCase(String(detail.profile.gst.status || '').replace(/_/g, ' ')),
                          detail.profile.gst.portalNote,
                        ]
                          .filter(Boolean)
                          .join(' — '),
                        full: Boolean(detail.profile.gst.portalNote),
                      },
                      detail?.profile?.identity?.type && {
                        label: 'ID type',
                        value: titleCase(detail.profile.identity.type),
                      },
                      {
                        label: 'Identity',
                        value: detail?.profile?.identity?.number
                          ? [
                              detail.profile.identity.number,
                              titleCase(String(detail.profile.identity.status || '').replace(/_/g, ' ')),
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : 'Not added',
                      },
                      detail?.profile?.identity?.portalNote && {
                        label: 'ID check',
                        value: detail.profile.identity.portalNote,
                        full: true,
                      },
                    ]}
                  />
                )}
              </AdminSection>
            ) : null}
            <AdminSection
              title="Blocks"
              description="User-to-user blocks. Blocks made by a parent also apply to their linked children."
            >
              {!blocks ? (
                <p className="muted" style={{ margin: 0 }}>
                  Loading…
                </p>
              ) : (
                <div style={BLOCK_GRID}>
                  <div>
                    <h4 style={BLOCK_HEAD}>Blocked by this user ({blocks.byUser?.length || 0})</h4>
                    <BlockRows rows={blocks.byUser} field="targetUserId" empty="Has not blocked anyone." />
                  </div>
                  <div>
                    <h4 style={BLOCK_HEAD}>Blocked this user ({blocks.againstUser?.length || 0})</h4>
                    <BlockRows rows={blocks.againstUser} field="byUserId" empty="Nobody has blocked this user." />
                  </div>
                </div>
              )}
            </AdminSection>
            {!isSelf && selected.role !== 'admin' ? (
              <AdminSection
                title="Open bookings & invoices"
                description="Cancel this user's upcoming bookings and void their open invoices without changing the account status."
                actions={
                  !voidOpen ? (
                    <ErpButton variant="secondary" size="sm" icon="x-circle" onClick={() => setVoidOpen(true)}>
                      Void open bookings
                    </ErpButton>
                  ) : null
                }
              >
                {voidOpen ? (
                  <div className="stack" style={{ gap: '0.75rem' }}>
                    <ErpBanner variant="warning" title="Void open bookings?">
                      Upcoming bookings are cancelled, slots freed, open invoices voided and the other parties
                      notified. This cannot be undone.
                    </ErpBanner>
                    <ErpTextarea
                      label="Reason"
                      id="user-void-reason"
                      rows={2}
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="Shown on the cancelled bookings"
                    />
                    <div className="row" style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <ErpButton variant="ghost" size="sm" onClick={() => setVoidOpen(false)} disabled={voidBusy}>
                        Cancel
                      </ErpButton>
                      <ErpButton variant="danger" size="sm" loading={voidBusy} onClick={voidOpenItems}>
                        Void now
                      </ErpButton>
                    </div>
                  </div>
                ) : null}
              </AdminSection>
            ) : null}
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
                          {staged === 'blacklisted'
                            ? " The user will not be able to sign in, and their phone and email can't be used for a new account."
                            : ''}
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
