"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Label, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface EventFormValues {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  location: string;
  address: string;
  category: string;
  isPublic: boolean;
}

export function EventForm({ initial }: { initial?: Partial<EventFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    imageUrl: initial?.imageUrl ?? "",
    startsAt: initial?.startsAt ?? "",
    endsAt: initial?.endsAt ?? "",
    location: initial?.location ?? "",
    address: initial?.address ?? "",
    category: initial?.category ?? "",
    isPublic: initial?.isPublic ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(initial?.id ? `/api/admin/events/${initial.id}` : "/api/admin/events", {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Speichern fehlgeschlagen.");
        setLoading(false);
        return;
      }
      router.push("/admin/veranstaltungen");
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-accent-500/10 px-4 py-3 text-sm text-accent-600">{error}</p>}
      <div>
        <Label htmlFor="title">Titel *</Label>
        <Input id="title" required value={values.title} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="description">Beschreibung *</Label>
        <Textarea id="description" required rows={5} value={values.description} onChange={(e) => update("description", e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startsAt">Beginn *</Label>
          <Input id="startsAt" type="datetime-local" required value={values.startsAt} onChange={(e) => update("startsAt", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="endsAt">Ende</Label>
          <Input id="endsAt" type="datetime-local" value={values.endsAt} onChange={(e) => update("endsAt", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="location">Veranstaltungsort *</Label>
          <Input id="location" required value={values.location} onChange={(e) => update("location", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="category">Kategorie</Label>
          <Input id="category" value={values.category} onChange={(e) => update("category", e.target.value)} placeholder="z. B. Tag der offenen Tür" />
        </div>
      </div>
      <div>
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" value={values.address} onChange={(e) => update("address", e.target.value)} />
      </div>
      <div>
        <Label>Bild</Label>
        <ImageUpload value={values.imageUrl} onChange={(url) => update("imageUrl", url)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
        <input type="checkbox" checked={values.isPublic} onChange={(e) => update("isPublic", e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-600" />
        Öffentlich sichtbar
      </label>
      <Button type="submit" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial?.id ? "Änderungen speichern" : "Veranstaltung erstellen"}
      </Button>
    </form>
  );
}
