/** Shared option lists for student dropdowns */

import {
  LEVEL_OPTIONS,
  resourceTypeOptions,
  subjectOptions,
  titleCase,
} from '../admin/adminOptions';

export {
  LEVEL_OPTIONS,
  resourceTypeOptions,
  subjectOptions,
  titleCase,
};

export const LEVEL_FILTER_OPTIONS = [
  { value: '', label: 'Any level' },
  { value: 'HL', label: 'HL' },
  { value: 'SL', label: 'SL' },
];

export const AVAILABILITY_FILTER_OPTIONS = [
  { value: '', label: 'Any availability' },
  { value: 'true', label: 'Has free slots' },
];

export const RATING_OPTIONS = [
  { value: 5, label: '5 stars' },
  { value: 4, label: '4 stars' },
  { value: 3, label: '3 stars' },
  { value: 2, label: '2 stars' },
  { value: 1, label: '1 star' },
];

export function subjectFilterOptions(subjects = []) {
  return [{ value: '', label: 'All subjects' }, ...subjectOptions(subjects)];
}

export const MODE_FILTER_OPTIONS = [
  { value: '', label: 'Any mode' },
  { value: 'online', label: 'Online (Zoom)' },
  { value: 'offline', label: 'Offline (in person)' },
];

export const DELIVERY_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

export function isSlotBookable(slot) {
  if (!slot || slot.isBooked) return false;
  return new Date(slot.startAt).getTime() - Date.now() >= 12 * 60 * 60 * 1000;
}

export function slotOptions(slots = []) {
  return [
    { value: '', label: 'Select slot' },
    ...slots.map((s) => ({
      value: s._id,
      label: `${new Date(s.startAt).toLocaleString()} → ${new Date(s.endAt).toLocaleString()}${
        s.deliveryMode ? ` · ${s.deliveryMode}` : ''
      }${!isSlotBookable(s) && !s.isBooked ? ' (inside 12h)' : ''}`,
      disabled: s.isBooked || !isSlotBookable(s),
    })),
  ];
}
