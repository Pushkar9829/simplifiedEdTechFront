import { useEffect, useMemo, useState } from 'react';
import {
  getMyVerification,
  removeVerificationDocument,
  saveVerificationReferences,
  sendReferenceOtp,
  submitVerification,
  verifyReferenceOtp,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ErpButton, ErpCard, ErpPageHeader, ErpStatusBadge, ErpStickyActions } from '../../components/erp';
import { formatDate } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase, VERIFICATION_DOC_FIELDS } from './tutorOptions';

const STATUS_COPY = {
  not_submitted:
    'Complete each step. Students cannot find you until an admin approves you.',
  pending: 'Your request is pending review. You stay hidden from search until an admin approves you.',
  approved: 'Approved. You appear in marketplace search. You can still update documents and resubmit.',
  rejected: 'Your request was rejected. Fix the items below and resubmit.',
};

const EMPTY_REF = { name: '', relation: '', phone: '', email: '' };
const REQUIRED_DOCS = VERIFICATION_DOC_FIELDS.filter((f) => f.key === 'identity' || f.key === 'degree');
const OPTIONAL_DOCS = VERIFICATION_DOC_FIELDS.filter((f) => f.key === 'certificate' || f.key === 'resume');

const STEPS = [
  { id: 0, label: '1. References' },
  { id: 1, label: '2. Required docs' },
  { id: 2, label: '3. Extra docs' },
  { id: 3, label: '4. Review' },
];

function filledRefs(list) {
  return list.filter((r) => r.name.trim() && r.phone.trim());
}

