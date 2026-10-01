import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listLookups } from '../api';

const CatalogContext = createContext(null);

const FALLBACK = {
  subject_category: [
    { value: 'ibdp', label: 'IBDP' },
    { value: 'hobby', label: 'Hobby / skill' },
    { value: 'skill', label: 'Professional skill' },
  ],
  subject_level: [
    { value: 'HL', label: 'HL' },
    { value: 'SL', label: 'SL' },
    { value: 'N/A', label: 'N/A' },
  ],
  resource_type: [
    { value: 'notes', label: 'Notes' },
    { value: 'question_bank', label: 'Question bank' },
    { value: 'past_paper', label: 'Past paper' },
    { value: 'markscheme', label: 'Markscheme' },
    { value: 'formula_sheet', label: 'Formula sheet' },
    { value: 'flashcards', label: 'Flashcards' },
    { value: 'mind_map', label: 'Mind map' },
    { value: 'practice_test', label: 'Practice test' },
  ],
  delivery_mode: [
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline' },
  ],
  time_slot: [
    { value: 'morning', label: 'Morning (6–12)' },
    { value: 'afternoon', label: 'Afternoon (12–17)' },
    { value: 'evening', label: 'Evening (17–22)' },
  ],
  relationship: [
    { value: 'parent', label: 'Parent' },
    { value: 'guardian', label: 'Guardian' },
    { value: 'other', label: 'Other' },
  ],
  billing_cycle: [
    { value: 'one_time', label: 'One time' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ],
  audience: [
    { value: 'all', label: 'All users' },
    { value: 'student', label: 'Students' },
    { value: 'tutor', label: 'Tutors' },
    { value: 'parent', label: 'Parents' },
    { value: 'admin', label: 'Admins' },
  ],
  campaign_channel: [
    { value: 'organic', label: 'Organic' },
    { value: 'paid_ads', label: 'Paid ads' },
    { value: 'email', label: 'Email' },
    { value: 'referral', label: 'Referral' },
    { value: 'social', label: 'Social' },
    { value: 'partner', label: 'Partner' },
    { value: 'other', label: 'Other' },
  ],
  language: [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
  ],
  ticket_category: [
    { value: 'general', label: 'General' },
    { value: 'booking', label: 'Booking' },
    { value: 'payment', label: 'Payment' },
  ],
  attendance: [
    { value: 'pending', label: 'Pending' },
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
  ],
  lesson_status: [
    { value: 'draft', label: 'Draft' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
  ],
  grading_scheme: [
    { value: 'ib_1_7', label: 'IB scale (1–7)' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'letter', label: 'Letter grade' },
    { value: 'pass_fail', label: 'Pass / fail' },
  ],
};

function toOptions(rows = []) {
  return rows
    .filter((row) => row.isActive !== false)
    .map((row) => ({ value: row.value, label: row.label }));
}

export function CatalogProvider({ children }) {
  const [byGroup, setByGroup] = useState({});
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await listLookups();
      const items = data?.items || [];
      const next = {};
      items.forEach((row) => {
        if (!next[row.group]) next[row.group] = [];
        next[row.group].push(row);
      });
      setByGroup(next);
      setGroups(data?.groups || []);
    } catch {
      setByGroup({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const options = useCallback(
    (group, extras = {}) => {
      const rows = byGroup[group]?.length ? toOptions(byGroup[group]) : FALLBACK[group] || [];
      if (extras.all) return [{ value: extras.allValue ?? '', label: extras.all }, ...rows];
      return rows;
    },
    [byGroup]
  );

  const labelFor = useCallback(
    (group, value) => options(group).find((o) => o.value === value)?.label || value || '',
    [options]
  );

  const value = useMemo(
    () => ({ byGroup, groups, loading, reload, options, labelFor }),
    [byGroup, groups, loading, reload, options, labelFor]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    return {
      byGroup: {},
      groups: [],
      loading: false,
      reload: async () => {},
      options: (group, extras = {}) => {
        const rows = FALLBACK[group] || [];
        return extras.all ? [{ value: extras.allValue ?? '', label: extras.all }, ...rows] : rows;
      },
      labelFor: (group, value) =>
        (FALLBACK[group] || []).find((o) => o.value === value)?.label || value || '',
    };
  }
  return ctx;
}
