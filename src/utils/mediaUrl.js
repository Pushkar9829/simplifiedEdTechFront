const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Resolve stored media (S3 URL, /uploads/…, or bare filename) to a browser URL. */
export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/uploads/')
    ? path
    : path.startsWith('/')
      ? path
      : `/uploads/${path}`;
  return `${API_URL}${normalized}`;
}
