import type { Equipment, OwnershipStatus } from "@prisma/client";
import { ExternalLink, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/labels";
import { fmtEuro } from "@/lib/dates";
import { OwnershipBadge, PriorityBadge } from "./badges";
import type { ReactNode } from "react";

interface EquipmentCardProps {
  equipment: Equipment;
  status?: OwnershipStatus;
  quantity?: number;
  /** Aktionen (Bearbeiten, Status ändern …) */
  actions?: ReactNode;
}

export function EquipmentCard({ equipment: e, status, quantity, actions }: EquipmentCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex gap-4 p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-bg text-subtle">
          {e.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Package className="h-8 w-8" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            <Badge tone={e.required ? "danger" : "neutral"}>{e.required ? "Pflicht" : "Optional"}</Badge>
            <Badge>{CATEGORY_LABELS[e.category]}</Badge>
          </div>
          <h3 className="break-words text-base font-semibold leading-snug">{e.name}</h3>
          {(e.manufacturer || e.model) && <p className="text-xs text-muted">{[e.manufacturer, e.model].filter(Boolean).join(" · ")}</p>}
        </div>
      </div>
      {e.description && <p className="px-4 text-sm text-muted">{e.description}</p>}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 px-4 text-xs text-muted">
        <div>
          <dt className="label-caps">Preis</dt>
          <dd className="text-sm text-fg">{fmtEuro(e.priceCents)}</dd>
        </div>
        <div>
          <dt className="label-caps">Empf. Menge</dt>
          <dd className="text-sm text-fg">{e.recommendedQuantity}×</dd>
        </div>
      </dl>
      {e.notes && <p className="mx-4 mt-3 rounded border border-line bg-bg px-3 py-2 text-xs text-muted">{e.notes}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 p-4 pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {status && <OwnershipBadge status={status} />}
          {status && quantity !== undefined && quantity > 1 && <span className="text-xs text-muted">{quantity}×</span>}
          {!status && <PriorityBadge priority={e.priority} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {e.shopUrl && (
            <ButtonLink href={e.shopUrl} target="_blank" rel="noopener noreferrer nofollow" size="sm" variant="secondary">
              Zum Shop <ExternalLink className="h-3.5 w-3.5" />
            </ButtonLink>
          )}
          {actions}
        </div>
      </div>
    </Card>
  );
}
