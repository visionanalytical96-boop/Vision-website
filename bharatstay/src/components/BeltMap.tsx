'use client';

import { BELT_LANDMARKS, projectBelt } from '@/lib/belt';

export type MapPin = {
  lat: number;
  lng: number;
  label: string;
  kind: 'pickup' | 'drop' | 'rider' | 'me' | 'place';
  /** Link shown inside the pin's popup — used by listing maps. */
  href?: string;
  /** How many listings this pin stands for; scales the dot. */
  weight?: number;
};

const STYLE: Record<MapPin['kind'], { fill: string; r: number }> = {
  pickup: { fill: 'var(--monsoon)', r: 8 },
  drop: { fill: 'var(--laterite)', r: 8 },
  rider: { fill: 'var(--turmeric)', r: 10 },
  me: { fill: 'var(--monsoon)', r: 7 },
  place: { fill: 'var(--laterite)', r: 7 },
};

/**
 * Live map of the Badlapur–Karjat area, drawn from real coordinates. It is our
 * own SVG rather than an embedded provider map: no API key needed, and it
 * renders identically offline. When a Google Maps key is configured the
 * LiveMap draws the real OpenStreetMap; this is its offline fallback.
 */
export function BeltMap({ pins, className = '' }: { pins: MapPin[]; className?: string }) {
  // Reference points so a pin has something to sit against.
  const places = BELT_LANDMARKS.filter((l) => /Badlapur Station \(East\)|Ambernath|Karjat Station|Neral|Bhivpuri|Vangani/.test(l.label))
    .map((l) => ({ ...projectBelt(l.lat, l.lng), label: l.label.replace(' Station', '').replace(' (East)', '').replace(' Road', '') }));

  return (
    <div className={`scroll-x ${className}`}>
      <svg viewBox="0 0 1000 760" style={{ width: '100%', minWidth: '560px', height: 'auto' }} role="img" aria-label="Badlapur–Karjat ka naksha">
        <rect width="1000" height="760" rx="14" fill="var(--mist-deep)" />

        {places.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--rail)" opacity="0.55" />
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
