import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAcademics } from "@/lib/queries";
import { createSemester, createCourse, deleteSemester, deleteCourse } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/input";
import { Table, THead, Th, Tr, Td, RowNum } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SemestersPage() {
  const user = await requireUser();
  const { semesters } = await getAcademics(user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Semesters
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Courses, marks and per-semester GPA.
          </p>
        </div>
        <form action={createSemester} className="flex items-end gap-2">
          <Input
            name="name"
            required
            placeholder={`e.g. Fall ${new Date().getFullYear()}`}
            className="w-44"
          />
          <Button type="submit" size="md">
            <Plus size={15} /> Semester
          </Button>
        </form>
      </header>

      {semesters.length === 0 ? (
        <EmptyState
          title="No semesters yet"
          hint="Create your first semester above, then add the courses you're enrolled in."
        />
      ) : (
        <div className="space-y-6">
          {semesters.map((sem) => (
            <Card key={sem.id}>
              <CardHeader
                title={sem.name}
                hint={`${sem.courses.length} courses · ${sem.creditHours} credit hours counted`}
                action={
                  <div className="flex items-center gap-3">
                    {sem.gpa != null ? (
                      <span className="stat-figure text-xl font-bold text-garnet-600">
                        {sem.gpa.toFixed(2)}
                      </span>
                    ) : (
                      <Chip>no marks</Chip>
                    )}
                    <form action={deleteSemester.bind(null, sem.id)}>
                      <button
                        type="submit"
                        aria-label={`Delete ${sem.name}`}
                        className="rounded-md p-1.5 text-ink-faint hover:bg-fail-soft hover:text-fail"
                      >
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </div>
                }
              />
              <CardBody className="p-0">
                {sem.courses.length > 0 ? (
                  <Table>
                    <THead>
                      <Th className="w-10 pr-0">#</Th>
                      <Th>Course</Th>
                      <Th>Credits</Th>
                      <Th>Standing</Th>
                      <Th>Grade</Th>
                      <Th className="w-12" />
                    </THead>
                    <tbody>
                      {sem.courses.map((c, i) => (
                        <Tr key={c.id}>
                          <RowNum n={i + 1} />
                          <Td>
                            <Link
                              href={`/courses/${c.id}`}
                              className="font-medium text-ink underline-offset-4 hover:text-garnet-600 hover:underline"
                            >
                              {c.code ? `${c.code} — ` : ""}
                              {c.title}
                            </Link>
                            {c.source === "LMS" ? (
                              <Chip tone="garnet" className="ml-2">
                                LMS
                              </Chip>
                            ) : null}
                          </Td>
                          <Td className="stat-figure text-ink-soft">{c.creditHours}</Td>
                          <Td className="stat-figure text-ink-soft">
                            {c.percent != null ? `${c.percent.toFixed(1)}%` : "—"}
                          </Td>
                          <Td>
                            {c.letter ? (
                              <Chip
                                tone={
                                  (c.gradePoints ?? 0) >= 3
                                    ? "pass"
                                    : (c.gradePoints ?? 0) >= 2
                                      ? "warn"
                                      : "fail"
                                }
                              >
                                {c.letter} · {c.gradePoints?.toFixed(2)}
                              </Chip>
                            ) : (
                              <span className="text-xs text-ink-faint">ungraded</span>
                            )}
                          </Td>
                          <Td>
                            <form action={deleteCourse.bind(null, c.id)}>
                              <button
                                type="submit"
                                aria-label={`Delete ${c.title}`}
                                className="rounded-md p-1 text-ink-faint hover:bg-fail-soft hover:text-fail"
                              >
                                <Trash2 size={14} />
                              </button>
                            </form>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                ) : null}

                <details className="group border-t border-line/70">
                  <summary className="cursor-pointer list-none px-5 py-3 text-xs font-semibold uppercase tracking-wide text-garnet-600 hover:bg-canvas/60">
                    + Add course
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
                      <Input
                        name="creditHours"
                        type="number"
                        step="0.5"
                        min="0"
                        max="12"
                        defaultValue="3"
                      />
                    </Field>
                    <Button type="submit" size="md">
                      Add
                    </Button>
                  </form>
                </details>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
