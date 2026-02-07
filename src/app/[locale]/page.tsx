import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { locales, type Locale } from '@/i18n/config';
import { getLocalizedUrl, siteConfig } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  if (!locales.includes(typedLocale)) {
    notFound();
  }

  setRequestLocale(typedLocale);
  const pageUrl = getLocalizedUrl(typedLocale);
  const inLanguage = typedLocale === 'zh' ? 'zh-CN' : 'en-US';
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.siteUrl}#website`,
        name: siteConfig.name,
        url: siteConfig.siteUrl,
        inLanguage,
      },
      {
        '@type': 'SoftwareApplication',
        name: siteConfig.name,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        inLanguage,
        url: pageUrl,
        description:
          typedLocale === 'zh'
            ? '将 AI 生成的文本转换为更自然的人类写作风格，有效降低 AI 检测概率。'
            : 'Transform AI-generated text into natural human writing style and reduce AI detection rates.',
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header />
      <Dashboard />
    </div>
  );
}
