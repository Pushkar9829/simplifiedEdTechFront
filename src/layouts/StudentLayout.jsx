import AppShell from '../components/AppShell';
import '../pages/admin/AdminDense.css';

const links = [
  { to: '/student', label: 'Dashboard', end: true },
  { to: '/student/subjects', label: 'Subjects' },
  { to: '/student/tutors', label: 'Find tutors' },
  { to: '/student/bookings', label: 'Bookings' },
  { to: '/student/resources', label: 'Resources' },
  { to: '/student/homework', label: 'Homework' },
  { to: '/student/projects', label: 'Projects' },
  { to: '/student/courses', label: 'Courses' },
  { to: '/student/progress', label: 'Progress' },
  { to: '/student/payments', label: 'Payments' },
  { to: '/student/wallet', label: 'Wallet' },
  { to: '/student/messages', label: 'Messages' },
  { to: '/student/notifications', label: 'Notifications' },
  { to: '/student/profile', label: 'Profile' },
];

export default function StudentLayout() {
  return <AppShell title="Student" links={links} dense />;
}
