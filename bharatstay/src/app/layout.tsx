import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'BharatStay — India\'s Complete Travel Booking Platform',
    template: '%s | BharatStay',
  },
  description:
    'Book hotels, resorts, villas, homestays, farm-stays, flights, buses, cabs and holiday packages across India with BharatStay. Explore India. Stay Your Way.',
  openGraph: {
    title: 'BharatStay — India\'s Complete Travel Booking Platform',
    description: 'From tickets to stays, everything in one place.',
    siteName: 'BharatStay',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
