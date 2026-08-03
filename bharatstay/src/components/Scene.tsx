/**
 * Every listing carries a `tone`. Until a real photograph is uploaded for it,
 * that tone renders as a drawn Sahyadri scene rather than a grey box — so an
 * un-photographed listing still looks finished instead of broken.
 *
 * Each tone gets its own silhouette family (coast, ridge, fields, fort…), not
 * just a recolour of one shape, so a grid of cards reads as varied.
 */

type Tone =
  | 'forest' | 'ocean' | 'mountain' | 'farm' | 'lake'
  | 'heritage' | 'royal' | 'gold' | 'desert' | 'snow';

type Palette = { sky: [string, string]; far: string; mid: string; near: string; accent: string };

const PALETTES: Record<Tone, Palette> = {
  forest:   { sky: ['#cfe3d5', '#9dc4ab'], far: '#5c8f74', mid: '#2f6b52', near: '#173d2f', accent: '#e0a426' },
  ocean:    { sky: ['#cfe6ea', '#8fc3d0'], far: '#4e97a8', mid: '#2b6f85', near: '#d8c49b', accent: '#e8845c' },
  mountain: { sky: ['#d8e0e6', '#a4b9c7'], far: '#7d95a5', mid: '#4d6a7c', near: '#28394a', accent: '#e0a426' },
  farm:     { sky: ['#e9e3ca', '#cbd79c'], far: '#a8bd72', mid: '#7a9a4c', near: '#4a6b2f', accent: '#c2542c' },
  lake:     { sky: ['#d3e4e2', '#9fc7c3'], far: '#6aa39d', mid: '#3d7f7c', near: '#1d4e4a', accent: '#e0a426' },
  heritage: { sky: ['#ecdfd0', '#d3b99c'], far: '#b8916e', mid: '#8c6144', near: '#553824', accent: '#1f6f5c' },
  royal:    { sky: ['#ddd7ea', '#b0a4cc'], far: '#8878a8', mid: '#5d4c7d', near: '#35284e', accent: '#e0a426' },
  gold:     { sky: ['#f2e4c4', '#e2c586'], far: '#d1a659', mid: '#a97f36', near: '#6f4f1c', accent: '#1f6f5c' },
  desert:   { sky: ['#f0e0cb', '#dbbc93'], far: '#c49a6c', mid: '#9c7247', near: '#674628', accent: '#b4472b' },
  snow:     { sky: ['#e6eef3', '#bed3e0'], far: '#9db6c6', mid: '#6e8da0', near: '#3d5364', accent: '#b4472b' },
};

/** Which silhouette each tone draws. */
const SHAPE: Record<Tone, 'coast' | 'ridge' | 'peaks' | 'fields' | 'water' | 'fort' | 'dunes'> = {
  forest: 'ridge',
  ocean: 'coast',
  mountain: 'peaks',
  farm: 'fields',
  lake: 'water',
  heritage: 'fort',
  royal: 'fort',
  gold: 'fort',
  desert: 'dunes',
  snow: 'peaks',
};

const isTone = (t: string): t is Tone => t in PALETTES;

export function Scene({
  tone,
  seed = 0,
  className = '',
}: {
  tone: string;
  /** Shifts the silhouette so two cards side by side don't look identical. */
  seed?: number;
  className?: string;
}) {
  const key: Tone = isTone(tone) ? tone : 'forest';
  const p = PALETTES[key];
  const shape = SHAPE[key];
  const id = `sc-${key}-${seed}`;
  const s = (seed % 9) * 7 - 28; // -28..+28

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
      role="img"
      aria-label={`${key} landscape illustration`}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.sky[0]} />
          <stop offset="100%" stopColor={p.sky[1]} />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#${id}-sky)`} />
      <circle cx={300 + s / 2} cy={62 + (seed % 3) * 8} r="20" fill={p.accent} opacity="0.6" />

      {shape === 'ridge' && <Ridge p={p} s={s} />}
      {shape === 'peaks' && <Peaks p={p} s={s} />}
      {shape === 'coast' && <Coast p={p} s={s} />}
      {shape === 'fields' && <Fields p={p} s={s} />}
      {shape === 'water' && <Water p={p} s={s} />}
      {shape === 'fort' && <Fort p={p} s={s} />}
      {shape === 'dunes' && <Dunes p={p} s={s} />}

      {/* The mist band is the one element every scene shares — it ties the set
          together the way a consistent grade ties a photo set together. */}
      <rect x="0" y="182" width="400" height="10" fill="#fff" opacity="0.15" />
    </svg>
  );
}

type Part = { p: Palette; s: number };

/** Soft rounded hills with a treeline. */
function Ridge({ p, s }: Part) {
  return (
    <>
      <path d={`M0 168 Q${70 + s} 118 ${150 + s} 166 T${300 + s} 158 T400 172 L400 300 L0 300 Z`} fill={p.far} opacity="0.8" />
      <path d={`M0 206 Q${90 - s} 152 ${186 - s} 202 T${340 - s} 196 L400 214 L400 300 L0 300 Z`} fill={p.mid} />
      <path d={`M0 250 Q110 222 210 246 T400 238 L400 300 L0 300 Z`} fill={p.near} />
      {[46, 96, 150, 262, 318, 364].map((x, i) => (
        <path key={x} d={`M${x + s / 3} ${252 - (i % 2) * 6} l-9 26 h18 Z`} fill={p.near} opacity="0.85" />
      ))}
    </>
  );
}

