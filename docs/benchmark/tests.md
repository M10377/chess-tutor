# 4. Comparable tests: plan, fixtures and results

All fixtures live in `fixtures/fixtures.json` and are re-checked by:

```sh
npm ci
node --experimental-strip-types --import ./docs/benchmark/tools/ts-resolve.mjs docs/benchmark/tools/verify-fixtures.mjs --depth 20
```

That script (a) verifies every FEN, expected move and claimed line with Stockfish 19 at depth 20 (MultiPV 2 to 4), (b) checks endgames against the lichess 7-piece tablebase, and (c) runs **the app's own `buildReview` and tutor-prompt code** on the fixture games at the app's depth of 16. Output: `results/engine-verification.json` (run 2026-11-14, 2 min 6 s in the cloud container).

The verification already caught one bad fixture: my first draft of E3 (`4k3/8/4K3/4P3/8/8/8/8 w`) was meant to be a draw, and the tablebase showed it is a win. It was replaced. Lesson for every future content and AI-eval task: **no chess claim goes into a fixture, lesson or prompt without an engine or tablebase check.**

## Player profiles

| Profile | Description | Used for |
|---|---|---|
| beginner | Knows the rules, about 600 to 900, keeps hanging pieces | L1, P1-P2, T6a |
| improver (target) | Micah: about 950 rapid, free chess.com tier, wants review and plain explanations | most tests |
| club | About 1700 to 2000, studies openings/endgames, dislikes being talked down to | P7-P8, O1, T6b |

## Metrics and anchors

Qualitative scores use **0 to 3** with these anchors, applied per test:

- **0, cannot**: the product has no way to do the task (or it is paywalled for the tested tier).
- **1, does it badly**: possible, but with a defect that defeats the purpose (spoils the answer, wrong chess claim, generic text unrelated to the position).
- **2, adequate**: correct and usable, but missing a benchmark behaviour (no graduated hints, no follow-up exercise, no level adaptation).
- **3, benchmark**: correct, responsive to the learner's input, graduated, and ends with something to practise.

Quantitative metrics:

| Metric | Definition |
|---|---|
| Time to first useful feedback (TTFF) | From pressing the import/open button to the first screen that names a specific mistake |
| Clicks to review | Clicks from the app's start page with a PGN on the clipboard to the review summary |
| Puzzle yield | Puzzles created per reviewed game for the user's side |
| Label agreement | Fraction of fixture moves whose label matches the reference (engine depth 20 + chess.com/lichess conventions for allowed mates) |
| Hint spoiler rate | Fraction of first-level hints that contain the solution's piece+square or SAN |
| Legality/claim accuracy | Fraction of concrete chess claims (moves, lines, material, mate) that are legal and engine-confirmed |
| Accessibility task completion | Can a keyboard-only / screen-reader user (a) step through a game, (b) make a puzzle move? |

**Sample size warning**: these are 21 fixtures and 2 games. They are enough to find capability gaps and regressions, not to rank products on overall quality or to claim learning outcomes. No test here measures whether anyone improves at chess.

## Fixture summary (all engine/tablebase-checked)

