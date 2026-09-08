"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Label, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import type { SiteSettings } from "@prisma/client";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [values, setValues] = useState({
    siteName: settings.siteName,
    tagline: settings.tagline,
    description: settings.description,
    logoUrl: settings.logoUrl ?? "",
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    contactAddress: settings.contactAddress,
    facebookUrl: settings.facebookUrl ?? "",
    instagramUrl: settings.instagramUrl ?? "",
    youtubeUrl: settings.youtubeUrl ?? "",
    tiktokUrl: settings.tiktokUrl ?? "",
    xUrl: settings.xUrl ?? "",
    footerText: settings.footerText,
    impressumContent: settings.impressumContent,
    datenschutzContent: settings.datenschutzContent,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error && <p className="rounded-lg bg-accent-500/10 px-4 py-3 text-sm text-accent-600">{error}</p>}

      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Allgemein</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="siteName">Website-Name</Label>
            <Input id="siteName" value={values.siteName} onChange={(e) => update("siteName", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tagline">Slogan</Label>
            <Input id="tagline" value={values.tagline} onChange={(e) => update("tagline", e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="description">Beschreibung (SEO)</Label>
          <Textarea id="description" rows={3} value={values.description} onChange={(e) => update("description", e.target.value)} />
        </div>
        <div className="mt-4">
          <Label>Logo</Label>
          <ImageUpload value={values.logoUrl} onChange={(url) => update("logoUrl", url)} label="Logo" />
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Kontaktinformationen</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="contactEmail">E-Mail-Adresse</Label>
            <Input id="contactEmail" type="email" value={values.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contactPhone">Telefonnummer</Label>
            <Input id="contactPhone" value={values.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="contactAddress">Adresse</Label>
          <Input id="contactAddress" value={values.contactAddress} onChange={(e) => update("contactAddress", e.target.value)} />
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Social Media</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="facebookUrl">Facebook</Label><Input id="facebookUrl" value={values.facebookUrl} onChange={(e) => update("facebookUrl", e.target.value)} placeholder="https://facebook.com/…" /></div>
          <div><Label htmlFor="instagramUrl">Instagram</Label><Input id="instagramUrl" value={values.instagramUrl} onChange={(e) => update("instagramUrl", e.target.value)} placeholder="https://instagram.com/…" /></div>
          <div><Label htmlFor="youtubeUrl">YouTube</Label><Input id="youtubeUrl" value={values.youtubeUrl} onChange={(e) => update("youtubeUrl", e.target.value)} placeholder="https://youtube.com/…" /></div>
          <div><Label htmlFor="tiktokUrl">TikTok</Label><Input id="tiktokUrl" value={values.tiktokUrl} onChange={(e) => update("tiktokUrl", e.target.value)} placeholder="https://tiktok.com/@…" /></div>
          <div><Label htmlFor="xUrl">X (Twitter)</Label><Input id="xUrl" value={values.xUrl} onChange={(e) => update("xUrl", e.target.value)} placeholder="https://x.com/…" /></div>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Footer</h2>
        <Label htmlFor="footerText">Footer-Text</Label>
        <Textarea id="footerText" rows={3} value={values.footerText} onChange={(e) => update("footerText", e.target.value)} />
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Impressum</h2>
        <RichTextEditor value={values.impressumContent} onChange={(html) => update("impressumContent", html)} />
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Datenschutzerklärung</h2>
        <RichTextEditor value={values.datenschutzContent} onChange={(html) => update("datenschutzContent", html)} />
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Einstellungen speichern
        </Button>
        {saved && <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Gespeichert</span>}
      </div>
    </form>
  );
}
