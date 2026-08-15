import type { ReactNode } from 'react';
import { ClipboardList, History, UserCircle } from 'lucide-react';
import { requireUser } from '@/lib/dal';
import { Role } from '@/generated/prisma/client';
import { DashboardShell, type DashboardNavItem } from '@/components/layout/DashboardShell';

const NAV_ITEMS: DashboardNavItem[] = [
  { href: '/engineer', label: 'Assigned Jobs', icon: <ClipboardList className="h-4 w-4" /> },
  { href: '/engineer/history', label: 'Job History', icon: <History className="h-4 w-4" /> },
  { href: '/engineer/profile', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> },
];

export default async function EngineerLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(Role.ENGINEER);

  return (
    <DashboardShell title="Engineer" navItems={NAV_ITEMS} userName={user.name} userRoleLabel="Service Engineer">
      {children}
    </DashboardShell>
  );
}
