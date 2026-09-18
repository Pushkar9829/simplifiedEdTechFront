import { useEffect, useState } from 'react';
import {
  addTutorVideo,
  deleteTutorVideo,
  listBoards,
  listClassLevels,
  listTutorVideos,
  updateMe,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ErpButton, ErpInput } from '../../components/erp';

export default function ProfilePage({ tutorFields = false }) {
  const { user, profile, refresh } = useAuth();
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [videos, setVideos] = useState([]);
  const [boards, setBoards] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [videoForm, setVideoForm] = useState({ title: 'Introduction', kind: 'intro', fileUrl: '' });
  const [videoFile, setVideoFile] = useState(null);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      timezone: user?.timezone || 'UTC',
      country: user?.country || '',
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
      teachingMode: profile?.teachingMode || 'both',
      city: profile?.location?.city || '',
      area: profile?.location?.area || '',
      address: profile?.location?.address || '',
      trialLessonAvailable: profile?.trialLessonAvailable ?? true,
    });
    if (user?.role === 'student') {
      Promise.all([listBoards(), listClassLevels()])
        .then(([b, l]) => {
          setBoards(Array.isArray(b) ? b : b.items || []);
          setClassLevels(Array.isArray(l) ? l : l.items || []);
        })
        .catch(() => {});
    }
    if (tutorFields) {
      listTutorVideos()
        .then(setVideos)
        .catch(() => {});
    }
  }, [user, profile, tutorFields]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
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
          languages: form.languages
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          bio: form.bio,
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
      setMsg('Profile saved');
    } catch (err) {
      setError(err.message);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="page stack">
      {isAdmin ? (
        <p className="erp-page-subtitle">Your administrator account details.</p>
      ) : (
        <h1>Profile</h1>
      )}
      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}
      <form className={isAdmin ? 'erp-card' : 'panel'} onSubmit={onSubmit}>
        <div className="grid two">
          {isAdmin ? (
            <>
              <ErpInput label="Name" value={form.name || ''} onChange={set('name')} />
              <ErpInput label="Email" value={form.email || ''} onChange={set('email')} />
              <ErpInput label="Timezone" value={form.timezone || ''} onChange={set('timezone')} />
              <ErpInput label="Country" value={form.country || ''} onChange={set('country')} />
              <ErpInput label="Avatar URL" value={form.avatar || ''} onChange={set('avatar')} />
            </>
          ) : (
            <>
          <div className="field">
            <label>Name</label>
            <input value={form.name || ''} onChange={set('name')} />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={form.email || ''} onChange={set('email')} />
          </div>
          <div className="field">
            <label>Timezone</label>
            <input value={form.timezone || ''} onChange={set('timezone')} />
          </div>
          <div className="field">
            <label>Country</label>
            <input value={form.country || ''} onChange={set('country')} />
          </div>
          <div className="field">
            <label>Avatar URL</label>
            <input value={form.avatar || ''} onChange={set('avatar')} />
          </div>
            </>
          )}
          {user?.role === 'student' && (
            <>
              <div className="field">
                <label>School</label>
                <input value={form.school || ''} onChange={set('school')} />
              </div>
              <div className="field">
                <label>Grade year</label>
                <input value={form.gradeYear || ''} onChange={set('gradeYear')} />
              </div>
              <div className="field">
                <label>Board</label>
                <select value={form.boardId || ''} onChange={set('boardId')}>
                  <option value="">Select board</option>
                  {boards.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Class level</label>
                <select value={form.classLevelId || ''} onChange={set('classLevelId')}>
                  <option value="">Select class</option>
                  {classLevels.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {tutorFields && (
            <>
              <div className="field">
                <label>Qualifications</label>
                <input value={form.qualifications || ''} onChange={set('qualifications')} />
              </div>
              <div className="field">
                <label>University</label>
                <input value={form.university || ''} onChange={set('university')} />
              </div>
              <div className="field">
                <label>Degree</label>
                <input value={form.degree || ''} onChange={set('degree')} />
              </div>
              <div className="field">
                <label>Experience (years)</label>
                <input
                  type="number"
                  value={form.experienceYears || 0}
                  onChange={set('experienceYears')}
                />
              </div>
              <div className="field">
                <label>Languages (comma separated)</label>
                <input value={form.languages || ''} onChange={set('languages')} />
              </div>
              <div className="field">
                <label>Teaching mode</label>
                <select value={form.teachingMode || 'both'} onChange={set('teachingMode')}>
                  <option value="both">Online and offline</option>
                  <option value="online">Online only</option>
                  <option value="offline">Offline only</option>
                </select>
              </div>
              <div className="field">
                <label>Online hourly rate</label>
                <input
                  type="number"
                  value={form.hourlyRateOnline || 0}
                  onChange={set('hourlyRateOnline')}
                />
              </div>
              <div className="field">
                <label>Offline hourly rate</label>
                <input
                  type="number"
                  value={form.hourlyRateOffline || 0}
                  onChange={set('hourlyRateOffline')}
                />
              </div>
              <div className="field">
                <label>City</label>
                <input value={form.city || ''} onChange={set('city')} />
              </div>
              <div className="field">
                <label>Area</label>
                <input value={form.area || ''} onChange={set('area')} />
              </div>
              <div className="field">
                <label>Studio / address</label>
                <input value={form.address || ''} onChange={set('address')} />
              </div>
              <div className="field">
                <label>Bio</label>
                <textarea value={form.bio || ''} onChange={set('bio')} />
              </div>
              <label className="row">
                <input
                  type="checkbox"
                  checked={!!form.trialLessonAvailable}
                  onChange={set('trialLessonAvailable')}
                />
                Trial lesson available
              </label>
            </>
          )}
        </div>
        {isAdmin ? <ErpButton type="submit">Save profile</ErpButton> : <button className="btn">Save profile</button>}
      </form>

      {tutorFields && (
        <section className="erp-card stack">
          <h2>Demo videos</h2>
          <p className="muted">Students see these on your public profile. Upload a file (S3) or paste a YouTube embed URL.</p>
          <div className="grid two">
            <div className="field">
              <label>Title</label>
              <input
                value={videoForm.title}
                onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Video URL (optional if you upload a file)</label>
              <input
                value={videoForm.fileUrl}
                onChange={(e) => setVideoForm((f) => ({ ...f, fileUrl: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Upload file</label>
              <input type="file" accept="video/*,.mp4,.webm" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <button
            className="btn secondary"
            type="button"
            onClick={async () => {
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
            }}
          >
            Add video
          </button>
          {(videos || []).map((v) => (
            <div key={v._id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                {v.title} · {v.kind}
              </span>
              <button
                className="btn danger"
                type="button"
                onClick={async () => {
                  await deleteTutorVideo(v._id);
                  listTutorVideos().then(setVideos);
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
