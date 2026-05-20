import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Get active watchlist title IDs
  const activeEntries = await prisma.watchlistEntry.findMany({
    where: { status: "active" },
    select: { titleId: true },
  });
  const activeIds = new Set(activeEntries.map((e) => e.titleId));

  // Find titles where one person rated highly (1 or 2) but the other has no rating
  const allRatings = await prisma.rating.findMany({
    where: { score: { gte: 1 } },
    include: { title: true },
  });

  // Group by titleId
  const byTitle = new Map<string, { title: typeof allRatings[0]["title"]; ratings: typeof allRatings }>();
  for (const r of allRatings) {
    const existing = byTitle.get(r.titleId);
    if (existing) {
      existing.ratings.push(r);
    } else {
      byTitle.set(r.titleId, { title: r.title, ratings: [r] });
    }
  }

  const mustWatch: {
    title: typeof allRatings[0]["title"];
    lovedBy: string;
    mustWatchFor: string;
    score: number;
  }[] = [];

  for (const [titleId, { title, ratings }] of byTitle) {
    // Only include titles that are on the active watchlist
    if (!activeIds.has(titleId)) continue;

    const persons = new Set(ratings.map((r) => r.person));
    if (persons.has("artem") && !persons.has("alexa")) {
      const best = Math.max(...ratings.filter((r) => r.person === "artem").map((r) => r.score ?? 0));
      mustWatch.push({ title, lovedBy: "artem", mustWatchFor: "alexa", score: best });
    } else if (persons.has("alexa") && !persons.has("artem")) {
      const best = Math.max(...ratings.filter((r) => r.person === "alexa").map((r) => r.score ?? 0));
      mustWatch.push({ title, lovedBy: "alexa", mustWatchFor: "artem", score: best });
    }
  }

  // Sort by score descending, then by title
  mustWatch.sort((a, b) => b.score - a.score || a.title.title.localeCompare(b.title.title));

  return NextResponse.json({ mustWatch });
}
