import { useEffect, useMemo, useState } from 'react';
import {
  addTutorVideo,
  deleteTutorVideo,
  listBoards,
  listClassLevels,
  listCountries,
  listTutorVideos,
  updateMe,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  ErpButton,
  ErpCard,
  ErpInput,
  ErpPageHeader,
  ErpSelect,
  ErpStickyActions,
} from '../../components/erp';
import { browserTimezone, timezoneOptions } from '../tutor/tutorOptions';

function asList(x) {
  return Array.isArray(x) ? x : x?.items || [];
}

function emptyForm(user, profile) {
  return {
    name: user?.name || '',
    email: user?.email || '',
    timezone: user?.timezone || browserTimezone(),
    country: user?.country || '',
    countryId: '',
    avatar: user?.avatar || '',
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
  };
}

function stepsFor(role, tutorFields) {
  const steps = [{ id: 'account', label: '1. Account' }];
  if (role === 'student') steps.push({ id: 'school', label: '2. School' });
  if (tutorFields) {
    steps.push({ id: 'teaching', label: '2. Teaching' });
    steps.push({ id: 'location', label: '3. Rates & location' });
    steps.push({ id: 'videos', label: '4. Videos' });
  }
  return steps;
}

export default function ProfilePage({ tutorFields = false }) {
  const { user, profile, refresh } = useAuth();
  const steps = useMemo(() => stepsFor(user?.role, tutorFields), [user?.role, tutorFields]);
  const [step, setStep] = useState('account');
  const [form, setForm] = useState({});
  const [countries, setCountries] = useState([]);
  const [boards, setBoards] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoForm, setVideoForm] = useState({ title: 'Introduction', kind: 'intro', fileUrl: '' });
  const [videoFile, setVideoFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = emptyForm(user, profile);
    listCountries()
      .then((c) => {
        const list = asList(c);
        setCountries(list);
        const home =
          list.find((x) => x.name.toLowerCase() === String(user?.country || '').toLowerCase()) ||
          list.find((x) => x._id === next.countryId);
        if (home) {
          next.countryId = home._id;
          next.country = home.name;
          if (!next.timezone || next.timezone === 'UTC') next.timezone = home.defaultTimezone || next.timezone;
          if (!next.currency) next.currency = home.currency || next.currency;
        }
        setForm(next);
      })
      .catch(() => setForm(next));
    if (tutorFields) {
      listTutorVideos()
        .then(setVideos)
        .catch(() => {});
    }
  }, [user, profile, tutorFields]);

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
      avatar: form.avatar,
    };
    if (user?.role === 'student') {
      payload.school = form.school;
      payload.gradeYear = form.gradeYear;
      payload.boardId = form.boardId || '';
      payload.classLevelId = form.classLevelId || '';
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
      });
    }
    await updateMe(payload);
    await refresh();
  };

  const goTo = async (nextId) => {
    if (nextId === step) return;
    setError('');
    setMsg('');
    if (step !== 'videos') {
      setSaving(true);
      try {
        await saveProfile();
        setMsg('Step saved');
      } catch (err) {
        setError(err.errors?.length ? err.errors.map((e) => e.message).join(', ') : err.message);
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setStep(nextId);
  };

  const stepIndex = Math.max(0, steps.findIndex((s) => s.id === step));
  const isLast = stepIndex === steps.length - 1;

  const onContinue = async () => {
    if (isLast && step !== 'videos') {
      setSaving(true);
      setError('');
      try {
        await saveProfile();
        setMsg('Profile saved');
      } catch (err) {
        setError(err.errors?.length ? err.errors.map((e) => e.message).join(', ') : err.message);
      } finally {
        setSaving(false);
      }
      return;
    }
    const next = steps[stepIndex + 1];
    if (next) goTo(next.id);
  };

  const addVideo = async () => {
    setError('');
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
      listTutorVideos().then(setVideos);
    } catch (err) {
      setError(err.message);
    }
  };

  const countryOptions = [
    { value: '', label: 'Select country' },
    ...countries.map((c) => ({ value: c._id, label: c.name })),
  ];

  return (
    <div className="page stack">
      <ErpPageHeader
        title={user?.role === 'admin' ? undefined : 'Profile'}
        subtitle={
          tutorFields
            ? 'Complete each step. Clicking a tab saves the current step first.'
            : user?.role === 'student'
              ? 'Account first, then school. Clicking a tab saves the current step.'
              : 'Your account details.'
        }
      />

      {steps.length > 1 && (
        <div className="erp-steps" role="list">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`erp-step${step === s.id ? ' erp-step-active' : ''}`}
              onClick={() => goTo(s.id)}
              disabled={saving}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      {step === 'account' && (
        <ErpCard>
          <form
            className="erp-form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              onContinue();
            }}
          >
            <ErpInput label="Name" value={form.name || ''} onChange={set('name')} />
            <ErpInput label="Email" value={form.email || ''} onChange={set('email')} />
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
            <ErpInput label="Avatar URL" value={form.avatar || ''} onChange={set('avatar')} />
          </form>
        </ErpCard>
      )}

      {step === 'school' && (
        <ErpCard>
          <form
            className="erp-form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              onContinue();
            }}
          >
            <ErpInput label="School" value={form.school || ''} onChange={set('school')} />
            <ErpInput label="Grade year" value={form.gradeYear || ''} onChange={set('gradeYear')} />
            <ErpSelect
              label="Board"
              value={form.boardId || ''}
              onChange={set('boardId')}
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
        </ErpCard>
      )}

      {step === 'teaching' && (
        <ErpCard>
          <form
            className="erp-form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              onContinue();
            }}
          >
            <ErpInput
              label="Qualifications"
              value={form.qualifications || ''}
              onChange={set('qualifications')}
            />
            <ErpInput label="University" value={form.university || ''} onChange={set('university')} />
            <ErpInput label="Degree" value={form.degree || ''} onChange={set('degree')} />
            <ErpInput
              label="Experience (years)"
              type="number"
              value={form.experienceYears || 0}
              onChange={set('experienceYears')}
            />
            <ErpInput
              label="Languages (comma separated)"
              value={form.languages || ''}
              onChange={set('languages')}
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
            <div className="field erp-form-span">
              <label className="erp-label" htmlFor="profile-bio">
                Bio
              </label>
              <textarea
                id="profile-bio"
                className="erp-search"
                value={form.bio || ''}
                onChange={set('bio')}
                rows={4}
              />
            </div>
            <label className="row erp-form-span">
              <input
                type="checkbox"
                checked={!!form.trialLessonAvailable}
                onChange={set('trialLessonAvailable')}
              />
              Trial lesson available
            </label>
          </form>
        </ErpCard>
      )}

      {step === 'location' && (
        <ErpCard>
          <form
            className="erp-form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              onContinue();
            }}
          >
            <ErpInput
              label={`Online hourly rate${form.currency ? ` (${form.currency})` : ''}`}
              type="number"
              value={form.hourlyRateOnline || 0}
              onChange={set('hourlyRateOnline')}
            />
            <ErpInput
              label={`Offline hourly rate${form.currency ? ` (${form.currency})` : ''}`}
              type="number"
              value={form.hourlyRateOffline || 0}
              onChange={set('hourlyRateOffline')}
            />
            <ErpInput label="City" value={form.city || ''} onChange={set('city')} />
            <ErpInput label="Area" value={form.area || ''} onChange={set('area')} />
            <ErpInput
              label="Studio / address"
              value={form.address || ''}
              onChange={set('address')}
            />
            <p className="muted erp-form-span">
              Offline slots use this studio address. Currency follows your selected country
              {form.currency ? ` (${form.currency})` : ''}.
            </p>
          </form>
        </ErpCard>
      )}

      {step === 'videos' && (
        <ErpCard className="stack">
          <h3 style={{ margin: 0 }}>Demo videos</h3>
          <p className="muted" style={{ margin: 0 }}>
            Students see these on your public profile. Upload a file or paste a YouTube embed URL.
          </p>
          <div className="erp-form-grid">
            <ErpInput
              label="Title"
              value={videoForm.title}
              onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))}
            />
            <ErpInput
              label="Video URL (optional if you upload a file)"
              value={videoForm.fileUrl}
              onChange={(e) => setVideoForm((f) => ({ ...f, fileUrl: e.target.value }))}
            />
            <div className="field">
              <label className="erp-label">Upload file</label>
              <input
                type="file"
                accept="video/*,.mp4,.webm"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <ErpButton variant="secondary" type="button" onClick={addVideo}>
            Add video
          </ErpButton>
          {(videos || []).map((v) => (
            <div key={v._id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                {v.title} · {v.kind}
              </span>
              <ErpButton
                variant="danger"
                type="button"
                onClick={async () => {
                  await deleteTutorVideo(v._id);
                  listTutorVideos().then(setVideos);
                }}
              >
                Remove
              </ErpButton>
            </div>
          ))}
        </ErpCard>
      )}

      <ErpStickyActions>
        {stepIndex > 0 && (
          <ErpButton variant="secondary" disabled={saving} onClick={() => goTo(steps[stepIndex - 1].id)}>
            Back
          </ErpButton>
        )}
        {step !== 'videos' && (
          <ErpButton
            variant="secondary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError('');
              try {
                await saveProfile();
                setMsg('Step saved');
              } catch (err) {
                setError(err.errors?.length ? err.errors.map((e) => e.message).join(', ') : err.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Saving…' : 'Save this step'}
          </ErpButton>
        )}
        {steps.length > 1 && !isLast && (
          <ErpButton disabled={saving} onClick={onContinue}>
            Continue
          </ErpButton>
        )}
        {(isLast && step !== 'videos') || steps.length === 1 ? (
          <ErpButton disabled={saving} onClick={onContinue}>
            {saving ? 'Saving…' : 'Save profile'}
          </ErpButton>
        ) : null}
      </ErpStickyActions>
    </div>
  );
}
