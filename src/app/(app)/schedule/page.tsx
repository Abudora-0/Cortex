import { Trash2, CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mondayIndexedDay } from "@/lib/queries";
import { createEvent, deleteEvent } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { cn, minutesToLabel } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function SchedulePage() {
  const { id: userId } = await requireUser();
  const events = await prisma.scheduleEvent.findMany({
    where: { userId },
    orderBy: { startMin: "asc" },
    include: { course: { select: { code: true } } },
  });
  const today = mondayIndexedDay(new Date());

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Schedule
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Your weekly timetable.</p>
      </header>

      <Card className="mb-6 border-dashed">
        <CardBody className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-garnet-50 text-garnet-600">
            <CalendarClock size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">LMS timetable — coming automatically</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
              Once you&apos;re enrolled in a semester with a published timetable, your
              classes will sync here from the UET LMS. Until then, add them by hand below.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Add a class" hint="repeats weekly" />
        <CardBody>
          <form action={createEvent} className="flex flex-wrap items-end gap-3">
            <Field label="Title" className="min-w-44 flex-1">
              <Input name="title" required placeholder="Linear Algebra — Lecture" />
            </Field>
            <Field label="Day" className="w-28">
              <Select name="dayOfWeek" defaultValue={String(today)}>
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start" className="w-28">
              <Input name="start" type="time" defaultValue="08:00" required />
            </Field>
            <Field label="End" className="w-28">
              <Input name="end" type="time" defaultValue="09:00" required />
            </Field>
            <Field label="Room" className="w-32">
              <Input name="location" placeholder="LT-4" />
            </Field>
            <Button type="submit">Add</Button>
          </form>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {DAYS.map((day, di) => {
          const dayEvents = events.filter((e) => e.dayOfWeek === di);
          return (
            <div
              key={day}
              className={cn(
                "rounded-card border bg-paper",
                di === today ? "border-garnet-400" : "border-line"
              )}
            >
              <p
                className={cn(
                  "border-b px-3 py-2 text-center text-[11px] font-bold uppercase tracking-widest",
                  di === today
                    ? "border-garnet-200 bg-garnet-50 text-garnet-700"
                    : "border-line bg-canvas text-ink-faint"
                )}
              >
                {day}
              </p>
              <div className="space-y-2 p-2">
                {dayEvents.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-ink-faint">—</p>
                ) : (
                  dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className="group rounded-lg border border-line bg-canvas/60 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="stat-figure text-[11px] font-bold text-garnet-600">
                          {minutesToLabel(e.startMin)}–{minutesToLabel(e.endMin)}
                        </p>
                        <form action={deleteEvent.bind(null, e.id)}>
                          <button
                            type="submit"
                            aria-label={`Delete ${e.title}`}
                            className="invisible text-ink-faint hover:text-fail group-hover:visible"
                          >
                            <Trash2 size={12} />
                          </button>
                        </form>
                      </div>
                      <p className="mt-1 text-xs font-medium leading-snug text-ink">
                        {e.title}
                      </p>
                      {(e.course?.code || e.location) && (
                        <p className="mt-0.5 text-[10px] text-ink-faint">
                          {[e.course?.code, e.location].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
