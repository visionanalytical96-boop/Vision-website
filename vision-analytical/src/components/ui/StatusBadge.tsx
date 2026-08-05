import { Badge } from './Badge';
import type { StatusMeta } from '@/lib/status';

export function StatusBadge({ meta }: { meta: StatusMeta }) {
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
