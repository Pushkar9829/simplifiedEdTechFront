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
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpInput,
  ErpLoadingState,
  ErpPageHeader,
  ErpStatusBadge,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { errorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase, VERIFICATION_DOC_FIELDS } from './tutorOptions';
import './tutor.css';

const STATUS_COPY = {
  not_submitted:
    'Complete each step. Students cannot find you until an admin approves you.',
  pending: 'Your request is pending review. You stay hidden from search until an admin approves you.',
  approved:
    'Approved. You appear in marketplace search. You can still update documents and resubmit — you stay listed while we review.',
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
  const [confirmResubmit, setConfirmResubmit] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

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
      setError(errorMessage(err));
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
      setError(errorMessage(err));
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
    const wasApproved = status === 'approved';
    const v = await run(
      () => submitVerification(fd),
      wasApproved
        ? 'Documents sent for review. You stay listed while we review.'
        : 'Verification submitted. Status is now pending.'
    );
    if (v) {
      apply(v);
      setFiles({});
      await refresh();
    }
    setConfirmResubmit(false);
    setSaving(false);
  };

  const removeDoc = async () => {
    if (!pendingRemove) return;
    setRemoving(true);
    await run(
      async () => apply(await removeVerificationDocument(pendingRemove.key, pendingRemove.doc._id)),
      'Document removed'
    );
    setRemoving(false);
    setPendingRemove(null);
  };

  const renderDocs = (fields) =>
    fields.map(({ key, label, hint }) => {
      const docs = verification?.documents?.[key] || [];
      const inputId = `verify-file-${key}`;
      return (
        <div key={key} className="tutor-doc">
          <div className="tutor-doc-head">
            <span className="erp-attention-icon is-brand">
              <Icon name={key === 'identity' ? 'user' : key === 'resume' ? 'file-text' : 'award'} size={16} />
            </span>
            <span className="tutor-mini-main">
              <strong>{label}</strong>
              <span className="muted">{hint}</span>
            </span>
            {docCount(key) > 0 ? (
              <ErpBadge tone="success" icon="check">
                {docCount(key)}
              </ErpBadge>
            ) : null}
          </div>
          {docs.length > 0 && (
            <ul className="erp-divided tutor-plain-list">
              {docs.map((d) => (
                <li key={d._id} className="tutor-file-row">
                  <span className="tutor-mini-main">
                    <a className="erp-link tutor-file-link" href={mediaUrl(d.url)} target="_blank" rel="noreferrer">
                      <Icon name="file-text" size={14} />
                      {d.name || d.url.split('/').pop()}
                    </a>
                    {d.status === 'rejected' && d.rejectReason && (
                      <span className="erp-text-danger text-erp-xs">Reason: {d.rejectReason}</span>
                    )}
                  </span>
                  <span className="row" style={{ gap: '0.25rem' }}>
                    <ErpStatusBadge status={d.status}>{d.status}</ErpStatusBadge>
                    {d.status !== 'approved' && (
                      <ErpButton
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="trash"
                        aria-label={`Remove ${d.name || 'document'}`}
                        onClick={() => setPendingRemove({ key, doc: d })}
                      />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <label className="erp-file-drop tutor-file-pick" htmlFor={inputId}>
            <span className="row" style={{ gap: '0.5rem' }}>
              <Icon name="upload" size={16} />
              <span className="text-erp-sm">
                {files[key]?.length
                  ? `New: ${files[key].map((f) => f.name).join(', ')}`
                  : `Add files · up to ${requirements.maxFilesPerField}`}
              </span>
            </span>
            <input
              id={inputId}
              type="file"
              multiple
              onChange={(e) => setFiles((f) => ({ ...f, [key]: Array.from(e.target.files || []) }))}
            />
          </label>
        </div>
      );
    });

  if (loading) {
    return (
      <div className="page stack tutor-page">
        <ErpCard>
          <ErpLoadingState message="Loading verification…" />
        </ErpCard>
      </div>
    );
  }

  const stepDone = [
    verifiedCount >= requirements.minReferences && !refsDirty,
    docCount('identity') > 0 && docCount('degree') > 0,
    docCount('certificate') > 0 || docCount('resume') > 0,
    status === 'pending' || status === 'approved',
  ];
  const stepHint = [
    `${verifiedCount}/${requirements.minReferences} verified`,
    'Identity and degree',
    'Certificates, resume · optional',
    status === 'pending' ? 'Submitted' : 'Check and submit',
  ];
  const bannerVariant =
    status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : status === 'pending' ? 'info' : 'warning';
  const readyCount = checklist.filter((c) => c.ok).length;

  return (
    <div className="page stack tutor-page verify-form">
      <ErpPageHeader subtitle="Four short steps. Save as you go — you only submit on the last screen." />

      <ErpBanner
        variant={bannerVariant}
        icon="shield-check"
        title={`Verification ${titleCase(status.replaceAll('_', ' ')).toLowerCase()}${
          verification?.submittedAt ? ` · submitted ${formatDate(verification.submittedAt)}` : ''
        }`}
      >
        {STATUS_COPY[status] || STATUS_COPY.not_submitted}
        {status === 'rejected' && verification?.rejectReason && (
          <div>
            <strong>Reason:</strong> {verification.rejectReason}
          </div>
        )}
        {verification?.adminNote && <div>Admin note: {verification.adminNote}</div>}
      </ErpBanner>

      <div className="tutor-verify">
        <ErpCard className="tutor-verify-steps">
          <ol className="tutor-vsteps">
            {STEPS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`tutor-vstep${step === s.id ? ' is-active' : ''}${stepDone[s.id] ? ' is-done' : ''}`}
                  aria-current={step === s.id ? 'step' : undefined}
                  onClick={() => setStep(s.id)}
                >
                  <span className="tutor-stepper-dot">
                    {stepDone[s.id] && step !== s.id ? <Icon name="check" size={12} /> : s.id + 1}
                  </span>
                  <span className="tutor-mini-main">
                    <strong>{s.label.replace(/^\d+\.\s*/, '')}</strong>
                    <span className="muted">{stepHint[s.id]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </ErpCard>

        <div className="stack tutor-verify-main">
          {msg && (
            <ErpBanner variant="success" onDismiss={() => setMsg('')}>
              {msg}
            </ErpBanner>
          )}
          {error && (
            <ErpBanner variant="danger" onDismiss={() => setError('')}>
              {error}
            </ErpBanner>
          )}

          {step === 0 && (
            <ErpCard
              heading="Who can vouch for you?"
              description="Save the list, then send an OTP to each phone and enter the code here."
              headerActions={
                <ErpBadge tone={verifiedCount >= requirements.minReferences ? 'success' : 'neutral'}>
                  {verifiedCount} of {requirements.minReferences} verified
                </ErpBadge>
              }
            >
              <div className="stack">
                {refs.map((ref, i) => {
                  const saved = savedRefs[i];
                  const isSaved = saved && saved.phone === ref.phone && !refsDirty;
                  const verified = saved?.otpVerified && saved.phone === ref.phone;
                  return (
                    <div key={i} className="tutor-ref">
                      <div className="tutor-section-head" style={{ marginBottom: '0.75rem' }}>
                        <strong>Reference {i + 1}</strong>
                        <span className="row" style={{ gap: '0.25rem' }}>
                          {verified ? (
                            <ErpBadge tone="success" icon="check">
                              OTP verified
                            </ErpBadge>
                          ) : null}
                          <ErpButton
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon="trash"
                            aria-label={`Remove reference ${i + 1}`}
                            onClick={() => setRefs((list) => list.filter((_, idx) => idx !== i))}
                            disabled={refs.length <= 1}
                          />
                        </span>
                      </div>
                      <div className="erp-form-grid">
                        <ErpInput label="Name" value={ref.name} onChange={setRef(i, 'name')} />
                        <ErpInput
                          label="Relation"
                          value={ref.relation}
                          onChange={setRef(i, 'relation')}
                          placeholder="Principal, colleague…"
                        />
                        <ErpInput
                          label="Contact number"
                          type="tel"
                          value={ref.phone}
                          onChange={setRef(i, 'phone')}
                          placeholder="+919876543210"
                          disabled={verified}
                        />
                        <ErpInput
                          label="Email"
                          optional
                          type="email"
                          value={ref.email || ''}
                          onChange={setRef(i, 'email')}
                        />
                      </div>
                      {verified ? null : isSaved ? (
                        <div className="tutor-otp-row">
                          <ErpButton
                            variant="secondary"
                            size="sm"
                            icon="phone"
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
                            className="erp-input tutor-otp-input"
                            inputMode="numeric"
                            aria-label={`OTP for reference ${i + 1}`}
                            placeholder="Enter OTP"
                            value={otpInputs[i] || ''}
                            onChange={(e) => setOtpInputs((o) => ({ ...o, [i]: e.target.value }))}
                          />
                          <ErpButton
                            size="sm"
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
                          {otpHints[i] && <span className="muted text-erp-sm">{otpHints[i]}</span>}
                        </div>
                      ) : (
                        <p className="muted text-erp-sm" style={{ margin: '0.75rem 0 0' }}>
                          Save references to enable OTP for this number.
                        </p>
                      )}
                    </div>
                  );
                })}
                <ErpButton
                  variant="ghost"
                  icon="plus"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => setRefs((list) => [...list, { ...EMPTY_REF }])}
                  disabled={refs.length >= 5}
                >
                  Add another reference
                </ErpButton>
              </div>
            </ErpCard>
          )}

          {step === 1 && (
            <ErpCard
              heading="Required documents"
              description="Identity and degree are required. You can replace rejected files here."
            >
              <div className="verify-doc-grid">{renderDocs(REQUIRED_DOCS)}</div>
            </ErpCard>
          )}

          {step === 2 && (
            <ErpCard
              heading="Optional documents"
              description="Certificates and a resume speed up review. You can skip this step."
            >
              <div className="verify-doc-grid">{renderDocs(OPTIONAL_DOCS)}</div>
            </ErpCard>
          )}

          {step === 3 && (
            <ErpCard
              heading="Review and submit"
              headerActions={
                <ErpBadge tone={readyCount >= 3 ? 'success' : 'warning'}>
                  {readyCount}/{checklist.length} ready
                </ErpBadge>
              }
            >
              <ul className="erp-divided tutor-plain-list">
                {checklist.map((item) => (
                  <li key={item.label} className="tutor-check-row">
                    <span className={`erp-attention-icon ${item.ok ? 'is-success' : 'is-warning'}`}>
                      <Icon name={item.ok ? 'check' : 'alert-triangle'} size={14} />
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <ErpStatusBadge status={item.ok ? 'approved' : 'pending'}>
                      {item.ok ? 'Ready' : 'Needed'}
                    </ErpStatusBadge>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: '1rem' }}>
                <ErpTextarea
                  label="Notes for admin"
                  optional
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Context about your qualifications"
                />
              </div>
            </ErpCard>
          )}

          <div className="tutor-form-footer">
            <span className="tutor-form-footer-note">
              Step {step + 1} of {STEPS.length}
            </span>
            {step > 0 && (
              <ErpButton variant="secondary" icon="arrow-left" onClick={() => setStep((s) => s - 1)}>
                Back
              </ErpButton>
            )}
            {step === 0 && (
              <ErpButton variant="secondary" onClick={saveRefs} disabled={!refsDirty && savedRefs.length > 0}>
                Save references
              </ErpButton>
            )}
            {step < 3 ? (
              <ErpButton iconRight="arrow-right" onClick={goNext}>
                Continue
              </ErpButton>
            ) : (
              <ErpButton
                icon="shield-check"
                onClick={() => (status === 'approved' ? setConfirmResubmit(true) : submit())}
                loading={saving}
                disabled={refsDirty}
              >
                {saving
                  ? 'Submitting…'
                  : status === 'rejected' || status === 'approved'
                    ? `Resubmit for review${pendingFileCount ? ` (${pendingFileCount} new)` : ''}`
                    : `Submit for review${pendingFileCount ? ` (${pendingFileCount} new)` : ''}`}
              </ErpButton>
            )}
          </div>
        </div>
      </div>

      <ErpConfirm
        open={confirmResubmit}
        title="Send documents for review"
        message="Your updated documents and references go to an admin for review. You stay listed while we review, and we will tell you if anything needs fixing."
        confirmLabel="Send for review"
        busy={saving}
        onCancel={() => setConfirmResubmit(false)}
        onConfirm={submit}
      />
      <ErpConfirm
        open={Boolean(pendingRemove)}
        title="Remove document"
        message={
          pendingRemove
            ? `Remove “${pendingRemove.doc.name || 'this document'}”? You will need to upload it again if it is required.`
            : ''
        }
        confirmLabel="Remove"
        danger
        busy={removing}
        onCancel={() => setPendingRemove(null)}
        onConfirm={removeDoc}
      />
    </div>
  );
}
