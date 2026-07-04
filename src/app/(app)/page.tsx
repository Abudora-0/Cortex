import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  Target,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData, type CourseComputed } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Table, THead, Th, Tr, Td, RowNum } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TodoRail } from "@/components/todo-rail";
import { CountUp } from "@/components/widgets/count-up";
import { GpaTrajectory } from "@/components/widgets/gpa-trajectory";
import { GradeBars } from "@/components/widgets/grade-bars";
import { ProgressRing } from "@/components/widgets/progress-ring";
import { formatDate, minutesToLabel } from "@/lib/utils";

// Typical UET BSc degree length (credit hours) — used only for the progress ring.
const DEGREE_CREDITS = 133;
const GRADE_ORDER = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function shortSem(name: string) {
  const m = name.match(/(Fall|Spring|Summer|Winter)\s+(\d{4})/i);
  return m ? `${m[1][0].toUpperCase()}${m[2].slice(2)}` : name.slice(0, 4);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  const firstName = (user.name ?? "Student").split(" ")[0];
  const semGraded = data.semesters.filter((s) => s.gpa != null);
  const currentSemester = semGraded[semGraded.length - 1] ?? data.semesters[data.semesters.length - 1];
  const prevSemester = semGraded[semGraded.length - 2];
  const semDelta =
    currentSemester?.gpa != null && prevSemester?.gpa != null
      ? Math.round((currentSemester.gpa - prevSemester.gpa) * 100) / 100
      : null;

  // Trajectory
  const trajectory = semGraded.map((s) => ({
    label: s.name,
    short: shortSem(s.name),
    gpa: s.gpa as number,
  }));

  // Grade distribution
  const gradedCourses: CourseComputed[] = data.semesters
    .flatMap((s) => s.courses)
    .filter((c) => c.letter && c.gradePoints != null);
  const gmap = new Map<string, { count: number; gp: number }>();
  for (const c of gradedCourses) {
    const e = gmap.get(c.letter!) ?? { count: 0, gp: c.gradePoints! };
    e.count += 1;
    e.gp = c.gradePoints!;
    gmap.set(c.letter!, e);
  }
  const buckets = [...gmap.entries()]
    .map(([letter, v]) => ({ letter, count: v.count, gp: v.gp }))
    .sort((a, b) => GRADE_ORDER.indexOf(a.letter) - GRADE_ORDER.indexOf(b.letter));

  // Strongest / focus courses
  const sortedByGp = [...gradedCourses].sort((a, b) => (b.gradePoints ?? 0) - (a.gradePoints ?? 0));
  const strongest = sortedByGp[0];
  const focus = sortedByGp.length > 1 ? sortedByGp[sortedByGp.length - 1] : undefined;

  const hasData = data.cgpa != null;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ---------- Header ---------- */}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
            {greeting()}, {firstName}
          </h1>
          {data.profile?.lmsRoll ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
              <Chip tone="garnet">{data.profile.lmsRoll}</Chip>
              {data.profile.lmsProgram ? <span>{data.profile.lmsProgram}</span> : null}
              {data.profile.lmsSemesterSeq ? <span>· Semester {data.profile.lmsSemesterSeq}</span> : null}
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              {currentSemester
                ? `${currentSemester.name} — ${currentSemester.courses.length} course${currentSemester.courses.length === 1 ? "" : "s"} on the books.`
                : "Set up your first semester to start tracking."}
            </p>
          )}
        </div>
        <Link
          href="/semesters"
          className="group inline-flex items-center gap-1 text-xs font-semibold text-garnet-600 transition-colors hover:text-garnet-700"
        >
          Manage semesters
          <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </header>

      {/* ---------- Hero: CGPA + trajectory ---------- */}
      <Card className="rise mb-5 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_1.4fr]">
          {/* CGPA */}
          <div className="app-aura relative border-b border-line px-6 py-6 lg:border-b-0 lg:border-r">
            <p className="eyebrow">Cumulative GPA</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="stat-figure text-[3.75rem] font-bold leading-none text-garnet-600">
                {hasData ? <CountUp value={data.cgpa as number} decimals={2} /> : "—"}
              </span>
              <span className="stat-figure mb-2 text-lg font-medium text-ink-faint">/ 4.00</span>
            </div>
            {semDelta != null ? (
              <p
                className={
                  "mt-2 inline-flex items-center gap-1 text-xs font-semibold " +
                  (semDelta >= 0 ? "text-pass" : "text-fail")
                }
              >
                {semDelta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {semDelta >= 0 ? "+" : ""}
                {semDelta.toFixed(2)} since {prevSemester?.name}
              </p>
            ) : (
              <p className="mt-2 text-xs text-ink-faint">
                {hasData ? `across ${semGraded.length} semester${semGraded.length === 1 ? "" : "s"}` : "sync or add marks to begin"}
              </p>
            )}
            <div className="mt-4 flex gap-5">
              <div>
                <p className="stat-figure text-xl font-bold text-ink">
                  <CountUp value={data.totalCredits || 0} />
                </p>
                <p className="text-[11px] uppercase tracking-widest text-ink-faint">Credits</p>
              </div>
              <div>
                <p className="stat-figure text-xl font-bold text-ink">{gradedCourses.length}</p>
                <p className="text-[11px] uppercase tracking-widest text-ink-faint">Courses</p>
              </div>
              <div>
                <p className="stat-figure text-xl font-bold text-ink">
                  {currentSemester?.gpa != null ? currentSemester.gpa.toFixed(2) : "—"}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-ink-faint">This sem</p>
              </div>
            </div>
          </div>

          {/* Trajectory */}
          <div className="px-5 py-5">
            <div className="mb-1 flex items-center justify-between">
              <p className="eyebrow">GPA trajectory</p>
              <span className="text-[11px] text-ink-faint">hover a point</span>
            </div>
            <GpaTrajectory points={trajectory} />
          </div>
        </div>
      </Card>

      {/* ---------- Insight row ---------- */}
      <div className="mb-5 grid gap-5 md:grid-cols-3">
        <Card interactive className="rise flex flex-col items-center px-5 py-5" style={{ ["--d" as string]: "60ms" }}>
          <p className="eyebrow mb-2 self-start">Degree progress</p>
          <ProgressRing value={data.totalCredits} max={DEGREE_CREDITS}>
            <div>
              <p className="stat-figure text-2xl font-bold text-ink">
                <CountUp value={DEGREE_CREDITS ? Math.round((data.totalCredits / DEGREE_CREDITS) * 100) : 0} suffix="%" />
              </p>
              <p className="text-[10px] uppercase tracking-widest text-ink-faint">complete</p>
            </div>
          </ProgressRing>
          <p className="mt-2 text-xs text-ink-soft">
            {data.totalCredits} of ~{DEGREE_CREDITS} credit hours
          </p>
        </Card>

        <Card interactive className="rise" style={{ ["--d" as string]: "120ms" }}>
          <CardHeader title="Grade mix" hint={`${gradedCourses.length} courses graded`} />
          <CardBody>
            <GradeBars buckets={buckets} />
          </CardBody>
        </Card>

        <Card interactive className="rise" style={{ ["--d" as string]: "180ms" }}>
          <CardHeader title="Standing" hint="by grade points" />
          <CardBody className="space-y-4">
            {strongest ? (
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-pass-soft text-pass">
                  <Sparkles size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Strongest</p>
                  <p className="truncate text-sm font-medium text-ink">{strongest.code ?? strongest.title}</p>
                </div>
                <Chip tone="pass">
                  <span>{strongest.letter}</span>
                  <span className="font-normal opacity-70">{strongest.gradePoints?.toFixed(1)}</span>
                </Chip>
              </div>
            ) : null}
            {focus ? (
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-warn-soft text-warn">
                  <Target size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Focus on</p>
                  <p className="truncate text-sm font-medium text-ink">{focus.code ?? focus.title}</p>
                </div>
                <Chip tone={(focus.gradePoints ?? 0) >= 2 ? "warn" : "fail"}>
                  <span>{focus.letter}</span>
                  <span className="font-normal opacity-70">{focus.gradePoints?.toFixed(1)}</span>
                </Chip>
              </div>
            ) : null}
            {!strongest ? (
              <p className="text-xs text-ink-faint">Sync your LMS or add marks to see your standing.</p>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* ---------- Main split ---------- */}
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader
              title="Today"
              hint={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              action={
                <Link href="/schedule" className="text-ink-faint transition-colors hover:text-garnet-600" aria-label="Open schedule">
                  <ArrowUpRight size={16} />
                </Link>
              }
            />
            <CardBody className="p-0">
              {data.todayEvents.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-ink-faint">No classes scheduled today.</p>
              ) : (
                <ul>
                  {data.todayEvents.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-canvas/60">
                      <span className="stat-figure w-20 shrink-0 text-xs font-bold text-garnet-600">
                        {minutesToLabel(e.startMin)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{e.title}</p>
                        <p className="text-[11px] text-ink-faint">
                          {[e.course?.code, e.location].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Upcoming deadlines"
              hint="assessments with due dates"
              action={
                <Link href="/semesters" className="text-ink-faint transition-colors hover:text-garnet-600" aria-label="Open semesters">
                  <ArrowUpRight size={16} />
                </Link>
              }
            />
            <CardBody className="p-0">
              {data.upcoming.length === 0 ? (
                <EmptyState
                  className="m-5"
                  icon={<GraduationCap size={22} />}
                  title="No deadlines on the radar"
                  hint="Assessments with a due date show up here — add them from a course page."
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
                        <Td className="text-ink-soft">{a.course.code ?? a.course.title}</Td>
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
                <Link href="/notes" className="text-ink-faint transition-colors hover:text-garnet-600" aria-label="Open notes">
                  <ArrowUpRight size={16} />
                </Link>
              }
            />
            <CardBody className="p-0">
              {data.recentNotes.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-ink-faint">No notes yet — start one from the Notes page.</p>
              ) : (
                <ul>
                  {data.recentNotes.map((n) => (
                    <li key={n.id} className="border-b border-line/70 last:border-0">
                      <Link href={`/notes/${n.id}`} className="block px-5 py-3 hover:bg-canvas/60">
                        <p className="truncate text-sm font-medium text-ink">{n.title}</p>
                        <p className="mt-0.5 text-[11px] text-ink-faint">
                          {[n.course?.code, `edited ${formatDate(n.updatedAt)}`].filter(Boolean).join(" · ")}
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
