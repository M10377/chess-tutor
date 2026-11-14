# 4. Phased roadmap

**Effort assumptions.** Estimates are in focused build days by Claude in this repo, with Micah testing in his browser. A "day" is roughly one thread session that ships a reviewed, merged PR. Content and evaluation work is counted separately because it needs chess verification time, not coding time. All initiatives keep the app static (GitHub Pages), free, and local-first, with no paid API or hosted backend (Micah, 2026-11-14).

**Recurring costs.** None in Near-term or Next. The only optional recurring cost anywhere is a user-supplied API key (Later, L1), billed to the user and off by default.

**Data and licensing.** Stockfish (GPL-3, already shipped, source available upstream). lichess puzzle database (CC0, attribution courtesy). lichess tablebase API (free, online only, rate-limited; do not depend on it offline). Maia weights (GPL-3) only if ever bundled. No chess.com content is copied; chess.com games come through its public API.

## Tutor decision (revised per Micah, 2026-11-14)

**Recommendation: ship Path 1 (built-in rule-based explanations and hints) plus Path 3 (board-aware handoff to Claude or ChatGPT) in the first release. Keep Path 2 (local model) as an optional, Mac-only "Explain more" add-on, and only if it passes the bar below. No paid provider in the first release.**

Why (evidence in `deep-dives.md` § 3.3 and § 3.6, `results/`):

- Path 1 is the only path that is correct by construction, works offline and on the phone, needs no setup, answers in under 10 ms, and makes the spoiler controls exact. Its weakness is formulaic prose and weak level adaptation, which the handoff covers.
- Path 3 gives the best teaching prose and real conversation for $0 extra, works on the phone, but the app cannot check the answer, and the player leaves the app.
- Path 2 failed the bar in the one configuration fully measured on Micah's M4: qwen3:4b took a median 137 s per answer (bar: 8 s), spoiled 9/9 hints, and named unsupported moves in 2 answers, because it writes its reasoning into the answer. Fairer reruns (reasoning off; gemma3:4b) did not finish; see `deep-dives.md` § 3.6. Even if they pass, Path 2 is Mac-only and cannot be more correct than Path 1.

**Bar for enabling Path 2 by default on Micah's Mac** (all on the 32 tasks): median time to first word <= 2 s and total <= 8 s at Normal depth; 0 unsupported moves in at least 90% of answers; hint spoiler rate (full) <= 10%; T4 says illegal and fixes material; T6 does not call the draw a win; Mac stays responsive. Status 2026-11-14: missed on every speed and spoiler criterion in the one complete run; reruns pending. If it misses, Path 2 stays an opt-in experiment and the app falls back to Path 1 + handoff, which is the spec's required fallback anyway.

**Paid provider (BYOK) analysis, kept for later.** Cost per explanation at list prices (Anthropic model table cached 2026-11-03): with about 1,000 input and 400 to 1,200 output tokens, roughly **$0.0005 to $0.001 on Haiku 5.5, $0.006 to $0.014 on Sonnet 5.5, $0.012 to $0.028 on Opus 5.5** (thinking tokens bill as output; Opus 5.5 cannot turn thinking off). OpenAI prices not verified in this benchmark. Key security: a key in localStorage on `m10377.github.io` is readable by any script on that origin, and **every GitHub Pages project under the same account shares that origin**; mitigations would be a dedicated low-limit key, session-only storage by default, a strict Content-Security-Policy, and ideally a separate origin (custom domain). Anthropic's TypeScript SDK supports browser use only with an explicit opt-in flag for exactly this reason (verify at implementation). Accuracy: tool use (letting the model call our Stockfish and chess.js) is what reduces wrong claims (ACT-Eval 2026 abstract: GPT-5.4 wrong on 22% of sub-claims without tools). This is now **Later (L1)** and optional.

## Near-term (next 2 to 4 weeks)

### N1. Guided mistake review with built-in explanations and hints (first slice)

