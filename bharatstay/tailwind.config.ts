import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep royal blue — trust, headers, primary text on light bg
        royal: {
          50: '#eef2fb',
          100: '#d6e0f5',
          200: '#aec1eb',
          300: '#7f9cdd',
          400: '#4f6fca',
          500: '#2c48ac',
          600: '#1c2f6b',
          700: '#16265a',
          800: '#101c44',
          900: '#0b132e',
        },
        // Saffron/orange — CTAs
        saffron: {
          50: '#fff6ea',
          100: '#ffe8c4',
          200: '#ffd08c',
          300: '#ffb454',
          400: '#ff9d29',
          500: '#f47e1e',
          600: '#d9640f',
          700: '#b34c0a',
          800: '#8c3a0a',
          900: '#6f2f0b',
        },
        // Soft green — success/confirmed
        success: {
          50: '#eefbf3',
          100: '#d3f5e0',
          500: '#1f9d63',
          600: '#188050',
          700: '#146842',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f5f6fa',
          card: '#f8f9fc',
          border: '#e6e8f0',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 10px rgba(11, 19, 46, 0.06)',
        'card-hover': '0 10px 30px rgba(11, 19, 46, 0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
