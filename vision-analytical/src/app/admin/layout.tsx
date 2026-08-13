import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  FileText,
  Users,
  Contact2,
  Wrench,
  Headset,
  ShieldCheck,
  Newspaper,
  BarChart3,
  LayoutTemplate,
  FileEdit,
  Palette,
  Images,
  ClipboardCheck,
  ToggleLeft,
  FileDown,
  Quote,
  Settings,
  UsersRound,
  IdCard,
  CalendarCheck,
  CalendarOff,
  CalendarDays,
  Building2,
  Fingerprint,
  SlidersHorizontal,
  History,
} from 'lucide-react';
import { requireUser } from '@/lib/dal';
import { Role } from '@/generated/prisma/client';
import { DashboardShell, type DashboardNavItem } from '@/components/layout/DashboardShell';

const NAV_ITEMS: DashboardNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/admin/products', label: 'Products', icon: <Package className="h-4 w-4" />, section: 'Business' },
  { href: '/admin/inventory', label: 'Inventory', icon: <Boxes className="h-4 w-4" /> },
  { href: '/admin/orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
  { href: '/admin/quotes', label: 'Quotes', icon: <FileText className="h-4 w-4" /> },
  { href: '/admin/customers', label: 'Customers', icon: <Users className="h-4 w-4" /> },
  { href: '/admin/crm', label: 'CRM', icon: <Contact2 className="h-4 w-4" /> },
  { href: '/admin/engineers', label: 'Engineers', icon: <Wrench className="h-4 w-4" /> },
  { href: '/admin/service-requests', label: 'Service Requests', icon: <Headset className="h-4 w-4" /> },
  { href: '/admin/amc', label: 'AMC / CMC', icon: <ShieldCheck className="h-4 w-4" /> },
  { href: '/admin/blog', label: 'Blog', icon: <Newspaper className="h-4 w-4" /> },
  { href: '/admin/reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/admin/quality', label: 'Data Quality', icon: <ClipboardCheck className="h-4 w-4" /> },
  // Everything about employees lives under Team. Keeping it one section stops
  // the main nav growing a row every time HR gains a feature.
  { href: '/admin/team', label: 'Dashboard', icon: <UsersRound className="h-4 w-4" />, section: 'Team' },
  { href: '/admin/team/employees', label: 'Employees', icon: <IdCard className="h-4 w-4" /> },
  { href: '/admin/team/attendance', label: 'Attendance', icon: <CalendarCheck className="h-4 w-4" /> },
  { href: '/admin/team/leave', label: 'Leave', icon: <CalendarOff className="h-4 w-4" /> },
  { href: '/admin/team/holidays', label: 'Holidays', icon: <CalendarDays className="h-4 w-4" /> },
  { href: '/admin/team/departments', label: 'Departments', icon: <Building2 className="h-4 w-4" /> },
  { href: '/admin/team/reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/admin/team/devices', label: 'Device Settings', icon: <Fingerprint className="h-4 w-4" /> },
  { href: '/admin/team/rules', label: 'Attendance Rules', icon: <SlidersHorizontal className="h-4 w-4" /> },
  { href: '/admin/team/activity', label: 'Activity Logs', icon: <History className="h-4 w-4" /> },
  { href: '/admin/website/homepage', label: 'Homepage Builder', icon: <LayoutTemplate className="h-4 w-4" />, section: 'Website' },
  { href: '/admin/website/pages', label: 'Pages & Menus', icon: <FileEdit className="h-4 w-4" /> },
  { href: '/admin/website/theme', label: 'Theme', icon: <Palette className="h-4 w-4" /> },
  { href: '/admin/website/downloads', label: 'Downloads', icon: <FileDown className="h-4 w-4" /> },
  { href: '/admin/website/testimonials', label: 'Testimonials', icon: <Quote className="h-4 w-4" /> },
  { href: '/admin/website/media', label: 'Media Library', icon: <Images className="h-4 w-4" /> },
  { href: '/admin/website/settings', label: 'Business Settings', icon: <Settings className="h-4 w-4" /> },
  { href: '/admin/settings/features', label: 'Feature Flags', icon: <ToggleLeft className="h-4 w-4" /> },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(Role.ADMIN);

  return (
    <DashboardShell title="Admin" navItems={NAV_ITEMS} userName={user.name} userRoleLabel="Administrator">
      {children}
    </DashboardShell>
  );
}
