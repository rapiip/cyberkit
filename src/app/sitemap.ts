import type { MetadataRoute } from 'next';
import { allToolMetadata } from '@/lib/tools/metadata';

const staticRoutes = [
  '',
  '/about',
  '/audit',
  '/history',
  '/labs',
  '/labs/auth-bypass',
  '/labs/csrf',
  '/labs/sql-injection',
  '/labs/xss',
  '/reports',
  '/settings',
  '/tools',
  '/tools/compare',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const now = new Date();

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: now,
    })),
    ...allToolMetadata.map((tool) => ({
      url: `${baseUrl}/tools/${tool.slug}`,
      lastModified: now,
    })),
  ];
}
