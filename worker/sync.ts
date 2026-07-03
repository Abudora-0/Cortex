import type { PrismaClient } from "../src/generated/prisma/client";
import type { ScrapeResult } from "./lms-scraper";

/**
 * Upsert scraped LMS data for a user. LMS-sourced rows are keyed by
 * lmsCourseId / lmsKey so re-syncs update in place; manually created
 * courses and assessments (source = "MANUAL") are never touched.
 */
export async function applyScrapeResult(
  prisma: PrismaClient,
  userId: string,
  result: ScrapeResult
) {
  // LMS courses land in the user's latest semester; create one if none exists.
  let semester = await prisma.semester.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
  });
  if (!semester) {
    semester = await prisma.semester.create({
      data: { userId, name: "Current semester", order: 1 },
    });
  }

  for (const scraped of result.courses) {
    const existing = await prisma.course.findFirst({
      where: { semester: { userId }, lmsCourseId: scraped.lmsCourseId },
    });

    const course = existing
      ? await prisma.course.update({
          where: { id: existing.id },
          data: { title: scraped.title, code: scraped.code ?? existing.code },
        })
      : await prisma.course.create({
          data: {
            semesterId: semester.id,
            title: scraped.title,
            code: scraped.code,
            source: "LMS",
            lmsCourseId: scraped.lmsCourseId,
          },
        });

    // Replace LMS-sourced assessments wholesale (grades change server-side);
    // manual assessments on the same course survive.
    await prisma.assessment.deleteMany({
      where: { courseId: course.id, source: "LMS" },
    });
    if (scraped.assessments.length > 0) {
      await prisma.assessment.createMany({
        data: scraped.assessments.map((a) => ({
          courseId: course.id,
          title: a.title,
          type: a.type,
          obtained: a.obtained,
          total: a.total,
          weight: a.weight,
          source: "LMS",
        })),
      });
    }

    if (scraped.attendance) {
      await prisma.attendanceRecord.upsert({
        where: { courseId: course.id },
        update: scraped.attendance,
        create: { courseId: course.id, ...scraped.attendance },
      });
    }
  }

  for (const a of result.announcements) {
    await prisma.announcement.upsert({
      where: { userId_lmsKey: { userId, lmsKey: a.lmsKey } },
      update: { title: a.title, body: a.body },
      create: {
        userId,
        title: a.title,
        body: a.body,
        postedAt: a.postedAt,
        lmsKey: a.lmsKey,
      },
    });
  }
}
