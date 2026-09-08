"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface Consent {
  necessary: true;
  statistics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = "bos-sh24-cookie-consent";

export function CookieSettingsForm() {
  const [consent, setConsent] = useState<Consent>({ necessary: true, statistics: false, marketing: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setConsent(JSON.parse(stored));
    } catch {
      // localStorage evtl. nicht verfügbar
    }
  }, []);

  function save(next: Consent) {
    setConsent(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignorieren
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-ink-200 p-4 dark:border-ink-800">
        <div>
          <p className="font-medium text-ink-900 dark:text-white">Technisch notwendig</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">Immer aktiv – erforderlich für Login und Sicherheit.</p>
        </div>
        <input type="checkbox" checked disabled className="h-5 w-5 rounded border-ink-300" />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-ink-200 p-4 dark:border-ink-800">
        <div>
          <p className="font-medium text-ink-900 dark:text-white">Statistik</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">Hilft uns, die Nutzung der Seite anonymisiert zu verstehen.</p>
        </div>
        <input
          type="checkbox"
          checked={consent.statistics}
          onChange={(e) => setConsent((c) => ({ ...c, statistics: e.target.checked }))}
          className="h-5 w-5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-ink-200 p-4 dark:border-ink-800">
        <div>
          <p className="font-medium text-ink-900 dark:text-white">Marketing</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">Wird aktuell nicht verwendet, kann optional aktiviert werden.</p>
        </div>
        <input
          type="checkbox"
          checked={consent.marketing}
          onChange={(e) => setConsent((c) => ({ ...c, marketing: e.target.checked }))}
          className="h-5 w-5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => save(consent)}>Einstellungen speichern</Button>
        {saved && <span className="text-sm font-medium text-emerald-600">Gespeichert!</span>}
      </div>
    </div>
  );
}
