import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ContactRow } from "@/components/admin/ContactRow";
import { cn } from "@/lib/utils";
import type { ContactStatus } from "@/lib/types";

export const metadata = { title: "Kontaktanfragen" };

const FILTERS: { value: ContactStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Alle" },
  { value: "NEW", label: "Neu" },
  { value: "IN_PROGRESS", label: "In Bearbeitung" },
  { value: "DONE", label: "Erledigt" },
];

export default async function AdminContactPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status as ContactStatus | undefined;
  const messages = await prisma.contactMessage.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Kontaktanfragen</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "ALL" ? "/admin/kontaktanfragen" : `/admin/kontaktanfragen?status=${f.value}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium",
              (f.value === "ALL" && !status) || f.value === status
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 text-ink-700 hover:border-brand-400 dark:border-ink-700 dark:text-ink-200",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {messages.map((message) => (
          <ContactRow key={message.id} message={{ ...message, status: message.status as ContactStatus }} />
        ))}
        {messages.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-ink-500 dark:border-ink-700">
            Keine Kontaktanfragen gefunden.
          </p>
        )}
      </div>
    </div>
  );
}
