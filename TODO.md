# Couple Watch Picker — Build Tracker

## V1 Scope
Workflows: Watchlist + Tonight Picker + Watch History
Stack: Next.js 16, Tailwind v4, Prisma + Supabase (Postgres), TMDB API, Claude (Anthropic)

---

## Phase 1 — Foundation
- [x] Create .figma/make/ config files
- [x] Install dependencies (prisma, @prisma/client, @anthropic-ai/sdk, zod)
- [x] Create .env.local with required env var placeholders
- [x] Set up Prisma schema (Title, WatchlistEntry, WatchHistory, Rating)
- [x] Create lib/prisma.ts, lib/tmdb.ts, lib/anthropic.ts

## Phase 2 — Core UI
- [x] App shell: layout, nav, user switcher (Artem / Alexa / Both)
- [x] Tonight Picker (home): context inputs + 5-card recommendation slate
- [x] Watchlist page: browse, filter, add, update status
- [x] Watch History page: timeline, log new entry, per-person reactions
- [x] Search + Add Title modal: TMDB search → add to watchlist

## Phase 3 — AI Recommendations
- [x] /api/recommend: fetch watchlist + taste data → Claude → 5 picks
- [ ] Recommendation cards: safe / Artem / Alexa / couple / wildcard slots
- [ ] "Why this fits" + "why it might miss" explanations

## Phase 4 — Later Workflows (not v1)
- [ ] Google Keep import flow
- [ ] Backfill mode
- [ ] Lightweight assistant chat
- [ ] Already Seen rating loop
- [ ] Solo watch recommendations

---

## Env Vars Required
- `DATABASE_URL` — Supabase Postgres connection string
- `DIRECT_URL` — Supabase direct connection (for Prisma migrations)
- `TMDB_API_KEY` — from themoviedb.org
- `ANTHROPIC_API_KEY` — from console.anthropic.com
