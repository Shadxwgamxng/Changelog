import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { ContactForm } from "@/components/site/ContactForm";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Presseanfragen, Hinweise oder Feedback an die Redaktion von BOS_SH24 – wir freuen uns über deine Nachricht.",
};

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">Kontakt &amp; Presseanfragen</h1>
        <p className="mt-3 text-ink-600 dark:text-ink-400">
          Du hast eine Meldung, ein Bildmaterial, eine Presseanfrage oder Feedback für uns?
          Schreib uns – die Redaktion meldet sich schnellstmöglich zurück.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900 lg:col-span-2">
          <ContactForm />
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900/40">
            <h2 className="mb-3 font-display font-bold text-ink-900 dark:text-white">Redaktion</h2>
            <div className="space-y-3 text-sm text-ink-600 dark:text-ink-400">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-600" /> {settings.contactEmail}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-600" /> {settings.contactPhone}</p>
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {settings.contactAddress}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-200 p-5 text-sm text-ink-600 dark:border-ink-800 dark:text-ink-400">
            Wir sind für Presseanfragen in der Regel innerhalb von 24 Stunden an Werktagen erreichbar.
          </div>
        </aside>
      </div>
    </div>
  );
}
