import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserDefaultScheme } from "@/lib/queries";
import {
  courseStanding,
  gradePointsFor,
  letterFor,
  parseScheme,
} from "@/lib/gpa";
import { createAssessment, deleteAssessment } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, THead, Th, Tr, Td, RowNum } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Bar } from "@/components/ui/progress";
import { SchemeEditor } from "@/components/scheme-editor";
import { cn } from "@/lib/utils";

const TYPES = ["QUIZ", "ASSIGNMENT", "MID", "FINAL", "LAB", "PROJECT", "OTHER"];

const gradeTone = (gp: number | null | undefined) =>
  gp == null ? "text-ink" : gp >= 3 ? "text-pass" : gp >= 2 ? "text-warn" : "text-fail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: { code: true, title: true },
  });
  return { title: course ? course.code || course.title : "Course" };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { id: userId } = await requireUser();

  const course = await prisma.course.findFirst({
    where: { id, semester: { userId } },
    include: {
      assessments: { orderBy: { createdAt: "asc" } },
      gradeScheme: true,
      semester: true,
    },
  });
  if (!course) notFound();

  const scheme = course.gradeScheme
    ? parseScheme(course.gradeScheme.boundaries)
    : await getUserDefaultScheme(userId);
  const standing = courseStanding(course.assessments);

  // LMS courses show the university's official (relative) grade verbatim.
  const isLms = course.source === "LMS" && course.lmsGradePoints != null;
  const displayPercent = isLms ? course.lmsPercent : standing.percent;
  const gp = isLms
    ? course.lmsGradePoints
    : standing.percent != null
      ? gradePointsFor(standing.percent, scheme)
      : null;
  const letter = isLms
    ? course.lmsGrade
    : standing.percent != null
      ? letterFor(standing.percent, scheme)
      : null;

  const qualityPoints = gp != null ? (gp * course.creditHours).toFixed(1) : "-";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/semesters"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint hover:text-garnet-600"
      >
        <ArrowLeft size={13} /> {course.semester.name}
      </Link>

      <header className="mb-6">
        <p className="eyebrow">{course.code || course.semester.name}</p>
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
          {course.title}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          {course.creditHours} credit hours
          {course.source === "LMS" ? <Chip tone="garnet">LMS</Chip> : null}
          {course.lmsStatus === "Provisional" ? <Chip tone="warn">Provisional</Chip> : null}
        </p>
      </header>

      {/* Stat strip */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        <Stat label="Grade" value={letter ?? "-"} className={gradeTone(gp)} />
        <Stat label="Grade points" value={gp != null ? gp.toFixed(2) : "-"} />
        <Stat
          label="Marks"
          value={displayPercent != null ? `${displayPercent.toFixed(1)}%` : "-"}
        />
        <Stat label="Quality points" value={qualityPoints} />
      </div>

      {isLms ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-garnet-200 bg-garnet-50 px-3 py-2.5">
          <Chip tone="garnet">Official LMS result</Chip>
          {course.lmsStatus ? (
            <span className="text-xs text-ink-soft">
              {course.lmsStatus}
              {course.lmsStatus === "Provisional" ? " - may still change" : ""}
            </span>
          ) : null}
          <span className="ml-auto text-[11px] text-ink-faint">
            relative grading - grade shown as awarded
          </span>
        </div>
      ) : standing.percent != null ? (
        <div className="mb-6">
          <Bar percent={standing.percent} />
          <p className="mt-1.5 text-[11px] text-ink-faint">
            {Math.round(standing.gradedWeight * 100)}% of the course weight is graded so
            far.
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        {isLms ? (
          <Card>
            <CardHeader title="How this counts" hint="synced from the UET OBE portal" />
            <CardBody className="text-xs leading-relaxed text-ink-soft">
              Shown exactly as awarded - UET grades relatively, so marks map to the letter
              the university assigned. This course contributes{" "}
              <span className="stat-figure font-semibold text-ink">{qualityPoints}</span>{" "}
              quality points to your CGPA (grade points {gp != null ? gp.toFixed(2) : "-"} ×{" "}
              {course.creditHours} credit hours).
            </CardBody>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader title="Assessments" hint="marks & weights" />
              <CardBody className="p-0">
                {course.assessments.length === 0 ? (
                  <EmptyState
                    className="m-5"
                    title="No assessments yet"
                    hint="Add quizzes, assignments and exams below - GPA updates instantly."
                  />
                ) : (
                  <Table>
                    <THead>
                      <Th className="w-10 pr-0">#</Th>
                      <Th>Title</Th>
                      <Th>Type</Th>
                      <Th>Marks</Th>
                      <Th>Weight</Th>
                      <Th className="w-12" />
                    </THead>
                    <tbody>
                      {course.assessments.map((a, i) => (
                        <Tr key={a.id}>
                          <RowNum n={i + 1} />
                          <Td className="font-medium text-ink">{a.title}</Td>
                          <Td>
                            <Chip>{a.type.toLowerCase()}</Chip>
                          </Td>
                          <Td className="stat-figure text-ink-soft">
                            {a.obtained != null ? a.obtained : "·"} / {a.total}
                          </Td>
                          <Td className="stat-figure text-ink-soft">
                            {a.weight != null ? `${a.weight}%` : "-"}
                          </Td>
                          <Td>
                            <form action={deleteAssessment.bind(null, a.id)}>
                              <button
                                type="submit"
                                aria-label={`Delete ${a.title}`}
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
                )}

                <form
                  action={createAssessment.bind(null, course.id)}
                  className="flex flex-wrap items-end gap-3 border-t border-line bg-canvas/40 px-5 py-4"
                >
                  <Field label="Title" className="min-w-40 flex-1">
                    <Input name="title" required placeholder="Quiz 1" />
                  </Field>
                  <Field label="Type" className="w-32">
                    <Select name="type" defaultValue="QUIZ">
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.toLowerCase()}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Obtained" className="w-24">
                    <Input name="obtained" type="number" step="0.01" min="0" placeholder="-" />
                  </Field>
                  <Field label="Total" className="w-24">
                    <Input name="total" type="number" step="0.01" min="0.01" required defaultValue="10" />
                  </Field>
                  <Field label="Weight %" className="w-24">
                    <Input name="weight" type="number" step="0.5" min="0" max="100" placeholder="-" />
                  </Field>
                  <Button type="submit">Add</Button>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Grading scheme"
                hint={
                  course.gradeScheme
                    ? "custom scheme for this course"
                    : "using your default scheme - saving here creates a course-specific one"
                }
              />
              <CardBody>
                <SchemeEditor courseId={course.id} initial={scheme} />
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-paper px-5 py-4">
      <p className={cn("stat-figure text-2xl font-bold", className ?? "text-ink")}>{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
        {label}
      </p>
    </div>
  );
}
