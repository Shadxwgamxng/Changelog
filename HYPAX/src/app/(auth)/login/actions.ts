"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { login, completeTwoFactor } from "@/server/auth";
import { clientMeta, setSessionCookie, endSession } from "@/server/session";
import { describeError, type FormState } from "@/server/action";
import { COOKIE_NAME } from "@/server/env";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const r = await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""), await clientMeta());
    await setSessionCookie(r.token);
    redirect(r.status === "2fa" ? "/login/2fa" : "/");
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return describeError(e);
  }
}

export async function twoFactorAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) redirect("/login");
    await completeTwoFactor(token, String(form.get("code") ?? ""), await clientMeta());
    redirect("/");
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return describeError(e);
  }
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
