'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { reorderHomeSections, toggleHomeSectionVisibility } from '@/lib/actions/admin-cms';
import { homeSectionKeyToSlug, homeSectionKeyToLabel } from '@/lib/cms/routing';
import type { HomeSectionKey } from '@/generated/prisma/enums';

interface SectionRow {
  key: HomeSectionKey;
  isVisible: boolean;
}

export function HomeSectionList({ sections: initialSections }: { sections: SectionRow[] }) {
  const [sections, setSections] = useState(initialSections);
  const [dragKey, setDragKey] = useState<HomeSectionKey | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(targetKey: HomeSectionKey) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      return;
    }
    setSections((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((s) => s.key === dragKey);
      const toIndex = next.findIndex((s) => s.key === targetKey);
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      startTransition(() => {
        reorderHomeSections(next.map((s) => s.key));
      });
      return next;
    });
    setDragKey(null);
  }

  function handleToggleVisibility(key: HomeSectionKey) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, isVisible: !s.isVisible } : s)));
    startTransition(() => {
      toggleHomeSectionVisibility(key);
    });
  }

  return (
    <ul className="space-y-2">
      {sections.map((section) => (
        <li
          key={section.key}
          draggable
          onDragStart={() => setDragKey(section.key)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(section.key)}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
        >
          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted active:cursor-grabbing" aria-hidden="true" />
          <div className="flex-1">
            <Link href={`/admin/website/homepage/${homeSectionKeyToSlug(section.key)}`} className="font-medium text-foreground hover:underline">
              {homeSectionKeyToLabel(section.key)}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => handleToggleVisibility(section.key)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-muted"
          >
            {section.isVisible ? (
              <>
                <Eye className="h-3.5 w-3.5" /> Visible
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" /> Hidden
              </>
            )}
          </button>
          <Link
            href={`/admin/website/homepage/${homeSectionKeyToSlug(section.key)}`}
            className="text-sm font-medium text-primary hover:underline dark:text-secondary"
          >
            Edit
          </Link>
        </li>
      ))}
    </ul>
  );
}