- **Player problem**: sees *that* a move was bad but not *why*, cannot retry, must leave the app to learn anything.
- **Benchmark**: chess.com Game Review Retry + Show Idea + Coach (Diamond for full coverage). Exceed it on: free and unlimited, spoiler control, every explanation engine-checked.
- **Scope**: key-moments list; retry on an interactive board; Path 1 hint ladder and explanations at 3 depths; settings for depth and hint mode; Blunder for allowing forced mate; Miss class; MultiPV 3 for the moment positions; board-aware handoff buttons (Claude and ChatGPT). Full tickets in `first-slice.md`.
- **Code areas**: `src/components/Replay.tsx`, new `src/components/KeyMoments.tsx`, new `src/lib/coach/` (motifs, hints, explain; ported from `docs/benchmark/tools/rule-tutor.mjs`), `src/lib/review.ts` (labels), `src/lib/engine.ts` (MultiPV), `src/lib/tutor.ts` (handoff prompts), `src/lib/store.ts` (settings).
- **Dependencies**: none external.
- **Effort**: 5 to 7 build days + 1 day of content/eval (motif templates, verifying 20 extra review positions).
- **Acceptance**: G1 5...Bxd1 labelled Blunder; G1/G2 rerun gives 13/13 and expected labels; key moments appear within 1 s after analysis; hint level 1 spoiler rate 0% on all 9 hint tasks; 0 unsupported moves in Path 1 output on all 32 tasks; teaching-quality median >= 2 on the 0-3 anchors; Micah completes the retry flow on a real game on his phone.

### N2. Rated themed tactics from the lichess CC0 database

- **Player problem**: not enough practice; chess.com free gives 3 puzzles a day.
- **Benchmark**: lichess puzzles (unlimited, Glicko-2, themes). Parity, plus own-game puzzles in the same queue and the N1 hint ladder.
- **Scope**: offline build script to filter the CC0 CSV (popularity >= 85, plays >= 500, RD <= 90, rating 400 to 1800) into rating-band chunks; puzzle rating (Glicko-2); multi-move validation; theme picker (12 themes); daily mix with due own-game puzzles.
- **Code areas**: `src/components/Puzzles.tsx`, `src/lib/store.ts`, new `scripts/build-puzzles.mjs`, `public/puzzles/*.json`.
- **Dependencies**: N1's hint ladder and multi-move validator (shared code). Build-time download of the lichess CSV (about 250 MB compressed; streamed, not committed).
- **Effort**: 4 to 5 build days. Data ~5 MB served statically in chunks.
- **Acceptance**: P1-P8 load and validate (multi-move, alternatives accepted); after 30 puzzles the rating is within the band where first-try success is 50 to 75%; theme filter returns only matching puzzles; works offline after first load of a band.

### N3. Tutor evaluation harness in CI-like form

- **Player problem**: wrong explanations teach wrong chess.
- **Scope**: promote `docs/benchmark/tools/` scripts to `npm run eval:tutor`; run Path 1 on all 32 tasks on every PR that touches `src/lib/coach/`; keep Path 2 runner for local use; add tasks whenever a real-game explanation is wrong.
- **Effort**: 1 day. **Acceptance**: command exits non-zero on any unsupported move, any level-1 spoiler, or a T4/T6 failure.

### N4. Backup and restore

- **Player problem**: all progress lives in one browser's localStorage.
- **Scope**: "Download my data" (JSON) and "Restore" on the Progress tab. **Effort**: 0.5 day. **Acceptance**: export on desktop, import on phone, same puzzle queue and stats.

## Next (1 to 3 months)

### X1. Analysis board and "my idea" questions

- Interactive board from any position with MultiPV 3; player can propose a move and ask "Is this good?" (Path 1 critique; T2/T5 style), and hand the new position to Claude/ChatGPT. Effort 3 days. Acceptance: T2, T4 and T5 tasks answered correctly in-app by Path 1 from the board.

### X2. Mistake motif tagging and insights

