"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { POSTER_BASE } from "@/lib/tmdb";
import { useUser } from "@/components/providers";

interface OnboardingTitle {
  historyId: string;
  title: {
    id: string;
    tmdbId: number;
    title: string;
    year: number | null;
    posterPath: string | null;
    genres: string[];
    runtime: number | null;
    summary: string | null;
    directors: string[];
  };
  ratings: { person: string; score: number | null }[];
}

type Score = -2 | -1 | 1 | 2;

const SCORE_OPTIONS: { value: Score; label: string; emoji: string }[] = [
  { value: -2, emoji: "👎👎", label: "Hated it" },
  { value: -1, emoji: "👎", label: "Meh" },
  { value: 1, emoji: "👍", label: "Liked it" },
  { value: 2, emoji: "👍👍", label: "Loved it" },
];

export function OnboardingFlow() {
  const { colors } = useUser();
  const [titles, setTitles] = useState<OnboardingTitle[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [artemScore, setArtemScore] = useState<Score | null>(null);
  const [alexaScore, setAlexaScore] = useState<Score | null>(null);
  const [artemNote, setArtemNote] = useState("");
  const [alexaNote, setAlexaNote] = useState("");
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        setTitles(data.entries);
        setLoading(false);
      });
  }, []);

  const current = titles[index];

  const resetScores = useCallback((entry: OnboardingTitle | undefined) => {
    if (!entry) return;
    const artemExisting = entry.ratings.find((r) => r.person === "artem");
    const alexaExisting = entry.ratings.find((r) => r.person === "alexa");
    setArtemScore(artemExisting?.score as Score | null ?? null);
    setAlexaScore(alexaExisting?.score as Score | null ?? null);
    setArtemNote("");
    setAlexaNote("");
  }, []);

  useEffect(() => {
    resetScores(current);
  }, [current, resetScores]);

  async function submitAndNext() {
    if (!current) return;
    setSaving(true);

    const promises: Promise<unknown>[] = [];
    if (artemScore !== null) {
      promises.push(
        fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titleId: current.title.id,
            person: "artem",
            score: artemScore,
            note: artemNote || undefined,
          }),
        })
      );
    }
    if (alexaScore !== null) {
      promises.push(
        fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titleId: current.title.id,
            person: "alexa",
            score: alexaScore,
            note: alexaNote || undefined,
          }),
        })
      );
    }

    await Promise.all(promises);
    setCompleted((c) => c + 1);
    setSaving(false);
    goNext();
  }

  function goNext() {
    if (index < titles.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setIndex(titles.length); // triggers done state
    }
  }

  function skip() {
    goNext();
  }

  async function haventSeen() {
    if (!current) return;
    setSaving(true);
    await fetch("/api/onboarding/move-to-watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId: current.historyId }),
    });
    setSaving(false);
    goNext();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="text-zinc-500 text-sm">Loading watched titles...</div>
      </div>
    );
  }

  if (titles.length === 0 || index >= titles.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
        <div className="text-4xl">🎬</div>
        <h1 className="text-xl font-semibold">
          {titles.length === 0 ? "Nothing to rate" : "All done!"}
        </h1>
        <p className="text-sm text-zinc-400">
          {titles.length === 0
            ? "Import some watched movies first, then come back here."
            : `You rated ${completed} titles. Your taste profile is building up.`}
        </p>
        <a
          href="/"
          className="inline-block rounded-[50px] a-bg px-6 py-3 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
        >
          Go to Tonight
        </a>
      </div>
    );
  }

  const { title } = current;
  const progress = ((index + 1) / titles.length) * 100;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Rate your watched movies</span>
          <span>{index + 1} / {titles.length}</span>
        </div>
        <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full a-bg transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Movie card */}
      <div className="rounded-[24px] border border-white/8 bg-zinc-900 overflow-hidden">
        <div className="flex gap-4 p-4">
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
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                No poster
              </div>
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
            {title.genres.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {title.genres.slice(0, 3).map((g) => (
                  <span key={g} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                    {g}
                  </span>
                ))}
              </div>
            )}
            {title.summary && (
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{title.summary}</p>
            )}
          </div>
        </div>

        {/* Rating sections */}
        <div className="border-t border-white/6 p-4 space-y-4">
          <RatingRow
            person="Artem"
            color={colors.artem}
            score={artemScore}
            onScore={setArtemScore}
            note={artemNote}
            onNote={setArtemNote}
          />
          <RatingRow
            person="Alexa"
            color={colors.alexa}
            score={alexaScore}
            onScore={setAlexaScore}
            note={alexaNote}
            onNote={setAlexaNote}
          />
        </div>

        {/* Actions */}
        <div className="flex border-t border-white/6 divide-x divide-white/6">
          <button
            onClick={haventSeen}
            disabled={saving}
            className="flex-1 py-3.5 text-xs font-medium text-amber-500/80 transition-colors hover:bg-white/5 active:bg-white/10 disabled:opacity-30"
          >
            Haven't seen
          </button>
          <button
            onClick={skip}
            className="flex-1 py-3.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-white/5 active:bg-white/10"
          >
            Skip
          </button>
          <button
            onClick={submitAndNext}
            disabled={saving || (artemScore === null && alexaScore === null)}
            className="flex-1 py-3.5 text-sm font-semibold a-text transition-colors hover:bg-white/5 active:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Next →"}
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-[10px] text-zinc-600">
        Pick a rating for each person, then hit Next
      </p>
    </div>
  );
}

function RatingRow({
  person,
  color,
  score,
  onScore,
  note,
  onNote,
}: {
  person: string;
  color: string;
  score: Score | null;
  onScore: (s: Score) => void;
  note: string;
  onNote: (n: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium" style={{ color }}>
        {person}
      </span>
      <div className="flex gap-2">
        {SCORE_OPTIONS.map((opt) => {
          const active = score === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onScore(opt.value)}
              className={active
                ? "flex-1 rounded-[16px] border py-2.5 text-center transition-all active:scale-95 cursor-pointer"
                : "flex-1 rounded-[16px] border border-white/10 bg-white/5 hover:border-white/20 py-2.5 text-center transition-all active:scale-95 cursor-pointer"
              }
              style={
                active
                  ? {
                      borderColor: hexAlpha(color, 0.5),
                      backgroundColor: hexAlpha(color, 0.15),
                    }
                  : undefined
              }
            >
              <div className="text-base">{opt.emoji}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">{opt.label}</div>
            </button>
          );
        })}
      </div>
      {score !== null && (
        <input
          type="text"
          placeholder={`${person}'s quick note (optional)`}
          value={note}
          onChange={(e) => onNote(e.target.value)}
          className="w-full rounded-[50px] border border-white/8 bg-white/5 px-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:a-border-50 transition-colors"
        />
      )}
    </div>
  );
}

function hexAlpha(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
