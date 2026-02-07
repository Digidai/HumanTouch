import { defaultLocale, locales, type Locale } from '@/i18n/config';

const FALLBACK_SITE_URL = 'https://humantouch.ai';

function normalizeSiteUrl(value: string): string {
  const normalized = value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`;

  try {
    return new URL(normalized).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const siteConfig = {
  name: 'HumanTouch',
  description: 'Transform AI-generated text into natural human writing style',
  siteUrl: normalizeSiteUrl(
    process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || FALLBACK_SITE_URL
  ),
  defaultLocale,
  locales,
};

export function getLocalizedPath(locale: Locale, pathname = '/'): string {
  const safePath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (safePath === '/') {
    return `/${locale}`;
  }
  return `/${locale}${safePath}`;
}

export function getLocalizedUrl(locale: Locale, pathname = '/'): string {
  return `${siteConfig.siteUrl}${getLocalizedPath(locale, pathname)}`;
}

export function getLocaleAlternates(pathname = '/'): Record<string, string> {
  return {
    'en-US': getLocalizedPath('en', pathname),
    'zh-CN': getLocalizedPath('zh', pathname),
    'x-default': getLocalizedPath(siteConfig.defaultLocale, pathname),
  };
}

