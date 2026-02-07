import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';
import { getLocaleAlternates, getLocalizedUrl } from '@/lib/seo';

const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: getLocalizedUrl(locale),
    lastModified,
    changeFrequency: 'daily',
    priority: locale === 'zh' ? 1 : 0.9,
    alternates: {
      languages: getLocaleAlternates('/'),
    },
  }));
}

