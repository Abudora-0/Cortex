"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { saveCourseOutline } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function CourseOutlineEditor({
  courseId,
  initial,
}: {
  courseId: string;
  initial: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [pending, start] = useTransition();

  const items = saved
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const save = () =>
    start(async () => {
      await saveCourseOutline(courseId, text);
      setSaved(text);
      setEditing(false);
    });

  const cancel = () => {
    setText(saved);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        <ol className="space-y-2">
          {items.map((line, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink">
              <span className="stat-figure w-5 shrink-0 text-right text-xs text-ink-faint">
                {i + 1}
              </span>
              <span className="leading-snug">{line}</span>
            </li>
          ))}
        </ol>
        <button
          onClick={() => setEditing(true)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-garnet-600 hover:underline"
        >
          <Pencil size={12} /> Edit outline
        </button>
      </div>
    );
  }

  return (
    <div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={"One topic per line, e.g.\nWeek 1 — Introduction & complexity\nWeek 2 — Arrays and linked lists\nWeek 3 — Stacks & queues"}
        className="text-sm leading-relaxed"
      />
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          <Check size={13} /> Save outline
        </Button>
        {saved ? (
          <Button variant="ghost" size="sm" onClick={cancel} disabled={pending}>
            <X size={13} /> Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
