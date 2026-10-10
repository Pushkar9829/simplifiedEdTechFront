import { useEffect, useMemo, useState } from 'react';
import {
  addAvailability,
  addOffering,
  deleteAvailability,
  deleteOffering,
  listAvailability,
  listBoards,
  listClassLevels,
  listCountries,
  listCurrencies,
  listOfferings,
  listSubjects,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpEmptyState,
  ErpInput,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSegmented,
  ErpSelect,
  ErpSkeleton,
  ErpStat,
  ErpTabs,
  Icon,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatInZone, money } from '../../utils/format';
import { useCatalog } from '../../context/CatalogContext';
import { browserTimezone, subjectOptions, timezoneOptions } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import './tutor.css';

function asList(x) {
  return Array.isArray(x) ? x : x?.items || [];
}

function inZone(value, timeZone, opts) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString(undefined, { ...opts, timeZone: timeZone || undefined });
  } catch {
    return d.toLocaleString(undefined, opts);
  }
}

const TIME = { hour: '2-digit', minute: '2-digit' };

function emptySlot(location, timezone) {
  return {
    startAt: '',
    endAt: '',
    timezone: timezone || browserTimezone(),
    deliveryMode: 'online',
    countryId: '',
    location: {
      label: '',
      city: location?.city || '',
      area: location?.area || '',
      address: location?.address || '',
    },
  };
}

