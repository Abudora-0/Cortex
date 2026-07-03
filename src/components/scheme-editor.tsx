"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { saveGradeScheme } from "@/lib/actions";
import {
  UET_DEFAULT_SCHEME,
  DEFAULT_LINEAR_RULE,
  type GradeSchemeSpec,
  type Boundary,
} from "@/lib/gpa";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

// Numbers can pick up float artifacts crossing the server/client boundary
// (0.1 → 0.10000000149…); round for display and storage.
function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

export function SchemeEditor({
  courseId,
  initial,
}: {
  /** null = the user's default scheme */
  courseId: string | null;
  initial: GradeSchemeSpec;
}) {
  const [spec, setSpec] = useState<GradeSchemeSpec>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const setBoundary = (i: number, patch: Partial<Boundary>) => {
    setSpec((s) => ({
      ...s,
      boundaries: s.boundaries.map((b, j) => (j === i ? { ...b, ...patch } : b)),
    }));
    setSaved(false);
  };

  const save = () =>
    startTransition(async () => {
      const clean: GradeSchemeSpec = {
        ...spec,
        boundaries: spec.boundaries.map((b) => ({
          ...b,
          minPercent: round4(b.minPercent),
          gradePoints: round4(b.gradePoints),
        })),
        linear: spec.linear
          ? {
              maxPercent: round4(spec.linear.maxPercent),
              maxGp: round4(spec.linear.maxGp),
              perMarkDrop: round4(spec.linear.perMarkDrop),
              passPercent: round4(spec.linear.passPercent),
              passGp: round4(spec.linear.passGp),
            }
          : undefined,
      };
      await saveGradeScheme(courseId, JSON.stringify(clean));
      setSpec(clean);
      setSaved(true);
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Grade points rule</Label>
          <Select
            value={spec.kind}
            onChange={(e) => {
              const kind = e.target.value as GradeSchemeSpec["kind"];
              setSpec((s) => ({
                ...s,
                kind,
                linear: s.linear ?? DEFAULT_LINEAR_RULE,
              }));
              setSaved(false);
            }}
            className="w-56"
          >
            <option value="stepwise">Letter table (UET official)</option>
            <option value="linear">Linear (interpolated)</option>
          </Select>
        </div>
        {spec.kind === "linear" && spec.linear ? (
          <p className="pb-2 text-xs text-ink-faint">
            {spec.linear.maxGp.toFixed(1)} GP at ≥{spec.linear.maxPercent}%, −
            {spec.linear.perMarkDrop} per mark, pass {spec.linear.passPercent}% ={" "}
            {spec.linear.passGp.toFixed(1)} GP
          </p>
        ) : null}
      </div>

      {spec.kind === "linear" && spec.linear ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ["maxPercent", "Full GP at %"],
              ["maxGp", "Max GP"],
              ["perMarkDrop", "Drop / mark"],
              ["passPercent", "Pass %"],
              ["passGp", "Pass GP"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                type="number"
                step="0.01"
                value={round4(spec.linear![key])}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  setSpec((s) => ({
                    ...s,
                    linear: { ...s.linear!, [key]: v },
                  }));
                  setSaved(false);
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <Label>Letter boundaries</Label>
        <div className="space-y-2">
          {spec.boundaries.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label="Letter"
                value={b.letter}
                onChange={(e) => setBoundary(i, { letter: e.target.value })}
                className="w-16 text-center font-semibold"
              />
              <span className="text-xs text-ink-faint">at ≥</span>
              <Input
                aria-label="Minimum percent"
                type="number"
                value={b.minPercent}
                onChange={(e) =>
                  setBoundary(i, { minPercent: parseFloat(e.target.value) || 0 })
                }
                className="w-20"
              />
              <span className="text-xs text-ink-faint">% →</span>
              <Input
                aria-label="Grade points"
                type="number"
                step="0.01"
                value={b.gradePoints}
                onChange={(e) =>
                  setBoundary(i, { gradePoints: parseFloat(e.target.value) || 0 })
                }
                className="w-24"
              />
              <span className="text-xs text-ink-faint">GP</span>
              <button
                type="button"
                aria-label="Remove boundary"
                onClick={() => {
                  setSpec((s) => ({
                    ...s,
                    boundaries: s.boundaries.filter((_, j) => j !== i),
                  }));
                  setSaved(false);
                }}
                className="ml-auto rounded-md p-1 text-ink-faint hover:bg-fail-soft hover:text-fail"
                disabled={spec.boundaries.length <= 1}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setSpec((s) => ({
              ...s,
              boundaries: [
                ...s.boundaries,
                { letter: "?", minPercent: 0, gradePoints: 0 },
              ],
            }));
            setSaved(false);
          }}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-garnet-600 hover:underline"
        >
          <Plus size={13} /> Add boundary
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save scheme"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setSpec(UET_DEFAULT_SCHEME);
            setSaved(false);
          }}
        >
          Reset to UET default
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-pass">
            <Check size={13} /> Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}
