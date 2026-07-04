"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trash2, Search, FileText } from "lucide-react";
import { deleteNote } from "@/lib/actions";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

export interface NoteCard {
  id: string;
  title: string;
  preview: string;
  words: number;
  courseId: string | null;
  courseLabel: string | null;
  editedLabel: string;
}

export interface CourseFacet {
  id: string;
  label: string;
}

function hueFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) >>> 0;
  return [349, 27, 152, 199, 262, 322][h % 6];
}

export function NotesBrowser({ notes, courses }: { notes: NoteCard[]; courses: CourseFacet[] }) {
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (course && n.courseId !== course) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.preview.toLowerCase().includes(q) ||
        (n.courseLabel?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [notes, query, course]);

  return (
    <div>
      {/* Search + course filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="h-10 w-full rounded-lg border border-line-strong bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint transition-all duration-200 hover:border-ink/40 focus:border-garnet-500 focus:outline-none focus:ring-[3px] focus:ring-[rgb(var(--accent-tint)/0.16)]"
            aria-label="Search notes"
          />
        </div>
        {courses.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPill active={course === null} onClick={() => setCourse(null)}>
              All
            </FilterPill>
            {courses.map((c) => (
              <FilterPill key={c.id} active={course === c.id} onClick={() => setCourse(c.id)}>
                <span
                  className="mr-1.5 inline-block size-2 rounded-full align-middle"
                  style={{ background: `hsl(${hueFor(c.id)} 62% 52%)` }}
                />
                {c.label}
              </FilterPill>
            ))}
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-paper px-5 py-12 text-center">
          <p className="text-sm font-medium text-ink">No notes match</p>
          <p className="mt-1 text-xs text-ink-faint">
            {query || course ? "Try clearing the search or filter." : "Create your first note above."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((n) => {
            const hue = n.courseId ? hueFor(n.courseId) : null;
            return (
              <div
                key={n.id}
                className="group relative overflow-hidden rounded-card border border-line bg-paper shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:border-garnet-300 hover:shadow-raise"
              >
                {hue != null ? (
                  <span
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ background: `hsl(${hue} 62% 52%)` }}
                  />
                ) : null}
                <Link href={`/notes/${n.id}`} className="block px-5 py-4 pl-6">
                  <p className="pr-7 font-display text-[15px] font-semibold leading-snug text-ink group-hover:text-garnet-600">
                    {n.title}
                  </p>
                  <p className="mt-1.5 line-clamp-2 min-h-[2.5em] text-xs leading-relaxed text-ink-soft">
                    {n.preview || "Empty note - open to start writing."}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {n.courseLabel ? (
                      <Chip tone="garnet">{n.courseLabel}</Chip>
                    ) : null}
                    <span className="text-[11px] text-ink-faint">edited {n.editedLabel}</span>
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] text-ink-faint">
                      <FileText size={11} /> {n.words}w
                    </span>
                  </div>
                </Link>
                <form
                  action={deleteNote.bind(null, n.id)}
                  className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <button
                    type="submit"
                    aria-label={`Delete ${n.title}`}
                    className="rounded-md p-1 text-ink-faint hover:bg-fail-soft hover:text-fail"
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-garnet-600 bg-garnet-600 text-white"
          : "border-line-strong bg-paper text-ink-soft hover:border-ink hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
