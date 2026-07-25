import { DashboardShell, type DashboardNavItem } from '@/components/dashboard/DashboardShell';

const NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Overview', href: '/dashboard/customer', icon: '📊' },
  { label: 'My Bookings', href: '/dashboard/customer/bookings', icon: '🎫' },
  { label: 'Payments & Receipts', href: '/dashboard/customer/payments', icon: '💳' },
];

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Customer" userName="Ananya Sharma">
      {children}
    </DashboardShell>
  );
}
