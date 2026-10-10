import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMe,
  logoutApi,
  verifyOtp as verifyOtpApi,
  sendOtp as sendOtpApi,
  googleLoginApi,
} from '../api';
import { AUTH_EXPIRED_EVENT, setToken } from '../api/client';

const AuthContext = createContext(null);

const ROLE_HOME = {
  student: '/student',
  tutor: '/tutor',
  parent: '/parent',
  admin: '/admin',
};

export function homePathFor(role) {
  return ROLE_HOME[role] || '/login';
}

/** True when `path` lives under the role's area (used to honour deep links after login). */
export function pathBelongsToRole(path, role) {
  const home = ROLE_HOME[role];
  if (!home || !path) return false;
  return path === home || path.startsWith(`${home}/`) || path.startsWith(`${home}?`);
}

const isAuthFailure = (err) => err?.status === 401 || err?.status === 403;

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const loadMe = useCallback(async () => {
    const data = await getMe();
    setUser(data.user);
    setProfile(data.profile);
    setSessionError('');
    return data;
  }, []);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('ibdp_token');
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return null;
    }
    try {
      return await loadMe();
    } catch (err) {
      if (isAuthFailure(err)) {
        setToken(null);
        setUser(null);
        setProfile(null);
      } else {
        setSessionError(err.message || 'Could not load your session.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadMe]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onExpired = (e) => {
      setUser(null);
      setProfile(null);
      setSessionError('');
      const reason = e.detail?.reason;
      const { pathname, search } = window.location;
      const from = pathname.startsWith('/login') ? undefined : { pathname, search };
      navigate(`/login${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
        replace: true,
        state: from ? { from } : undefined,
      });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [navigate]);

  const sendOtp = useCallback(async (phone) => sendOtpApi(phone), []);

  const completeLogin = useCallback(
    async (data) => {
      setToken(data.token);
      try {
        const me = await loadMe();
        return me.user;
      } catch (err) {
        setToken(null);
        setUser(null);
        setProfile(null);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadMe]
  );

  const login = useCallback(
    async ({ phone, otp, role, name }) =>
      completeLogin(await verifyOtpApi({ phone, otp, role, name })),
    [completeLogin]
  );

  const loginGoogle = useCallback(
    async ({ email, name, role }) => completeLogin(await googleLoginApi({ email, name, role })),
    [completeLogin]
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      sessionError,
      sendOtp,
      login,
      loginGoogle,
      logout,
      refresh,
      homePath: user ? homePathFor(user.role) : '/login',
    }),
    [user, profile, loading, sessionError, sendOtp, login, loginGoogle, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ROLE_HOME };
