"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Label, Input, Textarea, FieldError } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ContactForm() {
  const startedAt = useRef(Date.now());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [serverError, setServerError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setState("loading");

    const form = new FormData(e.currentTarget);
    const payload = {
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      email: form.get("email"),
      phone: form.get("phone"),
      subject: form.get("subject"),
      message: form.get("message"),
      privacyAccepted: form.get("privacyAccepted") === "on",
      website: form.get("website"),
      formStartedAt: startedAt.current,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Etwas ist schiefgelaufen.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setServerError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <h3 className="font-display text-xl font-bold text-ink-900 dark:text-white">Nachricht gesendet!</h3>
        <p className="text-ink-600 dark:text-ink-400">
          Vielen Dank für deine Nachricht. Unsere Redaktion meldet sich schnellstmöglich bei dir zurück.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {serverError && (
        <p className="rounded-lg bg-accent-500/10 px-4 py-3 text-sm text-accent-600">{serverError}</p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">Vorname *</Label>
          <Input id="firstName" name="firstName" required maxLength={80} />
        </div>
        <div>
          <Label htmlFor="lastName">Nachname *</Label>
          <Input id="lastName" name="lastName" required maxLength={80} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">E-Mail-Adresse *</Label>
          <Input id="email" type="email" name="email" required />
        </div>
        <div>
          <Label htmlFor="phone">Telefonnummer (optional)</Label>
          <Input id="phone" type="tel" name="phone" />
        </div>
      </div>
      <div>
        <Label htmlFor="subject">Betreff *</Label>
        <Input id="subject" name="subject" required maxLength={150} />
      </div>
      <div>
        <Label htmlFor="message">Nachricht *</Label>
        <Textarea id="message" name="message" required rows={6} maxLength={5000} />
      </div>

      {/* Honeypot-Feld: für Menschen unsichtbar, wird von Spam-Bots häufig ausgefüllt. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex items-start gap-2.5">
        <input id="privacyAccepted" name="privacyAccepted" type="checkbox" required className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
        <label htmlFor="privacyAccepted" className="text-sm text-ink-600 dark:text-ink-400">
          Ich habe die <a href="/datenschutz" className="text-brand-600 underline">Datenschutzerklärung</a> gelesen und stimme der Verarbeitung meiner Daten zur Bearbeitung meiner Anfrage zu. *
        </label>
      </div>

      <FieldError>{errors.form}</FieldError>

      <Button type="submit" size="lg" disabled={state === "loading"} className="w-full sm:w-auto">
        {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        Nachricht senden
      </Button>
    </form>
  );
}
