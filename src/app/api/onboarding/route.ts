import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Get all watched titles with their title-level ratings (not just history-linked)
  const history = await prisma.watchHistory.findMany({
    include: {
      title: {
        include: {
          ratings: {
            select: { person: true, score: true },
          },
        },
      },
    },
    orderBy: { watchedAt: "desc" },
  });

  // Filter to entries missing ratings from either person
  const needsRating = history.filter((h) => {
    const hasArtem = h.title.ratings.some((r) => r.person === "artem" && r.score !== null);
    const hasAlexa = h.title.ratings.some((r) => r.person === "alexa" && r.score !== null);
    return !hasArtem || !hasAlexa;
  });

  return NextResponse.json({
    entries: needsRating.map((h) => ({
      historyId: h.id,
      title: h.title,
      ratings: h.title.ratings.map((r) => ({
        person: r.person,
        score: r.score,
      })),
    })),
    total: needsRating.length,
  });
}
