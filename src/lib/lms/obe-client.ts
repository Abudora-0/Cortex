import fs from "fs";
import path from "path";

// Server-side Odoo (OBE) client. It reuses the session captured by
// `npm run lms:connect` (.lms-session.json) and talks to Odoo's JSON-RPC
// endpoint with a plain fetch - no browser needed once the session exists.
// The UET LMS blocks automated *login* with a reCAPTCHA, but the data behind
// an existing session is just JSON-RPC.

const BASE = (process.env.LMS_BASE_URL || "https://lms.uet.edu.pk").replace(/\/$/, "");
const SESSION_FILE = path.join(process.cwd(), ".lms-session.json");

interface StoredCookie {
  name: string;
  value: string;
  domain: string;
}

export interface LmsResult {
  lmsCourseId: string;
  semesterName: string;
  code: string | null;
  title: string;
  creditHours: number;
  percent: number | null;
  grade: string | null;
  gradePoints: number | null;
  status: string | null;
  order: number; // stable ordering within the full result set
  // Best-effort extras discovered from the subject record (may be absent).
  teacher?: string | null;
  outline?: string | null;
}

export interface LmsProfile {
  roll: string;
  program: string | null;
  department: string | null;
  semesterSeq: number | null;
}

export interface LmsSnapshot {
  studentId: number;
  roll: string;
  name: string;
  program: string | null;
  profile: LmsProfile;
  results: LmsResult[];
}

export function hasSession(): boolean {
  return fs.existsSync(SESSION_FILE);
}

function cookieHeader(): string {
  const raw = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8")) as { cookies?: StoredCookie[] };
  const host = new URL(BASE).host;
  return (raw.cookies ?? [])
    .filter((c) => host.endsWith(c.domain.replace(/^\./, "")))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function callKw<T = unknown>(
  cookie: string,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<T> {
  const r = await fetch(BASE + "/web/dataset/call_kw", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { model, method, args, kwargs } }),
    // Guard against a hung Cloudflare/origin so a sync can't stall forever.
    signal: AbortSignal.timeout(30_000),
  });
  const j = (await r.json()) as { result?: T; error?: { data?: { message?: string }; message?: string } };
  if (j.error) throw new Error(j.error.data?.message || j.error.message || "Odoo RPC error");
  return j.result as T;
}

async function sessionUid(cookie: string): Promise<number | null> {
  const r = await fetch(BASE + "/web/session/get_session_info", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {} }),
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await r.json().catch(() => null)) as { result?: { uid?: number } } | null;
  return typeof j?.result?.uid === "number" ? j.result.uid : null;
}

/** Whether the saved session still authenticates. */
export async function sessionValid(): Promise<boolean> {
  if (!hasSession()) return false;
  try {
    return (await sessionUid(cookieHeader())) != null;
  } catch {
    return false;
  }
}

function splitCode(name: string): { code: string | null; title: string } {
  // "CSC-100L Application of Information and Communication Technologies"
  const m = name.match(/^([A-Z]{2,5}-\d+[A-Z]?)\s+(.*)$/);
  return m ? { code: m[1], title: m[2] } : { code: null, title: name };
}

const asStr = (v: unknown) => (typeof v === "string" ? v : v == null || v === false ? null : String(v));
const asNum = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/li|\/div|\/tr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);
}

/**
 * Best-effort: for the subjects behind a student's results, pull the
 * instructor + course outline from the subject record. UET's field names
 * vary, so we discover them at runtime via fields_get and only read fields
 * that clearly match — anything unexpected is skipped, never guessed wrong.
 */
