import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/site/LoginForm";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-8 shadow-soft dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Anmelden</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Willkommen zurück bei BOS_SH24.</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="font-semibold text-brand-600 hover:underline">Jetzt registrieren</Link>
        </p>
      </div>
    </div>
  );
}
