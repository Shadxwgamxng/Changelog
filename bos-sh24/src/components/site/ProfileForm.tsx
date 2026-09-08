"use client";

import { useState, type FormEvent } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Label, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ProfileForm({ user }: { user: { name: string; bio: string | null; avatarUrl: string | null } }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSaved(false);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        bio: form.get("bio"),
        avatarUrl: form.get("avatarUrl"),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-accent-500/10 px-4 py-3 text-sm text-accent-600">{error}</p>}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={user.name} required maxLength={100} />
      </div>
      <div>
        <Label htmlFor="avatarUrl">Profilbild-URL (optional)</Label>
        <Input id="avatarUrl" name="avatarUrl" defaultValue={user.avatarUrl ?? ""} placeholder="https://…" />
      </div>
      <div>
        <Label htmlFor="bio">Über mich</Label>
        <Textarea id="bio" name="bio" defaultValue={user.bio ?? ""} rows={4} maxLength={500} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Änderungen speichern
        </Button>
        {saved && <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Gespeichert</span>}
      </div>
    </form>
  );
}
