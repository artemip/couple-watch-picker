import { HistoryClient } from "@/components/history-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  try {
    const [entries, watchlistTitles] = await Promise.all([
      prisma.watchHistory.findMany({
        include: { title: true, ratings: true },
        orderBy: { watchedAt: "desc" },
        take: 100,
      }),
      prisma.title.findMany({
        orderBy: { title: "asc" },
        select: { id: true, title: true, year: true, posterPath: true, type: true },
      }),
    ]);

    return (
      <HistoryClient
        initialEntries={JSON.parse(JSON.stringify(entries))}
        titles={watchlistTitles}
        dbError={false}
      />
    );
  } catch {
    return <HistoryClient initialEntries={[]} titles={[]} dbError={true} />;
  }
}
