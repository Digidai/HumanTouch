import type { Metadata } from "next";
import { Crimson_Pro, Outfit } from "next/font/google";
import "./globals.css";

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "HumanTouch - AI 内容人性化处理",
  description: "将 AI 生成的文本转换为更自然的人类写作风格，有效降低 AI 检测概率",
  keywords: ["AI", "人性化", "文本处理", "AI检测", "内容优化"],
  authors: [{ name: "HumanTouch Team" }],
  openGraph: {
    title: "HumanTouch - AI 内容人性化处理",
    description: "将 AI 生成的文本转换为更自然的人类写作风格",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${crimsonPro.variable} ${outfit.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
