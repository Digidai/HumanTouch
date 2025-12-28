import type { Metadata } from "next";
import { Crimson_Pro, Outfit, Noto_Sans_SC } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Providers } from "@/components/Providers";
import { locales, type Locale } from "@/i18n/config";
import "../globals.css";

// English display font
const crimsonPro = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// English body font
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

// Chinese font
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const messages = await getMessages();
  const metadata = messages.metadata as Record<string, string>;

  return {
    title: metadata?.title || "HumanTouch - AI Content Humanization",
    description: metadata?.description || "Transform AI-generated text into natural human writing style",
    keywords: metadata?.keywords?.split(",") || ["AI", "humanization", "text processing"],
    authors: [{ name: "HumanTouch Team" }],
    openGraph: {
      title: metadata?.title || "HumanTouch - AI Content Humanization",
      description: metadata?.description || "Transform AI-generated text into natural human writing style",
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the locale
  const messages = await getMessages();

  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      className={`${crimsonPro.variable} ${outfit.variable} ${notoSansSC.variable}`}
    >
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
