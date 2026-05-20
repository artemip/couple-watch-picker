"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { POSTER_BASE } from "@/lib/tmdb";
import type { TmdbSearchResult } from "@/lib/tmdb";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function SearchModal({ open, onClose, onAdded }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/titles/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  async function addTitle(result: TmdbSearchResult) {
    setAdding(result.id);
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: result.id, type: result.media_type }),
      });
      onAdded();
    } finally {
      setAdding(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-t-[24px] sm:rounded-[24px] border border-white/10 bg-zinc-900 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-zinc-500 shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search movies and shows…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-sm text-zinc-500">Searching…</div>
          )}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="py-8 text-center text-sm text-zinc-500">No results found</div>
          )}
          {!loading && results.length === 0 && query.trim().length < 2 && (
            <div className="py-8 text-center text-sm text-zinc-600">Type a movie or show name</div>
          )}
          {results.map((result) => {
            const title = result.title ?? result.name ?? "";
            const year = (result.release_date ?? result.first_air_date ?? "").slice(0, 4);
            const isAdding = adding === result.id;
            return (
              <div
                key={result.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition-colors border-b border-white/4 last:border-0"
              >
                <div className="shrink-0 w-14 h-20 rounded-[8px] overflow-hidden bg-zinc-800">
                  {result.poster_path ? (
                    <Image
                      src={`${POSTER_BASE}${result.poster_path}`}
                      alt={title}
                      width={56}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{title}</p>
                  <p className="text-xs text-zinc-500">
                    {year && <span>{year}</span>}
                    {year && result.media_type && <span> · </span>}
                    {result.media_type === "tv" ? "Series" : "Movie"}
                  </p>
                </div>
                <button
                  onClick={() => addTitle(result)}
                  disabled={isAdding}
                  className="shrink-0 rounded-[50px] border a-border-40 px-4 py-2 text-xs font-medium a-text transition-all hover:a-bg-10 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isAdding ? "Adding…" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
