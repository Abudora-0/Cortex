import { config } from "dotenv";
// The Prisma CLI runs outside Next.js, so it doesn't auto-load .env.local.
// Load it explicitly (takes precedence), then fall back to .env.
config({ path: ".env.local" });
config();
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Schema pushes/migrations need a direct (non-pooled) connection on Neon;
    // fall back to DATABASE_URL for SQLite / non-pooled setups.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"] || "file:./prisma/dev.db",
  },
});
