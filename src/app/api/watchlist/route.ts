import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMovie, getTv, normalizeMovie, normalizeTv } from "@/lib/tmdb";
import { z } from "zod";

export async function GET() {
  const entries = await prisma.watchlistEntry.findMany({
    include: { title: true },
    orderBy: { addedAt: "desc" },
  });
  return NextResponse.json({ entries });
}

const AddSchema = z.object({
  tmdbId: z.number(),
  type: z.enum(["movie", "tv"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { tmdbId, type } = parsed.data;

  try {
    // Fetch full metadata from TMDB
    const raw = type === "movie" ? await getMovie(tmdbId) : await getTv(tmdbId);
    const normalized = type === "movie"
      ? normalizeMovie(raw as Awaited<ReturnType<typeof getMovie>>)
      : normalizeTv(raw as Awaited<ReturnType<typeof getTv>>);

    // Upsert the title record
    const title = await prisma.title.upsert({
      where: { tmdbId },
      update: normalized,
      create: normalized,
    });

    // Check if already in watchlist
    const existing = await prisma.watchlistEntry.findFirst({
      where: { titleId: title.id },
    });

    if (existing) {
      // Re-activate if it was dismissed
      if (existing.status !== "active") {
        const updated = await prisma.watchlistEntry.update({
          where: { id: existing.id },
          data: { status: "active" },
          include: { title: true },
        });
        return NextResponse.json({ entry: updated });
      }
      return NextResponse.json({ entry: existing, alreadyExists: true });
    }

    const entry = await prisma.watchlistEntry.create({
      data: { titleId: title.id, status: "active" },
      include: { title: true },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to add title" }, { status: 500 });
  }
}
