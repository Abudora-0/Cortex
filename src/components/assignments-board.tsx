"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2, ExternalLink, Check, CalendarClock } from "lucide-react";
import { setAssignmentStatus, deleteAssignment } from "@/lib/actions";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

export interface AssignmentCard {
  id: string;
  title: string;
  courseId: string | null;
  courseLabel: string | null;
  dueISO: string | null;
  status: string; // TODO | SUBMITTED | GRADED | MISSED
  link: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  SUBMITTED: "Submitted",
  GRADED: "Graded",
  MISSED: "Missed",
};
const DONE = (s: string) => s === "SUBMITTED" || s === "GRADED";

function hueFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) >>> 0;
  return [349, 27, 152, 199, 262, 322][h % 6];
}

function dueMeta(dueISO: string | null, status: string) {
  if (DONE(status)) return { label: dueISO ? fmt(dueISO) : null, tone: "text-ink-faint" };
  if (status === "MISSED") return { label: dueISO ? fmt(dueISO) : "missed", tone: "text-fail" };
  if (!dueISO) return { label: "no due date", tone: "text-ink-faint" };
  const due = new Date(dueISO).getTime();
  const now = Date.now();
  const hrs = (due - now) / 3_600_000;
  if (hrs < 0) return { label: `Overdue · ${fmt(dueISO)}`, tone: "text-fail" };
  if (hrs < 48) return { label: `Due ${fmt(dueISO)}`, tone: "text-warn" };
  return { label: `Due ${fmt(dueISO)}`, tone: "text-ink-soft" };
}

function fmt(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return hasTime
    ? `${date}, ${d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}`
    : date;
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "todo", label: "To do" },
  { id: "overdue", label: "Overdue" },
  { id: "done", label: "Done" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

export function AssignmentsBoard({ assignments }: { assignments: AssignmentCard[] }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    const now = Date.now();
    let todo = 0;
    let overdue = 0;
    let done = 0;
    for (const a of assignments) {
      if (DONE(a.status)) done++;
      else if (a.status === "TODO") {
        todo++;
        if (a.dueISO && new Date(a.dueISO).getTime() < now) overdue++;
      }
    }
    return { all: assignments.length, todo, overdue, done };
  }, [assignments]);

  const shown = useMemo(() => {
    const now = Date.now();
    return assignments.filter((a) => {
      if (filter === "todo") return a.status === "TODO" || a.status === "MISSED";
      if (filter === "overdue")
        return a.status === "TODO" && a.dueISO != null && new Date(a.dueISO).getTime() < now;
      if (filter === "done") return DONE(a.status);
      return true;
    });
  }, [assignments, filter]);

  const setStatus = (id: string, status: string) =>
    start(() => {
      void setAssignmentStatus(id, status);
    });
  const remove = (id: string) =>
    start(() => {
      void deleteAssignment(id);
    });

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const n = counts[f.id as keyof typeof counts];
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.id
                  ? "border-garnet-600 bg-garnet-600 text-white"
                  : "border-line-strong bg-paper text-ink-soft hover:border-ink hover:text-ink"
              )}
            >
              {f.label}
              <span className={cn("stat-figure", filter === f.id ? "text-white/80" : "text-ink-faint")}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-paper px-5 py-12 text-center">
          <CalendarClock size={20} className="mx-auto text-ink-faint" />
          <p className="mt-2 text-sm font-medium text-ink">Nothing here</p>
          <p className="mt-1 text-xs text-ink-faint">
            {filter === "all" ? "Add your first assignment above." : "No assignments in this view."}
          </p>
        </div>
      ) : (
        <ul className={cn("space-y-2", pending && "opacity-70 transition-opacity")}>
          {shown.map((a) => {
            const done = DONE(a.status);
            const due = dueMeta(a.dueISO, a.status);
            const hue = a.courseId ? hueFor(a.courseId) : null;
            return (
              <li
                key={a.id}
                className="group flex items-center gap-3 rounded-card border border-line bg-paper px-4 py-3 shadow-lift transition-colors hover:border-line-strong"
              >
                {/* quick submit toggle */}
                <button
                  onClick={() => setStatus(a.id, done ? "TODO" : "SUBMITTED")}
                  aria-label={done ? "Mark as to-do" : "Mark as submitted"}
                  aria-pressed={done}
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                    done
                      ? "border-pass bg-pass text-white"
                      : "border-line-strong text-transparent hover:border-ink"
                  )}
                >
                  <Check size={12} strokeWidth={3} />
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      done ? "text-ink-faint line-through" : "text-ink"
                    )}
                  >
                    {a.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                    {a.courseLabel ? (
                      <span
                        className="inline-flex items-center gap-1 font-medium text-ink-soft"
                        style={hue != null ? { color: `hsl(${hue} 55% 46%)` } : undefined}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: hue != null ? `hsl(${hue} 62% 52%)` : "currentColor" }}
                        />
                        {a.courseLabel}
                      </span>
                    ) : null}
                    <span className={due.tone}>{due.label}</span>
                  </div>
                </div>

                {a.link ? (
                  <a
                    href={a.link}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open assignment link"
                    className="shrink-0 text-ink-faint transition-colors hover:text-garnet-600"
                  >
                    <ExternalLink size={15} />
                  </a>
                ) : null}

                <select
                  value={a.status}
                  onChange={(e) => setStatus(a.id, e.target.value)}
                  aria-label="Status"
                  className={cn(
                    "select-chevron h-8 shrink-0 cursor-pointer rounded-lg border bg-paper pl-2.5 pr-7 text-xs font-semibold transition-colors",
                    a.status === "GRADED"
                      ? "border-pass/40 text-pass"
                      : a.status === "SUBMITTED"
                        ? "border-line-strong text-ink-soft"
                        : a.status === "MISSED"
                          ? "border-fail/40 text-fail"
                          : "border-line-strong text-ink"
                  )}
                >
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => remove(a.id)}
                  aria-label={`Delete ${a.title}`}
                  className="shrink-0 rounded-md p-1 text-ink-faint opacity-0 transition-opacity hover:bg-fail-soft hover:text-fail group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
