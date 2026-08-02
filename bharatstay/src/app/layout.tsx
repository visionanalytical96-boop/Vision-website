import type { Metadata } from 'next';
import { Bricolage_Grotesque, Instrument_Sans, DM_Mono } from 'next/font/google';
import './globals.css';
import { getTheme, themeToStyle } from '@/lib/theme';

// Display face carries the personality; body stays readable; mono is used for
// real timetable data — distances, times, fares — not for decoration.
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Instrument_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const data = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-data', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'BharatStay — Maharashtra ke stays, restaurants aur weekend trips',
    template: '%s · BharatStay',
  },
  description:
    'Badlapur se Karjat, Lonavala se Konkan — farmhouse, villa, hotel aur asli Maharashtrian khana, sab ek jagah. Ghar se ek ghante ke andar.',
  openGraph: {
    title: 'BharatStay — Maharashtra, ghar ke paas se shuru',
    description: 'Farmhouse, villa, hotel aur restaurants — Badlapur–Karjat belt se poore Maharashtra tak.',
    siteName: 'BharatStay',
    locale: 'en_IN',
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read once per render so an admin theme change shows up on the next load
  // without a redeploy.
  const theme = await getTheme();

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${data.variable}`}
      style={themeToStyle(theme) as React.CSSProperties}
    >
      <body className="glass-root min-h-screen antialiased">{children}</body>
    </html>
  );
}
