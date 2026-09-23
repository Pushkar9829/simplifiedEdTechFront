const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function mediaName(file) {
  if (!file) return '';
  if (typeof file === 'object') return file.name || String(file.url || '').split('/').pop() || 'file';
  return String(file).split('/').pop() || 'file';
}

/** Resolve stored media (S3 URL, /uploads/…, object, or bare filename) to a browser URL. */
export function mediaUrl(path) {
  if (!path) return null;
  if (typeof path === 'object') path = path.url || path.path || '';
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/uploads/')
    ? path
    : path.startsWith('/')
      ? path
      : `/uploads/${path}`;
  return `${API_URL}${normalized}`;
}
