import { getSiteSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Website-Einstellungen" };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Website-Einstellungen</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
