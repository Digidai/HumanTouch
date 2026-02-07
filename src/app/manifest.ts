import type { MetadataRoute } from 'next';
import { getLocalizedPath, siteConfig } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: getLocalizedPath(siteConfig.defaultLocale),
    display: 'standalone',
    background_color: '#fff8f4',
    theme_color: '#f97362',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

