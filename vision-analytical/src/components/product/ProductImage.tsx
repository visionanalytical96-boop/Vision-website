import Image from 'next/image';
import { ProductImagePlaceholder } from './ProductImagePlaceholder';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  images: string[];
  alt: string;
  className?: string;
  sizes?: string;
}

export function ProductImage({ images, alt, className, sizes }: ProductImageProps) {
  const src = images[0];
  if (!src) return <ProductImagePlaceholder className={className} />;

  return (
    <div className={cn('relative overflow-hidden bg-surface-muted', className)}>
      <Image src={src} alt={alt} fill sizes={sizes ?? '(min-width: 1024px) 50vw, 100vw'} className="object-cover" />
    </div>
  );
}
