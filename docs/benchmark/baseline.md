# 1. Baseline: what Chess Tutor does today

Checked 2026-11-14 against `main` at `4ec859e` and the live site https://m10377.github.io/chess-tutor/ (Playwright Chromium, cloud container). Evidence files: `results/app-hands-on.json`, `results/engine-verification.json`, `results/screenshots/app-*.png`.

Status labels used everywhere in this folder:

- **Shipped (verified)**: exists in code and I saw it work in the live app.
- **Shipped (code only)**: exists in code; I could not exercise it end to end (reason given).
- **Partial**: some of the capability exists, with a named gap.
- **Planned**: on the original 5-phase roadmap but not built. (All 5 phases are built, so nothing is currently "planned"; new items are in `roadmap.md`.)
- **Absent**.

## Product facts

| Fact | Value | Source |
|---|---|---|
| Platform | Static web app (React 19, Vite, TypeScript), GitHub Pages | `package.json`, `.github/workflows/deploy.yml` |
| Engine | Stockfish 19 lite, single-threaded WASM in a Web Worker, depth 16, MultiPV 1 | `src/lib/engine.ts`, `src/lib/useReview.ts:7` |
| Data | Everything in the browser's localStorage under `chess-tutor:*`; no account, no sync, no backup | `src/lib/store.ts:1-25` |
| Game source | chess.com public API (finished games, by month), or pasted PGN | `src/lib/chesscom.ts`, `src/App.tsx:146-160` |
| AI tutor | "Ask Claude" buttons that open claude.ai with a pre-filled, Stockfish-grounded prompt (and copy it to the clipboard). No in-app AI, no API key, no cost | `src/lib/tutor.ts`, `src/components/AskClaude.tsx` |
| Size of codebase | ~2,000 lines; 2 unit-test files | `wc -l src/**` |
| Stage | Personal tool, single user, all 5 original phases merged 2026-11-10 to 11-13 | git log |

## Target player (verified where possible)

- **Micah, chess.com `InternalGuess`.** Public API (2026-11-14): rapid **958** after 18 games (13 W, 5 L), account's only archive is 2026-11, chess.com tactics rating range **400 to 766**. So Micah is a **new, roughly 950 rapid player**, not an established club player. This is the most important baseline fact: it moves beginner fundamentals, blunder prevention and tactics in the 600 to 1200 range ahead of openings and advanced endgames.
- Free chess.com tier, wants review, puzzles and lessons without premium (project topic).
- Constraints: chess.com blocks archive downloads from cloud servers (memory), so import tests of real games must run in a browser; **today's cloud Playwright run did load 19 of Micah's November games**, so that block is intermittent, not absolute. Tutor cost preference: free copy-to-Claude first; Micah has now asked about an own-API-key option (see `roadmap.md` X1).
- **Assumptions** (unverified): plays mostly rapid on desktop and phone; English only; no accessibility needs; no coach; studies 15 to 30 minutes a day; single device. Each one is listed in `evidence.md` § Unresolved questions with what would change if it is wrong.

## Learner journey today (first session to repeated practice)

