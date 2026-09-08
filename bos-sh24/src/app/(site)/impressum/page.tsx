import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { sanitizeArticleHtml } from "@/lib/sanitize";

export const metadata: Metadata = { title: "Impressum" };

export default async function ImprintPage() {
  const settings = await getSiteSettings();
  return (
    <div className="container-page max-w-3xl py-10 lg:py-14">
      <h1 className="mb-6 font-display text-3xl font-extrabold text-ink-900 dark:text-white">Impressum</h1>
      <div className="prose-article" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(settings.impressumContent) }} />
    </div>
  );
}
