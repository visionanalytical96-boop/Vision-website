'use client';

import { useCallback, useEffect, useState } from 'react';
import { Scene } from './Scene';

export type GalleryPhoto = { id: string; alt?: string };

/**
 * Photo grid with a full-screen viewer. Built for listings that carry many
 * photos: the grid stays a fixed height however many there are, and the rest
 * are reachable through the "+N" tile rather than pushing the page down.
 */
export function Gallery({
  photos,
  tone,
  title,
}: {
  photos: GalleryPhoto[];
  tone: string;
  title: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const move = useCallback(
    (delta: number) => setOpen((i) => (i === null ? null : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    // Stop the page behind the viewer from scrolling under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, move]);

  if (photos.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="aspect-[16/9]">
          <Scene tone={tone} seed={2} />
        </div>
      </div>
    );
  }

  const [first, ...rest] = photos;
  const side = rest.slice(0, 4);
  const extra = photos.length - 1 - side.length;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <button
          type="button"
          className="card aspect-[16/10] overflow-hidden"
          onClick={() => setOpen(0)}
          aria-label={`${title} — photo 1 of ${photos.length}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/photos/${first!.id}`} alt={first!.alt ?? title} className="h-full w-full object-cover" />
        </button>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:grid-rows-2">
          {side.slice(0, 2).map((p, i) => (
            <button
              key={p.id}
              type="button"
              className="card relative aspect-[16/9] overflow-hidden"
              onClick={() => setOpen(i + 1)}
              aria-label={`${title} — photo ${i + 2} of ${photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.id}`} alt="" className="h-full w-full object-cover" />
              {i === 1 && extra > 0 && (
                <span
                  className="absolute inset-0 flex items-center justify-center text-[20px] font-semibold"
                  style={{ background: 'rgb(0 0 0 / 0.55)', color: '#fff', backdropFilter: 'blur(2px)' }}
                >
                  +{extra + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {photos.length > 1 && (
        <p className="mt-2 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
          {photos.length} photos · kisi par bhi tap karke poori dekhiye
        </p>
      )}

      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgb(4 10 8 / 0.88)', backdropFilter: 'blur(10px)' }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/photos/${photos[open]!.id}`}
            alt={photos[open]!.alt ?? title}
            className="max-h-[86vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            className="btn btn-secondary btn-sm absolute right-4 top-4"
            onClick={() => setOpen(null)}
            aria-label="Band karo"
          >
            ✕
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="btn btn-secondary absolute left-4 top-1/2 -translate-y-1/2"
                onClick={(e) => { e.stopPropagation(); move(-1); }}
                aria-label="Pichhli photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="btn btn-secondary absolute right-4 top-1/2 -translate-y-1/2"
                onClick={(e) => { e.stopPropagation(); move(1); }}
                aria-label="Agli photo"
              >
                ›
              </button>
              <span
                className="data absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[12.5px]"
                style={{ background: 'rgb(255 255 255 / 0.14)', color: '#fff' }}
              >
                {open + 1} / {photos.length}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
