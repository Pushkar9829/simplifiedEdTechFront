import { useId, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { homePathFor, pathBelongsToRole, useAuth } from '../../context/AuthContext';
import { ErpButton, ErpThemePicker } from '../../components/erp';
import { Icon } from '../../components/Icon';
import { errorMessage } from '../../utils/errors';
import './LoginPage.css';

const ROLES = [
  { id: 'student', label: 'Student' },
  { id: 'tutor', label: 'Tutor' },
  { id: 'parent', label: 'Parent' },
  { id: 'admin', label: 'Admin' },
];

const VALUE_POINTS = [
  { icon: 'graduation-cap', text: 'Vetted IB tutors for every Diploma subject, online or in person.' },
  { icon: 'calendar', text: 'Bookings, homework and progress in one calm, shared timeline.' },
  { icon: 'shield-check', text: 'Transparent payments and wallets for students and parents.' },
];

const PHONE_RE = /^\+?\d{8,15}$/;
const cleanPhone = (v) => v.replace(/[\s()-]/g, '');

/** A plain 401 / expired-token reason is routine — show it calmly, not as an error. */
const ROUTINE_REASON = /session (has )?expired|sign in again|jwt|token|unauthori[sz]ed/i;
const BLOCKED_REASON = /blocked|suspended|inactive/i;

function RoleChips({ role, onChange, labelId }) {
  return (
    <div className="role-chips" role="group" aria-labelledby={labelId}>
      {ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          aria-pressed={role === r.id}
          className={`role-chip ${role === r.id ? 'active' : ''}`}
          onClick={() => onChange(r.id)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function Banner({ tone, icon, children, role }) {
  return (
    <div className={`erp-banner erp-banner-${tone} login-banner`} role={role}>
      <span className="erp-banner-icon">
        <Icon name={icon} size={16} />
      </span>
      <div className="erp-banner-body">{children}</div>
    </div>
  );
}

export default function LoginPage() {
  const { user, loading, sendOtp, login, loginGoogle } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || '';
  const ids = useId();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [otp, setOtp] = useState(import.meta.env.DEV ? '123456' : '');
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  const phoneValid = PHONE_RE.test(cleanPhone(phone));
  const phoneError =
    phoneTouched && phone && !phoneValid
      ? 'Enter 8–15 digits, with an optional leading + and country code.'
      : '';
  const routineReason = reason && ROUTINE_REASON.test(reason) && !BLOCKED_REASON.test(reason);

  if (!loading && user) {
    const from = location.state?.from;
    const fromPath = from ? `${from.pathname || ''}${from.search || ''}` : '';
    const target = pathBelongsToRole(fromPath, user.role) ? fromPath : homePathFor(user.role);
    return <Navigate to={target} replace />;
  }

  const handleError = (err) => {
    const match = err?.status === 409 && /already registered as (\w+)/i.exec(err.message || '');
    if (match && ROLES.some((r) => r.id === match[1].toLowerCase())) {
      const existing = match[1].toLowerCase();
      setRole(existing);
      setError('');
      setHint(
        `This account is already registered as a ${existing}. We've selected ${existing} for you — continue to sign in.`
      );
      return;
    }
    setHint('');
    setError(errorMessage(err));
  };

  const onSend = async (e) => {
    e.preventDefault();
    setPhoneTouched(true);
    if (!phoneValid) return;
    setError('');
    setHint('');
    setBusy(true);
    try {
      await sendOtp(cleanPhone(phone));
      setStep(2);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login({ phone: cleanPhone(phone), otp, role, name });
      setHint('');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (e) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;
    setError('');
    setBusy(true);
    try {
      await loginGoogle({ email: googleEmail.trim(), role, name });
      setHint('');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-hero" aria-label="About IBDP Tutoring">
        <div className="login-hero-top">
          <span className="login-logo" aria-hidden="true">
            <Icon name="graduation-cap" size={20} strokeWidth={2} />
          </span>
          <span className="login-wordmark">IBDP Tutoring</span>
        </div>
        <div className="login-hero-body">
          <p className="eyebrow">IB Diploma Programme</p>
          <h1 className="login-headline">Personal IB tutoring, beautifully organised.</h1>
          <ul className="login-points">
            {VALUE_POINTS.map((p) => (
              <li key={p.icon}>
                <span className="login-point-icon">
                  <Icon name={p.icon} size={16} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="login-hero-foot">For students, parents, tutors and the team behind them.</p>
      </aside>

      <main className="login-main">
        <div className="login-main-top">
          <span className="login-mobile-brand">
            <span className="login-logo login-logo-sm" aria-hidden="true">
              <Icon name="graduation-cap" size={16} strokeWidth={2} />
            </span>
            IBDP Tutoring
          </span>
          <ErpThemePicker />
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <h2>{step === 1 ? 'Sign in' : 'Enter your code'}</h2>
            <p className="muted">
              {step === 1 ? (
                'Choose your role and we’ll text you a one-time code.'
              ) : (
                <>
                  We sent a 6-digit code to <strong>{cleanPhone(phone)}</strong>.{' '}
                  <button
                    type="button"
                    className="erp-link"
                    onClick={() => {
                      setStep(1);
                      setError('');
                      setHint('');
                    }}
                  >
                    Change
                  </button>
                </>
              )}
            </p>
          </div>

          {reason && !error ? (
            routineReason ? (
              <Banner tone="neutral" icon="info" role="status">
                Your session ended. Please sign in again.
              </Banner>
            ) : (
              <Banner tone="danger" icon="alert-triangle" role="alert">
                {reason}
              </Banner>
            )
          ) : null}
          {error && (
            <Banner tone="danger" icon="alert-triangle" role="alert">
              {error}
            </Banner>
          )}
          {hint && (
            <Banner tone="success" icon="check-circle" role="status">
              {hint}
            </Banner>
          )}

          {step === 1 ? (
            <>
              <form onSubmit={onSend} noValidate>
                <div className="field">
                  <span className="erp-label" id={`${ids}-role`}>
                    I am a
                  </span>
                  <RoleChips role={role} onChange={setRole} labelId={`${ids}-role`} />
                </div>
                <div className="field">
                  <label className="erp-label" htmlFor={`${ids}-phone`}>
                    Phone number
                  </label>
                  <div className={`login-phone${phoneError ? ' is-invalid' : ''}`}>
                    <span className="login-phone-prefix" aria-hidden="true">
                      <Icon name="phone" size={16} />
                    </span>
                    <input
                      id={`${ids}-phone`}
                      className="erp-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => setPhoneTouched(true)}
                      placeholder="+91 98765 43210"
                      inputMode="tel"
                      autoComplete="tel"
                      aria-invalid={!!phoneError}
                      aria-describedby={phoneError ? `${ids}-phone-err` : `${ids}-phone-help`}
                      required
                    />
                  </div>
                  {phoneError ? (
                    <small id={`${ids}-phone-err`} className="erp-field-error">
                      {phoneError}
                    </small>
                  ) : (
                    <small id={`${ids}-phone-help`} className="erp-field-help">
                      Include your country code, e.g. +44 or +91.
                    </small>
                  )}
                </div>
                <ErpButton
                  type="submit"
                  size="lg"
                  disabled={busy}
                  loading={busy && !googleOpen}
                  className="erp-full"
                  iconRight={busy ? undefined : 'arrow-right'}
                >
                  {busy && !googleOpen ? 'Sending…' : 'Send OTP'}
                </ErpButton>
              </form>

              <div className="login-divider" role="separator">
                <span>or</span>
              </div>

              {googleOpen ? (
                <form onSubmit={onGoogle} className="login-google-form">
                  <div className="field">
                    <label className="erp-label" htmlFor={`${ids}-gmail`}>
                      Demo Google email
                    </label>
                    <input
                      id={`${ids}-gmail`}
                      className="erp-input"
                      type="email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder={`${role}@ibdp.demo`}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="row">
                    <ErpButton type="submit" variant="secondary" disabled={busy} loading={busy}>
                      {busy ? 'Signing in…' : 'Continue with Google'}
                    </ErpButton>
                    <ErpButton type="button" variant="ghost" onClick={() => setGoogleOpen(false)}>
                      Cancel
                    </ErpButton>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="erp-btn-secondary erp-btn-lg erp-full"
                  disabled={busy}
                  onClick={() => {
                    setGoogleEmail((v) => v || `${role}@ibdp.demo`);
                    setGoogleOpen(true);
                  }}
                >
                  <span className="login-google-mark" aria-hidden="true">
                    G
                  </span>
                  Continue with Google (demo)
                </button>
              )}
            </>
          ) : (
            <form onSubmit={onVerify}>
              <div className="field">
                <label className="erp-label" htmlFor={`${ids}-otp`}>
                  Verification code
                </label>
                <input
                  id={`${ids}-otp`}
                  className="erp-input login-otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  title="6-digit code"
                  placeholder="••••••"
                  required
                />
              </div>
              <div className="field">
                <span className="erp-label" id={`${ids}-role2`}>
                  I am a
                </span>
                <RoleChips role={role} onChange={setRole} labelId={`${ids}-role2`} />
              </div>
              <div className="field">
                <label className="erp-label" htmlFor={`${ids}-name`}>
                  Your name <span className="erp-label-optional">(new accounts only)</span>
                </label>
                <input
                  id={`${ids}-name`}
                  className="erp-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aanya Sharma"
                  autoComplete="name"
                />
              </div>
              <div className="login-actions">
                <ErpButton
                  type="button"
                  variant="secondary"
                  size="lg"
                  icon="arrow-left"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setHint('');
                  }}
                >
                  Back
                </ErpButton>
                <ErpButton type="submit" size="lg" disabled={busy} loading={busy}>
                  {busy ? 'Verifying…' : 'Continue'}
                </ErpButton>
              </div>
            </form>
          )}

          <div className="demo-hint muted">
            <strong>Demo:</strong> OTP is always 123456 — student 7777777777 · tutor 8888888888 ·
            parent 6666666666 · admin 9999999999. Google demo: student@ibdp.demo, tutor@ibdp.demo,
            parent@ibdp.demo, admin@ibdp.demo.
          </div>
        </div>
      </main>
    </div>
  );
}
