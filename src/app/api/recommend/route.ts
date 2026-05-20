import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { watchProviders, getMovie, getTv, searchMulti, normalizeMovie, normalizeTv } from "@/lib/tmdb";
import type { Recommendation, RecommendSlot, TitleData } from "@/lib/types";

// Local types matching Prisma query shapes
interface EntryWithTitle {
  id: string;
  status: string;
  titleId: string;
  title: TitleData & { createdAt: unknown; updatedAt: unknown };
}

interface RatingWithTitle {
  id: string;
  person: string;
  score: number | null;
  wouldRewatch: boolean | null;
  tags: string[];
  note: string | null;
  titleId: string;
  title: { tmdbId: number; title: string; genres: string[] };
}

interface ParsedPick {
  slot: RecommendSlot;
  source: "watchlist" | "discovery";
  titleId?: string;
  discoveryTitle?: string;
  discoveryYear?: number;
  discoveryType?: "movie" | "tv";
  whyTonight: string;
  whyMiss: string;
  artemFit: "great" | "good" | "meh" | "risky";
  alexaFit: "great" | "good" | "meh" | "risky";
  watchTogether: boolean;
}

const SLOTS: RecommendSlot[] = ["safe", "artem", "alexa", "couple", "wildcard"];

export async function POST(req: NextRequest) {
  const ctx = await req.json();

  // Fetch active watchlist
  const entries = (await prisma.watchlistEntry.findMany({
    where: { status: "active" },
    include: { title: true },
    orderBy: { addedAt: "desc" },
    take: 60,
  })) as EntryWithTitle[];

  // Fetch all ratings for taste data
  const ratings = (await prisma.rating.findMany({
    include: { title: { select: { tmdbId: true, title: true, genres: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  })) as RatingWithTitle[];

  // Fetch providers for watchlist titles (batch, no-throw)
  const providerMap: Record<string, string[]> = {};
  if (entries.length > 0) {
    await Promise.allSettled(
      entries.slice(0, 20).map(async ({ title }: EntryWithTitle) => {
        try {
          const raw = title.type === "movie"
            ? await getMovie(title.tmdbId)
            : await getTv(title.tmdbId);
          providerMap[title.id] = watchProviders(raw);
        } catch {
          providerMap[title.id] = [];
        }
      })
    );
  }

  // Build taste summary
  const artemRatings = ratings.filter((r: RatingWithTitle) => r.person === "artem");
  const alexaRatings = ratings.filter((r: RatingWithTitle) => r.person === "alexa");

  function tasteBlurb(ratingsList: RatingWithTitle[]) {
    if (ratingsList.length === 0) return "No ratings yet.";
    const liked = ratingsList.filter((r) => (r.score ?? 0) > 0).map((r) => r.title.title);
    const disliked = ratingsList.filter((r) => (r.score ?? 0) < 0).map((r) => r.title.title);
    const rewatchable = ratingsList.filter((r) => r.wouldRewatch).map((r) => r.title.title);
    const genres = ratingsList.filter((r) => (r.score ?? 0) > 0).flatMap((r) => r.title.genres);
    const genreCounts = genres.reduce((acc, g) => { acc[g] = (acc[g] || 0) + 1; return acc; }, {} as Record<string, number>);
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
    const lines: string[] = [];
    if (liked.length > 0) lines.push(`Liked: ${liked.slice(0, 8).join(", ")}`);
    if (disliked.length > 0) lines.push(`Disliked: ${disliked.slice(0, 5).join(", ")}`);
    if (rewatchable.length > 0) lines.push(`Rewatchable: ${rewatchable.slice(0, 5).join(", ")}`);
    if (topGenres.length > 0) lines.push(`Top genres: ${topGenres.join(", ")}`);
    return lines.join(". ");
  }

  const hasWatchlist = entries.length > 0;
  const watchlistBlurb = hasWatchlist
    ? entries.map(({ title, id }: EntryWithTitle) => {
        const providers = providerMap[id] ?? [];
        return `- [ID:${title.id}] ${title.title} (${title.year ?? "?"}) | ${title.type} | ${title.genres.slice(0, 3).join(", ")} | ${title.runtime ?? "??"} min | ${providers.length ? providers.slice(0, 3).join(", ") : "unknown streaming"}`;
      }).join("\n")
    : "(empty)";

  const watchWithLabel = ctx.watchWith === "artem_solo" ? "Artem watching solo" : ctx.watchWith === "alexa_solo" ? "Alexa watching solo" : "Watching together";

  const contextBlurb = [
    `Watching: ${watchWithLabel}`,
    ctx.mediaType && ctx.mediaType !== "any" ? `Type: ${ctx.mediaType === "movie" ? "Movies only" : "TV shows only"}` : null,
    ctx.energy ? `Energy level: ${ctx.energy}` : null,
    ctx.moods?.length ? `Mood preference: ${ctx.moods.join(", ")}` : null,
    ctx.vibe?.length ? `Vibe: ${ctx.vibe.join(", ")}` : null,
    ctx.veto ? `Hard veto: ${ctx.veto}` : null,
  ].filter(Boolean).join("\n");

  // Gather already-watched titles to exclude from discovery
  const watchedTitles = ratings.map((r) => r.title.title.toLowerCase());

  const prompt = `You are a movie/TV recommendation engine for a couple's private watching app.

Users: Artem and Alexa.

TONIGHT'S CONTEXT:
${contextBlurb || "No specific constraints — be flexible."}

TASTE DATA:
Artem: ${tasteBlurb(artemRatings)}
Alexa: ${tasteBlurb(alexaRatings)}
${ratings.length === 0 ? "Note: No taste data yet — make reasonable assumptions and be honest about low confidence." : ""}

WATCHLIST (titles they've saved to watch):
${watchlistBlurb}

ALREADY WATCHED (do NOT suggest these):
${watchedTitles.length > 0 ? watchedTitles.slice(0, 30).join(", ") : "None yet."}

Your job: pick 5 titles — a blend of watchlist picks and fresh discoveries.

Each pick has a SOURCE:
- "watchlist": pick from their saved watchlist above (use the exact [ID:...])
- "discovery": suggest a title NOT on their watchlist — something they'd love based on taste data, tonight's vibe, and your knowledge of film/TV. Must be a real, existing title.

SLOT DEFINITIONS:
- safe: most likely to please both, lowest risk, clear tonight-fit
- artem: particularly good fit for Artem based on his taste
- alexa: particularly good fit for Alexa based on her taste
- couple: best fit for watching together as a couple
- wildcard: interesting stretch pick — something neither might choose on their own but could be a great surprise

BLENDING RULES:
- If the watchlist has titles, use it for 2-3 picks and fill the rest with discoveries
- If the watchlist is empty, all 5 picks should be discoveries
- The "safe" slot should prefer watchlist titles when available (they already saved it for a reason)
- "wildcard" should prefer discovery (surprise them with something new)
- Discovery picks should be real, well-known titles — not obscure films nobody has heard of
- NEVER suggest a title that appears in the ALREADY WATCHED list
- NEVER suggest a title that's already on the watchlist as a "discovery" — if it's on the watchlist, use source "watchlist"

GENERAL RULES:
- Respect the veto if set — exclude anything matching that constraint
- If a media type filter is set (movie/tv), only pick titles of that type
- If watching solo, weight picks more heavily toward that person's taste; the "couple" slot becomes "best for them"
- Match the vibe if specified (eg. "date night" → romantic/intimate; "mind-bending" → complex/cerebral)
- If fewer than 5 picks make sense, return fewer
- Be honest: if taste data is sparse, say so in whyTonight

Return ONLY valid JSON, no markdown, no explanation outside the JSON:
{
  "picks": [
    {
      "slot": "safe",
      "source": "watchlist",
      "titleId": "<exact ID from watchlist>",
      "whyTonight": "<1-2 sentences>",
      "whyMiss": "<1 sentence>",
      "artemFit": "great" | "good" | "meh" | "risky",
      "alexaFit": "great" | "good" | "meh" | "risky",
      "watchTogether": true | false
    },
    {
      "slot": "wildcard",
      "source": "discovery",
      "discoveryTitle": "<exact movie/show title>",
      "discoveryYear": 2023,
      "discoveryType": "movie" | "tv",
      "whyTonight": "<1-2 sentences>",
      "whyMiss": "<1 sentence>",
      "artemFit": "great" | "good" | "meh" | "risky",
      "alexaFit": "great" | "good" | "meh" | "risky",
      "watchTogether": true | false
    }
  ]
}`;

  try {
    let response;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        });
        break;
      } catch (e) {
        lastErr = e;
        if ((e as { status?: number })?.status !== 429) throw e;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
    if (!response) throw lastErr;

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON — strip any accidental markdown fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]) as { picks: ParsedPick[] };

    // Enrich picks with full title data
    const titleMap = Object.fromEntries(entries.map((e: EntryWithTitle) => [e.title.id, e.title]));

    const picks: Recommendation[] = [];

    for (const p of parsed.picks) {
      if (!SLOTS.includes(p.slot)) continue;

      if (p.source === "watchlist" && p.titleId && titleMap[p.titleId]) {
        picks.push({
          slot: p.slot,
          titleId: p.titleId,
          title: titleMap[p.titleId] as TitleData,
          whyTonight: p.whyTonight,
          whyMiss: p.whyMiss,
          artemFit: p.artemFit,
          alexaFit: p.alexaFit,
          watchTogether: p.watchTogether,
          providers: providerMap[p.titleId] ?? [],
        });
      } else if (p.source === "discovery" && p.discoveryTitle) {
        // Search TMDB for the discovery title
        try {
          const query = p.discoveryYear
            ? `${p.discoveryTitle} ${p.discoveryYear}`
            : p.discoveryTitle;
          const results = await searchMulti(query);
          const match = results.find((r) =>
            r.media_type === (p.discoveryType ?? "movie")
          ) ?? results[0];

          if (match) {
            // Get full details
            const full = match.media_type === "movie"
              ? normalizeMovie(await getMovie(match.id))
              : normalizeTv(await getTv(match.id));

            // Check if this title is already in our DB
            const existing = await prisma.title.findFirst({
              where: { tmdbId: match.id },
            });

            const titleData: TitleData = existing
              ? {
                  id: existing.id,
                  tmdbId: existing.tmdbId,
                  type: existing.type,
                  title: existing.title,
                  year: existing.year,
                  posterPath: existing.posterPath,
                  genres: existing.genres,
                  runtime: existing.runtime,
                  summary: existing.summary,
                  cast: existing.cast,
                  directors: existing.directors,
                  popularity: existing.popularity,
                }
              : {
                  id: `discovery-${match.id}`,
                  tmdbId: full.tmdbId,
                  type: full.type,
                  title: full.title,
                  year: full.year,
                  posterPath: full.posterPath,
                  genres: full.genres,
                  runtime: full.runtime,
                  summary: full.summary,
                  cast: full.cast,
                  directors: full.directors,
                  popularity: full.popularity,
                };

            picks.push({
              slot: p.slot,
              titleId: titleData.id,
              title: titleData,
              whyTonight: p.whyTonight,
              whyMiss: p.whyMiss,
              artemFit: p.artemFit,
              alexaFit: p.alexaFit,
              watchTogether: p.watchTogether,
              providers: [],
            });
          }
        } catch {
          // Skip this discovery pick if TMDB lookup fails
        }
      }
    }

    return NextResponse.json({ picks });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = (err as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: `Recommendation failed: ${message}` }, { status });
  }
}
