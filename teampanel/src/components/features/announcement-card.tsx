import type { ReactNode } from "react";
import { Pin } from "lucide-react";
import type { AnnouncementPriority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { fmtDateTime } from "@/lib/dates";
import { shortName } from "@/lib/labels";
import { AnnouncementPriorityBadge } from "./badges";

export interface AnnouncementCardData {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  pinned: boolean;
  imageUrl: string | null;
  publishedAt: Date;
  author: { profile: { firstName: string; callsign: string | null } | null } | null;
}

export function AnnouncementCard({ item, actions, compact }: { item: AnnouncementCardData; actions?: ReactNode; compact?: boolean }) {
  const urgent = item.priority === "URGENT";
  const scheduled = item.publishedAt > new Date();
  return (
    <article
      className={cn(
        "panel overflow-hidden",
        urgent && "border-danger/60 bg-danger/5",
        item.priority === "IMPORTANT" && "border-warn/40",
      )}
    >
      {urgent && <div className="bg-danger px-4 py-1 font-display text-xs font-semibold uppercase tracking-[0.2em] text-white">Dringend</div>}
      {item.imageUrl && !compact && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="max-h-64 w-full object-cover" loading="lazy" />
      )}
      <div className="p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {item.pinned && (
            <Badge tone="accent">
              <Pin className="h-3 w-3" /> Angeheftet
            </Badge>
          )}
          {item.priority !== "NORMAL" && !urgent && <AnnouncementPriorityBadge priority={item.priority} />}
          {scheduled && <Badge tone="info">Geplant für {fmtDateTime(item.publishedAt)}</Badge>}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="break-words text-lg font-semibold uppercase tracking-wide">{item.title}</h3>
          {actions}
        </div>
        <p className="mt-1 text-xs text-subtle">
          {fmtDateTime(item.publishedAt)}
          {item.author?.profile ? ` · ${shortName(item.author.profile)}` : ""}
        </p>
        <p className={cn("mt-3 whitespace-pre-wrap break-words text-sm text-fg/90", compact && "line-clamp-3")}>{item.body}</p>
      </div>
    </article>
  );
}
