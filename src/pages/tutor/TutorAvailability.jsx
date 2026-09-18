import { useEffect, useState } from 'react';
import {
  addAvailability,
  addOffering,
  deleteAvailability,
  listAvailability,
  listBoards,
  listClassLevels,
  listOfferings,
  listSubjects,
} from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpModal,
  ErpPageHeader,
  ErpSelect,
  ErpTabs,
  ErpToolbar,
} from '../../components/erp';
import { formatDate, money } from '../../utils/format';
import { DELIVERY_OPTIONS } from '../student/studentOptions';
import { LEVEL_OPTIONS, subjectOptions } from './tutorOptions';

export default function TutorAvailability() {
  const [tab, setTab] = useState('offerings');
  const [subjects, setSubjects] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [boards, setBoards] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [offering, setOffering] = useState({
    subjectId: '',
    level: 'HL',
    hourlyRate: 40,
    boardId: '',
    classLevelId: '',
  });
  const [slot, setSlot] = useState({
    startAt: '',
    endAt: '',
    timezone: 'Asia/Kolkata',
    deliveryMode: 'online',
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, o, a, b, l] = await Promise.all([
        listSubjects(),
        listOfferings(),
        listAvailability(),
        listBoards(),
        listClassLevels(),
      ]);
      const subjectList = s.items || [];
      setSubjects(subjectList);
      setOfferings(o || []);
      setSlots(a || []);
      setBoards(Array.isArray(b) ? b : b.items || []);
      setClassLevels(Array.isArray(l) ? l : l.items || []);
      if (subjectList[0]) {
        setOffering((f) => ({ ...f, subjectId: f.subjectId || subjectList[0]._id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveOffering = async (e) => {
    e.preventDefault();
    try {
      await addOffering({
        subjectId: offering.subjectId,
        level: offering.level,
        hourlyRate: Number(offering.hourlyRate),
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
    try {
      await addAvailability(slot);
      setMsg('Slot added');
      setSlot((f) => ({ ...f, startAt: '', endAt: '' }));
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Subjects you teach, then the times students can book." />
      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

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

      <ErpToolbar
        actions={
          <ErpButton onClick={() => setModalOpen(true)}>
            {tab === 'offerings' ? 'Add offering' : 'Add slot'}
          </ErpButton>
        }
      />

      {loading ? (
        <ErpCard>
          <div className="empty">Loading…</div>
        </ErpCard>
      ) : tab === 'offerings' ? (
        <ErpCard className="erp-card-flush">
          {!offerings.length ? (
            <div className="empty">No offerings yet. Add the subjects you teach.</div>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Level</th>
                    <th>Board</th>
                    <th>Class</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {offerings.map((o) => (
                    <tr key={o._id}>
                      <td>
                        <strong>{o.subjectId?.name || '—'}</strong>
                      </td>
                      <td>{o.level}</td>
                      <td>{o.boardId?.name || '—'}</td>
                      <td>{o.classLevelId?.name || '—'}</td>
                      <td>{money(o.hourlyRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
        </ErpCard>
      ) : (
        <ErpCard className="erp-card-flush">
          {!slots.length ? (
            <div className="empty">No slots yet. Add open times for booking.</div>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>Start</th>
                    <th>End</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s) => (
                    <tr key={s._id}>
                      <td>{formatDate(s.startAt)}</td>
                      <td>{formatDate(s.endAt)}</td>
                      <td>
                        <span
                          className={`erp-chip ${
                            s.deliveryMode === 'offline' ? 'erp-chip-offline' : 'erp-chip-online'
                          }`}
                        >
                          {s.deliveryMode || 'online'}
                        </span>
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
                          <ErpButton variant="danger" onClick={() => setPendingDelete(s)}>
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
        </ErpCard>
      )}

      <ErpModal
        open={modalOpen && tab === 'offerings'}
        title="Add offering"
        onClose={() => setModalOpen(false)}
      >
        <form className="erp-form-grid" onSubmit={saveOffering}>
          <ErpSelect
            label="Subject"
            value={offering.subjectId}
            options={
              subjects.length
                ? subjectOptions(subjects)
                : [{ value: '', label: 'No subjects', disabled: true }]
            }
            onChange={(e) => setOffering((f) => ({ ...f, subjectId: e.target.value }))}
          />
          <ErpSelect
            label="Level"
            value={offering.level}
            options={LEVEL_OPTIONS.filter((o) => o.value !== 'N/A')}
            onChange={(e) => setOffering((f) => ({ ...f, level: e.target.value }))}
          />
          <ErpSelect
            label="Board"
            value={offering.boardId}
            options={[
              { value: '', label: 'Optional board' },
              ...boards.map((x) => ({ value: x._id, label: x.name })),
            ]}
            onChange={(e) => setOffering((f) => ({ ...f, boardId: e.target.value }))}
          />
          <ErpSelect
            label="Class"
            value={offering.classLevelId}
            options={[
              { value: '', label: 'Optional class' },
              ...classLevels.map((x) => ({ value: x._id, label: x.name })),
            ]}
            onChange={(e) => setOffering((f) => ({ ...f, classLevelId: e.target.value }))}
          />
          <div className="field">
            <label>Hourly rate</label>
            <input
              className="erp-search"
              type="number"
              min="0"
              value={offering.hourlyRate}
              onChange={(e) => setOffering((f) => ({ ...f, hourlyRate: e.target.value }))}
            />
          </div>
          <div className="row erp-form-span">
            <ErpButton type="submit">Save offering</ErpButton>
            <ErpButton variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </ErpButton>
          </div>
        </form>
      </ErpModal>

      <ErpModal
        open={modalOpen && tab === 'slots'}
        title="Add slot"
        onClose={() => setModalOpen(false)}
      >
        <form className="erp-form-grid" onSubmit={saveSlot}>
          <div className="field">
            <label>Start</label>
            <input
              className="erp-search"
              type="datetime-local"
              value={slot.startAt}
              onChange={(e) => setSlot((f) => ({ ...f, startAt: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>End</label>
            <input
              className="erp-search"
              type="datetime-local"
              value={slot.endAt}
              onChange={(e) => setSlot((f) => ({ ...f, endAt: e.target.value }))}
            />
          </div>
          <ErpSelect
            label="Slot mode"
            value={slot.deliveryMode}
            options={DELIVERY_OPTIONS}
            onChange={(e) => setSlot((f) => ({ ...f, deliveryMode: e.target.value }))}
          />
          <div className="field">
            <label>Timezone</label>
            <input
              className="erp-search"
              value={slot.timezone}
              onChange={(e) => setSlot((f) => ({ ...f, timezone: e.target.value }))}
            />
          </div>
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
        title="Remove slot"
        message={
          pendingDelete ? `Remove ${formatDate(pendingDelete.startAt)}?` : ''
        }
        confirmLabel="Remove"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await deleteAvailability(pendingDelete._id);
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
