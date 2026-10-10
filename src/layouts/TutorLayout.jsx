import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { homeworkStats } from '../api';
import '../pages/admin/AdminDense.css';

const baseLinks = [
  { to: '/tutor', label: 'Dashboard', end: true, icon: 'layout-dashboard', group: 'Overview' },
  { to: '/tutor/bookings', label: 'Bookings', icon: 'calendar', group: 'Teaching' },
  { to: '/tutor/availability', label: 'Availability', icon: 'clock', group: 'Teaching' },
  { to: '/tutor/students', label: 'Students', icon: 'users', group: 'Teaching' },
  { to: '/tutor/homework', label: 'Homework', icon: 'clipboard-check', group: 'Teaching' },
  { to: '/tutor/lesson-plans', label: 'Lesson plans', icon: 'list-checks', group: 'Teaching' },
  { to: '/tutor/courses', label: 'Courses', icon: 'book-open', group: 'Teaching' },
  { to: '/tutor/projects', label: 'Projects', icon: 'folder', group: 'Teaching' },
  { to: '/tutor/resources', label: 'Resources', icon: 'file-text', group: 'Teaching' },
  { to: '/tutor/earnings', label: 'Earnings', icon: 'bar-chart', group: 'Money' },
  { to: '/tutor/payments', label: 'Premium', icon: 'sparkles', group: 'Money' },
  { to: '/tutor/wallet', label: 'Wallet', icon: 'wallet', group: 'Money' },
  { to: '/tutor/verification', label: 'Verification', icon: 'shield-check', group: 'Account' },
  { to: '/tutor/messages', label: 'Messages', icon: 'message-square', group: 'Account' },
  { to: '/tutor/notifications', label: 'Notifications', icon: 'bell', group: 'Account' },
  { to: '/tutor/support', label: 'Support', icon: 'life-buoy', group: 'Account' },
  { to: '/tutor/profile', label: 'Profile', icon: 'user', group: 'Account' },
];

const phoneNav = [
  { to: '/tutor', label: 'Home', end: true, icon: 'home' },
  { to: '/tutor/bookings', label: 'Bookings', icon: 'calendar' },
  { to: '/tutor/messages', label: 'Messages', icon: 'message-square' },
  { to: '/tutor/wallet', label: 'Wallet', icon: 'wallet' },
];

export default function TutorLayout() {
  const [toGrade, setToGrade] = useState(0);
  const { pathname } = useLocation();

  // Refresh on navigation so the badge drops after grading.
  useEffect(() => {
    homeworkStats()
      .then((d) => setToGrade(d.toGrade || 0))
      .catch(() => {});
  }, [pathname]);

  // The phone "More" sheet is derived from these grouped links, so the
  // homework badge shows in both the sidebar and the sheet.
  const links = baseLinks.map((link) =>
    link.to === '/tutor/homework' && toGrade > 0 ? { ...link, badge: toGrade } : link
  );

  return <AppShell title="Tutor" links={links} phoneNav={phoneNav} dense />;
}
