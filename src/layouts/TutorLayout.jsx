import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { homeworkStats } from '../api';
import '../pages/admin/AdminDense.css';

const baseLinks = [
  { to: '/tutor', label: 'Dashboard', end: true },
  { to: '/tutor/availability', label: 'Availability' },
  { to: '/tutor/bookings', label: 'Bookings' },
  { to: '/tutor/homework', label: 'Homework / Assignments' },
  { to: '/tutor/projects', label: 'Projects' },
  { to: '/tutor/students', label: 'Students' },
  { to: '/tutor/lesson-plans', label: 'Lesson plans' },
  { to: '/tutor/courses', label: 'Courses' },
  { to: '/tutor/resources', label: 'Resources' },
  { to: '/tutor/earnings', label: 'Earnings' },
  { to: '/tutor/wallet', label: 'Wallet' },
  { to: '/tutor/verification', label: 'Verification' },
  { to: '/tutor/messages', label: 'Messages' },
  { to: '/tutor/notifications', label: 'Notifications' },
  { to: '/tutor/profile', label: 'Profile' },
];

export default function TutorLayout() {
  const [toGrade, setToGrade] = useState(0);

  useEffect(() => {
    homeworkStats()
      .then((d) => setToGrade(d.toGrade || 0))
      .catch(() => {});
  }, []);

  const links = baseLinks.map((link) =>
    link.to === '/tutor/homework' && toGrade > 0 ? { ...link, badge: toGrade } : link
  );
  const homeworkBadge = toGrade > 0 ? toGrade : undefined;

  return (
    <AppShell
      title="Tutor"
      links={links}
      dense
      phoneNav={[
        { to: '/tutor', label: 'Home', end: true },
        { to: '/tutor/bookings', label: 'Bookings' },
        { to: '/tutor/messages', label: 'Messages' },
        { to: '/tutor/wallet', label: 'Wallet' },
      ]}
      moreGroups={[
        {
          label: 'Teach',
          items: [
            { to: '/tutor/availability', label: 'Availability' },
            { to: '/tutor/homework', label: 'Homework / Assignments', badge: homeworkBadge },
            { to: '/tutor/projects', label: 'Projects' },
            { to: '/tutor/lesson-plans', label: 'Lesson plans' },
            { to: '/tutor/courses', label: 'Courses' },
            { to: '/tutor/resources', label: 'Resources' },
          ],
        },
        { label: 'Students', items: [{ to: '/tutor/students', label: 'Students' }] },
        { label: 'Money', items: [{ to: '/tutor/earnings', label: 'Earnings' }] },
        {
          label: 'Account',
          items: [
            { to: '/tutor/verification', label: 'Verification' },
            { to: '/tutor/notifications', label: 'Notifications' },
            { to: '/tutor/profile', label: 'Profile' },
          ],
        },
      ]}
    />
  );
}
