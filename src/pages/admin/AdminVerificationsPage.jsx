import { useEffect, useState } from 'react';
import { pendingVerifications, reviewVerification } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPageHeader,
  ErpToolbar,
} from '../../components/erp';
import { formatDate } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { useAdminModalQuery } from './useAdminModalQuery';

function DocChip({ path, label }) {
  const href = mediaUrl(path);
  if (!href) {
    return (
      <span className="muted" style={{ fontSize: '0.85em' }}>
        {label}: not uploaded
      </span>
    );
  }
  return (
    <a className="btn secondary" href={href} target="_blank" rel="noreferrer">
      View {label}
    </a>
  );
}

function docCount(v) {
  return [v.identityDoc, v.degreeDoc, v.certificateDoc, v.resumeDoc].filter(Boolean).length;
}

export default function AdminVerificationsPage() {
  const { editId, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pendingVerifications();
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = items.find((v) => v._id === editId) || null;
  const selectedTutorId = selected ? selected.tutorUserId?._id || selected.tutorUserId : '';

  const review = async (tutorId, status) => {
    try {
      await reviewVerification(tutorId, {
        status,
        adminNote: notes[tutorId] || (status === 'rejected' ? 'Rejected by admin' : ''),
      });
      close();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Pending tutor document reviews. Approve or reject with an optional note." />
      {error && <div className="error-banner">{error}</div>}

      <ErpToolbar
        actions={
          <ErpButton variant="secondary" onClick={load}>
            Refresh
          </ErpButton>
        }
      />

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !items.length ? (
          <div className="empty">No pending verifications.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Phone</th>
                  <th>Docs</th>
                  <th>Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                    <tr key={v._id} className="erp-row-click" onClick={() => openEdit(v._id)}>
                      <td>
                        <strong>{v.tutorUserId?.name || v.tutorUserId?.phone || 'Tutor'}</strong>
                        {v.notes && <div className="muted">{v.notes}</div>}
                      </td>
                      <td>{v.tutorUserId?.phone || '—'}</td>
                      <td>{docCount(v)} / 4</td>
                      <td>{formatDate(v.createdAt || v.updatedAt)}</td>
                      <td>
                        <ErpButton
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(v._id);
                          }}
                        >
                          Review
                        </ErpButton>
                      </td>
                    </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
      </ErpCard>

      <ErpModal
        open={Boolean(editId)}
        title="Review verification"
        onClose={close}
        footer={
          selected ? (
            <>
              <ErpButton variant="secondary" onClick={close}>
                Cancel
              </ErpButton>
              <ErpButton variant="danger" onClick={() => review(selectedTutorId, 'rejected')}>
                Reject
              </ErpButton>
              <ErpButton onClick={() => review(selectedTutorId, 'approved')}>Approve</ErpButton>
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
            </dl>
            {selected.notes && <p>{selected.notes}</p>}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <DocChip path={selected.identityDoc} label="Identity" />
              <DocChip path={selected.degreeDoc} label="Degree" />
              <DocChip path={selected.certificateDoc} label="Certificate" />
              <DocChip path={selected.resumeDoc} label="Resume" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Admin note</label>
              <input
                className="erp-search"
                value={notes[selectedTutorId] || ''}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [selectedTutorId]: e.target.value }))
                }
                placeholder="Optional note for approve/reject"
              />
            </div>
          </div>
        )}
      </ErpModal>
    </div>
  );
}
