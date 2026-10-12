"use server";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { runSetup } from "@/server/setup";
import { createSession } from "@/server/auth";
import { clientMeta, setSessionCookie } from "@/server/session";
import { describeError, type FormState } from "@/server/action";

export async function setupAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const s = (k: string) => String(form.get(k) ?? "");
    const { userId } = await runSetup({ token: s("token"), orgName: s("orgName"), unitType: s("unitType"), email: s("email"), password: s("password"), password2: s("password2") });
    await setSessionCookie(await createSession(userId, true, await clientMeta()));
    redirect("/");
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return describeError(e);
  }
}
