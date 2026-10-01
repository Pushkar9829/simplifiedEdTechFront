import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addFavoriteTutor,
  listBoards,
  listClassLevels,
  listCountries,
  listSubjects,
  removeFavoriteTutor,
  searchTutors,
} from '../../api';
import {
  ErpButton,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
} from '../../components/erp';
import { countryLine, formatPlace, money, tutorRef } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { useCatalog } from '../../context/CatalogContext';
import { AVAILABILITY_FILTER_OPTIONS, stateOptions, subjectFilterOptions } from './studentOptions';

const PAGE_SIZE = 12;

function refInitials(user) {
  const code = String(tutorRef(user) || '').replace('SCH-', '');
  return (code.slice(0, 2) || 'T').toUpperCase();
}

function subjectNames(item) {
  return (item.subjects || []).map((s) => s.subjectId?.name).filter(Boolean);
}

function modeChips(mode) {
  if (mode === 'online') return [{ label: 'Online', className: 'erp-chip erp-chip-online' }];
  if (mode === 'offline') return [{ label: 'Offline', className: 'erp-chip erp-chip-offline' }];
  return [
    { label: 'Online', className: 'erp-chip erp-chip-online' },
    { label: 'Offline', className: 'erp-chip erp-chip-offline' },
  ];
}

const emptyFilters = {
  search: '',
  subjectId: '',
  level: '',
  language: '',
  country: '',
  state: '',
  timeSlot: '',
  favorites: '',
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
  category: '',
};

