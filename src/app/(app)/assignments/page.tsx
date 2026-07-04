import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAssignment } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { AssignmentsBoard, type AssignmentCard } from "@/components/assignments-board";
import { cn } from "@/lib/utils";

export const metadata = { title: "Assignments" };

const DONE = (s: string) => s === "SUBMITTED" || s === "GRADED";

export default async function AssignmentsPage() {
  const { id: userId } = await requireUser();

  const [rows, courses] = await Promise.all([
    prisma.assignment.findMany({
      where: { userId },
      include: { course: { select: { code: true, title: true } } },
    }),
    prisma.course.findMany({
      where: { semester: { userId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true, title: true },
    }),
  ]);

  // Sort: soonest due first, undated last, then newest.
  const sorted = [...rows].sort((a, b) => {
    const ad = a.dueAt ? a.dueAt.getTime() : Infinity;
    const bd = b.dueAt ? b.dueAt.getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const cards: AssignmentCard[] = sorted.map((a) => ({
    id: a.id,
    title: a.title,
    courseId: a.courseId,
    courseLabel: a.course ? a.course.code ?? a.course.title : null,
    dueISO: a.dueAt ? a.dueAt.toISOString() : null,
    status: a.status,
    link: a.link,
  }));

  const now = Date.now();
  const open = rows.filter((a) => !DONE(a.status));
  const overdue = open.filter((a) => a.status === "TODO" && a.dueAt && a.dueAt.getTime() < now).length;
  const dueSoon = open.filter(
    (a) => a.dueAt && a.dueAt.getTime() >= now && a.dueAt.getTime() - now < 7 * 86_400_000
  ).length;
  const done = rows.length - open.length;

  const stats = [
    { label: "Open", value: String(open.length), accent: true },
    { label: "Overdue", value: String(overdue) },
    { label: "Due this week", value: String(dueSoon) },
    { label: "Done", value: String(done) },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="eyebrow">Stay ahead of deadlines</p>
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
          Assignments
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Track what&apos;s due, mark things submitted, and keep the link to each task in one place.
        </p>
      </header>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-paper px-5 py-4">
            <p className={cn("stat-figure text-2xl font-bold", s.accent ? "text-garnet-600" : "text-ink")}>
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Add assignment */}
      <Card className="mb-6">
        <CardHeader title="New assignment" hint="a link to the Classroom / Eduko task is optional" />
        <CardBody>
          <form action={createAssignment} className="flex flex-wrap items-end gap-3">
            <Field label="Title" className="min-w-52 flex-1">
              <Input name="title" required placeholder="OS Assignment 3 — Scheduling" />
            </Field>
            <Field label="Course" className="w-44">
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
            <Field label="Due" className="w-52">
              <Input name="dueAt" type="datetime-local" />
            </Field>
            <Field label="Link" className="min-w-44 flex-1">
              <Input name="link" type="url" placeholder="classroom.google.com/…" />
            </Field>
            <Button type="submit">
              <Plus size={15} /> Add
            </Button>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-paper px-5 py-12 text-center">
          <p className="text-sm font-medium text-ink">No assignments yet</p>
          <p className="mt-1 text-xs text-ink-faint">
            Add one above — due dates power the &ldquo;Due this week&rdquo; count and turn red when overdue.
          </p>
        </div>
      ) : (
        <AssignmentsBoard assignments={cards} />
      )}
    </div>
  );
}
