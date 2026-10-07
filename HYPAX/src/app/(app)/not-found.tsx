import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-4xl" aria-hidden>🔍</p>
      <h1 className="mt-3 text-xl font-semibold">Nicht gefunden</h1>
      <p className="mt-2 text-sm text-fg-muted">Dieser Eintrag existiert nicht – oder du darfst ihn nicht sehen.</p>
      <Link href="/" className="btn btn-primary mt-5">Zur Startseite</Link>
    </div>
  );
}
