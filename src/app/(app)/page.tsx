import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Gauge } from "@/components/ui/gauge";
import { Sparkline } from "@/components/ui/sparkline";
import { Chip } from "@/components/ui/chip";
import { Table, THead, Th, Tr, Td, RowNum } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TodoRail } from "@/components/todo-rail";
import { formatDate, minutesToLabel } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  const firstName = (user.name ?? "Student").split(" ")[0];
  const currentSemester = data.semesters[data.semesters.length - 1];
  const gpaTrend = data.semesters
    .map((s) => s.gpa)
    .filter((g): g is number => g != null);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {currentSemester
              ? `${currentSemester.name} — ${currentSemester.courses.length} course${currentSemester.courses.length === 1 ? "" : "s"} on the books.`
              : "Set up your first semester to start tracking."}
          </p>
          {data.profile?.lmsRoll ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
              <Chip tone="garnet">{data.profile.lmsRoll}</Chip>
              {data.profile.lmsProgram ? <span>{data.profile.lmsProgram}</span> : null}
              {data.profile.lmsSemesterSeq ? (
                <span>· Semester {data.profile.lmsSemesterSeq}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <Link
          href="/semesters"
          className="group inline-flex items-center gap-1 text-xs font-semibold text-garnet-600 transition-colors hover:text-garnet-700"
        >
          Manage semesters
          <ArrowRight
            size={13}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </header>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 xl:col-span-2">
          <div className="grid gap-5 sm:grid-cols-3">
            <StatCard
              label="CGPA"
              figure={data.cgpa != null ? data.cgpa.toFixed(2) : "—"}
              suffix="/ 4.0"
              hint={
                data.cgpa == null
                  ? "add marks to compute"
                  : `across ${data.semesters.length} semester${data.semesters.length === 1 ? "" : "s"}`
              }
            >
              {gpaTrend.length > 1 ? <Sparkline points={gpaTrend} /> : null}
            </StatCard>
            <StatCard
              label="Semester GPA"
              figure={
                currentSemester?.gpa != null ? currentSemester.gpa.toFixed(2) : "—"
              }
              suffix="/ 4.0"
              hint={currentSemester?.name ?? "no semester yet"}
            />
            <StatCard
              label="Credit hours"
              figure={String(data.totalCredits || 0)}
              hint="counted toward CGPA"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <CardHeader title="CGPA standing" hint="credit-hour weighted" />
              <CardBody className="mx-auto max-w-60">
                <Gauge
                  value={data.cgpa ?? 0}
                  max={4}
                  label="of 4.00"
                  display={data.cgpa != null ? data.cgpa.toFixed(2) : "—"}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Today"
                hint={new Date().toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                action={
                  <Link
                    href="/schedule"
                    className="text-ink-faint hover:text-garnet-600"
                    aria-label="Open schedule"
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                }
              />
              <CardBody className="p-0">
                {data.todayEvents.length === 0 ? (
                  <p className="px-5 py-6 text-center text-xs text-ink-faint">
                    No classes scheduled today.
                  </p>
                ) : (
                  <ul>
                    {data.todayEvents.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0"
                      >
                        <span className="stat-figure w-20 shrink-0 text-xs font-bold text-garnet-600">
                          {minutesToLabel(e.startMin)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {e.title}
                          </p>
                          <p className="text-[11px] text-ink-faint">
                            {[e.course?.code, e.location].filter(Boolean).join(" · ") ||
                              "—"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Upcoming deadlines"
              hint="assessments with due dates"
              action={
                <Link
                  href="/semesters"
                  className="text-ink-faint hover:text-garnet-600"
                  aria-label="Open semesters"
                >
                  <ArrowUpRight size={16} />
                </Link>
              }
            />
            <CardBody className="p-0">
              {data.upcoming.length === 0 ? (
                <EmptyState
                  className="m-5"
                  title="No deadlines on the radar"
                  hint="Assessments with a due date show up here — add them from a course page or sync your LMS."
                />
              ) : (
                <Table>
                  <THead>
                    <Th className="w-10 pr-0">#</Th>
                    <Th>Assessment</Th>
                    <Th>Course</Th>
                    <Th>Due</Th>
                  </THead>
                  <tbody>
                    {data.upcoming.map((a, i) => (
                      <Tr key={a.id}>
                        <RowNum n={i + 1} />
                        <Td className="font-medium text-ink">{a.title}</Td>
                        <Td className="text-ink-soft">
                          {a.course.code ?? a.course.title}
                        </Td>
                        <Td>
                          <Chip tone="warn">{formatDate(a.dueAt)}</Chip>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="To-do list" hint="quick capture" />
            <TodoRail
              tasks={data.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                done: t.done,
                dueAt: t.dueAt,
                course: t.course,
              }))}
            />
          </Card>

          <Card>
            <CardHeader
              title="Recent notes"
              hint="your latest scribbles"
              action={
                <Link
                  href="/notes"
                  className="text-ink-faint hover:text-garnet-600"
                  aria-label="Open notes"
                >
                  <ArrowUpRight size={16} />
                </Link>
              }
            />
            <CardBody className="p-0">
              {data.recentNotes.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-ink-faint">
                  No notes yet — start one from the Notes page.
                </p>
              ) : (
                <ul>
                  {data.recentNotes.map((n) => (
                    <li
                      key={n.id}
                      className="border-b border-line/70 last:border-0"
                    >
                      <Link
                        href={`/notes/${n.id}`}
                        className="block px-5 py-3 hover:bg-canvas/60"
                      >
                        <p className="truncate text-sm font-medium text-ink">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-faint">
                          {[n.course?.code, `edited ${formatDate(n.updatedAt)}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
