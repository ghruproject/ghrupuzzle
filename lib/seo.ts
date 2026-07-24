import type { Metadata } from 'next';

export const SITE_NAME = 'GHRUPUZZLES';
export const SITE_URL = new URL('https://ghrupuzzle.vercel.app');
export const SITE_DESCRIPTION =
  'Complex simulated microbial genomics datasets for testing analytical proficiency and bioinformatics pipelines.';
export const SITE_VALUE_PROPOSITION =
  'Test your bioinformatics pipelines, assess your team’s proficiency and identify areas for improvement using realistic, reproducible tasks.';

interface PublicPageMetadataOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}

export function publicPageMetadata({
  title,
  description,
  path,
  keywords,
}: PublicPageMetadataOptions): Metadata {
  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: 'website',
      locale: 'en_GB',
      url: path,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
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
      title: `${title} | ${SITE_NAME}`,
      description,
      images: ['/twitter-image'],
    },
  };
}

export function privatePageMetadata(title: string, description?: string): Metadata {
  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nocache: true,
    },
  };
}
