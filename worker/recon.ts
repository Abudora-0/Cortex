import { chromium } from "playwright";

// Read-only recon: load the public UET LMS login page and report its form
// structure so worker/lms-scraper.ts selectors can be mapped accurately.
const BASE = process.env.LMS_BASE_URL || "https://lms.uet.edu.pk";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // The LMS sits behind Cloudflare and is slow; use a plain browser UA.
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const candidates = ["/login/index.php", "/login", "/"];
  for (const path of candidates) {
    try {
      const res = await page.goto(BASE + path, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      console.log(`\n=== ${BASE + path} → HTTP ${res?.status()} (final: ${page.url()})`);
      if (!res || res.status() >= 400) continue;

      const title = await page.title();
      console.log("title:", title);

      const generator = await page
        .locator('meta[name="generator"]')
        .first()
        .getAttribute("content")
        .catch(() => null);
      console.log("generator meta:", generator);

      const inputs = await page.$$eval("form input", (els) =>
        els.map((e) => ({
          type: e.getAttribute("type"),
          name: e.getAttribute("name"),
          id: e.id || null,
        }))
      );
      console.log("form inputs:", JSON.stringify(inputs, null, 1));

      const buttons = await page.$$eval(
        "form button, form input[type=submit]",
        (els) =>
          els.map((e) => ({
            tag: e.tagName,
            id: e.id || null,
            text: (e.textContent || (e as HTMLInputElement).value || "").trim().slice(0, 40),
          }))
      );
      console.log("submit buttons:", JSON.stringify(buttons, null, 1));

      const forms = await page.$$eval("form", (els) =>
        els.map((f) => ({ action: f.getAttribute("action"), id: f.id || null }))
      );
      console.log("forms:", JSON.stringify(forms, null, 1));
      break;
    } catch (e) {
      console.log(`${path}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  await browser.close();
}

main();
