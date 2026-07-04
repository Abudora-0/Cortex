"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ?? `Copy ${text}`}
      className={cn(
        "inline-flex items-center gap-1 text-ink-faint transition-colors hover:text-garnet-600",
        className
      )}
    >
      {copied ? <Check size={13} className="text-pass" /> : <Copy size={13} />}
    </button>
  );
}
