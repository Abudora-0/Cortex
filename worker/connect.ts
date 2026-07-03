import { config } from "dotenv";
config({ path: ".env.local" });
config();

import fs from "fs";
import path from "path";
import { chromium, type Page, type BrowserContext } from "playwright";

// ---------------------------------------------------------------------------
// Assisted LMS connect + portal mapper.
//
// The UET LMS (Odoo) login is behind a reCAPTCHA, so we cannot log in headless.
// This opens a VISIBLE browser, waits for YOU to log in (solving the captcha),
// then (1) saves the authenticated session to .lms-session.json so later syncs
// can reuse it, and (2) crawls the portal and dumps pages to .recon/ so the
// scraper selectors can be mapped to this specific LMS.
//
// Run it yourself (needs a real screen — it can't run inside the agent sandbox):
//   npm run lms:connect
// ---------------------------------------------------------------------------

const BASE = (process.env.LMS_BASE_URL || "https://lms.uet.edu.pk").replace(/\/$/, "");
const SESSION_FILE = path.join(process.cwd(), ".lms-session.json");
const OUT = path.join(process.cwd(), ".recon");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

// Words that hint a page/table holds academic data worth scraping.
const INTEREST = /grade|mark|assessment|quiz|assignment|exam|result|attendance|course|subject|enroll|cgpa|gpa|transcript|semester/i;

async function sessionUid(page: Page): Promise<number | null> {
  return page.evaluate(async (base) => {
    try {
      const r = await fetch(base + "/web/session/get_session_info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {} }),
      });
      const j = await r.json();
      const uid = j?.result?.uid;
      return typeof uid === "number" ? uid : null;
    } catch {
      return null;
    }
  }, BASE);
}

async function waitForLogin(page: Page, timeoutMs: number): Promise<number | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const uid = await sessionUid(page).catch(() => null);
    if (uid) return uid;
    await page.waitForTimeout(2500);
  }
  return null;
}

async function dump(page: Page, label: string) {
  const safe = label.replace(/[^\w]+/g, "_").slice(0, 60);
  const html = await page.content();
  fs.writeFileSync(path.join(OUT, `page_${safe}.html`), html);

  const tables = await page.$$eval("table", (els) =>
    els.map((t) => ({
      headers: [...t.querySelectorAll("th")].map((th) => (th.textContent || "").trim()).filter(Boolean).slice(0, 10),
      rowCount: t.querySelectorAll("tbody tr").length,
    }))
  );
  return tables;
}

async function crawl(context: BrowserContext, page: Page) {
  fs.mkdirSync(OUT, { recursive: true });

  // Collect same-origin links from the landing page (top menu + user menu).
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const rawLinks = await page.$$eval("a[href]", (els) =>
    els.map((a) => ({
      href: (a as HTMLAnchorElement).href,
      text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50),
    }))
  );

  const origin = new URL(BASE).origin;
  const seen = new Set<string>();
  const queue: { href: string; text: string }[] = [];
  for (const l of rawLinks) {
    try {
      const u = new URL(l.href);
      if (u.origin !== origin) continue;
      if (/logout|reset_password|\.pdf|\.zip|#/.test(u.pathname + u.search)) continue;
      const key = u.pathname + u.search;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ href: u.href, text: l.text });
    } catch {
      /* skip bad hrefs */
    }
  }

  // Also try a set of common Odoo / OpenEduCat student-portal paths.
  for (const p of ["/my", "/my/home", "/my/courses", "/my/grades", "/my/attendance", "/my/exams", "/my/enrollment", "/my/results"]) {
    if (!seen.has(p)) {
      seen.add(p);
      queue.push({ href: BASE + p, text: "(probe) " + p });
    }
  }

  console.log(`\nExploring ${queue.length} pages…\n`);
  const findings: string[] = [];

  for (const item of queue.slice(0, 40)) {
    try {
      const res = await page.goto(item.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const status = res?.status() ?? 0;
      const title = await page.title();
      const pathOnly = new URL(page.url()).pathname;
      if (status >= 400) continue;

      const tables = await dump(page, pathOnly + "_" + item.text);
      const bodyText = (await page.evaluate(() => document.body?.innerText || "")).slice(0, 4000);
      const interesting =
        INTEREST.test(item.text) || INTEREST.test(title) ||
        tables.some((t) => t.headers.some((h) => INTEREST.test(h))) ||
        INTEREST.test(bodyText);

      const tableSummary = tables
        .filter((t) => t.rowCount > 0 || t.headers.length)
        .map((t) => `[${t.rowCount} rows: ${t.headers.join(", ")}]`)
        .join(" ");

      const line = `${interesting ? "★" : " "} ${status} ${pathOnly}  "${title}"  ${item.text}  ${tableSummary}`;
      console.log(line);
      if (interesting) findings.push(line.trim());
    } catch (e) {
      console.log(`  ERR ${item.href}: ${(e as Error).message.split("\n")[0]}`);
    }
  }

  console.log("\n=================== LIKELY DATA PAGES (★) ===================");
  if (findings.length === 0) {
    console.log("None auto-detected. Check the HTML dumps in .recon/ manually.");
  } else {
    findings.forEach((f) => console.log(f));
  }
  console.log("============================================================");
  console.log(`\nAll page dumps saved to ${OUT}`);
  console.log("Share this output (and the .recon/ folder if asked) so the scraper can be mapped.");
}

