const has = (v) => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');
const idOf = (v) => (v && typeof v === 'object' ? v._id : v);

/** Missing onboarding fields for the signed-in user (labels), empty when complete. */
export function missingProfileFields(user, profile) {
  if (!user) return [];
  const missing = [];
  if (!has(user.name)) missing.push('name');
  if (user.role === 'student') {
    if (!has(idOf(user.countryId))) missing.push('country');
    if (!has(idOf(profile?.boardId))) missing.push('board');
    if (!has(idOf(profile?.classLevelId))) missing.push('class level');
  }
  if (user.role === 'tutor') {
    const rates = [profile?.hourlyRate, profile?.hourlyRateOnline, profile?.hourlyRateOffline];
    if (!rates.some((r) => Number(r) > 0)) missing.push('hourly rate');
  }
  return missing;
}