/** Sharp angular peaks. */
function Peaks({ p, s }: Part) {
  return (
    <>
      <path d={`M0 190 L${72 + s} 96 L${132 + s} 172 L${196 + s} 108 L${268 + s} 184 L${336 + s} 128 L400 196 L400 300 L0 300 Z`} fill={p.far} opacity="0.85" />
      <path d={`M0 232 L${86 - s} 150 L${164 - s} 224 L${242 - s} 158 L${330 - s} 230 L400 190 L400 300 L0 300 Z`} fill={p.mid} />
      <path d={`M0 268 L96 226 L188 266 L286 224 L400 264 L400 300 L0 300 Z`} fill={p.near} />
      {/* snow caps */}
      <path d={`M${72 + s} 96 l-16 22 h32 Z`} fill="#fff" opacity="0.7" />
      <path d={`M${196 + s} 108 l-14 20 h28 Z`} fill="#fff" opacity="0.55" />
    </>
  );
}

/** Headland, sea, then a beach in the foreground. */
function Coast({ p, s }: Part) {
  return (
    <>
      <path d={`M0 158 L${64 + s} 124 L${128 + s} 160 L${190 + s} 132 L260 162 L400 146 L400 186 L0 186 Z`} fill={p.far} opacity="0.9" />
      <rect x="0" y="186" width="400" height="66" fill={p.mid} />
      {[198, 212, 226, 240].map((y, i) => (
        <path key={y} d={`M${-20 + i * 14 + s} ${y} q26 -7 52 0 t52 0 t52 0 t52 0 t52 0 t52 0`} stroke="#fff" strokeWidth="2" fill="none" opacity={0.3 - i * 0.05} />
      ))}
      <path d={`M0 252 Q120 240 220 252 T400 246 L400 300 L0 300 Z`} fill={p.near} />
      <path d={`M${300 + s / 2} 252 l-5 -30 l10 0 Z`} fill={p.far} opacity="0.8" />
    </>
  );
}

/** Terraced fields with crop rows. */
function Fields({ p, s }: Part) {
  return (
    <>
      <path d={`M0 172 Q${100 + s} 138 ${210 + s} 170 T400 164 L400 300 L0 300 Z`} fill={p.far} opacity="0.8" />
      <path d={`M0 214 Q120 188 240 212 T400 206 L400 300 L0 300 Z`} fill={p.mid} />
      <path d={`M0 252 Q140 232 260 252 T400 246 L400 300 L0 300 Z`} fill={p.near} />
      {[224, 236, 262, 276].map((y, i) => (
        <path key={y} d={`M0 ${y} Q140 ${y - 18} 260 ${y} T400 ${y - 5}`} stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.22" />
      ))}
      {/* a lone tree by the field edge */}
      <rect x={64 + s / 3} y="232" width="4" height="22" fill={p.near} />
      <circle cx={66 + s / 3} cy="228" r="13" fill={p.far} opacity="0.95" />
    </>
  );
}

/** Still lake with a reflected ridge. */
function Water({ p, s }: Part) {
  return (
    <>
      <path d={`M0 164 L${80 + s} 118 L${158 + s} 162 L${236 + s} 124 L${316 + s} 164 L400 138 L400 190 L0 190 Z`} fill={p.far} opacity="0.9" />
      <rect x="0" y="190" width="400" height="110" fill={p.mid} />
      {/* the reflection, flipped and faded */}
      <path d={`M0 216 L${80 + s} 262 L${158 + s} 218 L${236 + s} 256 L${316 + s} 216 L400 242 L400 190 L0 190 Z`} fill={p.far} opacity="0.28" />
      {[228, 246, 264, 282].map((y, i) => (
        <rect key={y} x={20 + i * 18} y={y} width={360 - i * 36} height="2" fill="#fff" opacity={0.22 - i * 0.04} rx="1" />
      ))}
      <path d={`M0 288 Q120 280 240 290 T400 284 L400 300 L0 300 Z`} fill={p.near} />
    </>
  );
}

/** Hilltop fort or temple silhouette. */
function Fort({ p, s }: Part) {
  const x = 150 + s / 2;
  return (
    <>
      <path d={`M0 196 Q${90 + s} 150 ${196 + s} 194 T400 186 L400 300 L0 300 Z`} fill={p.far} opacity="0.8" />
      {/* ramparts sit on the mid ridge */}
      <g fill={p.near}>
        <rect x={x} y="132" width="104" height="58" />
        {[0, 20, 40, 60, 80].map((d) => (
          <rect key={d} x={x + d} y="120" width="12" height="14" />
        ))}
        <rect x={x + 44} y="96" width="16" height="38" />
        <path d={`M${x + 40} 96 l12 -20 l12 20 Z`} />
        <rect x={x + 18} y="158" width="14" height="32" rx="7" fill={p.mid} />
        <rect x={x + 72} y="158" width="14" height="32" rx="7" fill={p.mid} />
      </g>
      <path d={`M0 226 Q120 196 240 224 T400 216 L400 300 L0 300 Z`} fill={p.mid} />
      <path d={`M0 264 Q130 244 250 264 T400 258 L400 300 L0 300 Z`} fill={p.near} />
    </>
  );
}

/** Layered sand dunes. */
function Dunes({ p, s }: Part) {
  return (
    <>
      <path d={`M0 190 Q${110 + s} 146 ${230 + s} 190 T400 180 L400 300 L0 300 Z`} fill={p.far} opacity="0.85" />
      <path d={`M0 228 Q${140 - s} 186 ${268 - s} 230 T400 220 L400 300 L0 300 Z`} fill={p.mid} />
      <path d={`M0 266 Q150 230 280 268 T400 260 L400 300 L0 300 Z`} fill={p.near} />
      {[204, 244].map((y, i) => (
        <path key={y} d={`M${20 + i * 40} ${y} Q${140 - s} ${y - 26} ${268 - s} ${y + 4}`} stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.2" />
      ))}
    </>
  );
}
