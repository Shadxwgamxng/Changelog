import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="mb-1 text-lg uppercase tracking-wide">Passwort vergessen</h2>
      <p className="mb-5 text-sm text-muted">Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen. Alternativ kann dir die Teamleitung einen Link erstellen.</p>
      <ForgotForm />
    </>
  );
}
