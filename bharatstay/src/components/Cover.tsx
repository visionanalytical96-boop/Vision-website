import { Scene } from './Scene';

/**
 * A listing's cover image: the uploaded photo when there is one, the drawn
 * scene when there isn't. Callers never need to branch on it.
 */
export function Cover({
  photoId,
  tone,
  alt,
  seed = 0,
  className = '',
  sizes = '(max-width: 768px) 100vw, 33vw',
}: {
  photoId?: string | null;
  tone: string;
  alt: string;
  seed?: number;
  className?: string;
  sizes?: string;
}) {
  if (photoId) {
    return (
      // Bytes are served by our own route with an immutable cache header, so
      // the plain <img> avoids Next's optimiser round-trip for no benefit.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/photos/${photoId}`}
        alt={alt}
        sizes={sizes}
        loading="lazy"
        className={className}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }
  return <Scene tone={tone} seed={seed} className={className} />;
}
