import { chromium, type Page } from "playwright";

// ---------------------------------------------------------------------------
// UET LMS scraper.
//
// The UET LMS (lms.uet.edu.pk) runs on **Odoo** (meta generator "Odoo",
// title "UETLMS") behind Cloudflare. The LOGIN selectors below were verified
// against the live public /web/login page on 2026-07-02. The authenticated
// pages (courses / grades / announcements) could not be inspected without a
// student account — those selectors are still guesses in the OpenEduCat
// (Odoo education portal) style and MUST be verified on first real login.
// Every selector failure throws LmsLayoutError naming the page it broke on,
// so breakage is easy to diagnose from the Settings page.
// ---------------------------------------------------------------------------

const SELECTORS = {
  login: {
    // VERIFIED: Odoo login form at /web/login
    url: "/web/login",
    username: "#login",
    password: "#password",
    submit: "form.oe_login_form button[type=submit]",
    errorBanner: ".oe_login_form .alert-danger, p.alert-danger",
  },
  courseList: {
    url: "/my/courses",               // TODO: verify after first login (Odoo portal)
    courseCard: ".course-card, .o_portal_my_doc_table tr, .coursebox",
    courseLink: "a",
    courseTitle: ".coursename, .course-title, td a",
  },
  courseGrades: {
    gradesPath: "/my/grades?course=",  // TODO: verify after first login
    row: "table tbody tr",
    itemName: "td:nth-child(1)",
    obtained: "td:nth-child(2)",
    total: "td:nth-child(3)",
    weight: "td:nth-child(4)",
  },
  attendance: {
    // TODO: verify — many UET departments expose attendance as a summary block
    summary: ".attendance-summary",
    held: ".sessions-held",
    attended: ".sessions-attended",
  },
  announcements: {
    url: "/announcements",            // TODO: verify
    item: ".announcement, .forumpost",
    title: ".subject, .announcement-title",
    body: ".content, .announcement-body",
    date: "time, .announcement-date",
  },
} as const;

export class LmsLayoutError extends Error {
  constructor(page: string, detail: string) {
    super(`LMS layout changed or selector wrong on ${page}: ${detail}`);
    this.name = "LmsLayoutError";
  }
}

export class LmsAuthError extends Error {
  constructor() {
    super("LMS rejected the username/password. Re-enter your credentials in Settings.");
    this.name = "LmsAuthError";
  }
}

export interface ScrapedAssessment {
  title: string;
  type: string;
  obtained: number | null;
  total: number;
  weight: number | null;
}

export interface ScrapedCourse {
  lmsCourseId: string;
  title: string;
  code: string | null;
  assessments: ScrapedAssessment[];
  attendance: { held: number; attended: number } | null;
}

export interface ScrapedAnnouncement {
  lmsKey: string;
  title: string;
  body: string | null;
  postedAt: Date;
}

export interface ScrapeResult {
  courses: ScrapedCourse[];
  announcements: ScrapedAnnouncement[];
}

function classifyType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("quiz")) return "QUIZ";
  if (t.includes("assignment")) return "ASSIGNMENT";
  if (t.includes("mid")) return "MID";
  if (t.includes("final") || t.includes("terminal")) return "FINAL";
  if (t.includes("lab")) return "LAB";
  if (t.includes("project")) return "PROJECT";
  return "OTHER";
}

async function login(page: Page, baseUrl: string, username: string, password: string) {
  await page.goto(`${baseUrl}${SELECTORS.login.url}`, {
    waitUntil: "domcontentloaded",
    // Cloudflare + a slow origin: generous first-load budget.
    timeout: 60_000,
  });
  const user = page.locator(SELECTORS.login.username);
  if ((await user.count()) === 0) {
    throw new LmsLayoutError("login page", `no element matches ${SELECTORS.login.username}`);
  }
  await user.fill(username);
  await page.locator(SELECTORS.login.password).fill(password);
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.locator(SELECTORS.login.submit).first().click(),
  ]);
  if ((await page.locator(SELECTORS.login.errorBanner).count()) > 0) {
    throw new LmsAuthError();
  }
}

