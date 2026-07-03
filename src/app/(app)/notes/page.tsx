import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNote, deleteNote } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

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

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Notes
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Scratchpads, lecture notes, anything worth keeping.
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader title="New note" />
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

      {notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          hint="Create your first note above — it opens straight into the editor."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((n) => (
            <Card key={n.id} className="group relative transition-colors hover:border-garnet-300">
              <Link href={`/notes/${n.id}`} className="block px-5 py-4">
                <p className="font-display text-sm font-semibold text-ink">{n.title}</p>
                <p className="mt-1 text-[11px] text-ink-faint">
                  edited {formatDate(n.updatedAt)}
                </p>
                {n.course ? (
                  <Chip tone="garnet" className="mt-2">
                    {n.course.code ?? n.course.title}
                  </Chip>
                ) : null}
              </Link>
              <form
                action={deleteNote.bind(null, n.id)}
                className="invisible absolute right-3 top-3 group-hover:visible"
              >
                <button
                  type="submit"
                  aria-label={`Delete ${n.title}`}
                  className="rounded-md p-1 text-ink-faint hover:bg-fail-soft hover:text-fail"
                >
                  <Trash2 size={14} />
                </button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
