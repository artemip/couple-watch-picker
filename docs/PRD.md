# Couple Watch Picker PRD

## tl;dr

Build a private movie + TV picker for the household. The app is the primary interface for choosing what to watch, maintaining individual + shared taste models, and gradually rating things we've already seen.

No Letterboxd dependency. No social graph. No public profiles. The app owns the data and uses external movie metadata as needed.

The core product bet is that choosing something to watch is painful because it mixes too many jobs at once: remembering candidates, checking availability, negotiating mood/energy, avoiding bad fits, and updating taste. The app should separate those jobs and make the final decision feel lightweight.

## Goals

- Help us choose a movie or show in under ~2 minutes from the couch.
- Maintain separate taste models for Artem and Alexa.
- Maintain a shared couple taste model that reflects what works for us together.
- Replace the shared Google Keep watch list.
- Turn “we already saw that” moments into useful taste data.
- Make backfilling old movies/shows fast enough that we actually do it.
- Keep a lightweight watch history with what we watched and what we thought.

## Non-Goals

- No Letterboxd integration in v1.
- No public/social features.
- No generic media database clone.
- No AI chat as the main interface.
- No heavy review-writing workflow.
- No login ceremony for v1. This is a private household app used by exactly two people.

## Primary Users

There are two users:

- Artem.
- Alexa.

The app should treat individual taste as first-class without making account switching feel heavy. A movie or show can be good for Artem, good for Alexa, good for both together, or good for neither in a specific context.

## Core Concepts

### Title

A title is the canonical content object. It can be a movie, TV show, season, or episode depending on the source metadata. It should include enough context to support decision-making: title, year, runtime or episode length, poster, genres, cast/crew, summary, and where it can be watched.

### Watchlist

The watchlist is the shared pool of movies/shows we might watch. It starts from a one-time Google Keep import and then grows through search, recommendations, and manual adds.

### Library

The library is everything the app knows about, including watched titles, rated titles, rejected titles, vetoed titles, imported titles, and recommended titles.

### Watch History

Watch history is the timeline of what we watched, when we watched it, who watched it, and the lightweight reaction afterward.

### Individual Taste Models

Each person has a taste lane based on thumb ratings, rewatchability, tags, skips, vetoes, and “not tonight” decisions. This is not a login/profile system. It is just how the app knows whether a piece of feedback belongs to Artem, Alexa, or both.

### Couple Taste Model

The couple model captures what works for us together. This is not just an average of individual ratings. It should learn patterns like:

- Movies/shows both people like.
- Titles one person likes but the other tolerates.
- Titles better watched solo.
- Titles that are good in theory but wrong for a tired weeknight.
- Genres/runtimes/moods that create disagreement.

## Key Workflows

### 1. Google Keep Import

As a first-run flow, let us paste the existing shared Google Keep watch list into the app.

The app should:

- Parse the pasted list into candidate movie titles.
- Match titles to movie/TV metadata.
- Flag ambiguous or unmatched titles for manual cleanup.
- Deduplicate obvious repeats.
- Add resolved titles to the shared watchlist.
- Preserve unresolved rows until we dismiss or fix them.

This is a one-time migration. After import, Google Keep should no longer be part of the workflow.

### 2. Tonight Picker

The home screen should answer: “What should we watch tonight?”

Before generating recommendations, the app should let us quickly express context:

- How much time we have.
- Energy level.
- Mood.
- Streaming services available.
- Whether subtitles are ok.
- Whether we want comfort, novelty, something light, something intense, etc.
- Any hard veto for the night, eg “nothing bleak.”

The result should be a small slate, not an infinite feed. A good default is five cards:

- Safe pick.
- Artem-leaning pick.
- Alexa-leaning pick.
- Shared taste pick.
- Stretch / wildcard pick.

Each recommendation should explain:

- Why this fits tonight.
- Why it might miss.
- Predicted fit for Artem.
- Predicted fit for Alexa.
- Whether it is likely better together or solo.
- Where we can watch it.

Each card should support quick actions:

- Watch.
- Not tonight.
- Veto.
- Already seen.
- Save for later.

### 3. Watch History

The app should make it easy to log what we just watched.

A watch-history entry should capture:

- What we watched.
- Who watched it: Artem, Alexa, or both.
- Whether we watched it together.
- When we watched it.
- Lightweight reactions from each person.
- Optional tags and a short note.

The ideal interaction is closer to “we just watched X, here’s what we thought” than a formal review.

### 4. Already Seen Rating Loop

If the app recommends something one or both of us already watched, that should become a data-capture opportunity.

When we mark a movie as already seen, the app should ask:

- Who has seen it: Artem, Alexa, or both.
- Whether we watched it together.
- Artem's thumb rating, if applicable.
- Alexa's thumb rating, if applicable.
- Whether each person would rewatch it.
- A few quick tags, eg loved, fine, too slow, too bleak, comfort, rewatchable, bad fit, great together, better solo.
- Optional short note.

After saving, the app should stop recommending that movie as unwatched unless it is marked rewatchable.

### 5. Backfill Mode

