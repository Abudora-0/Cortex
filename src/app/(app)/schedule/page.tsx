import { CalendarClock, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mondayIndexedDay } from "@/lib/queries";
import { createEvent } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { WeekTimetable, type TEvent } from "@/components/week-timetable";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const { id: userId } = await requireUser();
  const rows = await prisma.scheduleEvent.findMany({
    where: { userId },
    orderBy: { startMin: "asc" },
    include: { course: { select: { code: true } } },
  });
  const today = mondayIndexedDay(new Date());

  const events: TEvent[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    dayOfWeek: e.dayOfWeek,
    startMin: e.startMin,
    endMin: e.endMin,
    location: e.location,
    courseCode: e.course?.code ?? null,
  }));

  // Weekly stats
  const weeklyMin = events.reduce((s, e) => s + (e.endMin - e.startMin), 0);
  const dayLoad = Array(7).fill(0) as number[];
  for (const e of events) dayLoad[e.dayOfWeek] += e.endMin - e.startMin;
  const busiestIdx = weeklyMin > 0 ? dayLoad.indexOf(Math.max(...dayLoad)) : -1;
  const activeDays = dayLoad.filter((m) => m > 0).length;

  const stats = [
    { label: "Classes", value: String(events.length), accent: true },
    { label: "Hours / week", value: (weeklyMin / 60).toFixed(1) },
    { label: "Busiest day", value: busiestIdx >= 0 ? DAYS[busiestIdx] : "-" },
    { label: "Days on campus", value: `${activeDays}/${7}` },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="eyebrow">Your week at a glance</p>
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
          Schedule
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          A time-proportional view of your week - the marker tracks the current time.
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

      {/* Timetable */}
      <Card className="mb-6 overflow-hidden">
        <CardBody>
          <WeekTimetable events={events} today={today} />
        </CardBody>
      </Card>

      {/* Add + LMS notice */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Add a class" hint="repeats weekly" />
          <CardBody>
            <form action={createEvent} className="flex flex-wrap items-end gap-3">
              <Field label="Title" className="min-w-44 flex-1">
                <Input name="title" required placeholder="Linear Algebra - Lecture" />
              </Field>
              <Field label="Day" className="w-24">
                <Select name="dayOfWeek" defaultValue={String(today)}>
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start" className="w-36">
                <Input name="start" type="time" defaultValue="08:00" required className="tabular-nums" />
              </Field>
              <Field label="End" className="w-36">
                <Input name="end" type="time" defaultValue="09:00" required className="tabular-nums" />
              </Field>
              <Field label="Room" className="w-28">
                <Input name="location" placeholder="LT-4" />
              </Field>
              <Button type="submit">
                <Plus size={15} /> Add
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="border-dashed lg:col-span-2">
          <CardBody className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-garnet-50 text-garnet-600">
              <CalendarClock size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Auto-sync from LMS</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                Once you&apos;re enrolled in a semester with a published timetable, classes
                will sync here from the UET LMS. Until then, add them by hand.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
