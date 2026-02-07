import type { Metadata } from 'next';
import { Crimson_Pro, Noto_Sans_SC, Outfit } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { Providers } from '@/components/Providers';
import { locales, type Locale } from '@/i18n/config';
import { siteConfig } from '@/lib/seo';
import './globals.css';

const crimsonPro = Crimson_Pro({
  variable: '--font-crimson',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const notoSansSC = Noto_Sans_SC({
  variable: '--font-noto-sc',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestLocale = await getLocale().catch(() => siteConfig.defaultLocale);
  const locale = locales.includes(requestLocale as Locale)
    ? (requestLocale as Locale)
    : siteConfig.defaultLocale;
  const htmlLang = locale === 'zh' ? 'zh-CN' : 'en';

  return (
    <html
      lang={htmlLang}
      className={`${crimsonPro.variable} ${outfit.variable} ${notoSansSC.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
