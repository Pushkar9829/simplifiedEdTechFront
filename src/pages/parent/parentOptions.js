/** Shared option lists for parent dropdowns */

export { titleCase } from '../admin/adminOptions';

export const RELATIONSHIP_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
];

export function childOptions(links = []) {
  return links
    .map((c) => ({
      value: c.studentUserId?._id || c.studentUserId,
      label: c.studentUserId?.name || c.studentUserId?.phone || 'Student',
    }))
    .filter((o) => o.value);
}
