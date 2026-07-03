import { config } from "dotenv";
config({ path: ".env.local" });
config();

import fs from "fs";
import path from "path";
import { chromium } from "playwright";

// Uses the saved LMS session to interrogate the Odoo backend for what THIS
// student account can access: session info + the full menu tree (reveals the
// Exam/Result/Attendance/Course menus) + a render of /web. Read-only.
//   npm run lms:explore   (run `npm run lms:connect` first to create a session)

const BASE = (process.env.LMS_BASE_URL || "https://lms.uet.edu.pk").replace(/\/$/, "");
const SESSION_FILE = path.join(process.cwd(), ".lms-session.json");
const OUT = path.join(process.cwd(), ".recon");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

type Json = Record<string, unknown>;

// Recursively collect { name, action } pairs from Odoo's load_menus payload
// (format varies across Odoo versions, so walk it generically).
function collectMenus(node: unknown, out: { name: string; action: unknown }[], depth = 0) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectMenus(n, out, depth));
    return;
  }
  const obj = node as Json;
  if (typeof obj.name === "string") {
    out.push({ name: `${"  ".repeat(depth)}${obj.name}`, action: obj.action ?? obj.actionID ?? null });
  }
  for (const key of ["children", "childrenTree"]) {
    if (obj[key]) collectMenus(obj[key], out, depth + 1);
  }
  // Some versions store children as sibling id-keyed entries; walk values too.
  if (!obj.children && !obj.childrenTree) {
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") collectMenus(v, out, depth);
    }
  }
}

async function main() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.log("No saved session. Run `npm run lms:connect` first.");
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: UA, storageState: SESSION_FILE });
  const page = await context.newPage();
  const rpc = async (url: string) => {
    const r = await page.request.post(BASE + url, {
      data: { jsonrpc: "2.0", method: "call", params: {} },
      headers: { "Content-Type": "application/json" },
      timeout: 45_000,
    });
    return { status: r.status(), json: (await r.json().catch(() => null)) as Json | null };
  };

  // 1. Session info
  const info = await rpc("/web/session/get_session_info").catch(() => ({ status: 0, json: null as Json | null }));
  fs.writeFileSync(path.join(OUT, "session.json"), JSON.stringify(info.json, null, 2));
  const res = ((info.json as Json | null)?.result ?? {}) as Json;
  console.log("=== SESSION ===");
  console.log("uid:", res.uid, "| name:", res.name, "| username:", res.username);
  console.log("db:", res.db, "| company:", JSON.stringify(res.user_companies ?? res.company_id ?? null));

  // 2. Menu tree — the map of what this account can open
  let menus: Json | null = null;
  for (const url of ["/web/webclient/load_menus", "/web/webclient/load_menus/false"]) {
    const r = await rpc(url).catch(() => ({ status: 0, json: null }));
    if (r.json && (r.json.result || r.json.root || Object.keys(r.json).length > 2)) {
      menus = r.json.result ? (r.json.result as Json) : r.json;
      break;
    }
  }
  if (menus) {
    fs.writeFileSync(path.join(OUT, "menus.json"), JSON.stringify(menus, null, 2));
    const list: { name: string; action: unknown }[] = [];
    collectMenus(menus, list);
    console.log("\n=== MENU TREE (what your account can open) ===");
    const seen = new Set<string>();
    for (const m of list) {
      const key = m.name.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      console.log(`${m.name}${m.action ? `   [action: ${m.action}]` : ""}`);
    }
  } else {
    console.log("\nCould not load the menu tree (portal-only account?). See .recon/ dumps.");
  }

  // 3. Render /web so we can see the app UI
  try {
    await page.goto(BASE + "/web", { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(3500);
    fs.writeFileSync(path.join(OUT, "web_backend.html"), await page.content());
    const apps = await page.$$eval(
      "a.o_app, .o_menu_apps a, .o_navbar .o_menu_sections a, header a[href*='menu_id'], .o_MessagingMenu",
      (els) => [...new Set(els.map((e) => (e.textContent || "").trim()).filter(Boolean))]
    );
    console.log("\n=== VISIBLE APPS/MENUS ON /web ===");
    console.log(apps.length ? apps.join(" | ") : "(none captured — check .recon/web_backend.html)");
    await page.screenshot({ path: path.join(OUT, "web_backend.png"), fullPage: true }).catch(() => {});
  } catch (e) {
    console.log("\n/web render failed:", (e as Error).message.split("\n")[0]);
  }

  await browser.close();
  console.log(`\nDumps saved to ${OUT} (menus.json, web_backend.html/.png, session.json).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
