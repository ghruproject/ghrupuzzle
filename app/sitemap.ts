import type { MetadataRoute } from 'next';
import { PARTICIPANT_GUIDES } from '@/lib/generated-guides';
import { SITE_URL } from '@/lib/seo';

const publicRoutes = [
  { path: '/', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/practice', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/challenge', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/guides', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/assembly/practice', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/hybrid-assembly/practice', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/typing/practice', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/outbreak/practice', priority: 0.8, changeFrequency: 'monthly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const guideRoutes = PARTICIPANT_GUIDES.map((guide) => ({
    url: new URL(`/guides/${guide.slug}`, SITE_URL).toString(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...publicRoutes.map((route) => ({
      url: new URL(route.path, SITE_URL).toString(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...guideRoutes,
  ];
}
