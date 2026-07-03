import { config } from "dotenv";
config({ path: ".env.local" });
config();

import fs from "fs";
import path from "path";
import { chromium } from "playwright";

// Authenticated recon: logs into the UET LMS (Odoo) with LMS_RECON_USER /
// LMS_RECON_PASS and reports (1) whether the credentials actually authenticate
// and (2) the real portal structure so the scraper selectors can be filled in.
// Read-only — it only navigates and dumps HTML.

const BASE = (process.env.LMS_BASE_URL || "https://lms.uet.edu.pk").replace(/\/$/, "");
const USER = process.env.LMS_RECON_USER!;
const PASS = process.env.LMS_RECON_PASS!;
const OUT = path.join(process.cwd(), ".recon");

async function sessionInfo(page: import("playwright").Page) {
  // Odoo exposes the current session (uid, name, ...) via JSON-RPC.
  return page.evaluate(async (base) => {
    try {
      const r = await fetch(base + "/web/session/get_session_info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {} }),
      });
      const j = await r.json();
      return j.result ?? j.error ?? null;
    } catch (e) {
      return { fetchError: String(e) };
    }
  }, BASE);
}

async function main() {
  if (!USER || !PASS) throw new Error("Set LMS_RECON_USER and LMS_RECON_PASS");
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // --- Load login page, then submit and WAIT for the navigation it triggers ---
  await page.goto(`${BASE}/web/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator("#login").fill(USER);
  await page.locator("#password").fill(PASS);

  let navStatus = "no-nav";
  try {
    const [resp] = await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45_000 }),
      page.locator("form.oe_login_form button[type=submit]").first().click(),
    ]);
    navStatus = `nav→ HTTP ${resp?.status()} ${resp?.url()}`;
  } catch (e) {
    navStatus = "nav-timeout: " + (e as Error).message.split("\n")[0];
  }

  await page.waitForTimeout(2000);
  console.log("=== login result ===");
  console.log("submit:", navStatus);
  console.log("url now:", page.url());
  console.log("title:", await page.title());

  const err = await page.locator(".alert-danger, .alert-error").allTextContents();
  if (err.length) console.log("error banner:", err.map((s) => s.trim()).filter(Boolean));

  const info = await sessionInfo(page);
  const uid = info && typeof info === "object" ? (info as Record<string, unknown>).uid : null;
  console.log("session uid:", uid, "| name:", (info as Record<string, unknown>)?.name, "| username:", (info as Record<string, unknown>)?.username);
  fs.writeFileSync(path.join(OUT, "session.json"), JSON.stringify(info, null, 2));

  if (!uid) {
    console.log("\n>>> NOT AUTHENTICATED. Credentials rejected or extra step (captcha/OTP) required.");
    await browser.close();
    return;
  }
  console.log("\n>>> AUTHENTICATED. Mapping portal…");

  // --- Now that we have a session, probe the portal + backend ---
  const candidates = [
    "/", "/my", "/my/home", "/my/courses", "/odoo", "/web#action",
    "/my/account", "/openeducat", "/my/enrollment", "/my/exams",
  ];
  for (const p of candidates) {
    try {
      const res = await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 45_000 });
      console.log(`\n=== ${p} → HTTP ${res?.status()} (final ${page.url()}) title="${await page.title()}"`);
      if (!res || res.status() >= 400) continue;
      const links = await page.$$eval("a[href]", (els) =>
        [...new Set(
          els
            .map((a) => `${(a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)} → ${a.getAttribute("href")}`)
            .filter((t) => t && !t.includes("→ #") && !t.includes("javascript"))
        )].slice(0, 40)
      );
      console.log("links:", JSON.stringify(links, null, 1));
      fs.writeFileSync(path.join(OUT, "auth_" + p.replace(/[^\w]/g, "_") + ".html"), await page.content());
    } catch (e) {
      console.log(`${p}: ${(e as Error).message.split("\n")[0]}`);
    }
  }

  await browser.close();
  console.log(`\nDumps saved to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
