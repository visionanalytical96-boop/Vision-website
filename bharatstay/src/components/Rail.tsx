import Link from 'next/link';

export type RailStop = {
  label: string;
  /** Rendered under the label in mono — a distance, a time, a fare. */
  note?: string;
  href?: string;
  done?: boolean;
  current?: boolean;
};

/**
 * The route line. On the home page it is the actual Central Railway sequence
 * from Badlapur to Karjat; on multi-step forms it is the steps. In both cases
 * left-to-right order is information, which is why the same device serves both.
 */
export function Rail({
  stops,
  animate = false,
  onDark = false,
}: {
  stops: RailStop[];
  animate?: boolean;
  /** Flips label and dot colours for use on the ink background. */
  onDark?: boolean;
}) {
  const labelColor = onDark ? 'rgb(255 255 255 / 0.92)' : 'var(--ink)';
  const noteColor = onDark ? 'rgb(255 255 255 / 0.55)' : 'var(--basalt-soft)';
  const dotStyle = onDark
    ? { borderColor: 'rgb(255 255 255 / 0.55)', background: '#10261f' }
    : undefined;
  const dotOnStyle = { borderColor: 'var(--laterite)', background: 'var(--laterite)' };

  return (
    <div className="scroll-x -mx-1 px-1 pb-1">
      <div className={`rail ${animate ? 'rail-animate' : ''}`} style={{ minWidth: `${stops.length * 92}px` }}>
        {stops.map((stop, i) => {
          const on = stop.done || stop.current;
          const label = (
            <>
              <span className="rail-dot" style={on ? dotOnStyle : dotStyle} aria-hidden />
              <span className="flex flex-col items-center gap-0.5">
                <span
                  className="text-[12.5px] font-semibold whitespace-nowrap"
                  style={{ color: stop.current ? 'var(--laterite)' : labelColor }}
                >
                  {stop.label}
                </span>
                {stop.note && (
                  <span className="data text-[10.5px]" style={{ color: noteColor }}>
                    {stop.note}
                  </span>
                )}
              </span>
            </>
          );

          return (
            <div key={stop.label + i} className="contents">
              {stop.href ? (
                <Link href={stop.href} className="rail-stop group" aria-current={stop.current ? 'step' : undefined}>
                  {label}
                </Link>
              ) : (
                <div className="rail-stop" aria-current={stop.current ? 'step' : undefined}>
                  {label}
                </div>
              )}
              {i < stops.length - 1 && (
                <span
                  className={`rail-link ${stops[i + 1]?.done || stops[i + 1]?.current ? '' : 'rail-link-dim'}`}
                  style={animate ? { animationDelay: `${i * 90}ms` } : undefined}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
