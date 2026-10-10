import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  addFavoriteTutor,
  addTutorReview,
  createBooking,
  enrollCourse,
  getTutor,
  listCourses,
  removeFavoriteTutor,
} from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpInput,
  ErpLoadingState,
  ErpModal,
  ErpSelect,
  ErpTabs,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { formatPlace, money, tutorRef } from '../../utils/format';
import { errorMessage } from '../../utils/errors';
import { mediaUrl } from '../../utils/mediaUrl';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { RATING_OPTIONS, isSlotBookable, subjectOptions, titleCase } from './studentOptions';
import { formatDay, formatWhen, timeUntil, viewerZone } from './studentTime';
import { LinkButton, Rating } from './studentUi';
import './student.css';

const EMPTY_ADDRESS = { line1: '', area: '', city: '', postalCode: '', landmark: '' };

function refInitials(user) {
  const code = String(tutorRef(user) || '').replace('SCH-', '');
  return (code.slice(0, 2) || 'T').toUpperCase();
}

function addressFromProfile(profile) {
  const a = profile?.addresses?.find((x) => x?.line1 || x?.city) || profile?.currentAddress || {};
  const loc = profile?.location || {};
  return {
    line1: a.line1 || loc.address || '',
    area: a.area || loc.area || '',
    city: a.city || loc.city || '',
    postalCode: a.postalCode || '',
    landmark: a.landmark || '',
    ...(a.state ? { state: a.state } : {}),
    ...(a.country ? { country: a.country } : {}),
  };
}

function firstSlotFor(availability, mode) {
  return (availability || []).find(
    (s) => !s.isBooked && isSlotBookable(s) && (!s.deliveryMode || s.deliveryMode === mode)
  );
}

function Stars({ value }) {
  const n = Math.round(Number(value) || 0);
  return (
    <span className="st-stars" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'is-on' : ''}>
          <Icon name="star" size={14} />
        </span>
      ))}
    </span>
  );
}

