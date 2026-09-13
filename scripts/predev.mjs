// Runs the one-time dev setup (install, prisma generate/push) only when
// something has actually changed, instead of unconditionally on every
// `npm run dev`. A full reinstall + regenerate on every launch is wasted
// disk/CPU work (and, on Windows with antivirus real-time scanning, can
// make the machine crawl) for something that's almost always already done.
import { existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const nodeModules = path.join(root, "node_modules");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const generatedClient = path.join(root, "src", "generated", "prisma", "index.js");
const markerPath = path.join(nodeModules, ".predev-synced");

function run(cmd) {
  console.log(`[predev] ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function mtime(p) {
  return existsSync(p) ? statSync(p).mtimeMs : 0;
}

if (!existsSync(nodeModules)) {
  run("npm install --no-audit --no-fund");
}

run("node scripts/prepare-db.mjs");

const schemaChanged =
  !existsSync(generatedClient) || mtime(schemaPath) > mtime(markerPath);

if (schemaChanged) {
  run("npx prisma generate");
  run("npx prisma db push");
  mkdirSync(nodeModules, { recursive: true });
  writeFileSync(markerPath, new Date().toISOString());
} else {
  console.log("[predev] schema unchanged, skipping generate/db push");
}
