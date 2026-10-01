import AppShell from '../components/AppShell';
import '../pages/admin/AdminDense.css';

const links = [
  { to: '/parent', label: 'Dashboard', end: true },
  { to: '/parent/children', label: 'Children' },
  { to: '/parent/tutors', label: 'Find tutors' },
  { to: '/parent/bookings', label: 'Bookings' },
  { to: '/parent/policy', label: 'Class policy' },
  { to: '/parent/projects', label: 'Projects' },
  { to: '/parent/payments', label: 'Payments' },
  { to: '/parent/wallet', label: 'Wallet' },
  { to: '/parent/messages', label: 'Messages' },
  { to: '/parent/notifications', label: 'Notifications' },
  { to: '/parent/profile', label: 'Profile' },
];

export default function ParentLayout() {
  return <AppShell title="Parent" links={links} dense />;
}
