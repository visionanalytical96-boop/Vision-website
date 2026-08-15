import type { ReactNode } from 'react';
import { LayoutDashboard, ShoppingCart, FileText, Headset, ShieldCheck, Receipt, UserCircle } from 'lucide-react';
import { requireUser } from '@/lib/dal';
import { Role } from '@/generated/prisma/client';
import { DashboardShell, type DashboardNavItem } from '@/components/layout/DashboardShell';

const NAV_ITEMS: DashboardNavItem[] = [
  { href: '/portal', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/portal/orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
  { href: '/portal/quotes', label: 'Quotes', icon: <FileText className="h-4 w-4" /> },
  { href: '/portal/service-requests', label: 'Service Requests', icon: <Headset className="h-4 w-4" /> },
  { href: '/portal/amc', label: 'AMC Contracts', icon: <ShieldCheck className="h-4 w-4" /> },
  { href: '/portal/invoices', label: 'Invoices', icon: <Receipt className="h-4 w-4" /> },
  { href: '/portal/profile', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> },
];

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(Role.CUSTOMER);

  return (
    <DashboardShell title="My Account" navItems={NAV_ITEMS} userName={user.name} userRoleLabel="Customer">
      {children}
    </DashboardShell>
  );
}
