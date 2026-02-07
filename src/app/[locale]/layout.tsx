import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { getLocaleAlternates, getLocalizedPath, getLocalizedUrl, siteConfig } from '@/lib/seo';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const DEFAULT_TITLE = 'HumanTouch - AI Content Humanization';
const DEFAULT_DESCRIPTION = 'Transform AI-generated text into natural human writing style';
const DEFAULT_KEYWORDS = ['AI', 'humanization', 'text processing'];
const LOCALE_TO_OG: Record<Locale, string> = {
  en: 'en_US',
  zh: 'zh_CN',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  if (!locales.includes(typedLocale)) {
    return {};
  }

  const messages = await getMessages({ locale: typedLocale });
  const metadata = messages.metadata as Record<string, string> | undefined;
  const title = metadata?.title || DEFAULT_TITLE;
  const description = metadata?.description || DEFAULT_DESCRIPTION;
  const keywords =
    metadata?.keywords
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) || DEFAULT_KEYWORDS;
  const canonicalPath = getLocalizedPath(typedLocale);
  const ogImage = '/images/banner.svg';

  return {
    title,
    description,
    keywords,
    authors: [{ name: 'HumanTouch Team' }],
    alternates: {
      canonical: canonicalPath,
      languages: getLocaleAlternates('/'),
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: getLocalizedUrl(typedLocale),
      siteName: siteConfig.name,
      locale: LOCALE_TO_OG[typedLocale],
      alternateLocale: locales.filter((item) => item !== typedLocale).map((item) => LOCALE_TO_OG[item]),
      images: [
        {
          url: ogImage,
          width: 1280,
          height: 720,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
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
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  // Validate locale
  if (!locales.includes(typedLocale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(typedLocale);

  // Get messages for the locale
  const messages = await getMessages({ locale: typedLocale });

  return (
    <NextIntlClientProvider locale={typedLocale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
