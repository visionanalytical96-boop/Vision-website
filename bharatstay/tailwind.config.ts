import type { Config } from 'tailwindcss';

// The design system lives in src/app/globals.css as CSS custom properties, so
// components can read the same tokens in inline styles and in media queries.
// Tailwind is kept here purely for layout utilities.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-data)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
