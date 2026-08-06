import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { getAdminCustomers } from '@/lib/data/admin-customers';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Customers' };

export default async function AdminCustomersPage(props: PageProps<'/admin/customers'>) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === 'string' ? searchParams.q : undefined;

  const customers = await getAdminCustomers(query);

  return (
    <div className="space-y-4">
      <form method="GET" className="max-w-xs">
        <Input name="q" defaultValue={query} placeholder="Search customers…" />
      </form>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Company</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Orders</TableHeaderCell>
            <TableHeaderCell>Quotes</TableHeaderCell>
            <TableHeaderCell>Joined</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.companyName ?? '—'}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell>{customer._count.orders}</TableCell>
              <TableCell>{customer._count.quotes}</TableCell>
              <TableCell>{formatDate(customer.createdAt)}</TableCell>
              <TableCell>{customer.isActive ? <span className="text-success">Active</span> : <span className="text-danger">Inactive</span>}</TableCell>
              <TableCell>
                <Link href={`/admin/customers/${customer.id}`} className="text-blue-600 hover:underline dark:text-cyan-400">
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
