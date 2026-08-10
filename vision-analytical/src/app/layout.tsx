import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Space_Grotesk, Syne, JetBrains_Mono, Poppins, Playfair_Display, Inter, Roboto, Work_Sans } from 'next/font/google';
import { getThemeSettings } from '@/lib/data/cms';
import { headingFontCssVar, bodyFontCssVar, buttonRadius } from '@/lib/cms/theme';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const roboto = Roboto({
  variable: '--font-roboto',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

const workSans = Work_Sans({
  variable: '--font-work-sans',
  subsets: ['latin'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const defaultTitle = 'Vision Analytical | Laboratory Instruments, Spares & Service';
const defaultDescription =
  'Analytical instrument sales, refurbished HPLC/GC/LC-MS/UV systems, spare parts, AMC/CMC service, calibration and IQ/OQ/PQ qualification across Maharashtra & Gujarat.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: '%s | Vision Analytical',
  },
  description: defaultDescription,
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Vision Analytical',
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
  },
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const theme = await getThemeSettings();
  const primaryColor = theme?.primaryColor ?? '#2563eb';
  const secondaryColor = theme?.secondaryColor ?? '#22d3ee';
  const fontHeading = theme?.fontHeading ?? 'syne';
  const fontBody = theme?.fontBody ?? 'space-grotesk';
  const buttonStyle = theme?.buttonStyle ?? 'rounded';
  const animationsEnabled = theme?.animationsEnabled ?? true;

  const themeStyle = {
    '--primary': primaryColor,
    '--secondary': secondaryColor,
    '--font-display': `var(${headingFontCssVar(fontHeading)})`,
    '--font-sans': `var(${bodyFontCssVar(fontBody)})`,
    '--btn-radius': buttonRadius(buttonStyle),
  } as CSSProperties;

  const fontVariables = `${spaceGrotesk.variable} ${syne.variable} ${jetbrainsMono.variable} ${poppins.variable} ${playfairDisplay.variable} ${inter.variable} ${roboto.variable} ${workSans.variable}`;

  return (
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased${animationsEnabled ? '' : ' no-animations'}`}
      style={themeStyle}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
