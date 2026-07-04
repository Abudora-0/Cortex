# Cortex

One place for a UET student's semester: LMS marks & announcements, GPA/CGPA with
a what-if lab, your uni Google Drive folder, notes, and a weekly schedule.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 (SQLite in dev)
· Auth.js v5 (Google + dev login) · Playwright sync worker · Tiptap notes ·
googleapis (Drive, read-only)

## Getting started

```bash
npm install
npx prisma migrate dev --name init   # creates prisma/dev.db
npm run dev                          # http://localhost:3001
```

`.env` ships with dev-safe defaults: SQLite database and a passwordless
**dev login** (any email) so you can use the whole app without configuring
Google. Replace `AUTH_SECRET` and `CREDENTIALS_KEY` before deploying.

### Google sign-in + Drive (optional, needed for the Drive page)

1. Create an OAuth client at Google Cloud Console → APIs & Services → Credentials
   (type: Web app, redirect URI `http://localhost:3001/api/auth/callback/google`).
2. Enable the **Google Drive API** for the project.
3. Set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` in `.env`.
4. While the OAuth app is in *Testing* mode, add your classmates as test users
   (up to 100) - no Google verification needed.

### LMS sync (optional)

Students connect their LMS account under **Settings**; passwords are encrypted
with AES-256-GCM (`CREDENTIALS_KEY`) and only decrypted by the worker.

```bash
npx playwright install chromium   # once
npm run worker                    # polls sync jobs
```

The UET LMS runs on **Odoo** behind Cloudflare. The login selectors in
`worker/lms-scraper.ts` are verified against the live `/web/login` page; the
authenticated pages (courses/grades/announcements) still need to be mapped on
first real login - run `npx tsx worker/recon.ts` while logged in, or inspect
manually, and update the `SELECTORS` map. Sync failures surface on the
Settings page with the exact page that broke. Note: one hidden reCAPTCHA
input exists on the login form; if Odoo enforces it, sync will need a manual
first login to establish a session (revisit then).

### Tests

```bash
npm test        # GPA engine unit tests (Vitest)
```

## Grading scheme

The default is the **official UET Lahore table** from the UG Semester
Regulations 2016 (§10c): A+/A 4.0 · A− 3.7 · B+ 3.3 · B 3.0 · B− 2.7 ·
C+ 2.3 · C 2.0 · C− 1.7 · D+ 1.3 · D 1.0 · F 0, with credit-hour-weighted
GPA/CGPA (§11.1). UET awards letters on a *relative* scale (instructors set
thresholds per subject), so the default percent cutoffs are editable - adjust
them per course (Course page → Grading scheme) or globally (Settings). A
linear interpolated mode is also available for departments that use one.

## Moving to Postgres (deployment)

Dev uses SQLite for zero-config. For Neon/Postgres:

1. `prisma/schema.prisma` → `provider = "postgresql"`
2. `src/lib/db.ts` and `worker/index.ts` → swap `PrismaBetterSQLite3` for
   `PrismaPg` (`@prisma/adapter-pg`), set `DATABASE_URL`
3. `npx prisma migrate dev` against the new database

The web app deploys to Vercel; the worker needs a long-lived Node host
(Railway, VPS) because it runs Playwright.
