import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { DeleteButton } from "@/components/admin/DeleteButton";

export const metadata = { title: "Newsletter-Abonnenten" };

export default async function AdminNewsletterPage() {
  const subscribers = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Newsletter-Abonnenten</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">{subscribers.length} Abonnenten</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="border-b border-ink-200 text-xs uppercase text-ink-500 dark:border-ink-800 dark:text-ink-400">
            <tr>
              <th className="px-4 py-3">E-Mail-Adresse</th>
              <th className="px-4 py-3">Angemeldet am</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {subscribers.map((s) => (
              <tr key={s.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/40">
                <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{s.email}</td>
                <td className="px-4 py-3 text-ink-500 dark:text-ink-400">{formatDateTime(s.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton url={`/api/admin/newsletter?id=${s.id}`} confirmText={`Abonnement von ${s.email} löschen?`} />
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-500 dark:text-ink-400">Noch keine Abonnenten vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
