"use client";

import type { AttendanceStatus } from "@prisma/client";
import { Check, HelpCircle, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useRunAction } from "@/components/ui/use-action";
import { quickRespond } from "@/server/actions/events";

interface Props {
  eventId: string;
  current: AttendanceStatus | null;
  /** Anmeldung grundsätzlich möglich? */
  open: boolean;
  /** Grund, falls geschlossen / Zusage gesperrt */
  closedReason?: string;
  acceptBlocked?: string;
  size?: "md" | "lg";
}

const OPTIONS: { status: AttendanceStatus; label: string; icon: typeof Check; active: string }[] = [
  { status: "ACCEPTED", label: "Zusagen", icon: Check, active: "border-ok bg-ok/20 text-ok" },
  { status: "MAYBE", label: "Vielleicht", icon: HelpCircle, active: "border-warn bg-warn/20 text-warn" },
  { status: "DECLINED", label: "Absagen", icon: X, active: "border-danger bg-danger/20 text-danger" },
];

/** Große Touch-Buttons für die Zu-/Absage – auch unterwegs mit einer Hand bedienbar. */
export function AttendanceButtons({ eventId, current, open, closedReason, acceptBlocked, size = "md" }: Props) {
  const { run, pending } = useRunAction();
  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Teilnahme">
        {OPTIONS.map(({ status, label, icon: Icon, active }) => {
          const isActive = current === status;
          const blocked = !open || (status === "ACCEPTED" && Boolean(acceptBlocked) && current !== "ACCEPTED");
          return (
            <button
              key={status}
              type="button"
              disabled={pending || blocked}
              aria-pressed={isActive}
              onClick={() => run(() => quickRespond(eventId, status), { success: undefined })}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-md border px-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                size === "lg" ? "min-h-16 text-sm" : "min-h-12 text-xs sm:text-sm",
                isActive ? active : "border-line bg-elevated text-fg hover:border-subtle",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      {(!open && closedReason) || acceptBlocked ? <p className="mt-2 text-xs text-muted">{!open ? closedReason : acceptBlocked}</p> : null}
    </div>
  );
}
