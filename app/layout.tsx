import type {Metadata} from 'next';
import { Analytics } from '@vercel/analytics/react';
import { Inter, Cinzel } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '500', '700', '900'],
});

export const metadata: Metadata = {
  title: 'The Chamber of Devil — Interactive Game & Simulator',
  description: 'An immersive digital companion, smart rulebook, and AI-powered solo simulator for the gothic tabletop social deduction game, The Chamber of Devil.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <body className="bg-[#0a0a0b] text-[#f1f3f5] font-sans antialiased selection:bg-red-900 selection:text-white" suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
