import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NoteEditor } from "@/components/note-editor";
import { Chip } from "@/components/ui/chip";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const note = await prisma.note.findFirst({
    where: { id, userId: user.id },
    include: { course: { select: { code: true, title: true } } },
  });
  if (!note) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint hover:text-garnet-600"
        >
          <ArrowLeft size={13} /> All notes
        </Link>
        {note.course ? (
          <Chip tone="garnet">{note.course.code ?? note.course.title}</Chip>
        ) : null}
      </div>
      <NoteEditor
        noteId={note.id}
        initialTitle={note.title}
        initialBody={note.body}
      />
    </div>
  );
}
