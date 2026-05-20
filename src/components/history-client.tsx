"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { POSTER_BASE } from "@/lib/tmdb";
import { useUser } from "@/components/providers";
import type { HistoryEntryWithRatings, RatingScore } from "@/lib/types";

const THUMB_LABELS: Record<number, string> = {
  2: "Loved it",
  1: "Liked it",
  [-1]: "Not for me",
  [-2]: "Disliked it",
};

const THUMB_GLYPH: Record<number, string> = {
  2: "👍👍",
  1: "👍",
  [-1]: "👎",
  [-2]: "👎👎",
};

interface TasteSummary {
  artem: string;
  alexa: string;
  shared: string;
  divergent: string;
}


interface Props {
  initialEntries: HistoryEntryWithRatings[];
  titles: { id: string; title: string; year: number | null; posterPath: string | null; type: string }[];
  dbError: boolean;
}

export function HistoryClient({ initialEntries, titles, dbError }: Props) {
  const { colors } = useUser();
  const [entries, setEntries] = useState(initialEntries);
  const [logOpen, setLogOpen] = useState(false);

  async function refresh() {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {}
  }

  async function deleteEntry(id: string) {
    const prev = entries;
    setEntries((e) => e.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      setEntries(prev);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{entries.length} watched</p>
        </div>
        <button
          onClick={() => setLogOpen(true)}
          className="flex items-center gap-2 rounded-[50px] a-bg px-5 py-2.5 text-[13px] font-semibold text-black transition-all hover:opacity-90 active:scale-95 cursor-pointer"
        >
          <span>+</span> Log watch
        </button>
      </div>

      {dbError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 mb-4">
          Database not connected — set up your env vars in <code>.env.local</code> and run{" "}
          <code>npx prisma migrate dev</code>.
        </div>
      )}

      {!dbError && entries.length > 0 && <TasteCard colors={colors} />}

      {entries.length === 0 && !dbError ? (
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-10 text-center">
          <p className="text-zinc-400 text-sm">No watch history yet.</p>
          <p className="text-zinc-600 text-xs mt-1">Tap "Log watch" to record something you watched.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              colors={colors}
              onDelete={() => deleteEntry(entry.id)}
            />
          ))}
        </div>
      )}

      {logOpen && (
        <LogModal
          titles={titles}
          colors={colors}
          onClose={() => setLogOpen(false)}
          onSaved={() => { setLogOpen(false); refresh(); }}
        />
      )}
    </div>
  );
}

