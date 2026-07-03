import { requireUser } from "@/lib/auth";
import { getAcademics } from "@/lib/queries";
import { GpaCalculator } from "@/components/gpa-calculator";
import { AimCalculator } from "@/components/aim-calculator";

export default async function CalculatorPage() {
  const { id: userId } = await requireUser();
  const { cgpa, totalCredits } = await getAcademics(userId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          GPA Calculator
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Work out a GPA for any set of courses, or find the semester GPA you need to
          hit a target. Nothing here is saved.
        </p>
      </header>

      <GpaCalculator />

      <AimCalculator defaultCgpa={cgpa} defaultCredits={totalCredits} />
    </div>
  );
}
