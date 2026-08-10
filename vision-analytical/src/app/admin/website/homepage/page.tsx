import type { Metadata } from 'next';
import { HomeSectionList } from '@/components/admin/HomeSectionList';
import { getAdminHomeSections } from '@/lib/data/admin-cms';

export const metadata: Metadata = { title: 'Homepage Builder' };

export default async function AdminHomepageBuilderPage() {
  const sections = await getAdminHomeSections();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Drag sections to reorder them on the homepage, toggle visibility, or click a section to edit its content.
      </p>
      <HomeSectionList sections={sections.map((s) => ({ key: s.key, isVisible: s.isVisible }))} />
    </div>
  );
}
