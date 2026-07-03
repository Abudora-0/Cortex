import { config } from "dotenv";
config({ path: ".env.local" });
config();

import fs from "fs";
import path from "path";

const BASE = (process.env.LMS_BASE_URL || "https://lms.uet.edu.pk").replace(/\/$/, "");
const SESSION_FILE = path.join(process.cwd(), ".lms-session.json");
const OUT = path.join(process.cwd(), ".recon");

function cookieHeader(): string {
  const raw = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8")) as { cookies?: { name: string; value: string; domain: string }[] };
  const host = new URL(BASE).host;
  return (raw.cookies ?? [])
    .filter((c) => host.endsWith(c.domain.replace(/^\./, "")))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function callKw(cookie: string, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  const r = await fetch(BASE + "/web/dataset/call_kw", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { model, method, args, kwargs } }),
    signal: AbortSignal.timeout(45_000),
  });
  const j = (await r.json().catch(() => null)) as { result?: unknown; error?: { data?: { message?: string }; message?: string } } | null;
  if (j?.error) throw new Error(j.error.data?.message || j.error.message || JSON.stringify(j.error));
  return j?.result;
}
const trunc = (v: unknown, n = 4500) => JSON.stringify(v, null, 1).slice(0, n);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const cookie = cookieHeader();
  const out: Record<string, unknown> = {};

  const student = (await callKw(cookie, "obe.core.student", "read", [[86782], ["roll_no", "section_ids", "session_id", "department_program_id", "semester_sequence", "attendance_ids"]])) as Record<string, unknown>[];
  console.log("=== STUDENT ===\n" + trunc(student, 1200) + "\n");
  out.student = student;
  const sectionIds = (student?.[0]?.section_ids as number[]) ?? [];
  console.log("student section_ids count:", sectionIds.length, "\n");

  const secF = (await callKw(cookie, "obe.core.section", "fields_get", [], { attributes: ["string", "type", "relation"] })) as Record<string, { type: string; string: string; relation?: string }>;
  console.log("=== obe.core.section fields ===\n" + Object.keys(secF).join(", "));
  console.log("relations: " + Object.entries(secF).filter(([, m]) => m.relation).map(([n, m]) => `${n}→${m.relation}`).join(", ") + "\n");
  out["section.fields"] = secF;

  // Read ONE sample section with a safe field subset (all-fields read trips a
  // computed singleton field). Sample a Spring-2026 CS section.
  const sampleId = sectionIds[0] ?? 102446;
  const safe = ["name", "section_name", "subject_id", "subject_code", "subject_title", "days", "class_timing", "class_timing2", "room_id", "faculty_id", "section_timings_ids", "semester_id", "credit_hr", "period_start"];
  const sec = (await callKw(cookie, "obe.core.section", "read", [[sampleId], safe])) as Record<string, unknown>[];
  console.log(`=== SAMPLE SECTION ${sampleId} ===\n` + trunc(sec, 2500) + "\n");
  out.sampleSection = sec;

  // The timetable slots: obe.core.section.timings
  const timF = (await callKw(cookie, "obe.core.section.timings", "fields_get", [], { attributes: ["string", "type", "relation"] })) as Record<string, { relation?: string }>;
  console.log("=== obe.core.section.timings fields ===\n" + Object.keys(timF).join(", "));
  console.log("relations: " + Object.entries(timF).filter(([, m]) => m.relation).map(([n, m]) => `${n}→${m.relation}`).join(", ") + "\n");
  out["timings.fields"] = timF;

  const timingIds = (sec?.[0]?.section_timings_ids as number[]) ?? [];
  if (timingIds.length) {
    const timings = await callKw(cookie, "obe.core.section.timings", "read", [timingIds.slice(0, 20), Object.keys(timF)]);
    console.log(`=== TIMING SLOTS (${(timings as unknown[]).length}) ===\n` + trunc(timings, 4000) + "\n");
    out.timings = timings;
  } else {
    console.log("(sample section has no section_timings_ids)\n");
  }

  // Broad sample of real timing rows to learn the day/time value format.
  const totalTimings = await callKw(cookie, "obe.core.section.timings", "search_count", [[]]);
  console.log("obe.core.section.timings total rows:", totalTimings);
  const anyTimings = await callKw(cookie, "obe.core.section.timings", "search_read", [
    [],
    ["day", "day_number", "period_start", "period_end", "duration", "room_name", "faculty_name", "subject_name", "semester_name"],
  ], { limit: 10, order: "id desc" });
  console.log("=== SAMPLE CS TIMINGS (any student) ===\n" + trunc(anyTimings, 4000) + "\n");
  out.sampleTimings = anyTimings;

  fs.writeFileSync(path.join(OUT, "tt.json"), JSON.stringify(out, null, 2));
  console.log("dump → .recon/tt.json");
}
main().catch((e) => { console.error(e); process.exit(1); });
