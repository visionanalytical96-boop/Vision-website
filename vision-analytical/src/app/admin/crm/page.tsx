import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonVariants } from '@/components/ui/Button';
import { getAdminLeads } from '@/lib/data/admin-crm';
import { crmLeadStatusMeta } from '@/lib/status';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'CRM' };

export default async function AdminCrmPage() {
  const leads = await getAdminLeads();

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Track prospective customers and follow-ups here."
        actionLabel="Add Lead"
        actionHref="/admin/crm/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/admin/crm/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          <Plus className="h-4 w-4" />
          Add Lead
        </Link>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Company</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell>Assigned to</TableHeaderCell>
            <TableHeaderCell>Activities</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>{lead.name}</TableCell>
              <TableCell>{lead.company ?? '—'}</TableCell>
              <TableCell>{lead.source ?? '—'}</TableCell>
              <TableCell>{lead.assignedTo?.name ?? 'Unassigned'}</TableCell>
              <TableCell>{lead._count.activities}</TableCell>
              <TableCell>{formatDate(lead.createdAt)}</TableCell>
              <TableCell>
                <StatusBadge meta={crmLeadStatusMeta[lead.status]} />
              </TableCell>
              <TableCell>
                <Link href={`/admin/crm/${lead.id}`} className="text-blue-600 hover:underline dark:text-cyan-400">
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
