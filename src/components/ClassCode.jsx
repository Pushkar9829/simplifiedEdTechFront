import { useEffect, useRef, useState } from 'react';
import { getBookingSummary, getClassCode, verifyClassCode } from '../api';
import { ErpBanner, ErpButton, ErpModal, Icon } from './erp';
import { errorMessage } from '../utils/errors';
import { nextCode } from './classCodeLogic';
import './bookingTools.css';

function clock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

function timeOf(ms, timeZone) {
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: timeZone || undefined });
  } catch {
    return new Date(ms).toLocaleTimeString();
  }
}

/**
 * Student / parent card: big 6-digit code for the current phase, countdown, refresh.
 * Polls the booking every 15 s so the card moves on as soon as the tutor enters the code.
 */
export function ClassCodeCard({ booking, timeZone, isParent = false, subtitle, onProgress }) {
  const now = useNow(1000);
  const [proof, setProof] = useState(booking.classProof || {});
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fetched = useRef('');
  const proofRef = useRef(proof);
  useEffect(() => {
    proofRef.current = proof;
  }, [proof]);
  const b = { ...booking, classProof: proof };
  const next = nextCode(b, now);
  const phaseKey = `${booking._id}:${next.phase}:${next.state}`;

  useEffect(() => {
    setProof(booking.classProof || {});
  }, [booking]);

  const fetchCode = async (fresh = false) => {
    if (!next.phase) return;
    setBusy(true);
    setError('');
    try {
      const data = await getClassCode(booking._id, next.phase, fresh);
      if (data.verified) {
        setCode(null);
        setProof((p) => ({ ...p, [`${data.phase}VerifiedAt`]: data.verifiedAt }));
      } else setCode(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // First code for a phase arrives automatically once its window opens.
  useEffect(() => {
    if (next.state === 'open' && fetched.current !== phaseKey) {
      fetched.current = phaseKey;
      setCode(null);
      fetchCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);

  useEffect(() => {
    if (!next.phase) return undefined;
    const t = window.setInterval(async () => {
      try {
        const s = await getBookingSummary(booking._id);
        const p = s?.booking?.classProof;
        const old = proofRef.current;
        if (!p) return;
        const moved =
          Boolean(p.startVerifiedAt) !== Boolean(old.startVerifiedAt) ||
          Boolean(p.endVerifiedAt) !== Boolean(old.endVerifiedAt) ||
          Boolean(p.override) !== Boolean(old.override);
        if (!moved) return;
        setProof(p);
        setCode(null);
        onProgress?.(p);
      } catch {
        /* keep the current card */
      }
    }, 15000);
    return () => window.clearInterval(t);
  }, [booking._id, next.phase, onProgress]);

  const phaseLabel = next.phase === 'end' ? 'End code' : 'Start code';
  const who = isParent ? 'your child’s tutor' : 'your tutor';
  const live = code && code.phase === next.phase ? code : null;
  const left = live ? new Date(live.expiresAt).getTime() - now : 0;
  const digits = live ? live.code.split('') : ['•', '•', '•', '•', '•', '•'];

  if (next.state === 'done') {
    return (
      <section className="bk-code-card" aria-label="Class code">
        <div className="bk-code-head">
          <span className="bk-code-eyebrow">
            <Icon name="shield-check" size={14} /> Class codes
          </span>
        </div>
        <div className="bk-code-state">
          <Icon name="check-circle" size={18} />
          {next.override ? 'Admin confirmed this class. No code needed.' : 'Both codes were entered. Thanks!'}
        </div>
      </section>
    );
  }

  return (
    <section className="bk-code-card" aria-label="Class code" aria-live="polite">
      <div className="bk-code-head">
        <span className="bk-code-eyebrow">
          <Icon name="lock" size={14} /> Class code · {next.phase === 'end' ? 'End' : 'Start'}
        </span>
        <span className="bk-code-steps" aria-label="Progress">
          <span className={`bk-step${proof.startVerifiedAt ? ' is-done' : next.phase === 'start' ? ' is-now' : ''}`}>
            {proof.startVerifiedAt ? <Icon name="check" size={12} /> : null} Start
          </span>
          <span className={`bk-step${proof.endVerifiedAt ? ' is-done' : next.phase === 'end' ? ' is-now' : ''}`}>
            {proof.endVerifiedAt ? <Icon name="check" size={12} /> : null} End
          </span>
        </span>
      </div>
      <div>
        <p className="bk-code-title">{booking.subjectId?.name || 'Class'}</p>
        {subtitle ? <p className="bk-code-sub">{subtitle}</p> : null}
      </div>

      {next.state === 'waiting' ? (
        <div className="bk-code-state">
          <Icon name="clock" size={18} />
          <span>
            {phaseLabel} appears at <strong>{timeOf(next.opensAt, timeZone)}</strong> (in {clock(next.opensAt - now)}).
            {next.phase === 'end' ? ' Show it to your tutor before the class ends.' : ''}
          </span>
        </div>
      ) : next.state === 'closed' ? (
        <div className="bk-code-state">
          <Icon name="alert-triangle" size={18} />
          The {next.phase} code window has closed. Admin can confirm this class if it took place.
        </div>
      ) : (
        <>
          <div
            className={`bk-code-digits${live ? '' : ' is-placeholder'}`}
            role="img"
            aria-label={live ? `${phaseLabel} ${live.code.split('').join(' ')}` : 'Loading code'}
          >
            {digits.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <p className="bk-code-sub">
            {next.phase === 'start'
              ? `Read this to ${who} when the class starts. They type it in their app to begin.`
              : `Read this to ${who} at the end of the class so they can close it.`}
          </p>
          <div className="bk-code-foot">
            <span className={`bk-code-timer${live && left < 5 * 60000 ? ' is-warn' : ''}`}>
              <Icon name="clock" size={14} />
              {live ? `Valid for ${clock(left)}` : busy ? 'Getting your code…' : 'No code yet'}
            </span>
            <ErpButton variant="secondary" size="sm" icon="refresh" loading={busy} onClick={() => fetchCode(true)}>
              New code
            </ErpButton>
          </div>
        </>
      )}
      {error ? (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      ) : null}
    </section>
  );
}

/** Tutor dialog: 6 boxes with auto-advance and paste. */
export function ClassCodeDialog({ open, booking, phase, onClose, onVerified }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef([]);

  useEffect(() => {
    if (open) {
      setDigits(['', '', '', '', '', '']);
      setError('');
      window.setTimeout(() => refs.current[0]?.focus(), 30);
    }
  }, [open, phase, booking?._id]);

  if (!booking) return null;
  const code = digits.join('');

  const fill = (start, text) => {
    const chars = String(text).replace(/\D/g, '').slice(0, 6 - start).split('');
    if (!chars.length) return;
    setDigits((d) => {
      const next = [...d];
      chars.forEach((c, i) => {
        next[start + i] = c;
      });
      return next;
    });
    refs.current[Math.min(5, start + chars.length)]?.focus();
  };

  const submit = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await verifyClassCode(booking._id, phase, code);
      onVerified?.(result);
    } catch (err) {
      setError(errorMessage(err));
      setDigits(['', '', '', '', '', '']);
      window.setTimeout(() => refs.current[0]?.focus(), 30);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ErpModal
      open={open}
      size="sm"
      title={phase === 'end' ? 'Enter end code' : 'Enter start code'}
      onClose={() => !busy && onClose?.()}
      footer={
        <>
          <ErpButton variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </ErpButton>
          <ErpButton icon="check" loading={busy} disabled={code.length !== 6} onClick={submit}>
            Verify
          </ErpButton>
        </>
      }
    >
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className="muted" style={{ margin: 0 }}>
          Ask {booking.studentUserId?.name || 'the student'} for the 6-digit {phase} code shown in their app.
          {phase === 'start' ? ' It starts the class.' : ' It confirms the class ran to the end.'}
        </p>
        <div className={`bk-otp${error ? ' is-error' : ''}`} role="group" aria-label={`${phase} code`}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              pattern="[0-9]*"
              maxLength={6}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                if (!v) {
                  setDigits((x) => x.map((c, j) => (j === i ? '' : c)));
                  return;
                }
                fill(i, v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digits[i] && i > 0) {
                  refs.current[i - 1]?.focus();
                  setDigits((x) => x.map((c, j) => (j === i - 1 ? '' : c)));
                  e.preventDefault();
                }
                if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
                if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
              }}
              onPaste={(e) => {
                e.preventDefault();
                fill(i, e.clipboardData.getData('text'));
              }}
            />
          ))}
        </div>
        {error ? <ErpBanner variant="danger">{error}</ErpBanner> : null}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </ErpModal>
  );
}
