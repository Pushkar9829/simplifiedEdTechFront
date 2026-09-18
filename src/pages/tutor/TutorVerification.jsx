import { useState } from 'react';
import { submitVerification } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ErpButton, ErpCard, ErpPageHeader } from '../../components/erp';
import { titleCase, VERIFICATION_DOC_FIELDS } from './tutorOptions';

const STATUS_COPY = {
  not_submitted: 'Upload identity and credential documents. Students cannot find you until an admin approves you.',
  pending: 'Pending verification — you stay hidden from student and parent search until an admin approves you.',
  approved: 'Approved — you appear in marketplace search.',
  rejected: 'Rejected. Update your documents and resubmit. Check the note below if the admin left one.',
};

export default function TutorVerification() {
  const { profile, refresh } = useAuth();
  const [files, setFiles] = useState({});
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const status = profile?.verificationStatus || 'not_submitted';
  const setFile = (key) => (e) => setFiles((f) => ({ ...f, [key]: e.target.files?.[0] || null }));

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Upload identity and credential documents for admin review." />

      <div className={status === 'approved' ? 'success-banner' : status === 'rejected' ? 'error-banner' : 'erp-card'}>
        <strong>{titleCase(status.replaceAll('_', ' '))}</strong>
        <p style={{ margin: '0.35rem 0 0' }}>{STATUS_COPY[status] || STATUS_COPY.not_submitted}</p>
      </div>

      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <form
        className="erp-card stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError('');
          setMsg('');
          const fd = new FormData();
          fd.append('notes', notes);
          VERIFICATION_DOC_FIELDS.forEach(({ key }) => {
            if (files[key]) fd.append(key, files[key]);
          });
          try {
            await submitVerification(fd);
            await refresh();
            setMsg('Verification submitted');
            setFiles({});
          } catch (err) {
            setError(err.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="erp-form-grid">
          {VERIFICATION_DOC_FIELDS.map(({ key, label }) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input type="file" onChange={setFile(key)} />
              {files[key] && <div className="muted">{files[key].name}</div>}
            </div>
          ))}
          <div className="field erp-form-span">
            <label>Notes for admin</label>
            <textarea
              className="erp-search"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context about your qualifications"
            />
          </div>
        </div>
        <ErpButton type="submit" disabled={saving}>
          {saving ? 'Submitting…' : 'Submit for review'}
        </ErpButton>
      </form>
    </div>
  );
}