export default function TutorAvailability() {
  const phone = useIsPhone();
  const { user, profile } = useAuth();
  const { options } = useCatalog();
  const LEVEL_OPTIONS = options('subject_level');
  const DELIVERY_OPTIONS = options('delivery_mode');
  const [tab, setTab] = useState('offerings');
  const [view, setView] = useState('list');
  const [modeFilter, setModeFilter] = useState('all');
  const [subjects, setSubjects] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [boards, setBoards] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [offering, setOffering] = useState({
    countryId: '',
    currency: '',
    subjectId: '',
    level: 'HL',
    onlineRate: '',
    offlineRate: '',
    boardId: '',
    classLevelId: '',
  });
  const [slot, setSlot] = useState(() => emptySlot(profile?.location, user?.timezone));
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const teachingMode = profile?.teachingMode || 'both';
  const allowsOnline = teachingMode !== 'offline';
  const allowsOffline = teachingMode !== 'online';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, o, a, c, cur] = await Promise.all([
        listSubjects(),
        listOfferings(),
        listAvailability(),
        listCountries(),
        listCurrencies(),
      ]);
      const subjectList = s.items || [];
      const countryList = asList(c);
      setSubjects(subjectList);
      setOfferings(o || []);
      setSlots(a || []);
      setCountries(countryList);
      setCurrencies(asList(cur));
      const home =
        countryList.find((x) => x.name.toLowerCase() === String(user?.country || '').toLowerCase()) ||
        countryList[0];
      setOffering((f) => ({
        ...f,
        subjectId: f.subjectId || subjectList[0]?._id || '',
        countryId: f.countryId || home?._id || '',
        currency: f.currency || home?.currency || profile?.currency || 'USD',
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const params = offering.countryId ? { countryId: offering.countryId } : {};
    Promise.all([listBoards(params), listClassLevels(params)])
      .then(([b, l]) => {
        setBoards(asList(b));
        setClassLevels(asList(l));
      })
      .catch((err) => setError(errorMessage(err)));
  }, [offering.countryId]);

  const selectedSlotCountry = countries.find((c) => c._id === slot.countryId);
  const zoneOptions = useMemo(
    () =>
      timezoneOptions([
        user?.timezone,
        browserTimezone(),
        ...(selectedSlotCountry?.timezones || []),
        selectedSlotCountry?.defaultTimezone,
      ]),
    [selectedSlotCountry, user?.timezone]
  );

  const onOfferingCountry = (countryId) => {
    const country = countries.find((c) => c._id === countryId);
    setOffering((f) => ({
      ...f,
      countryId,
      currency: country?.currency || f.currency,
      boardId: '',
      classLevelId: '',
    }));
  };

  const onSlotMode = (deliveryMode) => {
    setSlot((f) => ({
      ...f,
      deliveryMode,
      timezone:
        deliveryMode === 'online'
          ? browserTimezone()
          : countries.find((c) => c._id === f.countryId)?.defaultTimezone || f.timezone,
    }));
  };

  const onSlotCountry = (countryId) => {
    const country = countries.find((c) => c._id === countryId);
    setSlot((f) => ({ ...f, countryId, timezone: country?.defaultTimezone || f.timezone }));
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSlot((f) => ({
          ...f,
          timezone: browserTimezone(),
          location: { ...f.location, lat: pos.coords.latitude, lng: pos.coords.longitude },
        }));
        setLocating(false);
        setMsg('Location captured and timezone set from your device');
      },
      (err) => {
        setLocating(false);
        setError(errorMessage(err, 'Could not read your location'));
      }
    );
  };

  const saveOffering = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const online = allowsOnline ? Number(offering.onlineRate || 0) : 0;
      const offline = Number(offering.offlineRate || 0) || online;
      await addOffering({
        subjectId: offering.subjectId,
        level: offering.level,
        currency: offering.currency,
        hourlyRate: online || offline,
        ...(online > 0 ? { onlineRate: online } : {}),
        offlineRate: offline,
        ...(offering.countryId ? { countryId: offering.countryId } : {}),
        ...(offering.boardId ? { boardId: offering.boardId } : {}),
        ...(offering.classLevelId ? { classLevelId: offering.classLevelId } : {}),
      });
      setMsg('Offering saved');
      setModalOpen(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveSlot = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await addAvailability({
        startAt: slot.startAt,
        endAt: slot.endAt,
        timezone: slot.timezone,
        deliveryMode: slot.deliveryMode,
        ...(slot.countryId ? { countryId: slot.countryId } : {}),
        ...(slot.deliveryMode === 'offline' ? { location: slot.location } : {}),
      });
      setMsg('Slot added');
      setSlot((f) => ({ ...f, startAt: '', endAt: '' }));
      setModalOpen(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const currencyOptions = currencies.length
    ? currencies.map((c) => ({ value: c.code, label: `${c.code}${c.symbol ? ` (${c.symbol})` : ''}` }))
    : [{ value: offering.currency || 'USD', label: offering.currency || 'USD' }];

  const setLoc = (key) => (e) =>
    setSlot((f) => ({ ...f, location: { ...f.location, [key]: e.target.value } }));

  const modeSlots = useMemo(
    () => (modeFilter === 'all' ? slots : slots.filter((s) => (s.deliveryMode || 'online') === modeFilter)),
    [slots, modeFilter]
  );
  const offeringList = useListFilter(offerings, (o) =>
    [o.subjectId?.name, o.level, o.countryId?.name, o.boardId?.name, o.classLevelId?.name].filter(Boolean).join(' ')
  );
  const slotList = useListFilter(
    modeSlots,
    (s) =>
      [s.timezone, s.deliveryMode, s.isBooked ? 'booked' : 'open', s.location?.city, s.location?.area, s.location?.label]
        .filter(Boolean)
        .join(' '),
    { resetKey: modeFilter }
  );
  const list = tab === 'offerings' ? offeringList : slotList;
  const slotEvents = useMemo(
    () =>
      (slotList.filtered || []).map((s) => ({
        id: s._id,
        start: s.startAt,
        title: `${s.deliveryMode === 'offline' ? 'Offline' : 'Online'}${s.isBooked ? ' · booked' : ''}`,
        variant: s.isBooked ? 'cancelled' : s.deliveryMode === 'offline' ? 'offline' : 'online',
        slot: s,
      })),
    [slotList.filtered]
  );

  const modeTabs = [
    { value: 'all', label: 'All modes' },
    ...(allowsOnline ? [{ value: 'online', label: 'Online' }] : []),
    ...(allowsOffline ? [{ value: 'offline', label: 'Offline' }] : []),
  ];

  const nowMs = Date.now();
  const openSlots = slots.filter((s) => !s.isBooked && new Date(s.endAt || s.startAt).getTime() > nowMs);
  const bookedSlots = slots.filter((s) => s.isBooked && new Date(s.endAt || s.startAt).getTime() > nowMs);
  const nextOpen = [...openSlots].sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0];

  const dayGroups = (() => {
    const map = new Map();
    slotList.items.forEach((s) => {
      const key = inZone(s.startAt, s.timezone, { year: 'numeric', month: '2-digit', day: '2-digit' }) || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          key,
          dow: inZone(s.startAt, s.timezone, { weekday: 'short' }),
          day: inZone(s.startAt, s.timezone, { day: 'numeric' }),
          label: inZone(s.startAt, s.timezone, { weekday: 'long', day: 'numeric', month: 'long' }) || 'Unknown date',
          items: [],
        });
      }
      map.get(key).items.push(s);
    });
    return [...map.values()];
  })();

  const openAdd = () => {
    setSaving(false);
    if (tab === 'slots') {
      const next = emptySlot(profile?.location, user?.timezone);
      if (modeFilter === 'online' || modeFilter === 'offline') next.deliveryMode = modeFilter;
      setSlot(next);
    }
    setModalOpen(true);
  };

  const rateText = (o) => ({
    online: o.onlineRate || !o.offlineRate ? money(o.onlineRate || o.hourlyRate, o.currency) : '—',
    offline: money(o.offlineRate || o.hourlyRate, o.currency),
  });

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        subtitle="Set the subjects and prices you offer, then open the times students can book."
        actions={
          <ErpButton icon="plus" onClick={openAdd}>
            {tab === 'offerings' ? 'Add offering' : 'Add slot'}
          </ErpButton>
        }
      />
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

      <div className="erp-kpis">
        <ErpStat label="Subjects offered" value={loading ? '…' : offerings.length} icon="book-open" />
        <ErpStat
          label="Open slots"
          value={loading ? '…' : openSlots.length}
          hint="Upcoming and bookable"
          icon="calendar"
          tone="success"
        />
        <ErpStat
          label="Booked slots"
          value={loading ? '…' : bookedSlots.length}
          hint="Upcoming"
          icon="check-circle"
          tone="info"
        />
        <ErpStat
          label="Next open slot"
          value={
            <span className="tutor-stat-text">
              {nextOpen
                ? new Date(nextOpen.startAt).toLocaleString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </span>
          }
          hint={nextOpen ? (nextOpen.deliveryMode === 'offline' ? 'Offline' : 'Online') : 'Add a slot to get booked'}
          icon="clock"
          tone="neutral"
        />
      </div>

      <ErpTabs
        value={tab}
        onChange={(value) => {
          setTab(value);
          setModalOpen(false);
        }}
        tabs={[
          { value: 'offerings', label: 'Offerings', count: offerings.length, icon: 'book-open' },
          { value: 'slots', label: 'Time slots', count: slots.length, icon: 'calendar' },
        ]}
      />

      <div className="erp-filter-bar tutor-toolbar">
        <div className="tutor-toolbar-left">
          <ErpSearch
            value={list.search}
            onChange={list.setSearch}
            placeholder={tab === 'offerings' ? 'Search subject, board or country' : 'Search time zone, place or status'}
          />
        </div>
        {tab === 'slots' && (
          <div className="tutor-toolbar-right">
            {allowsOnline && allowsOffline && (
              <ErpSelect
                inline
                aria-label="Delivery mode"
                value={modeFilter}
                options={modeTabs}
                onChange={(e) => setModeFilter(e.target.value)}
              />
            )}
            <ErpSegmented
              aria-label="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'By day', icon: 'list-checks' },
                { value: 'calendar', label: 'Calendar', icon: 'calendar' },
              ]}
            />
          </div>
        )}
      </div>

      {loading ? (
        <ErpCard>
          <ErpSkeleton lines={4} />
        </ErpCard>
      ) : tab === 'offerings' ? (
        <ErpCard flush>
          {!offerings.length ? (
            <ErpEmptyState
              icon="book-open"
              title="No offerings yet"
              description="Add the subjects you teach with your hourly rates so students can find you."
              action={
                <ErpButton icon="plus" onClick={openAdd}>
                  Add offering
                </ErpButton>
              }
            />
          ) : offeringList.noMatch ? (
            <ErpEmptyState icon="search" title="No offerings match that search" />
          ) : phone ? (
            <ul className="tutor-booking-cards">
              {offeringList.items.map((o) => (
                <li key={o._id} className="tutor-booking-card">
                  <span className="tutor-booking-card-hit" style={{ cursor: 'default' }}>
                    <span className="erp-attention-icon is-brand">
                      <Icon name="book-open" size={16} />
                    </span>
                    <span className="tutor-booking-card-main">
                      <span className="tutor-booking-card-top">
                        <strong>{o.subjectId?.name || 'Subject'}</strong>
                        <ErpBadge>{o.level}</ErpBadge>
                      </span>
                      <span className="muted">
                        {[o.countryId?.name || 'Any country', o.boardId?.name, o.classLevelId?.name]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      <span className="tutor-chips text-erp-sm">
                        <span>
                          Online <strong className="num">{rateText(o).online}</strong>
                        </span>
                        <span className="muted">·</span>
                        <span>
                          Offline <strong className="num">{rateText(o).offline}</strong>
                        </span>
                      </span>
                    </span>
                  </span>
                  <ErpButton
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon="trash"
                    aria-label={`Remove ${o.subjectId?.name || 'offering'}`}
                    onClick={() => setPendingDelete({ kind: 'offering', item: o })}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Level</th>
                    <th>Country</th>
                    <th>Board</th>
                    <th>Class</th>
                    <th className="num">Online / hr</th>
                    <th className="num">Offline / hr</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {offeringList.items.map((o) => (
                    <tr key={o._id}>
                      <td>
                        <strong>{o.subjectId?.name || '—'}</strong>
                      </td>
                      <td>
                        <ErpBadge>{o.level}</ErpBadge>
                      </td>
                      <td>{o.countryId?.name || <span className="muted">Any</span>}</td>
                      <td>{o.boardId?.name || <span className="muted">—</span>}</td>
                      <td>{o.classLevelId?.name || <span className="muted">—</span>}</td>
                      <td className="num">{rateText(o).online}</td>
                      <td className="num">{rateText(o).offline}</td>
                      <td className="tutor-cell-actions">
                        <ErpButton
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon="trash"
                          aria-label={`Remove ${o.subjectId?.name || 'offering'}`}
                          onClick={() => setPendingDelete({ kind: 'offering', item: o })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
          {offeringList.total > 0 && <ErpPager {...offeringList.pagerProps} noun="offering" />}
        </ErpCard>
      ) : !slots.length ? (
        <ErpCard>
          <ErpEmptyState
            icon="calendar"
            title="No time slots yet"
            description="Open times when students can book you. Each slot becomes one bookable class."
            action={
              <ErpButton icon="plus" onClick={openAdd}>
                Add slot
              </ErpButton>
            }
          />
        </ErpCard>
      ) : !modeSlots.length ? (
        <ErpCard>
          <ErpEmptyState
            icon="filter"
            title={`No ${modeFilter} slots`}
            description="Switch the mode filter or add a slot in this mode."
            action={
              <ErpButton variant="secondary" onClick={() => setModeFilter('all')}>
                Show all modes
              </ErpButton>
            }
          />
        </ErpCard>
      ) : slotList.noMatch ? (
        <ErpCard>
          <ErpEmptyState icon="search" title="No slots match that search" />
        </ErpCard>
      ) : view === 'calendar' ? (
        <ErpCard>
          <p className="muted text-erp-sm" style={{ margin: '0 0 0.75rem' }}>
            Green = open, red = booked. Click an open slot to remove it.
          </p>
          <ErpCalendar
            events={slotEvents}
            onEventClick={(e) => {
              if (e.slot && !e.slot.isBooked) setPendingDelete({ kind: 'slot', item: e.slot });
            }}
          />
        </ErpCard>
      ) : (
        <div className="stack">
          {dayGroups.map((g) => (
            <ErpCard key={g.key} flush className="tutor-day-card">
              <div className="tutor-day-head">
                <span className="tutor-day-date">
                  <span className="tutor-day-dow">{g.dow || '—'}</span>
                  <span className="tutor-day-num">{g.day}</span>
                </span>
                <span className="tutor-mini-main">
                  <strong>{g.label}</strong>
                  <span className="muted">
                    {g.items.length} slot{g.items.length === 1 ? '' : 's'} ·{' '}
                    {g.items.filter((s) => !s.isBooked).length} open
                  </span>
                </span>
              </div>
              <ul className="tutor-slot-list">
                {g.items.map((s) => (
                  <li key={s._id} className={`tutor-slot${s.isBooked ? ' is-booked' : ''}`}>
                    <span className="tutor-slot-time erp-tabular">
                      {inZone(s.startAt, s.timezone, TIME)} – {inZone(s.endAt, s.timezone, TIME)}
                    </span>
                    <span className="tutor-slot-meta">
                      <span className={`erp-chip ${s.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'}`}>
                        <Icon name={s.deliveryMode === 'offline' ? 'map-pin' : 'video'} size={12} />
                        {s.deliveryMode === 'offline' ? 'Offline' : 'Online'}
                      </span>
                      <span className="muted text-erp-xs">
                        {s.timezone}
                        {inZone(s.startAt, s.timezone, TIME) !== inZone(s.startAt, undefined, TIME)
                          ? ` · your time ${formatInZone(s.startAt)}`
                          : ''}
                        {s.deliveryMode === 'offline' && s.location
                          ? ` · ${[s.location.label, s.location.area, s.location.city].filter(Boolean).join(', ')}`
                          : ''}
                      </span>
                    </span>
                    <span className="tutor-slot-end">
                      {s.isBooked ? (
                        <span className="erp-chip erp-chip-booked">Booked</span>
                      ) : (
                        <span className="erp-chip erp-chip-open">Open</span>
                      )}
                      {!s.isBooked ? (
                        <ErpButton
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon="trash"
                          aria-label="Remove slot"
                          onClick={() => setPendingDelete({ kind: 'slot', item: s })}
                        />
                      ) : (
                        <span className="tutor-slot-spacer" aria-hidden="true" />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </ErpCard>
          ))}
          {slotList.total > 0 && (
            <ErpCard size="sm" flush>
              <ErpPager {...slotList.pagerProps} noun="slot" />
            </ErpCard>
          )}
        </div>
      )}

      <ErpModal
        open={modalOpen && tab === 'offerings'}
        title="Add offering"
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <ErpButton variant="secondary" type="button" disabled={saving} onClick={() => setModalOpen(false)}>
              Cancel
            </ErpButton>
            <ErpButton type="submit" form="tutor-offering-form" loading={saving}>
              Save offering
            </ErpButton>
          </>
        }
      >
        <form id="tutor-offering-form" className="stack" style={{ gap: '1.25rem' }} onSubmit={saveOffering}>
          <section className="erp-form-section">
            <h4 className="erp-section-title">What you teach</h4>
            <div className="erp-form-grid">
              <ErpSelect
                label="Subject"
                value={offering.subjectId}
                options={
                  subjects.length ? subjectOptions(subjects) : [{ value: '', label: 'No subjects', disabled: true }]
                }
                onChange={(e) => setOffering((f) => ({ ...f, subjectId: e.target.value }))}
              />
              <ErpSelect
                label="Level"
                value={offering.level}
                options={LEVEL_OPTIONS}
                onChange={(e) => setOffering((f) => ({ ...f, level: e.target.value }))}
              />
            </div>
          </section>
          <section className="erp-form-section">
            <h4 className="erp-section-title">Where</h4>
            <div className="erp-form-grid">
              <ErpSelect
                label="Country"
                value={offering.countryId}
                options={[
                  { value: '', label: 'Any country' },
                  ...countries.map((c) => ({ value: c._id, label: c.name })),
                ]}
                onChange={(e) => onOfferingCountry(e.target.value)}
              />
              <ErpSelect
                label="Board"
                value={offering.boardId}
                options={[
                  { value: '', label: boards.length ? 'Any board' : 'No boards for this country' },
                  ...boards.map((x) => ({ value: x._id, label: x.name })),
                ]}
                onChange={(e) => setOffering((f) => ({ ...f, boardId: e.target.value }))}
              />
              <ErpSelect
                label="Class"
                value={offering.classLevelId}
                options={[
                  { value: '', label: classLevels.length ? 'Any class' : 'No classes for this country' },
                  ...classLevels.map((x) => ({ value: x._id, label: x.name })),
                ]}
                onChange={(e) => setOffering((f) => ({ ...f, classLevelId: e.target.value }))}
              />
            </div>
          </section>
          <section className="erp-form-section">
            <h4 className="erp-section-title">Price per hour</h4>
            <div className="erp-form-grid">
              <ErpSelect
                label="Currency"
                value={offering.currency}
                options={currencyOptions}
                onChange={(e) => setOffering((f) => ({ ...f, currency: e.target.value }))}
              />
              {allowsOnline && (
                <ErpInput
                  label={`Online rate (${offering.currency})`}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  required
                  value={offering.onlineRate}
                  onChange={(e) => setOffering((f) => ({ ...f, onlineRate: e.target.value }))}
                />
              )}
              {allowsOffline && (
                <ErpInput
                  label={`Offline rate (${offering.currency})`}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  required={!allowsOnline}
                  optional={allowsOnline}
                  helper={allowsOnline ? 'Leave empty to use the online rate' : undefined}
                  value={offering.offlineRate}
                  onChange={(e) => setOffering((f) => ({ ...f, offlineRate: e.target.value }))}
                />
              )}
            </div>
          </section>
        </form>
      </ErpModal>

      <ErpModal
        open={modalOpen && tab === 'slots'}
        title="Add time slot"
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <ErpButton variant="secondary" type="button" disabled={saving} onClick={() => setModalOpen(false)}>
              Cancel
            </ErpButton>
            <ErpButton type="submit" form="tutor-slot-form" loading={saving}>
              Add slot
            </ErpButton>
          </>
        }
      >
        <form id="tutor-slot-form" className="stack" style={{ gap: '1.25rem' }} onSubmit={saveSlot}>
          <section className="erp-form-section">
            <h4 className="erp-section-title">When</h4>
            <div className="erp-form-grid">
              {allowsOnline && allowsOffline ? (
                <div className="field erp-form-span">
                  <span className="erp-label">Mode</span>
                  <ErpSegmented
                    aria-label="Slot mode"
                    value={slot.deliveryMode}
                    onChange={onSlotMode}
                    options={DELIVERY_OPTIONS.filter((o) => (o.value === 'online' ? allowsOnline : allowsOffline)).map(
                      (o) => ({ ...o, icon: o.value === 'offline' ? 'map-pin' : 'video' })
                    )}
                  />
                </div>
              ) : (
                <ErpSelect
                  label="Slot mode"
                  value={slot.deliveryMode}
                  options={DELIVERY_OPTIONS.filter((o) => (o.value === 'online' ? allowsOnline : allowsOffline))}
                  onChange={(e) => onSlotMode(e.target.value)}
                />
              )}
              <ErpInput
                label="Start"
                type="datetime-local"
                required
                value={slot.startAt}
                onChange={(e) => setSlot((f) => ({ ...f, startAt: e.target.value }))}
              />
              <ErpInput
                label="End"
                type="datetime-local"
                required
                value={slot.endAt}
                onChange={(e) => setSlot((f) => ({ ...f, endAt: e.target.value }))}
              />
              <ErpSelect
                label="Country"
                value={slot.countryId}
                options={[
                  { value: '', label: 'Not specified' },
                  ...countries.map((c) => ({ value: c._id, label: c.name })),
                ]}
                onChange={(e) => onSlotCountry(e.target.value)}
              />
              <ErpSelect
                label="Time zone"
                helper="Start and end are read in this zone"
                value={slot.timezone}
                options={zoneOptions}
                onChange={(e) => setSlot((f) => ({ ...f, timezone: e.target.value }))}
              />
            </div>
          </section>
          {slot.deliveryMode === 'offline' && (
            <section className="erp-form-section">
              <h4 className="erp-section-title">
                Venue
                <ErpButton variant="ghost" size="sm" icon="map-pin" onClick={captureLocation} loading={locating}>
                  {locating ? 'Locating…' : 'Use my location'}
                </ErpButton>
              </h4>
              <div className="erp-form-grid">
                <ErpInput
                  label="Venue name"
                  optional
                  value={slot.location.label}
                  onChange={setLoc('label')}
                  placeholder="Learning studio, library…"
                />
                <ErpInput label="City" value={slot.location.city} onChange={setLoc('city')} />
                <ErpInput label="Area" value={slot.location.area} onChange={setLoc('area')} />
                <ErpInput label="Address" value={slot.location.address} onChange={setLoc('address')} />
                {slot.location.lat != null && (
                  <p className="muted text-erp-sm erp-form-span" style={{ margin: 0 }}>
                    Coordinates: {Number(slot.location.lat).toFixed(4)}, {Number(slot.location.lng).toFixed(4)}
                  </p>
                )}
              </div>
            </section>
          )}
          {slot.deliveryMode !== 'offline' && (
            <ErpButton
              variant="ghost"
              size="sm"
              icon="globe"
              style={{ alignSelf: 'flex-start' }}
              onClick={captureLocation}
              loading={locating}
            >
              {locating ? 'Locating…' : 'Set time zone from my device'}
            </ErpButton>
          )}
        </form>
      </ErpModal>

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title={pendingDelete?.kind === 'offering' ? 'Remove offering' : 'Remove slot'}
        message={
          pendingDelete?.kind === 'offering'
            ? `Remove ${pendingDelete.item.subjectId?.name || 'this offering'} (${pendingDelete.item.level})?`
            : pendingDelete
              ? `Remove ${formatInZone(pendingDelete.item.startAt, pendingDelete.item.timezone)}?`
              : ''
        }
        confirmLabel="Remove"
        danger
        busy={deleting}
        onCancel={() => !deleting && setPendingDelete(null)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            if (pendingDelete.kind === 'offering') await deleteOffering(pendingDelete.item._id);
            else await deleteAvailability(pendingDelete.item._id);
            setMsg(pendingDelete.kind === 'offering' ? 'Offering removed' : 'Slot removed');
            setPendingDelete(null);
            load();
          } catch (err) {
            setError(errorMessage(err));
            setPendingDelete(null);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
