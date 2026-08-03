import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';

/**
 * The glass look, stored as settings rather than baked into CSS, so the admin
 * can retune it from the site itself. Each entry maps 1:1 onto a CSS variable
 * that globals.css already consumes.
 */
export const THEME_FIELDS = [
  { key: 'glassBlur', css: '--glass-blur', label: 'Blur', hint: 'Kitna dhundhla — zyada matlab zyada frosted', unit: 'px', type: 'range', min: 0, max: 40, step: 1, fallback: '18' },
  // Low by default: a white tint at high alpha turns the panel into a pale slab
  // and the light text on it stops being readable.
  { key: 'glassAlpha', css: '--glass-alpha', label: 'Transparency', hint: '0 = poori tarah paardarshi, 1 = solid', unit: '', type: 'range', min: 0.05, max: 0.95, step: 0.05, fallback: '0.15' },
  { key: 'glassBorder', css: '--glass-border', label: 'Border shine', hint: 'Kinare ki chamak', unit: '', type: 'range', min: 0, max: 0.6, step: 0.02, fallback: '0.22' },
  { key: 'glassRadius', css: '--glass-radius', label: 'Corner round', hint: 'Kone kitne gol', unit: 'px', type: 'range', min: 0, max: 40, step: 2, fallback: '20' },
  { key: 'glassFloat', css: '--glass-float', label: 'Floating', hint: '0 = bilkul flat, 1 = pura floating', unit: '', type: 'range', min: 0, max: 1.6, step: 0.1, fallback: '1' },
  { key: 'glassTint', css: '--glass-tint', label: 'Glass tint', hint: 'Panel ka rang', unit: '', type: 'color', fallback: '255 255 255' },
  { key: 'glassBgFrom', css: '--glass-bg-from', label: 'Background upar', hint: '', unit: '', type: 'hex', fallback: '#0d1f1a' },
  { key: 'glassBgTo', css: '--glass-bg-to', label: 'Background neeche', hint: '', unit: '', type: 'hex', fallback: '#16352c' },
  { key: 'glassAccent', css: '--glass-accent', label: 'Glow colour', hint: 'Background ki roshni', unit: '', type: 'hex', fallback: '#e0a426' },
] as const;

export type ThemeField = (typeof THEME_FIELDS)[number];

export const getTheme = cache(async (): Promise<Record<string, string>> => {
  const rows = await db.siteSetting.findMany({ where: { key: { in: THEME_FIELDS.map((f) => f.key) } } });
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(THEME_FIELDS.map((f) => [f.key, stored[f.key] ?? f.fallback]));
});

/** Renders the saved theme as a style attribute value for the page root. */
export function themeToStyle(theme: Record<string, string>): Record<string, string> {
  const style: Record<string, string> = {};
  for (const f of THEME_FIELDS) {
    const raw = theme[f.key] ?? f.fallback;
    style[f.css] = f.unit ? `${raw}${f.unit}` : raw;
  }
  return style;
}