| ID | Task | Position / data | Verified answer |
|---|---|---|---|
| L1 | Beginner lesson: back-rank mate + 2 transfer items | `6k1/5ppp/8/8/8/8/5PPP/R5K1 w` | Ra8# (M1); Rd8# (M1); with b8 rook, Ra8 fails (best h3, 0.05) |
| P1-P2 | Puzzles about 920-940 (lichess 0e597, 0gCzo) | see JSON | Rh8+ Kf7 Rxc8; Qd1+ Nxd1 Rxd1# (engine agrees) |
| P3-P4 | Puzzles about 1260-1290 (0LEQK, 0Tnt5) | | Bc5+ Kg2 Bxa7; Rxh6+ Kxh6 Qh5# |
| P5-P6 | Puzzles about 1560-1580 (0jC12, 19hix) | | Qa5+ Bd2/Qd2 Qxb5; Rd1 Rd4 Nxd2 |
| P7-P8 | Puzzles about 2000-2030 (0KE1r, 0o14m) | | Nxd4 exd4 Ba4 Qxa4+ Qxa4; hxg7+ Bxg7 Rf8+ Bxf8 Qg8# |
| G1 | Review: Legal's mate miniature, user = Black | PGN | 5...Bxd1 allows mate in 2 (should be Blunder) |
| G2 | Review: Opera Game 1858, user = Black | PGN | White sacrifices are best; Black's errors come when already worse |
| O1 | Opening recall: Italian Giuoco Pianissimo to move 7 | line | Legal; end eval -0.12 |
| E1 | K+Q vs K | `8/8/8/4k3/8/8/8/3QK3 w` | TB win, DTM 13 |
| E2 | Lucena | `1K1k4/1P6/8/8/8/8/r7/2R5 w` | TB win, DTM 41, Rd1+ |
| E3 | Opposition (KP vs K) | `8/8/4k3/8/4K3/4P3/8/8 w` | TB draw with White to move, loss for Black to move |
| E4 | Philidor | `3k4/8/r7/3PK3/8/8/8/7R b` | TB draw |
| T1 | Tutor: hint without the move | `5r1k/6pp/7N/8/8/1Q6/8/6K1 w` | Qg8+ Rxg8 Nf7# (M2) |
| T2 | Tutor: plausible flawed move | after 3...Nd4 in the Italian | 4.Nxe5? Qg5! (opponent best, +0.52 for Black); best 4.Nxd4 (+1.26) |
| T3 | Tutor: several sound moves | after 2...Nc6 | d4 0.21, Bb5 0.16, Bc4 0.12 (and Nc3) within 0.1 pawn |
| T4 | Tutor: illegal move + false premise | same position | Bxf7+ is illegal (chess.js), material level |
| T5 | Tutor: follow-up after board changes | after 4.Nxe5 Qg5 | 5.Nxf7? Qxg2 (+6.45 Black); best 5.O-O (-0.47) |
| T6 | Tutor: same idea for 2 levels | `r3k3/8/8/3N4/8/8/8/4K3 w` | Nc7+ wins the rook, but K+N vs K is a dead draw (0.00): tests overclaiming |

## Results: Chess Tutor (our app)

Hands-on 2026-11-14, live site, Chromium, no login. Full numbers in `results/app-hands-on.json` and `results/engine-verification.json`.

