import { redirect } from "next/navigation";
import {
  auth,
  signIn,
  googleAuthEnabled,
  devLoginAuthEnabled,
} from "@/lib/auth";
import { GraduationCap, FolderOpen, SlidersHorizontal, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo, LogoMark } from "@/components/logo";

const HIGHLIGHTS = [
  {
    icon: GraduationCap,
    title: "Live GPA & CGPA",
    body: "Your official OBE results, pulled in and totalled the way UET grades — relatively.",
  },
  {
    icon: SlidersHorizontal,
    title: "What-if planning",
    body: "Drag a grade and watch your CGPA move. Work out exactly what you need.",
  },
  {
    icon: FolderOpen,
    title: "Your Drive, inline",
    body: "Browse your university Google Drive folder without leaving the app.",
  },
  {
    icon: CalendarDays,
    title: "Notes & timetable",
    body: "Lecture notes, a weekly schedule and a to-do list, all in one place.",
  },
];

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative hidden overflow-hidden bg-sidebar px-12 py-14 text-sidebar-fg lg:flex lg:flex-col">
        {/* accent wash + oversized mark */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(40rem 30rem at 110% -10%, rgb(var(--accent-tint)/0.35), transparent 55%), radial-gradient(30rem 24rem at -10% 120%, rgb(var(--accent-tint)/0.22), transparent 55%)",
          }}
        />
        <LogoMark
          size={520}
          className="pointer-events-none absolute -bottom-28 -right-32 text-white/[0.04]"
        />

        <div className="relative z-10 flex h-full flex-col">
          <Logo className="text-sidebar-fg" />

          <div className="mt-auto">
            <h1 className="max-w-md font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight">
              Your whole UET semester, in one place.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-sidebar-fg/60">
              Marks, GPA, Drive files, notes and schedule — stitched together into one
              calm, fast workspace built for UET students.
            </p>

            <ul className="mt-10 grid max-w-lg gap-5 sm:grid-cols-2">
              {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-sidebar-fg">
                    <Icon size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-sidebar-fg/55">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 mt-12 text-xs text-sidebar-fg/40">
            Built by a UET student, for UET students.
          </p>
        </div>
      </aside>

      {/* ---------- Auth panel ---------- */}
      <main className="app-aura flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rise">
          {/* compact brand for mobile */}
          <div className="mb-8 lg:hidden">
            <span className="mb-4 grid size-12 place-items-center rounded-xl bg-garnet-600 text-white shadow-[0_10px_30px_-8px_rgb(var(--accent-tint)/0.6)]">
              <LogoMark size={26} />
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            Sign in to pick up your semester where you left off.
          </p>

          <div className="mt-8 space-y-5">
            {googleAuthEnabled ? (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="secondary" size="md" className="w-full gap-2.5">
                  <GoogleGlyph />
                  Continue with Google
                </Button>
              </form>
            ) : (
              <p className="rounded-lg border border-warn/25 bg-warn-soft px-3 py-2 text-xs text-warn">
                Google sign-in isn&apos;t configured — set AUTH_GOOGLE_ID and
                AUTH_GOOGLE_SECRET in .env to enable it.
              </p>
            )}

            {devLoginAuthEnabled ? (
              <>
                {googleAuthEnabled ? (
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
                    <span className="h-px flex-1 bg-line" />
                    or dev login
                    <span className="h-px flex-1 bg-line" />
                  </div>
                ) : null}
                <form
                  className="space-y-4"
                  action={async (formData: FormData) => {
                    "use server";
                    await signIn("devlogin", {
                      email: String(formData.get("email") ?? ""),
                      name: String(formData.get("name") ?? ""),
                      redirectTo: "/",
                    });
                  }}
                >
                  <Field label="Email" htmlFor="email">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="you@student.uet.edu.pk"
                    />
                  </Field>
                  <Field label="Name" htmlFor="name">
                    <Input id="name" name="name" placeholder="Your name" />
                  </Field>
                  <Button type="submit" className="w-full">
                    Enter Cortex
                  </Button>
                  <p className="text-center text-[11px] text-ink-faint">
                    Dev-only login — disabled in production builds.
                  </p>
                </form>
              </>
            ) : null}
          </div>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-ink-faint">
            By continuing you agree that Cortex reads your UET data only to show it back
            to you.
          </p>
        </div>
      </main>
    </div>
  );
}

/** Multi-colour Google "G" so the button reads as an official provider. */
function GoogleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
