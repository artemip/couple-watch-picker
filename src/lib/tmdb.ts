const BASE = "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;

export const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

function url(path: string, params: Record<string, string> = {}) {
  const u = new URL(`${BASE}${path}`);
  u.searchParams.set("api_key", KEY!);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const res = await fetch(url(path, params), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json() as T;
}

export interface TmdbMovie {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
  genres?: { id: number; name: string }[];
  runtime?: number;
  popularity: number;
  credits?: {
    cast: { name: string; order: number }[];
    crew: { name: string; job: string }[];
  };
  "watch/providers"?: {
    results: Record<string, { flatrate?: { provider_name: string }[] }>;
  };
}

export interface TmdbTv {
  id: number;
  name: string;
  first_air_date: string;
  overview: string;
  poster_path: string | null;
  genres?: { id: number; name: string }[];
  episode_run_time?: number[];
  popularity: number;
  credits?: {
    cast: { name: string; order: number }[];
    crew: { name: string; job: string }[];
  };
  "watch/providers"?: {
    results: Record<string, { flatrate?: { provider_name: string }[] }>;
  };
}

export interface TmdbSearchResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  poster_path: string | null;
  popularity: number;
}

export async function searchMulti(query: string) {
  const data = await get<{ results: TmdbSearchResult[] }>("/search/multi", {
    query,
    include_adult: "false",
  });
  return data.results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
}

export async function getMovie(tmdbId: number): Promise<TmdbMovie> {
  return get<TmdbMovie>(`/movie/${tmdbId}`, {
    append_to_response: "credits,watch/providers",
  });
}

export async function getTv(tmdbId: number): Promise<TmdbTv> {
  return get<TmdbTv>(`/tv/${tmdbId}`, {
    append_to_response: "credits,watch/providers",
  });
}

export function normalizeMovie(m: TmdbMovie) {
  return {
    tmdbId: m.id,
    type: "movie" as const,
    title: m.title,
    year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : null,
    posterPath: m.poster_path,
    genres: m.genres?.map((g) => g.name) ?? [],
    runtime: m.runtime ?? null,
    summary: m.overview,
    cast: m.credits?.cast.slice(0, 10).map((c) => c.name) ?? [],
    directors: m.credits?.crew.filter((c) => c.job === "Director").map((c) => c.name) ?? [],
    popularity: m.popularity,
  };
}

export function normalizeTv(t: TmdbTv) {
  return {
    tmdbId: t.id,
    type: "tv" as const,
    title: t.name,
    year: t.first_air_date ? parseInt(t.first_air_date.slice(0, 4)) : null,
    posterPath: t.poster_path,
    genres: t.genres?.map((g) => g.name) ?? [],
    runtime: t.episode_run_time?.[0] ?? null,
    summary: t.overview,
    cast: t.credits?.cast.slice(0, 10).map((c) => c.name) ?? [],
    directors: t.credits?.crew.filter((c) => c.job === "Executive Producer").map((c) => c.name) ?? [],
    popularity: t.popularity,
  };
}

export function watchProviders(
  data: TmdbMovie | TmdbTv,
  region = "US"
): string[] {
  const regionData = data["watch/providers"]?.results?.[region];
  return regionData?.flatrate?.map((p) => p.provider_name) ?? [];
}
