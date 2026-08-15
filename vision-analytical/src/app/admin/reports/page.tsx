import type { Metadata } from 'next';
import { IndianRupee, ShoppingCart, TrendingUp, Package } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { BarList } from '@/components/ui/BarList';
import { getAdminReports } from '@/lib/data/admin-reports';
import { formatMinorAmount } from '@/lib/format';
import { orderStatusMeta, quoteStatusMeta, serviceRequestStatusMeta, amcStatusMeta } from '@/lib/status';

export const metadata: Metadata = { title: 'Reports' };

export default async function AdminReportsPage() {
  const report = await getAdminReports();
  const avgOrderValueMinor = report.orderCount > 0 ? Math.round(report.revenueTotalMinor / report.orderCount) : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatMinorAmount(report.revenueTotalMinor)} icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="Revenue this month" value={formatMinorAmount(report.revenueThisMonthMinor)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Total orders" value={report.orderCount} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard label="Average order value" value={formatMinorAmount(avgOrderValueMinor)} icon={<Package className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={report.ordersByStatus.map((row) => ({ label: orderStatusMeta[row.status].label, count: row.count }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotes by status</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={report.quotesByStatus.map((row) => ({ label: quoteStatusMeta[row.status].label, count: row.count }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service requests by status</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={report.serviceRequestsByStatus.map((row) => ({ label: serviceRequestStatusMeta[row.status].label, count: row.count }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AMC / CMC contracts by status</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={report.amcByStatus.map((row) => ({ label: amcStatusMeta[row.status].label, count: row.count }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top products by revenue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {report.topProducts.length === 0 ? (
            <p className="p-5 text-sm text-muted">No sales yet.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Units sold</TableHeaderCell>
                  <TableHeaderCell>Revenue</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.topProducts.map((product) => (
                  <TableRow key={product.name}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>{formatMinorAmount(product.revenueMinor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
