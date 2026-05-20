import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpsertSchema = z.object({
  titleId: z.string(),
  person: z.enum(["artem", "alexa"]),
  score: z.number().int().min(-2).max(2).nullable().optional(),
  wouldRewatch: z.boolean().nullable().optional(),
  tags: z.array(z.string()).default([]),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { titleId, person, score, wouldRewatch, tags, note } = parsed.data;

  try {
    const rating = await prisma.rating.upsert({
      where: { titleId_person: { titleId, person } },
      update: {
        ...(score !== undefined && { score }),
        ...(wouldRewatch !== undefined && { wouldRewatch }),
        tags,
        ...(note !== undefined && { note }),
      },
      create: { titleId, person, score: score ?? null, wouldRewatch: wouldRewatch ?? null, tags, note: note ?? null },
    });
    return NextResponse.json({ rating });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}
