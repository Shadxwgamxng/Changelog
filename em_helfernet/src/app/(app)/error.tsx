"use client";
import Link from "next/link";
import { useEffect } from "react";

/** Fängt Fehler in Seiten ab (z. B. fehlende Berechtigung) und zeigt eine verständliche Meldung statt einer Fehlerseite. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-4xl" aria-hidden>🔒</p>
      <h1 className="mt-3 text-xl font-semibold">Das hat nicht geklappt</h1>
      <p className="mt-2 text-sm text-fg-muted">Entweder fehlt dir für diesen Bereich die Berechtigung, oder es ist ein Fehler aufgetreten. Bei fehlenden Rechten wende dich an die Leitung deiner Einheit.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-fg-subtle">Fehlerkennung: {error.digest}</p>}
      <div className="mt-5 flex justify-center gap-2"><button onClick={reset} className="btn">Erneut versuchen</button><Link href="/" className="btn btn-primary">Zur Startseite</Link></div>
    </div>
  );
}
