import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { findValidInvitation } from "@/server/auth-helpers";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await findValidInvitation(token);
  if (!inv) {
    return (
      <div className="space-y-4">
        <Alert variant="danger" title="Einladung ungültig">
          Diese Einladung ist ungültig, abgelaufen oder wurde bereits verwendet. Bitte die Teamleitung um einen neuen Link.
        </Alert>
        <Link href="/login" className="block text-center text-sm text-accent-300 hover:underline">
          Zur Anmeldung
        </Link>
      </div>
    );
  }
  return (
    <>
      <h2 className="mb-1 text-lg uppercase tracking-wide">Willkommen im Team</h2>
      <p className="mb-5 text-sm text-muted">Du wurdest als <strong className="text-fg">{inv.role.name}</strong> eingeladen. Lege dein Konto an.</p>
      <RegisterForm token={token} email={inv.email ?? ""} />
    </>
  );
}
