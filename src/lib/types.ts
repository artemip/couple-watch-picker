export type Person = "artem" | "alexa" | "both";
export type WatchStatus = "active" | "not_tonight" | "vetoed" | "skip";
export type RatingScore = -2 | -1 | 1 | 2;
export type RecommendSlot = "safe" | "artem" | "alexa" | "couple" | "wildcard";
export type EnergyLevel = "low" | "medium" | "high";
export type MediaType = "movie" | "tv" | "any";
export type WatchWith = "together" | "artem_solo" | "alexa_solo";

export interface TitleData {
  id: string;
  tmdbId: number;
  type: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  genres: string[];
  runtime: number | null;
  summary: string | null;
  cast: string[];
  directors: string[];
  popularity: number | null;
}

export interface WatchlistEntryWithTitle {
  id: string;
  status: string;
  addedAt: string;
  title: TitleData;
}

export interface HistoryEntryWithRatings {
  id: string;
  watchedAt: string;
  watchedBy: string;
  together: boolean;
  tags: string[];
  notes: string | null;
  title: TitleData;
  ratings: RatingData[];
}

export interface RatingData {
  id: string;
  person: string;
  score: number | null;
  wouldRewatch: boolean | null;
  tags: string[];
  note: string | null;
}

export interface Recommendation {
  slot: RecommendSlot;
  titleId: string;
  title: TitleData;
  whyTonight: string;
  whyMiss: string;
  artemFit: "great" | "good" | "meh" | "risky";
  alexaFit: "great" | "good" | "meh" | "risky";
  watchTogether: boolean;
  providers: string[];
}

export interface TonightContext {
  energy: EnergyLevel | null;
  moods: string[];
  mediaType: MediaType;
  vibe: string[];
  watchWith: WatchWith;
  veto: string;
}
