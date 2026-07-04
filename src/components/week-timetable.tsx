"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, Clock } from "lucide-react";
import { deleteEvent } from "@/lib/actions";
import { minutesToLabel, cn } from "@/lib/utils";

export interface TEvent {
  id: string;
  title: string;
  dayOfWeek: number; // 0 = Monday
  startMin: number;
  endMin: number;
  location: string | null;
  courseCode: string | null;
}

const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOUR_H = 58; // px per hour
const SCALE = HOUR_H / 60;

// distinct-but-tasteful hues, keyed off course/title so repeats share a colour
const HUES = [349, 27, 152, 199, 262, 322];
function hueFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

// greedy lane packing so overlapping classes sit side-by-side
function packDay(evs: TEvent[]) {
  const sorted = [...evs].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const laneEnd: number[] = [];
  const placed = sorted.map((e) => {
    let lane = laneEnd.findIndex((end) => end <= e.startMin);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(e.endMin);
    } else {
      laneEnd[lane] = e.endMin;
    }
    return { e, lane };
  });
  return { placed, lanes: Math.max(1, laneEnd.length) };
}

const floorHour = (m: number) => Math.floor(m / 60) * 60;
const ceilHour = (m: number) => Math.ceil(m / 60) * 60;

export function WeekTimetable({ events, today }: { events: TEvent[]; today: number }) {
  const [now, setNow] = useState<{ min: number; day: number } | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow({ min: d.getHours() * 60 + d.getMinutes(), day: (d.getDay() + 6) % 7 });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const { dayStart, dayEnd, hours, visibleDays, byDay } = useMemo(() => {
    const starts = events.map((e) => e.startMin);
    const ends = events.map((e) => e.endMin);
    const ds = Math.min(8 * 60, starts.length ? floorHour(Math.min(...starts)) : 8 * 60);
    const de = Math.max(17 * 60, ends.length ? ceilHour(Math.max(...ends)) : 17 * 60);
    const hrs: number[] = [];
    for (let h = ds; h <= de; h += 60) hrs.push(h);

    // Mon–Fri always; weekend days only when they hold classes
    const days = [0, 1, 2, 3, 4];
    for (const d of [5, 6]) if (events.some((e) => e.dayOfWeek === d)) days.push(d);

    const grouped = days.map((di) => ({ di, ...packDay(events.filter((e) => e.dayOfWeek === di)) }));
    return { dayStart: ds, dayEnd: de, hours: hrs, visibleDays: days, byDay: grouped };
  }, [events]);

  const totalH = (dayEnd - dayStart) * SCALE;
  const nowInRange = now && now.min >= dayStart && now.min <= dayEnd;
  const nowTop = now ? (now.min - dayStart) * SCALE : 0;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${3.25 + visibleDays.length * 8}rem` }}>
        {/* Day headers */}
        <div className="flex">
          <div className="shrink-0" style={{ width: "3.25rem" }} />
          {visibleDays.map((di) => {
            const isToday = di === today;
            return (
              <div key={di} className="flex-1 px-1 pb-2 text-center">
                <span
                  className={cn(
                    "inline-flex items-baseline gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors",
                    isToday ? "bg-garnet-600 text-white" : "text-ink-faint"
                  )}
                >
                  {DAY_ABBR[di]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Grid body */}
        <div className="relative flex" style={{ height: totalH }}>
          {/* Time gutter */}
          <div className="relative shrink-0" style={{ width: "3.25rem" }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-ink-faint"
                style={{ top: (h - dayStart) * SCALE }}
              >
                {minutesToLabel(h).replace(":00", "")}
              </div>
            ))}
          </div>

          {/* Day columns + gridlines */}
          <div className="relative flex-1">
            {/* hour gridlines (full width) */}
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t"
                style={{
                  top: (h - dayStart) * SCALE,
                  borderColor: "var(--color-line)",
                  opacity: i === 0 || i === hours.length - 1 ? 1 : 0.7,
                }}
              />
            ))}

            {/* now line */}
            {nowInRange ? (
              <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }}>
                <div className="relative h-px bg-garnet-500">
                  <span className="absolute -left-1 -top-[3px] size-[7px] rounded-full bg-garnet-500 shadow-[0_0_0_2px_var(--color-paper)]" />
                </div>
              </div>
            ) : null}

            <div className="flex h-full">
              {byDay.map(({ di, placed, lanes }) => {
                const isToday = di === today;
                return (
                  <div
                    key={di}
                    className={cn(
                      "relative h-full flex-1 border-l",
                      isToday ? "bg-garnet-50/50" : ""
                    )}
                    style={{ borderColor: "var(--color-line)" }}
                  >
                    {placed.map(({ e, lane }) => {
                      const hue = hueFor(e.courseCode || e.title);
                      const top = (e.startMin - dayStart) * SCALE;
                      const h = (e.endMin - e.startMin) * SCALE;
                      const widthPct = 100 / lanes;
                      const compact = h < 46;
                      return (
                        <div
                          key={e.id}
                          className="group absolute z-10 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 shadow-lift transition-shadow hover:z-30 hover:shadow-raise"
                          style={{
                            top: top + 1,
                            height: h - 2,
                            left: `calc(${lane * widthPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            borderLeftColor: `hsl(${hue} 62% 52%)`,
                            background: `hsl(${hue} 62% 52% / 0.12)`,
                          }}
                        >
                          <p
                            className="truncate text-[10px] font-bold tabular-nums"
                            style={{ color: `hsl(${hue} 55% 42%)` }}
                          >
                            {minutesToLabel(e.startMin)}
                          </p>
                          {!compact ? (
                            <>
                              <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight text-ink">
                                {e.title}
                              </p>
                              {e.courseCode || e.location ? (
                                <p className="mt-0.5 truncate text-[10px] text-ink-soft">
                                  {[e.courseCode, e.location].filter(Boolean).join(" · ")}
                                </p>
                              ) : null}
                            </>
                          ) : (
                            <p className="truncate text-[10px] font-semibold leading-tight text-ink">
                              {e.title}
                            </p>
                          )}

                          <form action={deleteEvent.bind(null, e.id)} className="absolute right-1 top-1">
                            <button
                              type="submit"
                              aria-label={`Delete ${e.title}`}
                              className="grid size-5 place-items-center rounded bg-paper/80 text-ink-faint opacity-0 backdrop-blur transition-opacity hover:text-fail group-hover:opacity-100"
                            >
                              <Trash2 size={11} />
                            </button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-faint">
            <Clock size={13} />
            No classes yet — add one below and it&apos;ll drop onto the grid.
          </div>
        ) : null}
      </div>
    </div>
  );
}