// Common install locations for Brave (Chromium-based, but not a Playwright
// "channel", so it must be launched via executablePath).
function findBrave(): string | null {
  const home = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local");
  const candidates = [
    process.env.LMS_BROWSER_PATH, // manual override for any Chromium browser
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    path.join(home, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
  ].filter(Boolean) as string[];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

// Prefer a real installed browser over Playwright's bundled Chromium, whose
// full headed build often fails to download. A genuine browser is also less
// likely to trip the LMS captcha's bot heuristics. Order: Brave → Chrome →
// Edge → bundled Chromium.
async function launchHeaded() {
  const bravePath = findBrave();
  if (bravePath) {
    try {
      const b = await chromium.launch({ headless: false, executablePath: bravePath, slowMo: 50 });
      console.log(`Using your installed Brave (${bravePath}).`);
      return b;
    } catch {
      /* fall through to channels */
    }
  }
  for (const channel of ["chrome", "msedge"] as const) {
    try {
      const b = await chromium.launch({ headless: false, channel, slowMo: 50 });
      console.log(`Using your installed ${channel === "chrome" ? "Google Chrome" : "Microsoft Edge"}.`);
      return b;
    } catch {
      /* not installed — try the next one */
    }
  }
  console.log("Falling back to Playwright's bundled Chromium…");
  return chromium.launch({ headless: false, slowMo: 50 });
}

/**
 * Validate a saved session with a plain HTTP call — no browser needed. This
 * avoids the headless-shell Chromium build, which we never install.
 */
async function savedSessionUid(): Promise<number | null> {
  if (!fs.existsSync(SESSION_FILE)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8")) as {
      cookies?: { name: string; value: string; domain: string }[];
    };
    const host = new URL(BASE).host;
    const cookie = (raw.cookies ?? [])
      .filter((c) => host.endsWith(c.domain.replace(/^\./, "")))
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    if (!cookie) return null;
    const r = await fetch(BASE + "/web/session/get_session_info", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {} }),
      signal: AbortSignal.timeout(20_000),
    });
    const j = (await r.json().catch(() => null)) as { result?: { uid?: number } } | null;
    return typeof j?.result?.uid === "number" ? j.result.uid : null;
  } catch {
    return null;
  }
}

async function main() {
  const existingUid = await savedSessionUid();
  if (existingUid) {
    console.log(`Session already valid (uid=${existingUid}). Nothing to do — hit "Sync" in the app.`);
    return;
  }
  if (fs.existsSync(SESSION_FILE)) {
    console.log("Saved session expired — opening a browser so you can log in again.\n");
  }

  const browser = await launchHeaded();
  const context = await browser.newContext({ userAgent: UA });
  const page = await context.newPage();

  await page.goto(BASE + "/web/login", { waitUntil: "domcontentloaded", timeout: 90_000 });
  console.log("──────────────────────────────────────────────────────────");
  console.log(" A browser window has opened on the UET LMS login page.");
  console.log(" 1. Enter your username + password.");
  console.log(" 2. Solve the 'I'm not a robot' captcha.");
  console.log(" 3. Click Log in and wait for your dashboard.");
  console.log(" This script detects login automatically, then saves it.");
  console.log("──────────────────────────────────────────────────────────\n");
  console.log("Waiting for you to log in (up to 5 minutes)…");

  const uid = await waitForLogin(page, 5 * 60_000);
  if (!uid) {
    console.log("\nDidn't detect a login within 5 minutes. Re-run `npm run lms:connect` and try again.");
    await browser.close();
    return;
  }
  console.log(`\n✓ Logged in (uid=${uid}). Saving session…`);
  await context.storageState({ path: SESSION_FILE });
  console.log(`Session saved to ${SESSION_FILE} (gitignored).`);

  await crawl(context, page);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
