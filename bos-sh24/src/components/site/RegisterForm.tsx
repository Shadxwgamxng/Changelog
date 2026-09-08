"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Label, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      username: form.get("username"),
      email: form.get("email"),
      password: form.get("password"),
      passwordConfirm: form.get("passwordConfirm"),
      acceptTerms: form.get("acceptTerms") === "on",
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registrierung fehlgeschlagen.");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <p className="font-medium text-ink-900 dark:text-white">Konto erfolgreich erstellt!</p>
        <p className="text-sm text-ink-500 dark:text-ink-400">Du wirst gleich zum Login weitergeleitet…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-accent-500/10 px-4 py-3 text-sm text-accent-600">{error}</p>}
      <div>
        <Label htmlFor="name">Vollständiger Name</Label>
        <Input id="name" name="name" required maxLength={100} />
      </div>
      <div>
        <Label htmlFor="username">Benutzername</Label>
        <Input id="username" name="username" required maxLength={30} pattern="[a-zA-Z0-9_.\-]+" />
      </div>
      <div>
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <Label htmlFor="passwordConfirm">Passwort bestätigen</Label>
          <Input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password" />
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <input id="acceptTerms" name="acceptTerms" type="checkbox" required className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
        <label htmlFor="acceptTerms" className="text-sm text-ink-600 dark:text-ink-400">
          Ich stimme der <a href="/datenschutz" className="text-brand-600 underline">Datenschutzerklärung</a> zu.
        </label>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Konto erstellen
      </Button>
    </form>
  );
}
