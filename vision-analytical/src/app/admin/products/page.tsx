import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { buttonVariants } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAdminProducts } from '@/lib/data/admin-products';
import { stockStatusMeta } from '@/lib/status';
import { formatMinorAmount } from '@/lib/format';
import { deleteProduct, toggleProductPublished } from '@/lib/actions/admin-products';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';

export const metadata: Metadata = { title: 'Products' };

export default async function AdminProductsPage(props: PageProps<'/admin/products'>) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === 'string' ? searchParams.q : undefined;

  const products = await getAdminProducts({ query });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="GET" className="w-full max-w-xs">
          <Input name="q" defaultValue={query} placeholder="Search by name or SKU…" />
        </form>
        <div className="flex items-center gap-3">
          <Link href="/admin/products/categories" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Manage Categories
          </Link>
          <Link href="/admin/products/refurbished" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Refurbished
          </Link>
          <Link href="/admin/products/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>SKU</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Stock</TableHeaderCell>
            <TableHeaderCell>Published</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell className="font-mono text-xs">{product.sku}</TableCell>
              <TableCell>{product.kind === 'INSTRUMENT' ? 'Instrument' : 'Spare Part'}</TableCell>
              <TableCell>{product.category.name}</TableCell>
              <TableCell>{product.priceMinor ? formatMinorAmount(product.priceMinor) : '—'}</TableCell>
              <TableCell>
                <StatusBadge meta={stockStatusMeta[product.stockStatus]} />
              </TableCell>
              <TableCell>
                <form action={toggleProductPublished}>
                  <input type="hidden" name="id" value={product.id} />
                  <button type="submit" className="text-xs">
                    {product.isPublished ? (
                      <span className="text-success">Published</span>
                    ) : (
                      <span className="text-muted">Draft</span>
                    )}
                  </button>
                </form>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Link href={`/admin/products/${product.id}`} className="text-primary hover:underline dark:text-secondary" aria-label={`Edit ${product.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={product.id} />
                    <ConfirmSubmitButton
                      confirmMessage={`Delete "${product.name}"? This cannot be undone.`}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
