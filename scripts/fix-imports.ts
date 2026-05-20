/**
 * Fix mis-matched TMDB imports and recategorize titles.
 * Run with: npx tsx scripts/fix-imports.ts
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

// Titles with wrong TMDB matches — delete history + title, re-import correct version
const WRONG_MATCHES = [
  { wrongTmdbId: 3232, correctQuery: "Fury", correctTmdbId: 228150, type: "movie" as const, year: 2014 },
  { wrongTmdbId: 441, correctQuery: "The Father", correctTmdbId: 603099, type: "movie" as const, year: 2020 },
  { wrongTmdbId: 405775, correctQuery: "Pink Floyd The Wall", correctTmdbId: 10110, type: "movie" as const, year: 1982 },
  { wrongTmdbId: 5690, correctQuery: "Moonlight", correctTmdbId: 376867, type: "movie" as const, year: 2016 },
  { wrongTmdbId: 15643, correctQuery: "The Family Man", correctTmdbId: 10127, type: "movie" as const, year: 2000 },
  { wrongTmdbId: 4288, correctQuery: "Beetlejuice", correctTmdbId: 4011, type: "movie" as const, year: 1988 },
  { wrongTmdbId: 76826, correctQuery: "Grave of the Fireflies", correctTmdbId: 12477, type: "movie" as const, year: 1988 },
];

// Titles that should be on watchlist, not history
const MOVE_TO_WATCHLIST = [667216, 12102, 552178]; // Infinity Pool, Kramer vs Kramer, Dark Waters

// New titles to add as watched+loved
const ADD_LOVED = [
  { query: "The Fountain", year: 2006 },
  { query: "Requiem for a Dream", year: 2000 },
];

async function main() {
  // Step 1: Get current data
  console.log("Fetching current history...");
  const histRes = await fetch(`${BASE}/api/history`);
  const { entries: history } = await histRes.json();

  // Step 2: Fix wrong matches
  console.log("\n--- Fixing wrong TMDB matches ---");
  for (const fix of WRONG_MATCHES) {
    const entry = history.find((h: any) => h.title.tmdbId === fix.wrongTmdbId);
    if (!entry) {
      console.log(`  ${fix.correctQuery}: not found with tmdbId ${fix.wrongTmdbId}, skipping`);
      continue;
    }

    // Delete the history entry via API
    const delRes = await fetch(`${BASE}/api/history/${entry.id}`, { method: "DELETE" });
    if (!delRes.ok) {
      console.log(`  ${fix.correctQuery}: failed to delete history (${delRes.status})`);
      continue;
    }

    // Re-import with correct TMDB ID
    const importRes = await fetch(`${BASE}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titles: [{ query: fix.correctQuery, category: "watched", year: fix.year, type: fix.type }],
      }),
    });
    const importData = await importRes.json();
    const result = importData.results?.[0];
    console.log(`  ${fix.correctQuery}: ${result?.status} (tmdbId: ${result?.tmdbId})`);
    await new Promise((r) => setTimeout(r, 300));
  }

  // Step 3: Move mis-categorized titles to watchlist
  console.log("\n--- Moving titles from history to watchlist ---");
  for (const tmdbId of MOVE_TO_WATCHLIST) {
    const entry = history.find((h: any) => h.title.tmdbId === tmdbId);
    if (!entry) {
      console.log(`  tmdbId ${tmdbId}: not found in history, skipping`);
      continue;
    }

    // Delete history entry
    const delRes = await fetch(`${BASE}/api/history/${entry.id}`, { method: "DELETE" });
    if (!delRes.ok) {
      console.log(`  ${entry.title.title}: failed to delete history (${delRes.status})`);
      continue;
    }

    // Add to watchlist
    const addRes = await fetch(`${BASE}/api/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: entry.title.tmdbId, type: entry.title.type }),
    });
    if (addRes.ok) {
      console.log(`  ${entry.title.title}: moved to watchlist`);
    } else {
      console.log(`  ${entry.title.title}: failed to add to watchlist (${addRes.status})`);
    }
  }

  // Step 4: Add The Fountain and Requiem as watched + loved
  console.log("\n--- Adding loved titles ---");
  for (const title of ADD_LOVED) {
    // Import as watched
    const importRes = await fetch(`${BASE}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titles: [{ query: title.query, category: "watched", year: title.year }],
      }),
    });
    const importData = await importRes.json();
    const result = importData.results?.[0];

    if (result?.titleId) {
      // Add ratings (both loved it = score 2)
      for (const person of ["artem", "alexa"]) {
        await fetch(`${BASE}/api/ratings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titleId: result.titleId,
            person,
            score: 2,
            wouldRewatch: true,
          }),
        });
      }
      console.log(`  ${title.query}: added as watched + loved by both`);
    } else {
      console.log(`  ${title.query}: import failed — ${result?.status}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("\nDone!");
}

main().catch(console.error);