export default function TutorVerification() {
  const { refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [verification, setVerification] = useState(null);
  const [requirements, setRequirements] = useState({ minReferences: 2, maxFilesPerField: 5 });
  const [files, setFiles] = useState({});
  const [notes, setNotes] = useState('');
  const [refs, setRefs] = useState([{ ...EMPTY_REF }, { ...EMPTY_REF }]);
  const [otpInputs, setOtpInputs] = useState({});
  const [otpHints, setOtpHints] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const apply = (v) => {
    setVerification(v);
    setNotes(v?.notes || '');
    if (v?.references?.length) setRefs(v.references.map((r) => ({ ...r })));
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMyVerification();
      apply(data.verification);
      setRequirements(data.requirements || requirements);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (fn, successMsg) => {
    setError('');
    setMsg('');
    try {
      const result = await fn();
      if (successMsg) setMsg(successMsg);
      return result;
    } catch (err) {
      setError(err.errors?.length ? err.errors.map((e) => e.message).join(', ') : err.message);
      return null;
    }
  };

  const status = verification?.status || 'not_submitted';
  const savedRefs = verification?.references || [];
  const verifiedCount = savedRefs.filter((r) => r.otpVerified).length;
  const refsDirty =
    JSON.stringify(refs.map(({ name, relation, phone, email }) => ({ name, relation, phone, email }))) !==
    JSON.stringify(
      savedRefs.map(({ name, relation, phone, email }) => ({ name, relation, phone, email: email || '' }))
    );

  const saveRefs = () =>
    run(async () => {
      const payload = filledRefs(refs).map(({ name, relation, phone, email }) => ({
        name,
        relation,
        phone,
        email: email || '',
      }));
      if (payload.length < requirements.minReferences) {
        throw new Error(`Add at least ${requirements.minReferences} references with a name and phone.`);
      }
      const v = await saveVerificationReferences(payload);
      apply(v);
    }, 'References saved. Send an OTP to each number.');

  const setRef = (i, key) => (e) =>
    setRefs((list) => list.map((r, idx) => (idx === i ? { ...r, [key]: e.target.value } : r)));

  const pendingFileCount = Object.values(files).reduce((n, list) => n + (list?.length || 0), 0);

  const docCount = (key) =>
    (verification?.documents?.[key]?.length || 0) + (files[key]?.length || 0);

  const checklist = useMemo(
    () => [
      {
        ok: verifiedCount >= requirements.minReferences && !refsDirty,
        label: `${verifiedCount}/${requirements.minReferences} references OTP-verified`,
      },
      { ok: docCount('identity') > 0, label: 'Identity document uploaded' },
      { ok: docCount('degree') > 0, label: 'Degree document uploaded' },
      {
        ok: docCount('certificate') > 0 || docCount('resume') > 0,
        label: 'Certificate or resume (optional)',
      },
    ],
    [verifiedCount, requirements.minReferences, refsDirty, verification, files]
  );

  const goNext = async () => {
    setError('');
    setMsg('');
    if (step === 0) {
      if (refsDirty || savedRefs.length < requirements.minReferences) {
        const saved = await saveRefs();
        if (!saved) return;
      }
      if (verifiedCount < requirements.minReferences) {
        setError(`Verify at least ${requirements.minReferences} references with OTP before continuing.`);
        return;
      }
    }
    if (step === 1 && (docCount('identity') < 1 || docCount('degree') < 1)) {
      setError('Upload at least one identity file and one degree file.');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    setSaving(true);
    const fd = new FormData();
    fd.append('notes', notes);
    Object.entries(files).forEach(([key, list]) => (list || []).forEach((f) => fd.append(key, f)));
    const v = await run(() => submitVerification(fd), 'Verification submitted. Status is now pending.');
    if (v) {
      apply(v);
      setFiles({});
      await refresh();
    }
    setSaving(false);
  };

  const renderDocs = (fields) =>
    fields.map(({ key, label, hint }) => {
      const docs = verification?.documents?.[key] || [];
      return (
        <div key={key} className="erp-card-sm stack">
          <div>
            <strong>{label}</strong>
            <div className="muted">{hint}</div>
            <div className="muted">Up to {requirements.maxFilesPerField} files.</div>
          </div>
          {docs.length > 0 && (
            <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {docs.map((d) => (
                <li key={d._id} className="stack">
                  <a href={mediaUrl(d.url)} target="_blank" rel="noreferrer">
                    {d.name || d.url.split('/').pop()}
                  </a>
                  <ErpStatusBadge status={d.status}>{d.status}</ErpStatusBadge>
                  {d.status === 'rejected' && d.rejectReason && (
                    <span className="muted">Reason: {d.rejectReason}</span>
                  )}
                  {d.status !== 'approved' && (
                    <ErpButton
                      variant="secondary"
                      onClick={() =>
                        run(async () => apply(await removeVerificationDocument(key, d._id)), 'Document removed')
                      }
                    >
                      Remove
                    </ErpButton>
                  )}
                </li>
              ))}
            </ul>
          )}
          <label className="erp-file-drop">
            <span>Tap to add files</span>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles((f) => ({ ...f, [key]: Array.from(e.target.files || []) }))}
            />
          </label>
          {files[key]?.length > 0 && (
            <div className="muted">New: {files[key].map((f) => f.name).join(', ')}</div>
          )}
        </div>
      );
    });

  if (loading) {
    return (
      <div className="page stack">
        <ErpCard>
          <div className="empty">Loading…</div>
        </ErpCard>
      </div>
    );
  }

  return (
    <div className="page stack verify-form">
      <ErpPageHeader subtitle="Four short steps. Save as you go — submit only on the last screen." />

      <div
        className={
          status === 'approved' ? 'success-banner' : status === 'rejected' ? 'error-banner' : 'erp-card'
        }
      >
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <strong>{titleCase(status.replaceAll('_', ' '))}</strong>
          {verification?.submittedAt && (
            <span className="muted">Submitted {formatDate(verification.submittedAt)}</span>
          )}
        </div>
        <p style={{ margin: '0.35rem 0 0' }}>{STATUS_COPY[status] || STATUS_COPY.not_submitted}</p>
        {status === 'rejected' && verification?.rejectReason && (
          <p style={{ margin: '0.35rem 0 0' }}>
            <strong>Reason:</strong> {verification.rejectReason}
          </p>
        )}
        {verification?.adminNote && (
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Admin note: {verification.adminNote}
          </p>
        )}
      </div>

      <div className="erp-steps" role="list">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`erp-step${step === s.id ? ' erp-step-active' : ''}`}
            onClick={() => setStep(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      {step === 0 && (
        <ErpCard className="stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Who can vouch for you?</h3>
            <span className="muted">
              {verifiedCount} of {requirements.minReferences} verified
            </span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Save the list, then send an OTP to each phone and enter the code here.
          </p>
          {refs.map((ref, i) => {
            const saved = savedRefs[i];
            const isSaved = saved && saved.phone === ref.phone && !refsDirty;
            return (
              <div key={i} className="erp-card-sm stack">
                <strong>Reference {i + 1}</strong>
                <div className="erp-form-grid">
                  <div className="field">
                    <label>Name</label>
                    <input className="erp-search" value={ref.name} onChange={setRef(i, 'name')} />
                  </div>
                  <div className="field">
                    <label>Relation</label>
                    <input
                      className="erp-search"
                      value={ref.relation}
                      onChange={setRef(i, 'relation')}
                      placeholder="Principal, colleague…"
                    />
                  </div>
                  <div className="field">
                    <label>Contact number</label>
                    <input
                      className="erp-search"
                      value={ref.phone}
                      onChange={setRef(i, 'phone')}
                      placeholder="+919876543210"
                      disabled={saved?.otpVerified && saved.phone === ref.phone}
                    />
                  </div>
                  <div className="field">
                    <label>Email (optional)</label>
                    <input className="erp-search" value={ref.email || ''} onChange={setRef(i, 'email')} />
                  </div>
                </div>
                {saved?.otpVerified && saved.phone === ref.phone ? (
                  <ErpStatusBadge status="approved">OTP verified</ErpStatusBadge>
                ) : isSaved ? (
                  <div className="erp-form-grid">
                    <ErpButton
                      variant="secondary"
                      onClick={() =>
                        run(async () => {
                          const r = await sendReferenceOtp(i);
                          setOtpHints((h) => ({
                            ...h,
                            [i]: r.demoOtp ? `Demo OTP: ${r.demoOtp}` : `OTP sent to ${r.phone}`,
                          }));
                        })
                      }
                    >
                      Send OTP
                    </ErpButton>
                    <input
                      className="erp-search"
                      placeholder="Enter OTP"
                      value={otpInputs[i] || ''}
                      onChange={(e) => setOtpInputs((o) => ({ ...o, [i]: e.target.value }))}
                    />
                    <ErpButton
                      disabled={!otpInputs[i]}
                      onClick={() =>
                        run(async () => {
                          const v = await verifyReferenceOtp(i, otpInputs[i]);
                          apply(v);
                          setOtpInputs((o) => ({ ...o, [i]: '' }));
                        }, 'Reference verified')
                      }
                    >
                      Verify
                    </ErpButton>
                    {otpHints[i] && <span className="muted">{otpHints[i]}</span>}
                  </div>
                ) : (
                  <span className="muted">Save this step to enable OTP.</span>
                )}
                <ErpButton
                  variant="danger"
                  onClick={() => setRefs((list) => list.filter((_, idx) => idx !== i))}
                  disabled={refs.length <= 1}
                >
                  Remove
                </ErpButton>
              </div>
            );
          })}
          <ErpButton
            variant="secondary"
            onClick={() => setRefs((list) => [...list, { ...EMPTY_REF }])}
            disabled={refs.length >= 5}
          >
            Add another reference
          </ErpButton>
        </ErpCard>
      )}

      {step === 1 && (
        <ErpCard className="stack">
          <h3 style={{ margin: 0 }}>Required documents</h3>
          <p className="muted" style={{ margin: 0 }}>
            Identity and degree are required. You can replace rejected files here.
          </p>
          <div className="verify-doc-grid">{renderDocs(REQUIRED_DOCS)}</div>
        </ErpCard>
      )}

      {step === 2 && (
        <ErpCard className="stack">
          <h3 style={{ margin: 0 }}>Optional documents</h3>
          <p className="muted" style={{ margin: 0 }}>
            Certificates and a resume help review. You can skip this step.
          </p>
          <div className="verify-doc-grid">{renderDocs(OPTIONAL_DOCS)}</div>
        </ErpCard>
      )}

      {step === 3 && (
        <ErpCard className="stack">
          <h3 style={{ margin: 0 }}>Review and submit</h3>
          <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {checklist.map((item) => (
              <li key={item.label} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{item.label}</span>
                <ErpStatusBadge status={item.ok ? 'approved' : 'pending'}>
                  {item.ok ? 'Ready' : 'Needed'}
                </ErpStatusBadge>
              </li>
            ))}
          </ul>
          <div className="field">
            <label>Notes for admin</label>
            <textarea
              className="erp-search"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context about your qualifications"
            />
          </div>
        </ErpCard>
      )}

      <ErpStickyActions>
        {step > 0 && (
          <ErpButton variant="secondary" onClick={() => setStep((s) => s - 1)}>
            Back
          </ErpButton>
        )}
        {step === 0 && (
          <ErpButton variant="secondary" onClick={saveRefs} disabled={!refsDirty && savedRefs.length > 0}>
            Save references
          </ErpButton>
        )}
        {step < 3 ? (
          <ErpButton onClick={goNext}>Continue</ErpButton>
        ) : (
          <ErpButton onClick={submit} disabled={saving || refsDirty}>
            {saving
              ? 'Submitting…'
              : status === 'rejected' || status === 'approved'
                ? `Resubmit for review${pendingFileCount ? ` (${pendingFileCount} new)` : ''}`
                : `Submit for review${pendingFileCount ? ` (${pendingFileCount} new)` : ''}`}
          </ErpButton>
        )}
      </ErpStickyActions>
    </div>
  );
}
