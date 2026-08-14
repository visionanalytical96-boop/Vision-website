import { cn } from '@/lib/utils';

/**
 * Soft drifting shapes behind a hero.
 *
 * Blurred gradient circles rather than images or SVG paths: nothing to
 * download, nothing to go stale, and they take their colour from the theme so
 * they follow a palette change in the Theme Customizer without being edited.
 *
 * Purely decorative, so `aria-hidden` and never in the tab order. Sits behind
 * content and ignores pointer events, so it cannot swallow a click on the
 * buttons it sits under — the failure mode that makes decorative layers
 * dangerous.
 */
export function FloatingShapes({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <div
        className="va-drift absolute -left-24 -top-32 h-[26rem] w-[26rem] rounded-full opacity-[0.16] blur-3xl"
        style={{ background: 'radial-gradient(circle at 30% 30%, var(--info), transparent 70%)' }}
      />
      <div
        className="va-drift-slow absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full opacity-[0.13] blur-3xl"
        style={{ background: 'radial-gradient(circle at 60% 40%, var(--success), transparent 70%)' }}
      />
      <div
        className="va-drift absolute bottom-[-10rem] left-1/3 h-[22rem] w-[22rem] rounded-full opacity-[0.10] blur-3xl"
        style={{ background: 'radial-gradient(circle at 50% 50%, var(--warning), transparent 70%)' }}
      />
    </div>
  );
}
