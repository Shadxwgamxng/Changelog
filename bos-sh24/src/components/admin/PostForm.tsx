"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Label, Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Category { id: string; name: string; }
interface AuthorOption { id: string; name: string; }
interface GalleryItem { url: string; caption: string; }

interface PostFormValues {
  id?: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  categoryId: string;
  tags: string;
  coverImageUrl: string;
  coverImageAlt: string;
  authorId: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  scheduledAt: string;
  gallery: GalleryItem[];
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Entwurf" },
  { value: "SCHEDULED", label: "Geplant" },
  { value: "PUBLISHED", label: "Veröffentlicht" },
  { value: "ARCHIVED", label: "Archiviert" },
];

export function PostForm({
  initial,
  categories,
  authors,
  canPickAuthor,
}: {
  initial?: Partial<PostFormValues>;
  categories: Category[];
  authors: AuthorOption[];
  canPickAuthor: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PostFormValues>({
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    excerpt: initial?.excerpt ?? "",
    content: initial?.content ?? "",
    categoryId: initial?.categoryId ?? categories[0]?.id ?? "",
    tags: initial?.tags ?? "",
    coverImageUrl: initial?.coverImageUrl ?? "",
    coverImageAlt: initial?.coverImageAlt ?? "",
    authorId: initial?.authorId ?? authors[0]?.id ?? "",
    status: initial?.status ?? "DRAFT",
    featured: initial?.featured ?? false,
    scheduledAt: initial?.scheduledAt ?? "",
    gallery: initial?.gallery ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function addGalleryItem() {
    update("gallery", [...values.gallery, { url: "", caption: "" }]);
  }

  function updateGalleryItem(index: number, patch: Partial<GalleryItem>) {
    update("gallery", values.gallery.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function removeGalleryItem(index: number) {
    update("gallery", values.gallery.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      title: values.title,
      subtitle: values.subtitle,
      excerpt: values.excerpt,
      content: values.content,
      categoryId: values.categoryId,
      tags: values.tags.split(",").map((t) => t.trim()).filter(Boolean),
      coverImageUrl: values.coverImageUrl,
      coverImageAlt: values.coverImageAlt,
      authorId: values.authorId,
      status: values.status,
      featured: values.featured,
      scheduledAt: values.scheduledAt,
      gallery: values.gallery.filter((g) => g.url),
    };

    try {
      const res = await fetch(initial?.id ? `/api/admin/posts/${initial.id}` : "/api/admin/posts", {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Speichern fehlgeschlagen.");
        setLoading(false);
        return;
      }
      router.push("/admin/beitraege");
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <p className="rounded-lg bg-accent-500/10 px-4 py-3 text-sm text-accent-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div>
            <Label htmlFor="title">Titel *</Label>
            <Input id="title" required maxLength={200} value={values.title} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="subtitle">Untertitel</Label>
            <Input id="subtitle" maxLength={240} value={values.subtitle} onChange={(e) => update("subtitle", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="excerpt">Kurze Vorschau *</Label>
            <Textarea id="excerpt" required rows={3} maxLength={400} value={values.excerpt} onChange={(e) => update("excerpt", e.target.value)} />
          </div>
          <div>
            <Label>Artikeltext *</Label>
            <RichTextEditor value={values.content} onChange={(html) => update("content", html)} />
          </div>

          <div>
            <Label>Bildergalerie</Label>
            <div className="space-y-3">
              {values.gallery.map((item, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-ink-200 p-3 dark:border-ink-700">
                  <div className="flex-1 space-y-2">
                    <ImageUpload value={item.url} onChange={(url) => updateGalleryItem(i, { url })} label="Galeriebild" />
                    <Input placeholder="Bildunterschrift (optional)" value={item.caption} onChange={(e) => updateGalleryItem(i, { caption: e.target.value })} />
                  </div>
                  <button type="button" onClick={() => removeGalleryItem(i)} className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-accent-500 dark:hover:bg-ink-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addGalleryItem} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-ink-300 px-3 py-2 text-sm text-ink-600 hover:border-brand-400 dark:border-ink-600 dark:text-ink-300">
                <Plus className="h-4 w-4" /> Bild hinzufügen
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
            <h3 className="mb-4 font-display text-sm font-bold text-ink-900 dark:text-white">Veröffentlichung</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select id="status" value={values.status} onChange={(e) => update("status", e.target.value as PostFormValues["status"])}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
              {values.status === "SCHEDULED" && (
                <div>
                  <Label htmlFor="scheduledAt">Geplante Veröffentlichung</Label>
                  <Input id="scheduledAt" type="datetime-local" value={values.scheduledAt} onChange={(e) => update("scheduledAt", e.target.value)} />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
                <input type="checkbox" checked={values.featured} onChange={(e) => update("featured", e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-600" />
                Als Hauptbeitrag (Hero) markieren
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
            <h3 className="mb-4 font-display text-sm font-bold text-ink-900 dark:text-white">Einordnung</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="categoryId">Kategorie *</Label>
                <Select id="categoryId" required value={values.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="tags">Schlagwörter (Komma-getrennt)</Label>
                <Input id="tags" value={values.tags} onChange={(e) => update("tags", e.target.value)} placeholder="einsatz, feuerwehr, verkehrsunfall" />
              </div>
              {canPickAuthor && (
                <div>
                  <Label htmlFor="authorId">Autor</Label>
                  <Select id="authorId" value={values.authorId} onChange={(e) => update("authorId", e.target.value)}>
                    {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
            <h3 className="mb-4 font-display text-sm font-bold text-ink-900 dark:text-white">Beitragsbild</h3>
            <ImageUpload value={values.coverImageUrl} onChange={(url) => update("coverImageUrl", url)} label="Titelbild" />
            <div className="mt-3">
              <Label htmlFor="coverImageAlt">Alt-Text (SEO)</Label>
              <Input id="coverImageAlt" value={values.coverImageAlt} onChange={(e) => update("coverImageAlt", e.target.value)} />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial?.id ? "Änderungen speichern" : "Beitrag erstellen"}
          </Button>
        </div>
      </div>
    </form>
  );
}
