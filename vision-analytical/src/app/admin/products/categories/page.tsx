import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { CategoryCreateForm } from '@/components/forms/CategoryCreateForm';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { getAllCategories } from '@/lib/data/admin-products';
import { deleteCategory } from '@/lib/actions/admin-categories';

export const metadata: Metadata = { title: 'Categories' };

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add category</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryCreateForm />
        </CardContent>
      </Card>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Slug</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Sort</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>{category.name}</TableCell>
              <TableCell className="font-mono text-xs">{category.slug}</TableCell>
              <TableCell>{category.kind}</TableCell>
              <TableCell>{category.sortOrder}</TableCell>
              <TableCell>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <ConfirmSubmitButton
                    confirmMessage={`Delete category "${category.name}"? Products in this category must be reassigned first.`}
                    className="text-xs text-danger hover:underline"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
