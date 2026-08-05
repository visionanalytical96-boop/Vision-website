import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

// Product photography is uploaded via the admin panel; until then, catalog
// entries render this placeholder instead of a broken or stock image.
export function ProductImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center bg-surface-muted', className)}>
      <FlaskConical className="h-10 w-10 text-muted" />
    </div>
  );
}