Backfill mode exists to quickly rate movies/shows we've already seen, especially titles that were never in Google Keep.

This should feel like triage, not journaling.

Useful prompts could include:

- Popular titles we probably saw.
- Titles similar to things we rated.
- High-signal titles that help the app learn taste faster.
- Decade, genre, director, or actor batches.
- Titles one of us may have seen but the other has not.

Actions should be extremely fast:

- Haven't seen.
- Artem saw.
- Alexa saw.
- Both saw.
- Quick thumb rating.
- Would rewatch.
- Skip.

The goal is to make a 50-100 title backfill session realistic.

### 6. Watchlist and Library

The app should provide two browsing surfaces:

- Watchlist: movies/shows we might watch.
- Library: everything we have interacted with.

Useful filters:

- Runtime.
- Streaming provider.
- Genre.
- Mood tags.
- Unwatched by both.
- Seen by one person only.
- Rewatchable.
- High predicted couple fit.
- High disagreement risk.
- Vetoed / rejected / not tonight.

### 7. Lightweight Assistant

AI chat should not be the main interface, but a small assistant surface is useful for quick history and taste questions.

Example questions:

- What did we watch last night?
- What have we watched recently?
- What did Alexa think of that?
- What are good short comedies we haven't watched?
- What have we been rejecting lately?

The assistant should answer from app data first. It can use external metadata only when needed to explain or enrich a title.

## AI Behavior

AI should help with recommendation quality and explanation, not replace the product model.

The app should use AI to:

- Generate a small, diverse recommendation slate.
- Explain why a movie fits tonight.
- Explain why a movie might be risky.
- Identify when a movie is probably better solo.
- Recommend solo watches when something is a strong Artem or Alexa fit but weak couple fit.
- Summarize individual and couple taste models.
- Suggest useful backfill candidates.
- Answer lightweight questions about watch history and taste.

The app should not let AI invent facts about movies/shows or availability. Title facts should come from metadata providers and app history.

## Recommendation Principles

The recommendation system should optimize for context, not abstract taste.

A good recommendation is not necessarily the highest-rated title. It is the title that best fits:

- What each person tends to like.
- What works for us together.
- Tonight's time, energy, and mood.
- What is actually available to watch.
- Recent rejections and “not tonight” signals.
- Veto risk.

The system should also make compromise explicit. If a movie is more for one person than the other, say so.

## Rating Scale

Use a four-point thumb scale instead of stars:

- Two thumbs down: actively disliked.
- One thumb down: not for me / would not choose again.
- One thumb up: liked it.
- Two thumbs up: loved it / strong recommend / would rewatch.

This keeps ratings lightweight and avoids fake precision. Ratings should be captured separately for Artem and Alexa when possible, plus optional tags and notes.

Solo-watch recommendations are first-class. Some titles should be marked “Artem solo,” “Alexa solo,” or “works together” depending on predicted fit.

## Recommendation Engine

The recommendation engine should be a hybrid system, not a generic “ask an LLM what to watch” flow.

It should combine:

- Structured app history: thumb ratings, watch history, skips, vetoes, rewatchability, “not tonight” decisions, and tags.
- External metadata: runtime, genres, cast/crew, release year, popularity, summaries, and availability.
- Retrieval: find candidate titles that match the night’s constraints and the couple’s historical patterns.
- Scoring: rank candidates by predicted Artem fit, Alexa fit, couple fit, availability, runtime fit, novelty, and veto risk.
- AI reasoning: diversify the slate, explain tradeoffs, and identify why something is or is not a good fit tonight.

The LLM should have bounded access to external information. It should not freely browse the internet for every recommendation. The default flow should rely on known metadata sources and app history. External search can be used for enrichment when metadata is missing, stale, or insufficient, but the result should be saved back into the app as structured data when useful.

The UX should make recommendation confidence visible. If the app is guessing because there is not enough taste data yet, it should say that plainly and ask for lightweight ratings/backfill rather than pretending to know us.

## UX Principles

- The app should work well on a phone from the couch.
- The Tonight flow should be the default home screen.
- Choosing should feel bounded. Avoid endless browsing.
- The visual design should feel sleek, quiet, and premium.
- Every action should improve future recommendations.
- The app should make it easy to say no without losing useful signal.
- Ratings should be fast. Notes should be optional.
- Destructive actions should be reversible or confirmed.
- Copy should be short, direct, and active.

## Success Criteria

The app is successful when:

- We stop using Google Keep for movies/shows.
- We can choose something in under ~2 minutes most nights.
- The app can explain tradeoffs in a way that feels accurate.
- “Already seen” recommendations become useful instead of annoying.
- Each person can maintain their own taste without collapsing into one shared average.
- The couple taste model gets noticeably better after backfilling and normal use.
- Watch history becomes the easiest way to remember what we watched and what we thought.

## Open Questions

- What external metadata provider should be used for movies + TV?
- Which streaming availability source is reliable enough for v1?
- Should ratings use stars, thumbs, or both?
- Should the app support “solo watch” recommendations in v1, or only couple decisions?
- How much historical data do we want to import/backfill before trusting recommendations?
