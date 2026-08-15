import Link from 'next/link';
import { buttonVariants } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className={buttonVariants({ variant: 'primary', className: 'mt-4' })}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
