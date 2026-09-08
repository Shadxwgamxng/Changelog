import type { Metadata } from "next";
import { ShieldCheck, Users, Target, Workflow, Mail } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Über uns",
  description: "BOS_SH24 ist eine unabhängige Presseagentur für Berichte aus dem Bereich Feuerwehr, Rettungsdienst und Polizei.",
};

export default async function AboutPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <section className="border-b border-ink-200 bg-ink-900 py-16 text-white dark:border-ink-800">
        <div className="container-page text-center">
          <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-brand-400" />
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Über {settings.siteName}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-ink-300">{settings.description}</p>
        </div>
      </section>

      <section className="container-page grid gap-8 py-14 md:grid-cols-2 lg:py-16">
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <Users className="mb-3 h-7 w-7 text-brand-600" />
          <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Wer wir sind</h2>
          <p className="mt-2 text-ink-600 dark:text-ink-400">
            BOS_SH24 ist eine unabhängige, redaktionell arbeitende Presseagentur, die sich auf Berichterstattung
            rund um Behörden und Organisationen mit Sicherheitsaufgaben (BOS) spezialisiert hat. Unser Team aus
            ehrenamtlichen und hauptamtlichen Redakteur:innen berichtet vor Ort von Einsätzen, Übungen und
            Veranstaltungen in der Region.
          </p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <Target className="mb-3 h-7 w-7 text-brand-600" />
          <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Was wir machen</h2>
          <p className="mt-2 text-ink-600 dark:text-ink-400">
            Wir dokumentieren Einsatzgeschehen von Feuerwehr, Rettungsdienst, Polizei und Katastrophenschutz,
            veröffentlichen Pressemitteilungen der Organisationen und informieren über öffentliche
            Veranstaltungen – sachlich, zeitnah und unabhängig.
          </p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <Workflow className="mb-3 h-7 w-7 text-brand-600" />
          <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Unsere Aufgaben</h2>
          <p className="mt-2 text-ink-600 dark:text-ink-400">
            Neben der aktuellen Berichterstattung unterstützen wir Organisationen bei der Öffentlichkeitsarbeit,
            erstellen Bild- und Textmaterial für Pressemitteilungen und pflegen einen engen Austausch mit
            Leitstellen, Einsatzkräften und Veranstalter:innen.
          </p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <ShieldCheck className="mb-3 h-7 w-7 text-brand-600" />
          <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Unsere Arbeitsweise</h2>
          <p className="mt-2 text-ink-600 dark:text-ink-400">
            Wir arbeiten presserechtlich sorgfältig, prüfen Quellen und respektieren die Persönlichkeitsrechte
            Betroffener. Sensible Einsatzdaten veröffentlichen wir grundsätzlich erst nach Freigabe durch die
            zuständigen Stellen.
          </p>
        </div>
      </section>

      <section className="container-page pb-16 text-center">
        <Mail className="mx-auto mb-3 h-7 w-7 text-brand-600" />
        <h2 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Kontaktmöglichkeiten</h2>
        <p className="mx-auto mt-2 max-w-xl text-ink-600 dark:text-ink-400">
          Für Presseanfragen, Hinweise oder Kooperationen erreichst du uns jederzeit über unser Kontaktformular
          oder direkt per E-Mail unter {settings.contactEmail}.
        </p>
        <LinkButton href="/kontakt" size="lg" className="mt-6">Zum Kontaktformular</LinkButton>
      </section>
    </div>
  );
}
