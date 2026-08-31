import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DM_Sans } from 'next/font/google';

import { Providers } from './providers';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'CARATOM Ops',
  description: 'CARATOM desk operations plane',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} bg-canvas text-text antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
