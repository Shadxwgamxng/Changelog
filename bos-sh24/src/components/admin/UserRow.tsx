"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { formatDate } from "@/lib/utils";
import type { Role, UserStatus } from "@/lib/types";

interface UserRowData {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string | Date;
  lastLoginAt: string | Date | null;
}

export function UserRow({ user, isSelf }: { user: UserRowData; isSelf: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateField(field: "role" | "status", value: string) {
    setLoading(true);
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <tr className="hover:bg-ink-50 dark:hover:bg-ink-800/40">
      <td className="px-4 py-3">
        <p className="font-medium text-ink-900 dark:text-white">{user.name}</p>
        <p className="text-xs text-ink-500 dark:text-ink-400">@{user.username} · {user.email}</p>
      </td>
      <td className="px-4 py-3">
        <Select value={user.role} disabled={isSelf || loading} onChange={(e) => updateField("role", e.target.value)} className="w-36 text-xs">
          <option value="USER">Benutzer</option>
          <option value="EDITOR">Redakteur</option>
          <option value="ADMIN">Administrator</option>
        </Select>
      </td>
      <td className="px-4 py-3">
        <button
          disabled={isSelf || loading}
          onClick={() => updateField("status", user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE")}
          className="disabled:opacity-50"
        >
          <Badge color={user.status === "ACTIVE" ? "green" : "accent"}>{user.status === "ACTIVE" ? "Aktiv" : "Gesperrt"}</Badge>
        </button>
      </td>
      <td className="px-4 py-3 text-ink-500 dark:text-ink-400">{formatDate(user.createdAt)}</td>
      <td className="px-4 py-3 text-ink-500 dark:text-ink-400">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "–"}</td>
      <td className="px-4 py-3 text-right">
        {loading && <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-ink-400" />}
        {!isSelf && <DeleteButton url={`/api/admin/users/${user.id}`} confirmText={`Benutzer „${user.name}“ wirklich löschen?`} />}
      </td>
    </tr>
  );
}
