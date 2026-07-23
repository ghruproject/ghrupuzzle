import React from 'react';
import type { Metadata } from 'next';
import { SiteShell } from '@/components/site-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'GHRU puzzles for microbial genomes',
  description: 'Controlled genomics exercises for assembly, typing, outbreak analysis, and hybrid workflows.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('gx-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}",
          }}
        />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
