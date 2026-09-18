import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addTutorReview,
  createBooking,
  getTutor,
} from '../../api';
import { ErpSelect } from '../../components/erp';
import { money } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import {
  DELIVERY_OPTIONS,
  LEVEL_OPTIONS,
  RATING_OPTIONS,
  isSlotBookable,
  slotOptions,
  subjectOptions,
  titleCase,
} from './studentOptions';

export default function StudentTutorDetail({
  studentUserId,
  paymentsPath = '/student/payments',
  walletPath = '/student/wallet',
  backPath = '/student/tutors',
}) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [slotId, setSlotId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [level, setLevel] = useState('HL');
  const [recurring, setRecurring] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('online');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [booking, setBooking] = useState(false);

  const load = async () => {
    const t = await getTutor(id);
    setData(t);
    if (t.subjects?.[0]) {
      setSubjectId(t.subjects[0].subjectId?._id || t.subjects[0].subjectId);
      setLevel(t.subjects[0].level || 'HL');
    }
    const free = (t.availability || []).find((s) => !s.isBooked);
    setSlotId(free?._id || '');
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  if (!data) {
    return (
      <div className="page stack">
        {error && <div className="error-banner">{error}</div>}
        <div className="empty">{error ? 'Could not load this tutor.' : 'Loading tutor…'}</div>
      </div>
    );
  }
  const p = data.profile;
  const u = p.userId || {};
  const offeringSubjects = (data.subjects || [])
    .map((s) => s.subjectId)
    .filter(Boolean);

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{u.name || 'Tutor profile'}</h1>
        <Link to={backPath} className="btn secondary">
          Back to tutors
        </Link>
      </div>

      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="grid two">
        <section className="erp-card stack">
          <div className="row" style={{ alignItems: 'center', gap: '0.75rem' }}>
            {u.avatar ? (
              <img
                src={u.avatar}
                alt=""
                width={64}
                height={64}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span className="erp-avatar" aria-hidden>
                {(u.name || 'T').slice(0, 1)}
              </span>
            )}
            <div>
              <strong>{u.name || 'Tutor'}</strong>
              <p className="muted" style={{ margin: 0 }}>
                {p.qualifications || 'IB tutor'}
              </p>
            </div>
          </div>
          <p>
            {p.degree || '—'} · {p.university || '—'}
          </p>
          <p>
            {p.experienceYears || 0} years · {(p.languages || []).join(', ') || '—'}
          </p>
          <p>
            ★ {p.ratingAvg} ({p.ratingCount}) · {titleCase(p.teachingMode || 'both')}
          </p>
          <p>
            Online {money(p.hourlyRateOnline || p.hourlyRate, p.currency)}/hr · Offline{' '}
            {money(p.hourlyRateOffline || p.hourlyRate, p.currency)}/hr
          </p>
          {(p.location?.city || p.location?.area || p.location?.address) && (
            <p className="muted">
              Offline location:{' '}
              {[p.location.address, p.location.area, p.location.city].filter(Boolean).join(', ')}
            </p>
          )}
          <p>
            Verification:{' '}
            <span className="badge">{titleCase(p.verificationStatus || 'pending')}</span>
          </p>
          {p.bio && <p className="muted">{p.bio}</p>}

          <h3>Subjects</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {(data.subjects || []).map((s) => (
              <li key={s._id}>
                {s.subjectId?.name} ({s.level}) · {money(s.hourlyRate || p.hourlyRate)}/hr
              </li>
            ))}
          </ul>

          {(data.videos || []).length > 0 && (
            <>
              <h3>Demo videos</h3>
              {(data.videos || []).map((v) => (
                <div key={v._id}>
                  <p className="muted">
                    {v.title} · {v.kind}
                  </p>
                  {/youtube\.com|youtu\.be|vimeo\.com/i.test(String(v.fileUrl || '')) ? (
                    <iframe
                      title={v.title}
                      src={v.fileUrl}
                      width="100%"
                      height="180"
                      style={{ border: 0, borderRadius: 8 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <a className="erp-link" href={mediaUrl(v.fileUrl)} target="_blank" rel="noreferrer">
                      Watch
                    </a>
                  )}
                </div>
              ))}
            </>
          )}

          <h3>Reviews</h3>
          {!(data.reviews || []).length && <div className="empty">No reviews yet.</div>}
          {(data.reviews || []).map((r) => (
            <div key={r._id}>
              ★ {r.rating} — {r.comment || 'No comment'}
            </div>
          ))}
        </section>

        <section className="erp-card stack">
          <h2>Book a class</h2>
          <ErpSelect
            label="Subject"
            value={subjectId}
            options={
              offeringSubjects.length
                ? subjectOptions(offeringSubjects)
                : [{ value: '', label: 'No subjects', disabled: true }]
            }
            onChange={(e) => setSubjectId(e.target.value)}
          />
          <ErpSelect
            label="Level"
            value={level}
            options={LEVEL_OPTIONS.filter((o) => o.value !== 'N/A')}
            onChange={(e) => setLevel(e.target.value)}
          />
          <ErpSelect
            label="Class mode"
            value={deliveryMode}
            options={DELIVERY_OPTIONS.filter((o) => {
              if (p.teachingMode === 'online') return o.value === 'online';
              if (p.teachingMode === 'offline') return o.value === 'offline';
              return true;
            })}
            onChange={(e) => setDeliveryMode(e.target.value)}
          />
          <p className="muted">Slots must be booked at least 12 hours in advance.</p>
          <ErpSelect
            label="Available slot"
            value={slotId}
            options={slotOptions(
              (data.availability || []).filter(
                (s) => !s.isBooked && (!s.deliveryMode || s.deliveryMode === deliveryMode)
              )
            )}
            onChange={(e) => setSlotId(e.target.value)}
          />
          <label className="row" style={{ alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            Recurring weekly (4 lessons)
          </label>
          <button
            className="btn"
            type="button"
            disabled={
              booking ||
              !slotId ||
              !isSlotBookable((data.availability || []).find((s) => s._id === slotId) || { startAt: 0 })
            }
            onClick={async () => {
              setBooking(true);
              setError('');
              setMsg('');
              try {
                await createBooking({
                  tutorUserId: id,
                  subjectId,
                  level,
                  slotId,
                  deliveryMode,
                  isRecurring: recurring,
                  recurrenceCount: recurring ? 4 : 1,
                  ...(studentUserId ? { studentUserId } : {}),
                });
                setMsg('Booking created. Pay from Payments (manual or wallet).');
                load();
              } catch (err) {
                setError(err.message);
              } finally {
                setBooking(false);
              }
            }}
          >
            {booking ? 'Booking…' : 'Book class'}
          </button>
          <div className="row">
            <Link to={paymentsPath} className="btn secondary">
              Go to payments
            </Link>
            <Link to={walletPath} className="btn secondary">
              Wallet
            </Link>
          </div>

          {!studentUserId && (
            <>
          <hr style={{ borderColor: 'var(--erp-border)', width: '100%' }} />
          <h3>Leave a review</h3>
          <p className="muted">Available after a completed paid session.</p>
          <ErpSelect
            label="Rating"
            value={rating}
            options={RATING_OPTIONS}
            onChange={(e) => setRating(Number(e.target.value))}
          />
          <div className="field">
            <label>Comment</label>
            <textarea
              className="erp-search"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <button
            className="btn secondary"
            type="button"
            onClick={async () => {
              try {
                await addTutorReview(id, { rating, comment });
                setMsg('Review saved');
                setComment('');
                load();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            Submit review
          </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
