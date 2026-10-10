import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addTutorVideo,
  deleteTutorVideo,
  listBoards,
  listClassLevels,
  listCountries,
  listCurrencies,
  listTutorVideos,
  updateMe,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import {
  ErpAvatar,
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpEmptyState,
  ErpInput,
  ErpPageHeader,
  ErpSelect,
  ErpStatusBadge,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { errorMessage } from '../../utils/errors';
import { browserTimezone, timezoneOptions } from '../tutor/tutorOptions';
import { RowIcon } from './sharedUi';
import './shared.css';
import './profile.css';

function asList(x) {
  return Array.isArray(x) ? x : x?.items || [];
}

function isoDate(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function addr(a = {}) {
  return {
    label: a.label || 'Home',
    line1: a.line1 || '',
    line2: a.line2 || '',
    area: a.area || '',
    city: a.city || '',
    state: a.state || '',
    postalCode: a.postalCode || '',
    country: a.country || '',
    landmark: a.landmark || '',
  };
}

function emptyForm(user, profile) {
  const home = profile?.addresses?.[0] || {};
  return {
    name: user?.name || '',
    email: user?.email || '',
    timezone: user?.timezone || browserTimezone(),
    country: user?.country || '',
    countryId: user?.countryId || '',
    avatar: user?.avatar || '',
    dateOfBirth: isoDate(user?.dateOfBirth || profile?.dateOfBirth),
    sex: user?.sex || profile?.sex || '',
    preferredCurrency: user?.preferredCurrency || profile?.preferredCurrency || profile?.currency || '',
    introPageUrl: profile?.introPageUrl || '',
    whatsappNumber: profile?.whatsappNumber || '',
    school: profile?.school || '',
    gradeYear: profile?.gradeYear || '',
    boardId: profile?.boardId?._id || profile?.boardId || '',
    classLevelId: profile?.classLevelId?._id || profile?.classLevelId || '',
    qualifications: profile?.qualifications || '',
    university: profile?.university || '',
    degree: profile?.degree || '',
    experienceYears: profile?.experienceYears ?? 0,
    languages: (profile?.languages || []).join(', '),
    bio: profile?.bio || '',
    hourlyRate: profile?.hourlyRate ?? 0,
    hourlyRateOnline: profile?.hourlyRateOnline ?? profile?.hourlyRate ?? 0,
    hourlyRateOffline: profile?.hourlyRateOffline ?? profile?.hourlyRate ?? 0,
    currency: profile?.currency || '',
    teachingMode: profile?.teachingMode || 'both',
    city: profile?.location?.city || '',
    area: profile?.location?.area || '',
    address: profile?.location?.address || '',
    trialLessonAvailable: profile?.trialLessonAvailable ?? true,
    needBasedClasses: profile?.needBasedClasses ?? true,
    meetingProvider: profile?.meetingProvider || 'zoom',
    home: addr(home.line1 ? home : { city: profile?.location?.city, area: profile?.location?.area, line1: profile?.location?.address, country: user?.country }),
    currentAddress: addr(profile?.currentAddress || {}),
    permanentAddress: addr(profile?.permanentAddress || {}),
    emergencyName: profile?.emergencyContact?.name || '',
    emergencyRelationship: profile?.emergencyContact?.relationship || '',
    emergencyPhone: profile?.emergencyContact?.phone || '',
    emergencyEmail: profile?.emergencyContact?.email || '',
    identityType: profile?.identity?.type || '',
    identityNumber: profile?.identity?.number || '',
    identityDocumentUrl: profile?.identity?.documentUrl || '',
    gstHas: profile?.gst?.hasGst ?? false,
    gstType: profile?.gst?.type || 'GSTIN',
    gstNumber: profile?.gst?.number || '',
    gstLegalName: profile?.gst?.legalName || '',
    gstAddress: profile?.gst?.registeredAddress || '',
    gstStatus: profile?.gst?.status || '',
  };
}

const IDENTITY_STATUS = {
  unverified: { label: 'Unverified', status: 'unverified' },
  pending: { label: 'Pending review', status: 'pending' },
  verified: { label: 'Verified', status: 'verified' },
  approved: { label: 'Verified', status: 'verified' },
  rejected: { label: 'Rejected', status: 'rejected' },
};

const GST_STATUS = {
  unverified: 'Not checked yet',
  format_ok: 'Format looks valid — awaiting admin verification',
  pending: 'Pending admin review',
  verified: 'Verified by admin',
  approved: 'Verified by admin',
  rejected: 'Number format is invalid or was rejected',
};

function seedForm(user, profile, countries) {
  const next = emptyForm(user, profile);
  const countryId = next.countryId?._id || next.countryId;
  const home =
    countries.find((x) => x._id === countryId) ||
    countries.find((x) => x.name.toLowerCase() === String(user?.country || '').toLowerCase());
  if (home) {
    next.countryId = home._id;
    next.country = home.name;
    if (!next.timezone || next.timezone === 'UTC') next.timezone = home.defaultTimezone || next.timezone;
    if (!next.currency) next.currency = home.currency || next.currency;
    if (!next.preferredCurrency) next.preferredCurrency = home.currency || next.preferredCurrency;
  } else {
    next.countryId = countryId || '';
  }
  return next;
}

const STEP_META = {
  account: { label: 'Account', icon: 'user', description: 'Your name, email, region and display preferences.' },
  personal: {
    label: 'Personal',
    icon: 'heart',
    description: 'Personal details and who to contact in an emergency.',
  },
  school: { label: 'School', icon: 'graduation-cap', description: 'Where you study, so we can match the right syllabus.' },
  address: { label: 'Address', icon: 'map-pin', description: 'Where doorstep (offline) classes happen.' },
  identity: { label: 'Identity', icon: 'shield-check', description: 'A government ID for verification. Kept private.' },
  teaching: {
    label: 'Teaching',
    icon: 'book-open',
    description: 'Your background, languages and how you like to teach.',
  },
  location: { label: 'Rates & location', icon: 'credit-card', description: 'Hourly rates, studio and addresses.' },
  tax: { label: 'GST / tax', icon: 'receipt', description: 'Tax registration details for invoices.' },
  videos: { label: 'Videos', icon: 'video', description: 'Demo videos shown on your public profile.' },
};

function stepsFor(role, tutorFields) {
  const ids = ['account', 'personal'];
  if (role === 'student') ids.push('school', 'address', 'identity');
  if (role === 'parent') ids.push('identity');
  if (tutorFields) ids.push('teaching', 'location', 'identity', 'tax', 'videos');
  return ids.map((id, i) => ({ id, n: i + 1, ...STEP_META[id] }));
}

function ToggleRow({ checked, onChange, title, hint }) {
  return (
    <label className="sp-toggle-row erp-form-span">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>
        <span className="sp-toggle-title">{title}</span>
        {hint ? <span className="sp-toggle-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

function SubHead({ children, hint }) {
  return (
    <div className="sp-subhead erp-form-span">
      <h4>{children}</h4>
      {hint ? <p>{hint}</p> : null}
    </div>
  );
}

export default function ProfilePage({ tutorFields = false }) {
  const { user, profile, refresh } = useAuth();
  const { options } = useCatalog();
  const steps = useMemo(() => stepsFor(user?.role, tutorFields), [user?.role, tutorFields]);
  const [step, setStep] = useState('account');
  const [form, setForm] = useState({});
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [boards, setBoards] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoForm, setVideoForm] = useState({ title: 'Introduction', kind: 'intro', fileUrl: '' });
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileKey, setVideoFileKey] = useState(0);
  const [addingVideo, setAddingVideo] = useState(false);
  const [removeVideo, setRemoveVideo] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSteps, setSavedSteps] = useState(() => new Set());
  const [lookupsReady, setLookupsReady] = useState(false);
  const seeded = useRef(false);
  const cardRef = useRef(null);

  useEffect(() => {
    Promise.all([listCountries(), listCurrencies().catch(() => [])])
      .then(([c, cur]) => {
        setCountries(asList(c));
        setCurrencies(asList(cur));
      })
      .catch(() => {})
      .finally(() => setLookupsReady(true));
  }, []);

  useEffect(() => {
    if (!tutorFields) return;
    listTutorVideos()
      .then(setVideos)
      .catch(() => {});
  }, [tutorFields]);

  // Seed once lookups are in; later profile refreshes must not wipe in-progress edits.
  useEffect(() => {
    if (seeded.current || !user || !lookupsReady) return;
    seeded.current = true;
    setForm(seedForm(user, profile, countries));
  }, [user, profile, countries, lookupsReady]);

  useEffect(() => {
    if (user?.role !== 'student') return undefined;
    const params = form.countryId ? { countryId: form.countryId } : {};
    Promise.all([listBoards(params), listClassLevels(params)])
      .then(([b, l]) => {
        setBoards(asList(b));
        setClassLevels(asList(l));
      })
      .catch(() => {});
    return undefined;
  }, [user?.role, form.countryId]);

  const selectedCountry = countries.find((c) => c._id === form.countryId);
  const zoneOptions = useMemo(
    () =>
      timezoneOptions([
        form.timezone,
        user?.timezone,
        browserTimezone(),
        ...(selectedCountry?.timezones || []),
        selectedCountry?.defaultTimezone,
      ]),
    [form.timezone, selectedCountry, user?.timezone]
  );

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setAddr = (key, field) => (e) =>
    setForm((f) => ({ ...f, [key]: { ...(f[key] || addr()), [field]: e.target.value } }));

  const currencyOptions = [
    { value: '', label: 'Select currency' },
    ...[...new Set([
      ...currencies.map((c) => c.code || c.value || c),
      form.preferredCurrency,
      form.currency,
      selectedCountry?.currency,
    ].filter(Boolean))].map((code) => ({ value: code, label: code })),
  ];

  const addressFields = (key, title, hint) => (
    <>
      <SubHead hint={hint}>{title}</SubHead>
      <div className="erp-form-span">
        <ErpInput label="Address line 1" value={form[key]?.line1 || ''} onChange={setAddr(key, 'line1')} />
      </div>
      <div className="erp-form-span">
        <ErpInput label="Address line 2" optional value={form[key]?.line2 || ''} onChange={setAddr(key, 'line2')} />
      </div>
      <ErpInput label="Area" value={form[key]?.area || ''} onChange={setAddr(key, 'area')} />
      <ErpInput label="City" value={form[key]?.city || ''} onChange={setAddr(key, 'city')} />
      <ErpInput label="State" value={form[key]?.state || ''} onChange={setAddr(key, 'state')} />
      <ErpInput label="Postal code" value={form[key]?.postalCode || ''} onChange={setAddr(key, 'postalCode')} />
      <ErpInput label="Landmark" optional value={form[key]?.landmark || ''} onChange={setAddr(key, 'landmark')} />
    </>
  );

  const onCountry = (countryId) => {
    const country = countries.find((c) => c._id === countryId);
    setForm((f) => ({
      ...f,
      countryId,
      country: country?.name || f.country,
      timezone: country?.defaultTimezone || f.timezone,
      currency: country?.currency || f.currency,
      boardId: '',
      classLevelId: '',
    }));
  };

  const saveProfile = async () => {
    const payload = {
      name: form.name,
      email: form.email,
      timezone: form.timezone,
      country: form.country,
      countryId: form.countryId || '',
      avatar: form.avatar,
      dateOfBirth: form.dateOfBirth || '',
      sex: form.sex || '',
      preferredCurrency: form.preferredCurrency || form.currency || '',
      introPageUrl: form.introPageUrl || '',
      whatsappNumber: form.whatsappNumber || '',
      emergencyContact: {
        name: form.emergencyName || '',
        relationship: form.emergencyRelationship || '',
        phone: form.emergencyPhone || '',
        email: form.emergencyEmail || '',
      },
      identity: {
        type: form.identityType || '',
        number: form.identityNumber || '',
        documentUrl: form.identityDocumentUrl || '',
      },
    };
    if (user?.role === 'student') {
      payload.school = form.school;
      payload.gradeYear = form.gradeYear;
      payload.boardId = form.boardId || '';
      payload.classLevelId = form.classLevelId || '';
      payload.addresses = [form.home || addr()];
    }
    if (tutorFields) {
      Object.assign(payload, {
        qualifications: form.qualifications,
        university: form.university,
        degree: form.degree,
        experienceYears: Number(form.experienceYears) || 0,
        languages: String(form.languages || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        bio: form.bio,
        currency: form.currency || undefined,
        hourlyRate: Number(form.hourlyRateOnline || form.hourlyRate) || 0,
        hourlyRateOnline: Number(form.hourlyRateOnline) || 0,
        hourlyRateOffline: Number(form.hourlyRateOffline) || 0,
        teachingMode: form.teachingMode,
        location: { city: form.city, area: form.area, address: form.address },
        trialLessonAvailable: form.trialLessonAvailable,
        needBasedClasses: !!form.needBasedClasses,
        meetingProvider: form.meetingProvider || 'zoom',
        currentAddress: form.currentAddress || addr(),
        permanentAddress: form.permanentAddress || addr(),
        gst: {
          hasGst: !!form.gstHas,
          type: form.gstType || 'GSTIN',
          number: form.gstNumber || '',
          legalName: form.gstLegalName || '',
          registeredAddress: form.gstAddress || '',
        },
      });
    }
    await updateMe(payload);
    const me = await refresh();
    if (me?.user) setForm(seedForm(me.user, me.profile, countries));
  };

  const markSaved = (id) => setSavedSteps((prev) => new Set(prev).add(id));

  const scrollToCard = () => {
    const el = cardRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 64) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goTo = async (nextId) => {
    if (nextId === step) return;
    setError('');
    setMsg('');
    if (step !== 'videos') {
      setSaving(true);
      try {
        await saveProfile();
        markSaved(step);
        setMsg('Step saved');
      } catch (err) {
        setError(errorMessage(err));
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setStep(nextId);
    scrollToCard();
  };

  const stepIndex = Math.max(0, steps.findIndex((s) => s.id === step));
  const isLast = stepIndex === steps.length - 1;
  const current = steps[stepIndex] || steps[0];

  const saveCurrent = async (doneMsg = 'Step saved') => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await saveProfile();
      markSaved(step);
      setMsg(doneMsg);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onContinue = async () => {
    if (isLast && step !== 'videos') {
      await saveCurrent('Profile saved');
      return;
    }
    const next = steps[stepIndex + 1];
    if (next) goTo(next.id);
  };

  const addVideo = async () => {
    setError('');
    setAddingVideo(true);
    try {
      if (videoFile) {
        const fd = new FormData();
        fd.append('title', videoForm.title);
        fd.append('kind', videoForm.kind);
        if (videoForm.fileUrl) fd.append('fileUrl', videoForm.fileUrl);
        fd.append('file', videoFile);
        await addTutorVideo(fd);
      } else {
        await addTutorVideo(videoForm);
      }
      setMsg('Video added');
      setVideoFile(null);
      setVideoFileKey((k) => k + 1);
      listTutorVideos().then(setVideos);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAddingVideo(false);
    }
  };

  const confirmRemoveVideo = async () => {
    if (!removeVideo) return;
    setRemoving(true);
    try {
      await deleteTutorVideo(removeVideo._id);
      setRemoveVideo(null);
      listTutorVideos().then(setVideos);
    } catch (err) {
      setError(errorMessage(err));
      setRemoveVideo(null);
    } finally {
      setRemoving(false);
    }
  };

  const rawIdentity = profile?.identity?.status || 'unverified';
  const identityStatus = IDENTITY_STATUS[rawIdentity] || {
    label: rawIdentity.replace(/_/g, ' '),
    status: rawIdentity,
  };
  const gstStatus = profile?.gst?.status || form.gstStatus || '';

  const countryOptions = [
    { value: '', label: 'Select country' },
    ...countries.map((c) => ({ value: c._id, label: c.name })),
  ];

  const roleLabel = tutorFields ? 'Tutor' : user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
  const progressPct = steps.length > 1 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 100;

  const formProps = {
    className: 'erp-form-grid',
    onSubmit: (e) => {
      e.preventDefault();
      onContinue();
    },
  };

  const renderSection = () => {
    switch (step) {
      case 'account':
        return (
          <form {...formProps}>
            <ErpInput label="Full name" value={form.name || ''} onChange={set('name')} autoComplete="name" />
            <ErpInput
              label="Email"
              type="email"
              value={form.email || ''}
              onChange={set('email')}
              autoComplete="email"
            />
            <div className="erp-form-span">
              <ErpInput
                label="Avatar URL"
                optional
                value={form.avatar || ''}
                onChange={set('avatar')}
                placeholder="https://…"
                helper="Paste a link to a square image — the preview above updates as you type."
              />
            </div>
            <SubHead hint="Used for class times, prices and invoices.">Region</SubHead>
            <ErpSelect
              label="Country"
              value={form.countryId || ''}
              options={countryOptions}
              onChange={(e) => onCountry(e.target.value)}
            />
            <ErpSelect
              label="Timezone"
              value={form.timezone || 'UTC'}
              options={zoneOptions}
              onChange={set('timezone')}
            />
            <ErpSelect
              label="Preferred currency"
              value={form.preferredCurrency || form.currency || ''}
              options={currencyOptions}
              onChange={set('preferredCurrency')}
            />
          </form>
        );
      case 'personal':
        return (
          <form {...formProps}>
            <ErpInput
              label="Date of birth"
              type="date"
              value={form.dateOfBirth || ''}
              onChange={set('dateOfBirth')}
            />
            <ErpSelect
              label="Sex / gender"
              value={form.sex || ''}
              options={[{ value: '', label: 'Select' }, ...options('sex')]}
              onChange={set('sex')}
            />
            <ErpInput
              label="Intro page URL"
              optional
              value={form.introPageUrl || ''}
              onChange={set('introPageUrl')}
            />
            {(user?.role === 'student' || user?.role === 'parent' || tutorFields) && (
              <ErpInput
                label="WhatsApp number"
                value={form.whatsappNumber || ''}
                onChange={set('whatsappNumber')}
                placeholder="Include country code"
                helper="Private — never shown on your public profile, in search, or to other users."
              />
            )}
            <SubHead hint="Only used if we can't reach you during a class.">Emergency contact</SubHead>
            <ErpInput label="Name" value={form.emergencyName || ''} onChange={set('emergencyName')} />
            <ErpSelect
              label="Relationship"
              value={form.emergencyRelationship || ''}
              options={[{ value: '', label: 'Select' }, ...options('relationship')]}
              onChange={set('emergencyRelationship')}
            />
            <ErpInput label="Phone" type="tel" value={form.emergencyPhone || ''} onChange={set('emergencyPhone')} />
            <ErpInput label="Email" type="email" value={form.emergencyEmail || ''} onChange={set('emergencyEmail')} />
          </form>
        );
      case 'school':
        return (
          <form {...formProps}>
            <ErpInput label="School" value={form.school || ''} onChange={set('school')} />
            <ErpInput label="Grade year" value={form.gradeYear || ''} onChange={set('gradeYear')} />
            <ErpSelect
              label="Board"
              value={form.boardId || ''}
              onChange={set('boardId')}
              helper={!boards.length ? 'Pick your country in Account to see boards.' : undefined}
              options={[
                { value: '', label: boards.length ? 'Select board' : 'No boards for this country' },
                ...boards.map((b) => ({ value: b._id, label: b.name })),
              ]}
            />
            <ErpSelect
              label="Class level"
              value={form.classLevelId || ''}
              onChange={set('classLevelId')}
              options={[
                { value: '', label: classLevels.length ? 'Select class' : 'No classes for this country' },
                ...classLevels.map((c) => ({ value: c._id, label: c.name })),
              ]}
            />
          </form>
        );
      case 'teaching':
        return (
          <form {...formProps}>
            <ErpInput label="Qualifications" value={form.qualifications || ''} onChange={set('qualifications')} />
            <ErpInput label="University" value={form.university || ''} onChange={set('university')} />
            <ErpInput label="Degree" value={form.degree || ''} onChange={set('degree')} />
            <ErpInput
              label="Experience (years)"
              type="number"
              min="0"
              value={form.experienceYears || 0}
              onChange={set('experienceYears')}
            />
            <ErpInput
              label="Languages"
              value={form.languages || ''}
              onChange={set('languages')}
              helper="Separate with commas, e.g. English, Hindi"
            />
            <ErpSelect
              label="Teaching mode"
              value={form.teachingMode || 'both'}
              onChange={set('teachingMode')}
              options={[
                { value: 'both', label: 'Online and offline' },
                { value: 'online', label: 'Online only' },
                { value: 'offline', label: 'Offline only' },
              ]}
            />
            <div className="erp-form-span">
              <ErpTextarea
                id="profile-bio"
                label="Bio"
                value={form.bio || ''}
                onChange={set('bio')}
                rows={5}
                helper="Students read this on your public profile."
              />
            </div>
            <SubHead>Class preferences</SubHead>
            <ToggleRow
              checked={!!form.trialLessonAvailable}
              onChange={set('trialLessonAvailable')}
              title="Trial lesson available"
              hint="New students can book a short first lesson."
            />
            <ToggleRow
              checked={form.needBasedClasses !== false}
              onChange={set('needBasedClasses')}
              title="I take need-based / one-off classes"
              hint="Show up for single sessions, not only packages."
            />
            <ErpSelect
              label="Default meeting app"
              value={form.meetingProvider || 'zoom'}
              options={options('meeting_provider')}
              onChange={set('meetingProvider')}
            />
          </form>
        );
      case 'location':
        return (
          <form {...formProps}>
            <SubHead hint={`Currency follows your selected country${form.currency ? ` (${form.currency})` : ''}.`}>
              Hourly rates
            </SubHead>
            <ErpInput
              label={`Online rate${form.currency ? ` (${form.currency})` : ''}`}
              type="number"
              min="0"
              value={form.hourlyRateOnline || 0}
              onChange={set('hourlyRateOnline')}
            />
            <ErpInput
              label={`Offline rate${form.currency ? ` (${form.currency})` : ''}`}
              type="number"
              min="0"
              value={form.hourlyRateOffline || 0}
              onChange={set('hourlyRateOffline')}
            />
            <SubHead hint="Offline slots use this studio address.">Studio</SubHead>
            <ErpInput label="City" value={form.city || ''} onChange={set('city')} />
            <ErpInput label="Area" value={form.area || ''} onChange={set('area')} />
            <div className="erp-form-span">
              <ErpInput label="Studio / address" value={form.address || ''} onChange={set('address')} />
            </div>
            {addressFields('currentAddress', 'Current address')}
            {addressFields('permanentAddress', 'Permanent address')}
          </form>
        );
      case 'address':
        return (
          <form {...formProps}>
            {addressFields('home', 'Home / class address', 'Required for offline doorstep classes.')}
          </form>
        );
      case 'identity':
        return (
          <form {...formProps}>
            <div className="sp-status-line erp-form-span">
              <RowIcon name="shield-check" tone={identityStatus.status === 'verified' ? 'success' : 'brand'} size="sm" />
              <span>
                <span className="sp-toggle-title">Verification status</span>
                <span className="sp-toggle-hint">
                  Identity numbers are visible only to you and admin and stay masked on public profiles. Changing the
                  number sends it back for review.
                </span>
              </span>
              <ErpStatusBadge status={identityStatus.status} dot>
                {identityStatus.label}
              </ErpStatusBadge>
            </div>
            <ErpSelect
              label="ID type"
              value={form.identityType || ''}
              options={[{ value: '', label: 'Select' }, ...options('identity_type')]}
              onChange={set('identityType')}
            />
            <ErpInput label="Identity number" value={form.identityNumber || ''} onChange={set('identityNumber')} />
            <div className="erp-form-span">
              <ErpInput
                label="ID document URL"
                value={form.identityDocumentUrl || ''}
                onChange={set('identityDocumentUrl')}
                placeholder="https://…"
              />
            </div>
          </form>
        );
      case 'tax':
        return (
          <form {...formProps}>
            {gstStatus ? (
              <div className="sp-status-line erp-form-span">
                <RowIcon name="receipt" tone={['verified', 'approved'].includes(gstStatus) ? 'success' : 'brand'} size="sm" />
                <span>
                  <span className="sp-toggle-title">GST status</span>
                  <span className="sp-toggle-hint">
                    {profile?.gst?.portalNote ? `Admin note: ${profile.gst.portalNote}` : 'Live portal verification is done by admin.'}
                  </span>
                </span>
                <ErpStatusBadge status={gstStatus} dot>
                  {GST_STATUS[gstStatus] || gstStatus.replace(/_/g, ' ')}
                </ErpStatusBadge>
              </div>
            ) : null}
            <ToggleRow
              checked={!!form.gstHas}
              onChange={set('gstHas')}
              title="I have a GST / tax registration"
              hint="Adds your tax number to invoices."
            />
            <ErpInput label="GST type" value={form.gstType || 'GSTIN'} onChange={set('gstType')} />
            <ErpInput label="GSTIN / tax number" value={form.gstNumber || ''} onChange={set('gstNumber')} />
            <ErpInput label="Legal name" value={form.gstLegalName || ''} onChange={set('gstLegalName')} />
            <ErpInput label="Registered address" value={form.gstAddress || ''} onChange={set('gstAddress')} />
            {!gstStatus ? (
              <p className="sp-quiet erp-form-span" style={{ margin: 0 }}>
                Live portal verification is done by admin.
              </p>
            ) : null}
          </form>
        );
      case 'videos':
        return (
          <div className="stack">
            <div className="sp-video-add">
              <div className="erp-form-grid">
                <ErpInput
                  label="Title"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))}
                />
                <ErpInput
                  label="Video URL"
                  optional
                  value={videoForm.fileUrl}
                  placeholder="YouTube embed URL"
                  helper="Optional if you upload a file."
                  onChange={(e) => setVideoForm((f) => ({ ...f, fileUrl: e.target.value }))}
                />
                <div className="field erp-form-span">
                  <span className="erp-label">Upload file</span>
                  <label className="erp-file-drop sp-file-drop">
                    <Icon name="upload" size={18} />
                    <span>
                      <strong>{videoFile ? videoFile.name : 'Choose a video file'}</strong>
                      <span className="sp-toggle-hint">MP4 or WebM</span>
                    </span>
                    <input
                      key={videoFileKey}
                      type="file"
                      accept="video/*,.mp4,.webm"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
              <div className="sp-video-add-actions">
                <ErpButton variant="secondary" icon="plus" type="button" loading={addingVideo} onClick={addVideo}>
                  Add video
                </ErpButton>
              </div>
            </div>
            {(videos || []).length ? (
              <ul className="sp-video-list">
                {videos.map((v) => (
                  <li key={v._id}>
                    <RowIcon name="video" size="sm" />
                    <span className="sp-video-name">
                      <strong>{v.title}</strong>
                      <span className="sp-toggle-hint">{v.kind}</span>
                    </span>
                    <ErpButton variant="ghost" size="sm" icon="trash" type="button" onClick={() => setRemoveVideo(v)}>
                      Remove
                    </ErpButton>
                  </li>
                ))}
              </ul>
            ) : (
              <ErpEmptyState
                icon="video"
                title="No videos yet"
                description="A short introduction helps students choose you."
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page sp-page sp-profile">
      <ErpPageHeader
        subtitle={
          steps.length > 1
            ? 'Work through each section. Switching sections saves the one you are on.'
            : 'Your account details.'
        }
      />

      <section className="sp-profile-hero" aria-label="Profile summary">
        <ErpAvatar name={form.name || user?.name} src={form.avatar || undefined} size="xl" className="sp-profile-avatar" />
        <div className="sp-profile-who">
          <div className="sp-profile-name-row">
            <h2>{form.name || user?.name || 'Your profile'}</h2>
            {roleLabel ? <ErpBadge tone="brand">{roleLabel}</ErpBadge> : null}
          </div>
          <div className="sp-meta">
            {user?.phone ? (
              <span>
                <Icon name="phone" size={13} /> {user.phone}
              </span>
            ) : null}
            {form.email ? (
              <span>
                <Icon name="mail" size={13} /> {form.email}
              </span>
            ) : null}
            {form.country ? (
              <span>
                <Icon name="globe" size={13} /> {form.country}
                {form.timezone ? ` · ${form.timezone}` : ''}
              </span>
            ) : null}
          </div>
        </div>
        {steps.length > 1 ? (
          <div className="sp-profile-progress">
            <span className="sp-quiet">
              Section {stepIndex + 1} of {steps.length}
            </span>
            <div className="sp-progress-bar" aria-hidden="true">
              <span style={{ width: `${progressPct}%` }} />
            </div>
            {steps.some((s) => s.id === 'identity') ? (
              <ErpStatusBadge status={identityStatus.status} dot>
                ID {identityStatus.label.toLowerCase()}
              </ErpStatusBadge>
            ) : null}
          </div>
        ) : null}
      </section>

      {msg ? (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      ) : null}
      {error ? (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      ) : null}

      <div className={`sp-profile-layout${steps.length > 1 ? '' : ' is-single'}`}>
        {steps.length > 1 && (
          <nav className="sp-profile-nav" aria-label="Profile sections">
            <ol>
              {steps.map((s) => {
                const isActive = s.id === step;
                const done = savedSteps.has(s.id) && !isActive;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`sp-nav-item${isActive ? ' is-active' : ''}${done ? ' is-done' : ''}`}
                      aria-current={isActive ? 'step' : undefined}
                      onClick={() => goTo(s.id)}
                      disabled={saving}
                    >
                      <span className="sp-nav-num" aria-hidden="true">
                        {done ? <Icon name="check" size={12} strokeWidth={2.5} /> : s.n}
                      </span>
                      <span className="sp-nav-text">
                        <span className="sp-nav-label">{s.label}</span>
                        <span className="sp-nav-desc">{s.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div ref={cardRef} className="sp-profile-main">
          <ErpCard
            className="sp-profile-card"
            heading={
              <span className="sp-card-heading">
                <Icon name={current.icon} size={16} />
                {current.label}
              </span>
            }
            description={current.description}
          >
            {renderSection()}
            <div className="erp-form-footer sp-profile-footer">
              {stepIndex > 0 ? (
                <ErpButton
                  variant="ghost"
                  icon="chevron-left"
                  disabled={saving}
                  onClick={() => goTo(steps[stepIndex - 1].id)}
                  className="sp-footer-back"
                >
                  Back
                </ErpButton>
              ) : null}
              <span className="sp-footer-spacer" />
              {step !== 'videos' && !(isLast || steps.length === 1) ? (
                <ErpButton variant="secondary" disabled={saving} onClick={() => saveCurrent()}>
                  {saving ? 'Saving…' : 'Save'}
                </ErpButton>
              ) : null}
              {steps.length > 1 && !isLast ? (
                <ErpButton iconRight="chevron-right" disabled={saving} onClick={onContinue}>
                  {saving ? 'Saving…' : 'Save & continue'}
                </ErpButton>
              ) : null}
              {(isLast && step !== 'videos') || steps.length === 1 ? (
                <ErpButton icon="check" loading={saving} onClick={onContinue}>
                  {saving ? 'Saving…' : 'Save profile'}
                </ErpButton>
              ) : null}
            </div>
          </ErpCard>
        </div>
      </div>

      <ErpConfirm
        open={Boolean(removeVideo)}
        title="Remove video"
        message={removeVideo ? `Remove "${removeVideo.title}" from your public profile?` : ''}
        confirmLabel="Remove"
        danger
        busy={removing}
        onConfirm={confirmRemoveVideo}
        onCancel={() => !removing && setRemoveVideo(null)}
      />
    </div>
  );
}
