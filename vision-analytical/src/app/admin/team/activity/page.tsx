import type { Metadata } from 'next';
import { Search } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getActivityLog, getActivityEntityTypes } from '@/lib/data/team';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Activity Logs' };
export const dynamic = 'force-dynamic';

interface FieldChange {
  from: string;
  to: string;
}

/** The audit row's `changes` blob, defensively — it is JSON, not a typed column. */
function readChanges(value: unknown): Array<[string, FieldChange]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
  return Object.entries(value).filter(
    (entry): entry is [string, FieldChange] =>
      typeof entry[1] === 'object' &&
      entry[1] !== null &&
      'from' in entry[1] &&
      'to' in entry[1],
  );
}

export default async function ActivityLogPage({ searchParams }: PageProps<'/admin/team/activity'>) {
  const params = await searchParams;
  const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const filters = { entityType: single(params.entityType), q: single(params.q) };
  const [entries, entityTypes] = await Promise.all([getActivityLog(filters), getActivityEntityTypes()]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Activity log</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Every attendance change is recorded here with who made it and what it was before. The log is written in the
          same transaction as the change, so an edit that isn&apos;t logged doesn&apos;t happen.
        </p>
      </div>

      <form role="search" className="grid gap-3 sm:grid-cols-3">
        <Input name="q" defaultValue={filters.q ?? ''} placeholder="Search the log" aria-label="Search activity" />
        <Select name="entityType" defaultValue={filters.entityType ?? ''} aria-label="Record type">
          <option value="">Everything</option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <div>
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted">
          Nothing logged yet. Entries appear as soon as attendance, employees or leave are changed.
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>When</TableHeaderCell>
              <TableHeaderCell>Who</TableHeaderCell>
              <TableHeaderCell>What changed</TableHeaderCell>
              <TableHeaderCell>Record</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => {
              const changes = readChanges(entry.changes);
              return (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell className="max-w-[14rem]">
                    <p className="truncate" title={entry.actorLabel}>
                      {entry.actorLabel}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground">{entry.summary}</p>
                    {changes.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {changes.map(([field, change]) => (
                          <li key={field} className="text-xs text-muted">
                            {field}: <span className="line-through">{change.from}</span> → {change.to}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge tone="neutral">{entry.entityType}</Badge>
                    <p className="mt-1 font-mono text-xs text-muted">{entry.action}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
