// Sets the Prisma datasource `provider` to match DATABASE_URL before
// `prisma generate` runs. Postgres URL → "postgresql"; anything else → "sqlite".
// Run in the build pipeline (see vercel.json / DEPLOY.md). Idempotent + safe to
// run locally (a file: URL leaves the schema on sqlite).
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
const provider = /^postgres(ql)?:\/\//i.test(url) ? "postgresql" : "sqlite";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const original = fs.readFileSync(schemaPath, "utf8");
const updated = original.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"(sqlite|postgresql)"/s,
  `$1"${provider}"`
);

if (updated !== original) {
  fs.writeFileSync(schemaPath, updated);
  console.log(`[prepare-db] set datasource provider = "${provider}"`);
} else {
  console.log(`[prepare-db] datasource provider already "${provider}"`);
}
