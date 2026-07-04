"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { schemeSchema } from "@/lib/gpa";
import { syncLmsForUser } from "@/lib/lms/sync";
import { hasSession } from "@/lib/lms/obe-client";

// ---------------------------------------------------------------------------
// Semesters
// ---------------------------------------------------------------------------

export async function createSemester(formData: FormData) {
  const userId = await requireUserId();
  const name = z.string().min(1).max(60).parse(formData.get("name"));
  const last = await prisma.semester.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
  });
  await prisma.semester.create({
    data: { userId, name, order: (last?.order ?? 0) + 1 },
  });
  revalidatePath("/semesters");
  revalidatePath("/");
}

export async function deleteSemester(id: string) {
  const userId = await requireUserId();
  await prisma.semester.deleteMany({ where: { id, userId } });
  revalidatePath("/semesters");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

const courseSchema = z.object({
  title: z.string().min(1).max(120),
  code: z.string().max(20).optional(),
  creditHours: z.coerce.number().min(0).max(12),
});

async function assertSemesterOwned(semesterId: string, userId: string) {
  const sem = await prisma.semester.findFirst({ where: { id: semesterId, userId } });
  if (!sem) throw new Error("Semester not found");
}

export async function createCourse(semesterId: string, formData: FormData) {
  const userId = await requireUserId();
  await assertSemesterOwned(semesterId, userId);
  const data = courseSchema.parse({
    title: formData.get("title"),
    code: formData.get("code") || undefined,
    creditHours: formData.get("creditHours"),
  });
  await prisma.course.create({ data: { semesterId, ...data } });
  revalidatePath("/semesters");
  revalidatePath("/");
}

export async function updateCourse(courseId: string, formData: FormData) {
  const userId = await requireUserId();
  const data = courseSchema.parse({
    title: formData.get("title"),
    code: formData.get("code") || undefined,
    creditHours: formData.get("creditHours"),
  });
  await prisma.course.updateMany({
    where: { id: courseId, semester: { userId } },
    data,
  });
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/semesters");
}

export async function deleteCourse(courseId: string) {
  const userId = await requireUserId();
  await prisma.course.deleteMany({
    where: { id: courseId, semester: { userId } },
  });
  revalidatePath("/semesters");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

const assessmentSchema = z.object({
  title: z.string().min(1).max(120),
  type: z.enum(["QUIZ", "ASSIGNMENT", "MID", "FINAL", "LAB", "PROJECT", "OTHER"]),
  obtained: z.coerce.number().min(0).optional(),
  total: z.coerce.number().positive(),
  weight: z.coerce.number().min(0).max(100).optional(),
});

function parseAssessment(formData: FormData) {
  return assessmentSchema.parse({
    title: formData.get("title"),
    type: formData.get("type") ?? "OTHER",
    obtained:
      formData.get("obtained") === "" || formData.get("obtained") == null
        ? undefined
        : formData.get("obtained"),
    total: formData.get("total"),
    weight:
      formData.get("weight") === "" || formData.get("weight") == null
        ? undefined
        : formData.get("weight"),
  });
}

async function assertCourseOwned(courseId: string, userId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, semester: { userId } },
  });
  if (!course) throw new Error("Course not found");
}

export async function createAssessment(courseId: string, formData: FormData) {
  const userId = await requireUserId();
  await assertCourseOwned(courseId, userId);
  const data = parseAssessment(formData);
  await prisma.assessment.create({
    data: {
      courseId,
      ...data,
      obtained: data.obtained ?? null,
      weight: data.weight ?? null,
    },
  });
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/");
}

export async function updateAssessment(id: string, formData: FormData) {
  const userId = await requireUserId();
  const existing = await prisma.assessment.findFirst({
    where: { id, course: { semester: { userId } } },
  });
  if (!existing) throw new Error("Assessment not found");
  const data = parseAssessment(formData);
  await prisma.assessment.update({
    where: { id },
    data: {
      ...data,
      obtained: data.obtained ?? null,
      weight: data.weight ?? null,
    },
  });
  revalidatePath(`/courses/${existing.courseId}`);
  revalidatePath("/");
}

