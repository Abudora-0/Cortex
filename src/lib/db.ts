import { createRequire } from "module";
import path from "path";
import { PrismaClient } from "@/generated/prisma/client";

// The DB layer auto-selects its driver from DATABASE_URL:
//   • postgres:// or postgresql://  → Neon/Postgres (production, e.g. Vercel)
//   • anything else / file:         → local SQLite (zero-config dev)
// The Prisma schema `provider` is swapped to match at build time by
// scripts/prepare-db.mjs (see DEPLOY.md). Locally nothing needs configuring.
// A conditional require (not a static import) keeps the unused driver - and
// better-sqlite3's native binding - out of the production bundle.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const require = createRequire(import.meta.url);

const DATABASE_URL = process.env.DATABASE_URL || "file:./prisma/dev.db";
const isPostgres = /^postgres(ql)?:\/\//i.test(DATABASE_URL);

function resolveSqliteUrl() {
  // Anchor the relative path to the project root so the Next.js server and the
  // worker (different CWDs) hit the same database file.
  const filePath = DATABASE_URL.replace(/^file:/, "");
  if (path.isAbsolute(filePath)) return DATABASE_URL;
  return "file:" + path.join(process.cwd(), filePath);
}

function createPrismaClient(): PrismaClient {
  if (isPostgres) {
    const { PrismaPg } = require("@prisma/adapter-pg");
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
  }
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: resolveSqliteUrl() }) });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
