import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { buttonVariants } from '@/components/ui/Button';
import { StockAdjustForm } from '@/components/forms/StockAdjustForm';
import { getInventoryProducts, getRecentStockMovements } from '@/lib/data/admin-inventory';
import { stockStatusMeta } from '@/lib/status';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Inventory' };

export default async function AdminInventoryPage() {
  const [products, movements] = await Promise.all([getInventoryProducts(), getRecentStockMovements(10)]);
  const lowStockProducts = products.filter((p) => p.stockStatus === 'LOW_STOCK' || p.stockStatus === 'OUT_OF_STOCK');

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/admin/inventory/suppliers" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Suppliers
        </Link>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {lowStockProducts.length} product{lowStockProducts.length === 1 ? '' : 's'} low or out of stock.
        </div>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>SKU</TableHeaderCell>
            <TableHeaderCell>Qty</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Adjust</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell className="font-mono text-xs">{product.sku}</TableCell>
              <TableCell>{product.stockQuantity}</TableCell>
              <TableCell>
                <StatusBadge meta={stockStatusMeta[product.stockStatus]} />
              </TableCell>
              <TableCell>
                <StockAdjustForm productId={product.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Recent stock movements</h2>
        <Table className="mt-3">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Qty</TableHeaderCell>
              <TableHeaderCell>By</TableHeaderCell>
              <TableHeaderCell>When</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted">
                  No stock movements recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    {movement.product.name} <span className="font-mono text-xs text-muted">({movement.product.sku})</span>
                  </TableCell>
                  <TableCell>{movement.type.replaceAll('_', ' ')}</TableCell>
                  <TableCell>{movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}</TableCell>
                  <TableCell>{movement.createdBy.name}</TableCell>
                  <TableCell>{formatDateTime(movement.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
