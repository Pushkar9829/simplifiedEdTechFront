import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationUnreadCount,
} from '../api';
import { useAuth } from './AuthContext';

const POLL_MS = 60 * 1000;
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const enabled = !!user && user.role !== 'admin';
  const [unread, setUnread] = useState(0);
  const seq = useRef(0);

  const refreshUnread = useCallback(async () => {
    if (!enabled) {
      setUnread(0);
      return 0;
    }
    const ticket = ++seq.current;
    try {
      const data = await notificationUnreadCount();
      const n = Number(data?.unread) || 0;
      if (ticket === seq.current) setUnread(n);
      return n;
    } catch {
      return null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnread(0);
      return undefined;
    }
    refreshUnread();
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') refreshUnread();
    }, POLL_MS);
    const onFocus = () => refreshUnread();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, user?.id, user?._id, refreshUnread]);

  const markRead = useCallback(
    async (id) => {
      const item = await markNotificationRead(id);
      seq.current += 1;
      setUnread((n) => Math.max(0, n - 1));
      refreshUnread();
      return item;
    },
    [refreshUnread]
  );

  const markAllRead = useCallback(async () => {
    const result = await markAllNotificationsRead();
    seq.current += 1;
    setUnread(0);
    return result;
  }, []);

  const value = useMemo(
    () => ({ unread, setUnread, refreshUnread, markRead, markAllRead }),
    [unread, refreshUnread, markRead, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

const FALLBACK = {
  unread: 0,
  setUnread: () => {},
  refreshUnread: async () => null,
  markRead: (id) => markNotificationRead(id),
  markAllRead: () => markAllNotificationsRead(),
};

export function useNotifications() {
  return useContext(NotificationContext) || FALLBACK;
}
