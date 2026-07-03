import { config } from "dotenv";
config({ path: ".env.local" });
config();

import fs from "fs";
import path from "path";
import { chromium, type APIRequestContext } from "playwright";

// Reads THIS student's real OBE data over Odoo JSON-RPC using the saved
// session, and discovers the exact fields the sync should pull.
//   npm run lms:obe

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

const trunc = (v: unknown, n = 3500) => JSON.stringify(v, null, 1).slice(0, n);

async function main() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.log("No saved session. Run `npm run lms:connect` first.");
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: UA, storageState: SESSION_FILE });
  const req = context.request;
  const out: Record<string, unknown> = {};

  const info = (await req
    .post(BASE + "/web/session/get_session_info", { data: { jsonrpc: "2.0", method: "call", params: {} }, headers: { "Content-Type": "application/json" } })
    .then((r) => r.json())
    .catch(() => null)) as { result?: { uid?: number } } | null;
  const uid = info?.result?.uid;

  const me = (await callKw(req, "res.users", "search_read", [[["id", "=", uid]], ["name", "login", "student_id"]], { limit: 1 })) as Record<string, unknown>[];
  const studentRef = me?.[0]?.student_id as [number, string] | undefined;
  if (!studentRef) { console.log("No student linked."); await browser.close(); return; }
  const [studentId, roll] = studentRef;
  console.log(`★ Student id=${studentId} roll="${roll}" name="${me[0].name}"`);
  out.me = me;

  // 1) Student profile — a safe subset (reading all 194 fields trips AccessError).
  const safe = ["name", "roll_no", "degree_completion_cgpa", "semester_sequence", "student_state", "department_program_id", "session_id", "enrolled_session_id", "email"];
  try {
    const stu = await callKw(req, "obe.core.student", "read", [[studentId], safe]);
    console.log("\n=== STUDENT PROFILE ===");
    console.log(trunc(stu));
    out.student = stu;
  } catch (e) {
    console.log("student read:", (e as Error).message.split("\n")[0]);
  }

  // 2) Grade book — link is student_roll_no (a char), and marks live in the
  //    x2many detail lines. Discover relations, then read the detail records.
  try {
    const gbFields = (await callKw(req, "obe.grade.book", "fields_get", [], { attributes: ["string", "type", "relation"] })) as Record<string, FieldMeta>;
    const rels = Object.entries(gbFields).filter(([, f]) => f.relation).map(([n, f]) => `${n} → ${f.relation}`);
    console.log("\n=== obe.grade.book relations ===\n" + rels.join("\n"));

    const gb = (await callKw(req, "obe.grade.book", "search_read", [[["student_roll_no", "=", roll]], Object.keys(gbFields)], { limit: 10 })) as Record<string, unknown>[];
    console.log(`\n=== GRADE BOOK (${gb.length} rows) ===`);
    console.log(trunc(gb, 2500));
    out.gradeBook = gb;

    // Follow the detail one2many(s) to the actual per-subject marks/grades.
    for (const df of ["grade_book_detail_ids", "result_ids", "result_comprehensive_ids"]) {
      const relModel = gbFields[df]?.relation;
      const ids = gb.flatMap((g) => (Array.isArray(g[df]) ? (g[df] as number[]) : []));
      if (relModel && ids.length) {
        const details = await callKw(req, relModel, "read", [ids.slice(0, 100)]);
        console.log(`\n=== ${df} → ${relModel} (${(details as unknown[]).length} rows) ===`);
        console.log(trunc(details, 4000));
        out[df] = { model: relModel, rows: details };
      }
    }
  } catch (e) {
    console.log("grade book:", (e as Error).message.split("\n")[0]);
  }

  // 3) obe.core.result — the actual per-subject results (grade book is on-demand).
  try {
    const rFields = (await callKw(req, "obe.core.result", "fields_get", [], { attributes: ["string", "type", "relation"] })) as Record<string, FieldMeta>;
    const names = Object.keys(rFields);
    console.log(`\n=== obe.core.result — ${names.length} fields ===`);
    console.log(names.join(", "));
    console.log("relations: " + Object.entries(rFields).filter(([, f]) => f.relation).map(([n, f]) => `${n}→${f.relation}`).join(", "));
    out["obe.core.result.fields"] = rFields;

    let rows: Record<string, unknown>[] = [];
    for (const dom of [[["student_id", "=", studentId]], [["student_roll_no", "=", roll]], [["student_id.roll_no", "=", roll]]]) {
      try {
        rows = (await callKw(req, "obe.core.result", "search_read", [dom, names], { limit: 60 })) as Record<string, unknown>[];
        if (rows.length) { console.log(`\n(matched on ${JSON.stringify(dom)})`); break; }
      } catch { /* try next domain */ }
    }
    console.log(`\n=== RESULTS (${rows.length} rows) ===`);
    console.log(trunc(rows, 6000));
    out.results = rows;
  } catch (e) {
    console.log("obe.core.result:", (e as Error).message.split("\n")[0]);
  }

  fs.writeFileSync(path.join(OUT, "obe-data.json"), JSON.stringify(out, null, 2));
  await browser.close();
  console.log(`\nFull dump → ${path.join(OUT, "obe-data.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
