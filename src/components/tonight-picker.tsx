"use client";

import { useState } from "react";
import Image from "next/image";
import type { TonightContext, Recommendation, RecommendSlot, EnergyLevel, MediaType, WatchWith } from "@/lib/types";
import { POSTER_BASE } from "@/lib/tmdb";
import { useUser } from "@/components/providers";

const MOODS = ["Comedy", "Drama", "Thriller", "Horror", "Action", "Sci-Fi", "Romance", "Documentary", "Animation"];
const VIBES = [
  "Date night", "Comfort rewatch", "Deep focus", "Something new",
  "Feel-good", "Mind-bending", "Emotional gut-punch", "Edge of seat",
  "Slow burn", "Visual feast", "Dark & twisted",
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: "low", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "Intense" },
];

const TYPE_OPTIONS: { value: MediaType; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "movie", label: "Movie" },
  { value: "tv", label: "TV Show" },
];

const WATCH_WITH_OPTIONS: { value: WatchWith; label: string }[] = [
  { value: "together", label: "Together" },
  { value: "artem_solo", label: "Artem solo" },
  { value: "alexa_solo", label: "Alexa solo" },
];

const FIT_COLORS: Record<string, string> = {
  great: "text-emerald-400",
  good: "text-zinc-300",
  meh: "text-zinc-500",
  risky: "text-red-400",
};
const FIT_ICONS: Record<string, string> = { great: "▲▲", good: "▲", meh: "—", risky: "▼" };

const SLOT_META: Record<RecommendSlot, { label: string; colorKey: "artem" | "alexa" | "accent" | string }> = {
  safe:     { label: "Safe pick",     colorKey: "#38bdf8" },
  artem:    { label: "Artem's pick",  colorKey: "artem" },
  alexa:    { label: "Alexa's pick",  colorKey: "alexa" },
  couple:   { label: "Together pick", colorKey: "accent" },
  wildcard: { label: "Wildcard",      colorKey: "#c084fc" },
};

type Score = -2 | -1 | 1 | 2;
const SCORE_OPTIONS: { value: Score; emoji: string; label: string }[] = [
  { value: -2, emoji: "👎👎", label: "Hated" },
  { value: -1, emoji: "👎", label: "Meh" },
  { value: 1, emoji: "👍", label: "Liked" },
  { value: 2, emoji: "👍👍", label: "Loved" },
];