export async function deleteAssessment(id: string) {
  const userId = await requireUserId();
  await prisma.assessment.deleteMany({
    where: { id, course: { semester: { userId } } },
  });
  revalidatePath("/semesters");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Course outline & grading policy
// ---------------------------------------------------------------------------

export async function saveCourseOutline(courseId: string, outline: string) {
  const userId = await requireUserId();
  await assertCourseOwned(courseId, userId);
  const clean = outline.slice(0, 6000).trim();
  await prisma.course.update({
    where: { id: courseId },
    data: { outline: clean || null },
  });
  revalidatePath(`/courses/${courseId}`);
}

const policySchema = z
  .array(z.object({ label: z.string().max(60), weight: z.coerce.number().min(0).max(100) }))
  .max(20);

export async function saveGradingPolicy(courseId: string, policyJson: string) {
  const userId = await requireUserId();
  await assertCourseOwned(courseId, userId);
  const rows = policySchema.parse(JSON.parse(policyJson)).filter((r) => r.label.trim() !== "");
  await prisma.course.update({
    where: { id: courseId },
    data: { gradingPolicy: rows.length ? JSON.stringify(rows) : null },
  });
  revalidatePath(`/courses/${courseId}`);
}

// ---------------------------------------------------------------------------
// Grade schemes
// ---------------------------------------------------------------------------

export async function saveGradeScheme(
  courseId: string | null,
  specJson: string
) {
  const userId = await requireUserId();
  const spec = schemeSchema.parse(JSON.parse(specJson));
  if (courseId) await assertCourseOwned(courseId, userId);

  const boundaries = JSON.stringify(spec);
  if (courseId) {
    await prisma.gradeScheme.upsert({
      where: { courseId },
      update: { boundaries },
      create: { userId, courseId, boundaries },
    });
    revalidatePath(`/courses/${courseId}`);
  } else {
    const existing = await prisma.gradeScheme.findFirst({
      where: { userId, courseId: null },
    });
    if (existing) {
      await prisma.gradeScheme.update({
        where: { id: existing.id },
        data: { boundaries },
      });
    } else {
      await prisma.gradeScheme.create({
        data: { userId, courseId: null, boundaries },
      });
    }
    revalidatePath("/settings");
  }
  revalidatePath("/");
  revalidatePath("/gpa");
}

// ---------------------------------------------------------------------------
// Tasks (to-do rail)
// ---------------------------------------------------------------------------

export async function createTask(formData: FormData) {
  const userId = await requireUserId();
  const title = z.string().min(1).max(200).parse(formData.get("title"));
  const dueRaw = formData.get("dueAt");
  const dueAt = dueRaw ? new Date(String(dueRaw)) : null;
  await prisma.task.create({
    data: { userId, title, dueAt: dueAt && !isNaN(+dueAt) ? dueAt : null },
  });
  revalidatePath("/");
  revalidatePath("/schedule");
}

export async function toggleTask(id: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) return;
  await prisma.task.update({ where: { id }, data: { done: !task.done } });
  revalidatePath("/");
  revalidatePath("/schedule");
}

