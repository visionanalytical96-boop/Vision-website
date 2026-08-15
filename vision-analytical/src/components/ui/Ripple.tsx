'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Dot {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * Wraps a clickable area and expands a circle from wherever it was clicked.
 *
 * The point is acknowledgement, not decoration: a Server Action can take a
 * moment on a slow connection, and without any response to the tap people click
 * again. The dot appears on pointerdown — before the action starts — so the
 * feedback never waits on the network.
 *
 * Respects the Theme Settings animations toggle and reduced-motion through the
 * same CSS in globals.css that governs every other animation, so nothing here
 * needs to know whether motion is switched on.
 */
export function Ripple({ children, className }: { children: ReactNode; className?: string }) {
  const [dots, setDots] = useState<Dot[]>([]);
  const nextId = useRef(0);

  const spawn = useCallback((event: React.PointerEvent<HTMLSpanElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    // Large enough to cover the far corner from wherever the click landed.
    const size = Math.max(box.width, box.height);
    const id = nextId.current++;

    setDots((current) => [
      ...current,
      { id, x: event.clientX - box.left - size / 2, y: event.clientY - box.top - size / 2, size },
    ]);
  }, []);

  const clear = useCallback((id: number) => {
    setDots((current) => current.filter((dot) => dot.id !== id));
  }, []);

  return (
    <span onPointerDown={spawn} className={cn('relative inline-flex overflow-hidden', className)}>
      {children}
      {dots.map((dot) => (
        <span
          key={dot.id}
          aria-hidden
          className="va-ripple-dot"
          style={{ left: dot.x, top: dot.y, width: dot.size, height: dot.size }}
          onAnimationEnd={() => clear(dot.id)}
        />
      ))}
    </span>
  );
}
