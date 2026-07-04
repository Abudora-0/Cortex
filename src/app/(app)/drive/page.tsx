import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Folder,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  FileAudio,
  FileCode,
} from "lucide-react";
import { auth, googleAuthEnabled } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDriveStatus, listFolder, type DriveItem } from "@/lib/drive";
import { saveDriveRootFolder } from "@/lib/actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConnectDriveButton } from "@/components/connect-drive-button";
import { formatDate } from "@/lib/utils";

function prettySize(bytes: string | null) {
  if (!bytes) return "";
  const n = parseInt(bytes, 10);
  if (isNaN(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// icon + accent hue per file kind (hue used for a soft, dark-mode-safe tile)
function fileKind(item: DriveItem): { Icon: typeof File; hue: number; label: string } {
  if (item.isFolder) return { Icon: Folder, hue: 38, label: "Folder" };
  const m = item.mimeType;
  const ext = item.name.split(".").pop()?.toLowerCase() ?? "";
  const is = (...xs: string[]) => xs.some((x) => m.includes(x) || ext === x);

  if (is("pdf")) return { Icon: FileText, hue: 4, label: "PDF" };
  if (is("spreadsheet", "excel", "xlsx", "xls", "csv")) return { Icon: FileSpreadsheet, hue: 150, label: "Sheet" };
  if (is("presentation", "powerpoint", "pptx", "ppt")) return { Icon: FileText, hue: 26, label: "Slides" };
  if (is("document", "word", "docx", "doc", "rtf")) return { Icon: FileText, hue: 214, label: "Doc" };
  if (is("image", "png", "jpg", "jpeg", "gif", "svg", "webp")) return { Icon: FileImage, hue: 276, label: "Image" };
  if (is("video", "mp4", "mov", "mkv", "avi", "webm")) return { Icon: FileVideo, hue: 330, label: "Video" };
  if (is("audio", "mp3", "wav", "m4a", "flac")) return { Icon: FileAudio, hue: 190, label: "Audio" };
  if (is("zip", "rar", "7z", "tar", "gzip")) return { Icon: FileArchive, hue: 45, label: "Archive" };
  if (is("javascript", "json", "html", "code", "py", "java", "cpp", "c", "ts", "tsx")) return { Icon: FileCode, hue: 260, label: "Code" };
  return { Icon: File, hue: 220, label: "File" };
}

export const metadata = { title: "Drive" };

export default async function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [user, status] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getDriveStatus(userId),
  ]);

  const rootId = user?.driveRootFolderId ?? null;
  const currentFolder = folder ?? rootId;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="eyebrow">Your university files</p>
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
          Drive
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Browse your uni folder without leaving Cortex - read-only, straight from Google Drive.
        </p>
      </header>

      {!googleAuthEnabled ? (
        <EmptyState
          title="Google isn't configured"
          hint="Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to .env (with the Drive API enabled in Google Cloud Console) to use Drive browsing."
        />
      ) : !status.hasScope ? (
        <EmptyState
          title="Connect your Google Drive"
          hint="Grant read-only access to see your uni files here. You can revoke it anytime from your Google account."
          action={<ConnectDriveButton />}
        />
      ) : !currentFolder ? (
        <Card>
          <CardHeader
            title="Pick your uni folder"
            hint="paste the folder's Drive link or its id - everything inside becomes browsable"
          />
          <CardBody>
            <form action={saveDriveRootFolder} className="flex flex-wrap items-end gap-3">
              <Field label="Folder link or ID" className="min-w-64 flex-1">
                <Input
                  name="folder"
                  required
                  placeholder="https://drive.google.com/drive/folders/…"
                />
              </Field>
              <Button type="submit">Save</Button>
            </form>
          </CardBody>
        </Card>
      ) : (
        <DriveBrowser userId={userId} folderId={currentFolder} rootId={rootId} />
      )}
    </div>
  );
}

async function DriveBrowser({
  userId,
  folderId,
  rootId,
}: {
  userId: string;
  folderId: string;
  rootId: string | null;
}) {
  const result = await listFolder(userId, folderId);

  if ("error" in result) {
    return (
      <EmptyState
        title="Couldn't load this folder"
        hint={
          result.error === "not_connected"
            ? "Drive access is missing - reconnect below."
            : `Drive said: ${result.error}`
        }
        action={<ConnectDriveButton label="Reconnect Drive" />}
      />
    );
  }

  const folders = result.items.filter((i) => i.isFolder);
  const files = result.items.filter((i) => !i.isFolder);
  const totalBytes = files.reduce((s, f) => s + (parseInt(f.size ?? "0", 10) || 0), 0);
  const atRoot = folderId === rootId;

  const stats = [
    { label: "Folders", value: String(folders.length) },
    { label: "Files", value: String(files.length) },
    { label: "Size", value: totalBytes > 0 ? prettySize(String(totalBytes)) : "-" },
  ];

  return (
    <div>
      {/* Breadcrumb + summary */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link
            href="/drive"
            className={
              atRoot
                ? "font-semibold text-ink"
                : "font-medium text-ink-faint transition-colors hover:text-garnet-600"
            }
          >
            Root
          </Link>
          {!atRoot ? (
            <>
              <ChevronRight size={14} className="text-ink-faint" />
              <span className="max-w-[16rem] truncate font-semibold text-ink">
                {result.folderName ?? "Folder"}
              </span>
            </>
          ) : null}
        </nav>
        <div className="flex items-center gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-right">
              <span className="stat-figure text-sm font-bold text-ink">{s.value}</span>
              <span className="ml-1 text-[11px] uppercase tracking-wide text-ink-faint">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {!atRoot && rootId ? (
          <Link
            href="/drive"
            className="flex items-center gap-2 border-b border-line bg-canvas/50 px-5 py-2.5 text-xs font-semibold text-garnet-600 transition-colors hover:bg-canvas"
          >
            <ArrowLeft size={13} /> Back to root
          </Link>
        ) : null}

        {result.items.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-ink-faint">
            This folder is empty.
          </p>
        ) : (
          <ul>
            {[...folders, ...files].map((item) => {
              const { Icon, hue, label } = fileKind(item);
              const inner = (
                <>
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: `hsl(${hue} 62% 52% / 0.14)`, color: `hsl(${hue} 55% 46%)` }}
                  >
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink group-hover:text-garnet-600">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-ink-faint">
                      {[
                        label,
                        item.modifiedTime ? formatDate(item.modifiedTime) : null,
                        prettySize(item.size),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </>
              );

              return (
                <li
                  key={item.id}
                  className="group flex items-center gap-3 border-b border-line/70 px-5 py-2.5 last:border-0 hover:bg-canvas/60"
                >
                  {item.isFolder ? (
                    <Link href={`/drive?folder=${item.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      {inner}
                      <ChevronRight size={16} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ) : (
                    <a
                      href={item.webViewLink ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      {inner}
                      <ExternalLink size={15} className="shrink-0 text-ink-faint transition-colors group-hover:text-garnet-600" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {atRoot ? (
        <p className="mt-3 text-right text-[11px] text-ink-faint">
          <Link href="/settings" className="hover:text-garnet-600">
            Change root folder
          </Link>
        </p>
      ) : null}
    </div>
  );
}
