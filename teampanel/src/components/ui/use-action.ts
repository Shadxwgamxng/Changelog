"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action";
import { useToast } from "./toast";

interface RunOptions<T> {
  success?: string;
  refresh?: boolean;
  onSuccess?: (data: T | undefined) => void;
}

/** Führt eine Server Action aus und zeigt Erfolg/Fehler als Toast an. */
export function useRunAction() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const run = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, options: RunOptions<T> = {}) => {
      start(async () => {
        try {
          const res = await fn();
          if (res.ok) {
            toast.success(options.success ?? res.message ?? "Gespeichert.");
            options.onSuccess?.(res.data);
            if (options.refresh !== false) router.refresh();
          } else {
            toast.error(res.error);
          }
        } catch {
          toast.error("Verbindungsproblem. Bitte prüfe deine Internetverbindung und versuche es erneut.");
        }
      });
    },
    [router, toast],
  );

  return { run, pending };
}
