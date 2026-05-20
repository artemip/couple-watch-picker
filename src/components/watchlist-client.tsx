"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SearchModal } from "@/components/search-modal";
import { POSTER_BASE } from "@/lib/tmdb";
import { useUser } from "@/components/providers";
import type { WatchlistEntryWithTitle, TitleData, RatingScore } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  active: "To watch",
  not_tonight: "Not tonight",
  vetoed: "Vetoed",
  skip: "Skipped",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-zinc-300",
  not_tonight: "a-text",
  vetoed: "text-red-500",
  skip: "text-zinc-600",
};

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "To watch" },
  { value: "not_tonight", label: "Not tonight" },
  { value: "vetoed", label: "Vetoed" },
];

interface MustWatchItem {
  title: TitleData;
  lovedBy: string;
  mustWatchFor: string;
  score: number;
}

interface Props {
  initialEntries: WatchlistEntryWithTitle[];
  dbError: boolean;
}

export function WatchlistClient({ initialEntries, dbError }: Props) {
  const { colors } = useUser();
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState("active");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mustWatch, setMustWatch] = useState<MustWatchItem[]>([]);
  const [detailEntry, setDetailEntry] = useState<WatchlistEntryWithTitle | null>(null);

  useEffect(() => {
    fetch("/api/must-watch")
      .then((r) => r.json())
      .then((data) => setMustWatch(data.mustWatch ?? []))
      .catch(() => {});
  }, []);

  async function refresh() {
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {}
    // Also refresh must-watch
    fetch("/api/must-watch")
      .then((r) => r.json())
      .then((data) => setMustWatch(data.mustWatch ?? []))
      .catch(() => {});
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/watchlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    );
    setDetailEntry(null);
  }

  async function removeEntry(id: string) {
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDetailEntry(null);
  }

  const filtered = filter === "all"
    ? entries
    : entries.filter((e) => e.status === filter);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {entries.filter((e) => e.status === "active").length} to watch
          </p>
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded-[50px] a-bg px-5 py-2.5 text-[13px] font-semibold text-black transition-all hover:opacity-90 active:scale-95 cursor-pointer"
        >
          <span>+</span> Add
        </button>
      </div>

      {dbError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 mb-4">
          Database not connected — set up your env vars in <code>.env.local</code> and run{" "}
          <code>npx prisma migrate dev</code>.
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-[50px] bg-zinc-900 p-1 mb-4">
        {FILTER_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex-1 rounded-[50px] py-2.5 text-xs font-medium transition-colors ${
              filter === value
                ? "bg-zinc-700 text-zinc-50"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Must-watch highlights */}
      {mustWatch.length > 0 && filter === "active" && (
        <div className="mb-4 space-y-2">
          <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Must watch</h2>
          {mustWatch.slice(0, 5).map((item) => {
            const personColor = item.lovedBy === "artem" ? colors.artem : colors.alexa;
            const forName = item.mustWatchFor === "artem" ? "Artem" : "Alexa";
            const byName = item.lovedBy === "artem" ? "Artem" : "Alexa";
            // Find the watchlist entry for this must-watch title
            const entry = entries.find((e) => e.title.id === item.title.id);
            return (
              <div
                key={item.title.id}
                className="flex items-center gap-3 rounded-[16px] border p-3 cursor-pointer active:scale-[0.99] transition-transform"
                style={{
                  borderColor: hexAlpha(personColor, 0.2),
                  backgroundColor: hexAlpha(personColor, 0.06),
                }}
                onClick={() => entry && setDetailEntry(entry)}
              >
                <div className="shrink-0 w-16 h-24 rounded-[8px] overflow-hidden bg-zinc-800">
                  {item.title.posterPath ? (
                    <Image
                      src={`${POSTER_BASE}${item.title.posterPath}`}
                      alt={item.title.title}
                      width={64}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{item.title.title}</p>
                  <p className="text-xs text-zinc-500">
                    {item.title.year && <span>{item.title.year}</span>}
                    {item.title.year && item.title.genres[0] && <span> · </span>}
                    {item.title.genres[0] && <span>{item.title.genres[0]}</span>}
                  </p>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color: personColor }}>
                    {byName} {item.score === 2 ? "loved" : "liked"} it — {forName} must watch
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-10 text-center">
          <p className="text-zinc-400 text-sm">
            {filter === "active" ? "Nothing to watch yet — add some titles." : "None here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-zinc-900 p-3 cursor-pointer active:scale-[0.99] transition-transform hover:bg-zinc-800/50"
              onClick={() => setDetailEntry(entry)}
            >
              <div className="shrink-0 w-16 h-24 rounded-[8px] overflow-hidden bg-zinc-800">
                {entry.title.posterPath ? (
                  <Image
                    src={`${POSTER_BASE}${entry.title.posterPath}`}
                    alt={entry.title.title}
                    width={64}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{entry.title.title}</p>
                <p className="text-xs text-zinc-500">
                  {entry.title.year && <span>{entry.title.year}</span>}
                  {entry.title.year && entry.title.genres[0] && <span> · </span>}
                  {entry.title.genres[0] && <span>{entry.title.genres[0]}</span>}
                  {entry.title.runtime && <span> · {entry.title.runtime} min</span>}
                </p>
                <p className={`text-[10px] font-medium mt-0.5 ${STATUS_COLORS[entry.status] ?? "text-zinc-500"}`}>
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-zinc-600 shrink-0">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          ))}
        </div>
      )}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAdded={() => { setSearchOpen(false); refresh(); }}
      />

      {detailEntry && (
        <TitleDetail
          entry={detailEntry}
          colors={colors}
          onClose={() => setDetailEntry(null)}
          onStatusChange={updateStatus}
          onRemove={removeEntry}
          onLoggedWatch={() => { setDetailEntry(null); refresh(); }}
        />
      )}
    </div>
  );
}

function TitleDetail({
  entry,
  colors,
  onClose,
  onStatusChange,
  onRemove,
  onLoggedWatch,
}: {
  entry: WatchlistEntryWithTitle;
  colors: { artem: string; alexa: string };
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onRemove: (id: string) => void;
  onLoggedWatch: () => void;
}) {
  const [showRating, setShowRating] = useState(false);
  const [artemScore, setArtemScore] = useState<RatingScore | null>(null);
  const [alexaScore, setAlexaScore] = useState<RatingScore | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { title } = entry;

  async function logWatched() {
    setSaving(true);
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleId: entry.title.id,
        watchedBy: "both",
        together: true,
        notes: notes || undefined,
        ...(artemScore !== null && { artemRating: { score: artemScore, note: notes || undefined } }),
        ...(alexaScore !== null && { alexaRating: { score: alexaScore, note: notes || undefined } }),
      }),
    });
    setSaving(false);
    onLoggedWatch();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-0 sm:mx-4 rounded-t-[24px] sm:rounded-[24px] border border-white/10 bg-zinc-900 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header with close */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0 shrink-0">
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 -ml-1 cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pb-5 pt-3 space-y-4">
          {/* Poster + basic info */}
          <div className="flex gap-4">
            <div className="shrink-0 w-28 h-[168px] rounded-[8px] overflow-hidden bg-zinc-800">
              {title.posterPath ? (
                <Image
                  src={`${POSTER_BASE}${title.posterPath}`}
                  alt={title.title}
                  width={112}
                  height={168}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">No poster</div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  {title.title}
                  {title.year && (
                    <span className="font-normal text-zinc-500 text-sm ml-1.5">{title.year}</span>
                  )}
                </h2>
                {title.directors.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-0.5">{title.directors.join(", ")}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {title.genres.slice(0, 3).map((g) => (
                  <span key={g} className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] text-zinc-400">
                    {g}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                {title.runtime && <span>{title.runtime} min</span>}
                <span className="capitalize">{title.type}</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          {title.summary && (
            <p className="text-[13px] text-zinc-400 leading-relaxed">{title.summary}</p>
          )}

          {/* Cast */}
          {title.cast.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1">Cast</p>
              <p className="text-xs text-zinc-400">{title.cast.slice(0, 6).join(", ")}</p>
            </div>
          )}

          {/* Log watched section */}
          {showRating && (
            <div className="space-y-3 pt-2 border-t border-white/6">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Rate it</p>
              <RatingRow person="Artem" color={colors.artem} score={artemScore} onScore={setArtemScore} />
              <RatingRow person="Alexa" color={colors.alexa} score={alexaScore} onScore={setAlexaScore} />
              <textarea
                placeholder="Quick notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-[16px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:a-border-50 resize-none"
              />
              <button
                onClick={logWatched}
                disabled={saving}
                className="w-full rounded-[50px] a-bg py-3 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              >
                {saving ? "Saving..." : "Save to history"}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        {!showRating && (
          <div className="px-5 pb-5 pt-0 space-y-2 shrink-0">
            <button
              onClick={() => setShowRating(true)}
              className="w-full rounded-[50px] a-bg py-3 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
            >
              Log watched
            </button>
            <div className="flex gap-2">
              {entry.status !== "active" && (
                <button
                  onClick={() => onStatusChange(entry.id, "active")}
                  className="flex-1 rounded-[50px] border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Move to watchlist
                </button>
              )}
              {entry.status === "active" && (
                <button
                  onClick={() => onStatusChange(entry.id, "not_tonight")}
                  className="flex-1 rounded-[50px] border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Not tonight
                </button>
              )}
              <button
                onClick={() => onRemove(entry.id)}
                className="flex-1 rounded-[50px] border border-red-500/20 bg-red-500/5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type Score = -2 | -1 | 1 | 2;
const SCORE_OPTIONS: { value: Score; emoji: string; label: string }[] = [
  { value: -2, emoji: "👎👎", label: "Hated" },
  { value: -1, emoji: "👎", label: "Meh" },
  { value: 1, emoji: "👍", label: "Liked" },
  { value: 2, emoji: "👍👍", label: "Loved" },
];

function RatingRow({ person, color, score, onScore }: {
  person: string;
  color: string;
  score: Score | null;
  onScore: (s: Score) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-medium" style={{ color }}>{person}</span>
      <div className="flex gap-2">
        {SCORE_OPTIONS.map((opt) => {
          const active = score === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onScore(opt.value)}
              className={active
                ? "flex-1 rounded-[16px] border py-3 text-center transition-all active:scale-95 cursor-pointer"
                : "flex-1 rounded-[16px] border border-white/10 bg-white/5 hover:border-white/20 py-3 text-center transition-all active:scale-95 cursor-pointer"
              }
              style={active ? { borderColor: hexAlpha(color, 0.5), backgroundColor: hexAlpha(color, 0.15) } : undefined}
            >
              <div className="text-lg">{opt.emoji}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">{opt.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function hexAlpha(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
