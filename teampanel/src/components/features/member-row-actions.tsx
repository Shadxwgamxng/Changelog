"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Pencil, Power, Trash2 } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { CopyField } from "@/components/ui/copy-field";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { useConfirm } from "@/components/ui/confirm";
import { useRunAction } from "@/components/ui/use-action";
import { createResetLink, deleteMember, setMemberActive } from "@/server/actions/members";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  name: string;
  active: boolean;
  /** Darf der Betrachter dieses Mitglied verwalten (Rangprüfung)? */
  manageable: boolean;
}

export function MemberRowActions({ id, name, active, manageable }: Props) {
  const confirm = useConfirm();
  const { run } = useRunAction();
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);

  if (!manageable) {
    return (
      <Link href={`/team/${id}`} className="rounded px-2 py-1 text-xs text-accent-300 hover:bg-elevated">
        Ansehen
      </Link>
    );
  }

  return (
    <>
      <Dropdown label={`Aktionen für ${name}`}>
        <DropdownItem onClick={() => router.push(`/admin/members/${id}`)}>
          <Pencil className="h-4 w-4" /> Bearbeiten
        </DropdownItem>
        <DropdownItem onClick={() => run(() => createResetLink(id), { refresh: false, success: "Link erstellt.", onSuccess: (d) => setLink((d as { url: string }).url) })}>
          <KeyRound className="h-4 w-4" /> Passwort-Link erstellen
        </DropdownItem>
        <DropdownItem
          onClick={async () => {
            const ok = await confirm({
              title: active ? "Mitglied deaktivieren?" : "Mitglied aktivieren?",
              message: active ? `${name} wird abgemeldet und kann sich nicht mehr anmelden. Daten bleiben erhalten.` : `${name} kann sich wieder anmelden.`,
              confirmLabel: active ? "Deaktivieren" : "Aktivieren",
              danger: active,
            });
            if (ok) run(() => setMemberActive(id, !active));
          }}
        >
          <Power className="h-4 w-4" /> {active ? "Deaktivieren" : "Aktivieren"}
        </DropdownItem>
        <DropdownItem
          danger
          onClick={async () => {
            const ok = await confirm({ title: "Mitglied löschen?", message: `${name} wird mit allen Zu-/Absagen und Ausrüstungsdaten endgültig gelöscht. Das lässt sich nicht rückgängig machen. Zum Pausieren besser „Deaktivieren“ verwenden.`, confirmLabel: "Endgültig löschen", danger: true });
            if (ok) run(() => deleteMember(id), { success: "Mitglied gelöscht." });
          }}
        >
          <Trash2 className="h-4 w-4" /> Löschen
        </DropdownItem>
      </Dropdown>
      <Modal open={link !== null} onClose={() => setLink(null)} title="Passwort-Link" description={`Für ${name} – 24 Stunden gültig`}>
        <div className="space-y-4">
          <Alert variant="info">Gib diesen Link nur an die betroffene Person weiter. Damit kann sie ein neues Passwort festlegen.</Alert>
          {link && <CopyField label="Link" value={link} />}
        </div>
      </Modal>
    </>
  );
}
