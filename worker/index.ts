import { config } from "dotenv";
config({ path: ".env.local" });
config();

import crypto from "crypto";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { scrapeLms, LmsAuthError, LmsLayoutError } from "./lms-scraper";
import { applyScrapeResult } from "./sync";

// ---------------------------------------------------------------------------
// Cortex sync worker — polls the SyncJob table and runs the Playwright
// scraper for each queued job. Run alongside the web app:  npm run worker
// Playwright browsers must be installed once:  npx playwright install chromium
// ---------------------------------------------------------------------------

const POLL_MS = 15_000;

function resolveSqliteUrl() {
  const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const filePath = url.replace(/^file:/, "");
  if (path.isAbsolute(filePath)) return url;
  return "file:" + path.join(process.cwd(), filePath);
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: resolveSqliteUrl() }),
});

function decryptSecret(stored: string): string {
  const keyHex = process.env.CREDENTIALS_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("CREDENTIALS_KEY must be a 32-byte hex string");
  }
  const [ivHex, tagHex, dataHex] = stored.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(keyHex, "hex"),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

async function runJob(jobId: string, userId: string) {
  const credential = await prisma.lmsCredential.findUnique({ where: { userId } });
  if (!credential) throw new Error("No LMS credentials on file");

  const password = decryptSecret(credential.encryptedPassword);
  const result = await scrapeLms({
    username: credential.lmsUsername,
    password,
  });
  await applyScrapeResult(prisma, userId, result);

  await prisma.lmsCredential.update({
    where: { userId },
    data: { lastSyncAt: new Date(), syncStatus: "IDLE", syncError: null },
  });
  console.log(
    `[sync] user=${userId} ok — ${result.courses.length} courses, ${result.announcements.length} announcements`
  );
}

async function tick() {
  const job = await prisma.syncJob.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return;

  await prisma.syncJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    await runJob(job.id, job.userId);
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "DONE", finishedAt: new Date() },
    });
  } catch (e) {
    const message =
      e instanceof LmsAuthError || e instanceof LmsLayoutError
        ? e.message
        : e instanceof Error
          ? `Sync failed: ${e.message}`
          : "Sync failed";
    console.error(`[sync] user=${job.userId} FAILED — ${message}`);
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), error: message },
    });
    await prisma.lmsCredential
      .update({
        where: { userId: job.userId },
        data: { syncStatus: "ERROR", syncError: message },
      })
      .catch(() => {});
  }
}

async function main() {
  console.log(`[worker] Cortex sync worker started — polling every ${POLL_MS / 1000}s`);
  // Re-queue jobs that were mid-flight when the worker last stopped.
  await prisma.syncJob.updateMany({
    where: { status: "RUNNING" },
    data: { status: "PENDING" },
  });
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error("[worker] tick failed:", e);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
