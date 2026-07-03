"use client";

import { useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createTask, toggleTask, deleteTask } from "@/lib/actions";
import { cn, formatDate } from "@/lib/utils";

interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  dueAt: Date | null;
  course?: { code: string | null; title: string } | null;
}

export function TodoRail({ tasks }: { tasks: TaskItem[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <form
        ref={formRef}
        action={async (fd) => {
          await createTask(fd);
          formRef.current?.reset();
        }}
        className="flex items-center gap-2 border-b border-line px-5 py-3"
      >
        <Plus size={15} className="shrink-0 text-garnet-600" />
        <input
          name="title"
          required
          placeholder="Add a task…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </form>

      {tasks.length === 0 ? (
        <p className="px-5 py-6 text-center text-xs text-ink-faint">
          Nothing pending — you&apos;re all caught up.
        </p>
      ) : (
        <ul>
          {tasks.map((t) => {
            const overdue = t.dueAt && new Date(t.dueAt) < new Date();
            return (
              <li
                key={t.id}
                className="group flex items-start gap-3 border-b border-line/70 px-5 py-3 last:border-0"
              >
                <button
                  onClick={() => toggleTask(t.id)}
                  aria-label="Toggle done"
                  className={cn(
                    "mt-0.5 size-4 shrink-0 rounded-full border-2 transition-colors",
                    t.done
                      ? "border-pass bg-pass"
                      : "border-line-strong hover:border-garnet-500"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm text-ink",
                      t.done && "text-ink-faint line-through"
                    )}
                  >
                    {t.title}
                  </p>
                  {t.dueAt ? (
                    <p
                      className={cn(
                        "mt-0.5 text-[11px] font-medium",
                        overdue ? "text-fail" : "text-ink-faint"
                      )}
                    >
                      {overdue ? "Overdue · " : "Due · "}
                      {formatDate(t.dueAt)}
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={() => deleteTask(t.id)}
                  aria-label="Delete task"
                  className="invisible mt-0.5 text-ink-faint hover:text-fail group-hover:visible"
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
