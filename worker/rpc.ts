import { config } from "dotenv";
config({ path: ".env.local" });
config();

import fs from "fs";
import path from "path";
import { chromium, type APIRequestContext } from "playwright";

// Uses the saved session to query the Odoo ORM over JSON-RPC. Discovers the
// models behind the student menus (View DMC, TimeTable, Offered Subjects,
// Reports) so the scraper can read structured data instead of scraping HTML.
//   npm run lms:rpc

const BASE = (process.env.LMS_BASE_URL || "https://lms.uet.edu.pk").replace(/\/$/, "");
const SESSION_FILE = path.join(process.cwd(), ".lms-session.json");
const OUT = path.join(process.cwd(), ".recon");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

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
  if (j?.error) {
    const msg = j.error.data?.message || j.error.message || JSON.stringify(j.error);
    throw new Error(msg);
  }
  return j?.result;
}

async function main() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.log("No saved session. Run `npm run lms:connect` first.");
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: UA, storageState: SESSION_FILE });
  const req = context.request;

  const findings: Record<string, unknown> = {};

  // 1. The act_window actions → reveal res_model + domain.
  try {
    const actions = await callKw(
      req,
      "ir.actions.act_window",
      "read",
      [[359, 376, 343, 113], ["name", "res_model", "domain", "context", "view_mode"]]
    );
    console.log("=== ACT_WINDOW ACTIONS (model behind each menu) ===");
    for (const a of (actions as Record<string, unknown>[]) ?? []) {
      console.log(`• ${a.name}  →  model="${a.res_model}"  domain=${a.domain}  views=${a.view_mode}`);
    }
    findings.actWindow = actions;
  } catch (e) {
    console.log("act_window read failed:", (e as Error).message);
  }

  // 2. Server actions (View DMC, Student Profile) → inspect their python code.
  try {
    const servers = await callKw(
      req,
      "ir.actions.server",
      "read",
      [[1008, 2291], ["name", "model_id", "state", "code"]]
    );
    console.log("\n=== SERVER ACTIONS ===");
    for (const a of (servers as Record<string, unknown>[]) ?? []) {
      console.log(`• ${a.name}  model_id=${JSON.stringify(a.model_id)}  state=${a.state}`);
      if (a.code) console.log("  code:\n" + String(a.code).split("\n").map((l) => "    " + l).join("\n"));
    }
    findings.serverActions = servers;
  } catch (e) {
    console.log("server action read failed:", (e as Error).message);
  }

  // 3. Who am I as a student? Find the linked student record.
  for (const model of ["op.student", "student.student", "res.users"]) {
    try {
      const fields = model === "res.users"
        ? ["name", "login", "partner_id", "student_id"]
        : ["name", "gr_no", "user_id", "partner_id"];
      const domain = model === "res.users" ? [["id", "=", "$UID"]] : [["user_id.login", "=", "2025CS212@student.uet.edu.pk"]];
      // (placeholder domain replaced below for res.users)
      const rows = await callKw(req, model, "search_read", [
        model === "res.users" ? [] : domain,
        fields,
      ], { limit: 3 });
      console.log(`\n=== ${model} (${(rows as unknown[])?.length ?? 0} rows) ===`);
      console.log(JSON.stringify(rows, null, 1)?.slice(0, 1500));
      findings[model] = rows;
    } catch (e) {
      console.log(`\n${model}: ${(e as Error).message.split("\n")[0]}`);
    }
  }

  fs.writeFileSync(path.join(OUT, "rpc.json"), JSON.stringify(findings, null, 2));
  await browser.close();
  console.log(`\nSaved raw results to ${path.join(OUT, "rpc.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
