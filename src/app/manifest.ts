import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CyberKit',
    short_name: 'CyberKit',
    description: 'A unified cybersecurity toolkit for defensive analysis and learning.',
    start_url: '/',
    display: 'standalone',
    background_color: '#06080f',
    theme_color: '#00f0ff',
  };
}
