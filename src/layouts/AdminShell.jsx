import AppShell from '../components/AppShell';
import '../pages/admin/AdminDense.css';

const LINKS = [
  { to: '/admin', label: 'Overview', end: true, icon: 'layout-dashboard', group: 'Overview' },
  { to: '/admin/users', label: 'Users', icon: 'users', group: 'People' },
  { to: '/admin/bookings', label: 'Bookings', icon: 'calendar', group: 'Operations' },
  { to: '/admin/payments', label: 'Payments', icon: 'credit-card', group: 'Operations' },
  { to: '/admin/wallets', label: 'Wallets', icon: 'wallet', group: 'Operations' },
  { to: '/admin/verifications', label: 'Verifications', icon: 'shield-check', group: 'Operations' },
  { to: '/admin/tickets', label: 'Support tickets', icon: 'ticket', group: 'Operations' },
  { to: '/admin/catalog', label: 'Boards & classes', icon: 'graduation-cap', group: 'Catalog & content' },
  { to: '/admin/subjects', label: 'Subjects', icon: 'layers', group: 'Catalog & content' },
  { to: '/admin/resources', label: 'Resources', icon: 'file-text', group: 'Catalog & content' },
  { to: '/admin/plans', label: 'Plans', icon: 'tag', group: 'Catalog & content' },
  { to: '/admin/announcements', label: 'Announcements', icon: 'megaphone', group: 'Catalog & content' },
  { to: '/admin/campaigns', label: 'Campaigns', icon: 'trending-up', group: 'Catalog & content' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings', group: 'System' },
  { to: '/admin/configs', label: 'Configs', icon: 'list-checks', group: 'System' },
  { to: '/admin/profile', label: 'Profile', icon: 'user', group: 'System' },
];

/** Admin console — same shell as the role workspaces, compact tables, no notifications. */
export default function AdminShell() {
  return (
    <AppShell
      title="Admin"
      roleLabel="Administration"
      brandName="IBDP Console"
      links={LINKS}
      className="erp-admin"
      notificationsPath={null}
      showOnboarding={false}
      dense
    />
  );
}
