import Link from "next/link";
import { Facebook, Instagram, Youtube, ShieldCheck } from "lucide-react";
import type { SiteSettings } from "@prisma/client";
import { NewsletterForm } from "./NewsletterForm";

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
    <path d="M16.6 5.82c-1-.98-1.56-2.3-1.56-3.68h-3.3v13.6c0 1.6-1.3 2.9-2.9 2.9a2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.3 0 .58.04.85.12v-3.36a6.2 6.2 0 0 0-.85-.06A6.24 6.24 0 0 0 2.6 15.74a6.24 6.24 0 0 0 6.24 6.24 6.24 6.24 0 0 0 6.24-6.24V9.01a9.5 9.5 0 0 0 5.36 1.65V7.36a5.9 5.9 0 0 1-3.84-1.54z" />
  </svg>
);

export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="border-t border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-950">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-extrabold text-ink-900 dark:text-white">{settings.siteName}</span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-ink-600 dark:text-ink-400">{settings.footerText}</p>
          <div className="mt-4 flex gap-2">
            {settings.facebookUrl && (
              <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink-600 shadow-card hover:text-brand-600 dark:bg-ink-900 dark:text-ink-300">
                <Facebook className="h-[18px] w-[18px]" />
              </a>
            )}
            {settings.instagramUrl && (
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink-600 shadow-card hover:text-brand-600 dark:bg-ink-900 dark:text-ink-300">
                <Instagram className="h-[18px] w-[18px]" />
              </a>
            )}
            {settings.youtubeUrl && (
              <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink-600 shadow-card hover:text-brand-600 dark:bg-ink-900 dark:text-ink-300">
                <Youtube className="h-[18px] w-[18px]" />
              </a>
            )}
            {settings.tiktokUrl && (
              <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink-600 shadow-card hover:text-brand-600 dark:bg-ink-900 dark:text-ink-300">
                <TikTokIcon />
              </a>
            )}
            {settings.xUrl && (
              <a href={settings.xUrl} target="_blank" rel="noopener noreferrer" aria-label="X" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink-600 shadow-card hover:text-brand-600 dark:bg-ink-900 dark:text-ink-300">
                <XIcon />
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Navigation</h3>
          <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-400">
            <li><Link href="/" className="hover:text-brand-600">Startseite</Link></li>
            <li><Link href="/beitraege" className="hover:text-brand-600">Beiträge</Link></li>
            <li><Link href="/veranstaltungen" className="hover:text-brand-600">Veranstaltungen</Link></li>
            <li><Link href="/ueber-uns" className="hover:text-brand-600">Über uns</Link></li>
            <li><Link href="/kontakt" className="hover:text-brand-600">Kontakt</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Rechtliches</h3>
          <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-400">
            <li><Link href="/impressum" className="hover:text-brand-600">Impressum</Link></li>
            <li><Link href="/datenschutz" className="hover:text-brand-600">Datenschutz</Link></li>
            <li><Link href="/cookie-einstellungen" className="hover:text-brand-600">Cookie-Einstellungen</Link></li>
          </ul>
          <div className="mt-4 space-y-1 text-sm text-ink-600 dark:text-ink-400">
            <p>{settings.contactEmail}</p>
            <p>{settings.contactPhone}</p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Newsletter</h3>
          <p className="mb-3 text-sm text-ink-600 dark:text-ink-400">
            Bleib informiert über aktuelle Einsätze und Pressemitteilungen.
          </p>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-ink-200 py-5 text-center text-xs text-ink-500 dark:border-ink-800 dark:text-ink-500">
        © {new Date().getFullYear()} {settings.siteName}. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
