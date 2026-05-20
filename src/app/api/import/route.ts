import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchMulti, getMovie, getTv, normalizeMovie, normalizeTv } from "@/lib/tmdb";

interface ImportItem {
  query: string;
  category: "to_watch" | "watched";
  year?: number;
  type?: "movie" | "tv";
}

export async function POST(req: NextRequest) {
  const { titles } = (await req.json()) as { titles: ImportItem[] };

  if (!titles || !Array.isArray(titles)) {
    return NextResponse.json({ error: "Expected { titles: [...] }" }, { status: 400 });
  }

  const results: { query: string; status: string; titleId?: string; tmdbId?: number; error?: string }[] = [];

  for (const item of titles) {
    try {
      // Search TMDB
      const searchResults = await searchMulti(item.query);
      let match = searchResults[0];

      // Filter by type if specified
      if (item.type) {
        const typed = searchResults.filter((r) => r.media_type === item.type);
        if (typed.length > 0) match = typed[0];
      }

      // Filter by year if specified
      if (item.year && match) {
        const yearMatches = searchResults.filter((r) => {
          const dateStr = r.media_type === "movie" ? r.release_date : r.first_air_date;
          return dateStr && parseInt(dateStr.slice(0, 4)) === item.year;
        });
        if (yearMatches.length > 0) match = yearMatches[0];
      }

      if (!match) {
        results.push({ query: item.query, status: "not_found" });
        continue;
      }

      // Fetch full metadata
      const mediaType = match.media_type as "movie" | "tv";
      const raw = mediaType === "movie" ? await getMovie(match.id) : await getTv(match.id);
      const normalized = mediaType === "movie"
        ? normalizeMovie(raw as Awaited<ReturnType<typeof getMovie>>)
        : normalizeTv(raw as Awaited<ReturnType<typeof getTv>>);

      // Upsert the title
      const title = await prisma.title.upsert({
        where: { tmdbId: match.id },
        update: normalized,
        create: normalized,
      });

      if (item.category === "to_watch") {
        // Add to watchlist
        const existing = await prisma.watchlistEntry.findFirst({
          where: { titleId: title.id },
        });
        if (!existing) {
          await prisma.watchlistEntry.create({
            data: { titleId: title.id, status: "active" },
          });
        }
        results.push({ query: item.query, status: "added_to_watchlist", titleId: title.id, tmdbId: match.id });
      } else {
        // Add to watch history
        const existingHistory = await prisma.watchHistory.findFirst({
          where: { titleId: title.id },
        });
        if (!existingHistory) {
          await prisma.watchHistory.create({
            data: {
              titleId: title.id,
              watchedBy: "both",
              together: true,
            },
          });
        }
        results.push({ query: item.query, status: "added_to_history", titleId: title.id, tmdbId: match.id });
      }

      // Small delay to respect TMDB rate limits
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      results.push({ query: item.query, status: "error", error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  const summary = {
    total: results.length,
    watchlist: results.filter((r) => r.status === "added_to_watchlist").length,
    history: results.filter((r) => r.status === "added_to_history").length,
    notFound: results.filter((r) => r.status === "not_found").length,
    errors: results.filter((r) => r.status === "error").length,
  };

  return NextResponse.json({ summary, results });
}
