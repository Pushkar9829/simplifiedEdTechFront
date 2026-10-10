import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  ErpBanner,
  ErpButton,
  ErpEmptyState,
  ErpInput,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSegmented,
  ErpSelect,
  ErpSkeleton,
  Icon,
} from '../../components/erp';
import { formatPlace, money, tutorRef } from '../../utils/format';
import { errorMessage } from '../../utils/errors';
import { mediaUrl } from '../../utils/mediaUrl';
import { useCatalog } from '../../context/CatalogContext';
import { AVAILABILITY_FILTER_OPTIONS, stateOptions, subjectFilterOptions } from './studentOptions';
import { FavButton, LinkButton, Rating } from './studentUi';
import './student.css';

const PAGE_SIZE = 12;

function refInitials(user) {
  const code = String(tutorRef(user) || '').replace('SCH-', '');
  return (code.slice(0, 2) || 'T').toUpperCase();
}

function subjectNames(item) {
  return (item.subjects || []).map((s) => s.subjectId?.name).filter(Boolean);
}

function teachesOnline(mode) {
  return !mode || mode === 'online' || mode === 'both';
}

function teachesOffline(mode) {
  return mode === 'offline' || mode === 'both';
}

/** Lowest hourly rate across the modes the tutor teaches. */
function fromRate(p) {
  const rates = [];
  if (teachesOnline(p.teachingMode)) rates.push(Number(p.hourlyRateOnline || p.hourlyRate || 0));
  if (teachesOffline(p.teachingMode)) rates.push(Number(p.hourlyRateOffline || p.hourlyRate || 0));
  const positive = rates.filter((r) => r > 0);
  return positive.length ? Math.min(...positive) : 0;
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
  needBased: '',
};

const FILTER_KEYS = Object.keys(emptyFilters);
// Filters that live in the "More filters" sheet (the bar holds search, mode, subject, level).
const SHEET_KEYS = [
  'category',
  'timeSlot',
  'favorites',
  'needBased',
  'boardId',
  'classLevelId',
  'available',
  'country',
  'state',
  'city',
  'area',
  'language',
  'minRating',
  'minPrice',
  'maxPrice',
  'minExperience',
];

function filtersFromParams(params) {
  const next = { ...emptyFilters };
  FILTER_KEYS.forEach((k) => {
    next[k] = params.get(k) || '';
  });
  return next;
}

function TutorCardSkeleton() {
  return (
    <div className="erp-card st-tutor-card" aria-hidden="true">
      <div className="st-tutor-card-body">
        <div className="st-tutor-head">
          <ErpSkeleton width="48px" height="48px" radius="999px" />
          <div className="stack" style={{ gap: '0.5rem', flex: 1 }}>
            <ErpSkeleton width="55%" height="0.9rem" />
            <ErpSkeleton width="80%" height="0.75rem" />
          </div>
        </div>
        <ErpSkeleton lines={2} />
      </div>
      <div className="st-tutor-foot">
        <ErpSkeleton width="5rem" height="1.5rem" />
        <ErpSkeleton width="6rem" height="2rem" />
      </div>
    </div>
  );
}

