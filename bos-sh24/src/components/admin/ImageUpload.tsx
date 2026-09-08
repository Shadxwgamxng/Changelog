"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

export function ImageUpload({
  value,
  onChange,
  label = "Bild",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen.");
      onChange(data.media.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Bild-URL oder Datei hochladen…"
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-50 disabled:opacity-60 dark:border-ink-600 dark:text-ink-300 dark:hover:bg-ink-800"
          aria-label={`${label} hochladen`}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-ink-300 text-ink-600 hover:bg-ink-50 dark:border-ink-600 dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label={`${label} entfernen`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1.5 text-sm text-accent-500">{error}</p>}
      {value && (
        <div className="relative mt-2 h-32 w-full max-w-xs overflow-hidden rounded-lg border border-ink-200 bg-ink-100 dark:border-ink-700 dark:bg-ink-800">
          <Image src={value} alt="Vorschau" fill sizes="320px" className="object-cover" />
        </div>
      )}
    </div>
  );
}
