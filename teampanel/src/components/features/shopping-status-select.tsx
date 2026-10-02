"use client";

import type { ShoppingStatus } from "@prisma/client";
import { useRunAction } from "@/components/ui/use-action";
import { SHOPPING_STATUS_OPTIONS } from "@/lib/labels";
import { setShoppingStatus } from "@/server/actions/shopping";

export function ShoppingStatusSelect({ id, status, name }: { id: string; status: ShoppingStatus; name: string }) {
  const { run, pending } = useRunAction();
  return (
    <select aria-label={`Status für ${name}`} defaultValue={status} disabled={pending} onChange={(e) => run(() => setShoppingStatus(id, e.target.value as ShoppingStatus))} className="input h-9 w-auto py-1 pr-8">
      {SHOPPING_STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
