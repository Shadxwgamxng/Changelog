import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { findValidResetToken } from "@/server/auth-helpers";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Neues Passwort" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await findValidResetToken(token);
  if (!valid) {
    return (
      <div className="space-y-4">
        <Alert variant="danger" title="Link ungültig">
          Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.
        </Alert>
        <Link href="/forgot-password" className="block text-center text-sm text-accent-300 hover:underline">
          Neuen Link anfordern
        </Link>
      </div>
    );
  }
  return (
    <>
      <h2 className="mb-1 text-lg uppercase tracking-wide">Neues Passwort festlegen</h2>
      <p className="mb-5 text-sm text-muted">Mindestens 10 Zeichen mit Buchstaben und Zahlen.</p>
      <ResetForm token={token} />
    </>
  );
}
