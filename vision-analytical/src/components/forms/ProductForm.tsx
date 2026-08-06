'use client';

import { useActionState } from 'react';
import { createProduct, updateProduct, type ProductFormState } from '@/lib/actions/admin-products';
import { ProductKind, StockStatus } from '@/generated/prisma/enums';
import type { Product, Category } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: ProductFormState = {};

interface ProductFormProps {
  categories: Category[];
  product?: Product;
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <FormField label="SKU" htmlFor="sku" error={state.errors?.sku} required>
        <Input id="sku" name="sku" defaultValue={product?.sku} required />
      </FormField>
      <FormField label="Slug" htmlFor="slug" error={state.errors?.slug} hint="lowercase-with-hyphens" required>
        <Input id="slug" name="slug" defaultValue={product?.slug} required />
      </FormField>

      <FormField label="Name" htmlFor="name" error={state.errors?.name} required className="sm:col-span-2">
        <Input id="name" name="name" defaultValue={product?.name} required />
      </FormField>

      <FormField label="Type" htmlFor="kind" error={state.errors?.kind} required>
        <Select id="kind" name="kind" defaultValue={product?.kind ?? ProductKind.INSTRUMENT} required>
          <option value={ProductKind.INSTRUMENT}>Instrument</option>
          <option value={ProductKind.SPARE_PART}>Spare Part</option>
        </Select>
      </FormField>

      <FormField label="Category" htmlFor="categoryId" error={state.errors?.categoryId} required>
        <Select id="categoryId" name="categoryId" defaultValue={product?.categoryId} required>
          <option value="">Select a category…</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.kind})
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Brand" htmlFor="brand" error={state.errors?.brand}>
        <Input id="brand" name="brand" defaultValue={product?.brand ?? ''} />
      </FormField>
      <FormField label="Compatible brands" htmlFor="compatibleBrands" error={state.errors?.compatibleBrands} hint="Comma-separated">
        <Input id="compatibleBrands" name="compatibleBrands" defaultValue={product?.compatibleBrands.join(', ') ?? ''} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={state.errors?.description} required className="sm:col-span-2">
        <Textarea id="description" name="description" rows={4} defaultValue={product?.description} required />
      </FormField>

      <FormField label="Price (₹)" htmlFor="priceRupees" error={state.errors?.priceRupees} hint="Leave blank for 'Contact for pricing'">
        <Input id="priceRupees" name="priceRupees" type="number" min="0" step="0.01" defaultValue={product ? (product.priceMinor ? product.priceMinor / 100 : '') : ''} />
      </FormField>

      <FormField label="Stock status" htmlFor="stockStatus" error={state.errors?.stockStatus} required>
        <Select id="stockStatus" name="stockStatus" defaultValue={product?.stockStatus ?? StockStatus.IN_STOCK} required>
          <option value={StockStatus.IN_STOCK}>In stock</option>
          <option value={StockStatus.LOW_STOCK}>Low stock</option>
          <option value={StockStatus.OUT_OF_STOCK}>Out of stock</option>
          <option value={StockStatus.MADE_TO_ORDER}>Made to order</option>
        </Select>
      </FormField>

      <FormField label="Stock quantity" htmlFor="stockQuantity" error={state.errors?.stockQuantity}>
        <Input id="stockQuantity" name="stockQuantity" type="number" min="0" step="1" defaultValue={product?.stockQuantity ?? 0} />
      </FormField>

      <FormField label="SEO title" htmlFor="seoTitle" error={state.errors?.seoTitle}>
        <Input id="seoTitle" name="seoTitle" defaultValue={product?.seoTitle ?? ''} />
      </FormField>
      <FormField label="SEO description" htmlFor="seoDescription" error={state.errors?.seoDescription}>
        <Input id="seoDescription" name="seoDescription" defaultValue={product?.seoDescription ?? ''} />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={product?.isPublished ?? true} className="h-4 w-4 rounded border-border" />
        Published (visible on the public site)
      </label>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
      </Button>
    </form>
  );
}
