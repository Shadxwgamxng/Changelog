import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="label-caps text-accent-400">Fehler 404</p>
      <h1 className="text-3xl font-semibold uppercase">Nicht gefunden</h1>
      <p className="max-w-md text-sm text-muted">Diese Seite existiert nicht oder du hast keinen Zugriff darauf.</p>
      <ButtonLink href="/" variant="primary" className="mt-3">
        Zum Dashboard
      </ButtonLink>
    </div>
  );
}
