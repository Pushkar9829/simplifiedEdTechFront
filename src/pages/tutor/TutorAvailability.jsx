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
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpModal,
  ErpList,
  ErpListItem,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpTabs,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatInZone, money } from '../../utils/format';
import { DELIVERY_OPTIONS } from '../student/studentOptions';
import { browserTimezone, LEVEL_OPTIONS, subjectOptions, timezoneOptions } from './tutorOptions';

function asList(x) {
  return Array.isArray(x) ? x : x?.items || [];
}

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
      setError(err.message);
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
      .catch((err) => setError(err.message));
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
        setError(err.message || 'Could not read your location');
      }
    );
  };

  const saveOffering = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const online = Number(offering.onlineRate || 0);
      await addOffering({
        subjectId: offering.subjectId,
        level: offering.level,
        currency: offering.currency,
        hourlyRate: online || Number(offering.offlineRate || 0),
        onlineRate: online,
        offlineRate: Number(offering.offlineRate || offering.onlineRate || 0),
        ...(offering.countryId ? { countryId: offering.countryId } : {}),
        ...(offering.boardId ? { boardId: offering.boardId } : {}),
        ...(offering.classLevelId ? { classLevelId: offering.classLevelId } : {}),
      });
      setMsg('Offering saved');
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveSlot = async (e) => {
    e.preventDefault();
    setError('');
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
      setError(err.errors?.length ? err.errors.map((x) => x.message).join(', ') : err.message);
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
    { value: 'all', label: 'All' },
    ...(allowsOnline ? [{ value: 'online', label: 'Online' }] : []),
    ...(allowsOffline ? [{ value: 'offline', label: 'Offline' }] : []),
  ];

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Subjects and prices you offer per country, then the times students can book." />
      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={(value) => {
            setTab(value);
            setModalOpen(false);
          }}
          tabs={[
            { value: 'offerings', label: `Offerings (${offerings.length})` },
            { value: 'slots', label: `Slots (${slots.length})` },
          ]}
        />
        <ErpSearch
          value={list.search}
          onChange={list.setSearch}
          placeholder={tab === 'offerings' ? 'Search offerings' : 'Search slots'}
        />
        {tab === 'slots' && (
          <>
            <ErpTabs
              value={view}
              onChange={setView}
              tabs={[
                { value: 'list', label: 'List' },
                { value: 'calendar', label: 'Calendar' },
              ]}
            />
            {allowsOnline && allowsOffline && (
              <ErpTabs value={modeFilter} onChange={setModeFilter} tabs={modeTabs} />
            )}
          </>
        )}
        <div className="avail-bar-actions">
          <ErpButton
            onClick={() => {
              if (tab === 'slots') {
                const next = emptySlot(profile?.location, user?.timezone);
                if (modeFilter === 'online' || modeFilter === 'offline') next.deliveryMode = modeFilter;
                setSlot(next);
              }
              setModalOpen(true);
            }}
          >
            {tab === 'offerings' ? 'Add offering' : 'Add slot'}
          </ErpButton>
        </div>
      </div>

      {loading ? (
        <ErpCard>
          <div className="empty">Loading…</div>
        </ErpCard>
      ) : tab === 'offerings' ? (
        <ErpCard className="erp-card-flush">
          {!offerings.length ? (
            <div className="empty">No offerings yet. Add the subjects you teach.</div>
          ) : offeringList.noMatch ? (
            <div className="empty">No offerings match that search.</div>
          ) : phone ? (
            <div style={{ padding: '0.65rem' }}>
              <ErpList>
                {offeringList.items.map((o) => (
                  <ErpListItem
                    key={o._id}
                    title={o.subjectId?.name || 'Subject'}
                    meta={`${o.level} · ${o.countryId?.name || 'Any country'}`}
                    actions={
                      <ErpButton variant="danger" onClick={() => setPendingDelete({ kind: 'offering', item: o })}>
                        Remove
                      </ErpButton>
                    }
                  >
                    <div className="muted" style={{ marginTop: '0.25rem' }}>
                      Online {money(o.onlineRate || o.hourlyRate, o.currency)}
                      {' · '}
                      Offline {money(o.offlineRate || o.hourlyRate, o.currency)}
                    </div>
                  </ErpListItem>
                ))}
              </ErpList>
            </div>
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
                    <th>Online / hr</th>
                    <th>Offline / hr</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {offeringList.items.map((o) => (
                    <tr key={o._id}>
                      <td>
                        <strong>{o.subjectId?.name || '—'}</strong>
                      </td>
                      <td>{o.level}</td>
                      <td>{o.countryId?.name || 'Any'}</td>
                      <td>{o.boardId?.name || '—'}</td>
                      <td>{o.classLevelId?.name || '—'}</td>
                      <td>{money(o.onlineRate || o.hourlyRate, o.currency)}</td>
                      <td>{money(o.offlineRate || o.hourlyRate, o.currency)}</td>
                      <td>
                        <ErpButton variant="danger" onClick={() => setPendingDelete({ kind: 'offering', item: o })}>
                          Remove
                        </ErpButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
          {offeringList.total > 0 && <ErpPager {...offeringList.pagerProps} noun="offering" />}
        </ErpCard>
      ) : (
        <ErpCard className="erp-card-flush">
          {!slots.length ? (
            <div className="empty">No slots yet. Add open times for booking.</div>
          ) : !modeSlots.length ? (
            <div className="empty">No {modeFilter} slots. Switch the online / offline toggle.</div>
          ) : slotList.noMatch ? (
            <div className="empty">No slots match that search.</div>
          ) : view === 'calendar' ? (
            <ErpCalendar
              events={slotEvents}
              onEventClick={(e) => {
                if (e.slot && !e.slot.isBooked) setPendingDelete({ kind: 'slot', item: e.slot });
              }}
            />
          ) : phone ? (
            <div style={{ padding: '0.65rem' }}>
              <ErpList>
                {slotList.items.map((s) => (
                  <ErpListItem
                    key={s._id}
                    title={formatInZone(s.startAt, s.timezone)}
                    meta={`${s.timezone} · until ${formatInZone(s.endAt, s.timezone)}`}
                    status={s.isBooked ? 'cancelled' : 'open'}
                    statusLabel={s.isBooked ? 'booked' : 'open'}
                    actions={
                      !s.isBooked ? (
                        <ErpButton variant="danger" onClick={() => setPendingDelete({ kind: 'slot', item: s })}>
                          Remove
                        </ErpButton>
                      ) : null
                    }
                  >
                    <div className="muted" style={{ marginTop: '0.25rem' }}>
                      {s.deliveryMode === 'offline' ? 'Offline' : 'Online'}
                      {s.deliveryMode === 'offline' && s.location
                        ? ` · ${[s.location.label, s.location.area, s.location.city].filter(Boolean).join(', ')}`
                        : ''}
                    </div>
                  </ErpListItem>
                ))}
              </ErpList>
            </div>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>Start (slot timezone)</th>
                    <th>End</th>
                    <th>Timezone</th>
                    <th>Your local time</th>
                    <th>Mode / location</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {slotList.items.map((s) => (
                    <tr key={s._id}>
                      <td>{formatInZone(s.startAt, s.timezone)}</td>
                      <td>{formatInZone(s.endAt, s.timezone)}</td>
                      <td>{s.timezone}</td>
                      <td className="muted">{formatInZone(s.startAt)}</td>
                      <td>
                        <span
                          className={`erp-chip ${
                            s.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'
                          }`}
                        >
                          {s.deliveryMode || 'online'}
                        </span>
                        {s.deliveryMode === 'offline' && s.location && (
                          <div className="muted">
                            {[s.location.label, s.location.area, s.location.city].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </td>
                      <td>
                        {s.isBooked ? (
                          <span className="erp-chip erp-chip-booked">booked</span>
                        ) : (
                          <span className="erp-chip erp-chip-open">open</span>
                        )}
                      </td>
                      <td>
                        {!s.isBooked && (
                          <ErpButton variant="danger" onClick={() => setPendingDelete({ kind: 'slot', item: s })}>
                            Remove
                          </ErpButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
          {view === 'list' && slotList.total > 0 && <ErpPager {...slotList.pagerProps} noun="slot" />}
        </ErpCard>
      )}

      <ErpModal open={modalOpen && tab === 'offerings'} title="Add offering" onClose={() => setModalOpen(false)}>
        <form className="erp-form-grid" onSubmit={saveOffering}>
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
            label="Currency"
            value={offering.currency}
            options={currencyOptions}
            onChange={(e) => setOffering((f) => ({ ...f, currency: e.target.value }))}
          />
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
          {allowsOnline && (
            <div className="field">
              <label>Online rate per hour ({offering.currency})</label>
              <input
                className="erp-search"
                type="number"
                min="0"
                step="0.01"
                required
                value={offering.onlineRate}
                onChange={(e) => setOffering((f) => ({ ...f, onlineRate: e.target.value }))}
              />
            </div>
          )}
          {allowsOffline && (
            <div className="field">
              <label>Offline rate per hour ({offering.currency})</label>
              <input
                className="erp-search"
                type="number"
                min="0"
                step="0.01"
                required={!allowsOnline}
                value={offering.offlineRate}
                onChange={(e) => setOffering((f) => ({ ...f, offlineRate: e.target.value }))}
              />
            </div>
          )}
          <div className="row erp-form-span">
            <ErpButton type="submit">Save offering</ErpButton>
            <ErpButton variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </ErpButton>
          </div>
        </form>
      </ErpModal>

      <ErpModal open={modalOpen && tab === 'slots'} title="Add slot" onClose={() => setModalOpen(false)}>
        <form className="erp-form-grid" onSubmit={saveSlot}>
          <ErpSelect
            label="Slot mode"
            value={slot.deliveryMode}
            options={DELIVERY_OPTIONS.filter((o) => (o.value === 'online' ? allowsOnline : allowsOffline))}
            onChange={(e) => onSlotMode(e.target.value)}
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
          <div className="field">
            <label>Start ({slot.timezone})</label>
            <input
              className="erp-search"
              type="datetime-local"
              required
              value={slot.startAt}
              onChange={(e) => setSlot((f) => ({ ...f, startAt: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>End ({slot.timezone})</label>
            <input
              className="erp-search"
              type="datetime-local"
              required
              value={slot.endAt}
              onChange={(e) => setSlot((f) => ({ ...f, endAt: e.target.value }))}
            />
          </div>
          <ErpSelect
            label="Timezone"
            value={slot.timezone}
            options={zoneOptions}
            onChange={(e) => setSlot((f) => ({ ...f, timezone: e.target.value }))}
          />
          <div className="field">
            <label>&nbsp;</label>
            <ErpButton variant="secondary" onClick={captureLocation} disabled={locating}>
              {locating ? 'Locating…' : 'Use my current location'}
            </ErpButton>
          </div>
          {slot.deliveryMode === 'offline' && (
            <>
              <div className="field">
                <label>Venue name</label>
                <input
                  className="erp-search"
                  value={slot.location.label}
                  onChange={setLoc('label')}
                  placeholder="Learning studio, library…"
                />
              </div>
              <div className="field">
                <label>City</label>
                <input className="erp-search" value={slot.location.city} onChange={setLoc('city')} />
              </div>
              <div className="field">
                <label>Area</label>
                <input className="erp-search" value={slot.location.area} onChange={setLoc('area')} />
              </div>
              <div className="field">
                <label>Address</label>
                <input className="erp-search" value={slot.location.address} onChange={setLoc('address')} />
              </div>
              {slot.location.lat != null && (
                <div className="muted erp-form-span">
                  Coordinates: {Number(slot.location.lat).toFixed(4)}, {Number(slot.location.lng).toFixed(4)}
                </div>
              )}
            </>
          )}
          <div className="row erp-form-span">
            <ErpButton type="submit">Add slot</ErpButton>
            <ErpButton variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </ErpButton>
          </div>
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
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            if (pendingDelete.kind === 'offering') await deleteOffering(pendingDelete.item._id);
            else await deleteAvailability(pendingDelete.item._id);
            setPendingDelete(null);
            load();
          } catch (err) {
            setError(err.message);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
