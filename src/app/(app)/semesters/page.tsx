import Link from "next/link";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAcademics } from "@/lib/queries";
import { createSemester, createCourse, deleteSemester, deleteCourse } from "@/lib/actions";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { CountUp } from "@/components/widgets/count-up";
import { cn } from "@/lib/utils";

function gpTone(gp: number | null | undefined) {
  if (gp == null) return { text: "text-ink-faint", bar: "bg-line", chip: "neutral" as const };
  if (gp >= 3) return { text: "text-pass", bar: "bg-pass", chip: "pass" as const };
  if (gp >= 2) return { text: "text-warn", bar: "bg-warn", chip: "warn" as const };
  return { text: "text-fail", bar: "bg-fail", chip: "fail" as const };
}

export default async function SemestersPage() {
  const user = await requireUser();
  const { semesters, cgpa, totalCredits } = await getAcademics(user.id);
  const totalCourses = semesters.reduce((s, sem) => s + sem.courses.length, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your academic record</p>
          <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
            Semesters
          </h1>
        </div>
        <form action={createSemester} className="flex items-end gap-2">
          <Input
            name="name"
            required
            placeholder={`e.g. Fall ${new Date().getFullYear()}`}
            className="w-44"
          />
          <Button type="submit" size="md">
            <Plus size={15} /> Add
          </Button>
        </form>
      </header>

      {/* Summary strip */}
      {semesters.length > 0 ? (
        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
          {[
            { label: "CGPA", value: cgpa != null ? <CountUp value={cgpa} decimals={2} /> : "—", accent: true },
            { label: "Credit hours", value: <CountUp value={totalCredits} /> },
            { label: "Courses", value: <CountUp value={totalCourses} /> },
            { label: "Semesters", value: <CountUp value={semesters.length} /> },
          ].map((s) => (
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
      ) : null}

      {semesters.length === 0 ? (
        <EmptyState
          title="No semesters yet"
          hint="Create your first semester above, or sync your LMS from Settings to pull them in automatically."
        />
      ) : (
        <div className="space-y-5">
          {semesters.map((sem, si) => {
            const t = gpTone(sem.gpa);
            const graded = sem.courses.filter((c) => c.gradePoints != null).length;
            return (
              <Card key={sem.id} className="rise overflow-hidden" style={{ ["--d" as string]: `${si * 70}ms` }}>
                {/* Semester header */}
                <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
                  <div>
                    <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                      {sem.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {sem.courses.length} course{sem.courses.length === 1 ? "" : "s"}
                      {" · "}
                      {sem.creditHours} credit hours{graded < sem.courses.length ? ` · ${graded} graded` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {sem.gpa != null ? (
                      <div className="text-right">
                        <p className={cn("stat-figure text-2xl font-bold leading-none", t.text)}>
                          <CountUp value={sem.gpa} decimals={2} />
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-ink-faint">GPA</p>
                      </div>
                    ) : (
                      <Chip>no marks</Chip>
                    )}
                    <form action={deleteSemester.bind(null, sem.id)}>
                      <button
                        type="submit"
                        aria-label={`Delete ${sem.name}`}
                        className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-fail-soft hover:text-fail"
                      >
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </div>
                </div>

                {/* GPA meter */}
                {sem.gpa != null ? (
                  <div className="px-5 pb-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className={cn("grow-x h-full rounded-full", t.bar)}
                        style={{ width: `${(sem.gpa / 4) * 100}%`, ["--d" as string]: `${si * 70 + 200}ms` }}
                      />
                    </div>
                  </div>
                ) : null}

                <CardBody className="p-0">
                  {sem.courses.length > 0 ? (
                    <ul className="border-t border-line">
                      {sem.courses.map((c) => {
                        const ct = gpTone(c.gradePoints);
                        return (
                          <li
                            key={c.id}
                            className="group flex items-center gap-3 border-b border-line/70 px-5 py-2.5 last:border-0 hover:bg-canvas/60"
                          >
                            {/* course */}
                            <Link href={`/courses/${c.id}`} className="min-w-0 flex-1">
                              <p className="flex items-center gap-2 truncate text-sm font-medium text-ink group-hover:text-garnet-600">
                                {c.code ? <span className="stat-figure text-xs text-ink-faint">{c.code}</span> : null}
                                <span className="truncate">{c.title}</span>
                                {c.source === "LMS" ? <Chip tone="garnet">LMS</Chip> : null}
                                {c.lmsStatus === "Provisional" ? <Chip tone="warn">Provisional</Chip> : null}
                              </p>
                            </Link>

                            {/* credit hours */}
                            <span className="stat-figure hidden w-8 shrink-0 text-center text-xs text-ink-faint sm:block">
                              {c.creditHours}cr
                            </span>

                            {/* gp bar */}
                            <div className="hidden w-20 shrink-0 sm:block">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/70">
                                <div
                                  className={cn("h-full rounded-full", ct.bar)}
                                  style={{ width: `${((c.gradePoints ?? 0) / 4) * 100}%` }}
                                />
                              </div>
                            </div>

                            {/* grade */}
                            <div className="w-16 shrink-0 text-right">
                              {c.letter ? (
                                <Chip tone={ct.chip}>
                                  {c.letter}
                                </Chip>
                              ) : (
                                <span className="text-[11px] text-ink-faint">ungraded</span>
                              )}
                            </div>

                            {/* delete */}
                            <form action={deleteCourse.bind(null, c.id)} className="shrink-0">
                              <button
                                type="submit"
                                aria-label={`Delete ${c.title}`}
                                className="invisible rounded-md p-1 text-ink-faint transition-colors hover:bg-fail-soft hover:text-fail group-hover:visible"
                              >
                                <Trash2 size={14} />
                              </button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {/* Add course */}
                  <details className="group border-t border-line/70">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-garnet-600 transition-colors hover:bg-canvas/60">
                      <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                      Add course
                    </summary>
                    <form
                      action={createCourse.bind(null, sem.id)}
                      className="flex flex-wrap items-end gap-3 border-t border-line/70 bg-canvas/40 px-5 py-4"
                    >
                      <Field label="Title" className="min-w-52 flex-1">
                        <Input name="title" required placeholder="Data Structures" />
                      </Field>
                      <Field label="Code" className="w-32">
                        <Input name="code" placeholder="CS-201" />
                      </Field>
                      <Field label="Credits" className="w-24">
                        <Input name="creditHours" type="number" step="0.5" min="0" max="12" defaultValue="3" />
                      </Field>
                      <Button type="submit" size="md">
                        Add
                      </Button>
                    </form>
                  </details>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
