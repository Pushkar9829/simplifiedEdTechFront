import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listTickets, updateTicket } from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpTabs,
  ErpTextarea,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { TICKET_STATUS_OPTIONS, TICKET_STATUS_SET_OPTIONS, titleCase } from './adminOptions';
import {
  AdminCell,
  AdminKV,
  AdminListState,
  AdminRowActions,
  AdminSection,
  AdminStatus,
  AdminSummary,
  AdminTableCard,
  AdminToolbar,
} from './AdminKit';
import { useAdminModalQuery } from './useAdminModalQuery';

/** Pseudo-status: open + in progress (client-side filter). */
const ACTIVE = 'active';
const ACTIVE_STATUSES = ['open', 'in_progress'];
const STATUS_VALUES = [ACTIVE, ...TICKET_STATUS_OPTIONS.map((o) => o.value).filter(Boolean)];

export default function AdminTicketsPage() {
  const [params] = useSearchParams();
  const { editId, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState(() =>
    STATUS_VALUES.includes(params.get('status')) ? params.get('status') : ACTIVE
  );
  const [draft, setDraft] = useState({ status: '', adminNote: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalMsg, setModalMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listTickets(status && status !== ACTIVE ? { status } : {});
      const rows = Array.isArray(data) ? data : data?.items || [];
      setItems(status === ACTIVE ? rows.filter((t) => ACTIVE_STATUSES.includes(t.status)) : rows);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const list = useListFilter(
    items,
    (t) => [t.subject, t.category, t.userId?.name, t.userId?.phone, t.status].filter(Boolean).join(' '),
    { resetKey: status }
  );
  const selected = items.find((t) => t._id === editId) || null;

  useEffect(() => {
    setModalError('');
    setModalMsg('');
    if (selected) setDraft({ status: selected.status, adminNote: selected.adminNote || '' });
    // seed the draft only when a different ticket opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, Boolean(selected)]);

  const dirty =
    selected && (draft.status !== selected.status || draft.adminNote !== (selected.adminNote || ''));

  const saveTicket = async () => {
    if (!selected) return;
    setSaving(true);
    setModalError('');
    setModalMsg('');
    try {
      const updated = await updateTicket(selected._id, {
        status: draft.status,
        adminNote: draft.adminNote,
      });
      const merged = {
        ...selected,
        status: updated?.status ?? draft.status,
        adminNote: updated?.adminNote ?? draft.adminNote,
        updatedAt: updated?.updatedAt ?? selected.updatedAt,
      };
      setItems((rows) => rows.map((t) => (t._id === merged._id ? merged : t)));
      setDraft({ status: merged.status, adminNote: merged.adminNote || '' });
      setModalMsg('Ticket saved. The user is notified when the status changes.');
    } catch (err) {
      setModalError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Questions and problems raised by students, parents and tutors. Users are notified when the status changes." />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}

      <AdminTableCard
        tabs={
          <ErpTabs
            value={status || 'all'}
            onChange={(value) => setStatus(value === 'all' ? '' : value)}
            tabs={[
              { value: ACTIVE, label: 'Needs reply' },
              ...TICKET_STATUS_OPTIONS.map((o) => ({
                value: o.value || 'all',
                label: o.value ? o.label : 'All',
              })),
            ]}
          />
        }
        toolbar={
          <AdminToolbar
            right={
              <>
                {!loading ? (
                  <span className="adm-result-count">
                    {list.total} ticket{list.total === 1 ? '' : 's'}
                  </span>
                ) : null}
                <ErpButton variant="ghost" size="sm" icon="refresh" onClick={load}>
                  Refresh
                </ErpButton>
              </>
            }
          >
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search subject, category or user" />
          </AdminToolbar>
        }
        footer={list.pages > 1 ? <ErpPager {...list.pagerProps} noun="ticket" /> : null}
      >
        {loading || !items.length || list.noMatch ? (
          <AdminListState
            loading={loading}
            empty={!items.length}
            noMatch={list.noMatch}
            emptyProps={{
              icon: status === ACTIVE ? 'check-circle' : 'life-buoy',
              title: status === ACTIVE ? 'No tickets need a reply' : 'No tickets in this view',
              description:
                status === ACTIVE
                  ? 'Open and in-progress tickets appear here.'
                  : 'Switch tabs to see tickets with another status.',
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Raised by</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((t) => (
                  <tr key={t._id} className="erp-row-click" onClick={() => openEdit(t._id)}>
                    <td className="adm-primary">
                      <AdminCell
                        title={t.subject}
                        tags={t.category ? <span className="erp-tag">{titleCase(t.category)}</span> : null}
                        sub={t.description || null}
                      />
                    </td>
                    <td data-label="Raised by">
                      <AdminCell
                        avatarName={t.userId?.name || t.userId?.phone || 'User'}
                        title={t.userId?.name || t.userId?.phone || '—'}
                        sub={t.userId?.role ? titleCase(t.userId.role) : null}
                      />
                    </td>
                    <td data-label="Status">
                      <AdminStatus status={t.status} />
                    </td>
                    <td data-label="Created" className="muted adm-nowrap">
                      {formatDate(t.createdAt)}
                    </td>
                    <AdminRowActions>
                      <ErpButton variant="ghost" size="sm" iconRight="chevron-right" onClick={() => openEdit(t._id)}>
                        Open
                      </ErpButton>
                    </AdminRowActions>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      <ErpModal
        open={Boolean(editId)}
        title="Support ticket"
        size="md"
        onClose={close}
        footer={
          selected ? (
            <>
              <ErpButton variant="secondary" onClick={close} disabled={saving}>
                Close
              </ErpButton>
              <ErpButton loading={saving} disabled={!dirty} onClick={saveTicket}>
                Save changes
              </ErpButton>
            </>
          ) : null
        }
      >
        {modalError && <ErpBanner variant="danger">{modalError}</ErpBanner>}
        {modalMsg && <ErpBanner variant="success">{modalMsg}</ErpBanner>}
        {!selected ? (
          loading ? (
            <AdminListState loading />
          ) : (
            <AdminListState
              empty
              emptyProps={{
                icon: 'life-buoy',
                title: 'Ticket not found',
                description: 'It may be listed under another status.',
              }}
            />
          )
        ) : (
          <>
            <AdminSummary
              eyebrow={selected.category ? titleCase(selected.category) : 'Ticket'}
              title={selected.subject}
              meta={`${selected.userId?.name || selected.userId?.phone || 'User'}${
                selected.userId?.role ? ` (${titleCase(selected.userId.role)})` : ''
              } · ${formatDate(selected.createdAt)}`}
              side={<AdminStatus status={selected.status} />}
            />
            <AdminSection title="Message">
              <p className="adm-note">{selected.description || 'No description provided.'}</p>
            </AdminSection>
            <AdminSection title="Contact">
              <AdminKV
                items={[
                  { label: 'Name', value: selected.userId?.name || '—' },
                  { label: 'Phone', value: selected.userId?.phone || '—' },
                ]}
              />
            </AdminSection>
            <AdminSection title="Response" description="The user is notified when the status changes.">
              <div className="stack" style={{ gap: '0.875rem' }}>
                <ErpSelect
                  label="Status"
                  value={draft.status}
                  options={TICKET_STATUS_SET_OPTIONS}
                  disabled={saving}
                  onChange={(e) => {
                    setModalMsg('');
                    setDraft((d) => ({ ...d, status: e.target.value }));
                  }}
                />
                <ErpTextarea
                  id="ticket-admin-note"
                  label="Admin note"
                  optional
                  rows={3}
                  value={draft.adminNote}
                  onChange={(e) => {
                    setModalMsg('');
                    setDraft((d) => ({ ...d, adminNote: e.target.value }));
                  }}
                />
              </div>
            </AdminSection>
          </>
        )}
      </ErpModal>
    </div>
  );
}
