# Deploying UniHub to Vercel

UniHub is a normal Next.js app, so hosting it on Vercel is straightforward. Two
things differ from local dev:

1. **Database:** local uses SQLite; production uses **Postgres (Neon)**. The app
   auto-detects this from `DATABASE_URL` — no code changes needed.
2. **LMS sync:** on a deployed site each user syncs their own marks with the
   **bookmarklet** (Settings → UET LMS). No passwords are ever stored.

Everything else — Google sign-in, Drive, GPA, calculator, notes, schedule,
themes — works on Vercel unchanged.

---

## 1. Create a Neon Postgres database (free)

1. Sign up at [neon.tech](https://neon.tech) and create a project (region near you).
2. From the dashboard copy **two** connection strings:
   - **Pooled** connection → this is your `DATABASE_URL`
   - **Direct** connection (unpooled) → this is your `DIRECT_URL`
   (Both are on the project's *Connection Details*; toggle "Pooled connection".)

## 2. Configure Google OAuth for the live URL

In [Google Cloud Console](https://console.cloud.google.com) → your project →
**Credentials** → your OAuth client:

- **Authorized redirect URIs** → add `https://<your-app>.vercel.app/api/auth/callback/google`
- Keep the OAuth consent screen in **Testing** mode and add each friend's Gmail
  under **Audience → Test users** (up to 100 — no Google verification needed).

## 3. Push to GitHub

```bash
git init && git add -A && git commit -m "UniHub"
gh repo create unihub --private --source=. --push   # or push to a repo you made
```

`.env`, `.env.local` and `.lms-session.json` are gitignored — secrets won't leak.

## 4. Import into Vercel + set environment variables

Import the repo at [vercel.com/new](https://vercel.com/new). It auto-detects
Next.js and uses the build command from `vercel.json` (which runs the Postgres
schema push). Add these **Environment Variables** (Production):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_URL` | Neon **direct** connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` (or `npx auth secret`) |
| `AUTH_GOOGLE_ID` | your Google OAuth client id |
| `AUTH_GOOGLE_SECRET` | your Google OAuth client secret |
| `LMS_BASE_URL` | `https://lms.uet.edu.pk` |

**Do not set `AUTH_DEV_LOGIN`** — the passwordless dev login must stay off in
production (it's auto-disabled unless that var is `true`).

## 5. Deploy

Click **Deploy**. The build runs `scripts/prepare-db.mjs` (flips the Prisma
provider to `postgresql`), pushes the schema to Neon, and builds. When it's
live, open the URL and sign in with Google.

## 6. Invite friends

Each friend just needs to be a **test user** on your Google OAuth app (step 2).
They sign in with Google, then sync their LMS marks via the bookmarklet.

---

## How LMS sync works for deployed users

Because the UET LMS login has a reCAPTCHA, sync can't run on the server. Instead,
each user installs a one-time **bookmarklet** (Settings → UET LMS → drag *UniHub
Sync* to the bookmarks bar). Then:

1. Open `lms.uet.edu.pk` and log in normally (solving the captcha themselves).
2. Click the **UniHub Sync** bookmark. It reads their results via the LMS's own
   API (using the session already in their browser) and posts them to UniHub with
   a personal token. A confirmation pop-up appears.

No LMS passwords are stored anywhere — the sync rides the user's existing login.

---

## Local development

Nothing changes locally: with no Postgres `DATABASE_URL`, the app uses SQLite
(`prisma/dev.db`) automatically. `npm run dev` still just works. To develop
against Postgres instead, put your Neon URLs in `.env.local` and re-run
`npm run dev` (the `predev` step re-points the schema).

## Security notes

- All data is scoped per `userId` — users only ever see their own records.
- Dev login is disabled in production.
- The bookmarklet token authenticates ingest; **Reset token** in Settings
  invalidates old copies if one leaks.
