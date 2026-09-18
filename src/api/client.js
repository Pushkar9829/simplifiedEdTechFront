const API_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('ibdp_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('ibdp_token', token);
  else localStorage.removeItem('ibdp_token');
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

  const res = await fetch(`${API_URL}${path}`, opts);
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = json.errors || [];
    throw err;
  }

  return json.data;
}

export const apiGet = (path) => api(path);
export const apiPost = (path, body = {}) => api(path, { method: 'POST', body });
export const apiPatch = (path, body = {}) => api(path, { method: 'PATCH', body });
export const apiDelete = (path) => api(path, { method: 'DELETE' });
