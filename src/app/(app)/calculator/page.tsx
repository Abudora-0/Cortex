import { requireUser } from "@/lib/auth";
import { getAcademics } from "@/lib/queries";
import { GpaCalculator, type MyCourse } from "@/components/gpa-calculator";
import { AimCalculator } from "@/components/aim-calculator";

export default async function CalculatorPage() {
  const { id: userId } = await requireUser();
  const { semesters, cgpa, totalCredits } = await getAcademics(userId);

  const myCourses: MyCourse[] = semesters.flatMap((s) =>
    s.courses
      .filter((c) => c.letter != null && c.creditHours > 0)
      .map((c) => ({
        name: c.code || c.title,
        credits: c.creditHours,
        grade: c.letter as string,
        semester: s.name,
      }))
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="eyebrow">Crunch the numbers</p>
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
          GPA Calculator
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Work out a GPA for any set of courses, blend it into your current record for a
          live CGPA, or find the semester GPA you need to hit a target. Nothing here is saved.
        </p>
      </header>

      <GpaCalculator myCourses={myCourses} priorCgpa={cgpa} priorCredits={totalCredits} />

      <AimCalculator defaultCgpa={cgpa} defaultCredits={totalCredits} />
    </div>
  );
}
