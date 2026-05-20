/**
 * One-time import script for the movie/TV watchlist.
 * Run with: npx tsx scripts/import-movies.ts
 *
 * Requires the dev server to be running at http://localhost:3000
 */

const TO_WATCH = [
  "Vertigo",
  "Threads",
  "The Man from Earth",
  "Les Intouchables",
  "Dial M for Murder",
  "Matchstick Men",
  "The Beauty Inside",
  "Sophie's Choice",
  { query: "Meru", year: 2015 },
  "Blue is the Warmest Color",
  { query: "The New Pope", type: "tv" },
  "Out of Blue",
  "The Joy Luck Club",
  "Honey Boy",
  "Pain and Glory",
  { query: "When They See Us", type: "tv" },
  "Mermaids",
  { query: "You'll Never Get Rich", year: 1941 },
  { query: "The Secret Garden", year: 2020 },
  "The Square",
  "Daughters of the Dust",
  "Amreeka",
  "Monsoon Wedding",
  "The First Wives Club",
  "Hidden Figures",
  "Primer",
  "Coherence",
  "Oldboy",
  "Velvet Buzzsaw",
  "Deep Water",
  "Bridge to Terabithia",
  "Lost Highway",
  { query: "The Way", year: 2010 },
  "Miller's Girl",
  "Immaculate",
  "Wildlife",
  "All We Imagine as Light",
  "A Real Pain",
  "The Worst Person in the World",
  "Jerry Maguire",
  "Lost in Translation",
  "Zola",
  "The Florida Project",
  "Sucker Free City",
  "Phenomenon",
  "Margin Call",
  "Killing Them Softly",
  "Kramer vs Kramer",
  "Revenge",
  "Die My Love",
  "Resurrection",
  "Incendies",
  { query: "The Tragedy of Macbeth", year: 2021 },
  "Imperium",
  "Stronger",
  "Prisoners",
  { query: "Top Gun", year: 1986 },
  "Saltburn",
  "The Invitation",
  "The Deer Hunter",
  "Lincoln",
  "The Social Dilemma",
  { query: "Happiness", year: 1998 },
  "Irreversible",
  "Crows Are White",
  "The Ides of March",
  "Minari",
];

const WATCHED = [
  "Office Space",
  "Beautiful Boy",
  "House of Sand and Fog",
  "Downfall",
  { query: "Stalker", year: 1979 },
  { query: "The Room", year: 2003 },
  "Blue Jasmine",
  { query: "Anna Karenina", year: 2012 },
  "Weathering with You",
  "Grave of the Fireflies",
  "Lord of War",
  "Four Rooms",
  "In Bruges",
  "The Family Man",
  "Melancholia",
  "The Tree of Life",
  { query: "Les Miserables", year: 2012 },
  { query: "The Knick", type: "tv" },
  "Moonlight",
  "The Dawn Wall",
  "Loving Vincent",
  "Cloud Atlas",
  "Dunkirk",
  "Marriage Story",
  "Harriet",
  { query: "The Wall", year: 2017 },
  "Little Women",
  "Bombshell",
  "The Irishman",
  "Hail Caesar",
  "Dark Waters",
  "Dolemite Is My Name",
  "Zombieland Double Tap",
  "Uncut Gems",
  "Just Mercy",
  "The Personal History of David Copperfield",
  "Tootsie",
  "Kramer vs Kramer",
  "Whiskey Tango Foxtrot",
  "The Menu",
  "Navalny",
  "Triangle of Sadness",
  "Infinity Pool",
  "The Banshees of Inisherin",
  "Tar",
  "The Whale",
  "I Saw the Devil",
  "Women Talking",
  "The Deepest Breath",
  { query: "Ancient Apocalypse", type: "tv" },
  "She Came to Me",
  "The Boy and the Heron",
  "Sicario",
  "Beetlejuice",
  "Monkey Man",
  "I Saw the TV Glow",
  "Heretic",
  "All of Us Strangers",
  "The Substance",
  "Nickel Boys",
  "Anora",
  { query: "The West Wing", type: "tv" },
  "Doctor Sleep",
  "Under the Silver Lake",
  "Megalopolis",
  "The Father",
  "Fury",
  "Aniara",
  { query: "Spy x Family", type: "tv" },
  "Nightbitch",
];

interface ImportEntry {
  query: string;
  category: "to_watch" | "watched";
  year?: number;
  type?: "movie" | "tv";
}

function normalize(item: string | { query: string; year?: number; type?: string }, category: "to_watch" | "watched"): ImportEntry {
  if (typeof item === "string") {
    return { query: item, category };
  }
  return { query: item.query, category, year: item.year, type: item.type as "movie" | "tv" | undefined };
}

async function main() {
  const BASE = process.env.BASE_URL || "http://localhost:3000";

  const titles: ImportEntry[] = [
    ...TO_WATCH.map((t) => normalize(t, "to_watch")),
    ...WATCHED.map((t) => normalize(t, "watched")),
  ];

  console.log(`Importing ${titles.length} titles (${TO_WATCH.length} to-watch, ${WATCHED.length} watched)...`);

  // Send in batches of 20 to avoid timeout
  const BATCH = 20;
  let allResults: unknown[] = [];

  for (let i = 0; i < titles.length; i += BATCH) {
    const batch = titles.slice(i, i + BATCH);
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(titles.length / BATCH)} (${batch.length} titles)...`);

    const res = await fetch(`${BASE}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titles: batch }),
    });

    if (!res.ok) {
      console.error(`  Batch failed: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error(`  ${text}`);
      continue;
    }

    const data = await res.json();
    console.log(`  Results: ${JSON.stringify(data.summary)}`);
    allResults = allResults.concat(data.results);

    // Show any failures
    const failures = data.results.filter((r: { status: string }) => r.status === "not_found" || r.status === "error");
    if (failures.length > 0) {
      console.log(`  Failures:`);
      for (const f of failures) {
        console.log(`    - ${f.query}: ${f.status}${f.error ? ` (${f.error})` : ""}`);
      }
    }
  }

  console.log("\nDone! Total results:");
  const summary = {
    total: allResults.length,
    watchlist: allResults.filter((r: any) => r.status === "added_to_watchlist").length,
    history: allResults.filter((r: any) => r.status === "added_to_history").length,
    notFound: allResults.filter((r: any) => r.status === "not_found").length,
    errors: allResults.filter((r: any) => r.status === "error").length,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error);
