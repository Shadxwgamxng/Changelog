"use client";

import { Facebook, Link2, Send } from "lucide-react";
import { useState } from "react";

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage evtl. nicht verfügbar – kein Blocker.
    }
  }

  const linkClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300";

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-ink-500 dark:text-ink-400">Teilen:</span>
      <a className={linkClass} href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Auf Facebook teilen">
        <Facebook className="h-4 w-4" />
      </a>
      <a className={linkClass} href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Auf X teilen">
        <XIcon />
      </a>
      <a className={linkClass} href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Per WhatsApp teilen">
        <Send className="h-4 w-4" />
      </a>
      <button onClick={copyLink} className={linkClass} aria-label="Link kopieren">
        <Link2 className="h-4 w-4" />
      </button>
      {copied && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Link kopiert!</span>}
    </div>
  );
}
