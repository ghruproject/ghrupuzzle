import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/dashboard',
        '/forgot-password',
        '/register',
        '/reset-password',
        '/review',
        '/sign-in',
        '/set-password',
        '/verify/',
      ],
    },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
    host: SITE_URL.origin,
  };
}
