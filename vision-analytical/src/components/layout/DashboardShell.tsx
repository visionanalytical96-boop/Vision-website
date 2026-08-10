import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';
import { DashboardMobileNav } from './DashboardMobileNav';
import { cn } from '@/lib/utils';

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Renders a small uppercase heading above this item when it differs from the previous item's section. */
  section?: string;
}

interface DashboardShellProps {
  title: string;
  navItems: DashboardNavItem[];
  userName: string;
  userRoleLabel: string;
  children: ReactNode;
}

export function DashboardShell({ title, navItems, userName, userRoleLabel, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-surface-muted">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/" className="font-display text-lg font-bold text-foreground">
            Vision <span className="text-blue-600 dark:text-cyan-400">Analytical</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item, index) => (
            <div key={item.href}>
              {item.section && item.section !== navItems[index - 1]?.section && (
                <p className={cn('px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase', index > 0 && 'pt-4')}>
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                {item.icon}
                {item.label}
              </Link>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium text-foreground">{userName}</p>
          <p className="text-xs text-muted">{userRoleLabel}</p>
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4 md:px-8">
          <DashboardMobileNav navItems={navItems} />
          <h1 className="font-display text-lg font-semibold text-foreground">{title}</h1>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
