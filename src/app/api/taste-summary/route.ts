import { NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";

const SCORE_LABEL: Record<number, string> = {
  2: "loved",
  1: "liked",
  [-1]: "meh",
  [-2]: "disliked",
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const titles = await prisma.title.findMany({
      include: { ratings: true },
    });

    const rated = titles.filter((t) => t.ratings.some((r) => r.score != null));
    if (rated.length < 5) {
      return NextResponse.json({
        summary: null,
        ratedCount: rated.length,
        message: "Rate at least 5 titles to unlock a taste summary.",
      });
    }

    const lines = rated.map((t) => {
      const a = t.ratings.find((r) => r.person === "artem");
      const x = t.ratings.find((r) => r.person === "alexa");
      const aLabel = a?.score != null ? SCORE_LABEL[a.score] : "—";
      const xLabel = x?.score != null ? SCORE_LABEL[x.score] : "—";
      const genres = t.genres.slice(0, 3).join("/") || "?";
      return `- ${t.title}${t.year ? ` (${t.year})` : ""} [${genres}] — artem:${aLabel}, alexa:${xLabel}`;
    });

    const prompt = `You're analyzing the taste of a couple, Artem and Alexa, based on movies/TV they've rated. Scores: loved (👍👍), liked (👍), meh (👎), disliked (👎👎). "—" means no rating from that person.

${lines.join("\n")}

Give a short, specific taste summary as JSON with this exact shape:
{
  "artem": "<1-2 sentences on what Artem gravitates toward — name patterns, genres, directors, vibes; cite 1-2 specific titles>",
  "alexa": "<same for Alexa>",
  "shared": "<1-2 sentences on where their tastes overlap — what they both love>",
  "divergent": "<1-2 sentences on where they diverge — what one loves but the other doesn't>"
}

Be concrete and observational, not generic. No hedging. Plain text inside each field.`;

    let response;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
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
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    const summary = JSON.parse(match[0]);

    return NextResponse.json({ summary, ratedCount: rated.length });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Taste summary failed: ${message}` }, { status: 500 });
  }
}