async function enrichSubjects(
  cookie: string,
  subjectIds: number[]
): Promise<Map<number, { teacher: string | null; outline: string | null }>> {
  const out = new Map<number, { teacher: string | null; outline: string | null }>();
  if (subjectIds.length === 0) return out;
  try {
    const relInfo = await callKw<Record<string, { relation?: string }>>(
      cookie,
      "obe.core.result",
      "fields_get",
      [["subject_id"]],
      { attributes: ["relation"] }
    );
    const model = relInfo?.subject_id?.relation;
    if (!model) return out;

    const fields = await callKw<Record<string, { type?: string }>>(
      cookie,
      model,
      "fields_get",
      [[]],
      { attributes: ["type"] }
    );
    const names = Object.keys(fields);
    const teacherField = names.find(
      (n) => fields[n]?.type === "many2one" && /teacher|faculty|instructor|incharge/i.test(n)
    );
    const outlineField = names.find(
      (n) => /outline/i.test(n) && ["text", "html", "char"].includes(fields[n]?.type ?? "")
    );
    const read = ["id", teacherField, outlineField].filter(Boolean) as string[];
    if (read.length <= 1) return out;

    const subs = await callKw<Record<string, unknown>[]>(cookie, model, "read", [subjectIds, read]);
    for (const s of subs) {
      const id = asNum(s.id);
      if (id == null) continue;
      let teacher: string | null = null;
      if (teacherField) {
        const v = s[teacherField];
        teacher = Array.isArray(v) ? asStr((v as [number, string])[1]) : asStr(v);
      }
      let outline: string | null = null;
      if (outlineField) {
        const v = s[outlineField];
        if (typeof v === "string" && v.trim()) outline = htmlToText(v) || null;
      }
      out.set(id, { teacher, outline });
    }
  } catch {
    /* enrichment is optional — never fail the sync over it */
  }
  return out;
}

/** Pull this student's full result set from the OBE portal. */
export async function fetchSnapshot(): Promise<LmsSnapshot> {
  const cookie = cookieHeader();
  const uid = await sessionUid(cookie);
  if (!uid) throw new Error("SESSION_EXPIRED");

  const users = await callKw<Record<string, unknown>[]>(cookie, "res.users", "search_read", [
    [["id", "=", uid]],
    ["name", "student_id"],
  ], { limit: 1 });
  const studentRef = users?.[0]?.student_id as [number, string] | undefined;
  if (!studentRef) throw new Error("No student linked to this LMS account.");
  const [studentId, roll] = studentRef;

  // Student profile (obe.core.student) - a safe subset; reading all 194 fields
  // trips AccessError.
  let program: string | null = null;
  const profile: LmsProfile = { roll, program: null, department: null, semesterSeq: null };
  try {
    const stu = await callKw<Record<string, unknown>[]>(cookie, "obe.core.student", "read", [
      [studentId],
      ["roll_no", "session_id", "department_program_id", "semester_sequence"],
    ]);
    const row = stu?.[0] ?? {};
    const sess = row.session_id as [number, string] | undefined;
    program = sess ? sess[1] : null;
    profile.roll = asStr(row.roll_no) ?? roll;
    profile.program = program;
    profile.semesterSeq = asNum(row.semester_sequence);
    // department_program_id label often carries the department name
    const dep = row.department_program_id as [number, string] | undefined;
    profile.department = dep && !/,\d+$/.test(dep[1]) ? dep[1] : null;
  } catch {
    /* profile is optional */
  }

  const rows = await callKw<Record<string, unknown>[]>(cookie, "obe.core.result", "search_read", [
    [["student_id", "=", studentId]],
    [
      "id", "subject_id", "subject_name_for_grade_book", "semester_name",
      "rel_grade", "grade", "gp_rel", "ch_rel", "weightage", "result_uo_status_rel",
    ],
  ], { limit: 200 });

  const subjectIdOf = (r: Record<string, unknown>) =>
    Array.isArray(r.subject_id) ? asNum((r.subject_id as [number, string])[0]) : null;

  const uniqueSubjectIds = Array.from(
    new Set(rows.map(subjectIdOf).filter((n): n is number => n != null))
  );
  const meta = await enrichSubjects(cookie, uniqueSubjectIds);

  const results: LmsResult[] = rows.map((r, i) => {
    const rawName = asStr(r.subject_name_for_grade_book) ?? (Array.isArray(r.subject_id) ? String((r.subject_id as [number, string])[1]) : "Course");
    const { code, title } = splitCode(rawName);
    const ch = asNum(r.ch_rel) ?? 0;
    const qualityPoints = asNum(r.gp_rel); // gp_rel = gradePoints × creditHours
    const gradePoints = qualityPoints != null && ch > 0 ? Math.round((qualityPoints / ch) * 100) / 100 : null;
    const sm = meta.get(subjectIdOf(r) ?? -1);
    return {
      lmsCourseId: String(r.id),
      semesterName: asStr(r.semester_name) ?? "Unknown semester",
      code,
      title,
      creditHours: ch,
      percent: asNum(r.weightage),
      grade: asStr(r.rel_grade) ?? asStr(r.grade),
      gradePoints,
      status: asStr(r.result_uo_status_rel),
      order: i,
      teacher: sm?.teacher ?? null,
      outline: sm?.outline ?? null,
    };
  });

  return { studentId, roll, name: asStr(users[0].name) ?? roll, program, profile, results };
}
