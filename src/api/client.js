const API_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('ibdp_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('ibdp_token', token);
  else localStorage.removeItem('ibdp_token');
}

export const AUTH_EXPIRED_EVENT = 'auth:expired';

const ACCOUNT_BLOCKED = /account is (blocked|suspended|inactive)|blocked from the platform|invalid or inactive user/i;

function signalExpired(message) {
  setToken(null);
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { reason: message } }));
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const isForm = options.body instanceof FormData;
  const opts = { ...options, headers };
  if (!isForm && opts.body && typeof opts.body === 'object') {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, opts);
  } catch {
    const err = new Error('Could not reach the server. Check your connection and try again.');
    err.status = 0;
    err.errors = [];
    throw err;
  }
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = json.errors || [];
    const expired =
      res.status === 401 || (res.status === 403 && ACCOUNT_BLOCKED.test(json.message || ''));
    if (token && expired && token === getToken()) {
      signalExpired(
        res.status === 401 && !ACCOUNT_BLOCKED.test(json.message || '')
          ? 'Your session has expired. Please sign in again.'
          : err.message
      );
    }
    throw err;
  }

  return json.data;
}

export const apiGet = (path) => api(path);
export const apiPost = (path, body = {}) => api(path, { method: 'POST', body });
export const apiPatch = (path, body = {}) => api(path, { method: 'PATCH', body });
export const apiDelete = (path) => api(path, { method: 'DELETE' });
