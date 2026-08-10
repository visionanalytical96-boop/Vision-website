import type { ReactNode } from 'react';
import { Card, CardContent } from './Card';

export function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary dark:bg-white/5 dark:text-secondary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
