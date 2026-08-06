import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonVariants } from '@/components/ui/Button';
import { getAdminEngineers } from '@/lib/data/admin-engineers';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Engineers' };

export default async function AdminEngineersPage() {
  const engineers = await getAdminEngineers();

  if (engineers.length === 0) {
    return (
      <EmptyState
        title="No engineers yet"
        description="Add your field service engineers so you can assign service requests to them."
        actionLabel="Add Engineer"
        actionHref="/admin/engineers/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/admin/engineers/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          <Plus className="h-4 w-4" />
          Add Engineer
        </Link>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Phone</TableHeaderCell>
            <TableHeaderCell>Active jobs</TableHeaderCell>
            <TableHeaderCell>Joined</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {engineers.map((engineer) => (
            <TableRow key={engineer.id}>
              <TableCell>{engineer.name}</TableCell>
              <TableCell>{engineer.email}</TableCell>
              <TableCell>{engineer.phone ?? '—'}</TableCell>
              <TableCell>{engineer._count.assignedServiceJobs}</TableCell>
              <TableCell>{formatDate(engineer.createdAt)}</TableCell>
              <TableCell>{engineer.isActive ? <span className="text-success">Active</span> : <span className="text-danger">Inactive</span>}</TableCell>
              <TableCell>
                <Link href={`/admin/engineers/${engineer.id}`} className="text-blue-600 hover:underline dark:text-cyan-400">
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
