import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNote } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { NotesBrowser, type NoteCard, type CourseFacet } from "@/components/notes-browser";
import { formatDate } from "@/lib/utils";

// Pull readable plain text out of a TipTap/ProseMirror JSON document.
function noteText(body: string): string {
  try {
    const doc = JSON.parse(body);
    const parts: string[] = [];
    const walk = (n: unknown) => {
      if (!n || typeof n !== "object") return;
      const node = n as { text?: string; content?: unknown[] };
      if (typeof node.text === "string") parts.push(node.text);
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    walk(doc);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

export default async function NotesPage() {
  const { id: userId } = await requireUser();
  const [notes, courses] = await Promise.all([
    prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { course: { select: { code: true, title: true } } },
    }),
    prisma.course.findMany({
      where: { semester: { userId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true, title: true },
    }),
  ]);

  const cards: NoteCard[] = notes.map((n) => {
    const text = noteText(n.body);
    return {
      id: n.id,
      title: n.title,
      preview: text.slice(0, 180),
      words: text ? text.split(/\s+/).length : 0,
      courseId: n.courseId ?? null,
      courseLabel: n.course ? n.course.code ?? n.course.title : null,
      editedLabel: formatDate(n.updatedAt),
    };
  });

  // Only surface courses that actually have notes, for the filter.
  const usedCourseIds = new Set(cards.map((c) => c.courseId).filter(Boolean));
  const facets: CourseFacet[] = courses
    .filter((c) => usedCourseIds.has(c.id))
    .map((c) => ({ id: c.id, label: c.code ?? c.title }));

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Everything worth keeping</p>
          <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
            Notes
          </h1>
        </div>
        <span className="text-xs text-ink-faint">
          {cards.length} note{cards.length === 1 ? "" : "s"}
        </span>
      </header>

      <Card className="mb-6">
        <CardHeader title="New note" hint="opens straight into the editor" />
        <CardBody>
          <form action={createNote} className="flex flex-wrap items-end gap-3">
            <Field label="Title" className="min-w-52 flex-1">
              <Input name="title" required placeholder="Week 6 — Transformers lecture" />
            </Field>
            <Field label="Course (optional)" className="w-56">
              <Select name="courseId" defaultValue="">
                <option value="">No course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} — ` : ""}
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit">
              <Plus size={15} /> Create
            </Button>
          </form>
        </CardBody>
      </Card>

      {cards.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-paper px-5 py-12 text-center">
          <p className="text-sm font-medium text-ink">No notes yet</p>
          <p className="mt-1 text-xs text-ink-faint">
            Create your first note above — it opens straight into the editor.
          </p>
        </div>
      ) : (
        <NotesBrowser notes={cards} courses={facets} />
      )}
    </div>
  );
}
