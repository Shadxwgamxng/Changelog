"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { Alert } from "./alert";
import { Button } from "./button";
import { cn } from "./cn";
import { useModalClose } from "./modal";
import { useToast } from "./toast";

interface FormState {
  pending: boolean;
  errors: Record<string, string>;
}

const FormContext = createContext<FormState>({ pending: false, errors: {} });
const FieldContext = createContext<{ id: string; name?: string; invalid: boolean; describedBy?: string } | null>(null);

interface ActionFormProps<T> {
  action: (formData: FormData) => Promise<ActionResult<T>>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  /** Schließt ein umgebendes Modal nach Erfolg (Standard: true). */
  closeOnSuccess?: boolean;
  refresh?: boolean;
  onSuccess?: (data: T | undefined, message?: string) => void;
}

/** Formular, das eine Server Action aufruft, Feldfehler anzeigt und Toasts auslöst. */
export function ActionForm<T = undefined>({
  action,
  children,
  className,
  successMessage,
  resetOnSuccess = false,
  closeOnSuccess = true,
  refresh = true,
  onSuccess,
}: ActionFormProps<T>) {
  const router = useRouter();
  const toast = useToast();
  const closeModal = useModalClose();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    start(async () => {
      try {
        const res = await action(data);
        if (res.ok) {
          setError(null);
          setErrors({});
          const message = res.message ?? successMessage;
          if (message) toast.success(message);
          if (resetOnSuccess) form.reset();
          onSuccess?.(res.data, res.message);
          if (closeOnSuccess) closeModal?.();
          if (refresh) router.refresh();
        } else {
          setError(res.error);
          setErrors(res.fieldErrors ?? {});
        }
      } catch {
        setError("Verbindungsproblem. Bitte prüfe deine Internetverbindung und versuche es erneut.");
      }
    });
  };

  return (
    <FormContext.Provider value={{ pending, errors }}>
      <form ref={formRef} onSubmit={onSubmit} className={cn("space-y-4", className)} noValidate={false}>
        {children}
        {error && <Alert variant="danger">{error}</Alert>}
      </form>
    </FormContext.Provider>
  );
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end", className)}>{children}</div>;
}

export function SubmitButton({ children, variant = "primary", className }: { children: ReactNode; variant?: "primary" | "danger"; className?: string }) {
  const { pending } = useContext(FormContext);
  return (
    <Button type="submit" variant={variant} loading={pending} className={className}>
      {children}
    </Button>
  );
}

interface FieldProps {
  label: string;
  name?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, name, hint, required, children, className }: FieldProps) {
  const id = useId();
  const { errors } = useContext(FormContext);
  const error = name ? errors[name] : undefined;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <FieldContext.Provider value={{ id, name, invalid: Boolean(error), describedBy }}>
      <div className={cn("space-y-1.5", className)}>
        <label htmlFor={id} className="block text-sm font-medium text-fg">
          {label}
          {required && <span className="ml-0.5 text-accent-400" aria-hidden> *</span>}
        </label>
        {children}
        {hint && !error && (
          <p id={`${id}-hint`} className="text-xs text-subtle">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-err`} className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps(name?: string) {
  const f = useContext(FieldContext);
  return {
    id: f?.id,
    name: name ?? f?.name,
    "aria-invalid": f?.invalid || undefined,
    "aria-describedby": f?.describedBy,
  };
}

export function Input({ className, name, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...useFieldProps(name)} {...rest} />;
}

export function Textarea({ className, name, rows = 4, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn("input resize-y", className)} {...useFieldProps(name)} {...rest} />;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ className, name, options, placeholder, ...rest }: SelectProps) {
  return (
    <select className={cn("input pr-8", className)} {...useFieldProps(name)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ label, name, defaultChecked, hint, value }: { label: ReactNode; name: string; defaultChecked?: boolean; hint?: string; value?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-line bg-bg accent-[#86994f]"
      />
      <label htmlFor={id} className="text-sm leading-snug text-fg">
        {label}
        {hint && <span className="block text-xs text-subtle">{hint}</span>}
      </label>
    </div>
  );
}

interface ImageUploadProps {
  name: string;
  kind: "avatars" | "equipment" | "announcements" | "team" | "shopping";
  defaultValue?: string | null;
  label?: string;
  round?: boolean;
}

/** Lädt ein Bild über /api/upload hoch und legt die resultierende Adresse in ein verstecktes Feld. */
export function ImageUpload({ name, kind, defaultValue, label = "Bild", round }: ImageUploadProps) {
  const toast = useToast();
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "Upload fehlgeschlagen.");
      setUrl(json.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Der Upload ist fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-fg">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-line bg-bg text-subtle",
            round ? "rounded-full" : "rounded-md",
          )}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={id} className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-line bg-elevated px-3 text-xs font-medium hover:border-subtle">
            {busy ? "Lädt hoch …" : url ? "Ersetzen" : "Bild wählen"}
          </label>
          <input
            id={id}
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          {url && (
            <Button size="sm" variant="ghost" onClick={() => setUrl("")} aria-label="Bild entfernen">
              <Trash2 className="h-4 w-4" /> Entfernen
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-subtle">PNG, JPG, WebP oder GIF, maximal 3 MB.</p>
    </div>
  );
}
