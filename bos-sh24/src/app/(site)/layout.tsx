import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSiteSettings } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <Header siteName={settings.siteName} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </div>
  );
}
