import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pendingVerifications, reviewVerification } from '../../api';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpConfirm,
  ErpInput,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpTabs,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import {
  AdminCell,
  AdminListState,
  AdminRowActions,
  AdminSection,
  AdminStatus,
  AdminSummary,
  AdminTableCard,
  AdminToolbar,
} from './AdminKit';
import { useAdminModalQuery } from './useAdminModalQuery';

const DOC_FIELDS = [
  { key: 'identity', label: 'Identity' },
  { key: 'degree', label: 'Degree' },
  { key: 'certificate', label: 'Certificate' },
  { key: 'resume', label: 'Resume' },
];

const STATUS_FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All submitted' },
];

function allDocs(v) {
  return DOC_FIELDS.flatMap(({ key, label }) =>
    (v.documents?.[key] || []).map((d) => ({ ...d, field: key, fieldLabel: label }))
  );
}

export default function AdminVerificationsPage() {
  const [params] = useSearchParams();
  const { editId, openEdit, close } = useAdminModalQuery();
  const [filter, setFilter] = useState(() =>
    STATUS_FILTERS.some((f) => f.value === params.get('status')) ? params.get('status') : 'pending'
  );
  const [items, setItems] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [rejectReason, setRejectReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pendingVerifications(filter);
      setItems(data || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const list = useListFilter(
    items,
    (v) => [v.tutorUserId?.name, v.tutorUserId?.phone, v.status, v.notes].filter(Boolean).join(' '),
    { resetKey: filter }
  );
  const selected = items.find((v) => v._id === editId) || null;
  const selectedTutorId = selected ? selected.tutorUserId?._id || selected.tutorUserId : '';

  useEffect(() => {
    if (!selected) return;
    const next = {};
    allDocs(selected).forEach((d) => {
      next[d._id] = { status: d.status, rejectReason: d.rejectReason || '' };
    });
    setDecisions(next);
    setRejectReason(selected.rejectReason || '');
    setAdminNote(selected.adminNote || '');
    setModalError('');
    setConfirm(null);
  }, [editId, items.length]);

  const unverifiedRefs = (selected?.references || []).filter((r) => !r.otpVerified).length;

  const setDecision = (docId, patch) =>
    setDecisions((d) => ({ ...d, [docId]: { ...d[docId], ...patch } }));

  const review = async (status, confirmed = false) => {
    setModalError('');
    const docs = allDocs(selected);
    const documents = docs
      .filter((d) => decisions[d._id])
      .map((d) => ({
        field: d.field,
        docId: d._id,
        status: decisions[d._id].status,
        rejectReason: decisions[d._id].rejectReason || '',
      }));
    const rejectedDocs = docs.filter((d) => decisions[d._id]?.status === 'rejected');
    const missing = rejectedDocs.filter((d) => !String(decisions[d._id].rejectReason || '').trim());
    if (missing.length) {
      setModalError(
        `Add a reason for each rejected document (${missing.map((d) => d.fieldLabel).join(', ')}).`
      );
      return;
    }
    const reason =
      rejectReason ||
      (status === 'rejected' && rejectedDocs.length
        ? rejectedDocs.map((d) => `${d.fieldLabel}: ${decisions[d._id].rejectReason}`).join('; ')
        : '');
    if (status === 'rejected' && !reason) {
      setModalError('Enter a rejection reason, or reject individual documents with reasons.');
      return;
    }
    if (!confirmed) {
      if (status === 'approved' && unverifiedRefs > 0) {
        setConfirm({
          status,
          title: 'Approve with unverified references',
          label: 'Approve anyway',
          danger: false,
          message: `${unverifiedRefs} of ${selected.references.length} reference${
            selected.references.length === 1 ? ' has' : 's have'
          } not verified by OTP. Approve this tutor anyway?`,
        });
        return;
      }
      if (status === 'rejected' && selected.status === 'approved') {
        setConfirm({
          status,
          title: 'Reject an approved tutor',
          label: 'Reject tutor',
          danger: true,
          message: `${
            selected.tutorUserId?.name || 'This tutor'
          } is currently approved. Rejecting removes their verified status and hides them from search until they resubmit.`,
        });
        return;
      }
    }
    setBusy(true);
    try {
      await reviewVerification(selectedTutorId, { status, rejectReason: reason, adminNote, documents });
      setConfirm(null);
      close();
      load();
    } catch (err) {
      setConfirm(null);
      setModalError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const docLabel = (d) => d.name || String(d.url || '').split('/').pop() || 'Document';

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Review tutor documents and references. Rejections always carry a reason for the tutor." />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}

      <AdminTableCard
        tabs={
          <ErpTabs
            value={filter}
            onChange={setFilter}
            tabs={STATUS_FILTERS.map((o) => ({
              value: o.value,
              label: o.label,
              count: o.value === filter && !loading ? items.length : null,
            }))}
          />
        }
        toolbar={
          <AdminToolbar
            right={
              <ErpButton variant="ghost" size="sm" icon="refresh" onClick={load}>
                Refresh
              </ErpButton>
            }
          >
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search tutor or phone" />
          </AdminToolbar>
        }
        footer={list.pages > 1 ? <ErpPager {...list.pagerProps} noun="verification" /> : null}
      >
        {loading || !items.length || list.noMatch ? (
          <AdminListState
            loading={loading}
            empty={!items.length}
            noMatch={list.noMatch}
            emptyProps={{
              icon: filter === 'pending' ? 'check-circle' : 'shield-check',
              title: filter === 'pending' ? 'No verifications waiting' : 'Nothing in this view',
              description:
                filter === 'pending'
                  ? 'New tutor submissions will appear here for review.'
                  : 'Switch tabs to see other submissions.',
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th className="num">Documents</th>
                  <th>References</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((v) => {
                  const refs = v.references || [];
                  const verifiedRefs = refs.filter((r) => r.otpVerified).length;
                  return (
                    <tr key={v._id} className="erp-row-click" onClick={() => openEdit(v._id)}>
                      <td className="adm-primary">
                        <AdminCell
                          avatarName={v.tutorUserId?.name || v.tutorUserId?.phone || 'Tutor'}
                          title={v.tutorUserId?.name || v.tutorUserId?.phone || 'Tutor'}
                          sub={v.notes || v.tutorUserId?.phone || null}
                        />
                      </td>
                      <td className="num" data-label="Documents">
                        {allDocs(v).length}
                      </td>
                      <td data-label="References">
                        {refs.length ? (
                          <ErpBadge tone={verifiedRefs === refs.length ? 'success' : 'warning'}>
                            {verifiedRefs}/{refs.length} verified
                          </ErpBadge>
                        ) : (
                          <span className="muted">None</span>
                        )}
                      </td>
                      <td data-label="Submitted" className="muted adm-nowrap">
                        {formatDate(v.submittedAt || v.updatedAt)}
                      </td>
                      <td data-label="Status">
                        <AdminStatus status={v.status} />
                      </td>
                      <AdminRowActions>
                        <ErpButton
                          variant={v.status === 'pending' ? 'secondary' : 'ghost'}
                          size="sm"
                          iconRight="chevron-right"
                          onClick={() => openEdit(v._id)}
                        >
                          Review
                        </ErpButton>
                      </AdminRowActions>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      <ErpModal
        open={Boolean(editId) && !confirm}
        title="Review verification"
        size="lg"
        onClose={close}
        footer={
          selected ? (
            <>
              <ErpButton variant="secondary" onClick={close} disabled={busy}>
                Cancel
              </ErpButton>
              <ErpButton variant="danger" disabled={busy} onClick={() => review('rejected')}>
                Reject request
              </ErpButton>
              <ErpButton icon="check" loading={busy} onClick={() => review('approved')}>
                Approve request
              </ErpButton>
            </>
          ) : null
        }
      >
        {modalError && <ErpBanner variant="danger">{modalError}</ErpBanner>}
        {!selected ? (
          <AdminListState
            empty
            emptyProps={{
              icon: 'shield-check',
              title: 'Verification not found',
              description: 'It may be listed under another tab.',
            }}
          />
        ) : (
          <>
            <AdminSummary
              avatarName={selected.tutorUserId?.name || selected.tutorUserId?.phone || 'Tutor'}
              eyebrow="Tutor verification"
              title={selected.tutorUserId?.name || selected.tutorUserId?.phone || 'Tutor'}
              meta={[
                selected.tutorUserId?.phone,
                `Submitted ${formatDate(selected.submittedAt || selected.updatedAt)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              side={<AdminStatus status={selected.status} />}
            />
            {selected.notes ? (
              <AdminSection title="Tutor notes">
                <p className="adm-note">{selected.notes}</p>
              </AdminSection>
            ) : null}

            <AdminSection
              title="References"
              description={
                selected.references?.length
                  ? `${selected.references.length - unverifiedRefs} of ${selected.references.length} verified by OTP`
                  : null
              }
            >
              {unverifiedRefs > 0 ? (
                <div style={{ marginBottom: '0.75rem' }}>
                  <ErpBanner variant="warning">
                    {unverifiedRefs} of {selected.references.length} reference
                    {selected.references.length === 1 ? '' : 's'} not verified by OTP.
                  </ErpBanner>
                </div>
              ) : null}
              {!selected.references?.length ? (
                <p className="muted" style={{ margin: 0 }}>
                  No references provided.
                </p>
              ) : (
                <div className="adm-doc-list">
                  <table className="erp-data-table adm-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Relation</th>
                        <th>Contact</th>
                        <th>OTP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.references.map((r) => (
                        <tr key={r._id}>
                          <td className="adm-primary">
                            <strong>{r.name}</strong>
                          </td>
                          <td data-label="Relation">{r.relation || '—'}</td>
                          <td data-label="Contact">
                            <AdminCell title={r.phone} sub={r.email || null} />
                          </td>
                          <td data-label="OTP">
                            <ErpBadge tone={r.otpVerified ? 'success' : 'warning'} dot>
                              {r.otpVerified ? 'Verified' : 'Unverified'}
                            </ErpBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminSection>

            <AdminSection
              title="Documents"
              description="Approve or reject each file. Rejected files need a reason the tutor will see."
            >
              <div className="adm-doc-list">
                {DOC_FIELDS.map(({ key, label }) => {
                  const docs = selected.documents?.[key] || [];
                  return (
                    <div key={key} className="adm-doc-group">
                      <div className="adm-doc-group-head">
                        <span>{label}</span>
                        {docs.length ? (
                          <span className="muted">
                            {docs.length} file{docs.length === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <ErpBadge tone="neutral">Not uploaded</ErpBadge>
                        )}
                      </div>
                      {docs.map((d) => (
                        <div key={d._id} className="adm-doc-row">
                          <a
                            className="adm-doc-link"
                            href={mediaUrl(d.url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Icon name="file-text" size={15} />
                            <span>{docLabel(d)}</span>
                            <Icon name="external-link" size={13} />
                          </a>
                          <ErpSelect
                            value={decisions[d._id]?.status || d.status}
                            aria-label={`Decision for ${docLabel(d)}`}
                            options={[
                              { value: 'pending', label: 'Pending' },
                              { value: 'approved', label: 'Approve' },
                              { value: 'rejected', label: 'Reject' },
                            ]}
                            onChange={(e) => setDecision(d._id, { status: e.target.value })}
                          />
                          {decisions[d._id]?.status === 'rejected' && (
                            <div className="adm-doc-reason">
                              <ErpInput
                                aria-label={`Reason for rejecting ${docLabel(d)}`}
                                placeholder="Reason (required, shown to the tutor)"
                                value={decisions[d._id]?.rejectReason || ''}
                                onChange={(e) => setDecision(d._id, { rejectReason: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </AdminSection>

            <AdminSection title="Decision">
              <div className="stack" style={{ gap: '0.875rem' }}>
                <ErpTextarea
                  id="verification-reject-reason"
                  label="Rejection reason"
                  optional
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Shown to the tutor when rejecting."
                  helper="Required when rejecting. Leave blank to use the per-document reasons."
                />
                <ErpInput
                  id="verification-admin-note"
                  label="Internal admin note"
                  optional
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  helper="Only visible to admins."
                />
              </div>
            </AdminSection>
          </>
        )}
      </ErpModal>
      <ErpConfirm
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.label}
        danger={Boolean(confirm?.danger)}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => review(confirm.status, true)}
      />
    </div>
  );
}