export async function deleteTask(id: string) {
  const userId = await requireUserId();
  await prisma.task.deleteMany({ where: { id, userId } });
  revalidatePath("/");
  revalidatePath("/schedule");
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

const ASSIGNMENT_STATUSES = ["TODO", "SUBMITTED", "GRADED", "MISSED"] as const;

export async function createAssignment(formData: FormData) {
  const userId = await requireUserId();
  const title = z.string().min(1).max(200).parse(formData.get("title"));

  // Only attach a course the user actually owns.
  let courseId = String(formData.get("courseId") || "") || null;
  if (courseId) {
    const owned = await prisma.course.findFirst({
      where: { id: courseId, semester: { userId } },
      select: { id: true },
    });
    if (!owned) courseId = null;
  }

  const dueRaw = formData.get("dueAt");
  const dueAt = dueRaw ? new Date(String(dueRaw)) : null;

  let link: string | null = null;
  const linkRaw = String(formData.get("link") || "").trim();
  if (linkRaw) {
    const withScheme = /^https?:\/\//i.test(linkRaw) ? linkRaw : `https://${linkRaw}`;
    if (z.string().url().safeParse(withScheme).success) link = withScheme.slice(0, 500);
  }

  await prisma.assignment.create({
    data: {
      userId,
      title,
      courseId,
      dueAt: dueAt && !isNaN(+dueAt) ? dueAt : null,
      link,
    },
  });
  revalidatePath("/assignments");
  revalidatePath("/");
}

export async function setAssignmentStatus(id: string, status: string) {
  const userId = await requireUserId();
  if (!ASSIGNMENT_STATUSES.includes(status as (typeof ASSIGNMENT_STATUSES)[number])) return;
  await prisma.assignment.updateMany({ where: { id, userId }, data: { status } });
  revalidatePath("/assignments");
  revalidatePath("/");
}

export async function deleteAssignment(id: string) {
  const userId = await requireUserId();
  await prisma.assignment.deleteMany({ where: { id, userId } });
  revalidatePath("/assignments");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Schedule events
// ---------------------------------------------------------------------------

const eventSchema = z.object({
  title: z.string().min(1).max(120),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startMin: z.coerce.number().int().min(0).max(1439),
  endMin: z.coerce.number().int().min(1).max(1440),
  location: z.string().max(80).optional(),
});

export async function createEvent(formData: FormData) {
  const userId = await requireUserId();
  const [sh, sm] = String(formData.get("start") ?? "8:00").split(":").map(Number);
  const [eh, em] = String(formData.get("end") ?? "9:00").split(":").map(Number);
  const data = eventSchema.parse({
    title: formData.get("title"),
    dayOfWeek: formData.get("dayOfWeek"),
    startMin: sh * 60 + (sm || 0),
    endMin: eh * 60 + (em || 0),
    location: formData.get("location") || undefined,
  });
  if (data.endMin <= data.startMin) throw new Error("End must be after start");
  await prisma.scheduleEvent.create({ data: { userId, ...data } });
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function deleteEvent(id: string) {
  const userId = await requireUserId();
  await prisma.scheduleEvent.deleteMany({ where: { id, userId } });
  revalidatePath("/schedule");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function createNote(formData: FormData) {
  const userId = await requireUserId();
  const title = z.string().min(1).max(150).parse(formData.get("title"));
  const courseId = String(formData.get("courseId") || "") || null;
  if (courseId) await assertCourseOwned(courseId, userId);
  const note = await prisma.note.create({
    data: { userId, title, courseId },
  });
  revalidatePath("/notes");
  redirect(`/notes/${note.id}`);
}

export async function saveNote(id: string, title: string, bodyJson: string) {
  const userId = await requireUserId();
  // Validate it is well-formed JSON before storing.
  JSON.parse(bodyJson);
  await prisma.note.updateMany({
    where: { id, userId },
    data: { title: title.slice(0, 150) || "Untitled", body: bodyJson },
  });
  revalidatePath("/notes");
}

export async function deleteNote(id: string) {
  const userId = await requireUserId();
  await prisma.note.deleteMany({ where: { id, userId } });
  revalidatePath("/notes");
}

// ---------------------------------------------------------------------------
// LMS sync (session-based - see src/lib/lms/)
// ---------------------------------------------------------------------------

export interface LmsSyncResult {
  ok: boolean;
  message: string;
}

/**
 * Pull the student's real OBE results using the session saved by
 * `npm run lms:connect` and upsert them. Returns a message for the UI.
 */
export async function syncLmsResults(): Promise<LmsSyncResult> {
  const userId = await requireUserId();
  if (!hasSession()) {
    return { ok: false, message: "No LMS session yet. Run `npm run lms:connect` in your terminal, log in, then try again." };
  }
  try {
    const summary = await syncLmsForUser(userId);
    revalidatePath("/");
    revalidatePath("/semesters");
    revalidatePath("/gpa");
    revalidatePath("/settings");
    return {
      ok: true,
      message: `Synced ${summary.courses} courses across ${summary.semesters} semesters for ${summary.studentRoll}.`,
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Sync failed";
    if (raw === "SESSION_EXPIRED") {
      return { ok: false, message: "Your LMS session expired. Run `npm run lms:connect` again to refresh it." };
    }
    return { ok: false, message: raw };
  }
}

/**
 * Cheap session status for the Settings page - file presence only, no network
 * (validating against the LMS takes several seconds through Cloudflare). An
 * actually-expired session is reported by syncLmsResults() when you sync.
 */
export async function getLmsStatus(): Promise<"none" | "valid" | "expired"> {
  await requireUserId();
  return hasSession() ? "valid" : "none";
}

/**
 * Return the user's bookmarklet sync token, generating one on first use. This
 * token lets the browser bookmarklet POST LMS data to /api/lms/ingest.
 */
export async function ensureSyncToken(): Promise<string> {
  const userId = await requireUserId();
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { syncToken: true },
  });
  if (existing?.syncToken) return existing.syncToken;
  const token = randomToken();
  await prisma.user.update({ where: { id: userId }, data: { syncToken: token } });
  return token;
}

/** Invalidate the old token and issue a new one (e.g. if it leaked). */
export async function regenerateSyncToken(): Promise<string> {
  const userId = await requireUserId();
  const token = randomToken();
  await prisma.user.update({ where: { id: userId }, data: { syncToken: token } });
  revalidatePath("/settings");
  return token;
}

function randomToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
  );
}

// ---------------------------------------------------------------------------
// Drive settings
// ---------------------------------------------------------------------------

export async function saveDriveRootFolder(formData: FormData) {
  const userId = await requireUserId();
  const raw = String(formData.get("folder") ?? "").trim();
  // Accept a raw folder id or a full Drive folder URL.
  const match = raw.match(/folders\/([\w-]+)/);
  const folderId = match ? match[1] : raw || null;
  await prisma.user.update({
    where: { id: userId },
    data: { driveRootFolderId: folderId },
  });
  revalidatePath("/drive");
  revalidatePath("/settings");
}
