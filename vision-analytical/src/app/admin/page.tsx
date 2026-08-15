import type { Metadata } from 'next';
import Link from 'next/link';
import { Package, AlertTriangle, FileText, Headset, Users } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAdminDashboardSummary } from '@/lib/data/admin-dashboard';
import { orderStatusMeta } from '@/lib/status';
import { formatDate, formatMinorAmount } from '@/lib/format';

export const metadata: Metadata = { title: 'Admin Dashboard' };

export default async function AdminDashboardPage() {
  const summary = await getAdminDashboardSummary();

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total products" value={summary.totalProducts} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Low / out of stock" value={summary.lowStockCount} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Pending quotes" value={summary.pendingQuotes} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Open service requests" value={summary.openServiceRequests} icon={<Headset className="h-5 w-5" />} />
        <StatCard label="Customers" value={summary.totalCustomers} icon={<Users className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <ul className="space-y-3">
              {summary.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/admin/orders/${order.id}`} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-surface-muted">
                    <div>
                      <p className="font-mono text-sm text-foreground">{order.orderNumber}</p>
                      <p className="text-xs text-muted">
                        {order.customer.name} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-foreground">{formatMinorAmount(order.totalMinor)}</span>
                      <StatusBadge meta={orderStatusMeta[order.status]} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
