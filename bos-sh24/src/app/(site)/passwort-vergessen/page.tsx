"use client";

import { useState, type FormEvent } from "react";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Label, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = new FormData(e.currentTarget).get("email");
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setDone(true);
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-8 shadow-soft dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Passwort vergessen</h1>
          <p className="mt-1 text-center text-sm text-ink-500 dark:text-ink-400">
            Gib deine E-Mail-Adresse ein, wir senden dir einen Link zum Zurücksetzen.
          </p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <p className="text-sm text-ink-600 dark:text-ink-400">
              Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine Nachricht mit weiteren
              Anweisungen versendet.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Link anfordern
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
