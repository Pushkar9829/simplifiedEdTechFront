import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBoards, listClassLevels, listSubjects, searchTutors } from '../../api';
import {
  ErpButton,
  ErpModal,
  ErpPageHeader,
  ErpSelect,
  ErpToolbar,
} from '../../components/erp';
import { money } from '../../utils/format';
import {
  AVAILABILITY_FILTER_OPTIONS,
  LEVEL_FILTER_OPTIONS,
  MODE_FILTER_OPTIONS,
  subjectFilterOptions,
  titleCase,
} from './studentOptions';

const emptyFilters = {
  subjectId: '',
  level: '',
  language: '',
  country: '',
  minPrice: '',
  maxPrice: '',
  minRating: '',
  minExperience: '',
  available: '',
  mode: '',
  city: '',
  area: '',
  boardId: '',
  classLevelId: '',
};

export default function StudentTutors({ profileBase = '/student/tutors' }) {
  const [subjects, setSubjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [moreOpen, setMoreOpen] = useState(false);

  const load = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const data = await searchTutors(nextFilters);
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([listSubjects(), listBoards(), listClassLevels()])
      .then(([d, b, l]) => {
        setSubjects(d.items || []);
        setBoards(Array.isArray(b) ? b : b.items || []);
        setClassLevels(Array.isArray(l) ? l : l.items || []);
      })
      .catch(() => {});
    load();
  }, []);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Search verified tutors. Use mode to switch online (Zoom) or offline." />
      {error && <div className="error-banner">{error}</div>}

      <ErpToolbar
        actions={
          <>
            <ErpButton variant="secondary" type="button" onClick={() => setMoreOpen(true)}>
              More filters
            </ErpButton>
            <ErpButton
              variant="secondary"
              type="button"
              onClick={() => {
                setFilters(emptyFilters);
                load(emptyFilters);
              }}
            >
              Reset
            </ErpButton>
            <ErpButton type="button" onClick={() => load()}>
              Apply
            </ErpButton>
          </>
        }
      >
        <ErpSelect
          inline
          value={filters.subjectId}
          options={subjectFilterOptions(subjects)}
          onChange={set('subjectId')}
        />
        <ErpSelect
          inline
          value={filters.level}
          options={LEVEL_FILTER_OPTIONS}
          onChange={set('level')}
        />
        <ErpSelect
          inline
          value={filters.mode}
          options={MODE_FILTER_OPTIONS}
          onChange={set('mode')}
        />
      </ErpToolbar>

      <ErpModal
        open={moreOpen}
        title="More filters"
        onClose={() => setMoreOpen(false)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setMoreOpen(false)}>
              Close
            </ErpButton>
            <ErpButton
              onClick={() => {
                load();
                setMoreOpen(false);
              }}
            >
              Apply filters
            </ErpButton>
          </>
        }
      >
        <div className="erp-form-grid">
        <ErpSelect
          label="Board"
          value={filters.boardId}
          options={[
            { value: '', label: 'Any board' },
            ...boards.map((b) => ({ value: b._id, label: b.name })),
          ]}
          onChange={set('boardId')}
        />
        <ErpSelect
          label="Class"
          value={filters.classLevelId}
          options={[
            { value: '', label: 'Any class' },
            ...classLevels.map((c) => ({ value: c._id, label: c.name })),
          ]}
          onChange={set('classLevelId')}
        />
        <ErpSelect
          label="Availability"
          value={filters.available}
          options={AVAILABILITY_FILTER_OPTIONS}
          onChange={set('available')}
        />
        {filters.mode === 'offline' && (
          <>
            <div className="field">
              <label>City</label>
              <input className="erp-search" value={filters.city} onChange={set('city')} />
            </div>
            <div className="field">
              <label>Area</label>
              <input className="erp-search" value={filters.area} onChange={set('area')} />
            </div>
          </>
        )}
        <div className="field">
          <label>Language</label>
          <input className="erp-search" value={filters.language} onChange={set('language')} />
        </div>
        <div className="field">
          <label>Country</label>
          <input className="erp-search" value={filters.country} onChange={set('country')} />
        </div>
        <div className="field">
          <label>Min rating</label>
          <input
            className="erp-search"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={filters.minRating}
            onChange={set('minRating')}
          />
        </div>
        <div className="field">
          <label>Min price</label>
          <input
            className="erp-search"
            type="number"
            min="0"
            value={filters.minPrice}
            onChange={set('minPrice')}
          />
        </div>
        <div className="field">
          <label>Max price</label>
          <input
            className="erp-search"
            type="number"
            min="0"
            value={filters.maxPrice}
            onChange={set('maxPrice')}
          />
        </div>
        <div className="field">
          <label>Min experience (years)</label>
          <input
            className="erp-search"
            type="number"
            min="0"
            value={filters.minExperience}
            onChange={set('minExperience')}
          />
        </div>
        </div>
      </ErpModal>

      {loading ? (
        <div className="erp-card empty">Searching tutors…</div>
      ) : !items.length ? (
        <div className="erp-card empty">
          No tutors matched. Adjust filters or switch online / offline.
        </div>
      ) : (
        <div className="grid two">
          {items.map((item) => {
            const p = item.profile;
            const u = p.userId || {};
            const id = u._id || p.userId;
            return (
              <div key={id} className="erp-card stack">
                <div>
                  <h3 style={{ margin: 0 }}>{u.name || 'Tutor'}</h3>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {p.university || '—'} · {p.experienceYears || 0} yrs · ★ {p.ratingAvg} (
                    {p.ratingCount}) · {titleCase(p.teachingMode || 'both')}
                  </p>
                </div>
                <p>
                  <strong>{money(p.hourlyRateOnline || p.hourlyRate, p.currency)}</strong>
                  <span className="muted"> online</span>
                  {(p.hourlyRateOffline || p.hourlyRate) && (
                    <span className="muted">
                      {' '}
                      · {money(p.hourlyRateOffline || p.hourlyRate, p.currency)} offline
                    </span>
                  )}
                  {p.verificationStatus && (
                    <span className="muted"> · {titleCase(p.verificationStatus)}</span>
                  )}
                </p>
                <p className="muted">
                  {(item.subjects || [])
                    .map((s) => s.subjectId?.name)
                    .filter(Boolean)
                    .join(', ') || 'No subjects listed'}
                </p>
                <Link className="btn" to={`${profileBase}/${id}`}>
                  View profile
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