export default function StudentTutors({ profileBase = '/student/tutors' }) {
  const { options } = useCatalog();
  const [subjects, setSubjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [countries, setCountries] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [moreOpen, setMoreOpen] = useState(false);

  const load = async (nextFilters = filters, nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const query = { ...nextFilters, page: nextPage, limit: PAGE_SIZE };
      if (query.mode !== 'offline') {
        delete query.country;
        delete query.state;
        delete query.city;
        delete query.area;
      }
      const data = await searchTutors(query);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([listSubjects(), listBoards(), listClassLevels(), listCountries()])
      .then(([d, b, l, c]) => {
        setSubjects(d.items || []);
        setBoards(Array.isArray(b) ? b : b.items || []);
        setClassLevels(Array.isArray(l) ? l : l.items || []);
        setCountries(Array.isArray(c) ? c : c.items || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
    load(filters, 1);
  }, [
    filters.mode,
    filters.favorites,
    filters.timeSlot,
    filters.subjectId,
    filters.level,
    filters.country,
    filters.state,
    filters.city,
    filters.area,
    filters.category,
  ]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Search verified tutors. Use mode to switch online (Zoom) or offline." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpSelect
          inline
          value={filters.mode || 'all'}
          options={options('delivery_mode', { all: 'All modes', allValue: 'all' })}
          onChange={(e) => {
            const value = e.target.value;
            setFilters((f) => ({
              ...f,
              mode: value === 'all' ? '' : value,
              ...(value !== 'offline' ? { country: '', state: '', city: '', area: '' } : {}),
            }));
          }}
        />
        <ErpSelect
          inline
          value={filters.category || 'all'}
          options={options('subject_category', { all: 'All classes', allValue: 'all' })}
          onChange={(e) => {
            const value = e.target.value;
            setFilters((f) => ({ ...f, category: value === 'all' ? '' : value, subjectId: '' }));
          }}
        />
        <ErpSearch
          value={filters.search}
          onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          placeholder="Search reference id"
        />
        <ErpSelect
          inline
          value={filters.subjectId}
          options={subjectFilterOptions(
            filters.category
              ? subjects.filter((s) => (s.category || 'ibdp') === filters.category)
              : subjects
          )}
          onChange={set('subjectId')}
        />
        <ErpSelect
          inline
          value={filters.level}
          options={options('subject_level', { all: 'Any level' })}
          onChange={set('level')}
        />
        <ErpSelect
          inline
          value={filters.timeSlot}
          options={options('time_slot', { all: 'Any time slot' })}
          onChange={set('timeSlot')}
        />
        <ErpSelect
          inline
          value={filters.favorites === 'true' ? 'fav' : 'all'}
          options={[
            { value: 'all', label: 'All tutors' },
            { value: 'fav', label: 'Favorites' },
          ]}
          onChange={(e) =>
            setFilters((f) => ({ ...f, favorites: e.target.value === 'fav' ? 'true' : '' }))
          }
        />
        {filters.mode === 'offline' && (
          <>
            <ErpSelect
              inline
              value={filters.country}
              options={[
                { value: '', label: 'Country' },
                ...countries.map((c) => ({ value: c.name, label: `${c.name} (${c.code})` })),
              ]}
              onChange={set('country')}
            />
            <ErpSelect
              inline
              value={filters.state}
              options={stateOptions(filters.country)}
              onChange={set('state')}
            />
            <input
              className="erp-search"
              placeholder="City"
              value={filters.city}
              onChange={set('city')}
            />
            <input
              className="erp-search"
              placeholder="Area"
              value={filters.area}
              onChange={set('area')}
            />
          </>
        )}
        <div className="avail-bar-actions">
          <ErpButton variant="secondary" type="button" onClick={() => setMoreOpen(true)}>
            More filters
          </ErpButton>
          <ErpButton
            variant="secondary"
            type="button"
            onClick={() => {
              setFilters(emptyFilters);
              setPage(1);
              load(emptyFilters, 1);
            }}
          >
            Reset
          </ErpButton>
          <ErpButton
            type="button"
            onClick={() => {
              setPage(1);
              load(filters, 1);
            }}
          >
            Apply
          </ErpButton>
        </div>
      </div>

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
            <ErpSelect
              label="Country"
              value={filters.country}
              options={[
                { value: '', label: 'Any country' },
                ...countries.map((c) => ({ value: c.name, label: `${c.name} (${c.code})` })),
              ]}
              onChange={set('country')}
            />
            <div className="field">
              <label>State</label>
              <input className="erp-search" value={filters.state} onChange={set('state')} />
            </div>
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
        <div className="tutor-card-grid">
          {items.map((item) => {
            const p = item.profile;
            const u = p.userId || {};
            const id = u._id || p.userId;
            const subjects = subjectNames(item);
            const extraSubjects = Math.max(0, subjects.length - 4);
            const avatar = mediaUrl(u.avatar);
            return (
              <article
                key={id}
                className={`erp-card tutor-card${p.isPremium ? ' tutor-card-premium' : ''}`}
              >
                <div className="tutor-card-top">
                  <div className="tutor-card-identity">
                    {avatar ? (
                      <img className="tutor-card-avatar-img" src={avatar} alt="" />
                    ) : (
                      <span className="tutor-card-avatar" aria-hidden>
                        {refInitials(u)}
                      </span>
                    )}
                    <div className="tutor-card-id">
                      <h3>
                        {tutorRef(u)}
                        {p.isPremium && <span className="erp-chip erp-chip-offline">Premium</span>}
                        {p.verificationStatus === 'approved' && (
                          <span className="erp-chip erp-chip-online">Verified</span>
                        )}
                      </h3>
                      <p className="muted">{countryLine(u.country, u.timezone, p.currency)}</p>
                      {filters.mode === 'offline' && (
                        <p className="muted">{formatPlace(p.location, u.country)}</p>
                      )}
                    </div>
                  </div>
                  <ErpButton
                    variant="secondary"
                    className={`tutor-card-fav${item.favorite ? ' is-on' : ''}`}
                    type="button"
                    aria-label={item.favorite ? 'Remove favorite' : 'Save favorite'}
                    onClick={async () => {
                      try {
                        if (item.favorite) await removeFavoriteTutor(id);
                        else await addFavoriteTutor(id);
                        load();
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  >
                    {item.favorite ? '★' : '☆'}
                  </ErpButton>
                </div>

                <div className="tutor-card-stats">
                  <span className="tutor-card-stat tutor-card-stat-rating">
                    ★ {Number(p.ratingAvg || 0).toFixed(1)}
                    <span className="muted">({p.ratingCount || 0})</span>
                  </span>
                  <span className="tutor-card-stat">{p.experienceYears || 0} yrs</span>
                  {modeChips(p.teachingMode).map((chip) => (
                    <span key={chip.label} className={chip.className}>
                      {chip.label}
                    </span>
                  ))}
                </div>

                <div className="tutor-card-subjects">
                  {subjects.length ? (
                    <>
                      {subjects.slice(0, 4).map((name) => (
                        <span key={name} className="tutor-card-subject" title={name}>
                          {name}
                        </span>
                      ))}
                      {extraSubjects > 0 && (
                        <span className="tutor-card-subject">+{extraSubjects} more</span>
                      )}
                    </>
                  ) : (
                    <span className="muted">No subjects listed</span>
                  )}
                </div>

                <div className="tutor-card-rates">
                  <div className="tutor-card-rate">
                    <strong>{money(p.hourlyRateOnline || p.hourlyRate, p.currency)}</strong>
                    <span>Online / hr</span>
                  </div>
                  <div className="tutor-card-rate">
                    <strong>{money(p.hourlyRateOffline || p.hourlyRate, p.currency)}</strong>
                    <span>Offline / hr</span>
                  </div>
                </div>

                <div className="tutor-card-foot">
                  <span className="muted">
                    {[p.university, p.qualifications].filter(Boolean).join(' · ') || 'IB tutor'}
                  </span>
                  <Link className="btn" to={`${profileBase}/${id}`}>
                    View profile
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {total > 0 && (
        <ErpPager
          page={page}
          pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          total={total}
          noun="tutor"
          onPrev={() => {
            const next = page - 1;
            setPage(next);
            load(filters, next);
          }}
          onNext={() => {
            const next = page + 1;
            setPage(next);
            load(filters, next);
          }}
        />
      )}
    </div>
  );
}
