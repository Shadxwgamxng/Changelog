"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Label, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: form.get("password"),
        passwordConfirm: form.get("passwordConfirm"),
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Zurücksetzen fehlgeschlagen.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 1800);
  }

  if (!token) {
    return <p className="text-sm text-accent-600">Kein gültiger Link. Bitte fordere einen neuen Reset-Link an.</p>;
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <p className="text-sm text-ink-600 dark:text-ink-400">Dein Passwort wurde geändert. Du wirst weitergeleitet…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-accent-500/10 px-4 py-3 text-sm text-accent-600">{error}</p>}
      <div>
        <Label htmlFor="password">Neues Passwort</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      <div>
        <Label htmlFor="passwordConfirm">Passwort bestätigen</Label>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={8} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Passwort speichern
      </Button>
    </form>
  );
}
