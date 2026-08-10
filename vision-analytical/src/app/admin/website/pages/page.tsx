import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPageKey } from '@/generated/prisma/enums';
import { pageContentKeyToSlug, pageContentKeyToLabel } from '@/lib/cms/routing';

export const metadata: Metadata = { title: 'Pages & Menus' };

const PAGE_KEYS = [
  ContentPageKey.ABOUT,
  ContentPageKey.SERVICES,
  ContentPageKey.CONTACT,
  ContentPageKey.HEADER,
  ContentPageKey.FOOTER,
];

export default function AdminPagesListPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Edit the content shown on these pages and site-wide menus.</p>
      <ul className="space-y-2">
        {PAGE_KEYS.map((key) => (
          <li key={key} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-sm">
            <span className="font-medium text-foreground">{pageContentKeyToLabel(key)}</span>
            <Link
              href={`/admin/website/pages/${pageContentKeyToSlug(key)}`}
              className="text-sm font-medium text-blue-600 hover:underline dark:text-cyan-400"
            >
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
