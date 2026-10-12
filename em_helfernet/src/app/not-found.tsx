import Link from "next/link";

export default function RootNotFound() {
  return (<main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center"><h1 className="text-xl font-semibold">Seite nicht gefunden</h1><Link href="/" className="btn btn-primary mt-5">Zur Startseite</Link></main>);
}
