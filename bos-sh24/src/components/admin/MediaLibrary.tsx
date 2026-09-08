"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  title: string | null;
  description: string | null;
  credit: string | null;
  size: number;
  uploader: { name: string };
  createdAt: string | Date;
}

export function MediaLibrary({ media }: { media: MediaItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", credit: "" });

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Upload fehlgeschlagen.");
      }
    }
    setUploading(false);
    router.refresh();
  }

  function startEdit(item: MediaItem) {
    setEditing(item.id);
    setForm({ title: item.title ?? "", description: item.description ?? "", credit: item.credit ?? "" });
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(null);
    router.refresh();
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`„${item.title ?? item.filename}“ wirklich löschen?`)) return;
    await fetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div
        className="mb-6 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 bg-white p-8 text-center dark:border-ink-700 dark:bg-ink-900"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
      >
        {uploading ? <Loader2 className="h-8 w-8 animate-spin text-brand-600" /> : <Upload className="h-8 w-8 text-ink-400" />}
        <p className="text-sm text-ink-600 dark:text-ink-400">Dateien hierher ziehen oder</p>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>Dateien auswählen</Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
        />
        {error && <p className="text-sm text-accent-500">{error}</p>}
        <p className="text-xs text-ink-400">JPG, PNG, WEBP, GIF, SVG – max. 8 MB</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {media.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
            <div className="relative aspect-square w-full bg-ink-100 dark:bg-ink-800">
              <Image src={item.url} alt={item.title ?? item.filename} fill sizes="240px" className="object-cover" />
            </div>
            {editing === item.id ? (
              <div className="space-y-1.5 p-2.5">
                <Input placeholder="Titel" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="text-xs" />
                <Input placeholder="Beschreibung" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="text-xs" />
                <Input placeholder="Quelle/Bildrechte" value={form.credit} onChange={(e) => setForm((f) => ({ ...f, credit: e.target.value }))} className="text-xs" />
                <div className="flex gap-1">
                  <button onClick={() => saveEdit(item.id)} className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setEditing(null)} className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-100 text-ink-500 dark:bg-ink-800"><X className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ) : (
              <div className="p-2.5">
                <p className="truncate text-xs font-medium text-ink-900 dark:text-white">{item.title ?? item.filename}</p>
                <p className="text-[11px] text-ink-400">{(item.size / 1024).toFixed(0)} KB · {item.uploader.name}</p>
                <div className="mt-1.5 flex gap-1">
                  <button onClick={() => startEdit(item)} className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(item)} className="flex h-7 w-7 items-center justify-center rounded-md text-accent-500 hover:bg-accent-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {media.length === 0 && <p className="col-span-full text-center text-sm text-ink-500 dark:text-ink-400">Noch keine Dateien hochgeladen.</p>}
      </div>
    </div>
  );
}
