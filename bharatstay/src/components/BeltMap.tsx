'use client';

import { BELT_LANDMARKS, BELT_LINE, projectBelt } from '@/lib/belt';

export type MapPin = {
  lat: number;
  lng: number;
  label: string;
  kind: 'pickup' | 'drop' | 'rider' | 'me';
};

const STYLE: Record<MapPin['kind'], { fill: string; r: number }> = {
  pickup: { fill: 'var(--monsoon)', r: 8 },
  drop: { fill: 'var(--laterite)', r: 8 },
  rider: { fill: 'var(--turmeric)', r: 10 },
  me: { fill: 'var(--monsoon)', r: 7 },
};

/**
 * Live map of the Badlapur–Karjat belt, drawn from real coordinates. It is our
 * own SVG rather than an embedded provider map: no API key, no key leakage, and
 * it renders identically offline. For satellite detail every screen links out
 * to Google Maps instead.
 */
export function BeltMap({ pins, className = '' }: { pins: MapPin[]; className?: string }) {
  const line = BELT_LINE.map((name) => {
    const l = BELT_LANDMARKS.find((x) => x.label === name)!;
    return { ...projectBelt(l.lat, l.lng), label: name.replace(' Station', '') };
  });

  return (
    <div className={`scroll-x ${className}`}>
      <svg viewBox="0 0 1000 760" style={{ width: '100%', minWidth: '560px', height: 'auto' }} role="img" aria-label="Badlapur se Karjat tak ka naksha">
        <rect width="1000" height="760" rx="14" fill="var(--mist-deep)" />

        {/* the Central line, drawn through the real station coordinates */}
        <polyline
          points={line.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--rail)"
          strokeWidth="4"
          strokeLinejoin="round"
          opacity="0.45"
        />
        {line.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="6" fill="var(--paper)" stroke="var(--rail)" strokeWidth="3" />
            <text x={p.x + 11} y={p.y + 4} fontSize="15" fill="var(--basalt)" fontFamily="var(--font-body)">
              {p.label}
            </text>
          </g>
        ))}

        {pins.map((pin, i) => {
          const { x, y } = projectBelt(pin.lat, pin.lng);
          const s = STYLE[pin.kind];
          return (
            <g key={`${pin.kind}-${i}`}>
              {pin.kind === 'rider' && <circle cx={x} cy={y} r={s.r + 10} fill={s.fill} opacity="0.25" />}
              <circle cx={x} cy={y} r={s.r} fill={s.fill} stroke="var(--paper)" strokeWidth="3" />
              <text x={x + s.r + 6} y={y - 8} fontSize="15" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-body)">
                {pin.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
