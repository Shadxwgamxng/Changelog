"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "./cn";

const ModalContext = createContext<{ close: () => void } | null>(null);

/** Erlaubt Formularen innerhalb eines Modals, es nach Erfolg zu schließen. */
export function useModalClose() {
  return useContext(ModalContext)?.close;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}

const widths = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className={cn(
        "m-auto w-[calc(100%-1rem)] overflow-hidden rounded-xl border border-line bg-surface p-0 text-fg shadow-2xl open:animate-fade-in",
        widths[size],
      )}
    >
      {open && (
        <ModalContext.Provider value={{ close: onClose }}>
          <div className="flex max-h-[90dvh] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id="modal-title" className="text-lg font-medium uppercase tracking-wide">
                  {title}
                </h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="rounded p-1 text-subtle hover:bg-elevated hover:text-fg" aria-label="Schließen">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{children}</div>
          </div>
        </ModalContext.Provider>
      )}
    </dialog>
  );
}

interface ModalTriggerProps {
  label: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  modalSize?: "md" | "lg" | "xl";
  className?: string;
  ariaLabel?: string;
}

/** Button, der ein Modal mit dem übergebenen Inhalt öffnet. */
export function ModalTrigger({ label, title, description, children, variant = "secondary", size = "md", modalSize = "md", className, ariaLabel }: ModalTriggerProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {label}
      </Button>
      <Modal open={open} onClose={close} title={title} description={description} size={modalSize}>
        {children}
      </Modal>
    </>
  );
}
