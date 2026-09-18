import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../../context/AuthContext';
import { ErpButton, ErpCard, ErpThemePicker } from '../../components/erp';
import './LoginPage.css';

const ROLES = [
  { id: 'student', label: 'Student' },
  { id: 'tutor', label: 'Tutor' },
  { id: 'parent', label: 'Parent' },
  { id: 'admin', label: 'Admin' },
];

export default function LoginPage() {
  const { sendOtp, login, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('123456');
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSend = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await sendOtp(phone);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login({ phone, otp, role, name });
      navigate(ROLE_HOME[user.role] || '/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <ErpCard className="login-hero">
        <div className="login-hero-top">
          <p className="eyebrow">IB Diploma Programme</p>
          <ErpThemePicker />
        </div>
        <h1 className="display">IBDP Tutoring</h1>
        <p>
          ERP workspace for students, tutors, parents, and admins — OTP login, bookings, homework,
          and payments.
        </p>
      </ErpCard>
      <ErpCard className="login-card">
        <h2>{step === 1 ? 'Sign in' : 'Verify OTP'}</h2>
        <p className="muted">Demo OTP is always 123456</p>
        {error && <div className="erp-alert-error">{error}</div>}
        {step === 1 ? (
          <form onSubmit={onSend}>
            <div className="field">
              <label className="erp-label">Role</label>
              <div className="role-chips">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`role-chip ${role === r.id ? 'active' : ''}`}
                    onClick={() => setRole(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="erp-label">Phone number</label>
              <input
                className="erp-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="7777777777"
                inputMode="numeric"
                required
              />
            </div>
            <ErpButton type="submit" disabled={busy} className="erp-full">
              {busy ? 'Sending…' : 'Send OTP'}
            </ErpButton>
            <button
              type="button"
              className="btn secondary erp-full"
              style={{ marginTop: '0.65rem' }}
              disabled={busy}
              onClick={async () => {
                const email = window.prompt('Demo Google email', `${role}@ibdp.demo`);
                if (!email) return;
                setError('');
                setBusy(true);
                try {
                  const user = await loginGoogle({ email, role, name });
                  navigate(ROLE_HOME[user.role] || '/login');
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Continue with Google (demo)
            </button>
          </form>
        ) : (
          <form onSubmit={onVerify}>
            <div className="field">
              <label className="erp-label">OTP</label>
              <input
                className="erp-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="erp-label">Role</label>
              <div className="role-chips">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`role-chip ${role === r.id ? 'active' : ''}`}
                    onClick={() => setRole(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="erp-label">Name (optional)</label>
              <input
                className="erp-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="row">
              <ErpButton type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Continue'}
              </ErpButton>
              <ErpButton type="button" variant="secondary" onClick={() => setStep(1)}>
                Back
              </ErpButton>
            </div>
          </form>
        )}
        <div className="demo-hint muted">
          Demo OTP 123456: student 7777777777 · tutor 8888888888 · parent 6666666666 · admin
          9999999999. Google demo emails: student@ibdp.demo, tutor@ibdp.demo, parent@ibdp.demo,
          admin@ibdp.demo.
        </div>
      </ErpCard>
    </div>
  );
}
