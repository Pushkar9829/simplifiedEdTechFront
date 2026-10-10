import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNotifications } from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpEmptyState,
  ErpLoadingState,
  ErpPageHeader,
  ErpPager,
  ErpSearch,
  ErpTabs,
  Icon,
} from '../../components/erp';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { notificationPath } from '../../utils/notificationRoute';
import { RowIcon } from './sharedUi';
import { groupByDay, timeOnly } from './sharedTime';
import './shared.css';
import './notifications.css';

const PAGE_SIZE = 30;

const TYPE_ICON = {
  booking: { icon: 'calendar', tone: 'brand' },
  attendance: { icon: 'clipboard-check', tone: 'info' },
  homework: { icon: 'file-text', tone: 'warning' },
  grade: { icon: 'award', tone: 'success' },
  payment: { icon: 'credit-card', tone: 'success' },
  credit: { icon: 'wallet', tone: 'success' },
  project: { icon: 'folder', tone: 'info' },
  verification: { icon: 'shield-check', tone: 'brand' },
  support: { icon: 'life-buoy', tone: 'info' },
  message: { icon: 'message-square', tone: 'brand' },
  academic: { icon: 'graduation-cap', tone: 'brand' },
  bank_account: { icon: 'wallet', tone: 'info' },
  vendor: { icon: 'users', tone: 'neutral' },
};

const typeLook = (t) => TYPE_ICON[t] || { icon: 'bell', tone: 'neutral' };

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { markRead, markAllRead, setUnread } = useNotifications();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [busyAll, setBusyAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listNotifications({ page: 1, limit: PAGE_SIZE });
      setItems(data.items || []);
      setTotal(data.total ?? (data.items || []).length);
      setPage(1);
      if (typeof data.unread === 'number') setUnread(data.unread);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [setUnread]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await listNotifications({ page: next, limit: PAGE_SIZE });
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n._id));
        return [...prev, ...(data.items || []).filter((n) => !seen.has(n._id))];
      });
      setTotal(data.total ?? total);
      setPage(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const markLocal = (id) =>
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));

  const onMarkRead = async (n) => {
    setBusyId(n._id);
    try {
      await markRead(n._id);
      markLocal(n._id);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusyId('');
    }
  };

  const onOpen = async (n) => {
    const path = notificationPath(n, user?.role);
    if (!n.isRead) {
      const ok = await onMarkRead(n);
      if (!ok && !path) return;
    }
    if (path) navigate(path);
  };

  const onMarkAll = async () => {
    setBusyAll(true);
    try {
      await markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyAll(false);
    }
  };

  const [tab, setTab] = useState('all');
  const visible = items.filter((n) => {
    if (tab === 'new') return !n.isRead;
    if (tab === 'read') return n.isRead;
    return true;
  });
  const list = useListFilter(
    visible,
    (n) => [n.title, n.body, n.isRead ? 'read' : 'new'].filter(Boolean).join(' '),
    { resetKey: tab, pageSize: 20 }
  );
  const unreadLoaded = items.filter((n) => !n.isRead).length;
  const groups = groupByDay(list.items, (n) => n.createdAt);

  const renderBody = () => {
    if (loading) return <ErpLoadingState message="Loading notifications…" />;
    if (!items.length) {
      return (
        <ErpEmptyState
          icon="bell"
          title="No notifications yet"
          description="Updates about bookings, payments, homework and messages will appear here."
        />
      );
    }
    if (!visible.length) {
      return (
        <ErpEmptyState
          icon={tab === 'new' ? 'check-circle' : 'inbox'}
          title={tab === 'new' ? "You're all caught up" : 'Nothing here'}
          description={tab === 'new' ? 'No unread notifications.' : 'No notifications in this view.'}
          action={
            <ErpButton variant="secondary" onClick={() => setTab('all')}>
              Show all
            </ErpButton>
          }
        />
      );
    }
    if (list.noMatch) {
      return <ErpEmptyState icon="search" title="No matches" description="No notifications match that search." />;
    }
    return groups.map((g) => (
      <section key={g.label} className="sp-notif-group" aria-label={g.label}>
        <h3 className="sp-notif-day">{g.label}</h3>
        <ul className="sp-notif-list">
          {g.items.map((n) => {
            const path = notificationPath(n, user?.role);
            const look = typeLook(n.type);
            const clickable = Boolean(path || !n.isRead);
            const content = (
              <>
                <RowIcon name={look.icon} tone={n.isRead ? 'neutral' : look.tone} />
                <span className="sp-notif-body">
                  <span className="sp-notif-title">{n.title}</span>
                  {n.body ? <span className="sp-notif-text">{n.body}</span> : null}
                  <span className="sp-notif-time" title={formatDate(n.createdAt)}>
                    {timeOnly(n.createdAt)}
                    {path ? (
                      <span className="sp-notif-open">
                        Open <Icon name="arrow-right" size={12} />
                      </span>
                    ) : null}
                  </span>
                </span>
              </>
            );
            return (
              <li key={n._id} className={`sp-notif${n.isRead ? '' : ' is-unread'}`}>
                {clickable ? (
                  <button type="button" className="sp-notif-hit" onClick={() => onOpen(n)}>
                    {content}
                  </button>
                ) : (
                  <div className="sp-notif-hit">{content}</div>
                )}
                <span className="sp-notif-side">
                  {!n.isRead ? (
                    <>
                      <span className="sp-unread-dot" aria-label="Unread" />
                      <ErpButton
                        variant="ghost"
                        size="sm"
                        icon="check"
                        className="sp-notif-mark"
                        loading={busyId === n._id}
                        onClick={() => onMarkRead(n)}
                      >
                        Mark read
                      </ErpButton>
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    ));
  };

  return (
    <div className="page sp-page sp-notif-page">
      <ErpPageHeader
        subtitle={
          unreadLoaded
            ? `You have ${unreadLoaded} unread notification${unreadLoaded === 1 ? '' : 's'}.`
            : 'Updates about your classes, payments and messages.'
        }
        actions={
          <ErpButton
            variant="secondary"
            icon="check-circle"
            loading={busyAll}
            disabled={busyAll || !unreadLoaded}
            onClick={onMarkAll}
          >
            {busyAll ? 'Marking…' : 'Mark all read'}
          </ErpButton>
        }
      />
      {error ? (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      ) : null}

      <div className="sp-notif-filters">
        <ErpTabs
          variant="segmented"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: 'All', count: total || items.length || null },
            { value: 'new', label: 'Unread', count: unreadLoaded || null },
            { value: 'read', label: 'Read' },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search notifications" />
      </div>

      <div className="sp-notif-card">
        {renderBody()}
        {list.total > 0 && list.pages > 1 && <ErpPager {...list.pagerProps} noun="notification" />}
      </div>

      {items.length < total && (
        <div className="sp-center-row">
          <ErpButton variant="secondary" icon="refresh" loading={loadingMore} onClick={loadMore}>
            {loadingMore ? 'Loading…' : `Load older notifications (${total - items.length} more)`}
          </ErpButton>
        </div>
      )}
    </div>
  );
}
