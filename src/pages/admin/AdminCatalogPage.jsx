import { useEffect, useState } from 'react';
import {
  createBoard,
  createClassLevel,
  listBoards,
  listClassLevels,
  updateBoard,
  updateClassLevel,
} from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPageHeader,
  ErpTabs,
  ErpToolbar,
} from '../../components/erp';

export default function AdminCatalogPage() {
  const [tab, setTab] = useState('boards');
  const [boards, setBoards] = useState([]);
  const [levels, setLevels] = useState([]);
  const [boardName, setBoardName] = useState('');
  const [levelName, setLevelName] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [b, l] = await Promise.all([listBoards(), listClassLevels()]);
      setBoards(Array.isArray(b) ? b : b.items || []);
      setLevels(Array.isArray(l) ? l : l.items || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addBoard = async () => {
    setError('');
    try {
      await createBoard({ name: boardName });
      setBoardName('');
      setMsg('Board added');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addLevel = async () => {
    setError('');
    try {
      await createClassLevel({ name: levelName });
      setLevelName('');
      setMsg('Class level added');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      if (editing.kind === 'board') await updateBoard(editing._id, { name: editName });
      else await updateClassLevel(editing._id, { name: editName });
      setEditing(null);
      setMsg(editing.kind === 'board' ? 'Board updated' : 'Class level updated');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const rows = tab === 'boards' ? boards : levels;
  const addValue = tab === 'boards' ? boardName : levelName;
  const setAddValue = tab === 'boards' ? setBoardName : setLevelName;
  const placeholder = tab === 'boards' ? 'CBSE, ICSE, IBDP…' : 'DP1, Grade 10…';
  const onAdd = tab === 'boards' ? addBoard : addLevel;
  const addLabel = 'Add';

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Curriculum boards and class levels used on student profiles." />
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <ErpTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'boards', label: `Boards (${boards.length})` },
          { value: 'levels', label: `Class levels (${levels.length})` },
        ]}
      />

      <ErpToolbar
        actions={
          <ErpButton type="button" onClick={onAdd}>
            {addLabel}
          </ErpButton>
        }
      >
        <input
          className="erp-search"
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
          placeholder={placeholder}
        />
      </ErpToolbar>

      <ErpCard className="erp-card-flush">
        {!rows.length ? (
          <div className="empty">Nothing here yet.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row._id}
                    className="erp-row-click"
                    onClick={() => {
                      setEditing({ ...row, kind: tab === 'boards' ? 'board' : 'level' });
                      setEditName(row.name || '');
                    }}
                  >
                    <td>{row.name}</td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing({ ...row, kind: tab === 'boards' ? 'board' : 'level' });
                          setEditName(row.name || '');
                        }}
                      >
                        View
                      </ErpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
      </ErpCard>

      <ErpModal
        open={Boolean(editing)}
        title={editing?.kind === 'level' ? 'Edit class level' : 'Edit board'}
        size="sm"
        onClose={() => setEditing(null)}
        footer={
          <>
            <ErpButton variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </ErpButton>
            <ErpButton disabled={saving} onClick={saveEdit}>
              {saving ? 'Saving…' : 'Save'}
            </ErpButton>
          </>
        }
      >
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Name</label>
          <input
            className="erp-search"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>
      </ErpModal>
    </div>
  );
}