| Test | Observed | Score / metric |
|---|---|---|
| Import (chess.com) | 19 of Micah's November games listed after load | Works; 1 click (pre-filled username) |
| Review G1 (PGN) | 4 clicks, **3.5 s** TTFF in browser. Accuracy White 98.3 / Black 69.0. 4...g6 = inaccuracy, 5...Bxd1 = **Mistake** (eval M2 shown, engine line Bxf7+ Ke7 Nd5#). | TTFF 3.5 s; label agreement 12/13 (the allowed mate is mislabeled) |
| Review G2 (Node, same code) | 34 positions in 8.4 s. Black 86.8%; 6...Nf6 and 9...b5 inaccuracies; no mistakes/blunders for Black; no "brilliant" for 16.Qb8+ | Puzzle yield 0; no brilliancy class |
| Puzzle yield | G1: 1 puzzle (5...Bxd1 position, solution dxe5); G2: 0 | 0.5 per game on fixtures |
| Puzzle answer validation | Replaying the game mistake (Bxd1) gives "Bxd1 isn't it. Try again, or show the answer." Reveal gives "The answer was dxe5." Alternatives within 4 win-% are accepted (code, `Puzzles.tsx:76-95`) | 2: correct, but one move only, no hint, no explanation in-app |
| Rated puzzles P1-P8 | No way to load an external puzzle | 0 |
| Beginner lesson L1 | No lessons | 0 |
| Opening recall O1 | No opening trainer | 0 |
| Endgame E1-E4 | No play-vs-engine from a position | 0 |
| T1 hint | No hint control. The only tutor entry point on a puzzle ("Ask Claude why") appears after solving/revealing, and its prompt contains the answer | 0; hint spoiler rate 100% (1/1 tutor prompts carry the solution) |
| T2 flawed proposal | Board is view-only; you cannot propose a move | 0 |
| T3 several good moves | Engine runs MultiPV 1; prompts name only one best move. Puzzles do accept equal alternatives | 1 |
| T4 illegal/false premise | In-app prompts are built from legal engine data, so this cannot happen inside the app; once in Claude, nothing checks legality | n/a in app; untested downstream |
| T5 follow-up after change | Prompt is a snapshot; a follow-up in Claude has no updated FEN or engine data | 0 in app |
| T6 level adaptation | Prompt states "a club player rated about <Elo from PGN>", so Claude can adapt; no user-set level; Claude's answers not observed (needs login) | 1 (provisional) |
| Prompt grounding | Prompts include FEN, eval before/after, label, win-% change, best move and engine line, plus a "don't invent variations" instruction | Good design; outcome unverified |
| Accessibility | Buttons named (4/4 on Progress). Board: 64 squares, **0 labelled, 0 focusable squares**, pieces take Tab focus with no names; an aria-live region exists. Keyboard can step moves but **cannot make a puzzle move** | Task (a) yes, (b) no |
| Mobile | No horizontal overflow at 390 px; board stays on screen while stepping (PR #7) | Pass |
| Offline | No service worker or manifest | Fail |

## Results: competitors

Hands-on only where no login or payment was needed. Everything else is documented evidence, scored only where the documentation is specific; otherwise "unverified".

| Test | chess.com (Free / Diamond) | lichess (free) | Others |
|---|---|---|---|
| Review G1/G2 | Documented: 1 full Game Review/day free, unlimited on Platinum/Diamond; Coach explanations on all moves only on Diamond; Retry on key moments; labels include Brilliant, Great, Miss, Book. **Unverified hands-on** (needs login) | Hands-on import **blocked by Cloudflare bot check** from the cloud browser. Documented: free unlimited server analysis, "Learn from your mistakes" | Chessigma: free unlimited review in browser (vendor blog). Aimchess: 1 x 40-game report/month free |
| Puzzles P1-P8 | Free: 3 puzzles/day; unlimited on Gold+ | Hands-on: puzzle 0LEQK loads anonymously, rating hidden until solved, multi-move solution, themes, 6.19 M CC0 puzzles. Hint and "good but not best" acceptance documented (third party), not observed | Chess Tempo: unlimited rated tactics free, theme stats; SRS on Gold ($35/yr) |
| Beginner lesson L1 | Free: "New to Chess" plus 1 lesson/day | Hands-on: lichess.org/learn (pieces, capture, protection, check, mate...) and /practice (18 topics incl. back-rank style checkmate patterns, pin, fork, skewer, endgames), anonymous | Duolingo Chess: free, ~75% puzzles + games vs coach "Oscar", up to ~1500, SRS (vendor blog) |
| Opening recall O1 | Opening explorer: 4 moves free | Studies + explorer; no SRS drill (third party) | Chessable MoveTrainer SRS (PRO $10/mo or $80/yr for unlimited reviews); Chess Tempo repertoire trainer (SRS on Gold); Listudy free/open source |
| Endgame E1-E4 | Lessons; coach | /practice "play vs engine to the goal" exercises, anonymous | Chess Tempo endgame trainer: 2/day free, unlimited Gold |
| AI tutor T1-T6 | Diamond Coach: per-move explanations, "Show Idea/Show Fork" graduated reveal on key moments (documented). Free-form Q&A not documented | No AI tutor | Chessvia/Chessy (talking coach, local Stockfish, free), DecodeChess, Noctie (14 EUR/mo), Chessigma Supercoach: all **documented only**, mostly by vendors or paid-placement roundups, so provisional |
| Accessibility | Unverified | Documented + visible: "Blind mode" (nvui) on every page | |

### Exact manual checks still needed (Micah, in your own browser)

1. **chess.com free Game Review, G1**: log in, Analysis > paste G1 PGN > Game Review. Record: does free tier allow it today (count of reviews left), label on 5...Bxd1, whether Coach explains it, whether "Retry" is offered. Screenshot.
2. **chess.com puzzles**: Puzzles > note how many are left today and whether a hint button exists on the free tier.
3. **lichess G1**: lichess.org/paste, paste G1, tick "Request a computer analysis" (needs a free login), then "Learn from your mistakes". Record: label on 5...Bxd1, whether it offers retry, and time to analysis.
4. **lichess hint**: open lichess.org/training/0LEQK, look for a hint control before moving.
5. **Ask Claude (our app)**: open G1 in Chess Tutor, analyze, go to 5...Bxd1, press "Ask Claude about this move". Paste Claude's full answer into `results/tutor-answers/G1-move10.md`. Then type the T1-T6 prompts in the same chat with the fixture FENs and paste each answer. Score each with the 0-3 anchors and the claim-accuracy check (every move Claude names must be legal and match the engine lines in `engine-verification.json`).
