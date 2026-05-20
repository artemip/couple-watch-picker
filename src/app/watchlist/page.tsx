import { WatchlistClient } from "@/components/watchlist-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  let entries: Awaited<ReturnType<typeof prisma.watchlistEntry.findMany>> = [];
  let dbError = false;

  try {
    entries = await prisma.watchlistEntry.findMany({
      include: { title: true },
      orderBy: { addedAt: "desc" },
    });
  } catch {
    dbError = true;
  }

  return (
    <WatchlistClient
      initialEntries={JSON.parse(JSON.stringify(entries))}
      dbError={dbError}
    />
  );
}
