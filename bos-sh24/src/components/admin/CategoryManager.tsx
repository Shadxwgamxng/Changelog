"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Label, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count: { posts: number };
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", color: "#3564ff" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm({ name: "", description: "", color: "#3564ff" });
    setError("");
  }

  function startEdit(cat: Category) {
    setCreating(false);
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description ?? "", color: cat.color });
    setError("");
  }

  async function submit() {
    setLoading(true);
    setError("");
    const url = editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setCreating(false);
    setEditing(null);
    router.refresh();
  }

  async function remove(cat: Category) {
    if (!window.confirm(`Kategorie „${cat.name}“ wirklich löschen?`)) return;
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  const showForm = creating || editing;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Alle Kategorien</h2>
          <Button size="sm" onClick={startCreate}><Plus className="h-4 w-4" /> Neue Kategorie</Button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <div>
                  <p className="font-medium text-ink-900 dark:text-white">{cat.name}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">{cat._count.posts} Beiträge</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(cat)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(cat)} className="flex h-8 w-8 items-center justify-center rounded-lg text-accent-500 hover:bg-accent-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <h3 className="mb-4 font-display text-sm font-bold text-ink-900 dark:text-white">
            {editing ? "Kategorie bearbeiten" : "Neue Kategorie"}
          </h3>
          {error && <p className="mb-3 rounded-lg bg-accent-500/10 px-3 py-2 text-sm text-accent-600">{error}</p>}
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="cat-desc">Beschreibung</Label>
              <Textarea id="cat-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="cat-color">Farbe</Label>
              <input id="cat-color" type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="h-10 w-16 rounded-lg border border-ink-300 dark:border-ink-600" />
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={loading || !form.name}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Speichern
              </Button>
              <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
