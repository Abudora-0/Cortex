"use client";

import { useState, useTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Check } from "lucide-react";
import { saveNote } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function NoteEditor({
  noteId,
  initialTitle,
  initialBody,
}: {
  noteId: string;
  initialTitle: string;
  initialBody: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();

  let content: object | undefined;
  try {
    const parsed = JSON.parse(initialBody);
    content = parsed && Object.keys(parsed).length > 0 ? parsed : undefined;
  } catch {
    content = undefined;
  }

  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    onUpdate: () => setDirty(true),
    editorProps: {
      attributes: {
        class:
          "prose-note min-h-[50vh] focus:outline-none text-sm leading-relaxed text-ink",
      },
    },
  });

  const save = () => {
    if (!editor) return;
    startTransition(async () => {
      await saveNote(noteId, title, JSON.stringify(editor.getJSON()));
      setDirty(false);
      setSavedAt(new Date());
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              save();
            }
          }}
          className="w-full bg-transparent font-display text-2xl font-bold tracking-tight text-ink focus:outline-none"
          aria-label="Note title"
        />
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
            {pending ? (
              "Saving…"
            ) : dirty ? (
              "Unsaved changes"
            ) : savedAt ? (
              <>
                <Check size={12} className="text-pass" /> Saved
              </>
            ) : (
              ""
            )}
          </span>
          <Button size="sm" onClick={save} disabled={pending || !dirty}>
            Save
          </Button>
        </div>
      </div>

      <div
        className="rounded-card border border-line bg-paper px-6 py-5"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            save();
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">
        Markdown-style shortcuts work: <code># heading</code>, <code>- list</code>,{" "}
        <code>**bold**</code>. Ctrl+S saves.
      </p>
    </div>
  );
}
