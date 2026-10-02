"use client";

import { useId, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./button";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const id = useId();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: Text markieren, damit manuell kopiert werden kann
      document.getElementById(id)?.focus();
    }
  };
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <input id={id} readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="input font-mono text-xs" />
        <Button onClick={copy} aria-label="In Zwischenablage kopieren">
          {copied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
          {copied ? "Kopiert" : "Kopieren"}
        </Button>
      </div>
    </div>
  );
}
