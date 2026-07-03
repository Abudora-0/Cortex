import { config } from "dotenv";
config({ path: ".env.local" });
config();

import fs from "fs";
import path from "path";
import { chromium, type APIRequestContext } from "playwright";

// Recon for the five menus the user wants: TimeTables (obe.core.semester
// actions 113/359), Student Profile (obe.core.student), DMC (obe.grade.book /
// obe.core.result) and Offered Subjects (obe.offered_subject). Read-only.
//   npm run lms:menus

const BASE = (process.env.LMS_BASE_URL || "https://lms.uet.edu.pk").replace(/\/$/, "");
const SESSION_FILE = path.join(process.cwd(), ".lms-session.json");
const OUT = path.join(process.cwd(), ".recon");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

type FieldMeta = { type: string; string: string; relation?: string };

async function callKw(
  req: APIRequestContext,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
) {
  const r = await req.post(BASE + "/web/dataset/call_kw", {
    data: { jsonrpc: "2.0", method: "call", params: { model, method, args, kwargs } },
    headers: { "Content-Type": "application/json" },
    timeout: 45_000,
  });
  const j = (await r.json().catch(() => null)) as { result?: unknown; error?: { data?: { message?: string }; message?: string } } | null;
  if (j?.error) throw new Error(j.error.data?.message || j.error.message || JSON.stringify(j.error));
  return j?.result;
}

const trunc = (v: unknown, n = 2500) => JSON.stringify(v, null, 1).slice(0, n);
async function fields(req: APIRequestContext, model: string) {
  return (await callKw(req, model, "fields_get", [], { attributes: ["string", "type", "relation"] })) as Record<string, FieldMeta>;
}
function rels(f: Record<string, FieldMeta>) {
  return Object.entries(f).filter(([, m]) => m.relation).map(([n, m]) => `${n}→${m.relation}`).join(", ");
}

async function main() {
  if (!fs.existsSync(SESSION_FILE)) { console.log("No session. Run npm run lms:connect first."); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: UA, storageState: SESSION_FILE });
  const req = ctx.request;
  const out: Record<string, unknown> = {};

  // session + student id
  const info = (await req.post(BASE + "/web/session/get_session_info", { data: { jsonrpc: "2.0", method: "call", params: {} }, headers: { "Content-Type": "application/json" } }).then((r) => r.json()).catch(() => null)) as { result?: { uid?: number } } | null;
  const uid = info?.result?.uid;
  if (!uid) { console.log(">>> SESSION EXPIRED — run `npm run lms:connect` again."); await browser.close(); return; }
  const me = (await callKw(req, "res.users", "search_read", [[["id", "=", uid]], ["name", "student_id"]], { limit: 1 })) as Record<string, unknown>[];
  const studentRef = me?.[0]?.student_id as [number, string] | undefined;
  const [studentId, roll] = studentRef ?? [0, ""];
  console.log(`Session OK. uid=${uid} student=${studentId} roll=${roll}\n`);

  // 1. Actions behind the timetable + offered-subject menus
  const acts = await callKw(req, "ir.actions.act_window", "read", [[113, 359, 376], ["name", "res_model", "domain", "context", "view_mode"]]);
  console.log("=== ACTIONS ===\n" + trunc(acts, 1500) + "\n");
  out.actions = acts;

  // 2. obe.core.semester (timetable). Discover fields, then read matching rows.
  try {
    const f = await fields(req, "obe.core.semester");
    console.log(`=== obe.core.semester — ${Object.keys(f).length} fields ===`);
    console.log(Object.keys(f).join(", "));
    console.log("relations: " + rels(f) + "\n");
    out["semester.fields"] = f;
    // active semesters (as the action domain does)
    const sems = await callKw(req, "obe.core.semester", "search_read", [[["active_semester_id", "=", 1]], Object.keys(f)], { limit: 5 });
    console.log("active semester rows:\n" + trunc(sems, 3000) + "\n");
    out["semester.rows"] = sems;
  } catch (e) { console.log("semester:", (e as Error).message.split("\n")[0]); }

  // 3. Search ir.model for anything timetable/lecture/period-like
  try {
    const models = await callKw(req, "ir.model", "search_read", [[["model", "like", "obe%"]], ["model", "name"]], { limit: 400 });
    const hits = (models as Record<string, unknown>[]).filter((m) => /time|table|lecture|period|slot|schedule|day|attend/i.test(String(m.model) + String(m.name)));
    console.log("=== timetable-ish OBE models ===");
    console.log(hits.map((m) => `${m.model}  (${m.name})`).join("\n") + "\n");
    out["timetableModels"] = hits;
  } catch (e) { console.log("ir.model:", (e as Error).message.split("\n")[0]); }

  // 4. obe.offered_subject
  try {
    const f = await fields(req, "obe.offered_subject");
    console.log(`=== obe.offered_subject — fields ===\n${Object.keys(f).join(", ")}\nrelations: ${rels(f)}`);
    const rows = await callKw(req, "obe.offered_subject", "search_read", [[], Object.keys(f)], { limit: 10 });
    console.log("rows:\n" + trunc(rows, 2500) + "\n");
    out["offered.fields"] = f; out["offered.rows"] = rows;
  } catch (e) { console.log("offered_subject:", (e as Error).message.split("\n")[0]); }

  // 5. obe.core.student — timetable/attendance-related fields
  try {
    const f = await fields(req, "obe.core.student");
    const interesting = Object.keys(f).filter((n) => /time|attend|section|program|session|semester|department|roll/i.test(n));
    console.log("=== obe.core.student interesting fields ===\n" + interesting.join(", ") + "\n");
    out["student.interestingFields"] = interesting.map((n) => ({ name: n, ...f[n] }));
  } catch (e) { console.log("student:", (e as Error).message.split("\n")[0]); }

  fs.writeFileSync(path.join(OUT, "menus.json"), JSON.stringify(out, null, 2));
  await browser.close();
  console.log(`Full dump → ${path.join(OUT, "menus.json")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