export default function StudentTutorDetail({ studentUserId, childName = '', paymentsPath, walletPath, backPath }) {
  const { id } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith('/parent') ? '/parent' : '/student';
  const payPath = paymentsPath || `${base}/payments`;
  const walPath = walletPath || `${base}/wallet`;
  const listPath = backPath || `${base}/tutors`;
  const coursesPath = `${base}/courses`;
  const { options } = useCatalog();
  const { user, profile } = useAuth();
  const zone = viewerZone(user);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('about');
  const [bookOpen, setBookOpen] = useState(false);
  const [slotId, setSlotId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [level, setLevel] = useState('HL');
  const [recurring, setRecurring] = useState(false);
  const [planType, setPlanType] = useState('single');
  const [deliveryMode, setDeliveryMode] = useState('online');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [bookError, setBookError] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [booking, setBooking] = useState(false);
  const [courses, setCourses] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [booked, setBooked] = useState(null);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [enrollingId, setEnrollingId] = useState('');
  const [favBusy, setFavBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

  const load = async ({ initial = false } = {}) => {
    const t = await getTutor(id);
    setData(t);
    if (!initial) return;
    if (t.subjects?.[0]) {
      setSubjectId(t.subjects[0].subjectId?._id || t.subjects[0].subjectId);
      setLevel(t.subjects[0].level || t.subjects[0].subjectId?.levels?.[0] || 'HL');
    }
    const mode = t.profile?.teachingMode === 'offline' ? 'offline' : 'online';
    setDeliveryMode(mode);
    setSlotId(firstSlotFor(t.availability, mode)?._id || '');
    const regular = t.profile?.needBasedClasses === false;
    setPlanType(regular ? 'regular' : 'single');
    setRecurring(regular);
    const published = await listCourses({ tutorUserId: id });
    setCourses(Array.isArray(published) ? published : published.items || []);
  };

  useEffect(() => {
    setNotFound(false);
    setData(null);
    setError('');
    load({ initial: true }).catch((err) => {
      if (err?.status === 404 || err?.status === 400) setNotFound(true);
      else setError(errorMessage(err));
    });
  }, [id]);

  useEffect(() => {
    setAddress(addressFromProfile(profile));
  }, [profile]);

  const offeringSubjects = useMemo(
    () => (data?.subjects || []).map((s) => s.subjectId).filter(Boolean),
    [data]
  );

  const selectedOffering = useMemo(
    () => (data?.subjects || []).find((s) => String(s.subjectId?._id || s.subjectId) === String(subjectId)),
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
      <div className="page stack st-page">
        <Link to={listPath} className="st-back">
          <Icon name="chevron-left" size={16} /> All tutors
        </Link>
        {notFound || error ? (
          <div className="erp-card">
            <ErpEmptyState
              icon={notFound ? 'user' : 'alert-triangle'}
              title={notFound ? 'This tutor is not available' : 'Could not load this tutor'}
              description={
                notFound
                  ? 'They may have been removed or are not approved yet.'
                  : error
              }
              action={
                <LinkButton to={listPath} variant="secondary">
                  Back to tutors
                </LinkButton>
              }
            />
          </div>
        ) : (
          <ErpLoadingState message="Loading tutor…" />
        )}
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
  const bookableSlots = openSlots.filter(isSlotBookable).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  const nextSlot = bookableSlots[0];
  const showOfflinePlace = p.teachingMode === 'offline' || p.teachingMode === 'both';
  const teachesOnline = !p.teachingMode || p.teachingMode === 'online' || p.teachingMode === 'both';
  const teachesOffline = p.teachingMode === 'offline' || p.teachingMode === 'both';
  const regularOnly = p.needBasedClasses === false;
  const onlineRate = p.hourlyRateOnline || p.hourlyRate;
  const offlineRate = p.hourlyRateOffline || p.hourlyRate;
  const fromRate = Math.min(
    ...[teachesOnline && Number(onlineRate), teachesOffline && Number(offlineRate)].filter((r) => r > 0),
    Infinity
  );

  const bookSlots = (data.availability || []).filter(
    (s) => !s.isBooked && (!s.deliveryMode || s.deliveryMode === deliveryMode)
  );
  const selectedSlot = bookSlots.find((s) => s._id === slotId);
  const addressOk = deliveryMode !== 'offline' || Boolean(address.line1.trim() && address.city.trim());
  const canBook = Boolean(selectedSlot && isSlotBookable(selectedSlot) && subjectId && addressOk);
  const planOptions = options('plan_kind').filter((o) => !regularOnly || o.value !== 'single');
  const forceRecurring = planType === 'regular';
  const setAddr = (key) => (e) => setAddress((a) => ({ ...a, [key]: e.target.value }));
  const slotLabel = (s) =>
    `${formatWhen(s.startAt, zone)}${s.deliveryMode ? ` · ${s.deliveryMode}` : ''}${
      isSlotBookable(s) ? '' : ' (inside 12h)'
    }`;
  const modeOptions = options('delivery_mode').filter((o) => {
    if (p.teachingMode === 'online') return o.value === 'online';
    if (p.teachingMode === 'offline') return o.value === 'offline';
    return true;
  });
  const avgRating = Number(p.ratingAvg || 0);

  const tabs = [
    { value: 'about', label: 'About' },
    { value: 'subjects', label: 'Subjects', count: subjects.length },
    { value: 'availability', label: 'Open slots', count: openSlots.length },
    { value: 'courses', label: 'Courses', count: courses.length },
    { value: 'videos', label: 'Videos', count: videos.length },
    { value: 'reviews', label: 'Reviews', count: reviews.length },
  ];

  const openBooking = (mode = deliveryMode, preferredSlotId = '') => {
    setError('');
    setMsg('');
    setBookError('');
    setBooked(null);
    setDeliveryMode(mode);
    const preferred = preferredSlotId && (data.availability || []).find((s) => s._id === preferredSlotId);
    setSlotId(preferred && isSlotBookable(preferred) ? preferred._id : firstSlotFor(data.availability, mode)?._id || '');
    setBookOpen(true);
  };

  const toggleFavorite = async () => {
    setError('');
    setMsg('');
    setFavBusy(true);
    try {
      if (data.favorite) await removeFavoriteTutor(id);
      else await addFavoriteTutor(id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setFavBusy(false);
    }
  };

  const onBook = async () => {
    setBooking(true);
    setError('');
    setBookError('');
    setMsg('');
    setBooked(null);
    const isRecurring = recurring || forceRecurring;
    try {
      const res = await createBooking({
        tutorUserId: id,
        subjectId,
        level,
        slotId,
        deliveryMode,
        planType,
        isRecurring,
        recurrenceCount: isRecurring ? 4 : 1,
        ...(deliveryMode === 'offline' ? { studentAddress: address } : {}),
        ...(studentUserId ? { studentUserId } : {}),
      });
      const first = res?.bookings?.[0];
      setBooked({
        startAt: first?.startAt || selectedSlot?.startAt,
        count: res?.bookings?.length || 1,
        paymentId: res?.payments?.[0]?._id,
      });
      setBookOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      load().catch(() => {});
    } catch (err) {
      setBookError(errorMessage(err));
    } finally {
      setBooking(false);
    }
  };

  const bookLabel = regularOnly ? 'Book regular lessons' : 'Book a class';

  return (
    <div className="page stack st-page">
      <Link to={listPath} className="st-back">
        <Icon name="chevron-left" size={16} /> All tutors
      </Link>

      {booked && (
        <ErpBanner
          variant="success"
          title={`${booked.count > 1 ? `${booked.count} weekly classes booked` : 'Class booked'}${
            childName ? ` for ${childName}` : ''
          }`}
          actions={
            <LinkButton to={payPath} state={booked.paymentId ? { paymentId: booked.paymentId } : undefined} size="sm" icon="credit-card">
              Pay now
            </LinkButton>
          }
          onDismiss={() => setBooked(null)}
        >
          Starts {formatWhen(booked.startAt, zone)}. Pay the invoice to confirm the session.
        </ErpBanner>
      )}
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

      <div className="st-split">
        <div className="st-split-main">
          <ErpCard>
            <div className="st-profile-head">
              {avatar ? (
                <img className="erp-avatar erp-avatar-xl erp-avatar-img" src={avatar} alt="" />
              ) : (
                <span className="erp-avatar erp-avatar-xl" aria-hidden="true">
                  {refInitials(u)}
                </span>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 className="st-profile-title">{tutorRef(u)}</h2>
                <p className="st-profile-tagline">
                  {[p.qualifications, p.university].filter(Boolean).join(' · ') || 'IB tutor'}
                </p>
                <div className="st-badges">
                  {p.verificationStatus === 'approved' && (
                    <span className="erp-chip erp-chip-verified">
                      <Icon name="shield-check" size={12} /> Verified
                    </span>
                  )}
                  {p.isPremium && (
                    <span className="erp-chip erp-chip-premium">
                      <Icon name="sparkles" size={12} /> Premium
                    </span>
                  )}
                  {teachesOnline && (
                    <span className="erp-chip erp-chip-online">
                      <Icon name="video" size={12} /> Online
                    </span>
                  )}
                  {teachesOffline && (
                    <span className="erp-chip erp-chip-offline">
                      <Icon name="map-pin" size={12} /> Offline
                    </span>
                  )}
                  {regularOnly && <span className="erp-chip">Regular students only</span>}
                </div>
              </div>
            </div>
            <dl className="st-profile-facts">
              <div className="st-profile-fact">
                <dt>Rating</dt>
                <dd>
                  <Rating value={p.ratingAvg} count={p.ratingCount || 0} />
                </dd>
              </div>
              <div className="st-profile-fact">
                <dt>Experience</dt>
                <dd>{p.experienceYears || 0} years</dd>
              </div>
              <div className="st-profile-fact">
                <dt>Subjects</dt>
                <dd>{subjects.length}</dd>
              </div>
              <div className="st-profile-fact">
                <dt>Based in</dt>
                <dd title={[u.country, u.timezone].filter(Boolean).join(' · ')}>{u.country || u.timezone || '—'}</dd>
              </div>
            </dl>
          </ErpCard>

          <ErpTabs value={tab} onChange={setTab} tabs={tabs} />

          {tab === 'about' && (
            <ErpCard heading="About">
              <div className="stack">
                <p className="st-prose">{p.bio || 'This tutor has not added a bio yet.'}</p>
                <dl className="erp-detail-grid">
                  <dt>Education</dt>
                  <dd>{[p.degree, p.university].filter(Boolean).join(' · ') || '—'}</dd>
                  <dt>Qualifications</dt>
                  <dd>{p.qualifications || '—'}</dd>
                  <dt>Languages</dt>
                  <dd>{(p.languages || []).join(', ') || '—'}</dd>
                  <dt>Experience</dt>
                  <dd>{p.experienceYears || 0} years</dd>
                  <dt>Time zone</dt>
                  <dd>{[u.timezone, p.currency].filter(Boolean).join(' · ') || '—'}</dd>
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
              </div>
            </ErpCard>
          )}

          {tab === 'subjects' && (
            <ErpCard heading="Subjects taught" description="Rates are per hour." flush>
              {!subjects.length ? (
                <ErpEmptyState icon="book-open" title="No subjects listed" />
              ) : (
                <ul className="st-list">
                  {subjects.map((s) => (
                    <li key={s._id} className="st-item">
                      <span className="st-leading-icon">
                        <Icon name="book-open" size={18} />
                      </span>
                      <div className="st-item-body">
                        <p className="st-item-title">{s.subjectId?.name || 'Subject'}</p>
                        <p className="st-item-meta">
                          {[s.level, s.boardId?.name, s.classLevelId?.name, s.countryId?.name].filter(Boolean).join(' · ') ||
                            '—'}
                        </p>
                      </div>
                      <div className="st-price-row" style={{ display: 'flex', gap: '0.5rem' }}>
                        {teachesOnline && (
                          <div className="st-price-box">
                            <strong>{money(s.onlineRate || s.hourlyRate || p.hourlyRate, s.currency || p.currency)}</strong>
                            <span>Online / hr</span>
                          </div>
                        )}
                        {teachesOffline && (
                          <div className="st-price-box">
                            <strong>{money(s.offlineRate || s.hourlyRate || p.hourlyRate, s.currency || p.currency)}</strong>
                            <span>Offline / hr</span>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ErpCard>
          )}

          {tab === 'availability' && (
            <ErpCard
              heading="Open slots"
              description={`Book at least 12 hours ahead. Times in ${zone || 'your local time'}.`}
            >
              {!openSlots.length ? (
                <ErpEmptyState
                  icon="calendar"
                  title="No open slots right now"
                  description="Save this tutor and check back, or message support to request a time."
                />
              ) : (
                <div className="st-slot-grid">
                  {openSlots.slice(0, 24).map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      className="st-slot"
                      disabled={!isSlotBookable(s)}
                      onClick={() => openBooking(s.deliveryMode || deliveryMode, s._id)}
                      title={isSlotBookable(s) ? 'Book this slot' : 'Inside the 12-hour notice window'}
                    >
                      <span>
                        <span className="st-slot-time">{formatWhen(s.startAt, zone)}</span>
                        <span className="st-slot-sub">
                          {titleCase(s.deliveryMode || 'online')}
                          {isSlotBookable(s) ? ` · ${timeUntil(s.startAt)}` : ' · inside 12h'}
                        </span>
                      </span>
                      <Icon name={isSlotBookable(s) ? 'arrow-right' : 'lock'} size={16} />
                    </button>
                  ))}
                </div>
              )}
            </ErpCard>
          )}

          {tab === 'courses' && (
            <ErpCard heading="Courses" description="Self-paced courses published by this tutor." flush>
              {!courses.length ? (
                <ErpEmptyState icon="layers" title="No courses from this tutor" />
              ) : (
                <ul className="st-list">
                  {courses.map((c) => (
                    <li key={c._id} className="st-item">
                      <span className="st-leading-icon">
                        <Icon name="layers" size={18} />
                      </span>
                      <div className="st-item-body">
                        <p className="st-item-title">{c.title}</p>
                        <p className="st-item-meta">
                          <span>{c.subjectId?.name || 'Subject'}</span>
                          <span>{c.lessonPlanIds?.length || 0} lessons</span>
                          <span>
                            <strong style={{ color: 'var(--erp-text-primary)' }}>
                              {c.price ? money(c.price, c.currency) : 'Free'}
                            </strong>
                          </span>
                        </p>
                      </div>
                      <div className="st-item-actions">
                        <ErpButton
                          variant="secondary"
                          disabled={Boolean(enrollingId)}
                          loading={enrollingId === c._id}
                          onClick={async () => {
                            setError('');
                            setMsg('');
                            setEnrollingId(c._id);
                            try {
                              const res = await enrollCourse(c._id, studentUserId ? { studentUserId } : {});
                              if (res?.enrollment?.status === 'active' || res?.payment?.status === 'paid') {
                                setMsg(`Enrolled in ${c.title}.`);
                              } else {
                                setMsg(`Enrollment created for ${c.title}. Pay the invoice on Payments to start.`);
                              }
                            } catch (err) {
                              setError(errorMessage(err));
                            } finally {
                              setEnrollingId('');
                            }
                          }}
                        >
                          {enrollingId === c._id ? 'Enrolling…' : 'Enroll'}
                        </ErpButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ErpCard>
          )}

          {tab === 'videos' && (
            <ErpCard heading="Demo videos">
              {!videos.length ? (
                <ErpEmptyState icon="video" title="No demo videos yet" />
              ) : (
                <div className="st-video-grid">
                  {videos.map((v) => (
                    <div key={v._id} className="st-video">
                      <div className="st-video-frame">
                        {/youtube\.com|youtu\.be|vimeo\.com/i.test(String(v.fileUrl || '')) ? (
                          <iframe
                            title={v.title}
                            src={v.fileUrl}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <a className="st-video-link" href={mediaUrl(v.fileUrl)} target="_blank" rel="noreferrer">
                            <span className="row" style={{ gap: '0.375rem' }}>
                              <Icon name="video" size={18} /> Watch video
                            </span>
                          </a>
                        )}
                      </div>
                      <div>
                        <strong style={{ fontWeight: 600 }}>{v.title}</strong>
                        <div className="muted">{titleCase(v.kind)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ErpCard>
          )}

          {tab === 'reviews' && (
            <ErpCard heading="Reviews">
              {reviews.length > 0 && (
                <div className="st-rating-summary">
                  <span className="st-rating-big">{avgRating ? avgRating.toFixed(1) : '—'}</span>
                  <span>
                    <Stars value={avgRating} />
                    <span className="muted" style={{ display: 'block' }}>
                      Based on {p.ratingCount || reviews.length} review{(p.ratingCount || reviews.length) === 1 ? '' : 's'}
                    </span>
                  </span>
                </div>
              )}
              {!reviews.length ? (
                <ErpEmptyState icon="star" title="No reviews yet" description="Reviews appear after completed sessions." />
              ) : (
                <div>
                  {reviews.map((r) => (
                    <div key={r._id} className="st-review">
                      <span className="erp-avatar erp-avatar-sm" aria-hidden="true">
                        <Icon name="user" size={14} />
                      </span>
                      <div className="st-review-body">
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          <Stars value={r.rating} />
                          {r.createdAt ? <span className="muted">{formatDay(r.createdAt, zone)}</span> : null}
                        </div>
                        <p>{r.comment || 'No comment left.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!studentUserId && (
                <div className="erp-form-section stack" style={{ marginTop: '1.25rem', gap: '0.75rem' }}>
                  <div>
                    <p className="erp-section-title" style={{ marginBottom: '0.125rem' }}>
                      Leave a review
                    </p>
                    <p className="muted" style={{ margin: 0 }}>
                      Available after a completed paid session.
                    </p>
                  </div>
                  <div className="erp-form-grid">
                    <ErpSelect
                      label="Rating"
                      value={rating}
                      options={RATING_OPTIONS}
                      onChange={(e) => setRating(Number(e.target.value))}
                    />
                    <div className="erp-form-span">
                      <ErpTextarea
                        label="Comment"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="What helped you most in the sessions?"
                      />
                    </div>
                  </div>
                  <div>
                    <ErpButton
                      variant="secondary"
                      loading={reviewBusy}
                      onClick={async () => {
                        setError('');
                        setMsg('');
                        setReviewBusy(true);
                        try {
                          await addTutorReview(id, { rating, comment });
                          setMsg('Review saved');
                          setComment('');
                          await load();
                        } catch (err) {
                          setError(errorMessage(err));
                        } finally {
                          setReviewBusy(false);
                        }
                      }}
                    >
                      Submit review
                    </ErpButton>
                  </div>
                </div>
              )}
            </ErpCard>
          )}
        </div>

        <aside className="st-split-side st-sticky">
          <ErpCard className="st-book-panel">
            <div className="stack" style={{ gap: '1rem' }}>
              <div>
                <h3 className="erp-card-title" style={{ margin: 0 }}>
                  {bookLabel}
                </h3>
                <p className="muted" style={{ margin: '0.125rem 0 0' }}>
                  Pick a slot, then pay to confirm.
                </p>
              </div>
              <div className="st-price-row">
                <div className={`st-price-box${teachesOnline ? '' : ' is-off'}`}>
                  <strong>{teachesOnline ? money(onlineRate, p.currency) : '—'}</strong>
                  <span>Online / hr</span>
                </div>
                <div className={`st-price-box${teachesOffline ? '' : ' is-off'}`}>
                  <strong>{teachesOffline ? money(offlineRate, p.currency) : '—'}</strong>
                  <span>Offline / hr</span>
                </div>
              </div>
              {nextSlot ? (
                <div className="st-next-slot">
                  <Icon name="clock" size={18} />
                  <span>
                    <strong>Next open slot</strong>
                    {formatWhen(nextSlot.startAt, zone)}
                  </span>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  No bookable slots right now.
                </p>
              )}
              <div className="stack" style={{ gap: '0.5rem' }}>
                <ErpButton block size="lg" icon="calendar" onClick={() => openBooking()}>
                  {bookLabel}
                </ErpButton>
                <ErpButton
                  block
                  variant="secondary"
                  icon="heart"
                  loading={favBusy}
                  onClick={toggleFavorite}
                  aria-pressed={Boolean(data.favorite)}
                  className={data.favorite ? 'st-saved' : ''}
                >
                  {data.favorite ? 'Saved to favourites' : 'Save to favourites'}
                </ErpButton>
              </div>
              {regularOnly && (
                <p className="muted" style={{ margin: 0 }}>
                  Takes regular or subscription students only. For one-off learning see{' '}
                  <Link to={coursesPath}>Courses</Link>.
                </p>
              )}
              <div className="st-panel-links">
                <LinkButton to={payPath} variant="ghost" size="sm" icon="credit-card">
                  Payments
                </LinkButton>
                <LinkButton to={walPath} variant="ghost" size="sm" icon="wallet">
                  Wallet
                </LinkButton>
              </div>
            </div>
          </ErpCard>
        </aside>
      </div>

      <div className="st-mobile-cta">
        <div className="st-price">
          <span className="st-price-label">{tutorRef(u)}</span>
          <span className="st-price-value">
            {Number.isFinite(fromRate) ? (
              <>
                <small>from </small>
                {money(fromRate, p.currency)}
                <small> /hr</small>
              </>
            ) : (
              <small>Rate on request</small>
            )}
          </span>
        </div>
        <ErpButton icon="calendar" onClick={() => openBooking()}>
          {regularOnly ? 'Book lessons' : 'Book'}
        </ErpButton>
      </div>

      <ErpModal
        open={bookOpen}
        title={bookLabel}
        onClose={() => setBookOpen(false)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setBookOpen(false)}>
              Cancel
            </ErpButton>
            <ErpButton type="button" disabled={!canBook} loading={booking} onClick={onBook}>
              {booking ? 'Booking…' : 'Confirm booking'}
            </ErpButton>
          </>
        }
      >
        <div className="stack">
          {bookError && <ErpBanner variant="danger">{bookError}</ErpBanner>}
          <p className="muted" style={{ margin: 0 }}>
            Book {tutorRef(u)}
            {childName ? (
              <>
                {' '}
                for <strong>{childName}</strong>
              </>
            ) : null}
            . Slots need 12 hours’ notice. You pay after confirming.
          </p>
          {regularOnly && (
            <ErpBanner variant="info">
              This tutor takes regular or subscription students only. For one-off learning see{' '}
              <Link to={coursesPath}>Courses</Link>.
            </ErpBanner>
          )}

          <div className="erp-form-section">
            <p className="erp-section-title">Class</p>
            <div className="erp-form-grid">
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
                  setLevel(offering?.level || offering?.subjectId?.levels?.[0] || level);
                }}
              />
              <ErpSelect
                label="Level"
                value={level}
                options={levelOptions.length ? levelOptions : options('subject_level')}
                onChange={(e) => setLevel(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <span className="erp-label">Class mode</span>
              <div className="st-choice-grid" role="radiogroup" aria-label="Class mode">
                {modeOptions.map((o) => {
                  const rate = o.value === 'offline' ? offlineRate : onlineRate;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={deliveryMode === o.value}
                      className={`st-choice${deliveryMode === o.value ? ' is-on' : ''}`}
                      onClick={() => {
                        setDeliveryMode(o.value);
                        setSlotId(firstSlotFor(data.availability, o.value)?._id || '');
                      }}
                    >
                      <Icon name={o.value === 'offline' ? 'map-pin' : 'video'} size={18} />
                      <span>
                        <strong style={{ fontWeight: 600 }}>{o.label}</strong>
                        <small>
                          {money(rate, p.currency)} / hr{o.value === 'offline' ? ' · at your address' : ' · video class'}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="erp-form-section">
            <p className="erp-section-title">When</p>
            <ErpSelect
              label={`Available slot (${zone || 'local time'})`}
              value={slotId}
              options={
                bookSlots.length
                  ? [
                      { value: '', label: 'Select slot' },
                      ...bookSlots.map((s) => ({ value: s._id, label: slotLabel(s), disabled: !isSlotBookable(s) })),
                    ]
                  : [{ value: '', label: `No free ${deliveryMode} slots`, disabled: true }]
              }
              onChange={(e) => setSlotId(e.target.value)}
              helper={selectedSlot ? `Starts ${timeUntil(selectedSlot.startAt)}` : undefined}
            />
            <div className="erp-form-grid">
              <ErpSelect
                label="Plan"
                value={planType}
                options={planOptions}
                onChange={(e) => {
                  const next = e.target.value;
                  setPlanType(next);
                  if (next === 'regular') setRecurring(true);
                }}
              />
              <div className="field" style={{ justifyContent: 'flex-end' }}>
                <label className="erp-check" style={{ minHeight: 'var(--erp-control-h)' }}>
                  <input
                    type="checkbox"
                    checked={recurring || forceRecurring}
                    disabled={forceRecurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                  />
                  Repeat weekly (4 lessons)
                </label>
              </div>
            </div>
            {forceRecurring && (
              <p className="muted" style={{ margin: 0 }}>
                Weekly repeats are included with regular lessons.
              </p>
            )}
          </div>

          {deliveryMode === 'offline' && (
            <div className="erp-form-section">
              <p className="erp-section-title">Class address</p>
              <div className="erp-form-grid">
                <div className="erp-form-span">
                  <ErpInput
                    label="Address line"
                    value={address.line1}
                    onChange={setAddr('line1')}
                    required
                    error={!address.line1.trim() ? 'Required for offline classes' : undefined}
                  />
                </div>
                <ErpInput label="Area" optional value={address.area} onChange={setAddr('area')} />
                <ErpInput
                  label="City"
                  value={address.city}
                  onChange={setAddr('city')}
                  required
                  error={!address.city.trim() ? 'Required for offline classes' : undefined}
                />
                <ErpInput label="Postcode" optional value={address.postalCode} onChange={setAddr('postalCode')} />
                <ErpInput label="Landmark" optional value={address.landmark} onChange={setAddr('landmark')} />
              </div>
            </div>
          )}
        </div>
      </ErpModal>
    </div>
  );
}
