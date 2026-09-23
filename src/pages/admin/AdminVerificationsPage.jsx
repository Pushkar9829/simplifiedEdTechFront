import { useEffect, useState } from 'react';
import { pendingVerifications, reviewVerification } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
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
  const { editId, openEdit, close } = useAdminModalQuery();
  const [filter, setFilter] = useState('pending');
  const [items, setItems] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [rejectReason, setRejectReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pendingVerifications(filter);
      setItems(data || []);
    } catch (err) {
      setError(err.message);
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
  }, [editId, items.length]);

  const setDecision = (docId, patch) =>
    setDecisions((d) => ({ ...d, [docId]: { ...d[docId], ...patch } }));

  const review = async (status) => {
    setError('');
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
    const reason =
      rejectReason ||
      (status === 'rejected' && rejectedDocs.length
        ? rejectedDocs.map((d) => `${d.fieldLabel}: ${decisions[d._id].rejectReason}`).join('; ')
        : '');
    if (status === 'rejected' && !reason) {
      setError('Enter a rejection reason, or reject individual documents with reasons.');
      return;
    }
    setBusy(true);
    try {
      await reviewVerification(selectedTutorId, { status, rejectReason: reason, adminNote, documents });
      close();
      load();
    } catch (err) {
      setError(err.errors?.length ? err.errors.map((e) => e.message).join(', ') : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Review tutor documents and references. Rejections always carry a reason for the tutor." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={filter}
          onChange={setFilter}
          tabs={STATUS_FILTERS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search tutor or phone" />
        <div className="avail-bar-actions">
          <ErpButton variant="secondary" onClick={load}>
            Refresh
          </ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !items.length ? (
          <div className="empty">No verifications in this view.</div>
        ) : list.noMatch ? (
          <div className="empty">No verifications match that search.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Phone</th>
                  <th>Documents</th>
                  <th>References</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((v) => {
                  const refs = v.references || [];
                  return (
                    <tr key={v._id} className="erp-row-click" onClick={() => openEdit(v._id)}>
                      <td>
                        <strong>{v.tutorUserId?.name || v.tutorUserId?.phone || 'Tutor'}</strong>
                        {v.notes && <div className="muted">{v.notes}</div>}
                      </td>
                      <td>{v.tutorUserId?.phone || '—'}</td>
                      <td>{allDocs(v).length}</td>
                      <td>
                        {refs.filter((r) => r.otpVerified).length} / {refs.length} verified
                      </td>
                      <td>
                        <ErpStatusBadge status={v.status}>{v.status}</ErpStatusBadge>
                      </td>
                      <td>{formatDate(v.submittedAt || v.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="verification" />}
      </ErpCard>

      <ErpModal
        open={Boolean(editId)}
        title="Review verification"
        size="lg"
        onClose={close}
        footer={
          selected ? (
            <>
              <ErpButton variant="secondary" onClick={close}>
                Cancel
              </ErpButton>
              <ErpButton variant="danger" disabled={busy} onClick={() => review('rejected')}>
                Reject request
              </ErpButton>
              <ErpButton disabled={busy} onClick={() => review('approved')}>
                Approve request
              </ErpButton>
            </>
          ) : null
        }
      >
        {!selected ? (
          <div className="empty">Verification not found.</div>
        ) : (
          <div className="stack">
            <dl className="erp-detail-grid">
              <dt>Tutor</dt>
              <dd>{selected.tutorUserId?.name || selected.tutorUserId?.phone || 'Tutor'}</dd>
              <dt>Phone</dt>
              <dd>{selected.tutorUserId?.phone || '—'}</dd>
              <dt>Status</dt>
              <dd>
                <ErpStatusBadge status={selected.status}>{selected.status}</ErpStatusBadge>
              </dd>
            </dl>
            {selected.notes && <p>{selected.notes}</p>}

            <h4 style={{ margin: 0 }}>References</h4>
            {!selected.references?.length ? (
              <div className="muted">No references provided.</div>
            ) : (
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relation</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>OTP</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.references.map((r) => (
                    <tr key={r._id}>
                      <td>{r.name}</td>
                      <td>{r.relation || '—'}</td>
                      <td>{r.phone}</td>
                      <td>{r.email || '—'}</td>
                      <td>
                        <ErpStatusBadge status={r.otpVerified ? 'approved' : 'pending'}>
                          {r.otpVerified ? 'verified' : 'unverified'}
                        </ErpStatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            )}

            <h4 style={{ margin: 0 }}>Documents</h4>
            {DOC_FIELDS.map(({ key, label }) => {
              const docs = selected.documents?.[key] || [];
              return (
                <div key={key} className="erp-card-sm stack">
                  <strong>
                    {label} ({docs.length})
                  </strong>
                  {!docs.length && <span className="muted">Not uploaded</span>}
                  {docs.map((d) => (
                    <div key={d._id} className="row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                      <a href={mediaUrl(d.url)} target="_blank" rel="noreferrer">
                        {d.name || d.url.split('/').pop()}
                      </a>
                      <ErpSelect
                        inline
                        value={decisions[d._id]?.status || d.status}
                        options={[
                          { value: 'pending', label: 'Pending' },
                          { value: 'approved', label: 'Approve' },
                          { value: 'rejected', label: 'Reject' },
                        ]}
                        onChange={(e) => setDecision(d._id, { status: e.target.value })}
                      />
                      {decisions[d._id]?.status === 'rejected' && (
                        <input
                          className="erp-search"
                          style={{ minWidth: 220 }}
                          placeholder="Reason (required)"
                          value={decisions[d._id]?.rejectReason || ''}
                          onChange={(e) => setDecision(d._id, { rejectReason: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="field">
              <label>Rejection reason (shown to tutor)</label>
              <textarea
                className="erp-search"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Required when rejecting. Leave blank to use per-document reasons."
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Internal admin note</label>
              <input className="erp-search" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
            </div>
          </div>
        )}
      </ErpModal>
    </div>
  );
}
