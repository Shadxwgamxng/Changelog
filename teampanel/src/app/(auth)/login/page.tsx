import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  return (
    <>
      <h2 className="mb-1 text-lg uppercase tracking-wide">Anmelden</h2>
      <p className="mb-5 text-sm text-muted">Moin! Melde dich mit deinem Benutzernamen oder deiner E-Mail an.</p>
      <LoginForm />
    </>
  );
}
