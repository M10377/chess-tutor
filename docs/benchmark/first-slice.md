# 5. First implementation slice: "Learn from your key moments"

**One learner-facing improvement**: after a game is analyzed, the player gets up to 3 to 5 key moments, retries each one on a live board with graduated hints they control, and gets a correct, engine-checked explanation in the app at the depth they chose, with one click to continue in Claude or ChatGPT. Costs $0, no model required, works on the phone.

**Why this slice**: top-ranked opportunity (`REPORT.md` § 3), fixes the biggest journey gap (no in-app "why", no retry), implements Micah's tutor spec (Path 1 + Path 3, depth and spoiler control), and builds the hint ladder and multi-move validator that N2 (rated puzzles) reuses.

**Out of scope for this slice**: local model (X5), paid providers (L1), rated puzzles (N2), lessons (X3).

## Tickets (in order)

### T-1. Label fixes: allowed mate = Blunder, add Miss

- **Scope**: in `src/lib/review.ts` `buildReview`, label a move `blunder` when the position before was not lost for the mover (mover not facing a forced mate) and the engine shows the opponent has a forced mate after it. Add `miss`: the mover had a forced mate or a win-% gain >= 30 available and played a move keeping less than half of the gain. Update `MoveLabel`, `SYMBOL`, counts, Progress tiles.
- **Depends on**: nothing.
- **Acceptance**: unit tests in `review.test.ts` for G1 (5...Bxd1 = blunder) and a constructed missed-mate case; G2 labels unchanged except where Miss applies; `npm test` green.

### T-2. MultiPV for key positions

- **Scope**: `Engine.evaluate(fen, depth, multipv = 1)` returns all lines; review keeps MultiPV 1 for speed; key-moment positions get MultiPV 3 at depth 16 after the main pass.
- **Depends on**: nothing.
- **Acceptance**: T3 position returns 3 lines within 0.5 pawn; review time for G2 grows by < 30%.

### T-3. Coach library (Path 1) in the app

- **Scope**: port `docs/benchmark/tools/rule-tutor.mjs` to `src/lib/coach/` (`motifs.ts`, `hints.ts`, `explain.ts`) with types; inputs are a FEN, engine lines and an optional proposed move; outputs `{ hints: [l1, l2, l3], explanation: { short, normal, deep }, motifs, drill }`. Port `tutor-score.mjs` as `coach/check.ts` and run it on every generated text in development builds.
- **Depends on**: T-2 (for alternatives).
- **Acceptance**: `npm run eval:tutor` (T-8) passes: 0 unsupported moves on 32/32 tasks, level-1 spoiler "none" on 9/9 hint tasks, T4 says illegal and material level, T6 mentions the draw.

### T-4. Key moments panel

- **Scope**: new `KeyMoments.tsx` on the review screen above the move list: the player's mistakes, blunders and misses ranked by win-% lost (max 3 if < 40 moves, else 5), each a card with move, severity, "Retry". If the player is unknown (pasted PGN without username), use the side with more errors and say so.
- **Depends on**: T-1.
- **Acceptance**: G1 shows 5...Bxd1 first, then 4...g6; tapping jumps the board to the position before the move.

### T-5. Retry on a live board with hint ladder

- **Scope**: in retry mode the board becomes interactive for the player's side (reuse the drag/tap logic from `Puzzles.tsx`); correct or tolerated move = success; wrong move = one-line refutation from the engine line + "Try again" / "Hint" / "Show answer". Hints come from T-3 and appear one level per tap. Result recorded on the existing puzzle (`store.ts`): success without hints schedules it to box 1, otherwise box 0.
- **Depends on**: T-3, T-4.
- **Acceptance**: in G1, playing Bxd1 again shows "After Bxd1, White has Bxf7+ Ke7 Nd5#: a forced mate"; playing dxe5 shows success; level-1 hint text contains no piece name of the solution and no square of the solution.

### T-6. Explanation card with depth setting

- **Scope**: after success or reveal, show the T-3 explanation at the chosen depth, with the main line as arrows the player can step through. Settings (gear on the review page): Explanation depth Short/Normal/Deep; Hints: "Hints first" / "Show answer right away" / "No hints". Stored in localStorage.
- **Depends on**: T-3, T-5.
- **Acceptance**: switching depth changes the text immediately; "Show answer right away" skips the retry and shows the explanation; settings persist after reload.

### T-7. Board-aware handoff to Claude or ChatGPT

- **Scope**: replace `moveQuestion`/`puzzleQuestion` callers with a builder like `tutor-prompt.mjs`: current FEN, side to move, the player's move and its refutation, top 3 lines, level, chosen depth, and hint-only mode when the player is still solving. Two buttons: "Ask Claude" (`claude.ai/new?q=`) and "Ask ChatGPT" (`chatgpt.com/?q=`, falling back to copy + open). Prompts over the URL limit are copied, as today.
- **Depends on**: T-2, T-6 (depth setting).
- **Acceptance**: G1 handoff prompt contains the FEN before 5...Bxd1, "Bxd1 Bxf7+ Ke7 Nd5#", and the depth instruction; hint-mode prompt contains "Do NOT name the move"; manual check: both links open with the text pre-filled on Micah's Mac and phone.

### T-8. Eval command and benchmark rerun

- **Scope**: `npm run eval:tutor` runs `docs/benchmark/tools/verify-fixtures.mjs` + the in-app coach on `fixtures/tutor-tasks.json` and fails on any check failure. Re-run the benchmark tests below and write `results/after-first-slice.md`.
- **Depends on**: T-1 to T-7.
- **Acceptance**: command passes; results file filled in.

**Estimated effort**: 6 to 8 build days in total (T-1 0.5, T-2 0.5, T-3 2, T-4 1, T-5 1.5, T-6 1, T-7 0.5, T-8 0.5), 1 to 2 PRs per ticket group. Assumes no design system work beyond the existing CSS.

## Benchmark tests to rerun after release

| Test | Before (2026-11-14) | Target |
|---|---|---|
| G1 label on 5...Bxd1 | Mistake | Blunder |
| G1/G2 label agreement | 12/13 on G1 | 13/13 |
| Time from "Analyze" to first in-app "why" for G1 | none (no in-app why) | <= 5 s on Micah's M4 (analysis 1.2 s + render) |
| Clicks from analysis to retrying the top mistake | n/a | 1 |
| Hint level-1 spoiler rate (9 hint tasks) | 100% (only tutor prompt contains the answer) | 0% |
| Unsupported moves in in-app explanations (32 tasks) | n/a | 0 |
| T1-T6 scores (0-3) | 0, 0, 1, n/a, 0, 1 | T1 3, T2 2 (needs X1 for free-form proposals; retry covers the game case), T3 2, T4 2, T5 2 (handoff), T6 2 |
| Teaching quality median, 32 tasks (my 0-3 rating) | n/a in app | >= 2 |
| Mobile: complete a retry with hints on a 390 px screen | n/a | pass (Playwright + Micah on phone) |
| Learning outcome (observational, small n) | n/a | after 4 weeks, first-try solve rate on due own-game puzzles and blunders per game, compared with the 4 weeks before; reported with n, no causal claim |
