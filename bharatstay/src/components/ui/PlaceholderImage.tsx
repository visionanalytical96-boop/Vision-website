import { cn } from '@/lib/utils';

// Demo data references images as `tone:emoji` tokens instead of external URLs so the
// scaffold has zero runtime dependency on third-party image hosts. Swap for real
// property/destination photography (served from object storage) when wiring a live backend.

const TONES: Record<string, string> = {
  ocean: 'from-sky-500 to-blue-700',
  sunset: 'from-orange-400 to-pink-600',
  forest: 'from-emerald-500 to-teal-700',
  mountain: 'from-slate-500 to-indigo-700',
  royal: 'from-royal-600 to-royal-900',
  saffron: 'from-saffron-400 to-saffron-700',
  heritage: 'from-amber-500 to-rose-700',
  desert: 'from-yellow-500 to-orange-700',
  snow: 'from-cyan-400 to-blue-800',
  gold: 'from-yellow-400 to-amber-700',
  lake: 'from-teal-400 to-cyan-800',
  farm: 'from-lime-500 to-green-800',
};

export function parseImageToken(token: string): { tone: string; emoji: string } {
  const [tone, emoji] = token.split(':');
  return { tone: tone ?? 'royal', emoji: emoji ?? '📍' };
}

export function PlaceholderImage({
  token,
  label,
  className,
  emojiClassName = 'text-4xl',
}: {
  token: string;
  label?: string;
  className?: string;
  emojiClassName?: string;
}) {
  const { tone, emoji } = parseImageToken(token);
  const gradient = TONES[tone] ?? TONES.royal;

  return (
    <div
      className={cn(
        'relative flex items-end overflow-hidden bg-gradient-to-br',
        gradient,
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute right-3 top-3 opacity-80',
          emojiClassName,
        )}
      >
        {emoji}
      </span>
      {label ? (
        <span className="relative z-10 w-full truncate bg-gradient-to-t from-black/60 to-transparent px-3 py-2 text-sm font-medium text-white">
          {label}
        </span>
      ) : null}
    </div>
  );
}
