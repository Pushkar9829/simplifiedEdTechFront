import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getMe,
  logoutApi,
  verifyOtp as verifyOtpApi,
  sendOtp as sendOtpApi,
  googleLoginApi,
} from '../api';
import { setToken } from '../api/client';

const AuthContext = createContext(null);

const ROLE_HOME = {
  student: '/student',
  tutor: '/tutor',
  parent: '/parent',
  admin: '/admin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('ibdp_token');
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await getMe();
      setUser(data.user);
      setProfile(data.profile);
      return data;
    } catch {
      setToken(null);
      setUser(null);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendOtp = async (phone) => sendOtpApi(phone);

  const login = async ({ phone, otp, role, name }) => {
    const data = await verifyOtpApi({ phone, otp, role, name });
    setToken(data.token);
    setUser(data.user);
    await refresh();
    return data.user;
  };

  const loginGoogle = useCallback(async ({ email, name, role }) => {
    const data = await googleLoginApi({ email, name, role });
    setToken(data.token);
    setUser(data.user);
    await refresh();
    return data.user;
  }, [refresh]);

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      sendOtp,
      login,
      loginGoogle,
      logout,
      refresh,
      homePath: user ? ROLE_HOME[user.role] || '/login' : '/login',
    }),
    [user, profile, loading, refresh, loginGoogle]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ROLE_HOME };
