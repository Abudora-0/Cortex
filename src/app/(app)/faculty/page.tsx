import Link from "next/link";
import { Plus, Mail, MapPin, Clock, Trash2, ChevronDown, GraduationCap } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createTeacher, updateTeacher, deleteTeacher } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/input";
import { CopyButton } from "@/components/copy-button";

export const metadata = { title: "Faculty" };

export default async function FacultyPage() {
  const { id: userId } = await requireUser();

  const teachers = await prisma.teacher.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { courses: { select: { id: true, code: true, title: true } } },
  });

  const withEmail = teachers.filter((t) => t.email).length;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="eyebrow">Who teaches what</p>
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
          Faculty
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Keep instructors, office hours and emails in one place — one tap opens a message in your own mail app.
        </p>
      </header>

      {/* Stats strip */}
      {teachers.length > 0 ? (
        <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line">
          <Stat label="Instructors" value={String(teachers.length)} accent />
          <Stat label="With email" value={String(withEmail)} />
          <Stat
            label="Courses linked"
            value={String(teachers.reduce((s, t) => s + t.courses.length, 0))}
          />
        </div>
      ) : null}

      {/* Add teacher */}
      <Card className="mb-6">
        <CardHeader title="Add an instructor" hint="only a name is required" />
        <CardBody>
          <form action={createTeacher} className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <Input name="name" required placeholder="Dr. Ayesha Khan" />
            </Field>
            <Field label="Title">
              <Input name="title" placeholder="Assistant Professor" />
            </Field>
            <Field label="Department">
              <Input name="department" placeholder="Computer Science" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" placeholder="ayesha@uet.edu.pk" />
            </Field>
            <Field label="Office">
              <Input name="office" placeholder="Room 214, CS Block" />
            </Field>
            <Field label="Office hours" className="sm:col-span-2">
              <Input name="officeHours" placeholder="Mon & Wed, 2–4 PM" />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit">
                <Plus size={15} /> Add instructor
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {teachers.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-paper px-5 py-12 text-center">
          <GraduationCap size={20} className="mx-auto text-ink-faint" />
          <p className="mt-2 text-sm font-medium text-ink">No instructors yet</p>
          <p className="mt-1 text-xs text-ink-faint">
            Add your teachers above, then link them to courses from each course page.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teachers.map((t) => (
            <Card key={t.id} className="group flex flex-col">
              <CardBody className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-semibold text-ink">
                      {t.title ? <span className="text-ink-soft">{t.title} </span> : null}
                      {t.name}
                    </p>
                    {t.department ? (
                      <p className="mt-0.5 text-xs text-ink-faint">{t.department}</p>
                    ) : null}
                  </div>
                  <form action={deleteTeacher.bind(null, t.id)} className="shrink-0">
                    <button
                      type="submit"
                      aria-label={`Delete ${t.name}`}
                      className="rounded-md p-1 text-ink-faint opacity-0 transition-opacity hover:bg-fail-soft hover:text-fail group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>

                <div className="space-y-1.5 text-xs text-ink-soft">
                  {t.email ? (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="shrink-0 text-ink-faint" />
                      <a
                        href={`mailto:${t.email}`}
                        className="min-w-0 truncate font-medium text-garnet-600 hover:underline"
                      >
                        {t.email}
                      </a>
                      <CopyButton text={t.email} label={`Copy ${t.name}'s email`} />
                    </div>
                  ) : null}
                  {t.office ? (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="shrink-0 text-ink-faint" />
                      <span className="truncate">{t.office}</span>
                    </div>
                  ) : null}
                  {t.officeHours ? (
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="shrink-0 text-ink-faint" />
                      <span className="truncate">{t.officeHours}</span>
                    </div>
                  ) : null}
                </div>

                {t.courses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {t.courses.map((c) => (
                      <Link key={c.id} href={`/courses/${c.id}`}>
                        <Chip tone="neutral" className="hover:border-ink">
                          {c.code ?? c.title}
                        </Chip>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </CardBody>

              <div className="border-t border-line/70">
                {t.email ? (
                  <a
                    href={`mailto:${t.email}`}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-garnet-600 transition-colors hover:bg-canvas/60"
                  >
                    <Mail size={13} /> Send email
                  </a>
                ) : null}
                <details className="group/edit border-t border-line/70">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint hover:text-ink">
                    <ChevronDown size={13} className="transition-transform group-open/edit:rotate-180" />
                    Edit
                  </summary>
                  <form
                    action={updateTeacher.bind(null, t.id)}
                    className="grid gap-2.5 border-t border-line/70 bg-canvas/40 px-4 py-3 sm:grid-cols-2"
                  >
                    <Field label="Name" className="sm:col-span-2">
                      <Input name="name" required defaultValue={t.name} />
                    </Field>
                    <Field label="Title">
                      <Input name="title" defaultValue={t.title ?? ""} />
                    </Field>
                    <Field label="Department">
                      <Input name="department" defaultValue={t.department ?? ""} />
                    </Field>
                    <Field label="Email">
                      <Input name="email" type="email" defaultValue={t.email ?? ""} />
                    </Field>
                    <Field label="Office">
                      <Input name="office" defaultValue={t.office ?? ""} />
                    </Field>
                    <Field label="Office hours" className="sm:col-span-2">
                      <Input name="officeHours" defaultValue={t.officeHours ?? ""} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Button type="submit" size="sm" variant="secondary">
                        Save changes
                      </Button>
                    </div>
                  </form>
                </details>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-paper px-5 py-4">
      <p className={`stat-figure text-2xl font-bold ${accent ? "text-garnet-600" : "text-ink"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
        {label}
      </p>
    </div>
  );
}
