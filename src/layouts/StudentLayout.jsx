import { useEffect } from 'react';
import AppShell from '../components/AppShell';
import '../pages/admin/AdminDense.css';

const links = [
  { to: '/student', label: 'Dashboard', end: true, icon: 'layout-dashboard', group: 'Overview' },
  { to: '/student/subjects', label: 'Subjects', icon: 'layers', group: 'Learn' },
  { to: '/student/tutors', label: 'Find tutors', icon: 'search', group: 'Learn' },
  { to: '/student/courses', label: 'Courses', icon: 'book-open', group: 'Learn' },
  { to: '/student/projects', label: 'Projects', icon: 'folder', group: 'Learn' },
  { to: '/student/resources', label: 'Resources', icon: 'file-text', group: 'Learn' },
  { to: '/student/homework', label: 'Homework', icon: 'clipboard-check', group: 'Learn' },
  { to: '/student/progress', label: 'Progress', icon: 'trending-up', group: 'Learn' },
  { to: '/student/bookings', label: 'Bookings', icon: 'calendar', group: 'Schedule' },
  { to: '/student/policy', label: 'Class policy', icon: 'shield-check', group: 'Schedule' },
  { to: '/student/payments', label: 'Payments', icon: 'credit-card', group: 'Money' },
  { to: '/student/wallet', label: 'Wallet', icon: 'wallet', group: 'Money' },
  { to: '/student/messages', label: 'Messages', icon: 'message-square', group: 'Account' },
  { to: '/student/notifications', label: 'Notifications', icon: 'bell', group: 'Account' },
  { to: '/student/support', label: 'Support', icon: 'life-buoy', group: 'Account' },
  { to: '/student/profile', label: 'Profile', icon: 'user', group: 'Account' },
];

const phoneNav = [
  { to: '/student', label: 'Home', end: true, icon: 'home' },
  { to: '/student/bookings', label: 'Bookings', icon: 'calendar' },
  { to: '/student/homework', label: 'Homework', icon: 'clipboard-check' },
  { to: '/student/messages', label: 'Messages', icon: 'message-square' },
];

/** Body class so portalled UI (modals, drawers, select menus) also picks up the Bento theme. */
const BODY_CLASS = 'erp-theme-bento-body';

export default function StudentLayout() {
  useEffect(() => {
    document.body.classList.add(BODY_CLASS);
    return () => document.body.classList.remove(BODY_CLASS);
  }, []);

  return (
    <AppShell
      title="Student"
      links={links}
      phoneNav={phoneNav}
      className="erp-theme-bento"
      dense
    />
  );
}
