import React from 'react';
import type { Metadata } from 'next';
import { SiteShell } from '@/components/site-shell';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: `${SITE_NAME} | Microbial genomics exercises`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'microbial genomics',
    'bioinformatics benchmarking',
    'genome assembly',
    'hybrid assembly',
    'bacterial genotyping',
    'outbreak analysis',
    'pipeline validation',
    'simulated genomic datasets',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'science',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Microbial genomics exercises`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME}: microbial genomics practice and challenge exercises`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Microbial genomics exercises`,
    description: SITE_DESCRIPTION,
    images: ['/twitter-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL.origin}/#website`,
      url: SITE_URL.origin,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: 'en-GB',
    },
    {
      '@type': 'ItemList',
      '@id': `${SITE_URL.origin}/#practice-exercises`,
      name: 'Microbial genomics practice exercises',
      numberOfItems: 4,
      itemListElement: [
        ['Short-read assembly', '/assembly/practice'],
        ['Hybrid assembly', '/hybrid-assembly/practice'],
        ['Genotyping', '/typing/practice'],
        ['Outbreak analysis', '/outbreak/practice'],
      ].map(([name, path], index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'LearningResource',
          name,
          url: new URL(path, SITE_URL).toString(),
          learningResourceType: 'Practice exercise',
          educationalLevel: 'Professional',
          isAccessibleForFree: true,
          about: 'Microbial genomics',
        },
      })),
    },
  ],
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
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
