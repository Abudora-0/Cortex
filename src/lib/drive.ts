import { google } from "googleapis";
import { prisma } from "@/lib/db";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  modifiedTime: string | null;
  size: string | null;
  isFolder: boolean;
}

export async function getDriveStatus(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  const connected = !!account?.refresh_token || !!account?.access_token;
  const hasScope = !!account?.scope?.includes(DRIVE_SCOPE);
  return { account, connected, hasScope };
}

async function getDriveClient(userId: string) {
  const { account, hasScope } = await getDriveStatus(userId);
  if (!account || !hasScope) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  oauth2.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });
  // Persist refreshed access tokens so we don't re-refresh on every request.
  oauth2.on("tokens", async (tokens) => {
    try {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token ?? account.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : account.expires_at,
        },
      });
    } catch {
      /* non-fatal */
    }
  });

  return google.drive({ version: "v3", auth: oauth2 });
}

export async function listFolder(
  userId: string,
  folderId: string
): Promise<{ items: DriveItem[]; folderName: string | null } | { error: string }> {
  const drive = await getDriveClient(userId);
  if (!drive) return { error: "not_connected" };

  try {
    const [list, meta] = await Promise.all([
      drive.files.list({
        q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
        fields: "files(id, name, mimeType, webViewLink, modifiedTime, size)",
        orderBy: "folder,name",
        pageSize: 200,
      }),
      drive.files
        .get({ fileId: folderId, fields: "name" })
        .catch(() => null),
    ]);
    const items: DriveItem[] = (list.data.files ?? []).map((f) => ({
      id: f.id!,
      name: f.name ?? "Untitled",
      mimeType: f.mimeType ?? "",
      webViewLink: f.webViewLink ?? null,
      modifiedTime: f.modifiedTime ?? null,
      size: f.size ?? null,
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
    }));
    return { items, folderName: meta?.data.name ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Drive request failed";
    return { error: msg };
  }
}
