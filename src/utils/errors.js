/** Human-readable message for an API error, including field-level validation messages. */
export function errorMessage(err, fallback = 'Something went wrong') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  const fields = (err.errors || [])
    .map((e) => (typeof e === 'string' ? e : e?.message))
    .filter(Boolean);
  if (fields.length) return [...new Set(fields)].join(', ');
  if (err.status === 0 || err.name === 'TypeError') {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return err.message || fallback;
}
