const idOf = (v) => (v && typeof v === 'object' ? v._id || v.id : v) || '';

/** Route a notification should open for the viewer's role, or null when there is no page for it. */
export function notificationPath(n, role) {
  if (!n || !role || role === 'admin') return null;
  const meta = n.meta || {};
  const base = `/${role}`;
  const assignmentId = idOf(meta.assignmentId);
  const projectId = idOf(meta.projectId);
  const child = role === 'parent' && meta.studentUserId ? `?child=${idOf(meta.studentUserId)}` : '';

  switch (n.type) {
    case 'booking':
    case 'attendance':
      return `${base}/bookings${child}`;
    case 'homework':
      if (role === 'student') return assignmentId ? `${base}/homework/${assignmentId}` : `${base}/homework`;
      if (role === 'tutor') return `${base}/homework`;
      return `${base}${child}`;
    case 'grade':
      if (role === 'student') return `${base}/progress`;
      if (role === 'tutor') return `${base}/homework`;
      return `${base}${child}`;
    case 'payment':
      return `${base}/payments${child}`;
    case 'project':
      if (role === 'tutor' && projectId) return `${base}/projects/${projectId}`;
      return `${base}/projects${child}`;
    case 'verification':
      return role === 'tutor' ? `${base}/verification` : null;
    case 'support':
      return `${base}/support`;
    case 'message':
      return `${base}/messages`;
    case 'academic':
      return role === 'parent' ? `${base}${child}` : null;
    default:
      return null;
  }
}
