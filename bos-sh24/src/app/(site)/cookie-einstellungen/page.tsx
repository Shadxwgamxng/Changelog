import type { Metadata } from "next";
import { CookieSettingsForm } from "@/components/site/CookieSettingsForm";

export const metadata: Metadata = { title: "Cookie-Einstellungen" };

export default function CookieSettingsPage() {
  return (
    <div className="container-page max-w-2xl py-10 lg:py-14">
      <h1 className="mb-4 font-display text-3xl font-extrabold text-ink-900 dark:text-white">Cookie-Einstellungen</h1>
      <p className="mb-8 text-ink-600 dark:text-ink-400">
        BOS_SH24 verwendet ausschließlich technisch notwendige Cookies, um grundlegende Funktionen wie die
        Anmeldung und deine Design-Einstellungen bereitzustellen. Optionale Cookies für Statistik oder Marketing
        werden nur mit deiner Zustimmung gesetzt.
      </p>
      <CookieSettingsForm />
    </div>
  );
}
