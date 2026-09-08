import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRow } from "@/components/admin/UserRow";
import type { Role, UserStatus } from "@/lib/types";

export const metadata = { title: "Benutzerverwaltung" };

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await getServerSession(authOptions);
  const q = searchParams.q?.trim();

  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { username: { contains: q } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Benutzer</h1>
        <form className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, Benutzername oder E-Mail…"
            className="rounded-lg border border-ink-300 bg-white px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-600 dark:bg-ink-900"
          />
          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Suchen</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-ink-200 text-xs uppercase text-ink-500 dark:border-ink-800 dark:text-ink-400">
            <tr>
              <th className="px-4 py-3">Benutzer</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Registriert</th>
              <th className="px-4 py-3">Letzter Login</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={{ ...user, role: user.role as Role, status: user.status as UserStatus }}
                isSelf={user.id === session!.user.id}
              />
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500 dark:text-ink-400">Keine Benutzer gefunden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