- Run Path 1 detectors over every reviewed mistake; Progress shows "your top 3 patterns" (e.g. "allowed back-rank mate 3 times"), plus time-use from chess.com `%clk` comments (moves played in under 5 s that were blunders). Benchmark: Aimchess insights (free once a month). Effort 3 days. Acceptance: on 20 of Micah's games, 80% of tagged mistakes match my manual tag on a 20-mistake sample.

### X3. Micro-lessons triggered by repeated mistakes

- 8 to 10 lessons (hanging pieces, checks-captures-threats, back rank, fork, pin, skewer, mate in 1/2 patterns, opposition, KQ v K, Lucena/Philidor as later items). Each: worked example, 2 near-transfer, 1 far-transfer, then the player's own mistake. **Content production**: about 1 hour per lesson to author + `verify-fixtures.mjs` check. Benchmark: lichess /practice. Effort 3 build days + 10 content hours. Acceptance: every lesson position engine/tablebase-verified; Micah's repeat rate of the lesson's motif drops over the following 10 games (observational, small sample).

### X4. Endgame sparring

- Play E1-E4 (and lesson endgames) against Stockfish from the position until the goal; tablebase verdict shown when online. Benchmark: lichess /practice. Effort 2 days. Acceptance: E1 mate achieved within 50 moves against the engine; E3/E4 draws detected; a losing move gets an immediate "this throws away the draw" from the tablebase/engine.

### X5. Optional local model "Explain more" (Path 2), Mac only

- Only if Path 2 passed the bar above. Settings: model host, model name, test button; app sends the `tutor-prompt.mjs` prompt, streams the answer, checks it with `tutor-score.mjs`, hides it and shows Path 1 if it names an unsupported move or spoils a hint. Requires `OLLAMA_ORIGINS` set. Effort 2 days. Acceptance: same bar as above inside the app; graceful fallback when Ollama is off.

### X7. Opening book with plain-language explanations (added 2026-11-14 at Micah's request)

- **Player problem**: Micah asked whether we could "pre-load what every move means" to avoid paying for AI. That is only possible in the opening, where games follow known paths. After the opening the number of positions explodes, and the built-in Stockfish and motif tutor (N1) takes over.
- **Benchmark**: chess.com opening explorer (4 moves free, unlimited on Gold) and Chessable courses (paid). lichess explorer (free on the website). Exceed for our player by explaining the *idea* of each move in plain words, offline, for the lines the player actually plays.
- **Scope**:
  1. Name every opening position and mark "Book" moves in reviews, using the lichess opening names dataset (about 3,860 named lines with ECO code, moves and position keys).
  2. A move tree for the first 8 to 12 moves of the main lines, starting with the openings in Micah's own games (Progress tab already lists them). Each node shows the common replies with how often they are played and how they score, and a 1-3 sentence explanation of the idea ("c3 prepares d4 so a pawn can recapture in the centre").
  3. Leaving book in a reviewed game shows "You left book here; the usual move was X because ...", and the position becomes a recall card (ties into L3).
  4. Past the book, explanations come from N1's built-in tutor; the chat handoff stays available.
- **Data sources and licences (checked 2026-11-14)**:

  | Source | What we use | Licence / access | OK to ship in the app? |
  |---|---|---|---|
  | lichess-org/chess-openings (GitHub; mirrored on Hugging Face as Lichess/chess-openings) | Opening names, ECO, move sequences, position keys | CC0 1.0 (Hugging Face dataset card) | Yes, no conditions; credit as courtesy |
  | lichess game database (database.lichess.org) | Move frequencies and scores per opening position, computed at build time from a sample of rated games (e.g. both players 1200-2000) | CC0 | Yes; we ship only the small derived tree, not the games |
  | Stockfish 19 (already in the app) | Engine eval of each book move, so we never call a bad move "book-good" | GPL-3 | Yes, already shipped |
  | Explanations we write ourselves | The plain-language idea for each move, checked against the engine with `verify-fixtures.mjs` | Ours | Yes |
  | Wikibooks "Chess Opening Theory" | Reference for authoring; optional short excerpts | CC BY-SA (shown on every page) | Only with attribution and the excerpts kept under CC BY-SA in a separate data file; prefer writing our own text and using it as a reference only |
  | lichess opening explorer API (explorer.lichess.ovh) | Live stats | Free, but now returns 401 without a lichess login token (checked 2026-11-14) | Not for the default app; a later "connect lichess" option could use it |
  | chess.com explorer, Chessable courses, books | none | Proprietary | No |

