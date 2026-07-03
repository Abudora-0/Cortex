import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyLmsSnapshot, lmsSnapshotSchema } from "@/lib/lms/sync";

// The bookmarklet runs on lms.uet.edu.pk and POSTs cross-origin, so allow it.
// Auth is by the per-user token in the body (no cookies), so "*" is safe here.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const bodySchema = z.object({
  token: z.string().min(20).max(200),
  snapshot: lmsSnapshotSchema,
});

const MAX_BYTES = 256 * 1024; // 256 KB — a snapshot is a few KB

// Best-effort in-memory rate limit (per serverless instance). Enough to blunt
// abuse on a small deployment; a hosted store isn't warranted here.
const hits = new Map<string, number[]>();
function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // crude memory guard
  return recent.length > max;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  // Cap payload size before reading the body.
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413, headers: CORS });
  }

  // Per-IP limit (blunt brute-force / hammering) before doing any work.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(`ip:${ip}`, 40, 5 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429, headers: CORS });
  }

  let json: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413, headers: CORS });
    }
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: CORS });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Bad request shape" },
      { status: 400, headers: CORS }
    );
  }

  const { token, snapshot } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { syncToken: token },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Invalid sync token — copy a fresh bookmarklet from Settings." },
      { status: 401, headers: CORS }
    );
  }

  // Per-token limit — syncing more than a few times a minute is pointless.
  if (rateLimited(`tok:${token}`, 10, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "You're syncing too fast — wait a minute and try again." },
      { status: 429, headers: CORS }
    );
  }

  try {
    const summary = await applyLmsSnapshot(user.id, snapshot);
    return NextResponse.json(
      { ok: true, message: `Synced ${summary.courses} courses across ${summary.semesters} semesters.` },
      { status: 200, headers: CORS }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500, headers: CORS });
  }
}
