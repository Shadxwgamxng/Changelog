"use client";

import { Button } from "@/components/ui/button";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
      <p className="label-caps text-danger">Unerwarteter Fehler</p>
      <h1 className="text-2xl font-semibold uppercase">Da ist etwas schiefgelaufen</h1>
      <p className="max-w-md text-sm text-muted">Die Seite konnte nicht geladen werden. Bitte versuche es erneut. Besteht das Problem weiter, melde dich bei der Teamleitung.</p>
      {error.digest && <p className="text-xs text-subtle">Fehlercode: {error.digest}</p>}
      <Button variant="primary" onClick={reset} className="mt-3">
        Erneut versuchen
      </Button>
    </div>
  );
}
