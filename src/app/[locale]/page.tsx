import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen">
      <Header />
      <Dashboard />
    </div>
  );
}
