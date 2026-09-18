import AppShell from '../components/AppShell';
import '../pages/admin/AdminDense.css';

const links = [
  { to: '/tutor', label: 'Dashboard', end: true },
  { to: '/tutor/availability', label: 'Availability' },
  { to: '/tutor/bookings', label: 'Bookings' },
  { to: '/tutor/homework', label: 'Homework' },
  { to: '/tutor/students', label: 'Students' },
  { to: '/tutor/lesson-plans', label: 'Lesson plans' },
  { to: '/tutor/resources', label: 'Resources' },
  { to: '/tutor/earnings', label: 'Earnings' },
  { to: '/tutor/wallet', label: 'Wallet' },
  { to: '/tutor/verification', label: 'Verification' },
  { to: '/tutor/messages', label: 'Messages' },
  { to: '/tutor/notifications', label: 'Notifications' },
  { to: '/tutor/profile', label: 'Profile' },
];

export default function TutorLayout() {
  return <AppShell title="Tutor" links={links} dense />;
}
