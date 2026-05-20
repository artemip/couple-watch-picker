import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  historyId: z.string(),
});

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { historyId } = parsed.data;

  try {
    // Get the history entry to find the titleId
    const history = await prisma.watchHistory.findUnique({
      where: { id: historyId },
      select: { titleId: true },
    });

    if (!history) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Detach ratings and delete history entry
    await prisma.rating.updateMany({
      where: { watchHistoryId: historyId },
      data: { watchHistoryId: null },
    });
    await prisma.watchHistory.delete({ where: { id: historyId } });

    // Add to watchlist (upsert to handle duplicates)
    const existing = await prisma.watchlistEntry.findFirst({
      where: { titleId: history.titleId },
    });

    if (!existing) {
      await prisma.watchlistEntry.create({
        data: { titleId: history.titleId, status: "active" },
      });
    } else if (existing.status !== "active") {
      await prisma.watchlistEntry.update({
        where: { id: existing.id },
        data: { status: "active" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
