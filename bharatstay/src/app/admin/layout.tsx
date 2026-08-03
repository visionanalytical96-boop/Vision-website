import Link from 'next/link';
import { requireAdminPage } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { LogoutButton } from '@/components/LogoutButton';
import { AdminNav } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  const pending = await db.partnerApplication.count({ where: { status: { in: ['PENDING', 'NEEDS_INFO'] } } });

  return (
    <div className="min-h-screen">
      <header className="border-b" style={{ background: 'var(--panel)', color: 'var(--panel-ink)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3">
          <Link href="/admin" className="display text-[20px]">
            Bharat<span style={{ color: 'var(--turmeric)' }}>Stay</span>
          </Link>
          <span className="eyebrow" style={{ color: 'color-mix(in srgb, var(--mist) 45%, transparent)' }}>
            Admin
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="btn btn-secondary btn-sm" style={{ color: 'var(--mist)', borderColor: 'rgb(255 255 255 / 0.2)' }}>
              Site dekho
            </Link>
            <span className="hidden text-[13px] opacity-70 sm:inline">{session.email}</span>
            <LogoutButton onDark />
          </div>
        </div>
        <AdminNav pending={pending} />
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
