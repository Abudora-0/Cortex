import { requireUser } from "@/lib/auth";
import { getAcademics } from "@/lib/queries";
import { WhatIfLab } from "@/components/whatif-lab";
import { EmptyState } from "@/components/ui/empty-state";

export default async function GpaLabPage() {
  const user = await requireUser();
  const { semesters } = await getAcademics(user.id);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="eyebrow">Model your grades</p>
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
          GPA Lab
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Drag ungraded courses to test marks, or plan future courses to project your
          CGPA forward.
        </p>
      </header>

      {semesters.length === 0 ? (
        <EmptyState
          title="Nothing to project yet"
          hint="Add a semester and some courses first — then come back to experiment."
        />
      ) : (
        <WhatIfLab
          semesters={semesters.map((s) => ({
            id: s.id,
            name: s.name,
            courses: s.courses.map((c) => ({
              id: c.id,
              title: c.title,
              code: c.code,
              creditHours: c.creditHours,
              percent: c.percent,
              scheme: c.scheme,
              fromLms: c.fromLms,
              fixedGradePoints: c.fromLms ? c.gradePoints : null,
              fixedLetter: c.fromLms ? c.letter : null,
            })),
          }))}
        />
      )}
    </div>
  );
}
