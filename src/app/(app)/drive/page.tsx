import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Folder } from "lucide-react";
import { auth, googleAuthEnabled } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDriveStatus, listFolder } from "@/lib/drive";
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
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

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
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Drive
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Browse your university folder without leaving UniHub. Read-only.
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
            hint="paste the folder's Drive link or its id — everything inside becomes browsable"
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
            ? "Drive access is missing — reconnect below."
            : `Drive said: ${result.error}`
        }
        action={<ConnectDriveButton label="Reconnect Drive" />}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title={result.folderName ?? "Folder"}
        hint={`${result.items.length} items`}
        action={
          folderId !== rootId && rootId ? (
            <Link
              href="/drive"
              className="inline-flex items-center gap-1 text-xs font-semibold text-garnet-600 hover:underline"
            >
              <ArrowLeft size={13} /> Root folder
            </Link>
          ) : (
            <Link
              href="/settings"
              className="text-xs font-semibold text-ink-faint hover:text-garnet-600"
            >
              change folder
            </Link>
          )
        }
      />
      <CardBody className="p-0">
        {result.items.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-ink-faint">
            This folder is empty.
          </p>
        ) : (
          <ul>
            {result.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-canvas/60"
              >
                {item.isFolder ? (
                  <Folder size={16} className="shrink-0 text-brass-500" />
                ) : (
                  <FileText size={16} className="shrink-0 text-ink-faint" />
                )}
                <div className="min-w-0 flex-1">
                  {item.isFolder ? (
                    <Link
                      href={`/drive?folder=${item.id}`}
                      className="block truncate text-sm font-medium text-ink hover:text-garnet-600"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <a
                      href={item.webViewLink ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm font-medium text-ink hover:text-garnet-600"
                    >
                      {item.name}
                    </a>
                  )}
                  <p className="text-[11px] text-ink-faint">
                    {[
                      item.modifiedTime ? formatDate(item.modifiedTime) : null,
                      prettySize(item.size),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {!item.isFolder && item.webViewLink ? (
                  <a
                    href={item.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${item.name} in Drive`}
                    className="text-ink-faint hover:text-garnet-600"
                  >
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