export default function StudentTutors({ profileBase = '/student/tutors' }) {
  const { options, labelFor } = useCatalog();
  const isParent = profileBase.startsWith('/parent');
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsKey = searchParams.toString();
  const applied = useMemo(() => filtersFromParams(new URLSearchParams(paramsKey)), [paramsKey]);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [subjects, setSubjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [countries, setCountries] = useState([]);
  const [filters, setFilters] = useState(applied);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [favBusy, setFavBusy] = useState('');

  const [moreOpen, setMoreOpen] = useState(false);

  const apply = (nextFilters, nextPage = 1) => {
    setSearchParams((prev) => {
      const out = new URLSearchParams();
      if (prev.get('child')) out.set('child', prev.get('child'));
      FILTER_KEYS.forEach((k) => {
        if (nextFilters[k]) out.set(k, nextFilters[k]);
      });
      if (nextPage > 1) out.set('page', String(nextPage));
      return out;
    });
  };

  const setInstant = (patch) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    apply(next, 1);
  };

  useEffect(() => {
    setFilters(applied);
  }, [applied]);

  const load = async (nextFilters = applied, nextPage = page) => {
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
      setError(errorMessage(err));
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
    load(applied, page);
  }, [paramsKey]);

  /** Sheet fields only update the draft; the bar's dropdowns apply immediately. */
  const setDraft = (key) => (e) => {
    const value = e.target.value;
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const toggleFavorite = async (item, id) => {
    setError('');
    setFavBusy(String(id));
    try {
      if (item.favorite) await removeFavoriteTutor(id);
      else await addFavoriteTutor(id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setFavBusy('');
    }
  };

  const subjectName = (id) => subjects.find((s) => String(s._id) === String(id))?.name || 'Subject';
  const chipLabel = (k, v) => {
    switch (k) {
      case 'search':
        return `“${v}”`;
      case 'subjectId':
        return subjectName(v);
      case 'mode':
        return labelFor('delivery_mode', v);
      case 'category':
        return labelFor('subject_category', v);
      case 'level':
        return `Level ${v}`;
      case 'timeSlot':
        return labelFor('time_slot', v);
      case 'favorites':
        return 'Favourites';
      case 'needBased':
        return 'Need-based classes';
      case 'available':
        return 'Has free slots';
      case 'boardId':
        return boards.find((b) => String(b._id) === String(v))?.name || 'Board';
      case 'classLevelId':
        return classLevels.find((c) => String(c._id) === String(v))?.name || 'Class';
      case 'minRating':
        return `Rating ${v}+`;
      case 'minPrice':
        return `Min ${v}/hr`;
      case 'maxPrice':
        return `Max ${v}/hr`;
      case 'minExperience':
        return `${v}+ yrs`;
      case 'language':
        return `Speaks ${v}`;
      default:
        return v;
    }
  };

  const activeKeys = FILTER_KEYS.filter((k) => {
    if (!applied[k]) return false;
    if (['country', 'state', 'city', 'area'].includes(k) && applied.mode !== 'offline') return false;
    return true;
  });
  const sheetCount = SHEET_KEYS.filter((k) => activeKeys.includes(k)).length;
  const removeFilter = (k) => {
    const next = { ...applied, [k]: '' };
    if (k === 'mode') Object.assign(next, { country: '', state: '', city: '', area: '' });
    if (k === 'category') next.subjectId = '';
    setFilters(next);
    apply(next, 1);
  };
  const resetAll = () => {
    setFilters(emptyFilters);
    apply(emptyFilters, 1);
  };

  const subjectList = filters.category
    ? subjects.filter((s) => (s.category || 'ibdp') === filters.category)
    : subjects;

  return (
    <div className="page stack st-page">
      <ErpPageHeader
        subtitle={
          isParent
            ? 'Compare verified IB tutors for your child. Open a profile to see open slots and book.'
            : 'Compare verified IB tutors, check their open slots, and book a class.'
        }
      />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      <div className="stack" style={{ gap: '0.75rem' }}>
        <form
          className="st-filter-bar"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            apply(filters, 1);
          }}
        >
          <ErpSearch
            value={filters.search}
            onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
            placeholder="Search by tutor ID, e.g. SCH-9D4"
            enterKeyHint="search"
          />
          <ErpSegmented
            aria-label="Class mode"
            value={filters.mode || 'all'}
            options={[
              { value: 'all', label: 'All' },
              ...options('delivery_mode').map((o) => ({
                value: o.value,
                label: o.label,
                icon: o.value === 'offline' ? 'map-pin' : 'video',
              })),
            ]}
            onChange={(value) =>
              setInstant({
                mode: value === 'all' ? '' : value,
                ...(value !== 'offline' ? { country: '', state: '', city: '', area: '' } : {}),
              })
            }
          />
          <ErpSelect
            inline
            aria-label="Subject"
            value={filters.subjectId}
            options={subjectFilterOptions(subjectList)}
            onChange={(e) => setInstant({ subjectId: e.target.value })}
          />
          <ErpSelect
            inline
            aria-label="Level"
            value={filters.level}
            options={options('subject_level', { all: 'Any level' })}
            onChange={(e) => setInstant({ level: e.target.value })}
          />
          <div className="st-filter-bar-end">
            <ErpButton variant="secondary" icon="filter" onClick={() => setMoreOpen(true)}>
              Filters
              {sheetCount ? <span className="st-filter-count">{sheetCount}</span> : null}
            </ErpButton>
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </div>
        </form>

        <div className="st-results-meta">
          <span>
            {loading ? 'Searching…' : `${total} tutor${total === 1 ? '' : 's'} found`}
            {applied.mode === 'offline' ? ' · in-person classes' : ''}
          </span>
          {activeKeys.length > 0 && (
            <div className="st-active-filters">
              {activeKeys.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="st-active-chip"
                  onClick={() => removeFilter(k)}
                  aria-label={`Remove filter ${chipLabel(k, applied[k])}`}
                >
                  {chipLabel(k, applied[k])}
                  <Icon name="x" size={13} />
                </button>
              ))}
              <ErpButton variant="ghost" size="sm" onClick={resetAll}>
                Clear all
              </ErpButton>
            </div>
          )}
        </div>
      </div>

      <ErpModal
        open={moreOpen}
        title="Filters"
        onClose={() => setMoreOpen(false)}
        footer={
          <>
            <ErpButton
              variant="ghost"
              onClick={() => {
                const cleared = { ...filters };
                SHEET_KEYS.forEach((k) => {
                  cleared[k] = '';
                });
                setFilters(cleared);
              }}
            >
              Clear these
            </ErpButton>
            <ErpButton variant="secondary" onClick={() => setMoreOpen(false)}>
              Cancel
            </ErpButton>
            <ErpButton
              onClick={() => {
                apply(filters, 1);
                setMoreOpen(false);
              }}
            >
              Show tutors
            </ErpButton>
          </>
        }
      >
        <div className="erp-form-section">
          <p className="erp-section-title">What you need</p>
          <div className="erp-form-grid">
            <ErpSelect
              label="Class type"
              value={filters.category}
              options={options('subject_category', { all: 'All classes' })}
              onChange={(e) => {
                const value = e.target.value;
                setFilters((f) => ({ ...f, category: value, subjectId: '' }));
              }}
            />
            <ErpSelect
              label="Board"
              value={filters.boardId}
              options={[{ value: '', label: 'Any board' }, ...boards.map((b) => ({ value: b._id, label: b.name }))]}
              onChange={setDraft('boardId')}
            />
            <ErpSelect
              label="Class"
              value={filters.classLevelId}
              options={[{ value: '', label: 'Any class' }, ...classLevels.map((c) => ({ value: c._id, label: c.name }))]}
              onChange={setDraft('classLevelId')}
            />
            <ErpInput label="Language" value={filters.language} onChange={setDraft('language')} placeholder="e.g. English" />
          </div>
        </div>

        <div className="erp-form-section">
          <p className="erp-section-title">Schedule</p>
          <div className="erp-form-grid">
            <ErpSelect
              label="Time of day"
              value={filters.timeSlot}
              options={options('time_slot', { all: 'Any time slot' })}
              onChange={setDraft('timeSlot')}
            />
            <ErpSelect
              label="Availability"
              value={filters.available}
              options={AVAILABILITY_FILTER_OPTIONS}
              onChange={setDraft('available')}
            />
            <ErpSelect
              label="Class plan"
              value={filters.needBased}
              options={[
                { value: '', label: 'Any plan' },
                { value: 'true', label: 'Need-based (single classes)' },
              ]}
              onChange={setDraft('needBased')}
            />
            <ErpSelect
              label="Show"
              value={filters.favorites}
              options={[
                { value: '', label: 'All tutors' },
                { value: 'true', label: 'My favourites' },
              ]}
              onChange={setDraft('favorites')}
            />
          </div>
        </div>

        <div className="erp-form-section">
          <p className="erp-section-title">Price, rating & experience</p>
          <div className="erp-form-grid">
            <ErpInput label="Min price / hr" type="number" min="0" value={filters.minPrice} onChange={setDraft('minPrice')} />
            <ErpInput label="Max price / hr" type="number" min="0" value={filters.maxPrice} onChange={setDraft('maxPrice')} />
            <ErpInput
              label="Min rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={filters.minRating}
              onChange={setDraft('minRating')}
              helper="0 to 5"
            />
            <ErpInput
              label="Min experience (years)"
              type="number"
              min="0"
              value={filters.minExperience}
              onChange={setDraft('minExperience')}
            />
          </div>
        </div>

        <div className="erp-form-section">
          <p className="erp-section-title">In-person location</p>
          {filters.mode === 'offline' ? (
            <div className="erp-form-grid">
              <ErpSelect
                label="Country"
                value={filters.country}
                options={[
                  { value: '', label: 'Any country' },
                  ...countries.map((c) => ({ value: c.name, label: `${c.name} (${c.code})` })),
                ]}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters((f) => ({ ...f, country: value, state: '' }));
                }}
              />
              {stateOptions(filters.country).length > 1 ? (
                <ErpSelect label="State" value={filters.state} options={stateOptions(filters.country)} onChange={setDraft('state')} />
              ) : (
                <ErpInput label="State" value={filters.state} onChange={setDraft('state')} />
              )}
              <ErpInput label="City" value={filters.city} onChange={setDraft('city')} />
              <ErpInput label="Area" value={filters.area} onChange={setDraft('area')} />
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Choose <strong>Offline</strong> in the mode switch to filter in-person tutors by location.
            </p>
          )}
        </div>
      </ErpModal>

      {loading ? (
        <div className="st-tutor-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TutorCardSkeleton key={i} />
          ))}
        </div>
      ) : !items.length ? (
        <div className="erp-card">
          <ErpEmptyState
            icon="search"
            title="No tutors match these filters"
            description={
              activeKeys.length
                ? 'Try removing a filter or switching between online and offline.'
                : 'No verified tutors are listed yet. Check back soon.'
            }
            action={
              activeKeys.length ? (
                <ErpButton variant="secondary" onClick={resetAll}>
                  Clear all filters
                </ErpButton>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="st-tutor-grid">
          {items.map((item) => {
            const p = item.profile;
            const u = p.userId || {};
            const id = u._id || p.userId;
            const names = subjectNames(item);
            const extraSubjects = Math.max(0, names.length - 3);
            const avatar = mediaUrl(u.avatar);
            const rate = fromRate(p);
            const profileTo = `${profileBase}/${id}`;
            return (
              <article key={id} className="erp-card st-tutor-card">
                <div className="st-tutor-card-body">
                  <div className="st-tutor-head">
                    {avatar ? (
                      <img className="erp-avatar erp-avatar-lg erp-avatar-img" src={avatar} alt="" />
                    ) : (
                      <span className="erp-avatar erp-avatar-lg" aria-hidden="true">
                        {refInitials(u)}
                      </span>
                    )}
                    <div className="st-tutor-id">
                      <h3 className="st-tutor-name">
                        <Link to={profileTo}>{tutorRef(u)}</Link>
                      </h3>
                      <p className="st-tutor-sub" title={[p.qualifications, p.university].filter(Boolean).join(' · ')}>
                        {[p.qualifications, p.university].filter(Boolean).join(' · ') || 'IB tutor'}
                      </p>
                    </div>
                    <FavButton
                      on={item.favorite}
                      disabled={favBusy === String(id)}
                      onClick={() => toggleFavorite(item, id)}
                    />
                  </div>

                  {(p.verificationStatus === 'approved' || p.isPremium || p.needBasedClasses === false) && (
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
                      {p.needBasedClasses === false && <span className="erp-chip">Regular students only</span>}
                    </div>
                  )}

                  <div className="st-tutor-facts">
                    <Rating value={p.ratingAvg} count={p.ratingCount || 0} />
                    <span>
                      <Icon name="award" size={14} />
                      {p.experienceYears || 0} yrs
                    </span>
                    {u.country ? (
                      <span>
                        <Icon name="globe" size={14} />
                        {u.country}
                      </span>
                    ) : null}
                    {applied.mode === 'offline' ? (
                      <span>
                        <Icon name="map-pin" size={14} />
                        {formatPlace(p.location, u.country)}
                      </span>
                    ) : null}
                  </div>

                  <div className="st-subjects">
                    {names.length ? (
                      <>
                        {names.slice(0, 3).map((name, i) => (
                          <span key={`${name}-${i}`} className="erp-tag" title={name}>
                            {name}
                          </span>
                        ))}
                        {extraSubjects > 0 && (
                          <span className="erp-tag" title={names.slice(3).join(', ')}>
                            +{extraSubjects}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="muted">No subjects listed yet</span>
                    )}
                  </div>
                </div>

                <div className="st-tutor-foot">
                  <div className="st-price">
                    <span className="st-price-label">
                      {[teachesOnline(p.teachingMode) && 'Online', teachesOffline(p.teachingMode) && 'Offline']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <span className="st-price-value">
                      {rate ? (
                        <>
                          <small>from </small>
                          {money(rate, p.currency)}
                          <small> /hr</small>
                        </>
                      ) : (
                        <small>Rate on request</small>
                      )}
                    </span>
                  </div>
                  <LinkButton to={profileTo} variant="secondary" size="sm" iconRight="arrow-right">
                    View profile
                  </LinkButton>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {total > 0 && (
        <div className="erp-card erp-card-flush">
          <ErpPager
            page={page}
            pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            total={total}
            noun="tutor"
            onPrev={() => apply(applied, Math.max(1, page - 1))}
            onNext={() => apply(applied, page + 1)}
          />
        </div>
      )}
    </div>
  );
}
