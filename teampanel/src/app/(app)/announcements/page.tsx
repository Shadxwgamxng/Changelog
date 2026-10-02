import type { Metadata } from "next";
import { Megaphone, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can, canEditAnnouncement } from "@/lib/permissions";
import { ANNOUNCEMENT_PRIORITY_OPTIONS } from "@/lib/labels";
import { dateToLocalInput } from "@/lib/dates";
import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterInput, FilterSelect, pickEnum, pickString } from "@/components/ui/filter-bar";
import { ModalTrigger } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { AnnouncementCard } from "@/components/features/announcement-card";
import { AnnouncementForm } from "@/components/features/announcement-form";
import { toggleAnnouncementPin, deleteAnnouncement } from "@/server/actions/announcements";
import { listAnnouncements } from "@/server/queries/announcements";

export const metadata: Metadata = { title: "Ankündigungen" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AnnouncementsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = pickString(sp.q);
  const priority = pickEnum(sp.priority, ["NORMAL", "IMPORTANT", "URGENT"] as const);
  const items = await listAnnouncements(user, { q, priority });
  const create = can(user, "announcements.create");

  return (
    <>
      <PageHeader
        eyebrow="News"
        title="Ankündigungen"
        subtitle="Neuigkeiten und wichtige Infos aus dem Team."
        actions={
          create && (
            <ModalTrigger variant="primary" label={<><Plus className="h-4 w-4" /> Neue Ankündigung</>} title="Neue Ankündigung" modalSize="lg">
              <AnnouncementForm />
            </ModalTrigger>
          )
        }
      />
      <FilterBar resetHref="/announcements">
        <FilterInput label="Suche" name="q" value={q} placeholder="Titel oder Text" />
        <FilterSelect label="Priorität" name="priority" value={priority} options={ANNOUNCEMENT_PRIORITY_OPTIONS} />
      </FilterBar>

      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<Megaphone className="h-8 w-8" />} title="Keine Ankündigungen">
            {q || priority ? "Mit diesen Filtern gibt es keine Treffer." : "Aktuell gibt es keine Neuigkeiten."}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((a) => {
            const edit = canEditAnnouncement(user, a);
            return (
              <AnnouncementCard
                key={a.id}
                item={a}
                actions={
                  edit ? (
                    <div className="flex shrink-0 items-center">
                      <ActionButton size="sm" variant="ghost" action={toggleAnnouncementPin} args={[a.id]} ariaLabel={a.pinned ? "Anheftung lösen" : "Anheften"}>
                        {a.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </ActionButton>
                      <ModalTrigger variant="ghost" size="sm" label={<Pencil className="h-4 w-4" />} ariaLabel="Ankündigung bearbeiten" title="Ankündigung bearbeiten" modalSize="lg">
                        <AnnouncementForm values={{ id: a.id, title: a.title, body: a.body, priority: a.priority, pinned: a.pinned, imageUrl: a.imageUrl, publishedAt: dateToLocalInput(a.publishedAt) }} />
                      </ModalTrigger>
                      <ActionButton
                        size="sm"
                        variant="ghost"
                        ariaLabel="Ankündigung löschen"
                        action={deleteAnnouncement} args={[a.id]}
                        confirm={{ title: "Ankündigung löschen?", message: `„${a.title}“ wird endgültig gelöscht.`, confirmLabel: "Löschen", danger: true }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </ActionButton>
                    </div>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}