function HistoryCard({
  entry,
  colors,
  onDelete,
}: {
  entry: HistoryEntryWithRatings;
  colors: { artem: string; alexa: string };
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { title, ratings } = entry;
  const artemRating = ratings.find((r) => r.person === "artem");
  const alexaRating = ratings.find((r) => r.person === "alexa");
  const date = new Date(entry.watchedAt);
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const hasExtras = entry.notes || artemRating?.note || alexaRating?.note || artemRating?.wouldRewatch != null || alexaRating?.wouldRewatch != null;

  return (
    <div
      className="rounded-[16px] border border-white/8 bg-zinc-900 overflow-hidden cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="shrink-0 w-16 h-24 rounded-[8px] overflow-hidden bg-zinc-800">
          {title.posterPath ? (
            <Image src={`${POSTER_BASE}${title.posterPath}`} alt={title.title} width={64} height={96} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full bg-zinc-800" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{title.title}</p>
          <p className="text-xs text-zinc-500">
            {dateStr} · {entry.watchedBy === "both" ? "Together" : entry.watchedBy}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {artemRating?.score != null && (
              <span className="text-[10px] font-medium" style={{ color: colors.artem }}>
                Artem: {THUMB_GLYPH[artemRating.score] ?? ""} {THUMB_LABELS[artemRating.score] ?? artemRating.score}
              </span>
            )}
            {alexaRating?.score != null && (
              <span className="text-[10px] font-medium" style={{ color: colors.alexa }}>
                Alexa: {THUMB_GLYPH[alexaRating.score] ?? ""} {THUMB_LABELS[alexaRating.score] ?? alexaRating.score}
              </span>
            )}
          </div>
        </div>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`text-zinc-600 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {expanded && (
        <div
          className="px-3 pb-3 pt-2 border-t border-white/6 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {(artemRating?.wouldRewatch != null || alexaRating?.wouldRewatch != null) && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {artemRating?.wouldRewatch != null && (
                <span className="text-[10px]" style={{ color: colors.artem }}>
                  Artem {artemRating.wouldRewatch ? "would rewatch" : "wouldn't rewatch"}
                </span>
              )}
              {alexaRating?.wouldRewatch != null && (
                <span className="text-[10px]" style={{ color: colors.alexa }}>
                  Alexa {alexaRating.wouldRewatch ? "would rewatch" : "wouldn't rewatch"}
                </span>
              )}
            </div>
          )}
          {entry.notes && <p className="text-xs text-zinc-400 leading-relaxed">{entry.notes}</p>}
          {artemRating?.note && (
            <p className="text-xs text-zinc-500 leading-relaxed">
              <span style={{ color: colors.artem }}>Artem:</span> {artemRating.note}
            </p>
          )}
          {alexaRating?.note && (
            <p className="text-xs text-zinc-500 leading-relaxed">
              <span style={{ color: colors.alexa }}>Alexa:</span> {alexaRating.note}
            </p>
          )}
          {!hasExtras && (
            <p className="text-[11px] text-zinc-600 italic">No notes yet.</p>
          )}
          <div className="pt-1">
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Remove from history?</span>
                <button
                  onClick={onDelete}
                  className="rounded-full bg-red-500/15 text-red-400 border border-red-500/30 px-2.5 py-1 text-[11px] font-medium hover:bg-red-500/25"
                >
                  Yes, remove
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-full border border-white/8 bg-white/5 text-zinc-400 px-2.5 py-1 text-[11px] font-medium hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
              >
                Remove from history
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TasteCard({ colors }: { colors: { artem: string; alexa: string } }) {
  const [data, setData] = useState<{ summary: TasteSummary | null; ratedCount: number; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/taste-summary")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => !cancelled && setError(e.message ?? "Failed to load"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null;

  if (!data) {
    return (
      <div className="mb-4 rounded-[20px] border border-white/8 bg-zinc-900/60 p-4 space-y-2">
        <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
        <div className="h-2 w-full rounded bg-white/5 animate-pulse" />
        <div className="h-2 w-5/6 rounded bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (!data.summary) {
    return (
      <div className="mb-4 rounded-[20px] border border-white/8 bg-zinc-900/60 p-4">
        <p className="text-xs text-zinc-400">{data.message ?? "Add a few more ratings to unlock a taste summary."}</p>
      </div>
    );
  }

  const s = data.summary;
  return (
    <div className="mb-4 rounded-[20px] border border-white/8 bg-zinc-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Your taste</h2>
        <span className="text-[10px] text-zinc-600">{data.ratedCount} rated</span>
      </div>
      <div className="space-y-2.5 text-[13px] leading-relaxed">
        <p>
          <span className="font-semibold" style={{ color: colors.artem }}>Artem.</span>{" "}
          <span className="text-zinc-300">{s.artem}</span>
        </p>
        <p>
          <span className="font-semibold" style={{ color: colors.alexa }}>Alexa.</span>{" "}
          <span className="text-zinc-300">{s.alexa}</span>
        </p>
        <p>
          <span className="font-semibold text-zinc-200">Together.</span>{" "}
          <span className="text-zinc-300">{s.shared}</span>
        </p>
        <p>
          <span className="font-semibold text-zinc-200">Diverge.</span>{" "}
          <span className="text-zinc-300">{s.divergent}</span>
        </p>
      </div>
    </div>
  );
}

function LogModal({
  titles,
  colors,
  onClose,
  onSaved,
}: {
  titles: Props["titles"];
  colors: { artem: string; alexa: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titleId, setTitleId] = useState("");
  const [watchedBy, setWatchedBy] = useState<"both" | "artem" | "alexa">("both");
  const [artemScore, setArtemScore] = useState<RatingScore | null>(null);
  const [alexaScore, setAlexaScore] = useState<RatingScore | null>(null);
  const [artemRewatch, setArtemRewatch] = useState<boolean | null>(null);
  const [alexaRewatch, setAlexaRewatch] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? titles.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
    : titles;

  async function save() {
    if (!titleId) return;
    setSaving(true);
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleId,
          watchedBy,
          together: watchedBy === "both",
          notes: notes || undefined,
          artemRating: watchedBy !== "alexa" && artemScore !== null
            ? { score: artemScore, wouldRewatch: artemRewatch }
            : undefined,
          alexaRating: watchedBy !== "artem" && alexaScore !== null
            ? { score: alexaScore, wouldRewatch: alexaRewatch }
            : undefined,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-t-[24px] sm:rounded-[24px] border border-white/10 bg-zinc-900 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
          <h2 className="text-sm font-semibold">Log a watch</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
          {/* Title picker */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">Title</label>
            <input
              type="text"
              placeholder="Search your library…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-[50px] border border-white/8 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:a-border-50 mb-2"
            />
            <div className="max-h-40 overflow-y-auto rounded-xl border border-white/8 divide-y divide-white/4">
              {filtered.slice(0, 20).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTitleId(t.id); setQuery(t.title); }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                    titleId === t.id ? "a-bg-10 a-text" : "text-zinc-300"
                  }`}
                >
                  {t.title} {t.year && <span className="text-zinc-500">({t.year})</span>}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-zinc-600">No titles found</p>
              )}
            </div>
          </div>

          {/* Who watched */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">Who watched</label>
            <div className="flex gap-2">
              {(["both", "artem", "alexa"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setWatchedBy(p)}
                  className={`flex-1 rounded-[50px] py-2.5 text-sm font-medium transition-all border cursor-pointer ${
                    watchedBy === p
                      ? "a-bg-15 a-border-50 a-text"
                      : "border-white/8 bg-white/5 text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  {p === "both" ? "Both" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {watchedBy !== "alexa" && (
            <RatingSection
              person="Artem"
              color={colors.artem}
              score={artemScore}
              rewatch={artemRewatch}
              onScore={setArtemScore}
              onRewatch={setArtemRewatch}
            />
          )}
          {watchedBy !== "artem" && (
            <RatingSection
              person="Alexa"
              color={colors.alexa}
              score={alexaScore}
              rewatch={alexaRewatch}
              onScore={setAlexaScore}
              onRewatch={setAlexaRewatch}
            />
          )}

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[16px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:a-border-50 resize-none"
          />
        </div>

        <div className="px-4 py-3 border-t border-white/8 shrink-0">
          <button
            onClick={save}
            disabled={!titleId || saving}
            className="w-full rounded-[50px] a-bg py-3 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingSection({
  person,
  color,
  score,
  rewatch,
  onScore,
  onRewatch,
}: {
  person: string;
  color: string;
  score: RatingScore | null;
  rewatch: boolean | null;
  onScore: (s: RatingScore | null) => void;
  onRewatch: (r: boolean | null) => void;
}) {
  const scores: { value: RatingScore; label: string }[] = [
    { value: 2, label: "👍👍" },
    { value: 1, label: "👍" },
    { value: -1, label: "👎" },
    { value: -2, label: "👎👎" },
  ];

  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {person}
      </span>
      <div className="flex gap-2 mt-2">
        {scores.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onScore(score === value ? null : value)}
            className="flex-1 rounded-xl py-2 text-sm border transition-all border-white/8 bg-white/5 text-zinc-400 hover:text-zinc-300"
            style={score === value ? {
              color,
              backgroundColor: `${color}26`,
              borderColor: `${color}80`,
            } : undefined}
          >
            {label}
          </button>
        ))}
      </div>
      {score !== null && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onRewatch(rewatch === true ? null : true)}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-all border-white/8 bg-white/5 text-zinc-500"
            style={rewatch === true ? {
              color,
              backgroundColor: `${color}26`,
              borderColor: `${color}80`,
            } : undefined}
          >
            Would rewatch
          </button>
        </div>
      )}
    </div>
  );
}
