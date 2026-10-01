import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addFavoriteTutor,
  addTutorReview,
  createBooking,
  enrollCourse,
  getTutor,
  listCourses,
  removeFavoriteTutor,
} from '../../api';
import { ErpButton, ErpModal, ErpSelect, ErpTabs } from '../../components/erp';
import { countryLine, formatPlace, money, tutorRef } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { useCatalog } from '../../context/CatalogContext';
import {
  RATING_OPTIONS,
  isSlotBookable,
  slotOptions,
  subjectOptions,
  titleCase,
} from './studentOptions';

function refInitials(user) {
  const code = String(tutorRef(user) || '').replace('SCH-', '');
  return (code.slice(0, 2) || 'T').toUpperCase();
}

export default function StudentTutorDetail({
  studentUserId,
  paymentsPath = '/student/payments',
  walletPath = '/student/wallet',
  backPath = '/student/tutors',
}) {
  const { id } = useParams();
  const { options } = useCatalog();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('about');
  const [bookOpen, setBookOpen] = useState(false);
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
  const [courses, setCourses] = useState([]);

  const load = async () => {
    const t = await getTutor(id);
    setData(t);
    if (t.subjects?.[0]) {
      setSubjectId(t.subjects[0].subjectId?._id || t.subjects[0].subjectId);
      setLevel(t.subjects[0].level || t.subjects[0].subjectId?.levels?.[0] || 'HL');
    }
    const mode = t.profile?.teachingMode;
    setDeliveryMode(mode === 'offline' ? 'offline' : 'online');
    const free = (t.availability || []).find((s) => !s.isBooked);
    setSlotId(free?._id || '');
    const published = await listCourses({ tutorUserId: id });
    setCourses(Array.isArray(published) ? published : published.items || []);
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  const offeringSubjects = useMemo(
    () => (data?.subjects || []).map((s) => s.subjectId).filter(Boolean),
    [data]
  );

  const selectedOffering = useMemo(
    () =>
      (data?.subjects || []).find(
        (s) => String(s.subjectId?._id || s.subjectId) === String(subjectId)
      ),
    [data, subjectId]
  );

  const levelOptions = useMemo(() => {
    const LEVEL_OPTIONS = options('subject_level');
    const fromSubject = selectedOffering?.subjectId?.levels || [];
    if (fromSubject.length) {
      return LEVEL_OPTIONS.filter((o) => fromSubject.includes(o.value));
    }
    if (selectedOffering?.level) {
      return LEVEL_OPTIONS.filter((o) => o.value === selectedOffering.level);
    }
    return LEVEL_OPTIONS;
  }, [selectedOffering, options]);

  useEffect(() => {
    if (levelOptions.length && !levelOptions.some((o) => o.value === level)) {
      setLevel(levelOptions[0].value);
    }
  }, [levelOptions, level]);

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
  const avatar = mediaUrl(u.avatar);
  const reviews = data.reviews || [];
  const videos = data.videos || [];
  const subjects = data.subjects || [];
  const openSlots = (data.availability || []).filter((s) => !s.isBooked);
  const showOfflinePlace = p.teachingMode === 'offline' || p.teachingMode === 'both';

  const bookSlots = (data.availability || []).filter(
    (s) => !s.isBooked && (!s.deliveryMode || s.deliveryMode === deliveryMode)
  );
  const selectedSlot = (data.availability || []).find((s) => s._id === slotId);
  const canBook = Boolean(slotId && isSlotBookable(selectedSlot || { startAt: 0 }));

  const tabs = [
    { value: 'about', label: 'About' },
    { value: 'subjects', label: `Subjects (${subjects.length})` },
    { value: 'availability', label: `Slots (${openSlots.length})` },
    { value: 'courses', label: `Courses (${courses.length})` },
    { value: 'videos', label: `Videos (${videos.length})` },
    { value: 'reviews', label: `Reviews (${reviews.length})` },
  ];

  const onBook = async () => {
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
      setMsg('Class booked. Pay the invoice on Payments so the session is confirmed.');
      setBookOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to={backPath} className="btn secondary">
          Back to tutors
        </Link>
        <div className="row">
          <Link to={paymentsPath} className="btn secondary">
            Payments
          </Link>
          <Link to={walletPath} className="btn secondary">
            Wallet
          </Link>
        </div>
      </div>

      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <section className={`erp-card tutor-profile${p.isPremium ? ' tutor-card-premium' : ''}`}>
        <div className="tutor-profile-head">
          <div className="tutor-card-identity">
            {avatar ? (
              <img className="tutor-card-avatar-img" src={avatar} alt="" />
            ) : (
              <span className="tutor-card-avatar" aria-hidden>
                {refInitials(u)}
              </span>
            )}
            <div className="tutor-card-id">
              <h1>
                {tutorRef(u)}
                {p.isPremium && <span className="erp-chip erp-chip-offline">Premium</span>}
                {p.verificationStatus === 'approved' && (
                  <span className="erp-chip erp-chip-online">Verified</span>
                )}
              </h1>
              <p className="muted">{countryLine(u.country, u.timezone, p.currency)}</p>
              <p className="muted">
                {p.qualifications || 'Tutor'}
                {p.experienceYears ? ` · ${p.experienceYears} yrs` : ''}
              </p>
            </div>
          </div>
          <div className="tutor-profile-actions">
            <ErpButton
              variant="secondary"
              type="button"
              onClick={async () => {
                try {
                  if (data.favorite) await removeFavoriteTutor(id);
                  else await addFavoriteTutor(id);
                  load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              {data.favorite ? '★ Saved' : '☆ Save'}
            </ErpButton>
            <ErpButton type="button" onClick={() => setBookOpen(true)}>
              Book a class
            </ErpButton>
          </div>
        </div>
        <div className="tutor-card-stats" style={{ padding: '0 0 0.25rem' }}>
          <span className="tutor-card-stat tutor-card-stat-rating">
            ★ {Number(p.ratingAvg || 0).toFixed(1)}
            <span className="muted">({p.ratingCount || 0})</span>
          </span>
          <span className="tutor-card-stat">
            Online {money(p.hourlyRateOnline || p.hourlyRate, p.currency)}/hr
          </span>
          <span className="tutor-card-stat">
            Offline {money(p.hourlyRateOffline || p.hourlyRate, p.currency)}/hr
          </span>
          {(p.teachingMode === 'online' || p.teachingMode === 'both' || !p.teachingMode) && (
            <span className="erp-chip erp-chip-online">Online</span>
          )}
          {(p.teachingMode === 'offline' || p.teachingMode === 'both') && (
            <span className="erp-chip erp-chip-offline">Offline</span>
          )}
        </div>
      </section>

      <div className="avail-bar">
        <ErpTabs value={tab} onChange={setTab} tabs={tabs} />
      </div>

      {tab === 'about' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>About</h2>
          <p>{p.bio || 'No bio yet.'}</p>
          <dl className="erp-detail-grid">
            <dt>Education</dt>
            <dd>{[p.degree, p.university].filter(Boolean).join(' · ') || '—'}</dd>
            <dt>Languages</dt>
            <dd>{(p.languages || []).join(', ') || '—'}</dd>
            <dt>Experience</dt>
            <dd>{p.experienceYears || 0} years</dd>
            {showOfflinePlace && (
              <>
                <dt>Offline location</dt>
                <dd>
                  {formatPlace(p.location, u.country)}
                  {p.location?.address ? ` · ${p.location.address}` : ''}
                </dd>
              </>
            )}
          </dl>
        </section>
      )}

      {tab === 'subjects' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Subjects</h2>
          {!subjects.length ? (
            <div className="empty">No subjects listed.</div>
          ) : (
            <div className="tutor-profile-list">
              {subjects.map((s) => (
                <div key={s._id} className="tutor-profile-row">
                  <div>
                    <strong>{s.subjectId?.name || 'Subject'}</strong>
                    <div className="muted">
                      {[s.level, s.boardId?.name, s.classLevelId?.name, s.countryId?.name]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </div>
                  </div>
                  <div className="tutor-card-rates" style={{ padding: 0, minWidth: '14rem' }}>
                    <div className="tutor-card-rate">
                      <strong>
                        {money(s.onlineRate || s.hourlyRate || p.hourlyRate, s.currency || p.currency)}
                      </strong>
                      <span>Online / hr</span>
                    </div>
                    <div className="tutor-card-rate">
                      <strong>
                        {money(s.offlineRate || s.hourlyRate || p.hourlyRate, s.currency || p.currency)}
                      </strong>
                      <span>Offline / hr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'availability' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Open slots</h2>
          <p className="muted" style={{ margin: 0 }}>
            Book at least 12 hours in advance. Pick a slot in the booking form.
          </p>
          {!openSlots.length ? (
            <div className="empty">No open slots right now.</div>
          ) : (
            <div className="tutor-profile-list">
              {openSlots.slice(0, 12).map((s) => (
                <div key={s._id} className="tutor-profile-row">
                  <div>
                    <strong>{titleCase(s.deliveryMode || 'online')}</strong>
                    <div className="muted">{slotOptions([s])[0]?.label || 'Slot'}</div>
                  </div>
                  <ErpButton
                    variant="secondary"
                    onClick={() => {
                      setDeliveryMode(s.deliveryMode || deliveryMode);
                      setSlotId(s._id);
                      setBookOpen(true);
                    }}
                  >
                    Book this slot
                  </ErpButton>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'courses' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Courses</h2>
          {!courses.length ? (
            <div className="empty">No courses from this tutor.</div>
          ) : (
            <div className="tutor-profile-list">
              {courses.map((c) => (
                <div key={c._id} className="tutor-profile-row">
                  <div>
                    <strong>{c.title}</strong>
                    <div className="muted">
                      {c.subjectId?.name} · {c.price ? money(c.price, c.currency) : 'Free'} ·{' '}
                      {c.lessonPlanIds?.length || 0} lessons
                    </div>
                  </div>
                  <ErpButton
                    onClick={async () => {
                      try {
                        await enrollCourse(c._id, studentUserId ? { studentUserId } : {});
                        setMsg('Enrollment created. Pay the invoice to start.');
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  >
                    Enroll
                  </ErpButton>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'videos' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Demo videos</h2>
          {!videos.length ? (
            <div className="empty">No demo videos yet.</div>
          ) : (
            videos.map((v) => (
              <div key={v._id} className="stack">
                <strong>
                  {v.title} <span className="muted">· {titleCase(v.kind)}</span>
                </strong>
                {/youtube\.com|youtu\.be|vimeo\.com/i.test(String(v.fileUrl || '')) ? (
                  <iframe
                    title={v.title}
                    src={v.fileUrl}
                    width="100%"
                    height="220"
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
            ))
          )}
        </section>
      )}

      {tab === 'reviews' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Reviews</h2>
          {!reviews.length && <div className="empty">No reviews yet.</div>}
          {reviews.map((r) => (
            <div key={r._id} className="tutor-profile-row">
              <div>
                <strong>★ {r.rating}</strong>
                <div className="muted">{r.comment || 'No comment'}</div>
              </div>
            </div>
          ))}
          {!studentUserId && (
            <div className="stack" style={{ marginTop: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Leave a review</h3>
              <p className="muted" style={{ margin: 0 }}>
                Available after a completed paid session.
              </p>
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
              <ErpButton
                variant="secondary"
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
              </ErpButton>
            </div>
          )}
        </section>
      )}

      <ErpModal
        open={bookOpen}
        title="Book a class"
        onClose={() => setBookOpen(false)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setBookOpen(false)}>
              Cancel
            </ErpButton>
            <ErpButton type="button" disabled={booking || !canBook} onClick={onBook}>
              {booking ? 'Booking…' : 'Confirm booking'}
            </ErpButton>
          </>
        }
      >
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>
            Book {tutorRef(u)}. Slots need 12 hours’ notice. Pay after you confirm.
          </p>
          <ErpSelect
            label="Subject"
            value={subjectId}
            options={
              offeringSubjects.length
                ? subjectOptions(offeringSubjects)
                : [{ value: '', label: 'No subjects', disabled: true }]
            }
            onChange={(e) => {
              const next = e.target.value;
              setSubjectId(next);
              const offering = (data.subjects || []).find(
                (s) => String(s.subjectId?._id || s.subjectId) === String(next)
              );
              const nextLevel = offering?.level || offering?.subjectId?.levels?.[0] || level;
              setLevel(nextLevel);
            }}
          />
          <ErpSelect
            label="Level"
            value={level}
            options={levelOptions.length ? levelOptions : options('subject_level')}
            onChange={(e) => setLevel(e.target.value)}
          />
          <ErpSelect
            label="Class mode"
            value={deliveryMode}
            options={options('delivery_mode').filter((o) => {
              if (p.teachingMode === 'online') return o.value === 'online';
              if (p.teachingMode === 'offline') return o.value === 'offline';
              return true;
            })}
            onChange={(e) => {
              setDeliveryMode(e.target.value);
              const first = (data.availability || []).find(
                (s) => !s.isBooked && (!s.deliveryMode || s.deliveryMode === e.target.value)
              );
              setSlotId(first?._id || '');
            }}
          />
          <ErpSelect
            label="Available slot"
            value={slotId}
            options={slotOptions(bookSlots)}
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
        </div>
      </ErpModal>
    </div>
  );
}
