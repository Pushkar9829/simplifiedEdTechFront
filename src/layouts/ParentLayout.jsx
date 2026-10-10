import AppShell from '../components/AppShell';
import { ParentChildProvider } from '../context/ParentChildContext';
import '../pages/admin/AdminDense.css';

const links = [
  { to: '/parent', label: 'Dashboard', end: true, icon: 'layout-dashboard', group: 'Overview' },
  { to: '/parent/children', label: 'Children', icon: 'users', group: 'Overview' },
  { to: '/parent/tutors', label: 'Find tutors', icon: 'search', group: 'Learn' },
  { to: '/parent/courses', label: 'Courses', icon: 'book-open', group: 'Learn' },
  { to: '/parent/projects', label: 'Projects', icon: 'folder', group: 'Learn' },
  { to: '/parent/bookings', label: 'Bookings', icon: 'calendar', group: 'Schedule' },
  { to: '/parent/policy', label: 'Class policy', icon: 'shield-check', group: 'Schedule' },
  { to: '/parent/payments', label: 'Payments', icon: 'credit-card', group: 'Money' },
  { to: '/parent/wallet', label: 'Wallet', icon: 'wallet', group: 'Money' },
  { to: '/parent/messages', label: 'Messages', icon: 'message-square', group: 'Account' },
  { to: '/parent/notifications', label: 'Notifications', icon: 'bell', group: 'Account' },
  { to: '/parent/support', label: 'Support', icon: 'life-buoy', group: 'Account' },
  { to: '/parent/profile', label: 'Profile', icon: 'user', group: 'Account' },
];

const phoneNav = [
  { to: '/parent', label: 'Home', end: true, icon: 'home' },
  { to: '/parent/children', label: 'Children', icon: 'users' },
  { to: '/parent/bookings', label: 'Bookings', icon: 'calendar' },
  { to: '/parent/payments', label: 'Payments', icon: 'credit-card' },
];

export default function ParentLayout() {
  return (
    <ParentChildProvider>
      <AppShell title="Parent" links={links} phoneNav={phoneNav} dense />
    </ParentChildProvider>
  );
}
