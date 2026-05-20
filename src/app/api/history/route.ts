import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const entries = await prisma.watchHistory.findMany({
    include: { title: true, ratings: true },
    orderBy: { watchedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ entries });
}

const LogSchema = z.object({
  titleId: z.string(),
  watchedBy: z.enum(["artem", "alexa", "both"]).default("both"),
  together: z.boolean().default(true),
  watchedAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  artemRating: z.object({
    score: z.number().int().min(-2).max(2).optional(),
    wouldRewatch: z.boolean().optional(),
    tags: z.array(z.string()).default([]),
    note: z.string().optional(),
  }).optional(),
  alexaRating: z.object({
    score: z.number().int().min(-2).max(2).optional(),
    wouldRewatch: z.boolean().optional(),
    tags: z.array(z.string()).default([]),
    note: z.string().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { titleId, watchedBy, together, watchedAt, tags, notes, artemRating, alexaRating } = parsed.data;

  try {
    const entry = await prisma.watchHistory.create({
      data: {
        titleId,
        watchedBy,
        together,
        watchedAt: watchedAt ? new Date(watchedAt) : undefined,
        tags,
        notes,
        ratings: {
          create: [
            ...(artemRating ? [{
              titleId,
              person: "artem",
              score: artemRating.score ?? null,
              wouldRewatch: artemRating.wouldRewatch ?? null,
              tags: artemRating.tags,
              note: artemRating.note ?? null,
            }] : []),
            ...(alexaRating ? [{
              titleId,
              person: "alexa",
              score: alexaRating.score ?? null,
              wouldRewatch: alexaRating.wouldRewatch ?? null,
              tags: alexaRating.tags,
              note: alexaRating.note ?? null,
            }] : []),
          ],
        },
      },
      include: { title: true, ratings: true },
    });

    // Remove from watchlist if present (one canonical record)
    await prisma.watchlistEntry.deleteMany({ where: { titleId } });

    // Upsert standalone ratings for taste model
    if (artemRating?.score !== undefined) {
      await prisma.rating.upsert({
        where: { titleId_person: { titleId, person: "artem" } },
        update: { score: artemRating.score, wouldRewatch: artemRating.wouldRewatch ?? null, tags: artemRating.tags, note: artemRating.note ?? null },
        create: { titleId, person: "artem", score: artemRating.score, wouldRewatch: artemRating.wouldRewatch ?? null, tags: artemRating.tags, note: artemRating.note ?? null, watchHistoryId: entry.id },
      });
    }
    if (alexaRating?.score !== undefined) {
      await prisma.rating.upsert({
        where: { titleId_person: { titleId, person: "alexa" } },
        update: { score: alexaRating.score, wouldRewatch: alexaRating.wouldRewatch ?? null, tags: alexaRating.tags, note: alexaRating.note ?? null },
        create: { titleId, person: "alexa", score: alexaRating.score, wouldRewatch: alexaRating.wouldRewatch ?? null, tags: alexaRating.tags, note: alexaRating.note ?? null, watchHistoryId: entry.id },
      });
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to log watch" }, { status: 500 });
  }
}
