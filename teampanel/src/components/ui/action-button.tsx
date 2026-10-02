"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action";
import { Button } from "./button";
import { useConfirm } from "./confirm";
import { useRunAction } from "./use-action";

interface ActionButtonProps<A extends unknown[]> {
  /** Server Action (Referenz) – Closures können nicht von Server- an Client-Komponenten übergeben werden, daher Argumente separat. */
  action: (...args: A) => Promise<ActionResult<unknown>>;
  args?: A;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  className?: string;
  success?: string;
  ariaLabel?: string;
  confirm?: { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean };
  disabled?: boolean;
  /** Nach Erfolg dorthin navigieren (z. B. nach dem Löschen einer Detailseite). */
  redirectTo?: string;
}

/** Button, der eine Server Action ausführt – optional mit Bestätigungsdialog (z. B. Löschen). */
export function ActionButton<A extends unknown[] = []>({ action, args, children, variant = "secondary", size = "md", className, success, ariaLabel, confirm, disabled, redirectTo }: ActionButtonProps<A>) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const ask = useConfirm();

  const onClick = async () => {
    if (confirm && !(await ask(confirm))) return;
    run(() => action(...((args ?? []) as A)), { success, refresh: !redirectTo, onSuccess: () => redirectTo && router.push(redirectTo) });
  };

  return (
    <Button variant={variant} size={size} className={className} loading={pending} onClick={onClick} aria-label={ariaLabel} disabled={disabled}>
      {children}
    </Button>
  );
}