export async function scrapeLms(opts: {
  username: string;
  password: string;
  baseUrl?: string;
}): Promise<ScrapeResult> {
  const baseUrl = (opts.baseUrl ?? process.env.LMS_BASE_URL ?? "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("LMS_BASE_URL is not set");

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      // Cloudflare fronts the LMS; a plain browser UA avoids bot heuristics.
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    await login(page, baseUrl, opts.username, opts.password);

    // --- Course list ---
    await page.goto(`${baseUrl}${SELECTORS.courseList.url}`, {
      waitUntil: "domcontentloaded",
    });
    const cards = page.locator(SELECTORS.courseList.courseCard);
    const cardCount = await cards.count();
    if (cardCount === 0) {
      throw new LmsLayoutError(
        "course list",
        `no elements match ${SELECTORS.courseList.courseCard}`
      );
    }

    const courseRefs: { id: string; title: string; href: string }[] = [];
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const href = await card.locator(SELECTORS.courseList.courseLink).first().getAttribute("href");
      const title =
        (await card.locator(SELECTORS.courseList.courseTitle).first().textContent())?.trim() ??
        `Course ${i + 1}`;
      const idMatch = href?.match(/id=(\d+)/);
      if (href && idMatch) {
        courseRefs.push({ id: idMatch[1], title, href });
      }
    }

    // --- Per-course grades + attendance ---
    const courses: ScrapedCourse[] = [];
    for (const ref of courseRefs) {
      await page.goto(`${baseUrl}${SELECTORS.courseGrades.gradesPath}${ref.id}`, {
        waitUntil: "domcontentloaded",
      });
      const rows = page.locator(SELECTORS.courseGrades.row);
      const assessments: ScrapedAssessment[] = [];
      const rowCount = await rows.count();
      for (let r = 0; r < rowCount; r++) {
        const row = rows.nth(r);
        const name = (await row.locator(SELECTORS.courseGrades.itemName).first().textContent())?.trim();
        const obtainedText = (await row.locator(SELECTORS.courseGrades.obtained).first().textContent())?.trim();
        const rangeText = (await row.locator(SELECTORS.courseGrades.total).first().textContent())?.trim();
        if (!name || !rangeText) continue;
        // Moodle ranges look like "0–20"; take the upper bound as total.
        const total = parseFloat(rangeText.split(/[–-]/).pop() ?? "");
        if (!total || isNaN(total)) continue;
        const obtained = obtainedText && obtainedText !== "-" ? parseFloat(obtainedText) : null;
        assessments.push({
          title: name,
          type: classifyType(name),
          obtained: obtained != null && !isNaN(obtained) ? obtained : null,
          total,
          weight: null,
        });
      }

      // Attendance (optional block — skip silently if the page doesn't have it)
      let attendance: ScrapedCourse["attendance"] = null;
      const att = page.locator(SELECTORS.attendance.summary);
      if ((await att.count()) > 0) {
        const held = parseInt((await att.locator(SELECTORS.attendance.held).textContent()) ?? "", 10);
        const attended = parseInt((await att.locator(SELECTORS.attendance.attended).textContent()) ?? "", 10);
        if (!isNaN(held) && !isNaN(attended)) attendance = { held, attended };
      }

      const codeMatch = ref.title.match(/^([A-Z]{2,4}[- ]?\d{3}\w?)/);
      courses.push({
        lmsCourseId: ref.id,
        title: ref.title,
        code: codeMatch ? codeMatch[1] : null,
        assessments,
        attendance,
      });
    }

    // --- Announcements ---
    const announcements: ScrapedAnnouncement[] = [];
    await page.goto(`${baseUrl}${SELECTORS.announcements.url}`, {
      waitUntil: "domcontentloaded",
    });
    const items = page.locator(SELECTORS.announcements.item);
    const itemCount = Math.min(await items.count(), 20);
    for (let i = 0; i < itemCount; i++) {
      const item = items.nth(i);
      const title = (await item.locator(SELECTORS.announcements.title).first().textContent())?.trim();
      if (!title) continue;
      const body = (await item.locator(SELECTORS.announcements.body).first().textContent())?.trim() ?? null;
      const dateText = (await item.locator(SELECTORS.announcements.date).first().textContent())?.trim();
      const postedAt = dateText ? new Date(dateText) : new Date();
      announcements.push({
        lmsKey: `${title}-${dateText ?? i}`,
        title,
        body,
        postedAt: isNaN(+postedAt) ? new Date() : postedAt,
      });
    }

    return { courses, announcements };
  } finally {
    await browser.close();
  }
}
