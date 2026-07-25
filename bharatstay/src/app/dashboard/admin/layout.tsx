import { DashboardShell, type DashboardNavItem } from '@/components/dashboard/DashboardShell';

const NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Analytics Overview', href: '/dashboard/admin', icon: '📈' },
  { label: 'Bookings', href: '/dashboard/admin/bookings', icon: '🗂️' },
  { label: 'Payments & Proofs', href: '/dashboard/admin/payments', icon: '💳' },
  { label: 'Property Approvals', href: '/dashboard/admin/properties', icon: '🏨' },
  { label: 'Refunds & Cancellations', href: '/dashboard/admin/refunds', icon: '↩️' },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Super Admin" userName="Admin">
      {children}
    </DashboardShell>
  );
}
