"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Mail, MapPin, Clock, ArrowRight } from "lucide-react";
import { setCourseTeacher } from "@/lib/actions";
import { Select } from "@/components/ui/input";
import { CopyButton } from "@/components/copy-button";

export interface TeacherOption {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  office: string | null;
  officeHours: string | null;
}

export function CourseInstructor({
  courseId,
  courseCode,
  teachers,
  currentId,
}: {
  courseId: string;
  courseCode: string | null;
  teachers: TeacherOption[];
  currentId: string | null;
}) {
  const [pending, start] = useTransition();
  const current = teachers.find((t) => t.id === currentId) ?? null;

  const assign = (id: string) =>
    start(() => {
      void setCourseTeacher(courseId, id || null);
    });

  if (teachers.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-ink-soft">
        No instructors saved yet.{" "}
        <Link href="/faculty" className="font-semibold text-garnet-600 hover:underline">
          Add one in Faculty
        </Link>{" "}
        to link it here.
      </p>
    );
  }

  const mailto = current?.email
    ? `mailto:${current.email}${courseCode ? `?subject=${encodeURIComponent(`[${courseCode}] `)}` : ""}`
    : null;

  return (
    <div className="space-y-3">
      <Select
        value={currentId ?? ""}
        onChange={(e) => assign(e.target.value)}
        disabled={pending}
        aria-label="Course instructor"
        className="h-9"
      >
        <option value="">Unassigned</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title ? `${t.title} ` : ""}
            {t.name}
          </option>
        ))}
      </Select>

      {current ? (
        <div className="space-y-1.5 rounded-lg border border-line bg-canvas/50 px-3 py-2.5 text-xs text-ink-soft">
          {current.email ? (
            <div className="flex items-center gap-2">
              <Mail size={13} className="shrink-0 text-ink-faint" />
              <a href={mailto!} className="min-w-0 truncate font-medium text-garnet-600 hover:underline">
                {current.email}
              </a>
              <CopyButton text={current.email} label={`Copy ${current.name}'s email`} />
            </div>
          ) : null}
          {current.office ? (
            <div className="flex items-center gap-2">
              <MapPin size={13} className="shrink-0 text-ink-faint" />
              <span className="truncate">{current.office}</span>
            </div>
          ) : null}
          {current.officeHours ? (
            <div className="flex items-center gap-2">
              <Clock size={13} className="shrink-0 text-ink-faint" />
              <span className="truncate">{current.officeHours}</span>
            </div>
          ) : null}
          <Link
            href="/faculty"
            className="inline-flex items-center gap-1 pt-0.5 text-[11px] font-semibold text-ink-faint hover:text-garnet-600"
          >
            Manage in Faculty <ArrowRight size={11} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
