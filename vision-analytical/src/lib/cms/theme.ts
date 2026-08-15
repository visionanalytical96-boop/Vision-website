// Curated font & button-style choices for the Theme Customizer. Kept to a small,
// pre-loaded set (rather than free-text font names) because next/font/google
// requires statically-analyzable imports - fonts can't be loaded by an
// arbitrary runtime string.

export interface FontOption {
  key: string;
  label: string;
  cssVar: string;
}

export const HEADING_FONT_OPTIONS: FontOption[] = [
  { key: 'syne', label: 'Syne', cssVar: '--font-syne' },
  { key: 'poppins', label: 'Poppins', cssVar: '--font-poppins' },
  { key: 'playfair-display', label: 'Playfair Display', cssVar: '--font-playfair-display' },
  { key: 'space-grotesk', label: 'Space Grotesk', cssVar: '--font-space-grotesk' },
];

export const BODY_FONT_OPTIONS: FontOption[] = [
  { key: 'space-grotesk', label: 'Space Grotesk', cssVar: '--font-space-grotesk' },
  { key: 'inter', label: 'Inter', cssVar: '--font-inter' },
  { key: 'roboto', label: 'Roboto', cssVar: '--font-roboto' },
  { key: 'work-sans', label: 'Work Sans', cssVar: '--font-work-sans' },
];

export interface ButtonStyleOption {
  key: string;
  label: string;
  radius: string;
}

export const BUTTON_STYLE_OPTIONS: ButtonStyleOption[] = [
  { key: 'rounded', label: 'Rounded', radius: '0.5rem' },
  { key: 'pill', label: 'Pill', radius: '9999px' },
  { key: 'square', label: 'Square', radius: '0.125rem' },
];

export const HEADING_FONT_KEYS = HEADING_FONT_OPTIONS.map((option) => option.key) as [string, ...string[]];
export const BODY_FONT_KEYS = BODY_FONT_OPTIONS.map((option) => option.key) as [string, ...string[]];
export const BUTTON_STYLE_KEYS = BUTTON_STYLE_OPTIONS.map((option) => option.key) as [string, ...string[]];

export function headingFontCssVar(key: string): string {
  return HEADING_FONT_OPTIONS.find((option) => option.key === key)?.cssVar ?? HEADING_FONT_OPTIONS[0].cssVar;
}

export function bodyFontCssVar(key: string): string {
  return BODY_FONT_OPTIONS.find((option) => option.key === key)?.cssVar ?? BODY_FONT_OPTIONS[0].cssVar;
}

export function buttonRadius(key: string): string {
  return BUTTON_STYLE_OPTIONS.find((option) => option.key === key)?.radius ?? BUTTON_STYLE_OPTIONS[0].radius;
}
