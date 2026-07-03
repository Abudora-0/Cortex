"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncLmsResults } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function LmsSync({ status }: { status: "none" | "valid" | "expired" }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () =>
    startTransition(async () => {
      setMsg(null);
      const r = await syncLmsResults();
      setMsg({ ok: r.ok, text: r.message });
    });

  return (
    <div className="space-y-3">
      <Button onClick={run} disabled={pending}>
        <RefreshCw size={14} className={pending ? "animate-spin" : ""} />
        {pending ? "Syncing…" : "Sync results now"}
      </Button>

      {msg ? (
        <p
          className={
            "rounded-lg border px-3 py-2 text-xs " +
            (msg.ok
              ? "border-pass/25 bg-pass-soft text-pass"
              : "border-warn/25 bg-warn-soft text-warn")
          }
        >
          {msg.text}
        </p>
      ) : status === "expired" ? (
        <p className="text-xs text-warn">
          Your saved session has expired. Re-run{" "}
          <code className="rounded bg-canvas px-1">npm run lms:connect</code> to refresh it.
        </p>
      ) : null}
    </div>
  );
}