function hexAlpha(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const defaultContext: TonightContext = { energy: null, moods: [], mediaType: "any", vibe: [], watchWith: "together", veto: "" };

export function TonightPicker() {
  const { colors, accent } = useUser();
  const [ctx, setCtx] = useState<TonightContext>(defaultContext);
  const [picks, setPicks] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyWatchlist, setEmptyWatchlist] = useState(false);
  const [ratingModal, setRatingModal] = useState<Recommendation | null>(null);

  function toggleMood(m: string) {
    setCtx((c) => ({ ...c, moods: c.moods.includes(m) ? c.moods.filter((x) => x !== m) : [...c.moods, m] }));
  }
  function toggleVibe(v: string) {
    setCtx((c) => ({ ...c, vibe: c.vibe.includes(v) ? c.vibe.filter((x) => x !== v) : [...c.vibe, v] }));
  }

  async function findPicks() {
    setLoading(true); setError(null); setPicks(null); setEmptyWatchlist(false);
    try {
      const res = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      if (data.emptyWatchlist) setEmptyWatchlist(true);
      else setPicks(data.picks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(titleId: string | undefined, action: "not_tonight" | "vetoed" | "skip") {
    if (!titleId) return;
    // Find the watchlist entry for this title
    await fetch(`/api/watchlist/by-title/${titleId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action }) });
    if (picks) setPicks(picks.filter((p) => p.titleId !== titleId));
  }

  function dismissPick(titleId: string) {
    if (picks) setPicks(picks.filter((p) => p.titleId !== titleId));
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>Tonight</h1>
        <p className="text-sm text-zinc-400 mt-0.5">What are we watching?</p>
      </div>

      <div className="rounded-[24px] border border-white/8 bg-zinc-900 p-5 space-y-5">
        <div>
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Who's watching</span>
          <div className="mt-2 flex gap-2">
            {WATCH_WITH_OPTIONS.map(({ value, label }) => (
              <Chip key={value} active={ctx.watchWith === value} accent={accent} onClick={() => setCtx((c) => ({ ...c, watchWith: value }))}>{label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Type</span>
          <div className="mt-2 flex gap-2">
            {TYPE_OPTIONS.map(({ value, label }) => (
              <Chip key={value} active={ctx.mediaType === value} accent={accent} onClick={() => setCtx((c) => ({ ...c, mediaType: value }))}>{label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Energy</span>
          <div className="mt-2 flex gap-2">
            {ENERGY_OPTIONS.map(({ value, label }) => (
              <Chip key={value} active={ctx.energy === value} accent={accent} onClick={() => setCtx((c) => ({ ...c, energy: c.energy === value ? null : value }))}>{label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Mood</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOODS.map((m) => <Chip key={m} active={ctx.moods.includes(m)} accent={accent} onClick={() => toggleMood(m)}>{m}</Chip>)}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Vibe</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIBES.map((v) => <Chip key={v} active={ctx.vibe.includes(v)} accent={accent} onClick={() => toggleVibe(v)}>{v}</Chip>)}
          </div>
        </div>
        <input
          type="text"
          placeholder="Hard veto tonight (eg. nothing bleak)"
          value={ctx.veto}
          onChange={(e) => setCtx((c) => ({ ...c, veto: e.target.value }))}
          className="w-full rounded-[50px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:a-border-50 transition-colors"
        />
      </div>

      <button
        onClick={findPicks}
        disabled={loading}
        className="w-full rounded-[50px] a-bg py-3.5 text-[15px] font-semibold text-black transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "Finding picks…" : "Find picks →"}
      </button>

      {error && <div className="rounded-[16px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      {emptyWatchlist && (
        <div className="rounded-[24px] border border-white/8 bg-zinc-900 p-6 text-center space-y-2">
          <p className="text-zinc-300 font-medium">Watchlist is empty</p>
          <p className="text-sm text-zinc-500">Add some titles to your watchlist first — head to the Watchlist tab.</p>
        </div>
      )}

      {picks && picks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Picks for tonight</h2>
          {picks.map((pick) => (
            <RecommendCard
              key={pick.titleId}
              pick={pick}
              colors={colors}
              accent={accent}
              onAction={handleAction}
              onAlreadyWatched={() => setRatingModal(pick)}
              onDismiss={dismissPick}
            />
          ))}
        </div>
      )}

      {picks && picks.length === 0 && (
        <div className="rounded-[24px] border border-white/8 bg-zinc-900 p-6 text-center">
          <p className="text-sm text-zinc-400">No picks matched tonight's vibe. Try loosening the filters.</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="rounded-[24px] border border-white/8 bg-zinc-900 h-52 animate-pulse" />)}
        </div>
      )}

      {ratingModal && (
        <RatingModal
          pick={ratingModal}
          colors={colors}
          onClose={() => setRatingModal(null)}
          onSubmit={() => {
            dismissPick(ratingModal.titleId);
            setRatingModal(null);
          }}
        />
      )}
    </div>
  );
}

function RecommendCard({ pick, colors, accent, onAction, onAlreadyWatched, onDismiss }: {
  pick: Recommendation;
  colors: { artem: string; alexa: string };
  accent: string;
  onAction: (titleId: string | undefined, action: "not_tonight" | "vetoed" | "skip") => void;
  onAlreadyWatched: () => void;
  onDismiss: (titleId: string) => void;
}) {
  const meta = SLOT_META[pick.slot];
  const isDiscovery = pick.titleId.startsWith("discovery-");

  const slotColor =
    meta.colorKey === "artem" ? colors.artem :
    meta.colorKey === "alexa" ? colors.alexa :
    meta.colorKey === "accent" ? accent :
    meta.colorKey;

  async function watchLater() {
    await fetch(`/api/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: pick.title.tmdbId, type: pick.title.type }),
    });
    onDismiss(pick.titleId);
  }

  return (
    <div
      className="rounded-[24px] border overflow-hidden"
      style={{ borderColor: hexAlpha(slotColor, 0.2), backgroundColor: hexAlpha(slotColor, 0.06) }}
    >
      <div className="flex gap-4 p-4">
        {/* Larger poster */}
        <div className="shrink-0 w-24 h-36 rounded-[8px] overflow-hidden bg-zinc-800">
          {pick.title.posterPath
            ? <Image src={`${POSTER_BASE}${pick.title.posterPath}`} alt={pick.title.title} width={96} height={144} className="object-cover w-full h-full" />
            : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">No poster</div>}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: slotColor }}>
              {meta.label}
              {isDiscovery && <span className="ml-1.5 text-[9px] font-medium text-zinc-500 normal-case tracking-normal">· New find</span>}
            </span>
            <h3 className="text-[15px] font-semibold text-zinc-50 leading-tight mt-0.5">
              {pick.title.title}
              {pick.title.year && <span className="font-normal text-zinc-500 ml-1.5 text-sm">{pick.title.year}</span>}
            </h3>
          </div>
          {pick.title.genres.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {pick.title.genres.slice(0, 3).map((g) => <span key={g} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">{g}</span>)}
              {pick.title.runtime && <span className="text-[10px] text-zinc-600">{pick.title.runtime} min</span>}
            </div>
          )}
          <p className="text-[13px] text-zinc-300 leading-relaxed">{pick.whyTonight}</p>
          <p className="text-[13px] text-zinc-500 leading-relaxed">⚠ {pick.whyMiss}</p>
          <div className="flex gap-3 text-[11px]">
            <span><span className="text-zinc-500">Artem </span><span className={FIT_COLORS[pick.artemFit]}>{FIT_ICONS[pick.artemFit]}</span></span>
            <span><span className="text-zinc-500">Alexa </span><span className={FIT_COLORS[pick.alexaFit]}>{FIT_ICONS[pick.alexaFit]}</span></span>
            {pick.providers.length > 0 && <span className="text-zinc-600 ml-auto truncate">{pick.providers.slice(0, 2).join(" · ")}</span>}
          </div>
        </div>
      </div>
      <div className="flex border-t border-white/6 divide-x divide-white/6">
        {isDiscovery ? (
          <>
            <ActionBtn onClick={watchLater}>Save to watchlist</ActionBtn>
            <ActionBtn onClick={onAlreadyWatched}>Already watched</ActionBtn>
            <ActionBtn onClick={() => onDismiss(pick.titleId)}>Dismiss</ActionBtn>
          </>
        ) : (
          <>
            <ActionBtn onClick={watchLater}>Watch later</ActionBtn>
            <ActionBtn onClick={onAlreadyWatched}>Already watched</ActionBtn>
            <ActionBtn onClick={() => onAction(pick.titleId, "not_tonight")}>Not tonight</ActionBtn>
            <ActionBtn onClick={() => onAction(pick.titleId, "vetoed")} className="text-red-500/80">Veto</ActionBtn>
          </>
        )}
      </div>
    </div>
  );
}

function RatingModal({ pick, colors, onClose, onSubmit }: {
  pick: Recommendation;
  colors: { artem: string; alexa: string };
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [artemScore, setArtemScore] = useState<Score | null>(null);
  const [alexaScore, setAlexaScore] = useState<Score | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    let titleId = pick.titleId;

    // For discovery picks, create the title in DB first
    if (titleId.startsWith("discovery-")) {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: pick.title.tmdbId, type: pick.title.type }),
      });
      const data = await res.json();
      titleId = data.entry?.titleId ?? titleId;
    }

    // Log to history
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleId,
        watchedBy: "both",
        together: true,
        notes: notes || undefined,
        ...(artemScore !== null && { artemRating: { score: artemScore, note: notes || undefined } }),
        ...(alexaScore !== null && { alexaRating: { score: alexaScore, note: notes || undefined } }),
      }),
    });
    setSaving(false);
    onSubmit();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 mb-0 sm:mb-0 rounded-t-[24px] sm:rounded-[24px] border border-white/10 bg-zinc-900 overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            {pick.title.posterPath && (
              <div className="shrink-0 w-16 h-24 rounded-[8px] overflow-hidden bg-zinc-800">
                <Image src={`${POSTER_BASE}${pick.title.posterPath}`} alt={pick.title.title} width={64} height={96} className="object-cover w-full h-full" />
              </div>
            )}
            <div>
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Already watched</p>
              <h3 className="text-[15px] font-semibold text-zinc-50">{pick.title.title}</h3>
            </div>
          </div>

          <RatingRow person="Artem" color={colors.artem} score={artemScore} onScore={setArtemScore} />
          <RatingRow person="Alexa" color={colors.alexa} score={alexaScore} onScore={setAlexaScore} />

          <textarea
            placeholder="Quick notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[16px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:a-border-50 transition-colors resize-none"
          />
        </div>
        <div className="flex border-t border-white/6 divide-x divide-white/6">
          <button onClick={onClose} className="flex-1 py-4 text-sm font-medium text-zinc-500 cursor-pointer hover:bg-white/5 transition-colors">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || (artemScore === null && alexaScore === null)}
            className="flex-1 py-4 text-sm font-semibold a-text cursor-pointer hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

function Chip({ active, accent, onClick, children }: { active: boolean; accent: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={active
        ? "rounded-full border px-4 py-2 text-[13px] font-medium transition-all active:scale-95 cursor-pointer"
        : "rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-300 px-4 py-2 text-[13px] font-medium transition-all active:scale-95 cursor-pointer"
      }
      style={active ? { borderColor: hexAlpha(accent, 0.5), backgroundColor: hexAlpha(accent, 0.15), color: accent } : undefined}
    >
      {children}
    </button>
  );
}

function ActionBtn({ onClick, children, className = "text-zinc-400" }: { onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} className={`flex-1 py-3.5 text-[13px] font-medium transition-colors hover:bg-white/5 active:bg-white/10 cursor-pointer ${className}`}>
      {children}
    </button>
  );
}
