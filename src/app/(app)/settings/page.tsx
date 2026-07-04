import { Info, GraduationCap, HardDrive, Palette, SlidersHorizontal } from "lucide-react";
import { requireUser, googleAuthEnabled } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserDefaultScheme } from "@/lib/queries";
import { getDriveStatus } from "@/lib/drive";
import { saveDriveRootFolder, getLmsStatus } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/input";
import { SchemeEditor } from "@/components/scheme-editor";
import { ConnectDriveButton } from "@/components/connect-drive-button";
import { LmsSync } from "@/components/lms-sync";
import { BookmarkletCard } from "@/components/bookmarklet-card";
import { ThemePicker, ModeToggle } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

type ConnState = "on" | "warn" | "off";

function StatusPill({ label, state, text }: { label: string; state: ConnState; text: string }) {
  const dot =
    state === "on" ? "bg-pass" : state === "warn" ? "bg-warn" : "bg-line-strong";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">{label}</p>
        <p className="text-xs font-medium text-ink">{text}</p>
      </div>
    </div>
  );
}

function IconTitle({ icon: Icon, children }: { icon: typeof Info; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-6 place-items-center rounded-md bg-garnet-50 text-garnet-600">
        <Icon size={14} />
      </span>
      {children}
    </span>
  );
}

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { id: userId } = await requireUser();

  const [defaultScheme, user, drive, lmsStatus] = await Promise.all([
    getUserDefaultScheme(userId),
    prisma.user.findUnique({ where: { id: userId } }),
    getDriveStatus(userId),
    getLmsStatus(),
  ]);

  const name = user?.name ?? user?.email ?? "Student";
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const lmsState: ConnState = lmsStatus === "valid" ? "on" : lmsStatus === "expired" ? "warn" : "off";
  const lmsText = lmsStatus === "valid" ? "Connected" : lmsStatus === "expired" ? "Expired" : "Not linked";
  const driveState: ConnState = drive.hasScope ? "on" : "off";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="mb-2">
        <p className="eyebrow">Connections &amp; defaults</p>
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Manage how Cortex connects to your UET accounts and how it looks.
        </p>
      </header>

      {/* Account + connection overview */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brass-500 font-display text-sm font-bold text-[#1c1917]">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              {user?.email ? (
                <p className="truncate text-xs text-ink-faint">{user.email}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-6 sm:ml-auto">
            <StatusPill label="LMS" state={lmsState} text={lmsText} />
            <StatusPill label="Drive" state={driveState} text={drive.hasScope ? "Connected" : "Not linked"} />
          </div>
        </CardBody>
      </Card>

      {/* ----- UET LMS ----- */}
      <Card>
        <CardHeader
          title={<IconTitle icon={GraduationCap}>UET LMS</IconTitle>}
          hint="official results from the OBE portal"
          action={
            lmsStatus === "valid" ? (
              <Chip tone="pass">connected</Chip>
            ) : lmsStatus === "expired" ? (
              <Chip tone="warn">session expired</Chip>
            ) : (
              <Chip>not connected</Chip>
            )
          }
        />
        <CardBody className="space-y-5">
          <div className="flex items-start gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2.5">
            <Info size={15} className="mt-0.5 shrink-0 text-ink-faint" />
            <p className="text-xs leading-relaxed text-ink-soft">
              The LMS login has a reCAPTCHA, so it can&apos;t be automated. Use the
              bookmarklet - it runs in your own browser (where you&apos;re logged in) and
              sends your results here. UET grades relatively, so grades are stored exactly
              as awarded.
            </p>
          </div>

          <BookmarkletCard />

          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-ink-faint hover:text-ink">
              Running the app locally? Session sync ↓
            </summary>
            <div className="mt-3 space-y-2 border-t border-line pt-3">
              <p className="text-xs leading-relaxed text-ink-soft">
                On your own machine you can also run{" "}
                <code className="rounded bg-canvas px-1">npm run lms:connect</code> once,
                then sync from the saved session:
              </p>
              <LmsSync status={lmsStatus} />
            </div>
          </details>
        </CardBody>
      </Card>

      {/* ----- Google Drive ----- */}
      <Card>
        <CardHeader
          title={<IconTitle icon={HardDrive}>Google Drive</IconTitle>}
          hint="read-only access to your uni folder"
          action={
            drive.hasScope ? <Chip tone="pass">connected</Chip> : <Chip>not connected</Chip>
          }
        />
        <CardBody className="space-y-4">
          {!googleAuthEnabled ? (
            <p className="text-xs text-ink-faint">
              Configure AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in .env to enable Google
              sign-in and Drive.
            </p>
          ) : !drive.hasScope ? (
            <ConnectDriveButton />
          ) : (
            <form action={saveDriveRootFolder} className="flex flex-wrap items-end gap-3">
              <Field label="Uni folder link or ID" className="min-w-64 flex-1">
                <Input
                  name="folder"
                  defaultValue={user?.driveRootFolderId ?? ""}
                  placeholder="https://drive.google.com/drive/folders/…"
                />
              </Field>
              <Button type="submit" variant="secondary">
                Save folder
              </Button>
            </form>
          )}
        </CardBody>
      </Card>

      {/* ----- Appearance ----- */}
      <Card>
        <CardHeader
          title={<IconTitle icon={Palette}>Appearance</IconTitle>}
          hint="accent theme and colour mode for the whole app"
          action={<ModeToggle />}
        />
        <CardBody>
          <ThemePicker />
        </CardBody>
      </Card>

      {/* ----- Default grading scheme ----- */}
      <Card>
        <CardHeader
          title={<IconTitle icon={SlidersHorizontal}>Default grading scheme</IconTitle>}
          hint="applies to every course without its own scheme"
        />
        <CardBody>
          <SchemeEditor courseId={null} initial={defaultScheme} />
        </CardBody>
      </Card>
    </div>
  );
}
