import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { SupplierCreateForm } from '@/components/forms/SupplierCreateForm';
import { getSuppliers } from '@/lib/data/admin-inventory';

export const metadata: Metadata = { title: 'Suppliers' };

export default async function AdminSuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierCreateForm />
        </CardContent>
      </Card>

      {suppliers.length === 0 ? (
        <EmptyState title="No suppliers yet" description="Add your first supplier above." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Contact</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Phone</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.contactName ?? '—'}</TableCell>
                <TableCell>{supplier.email ?? '—'}</TableCell>
                <TableCell>{supplier.phone ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
