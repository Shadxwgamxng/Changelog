"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Mail, Phone } from "lucide-react";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { formatDateTime } from "@/lib/utils";
import type { ContactStatus } from "@/lib/types";

interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string | Date;
}

const statusColor = { NEW: "accent", IN_PROGRESS: "amber", DONE: "green" } as const;
const statusLabel = { NEW: "Neu", IN_PROGRESS: "In Bearbeitung", DONE: "Erledigt" } as const;

export function ContactRow({ message }: { message: ContactData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function updateStatus(status: string) {
    await fetch(`/api/admin/contact/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left">
        <div>
          <p className="font-medium text-ink-900 dark:text-white">{message.subject}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">{message.firstName} {message.lastName} · {formatDateTime(message.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={statusColor[message.status]}>{statusLabel[message.status]}</Badge>
          {open ? <ChevronUp className="h-4 w-4 text-ink-400" /> : <ChevronDown className="h-4 w-4 text-ink-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-ink-200 p-4 dark:border-ink-800">
          <p className="whitespace-pre-line text-sm text-ink-700 dark:text-ink-300">{message.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-ink-500 dark:text-ink-400">
            <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {message.email}</span>
            {message.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {message.phone}</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Select value={message.status} onChange={(e) => updateStatus(e.target.value)} className="w-44 text-xs">
              <option value="NEW">Neu</option>
              <option value="IN_PROGRESS">In Bearbeitung</option>
              <option value="DONE">Erledigt</option>
            </Select>
            <a href={`mailto:${message.email}`} className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 dark:border-ink-600 dark:text-ink-200 dark:hover:bg-ink-800">Antworten</a>
            <DeleteButton url={`/api/admin/contact/${message.id}`} confirmText="Diese Anfrage wirklich löschen?" />
          </div>
        </div>
      )}
    </div>
  );
}
