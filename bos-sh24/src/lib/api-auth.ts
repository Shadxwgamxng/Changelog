import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";
import type { Role } from "@/lib/types";
import { roleAtLeast } from "@/lib/permissions";

export async function requireRole(minRole: Role): Promise<
  { ok: true; session: Session } | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session || !roleAtLeast(session.user.role, minRole)) {
    return { ok: false, response: NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 }) };
  }
  return { ok: true, session };
}