1. **Open the site.** Games tab loads with `InternalGuess` pre-filled (PR #8). 3.7 s to network idle on the cloud run. No onboarding, no explanation of what the app does beyond "Review your chess.com games."
2. **See games.** Month picker + list of games (result, opponent and rating, colour, time class, date). Verified: 19 rows, newest first. Only the current and past months are offered.
3. **Open a game.** Board, move list, keyboard arrows. Board is view-only: you cannot move pieces to try an idea (`Replay.tsx`, `allowDragging: false`).
4. **Analyze.** One click, depth 16. Pasted-PGN path took **4 clicks and 3.5 s** to a full review for the 13-ply fixture G1; Node timing for the 34-ply G2 was 8.4 s, so a typical 80-ply rapid game is roughly 20 s. Result: accuracy (lichess formula), inaccuracy/mistake/blunder counts, eval bar and graph, per-move label, "best was X (green arrow)", engine line. Cached per game.
5. **Understand a mistake.** Only through "Ask Claude about this move" / "Ask Claude to coach this game", which leave the app for claude.ai. The app itself never explains *why* in words.
6. **Practice.** Every one of your mistakes and blunders (if you were not already lost, winBefore >= 15%) becomes a one-move puzzle. Fixture G1 produced 1 puzzle; G2 produced 0 (Black was already worse when it erred). Puzzles use Leitner boxes (1, 3, 7, 14, 30 days; misses return in 10 min). Alternative moves within 4 win-% of the best are accepted (verified engine check in `Puzzles.tsx:76-95`). No hints; "Ask Claude why" appears only after solving or revealing.
7. **Batch.** "Analyze all N unreviewed games this month" fills puzzles and stats.
8. **Track progress.** Games reviewed, W-D-L, average accuracy and 10-game trend, blunders/mistakes per game, errors by phase, openings table, rule-based "What to work on" tips, "Ask Claude for a study plan".
9. **Come back.** A red count on the Puzzles tab shows puzzles due. Nothing else brings you back (no streak, no daily goal, no reminder).

**Where the journey breaks** (each is tested in `tests.md`):

- There is no path for a player who has no games yet, or who wants to learn a concept (no lessons, no curriculum, no tactics beyond own mistakes).
- The review shows *what* was wrong but not *why* without leaving the app, and you cannot retry the position or try your own idea on the board.
- Practice volume is tiny: own-game puzzles are about 0 to 2 per game. chess.com free gives 3 rated puzzles a day; lichess gives unlimited. A 950 player needs hundreds of basic tactics.
- One labeling error found: allowing a forced mate (G1, 5...Bxd1?? allowing mate in 2) is labeled **Mistake**, not Blunder, because the win-% drop (30 to 2 = 28) is under the 30-point blunder threshold (`review.ts:56-62`). chess.com and lichess both call this a blunder.
- No "brilliant/great/miss/book" classes; Morphy's 16.Qb8+!! is just "best".

## Capability status summary (detail in `inventory.md`)

| Capability | Status | Evidence |
|---|---|---|
| chess.com import by username, month | Shipped (verified) | 19 games loaded, `app-hands-on.json` |
| PGN paste | Shipped (verified) | G1 opened and reviewed |
| lichess import | Absent | |
| Engine review: accuracy, labels, eval graph, best move arrow | Shipped (verified), with label calibration gap | G1 summary table, `engine-verification.json` |
| Multiple engine lines / alternatives | Absent (MultiPV 1) | `engine.ts:66` |
| Interactive analysis board (try moves) | Absent | `Replay.tsx` `allowDragging: false` |
| Retry a mistake inside review | Absent (puzzles cover it later) | |
| In-app explanation of mistakes | Absent; external via Claude | `tutor.ts` |
| AI tutor (copy to Claude) | Shipped (code only): prompts verified, claude.ai side needs login | `engine-verification.json` sample prompts |
| Puzzles from own mistakes + SRS | Shipped (verified) | puzzle session, wrong move, reveal |
| Multi-move puzzles | Absent (single move) | `store.ts` Puzzle has one `bestUci` |
| Hints | Absent | |
| Rated/themed general puzzles | Absent | |
| Lessons / curriculum | Absent | |
| Endgame practice | Absent | |
| Opening training / repertoire | Absent (openings table only) | `Progress.tsx` |
| Play vs bot | Absent | |
| Progress dashboard | Shipped (verified) | Progress page text |
| Mobile layout | Shipped (verified), no horizontal overflow at 390 px | `app-05-mobile-replay.png` |
| Keyboard move stepping | Shipped (verified) | arrows, Home, End |
| Screen-reader / keyboard move entry | Absent: 64 squares, 0 labelled, pieces take focus with no names | `app-hands-on.json` |
| Offline / PWA | Absent (no service worker, no manifest) | |
| Backup, export, sync | Absent | |
| Localization | Absent (English only) | |
