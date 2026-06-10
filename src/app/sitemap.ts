import type { MetadataRoute } from 'next';
import { allToolMetadata } from '@/lib/tools/metadata';

const staticRoutes: Array<{
  route: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
}> = [
  { route: '', changeFrequency: 'weekly', priority: 1 },
  { route: '/tools', changeFrequency: 'weekly', priority: 0.95 },
  { route: '/audit', changeFrequency: 'weekly', priority: 0.9 },
  { route: '/labs', changeFrequency: 'monthly', priority: 0.8 },
  { route: '/tools/compare', changeFrequency: 'monthly', priority: 0.75 },
  { route: '/about', changeFrequency: 'yearly', priority: 0.5 },
  { route: '/history', changeFrequency: 'yearly', priority: 0.3 },
  { route: '/reports', changeFrequency: 'yearly', priority: 0.3 },
  { route: '/settings', changeFrequency: 'yearly', priority: 0.3 },
  { route: '/labs/auth-bypass', changeFrequency: 'monthly', priority: 0.7 },
  { route: '/labs/csrf', changeFrequency: 'monthly', priority: 0.7 },
  { route: '/labs/sql-injection', changeFrequency: 'monthly', priority: 0.7 },
  { route: '/labs/xss', changeFrequency: 'monthly', priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const now = new Date();

  return [
    ...staticRoutes.map(({ route, changeFrequency, priority }) => ({
      url: `${baseUrl}${route}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...allToolMetadata.map((tool) => ({
      url: `${baseUrl}/tools/${tool.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
  ];
}