- **Content production**: about 40 key positions for the openings Micah plays first (e.g. Italian Game as White; his replies to 1.e4 and 1.d4 as Black), then about 150 positions for the most common beginner openings. Rough cost: 5 to 10 minutes per position to write and engine-check, so about 5 hours, then about 15 hours. Each position's text lives in `public/book/*.json` with its FEN key, so it can be reviewed and corrected without touching code.
- **Code areas**: new `scripts/build-book.mjs` (reads the CC0 names TSVs and a game sample, writes the tree), `public/book/`, `src/lib/book.ts` (lookup by position key), `Replay.tsx` and N1 key-moments (Book label, "left book" note), `Progress.tsx` (link from your openings table to the book).
- **Dependencies**: N1 (labels and explanation card). Build-time download of one month of lichess games (several GB compressed, streamed; nothing large committed).
- **Effort**: 3 build days plus the content hours above. Shipped data about 1-2 MB, loaded on demand.
- **Acceptance**: every opening in Micah's last 50 games gets a name; G2 (Opera Game) shows 1.e4 e5 2.Nf3 d6 as Book and names "Philidor Defense"; every book move whose engine eval is more than 1 pawn worse than the best move is flagged rather than presented as good; every explanation passes an engine check of the moves it names; works offline.
- **Priority**: Next. The opening is not where a 950 player loses most games (see `REPORT.md`), but naming openings and marking book moves is cheap and makes reviews friendlier. The explained tree grows with Micah's own repertoire.

### X6. Daily training queue and onboarding

- First-run card explaining the 3 things the app does; a daily queue (due own puzzles, 10 rated puzzles, 1 key moment from the last game). Ethical retention: no streak shaming, no fake urgency. Effort 2 days.

## Later

- **L1. Bring-your-own-key provider (Claude or OpenAI), optional, off by default**, with tool use against our engine and the output checker, separate origin for key safety. Gate: N3 harness shows a teaching-quality gain over Path 1 + handoff that Micah cares about.
- **L2. FSRS scheduling** once there are 200+ puzzle reviews to fit parameters.
- **L3. Opening recall from own games** (detect Micah's most common lines; SRS drill; O1 style), built on the X7 opening book. Benchmark Chessable MoveTrainer.
- **L4. Accessibility**: keyboard move entry, labelled squares, screen-reader move announcements (lichess blind mode is the benchmark).
- **L5. PWA/offline install**, lichess game import, multi-threaded engine via a COOP/COEP service worker.

## Deferred or out of scope

Bots and human-like sparring (link to lichess Maia bots), community, coach workflows, localization, voice, paid content/courses, accounts and server sync. Revisit only if the audience grows beyond Micah.

## Build vs integrate decisions

| Need | Decision | Why |
|---|---|---|
| Puzzles | Integrate lichess CC0 data, build the trainer | Data is free and better than anything we could author |
| Rules / first lessons | Link to lichess /learn | Free and good; not our differentiator |
| Opening book | Integrate CC0 names + CC0 game stats, build our own explanations | No free, shippable source of explanations exists; Wikibooks text is CC BY-SA, so reference only |
| Explanations | Build (Path 1) + integrate the user's own chat (Path 3) | $0, correct by construction, phone-friendly |
| Local model | Integrate Ollama, optional | Free but Mac-only and needs setup |
| Bots | Link to lichess | Large effort, no edge for us |
| Tablebase | Integrate lichess API when online | 7-piece tables are too big to ship |
