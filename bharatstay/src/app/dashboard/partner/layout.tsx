import { DashboardShell, type DashboardNavItem } from '@/components/dashboard/DashboardShell';

const NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Overview', href: '/dashboard/partner', icon: '📊' },
  { label: 'Bookings', href: '/dashboard/partner/bookings', icon: '🗓️' },
  { label: 'Earnings & Settlement', href: '/dashboard/partner/earnings', icon: '💰' },
];

export default function PartnerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Property Partner" userName="Royal Orchid Suites">
      {children}
    </DashboardShell>
  );
}
