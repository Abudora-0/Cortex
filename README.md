<div align="center">

# Cortex

**Your whole UET semester, in one place.**

Marks & CGPA, a GPA what-if lab, your class timetable, assignments, attendance,
faculty contacts, notes and Google Drive — one calm, fast workspace for
University of Engineering & Technology (Lahore) students.

[![Live](https://img.shields.io/badge/live-cortex--two--omega.vercel.app-9B2242?style=flat-square)](https://cortex-two-omega.vercel.app)
&nbsp;
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Auth.js](https://img.shields.io/badge/Auth.js_v5-000000?style=flat-square)

</div>

---

## What it does

- **📊 Live GPA & CGPA** — pulls your official OBE results, totalled the way UET grades (relatively), with per-semester GPA and a degree-progress ring.
- **🧪 GPA Lab** — drag ungraded courses to test marks, or add hypothetical future courses to project your CGPA forward.
- **🧮 Calculator** — a standalone multi-semester GPA calculator that can *blend* new courses into your current record for a live "what would my CGPA become?", plus an "aim for a target CGPA" solver.
- **🗓️ Schedule** — a proportional week timetable with a live "now" marker.
- **📝 Assignments** — track what's due with a status board, overdue/ due-soon colouring, and a dashboard summary. Paste the Classroom/Eduko link for one-tap access.
- **📈 Attendance** — log Present/Absent per course; see your % against the 75% debar line and a "how many classes can I still skip?" calculator.
- **👩‍🏫 Faculty** — instructor directory (name, office, hours, email → one-tap `mailto:`), auto-populated per course from your grade book.
- **🗒️ Notes** — rich-text notes with live search, per-course filters and previews.
- **📁 Drive** — browse your university Google Drive folder inline, read-only.
- **🎨 6 accent themes + light/dark**, a collapsible sidebar, and full mobile responsiveness.

## How the LMS sync works

The UET LMS (an **Odoo** install behind Cloudflare) blocks automated login with a reCAPTCHA — but the data behind a logged-in session is just JSON-RPC. Cortex never sees or stores your password:

- A **bookmarklet** (Settings page) runs in *your own* browser where you're already logged in, reads your results, instructors and course outlines straight from Odoo, and POSTs them to your account with a per-user token.
- Locally you can instead run `npm run lms:connect` once to save a session, then sync from it.

Grades sync verbatim (UET grading is relative, so 56% can be an A), and each course auto-fills its **real instructor** and **week-by-week outline** from the grade book.

## Tech stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Actions, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 (custom design system, CSS-variable theming) |
| **Data** | Prisma 7 with driver adapters — **SQLite** in dev, **Postgres/Neon** in prod (auto-switched by `DATABASE_URL`) |
| **Auth** | Auth.js v5 — Google OAuth (Drive via incremental consent) |
| **Editor** | TipTap · **LMS** Odoo JSON-RPC · **Drive** googleapis |
| **Hosting** | Vercel + Neon |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3001
```

`.env` ships with dev-safe defaults: a local **SQLite** database and a passwordless dev login (development only) so you can explore the whole app with zero configuration. The schema is applied automatically on first run.

```bash
npm test           # GPA-engine unit tests (Vitest)
```

**Google sign-in + Drive (optional):** create an OAuth client (Web app, redirect `http://localhost:3001/api/auth/callback/google` and `.../callback/google-drive`), enable the Drive API, and set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`. Base login only needs email/profile; Drive is requested separately when you click *Connect Drive*.

## Deploy your own

Cortex is built to run on **Vercel + Neon Postgres**:

1. Create a Neon database; set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct).
2. Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `LMS_BASE_URL`.
3. The Vercel build (`scripts/prepare-db.mjs`) flips the Prisma provider SQLite → Postgres by URL scheme and runs `prisma db push`, so the schema provisions itself.
4. In Google Cloud Console, add your production callback URIs and publish the consent screen — base login uses only non-sensitive scopes, so no verification is required.

## Grading scheme

Defaults to the **official UET Lahore letter table** (UG Semester Regulations): A+/A 4.0 · A− 3.7 · B+ 3.3 · B 3.0 · B− 2.7 · C+ 2.3 · C 2.0 · C− 1.7 · D+ 1.3 · D 1.0 · F 0, credit-hour-weighted. Because UET grades relatively, percent cutoffs are editable per course or globally, and a linear interpolated mode is available too.

---

<div align="center">
Built by a UET student, for UET students.
</div>
