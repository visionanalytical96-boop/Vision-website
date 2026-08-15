const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

interface ProductSchemaInput {
  name: string;
  description: string;
  path: string;
  images: string[];
  priceMinor: number | null;
  inStock: boolean;
  sku?: string;
  brand?: string;
  refurbished?: boolean;
}

export function buildProductSchema(input: ProductSchemaInput) {
  const url = `${SITE_URL}${input.path}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url,
    ...(input.images.length > 0 ? { image: input.images.map((src) => `${SITE_URL}${src}`) } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    ...(input.brand ? { brand: { '@type': 'Brand', name: input.brand } } : {}),
    itemCondition: `https://schema.org/${input.refurbished ? 'RefurbishedCondition' : 'NewCondition'}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      ...(input.priceMinor != null ? { price: (input.priceMinor / 100).toFixed(2) } : {}),
      availability: input.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
    },
  };
}
