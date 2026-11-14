# Chess Tutor competitive benchmark (2026-11-14)

Research and planning only; no app code changed. Companion files in this folder:
`baseline.md` (what we have), `inventory.md` (every capability), `tests.md` (fixtures, metrics, results), `deep-dives.md`, `roadmap.md`, `first-slice.md`, `evidence.md` (sources, limits, open questions). Raw data in `fixtures/` and `results/`.

## 1. Executive summary

**Who we are building for.** Micah (chess.com `InternalGuess`) is a new player at **958 rapid after 18 games**, with a chess.com puzzle rating between 400 and 766. That is a beginner-to-improver, not a club player. For this player the evidence says the biggest wins come from **not hanging pieces and spotting basic tactics**, not from openings or deep engine work.

**Where we already lead for this player.** Unlimited, free, private game review. chess.com free allows 1 full Game Review per day and 3 puzzles per day; we have no limits, run Stockfish 19 in the browser (3.5 s to review a short game, about 20 s for a typical rapid game), and turn every one of the player's own mistakes into a spaced-repetition puzzle automatically. No mainstream product does all of that for free; Aimchess does the "puzzles from your games" part, but its free tier is 1 report a month.

**The biggest gaps in the learner journey.**

1. **The review shows what went wrong but never teaches why inside the app.** Explanations exist only by leaving for claude.ai. There is no retry, no hint, and the board is view-only, so the player cannot test their own idea. chess.com's benchmark experience (Retry + "Show Idea" + Coach) is Diamond-only for full coverage, so this is our best opening.
2. **Far too little practice.** Own-game puzzles yielded 1 puzzle across the two fixture games. A 950 player needs a steady stream of easy, themed tactics. lichess publishes 6.19 million rated, themed puzzles under CC0, so we can reach parity on volume and calibration without writing content.
3. **No curriculum and no path for "I want to learn X".** lichess (/learn, /practice) and Duolingo Chess set a free bar for beginners that we cannot ignore, but we should only build the handful of lessons that match the player's actual mistakes and link out for the rest.
4. **Label accuracy.** Allowing mate in 2 (G1, 5...Bxd1) is labelled a "Mistake" rather than a "Blunder"; there are no Miss/Great/Brilliant classes.
5. **The tutor cannot do the core coaching moves.** On the six AI-tutor cases our app scores 0 on hints, on critiquing a proposed move and on follow-ups after the board changes, because the tutor is a one-shot prompt snapshot. Every tutor prompt we generate contains the answer (100% spoiler rate on hint requests).

**Strongest opportunities, ranked** (scores in § 3):

1. **Guided mistake review** (retry your mistake, graduated engine-derived hints, then reveal with a one-line reason; fixes the allowed-mate label; multi-move solutions). This is the first slice (`first-slice.md`).
2. **Rated, themed tactics trainer** built on lichess CC0 puzzles, calibrated to the player's rating, sharing the hint ladder.
3. **Tutor evaluation harness and better tutor prompts** (hint mode, "here's my idea" mode, multiple good moves), measured on fixtures T1-T6 before any spend.
4. **Beginner fundamentals tied to the player's own mistakes** (8 to 10 short lessons with play-to-goal exercises).
5. **Bring-your-own-key in-app tutor** (Claude or OpenAI key), grounded in Stockfish and checked by chess.js, only after (3) shows it beats the copy button. Cost is roughly **$0.001 (Haiku 5.5) to $0.03 (Opus 5.5) per explanation**. The main risk is the key sitting in browser storage on the shared `m10377.github.io` origin. Details in `roadmap.md` § X1.

**Advantages to build on**: zero running cost, no paywall, data stays local, engine already in the browser, Claude integration already grounded in engine facts, and a codebase small enough (about 2,000 lines) to change quickly.

**What would change these conclusions.** If the audience were club players (1600+), opening repertoire training (Chessable-style SRS), multi-threaded deeper analysis and rook-endgame practice would move up and beginner lessons would drop. If the app were for many users, accounts/sync, onboarding and placement, localization, accessibility and content licensing would become near-term. If Micah prefers to learn from a coach-like conversation over drills, the BYOK tutor (X1) moves to near-term, behind the eval harness.

## 2. Benchmark matrix

"Best" is defined per capability for the target player first. Conf.: H hands-on, D vendor docs, T third-party, I inferred. Priority: N near-term, X next, L later.

| Capability | Segment | What "best" means here | Leader (tier) | Why it leads | Evidence / conf. | Our verified baseline | Gap | Target | Pri |
|---|---|---|---|---|---|---|---|---|---|
| Post-game review summary | B,I | Fast, unlimited, honest labels, points to the 1-3 moments that mattered | chess.com Game Review (1/day free, unlimited Platinum+) | Polished key moments, Coach, Retry | D (support docs, 2026-11-14) | Unlimited, 3.5 s on 13 plies, accuracy + labels + graph | No key-moment flow, no explanation in app | Key moments list with retry on each | N |
| Move classification | All | Agrees with strong engine and common conventions; allowed mates are blunders | chess.com (Brilliant to Blunder, Miss, Book) | Richer classes | D | 5 classes; 12/13 fixture labels agree; allowed mate = "Mistake" | Mate handling; no Miss/Book | 13/13 on G1, Miss class | N |
| Retry a mistake | B,I | Retry right after the game, hint before reveal | chess.com Retry (key moments; Coach on Diamond) | Immediate, in context | D | Absent in review; mistakes reappear later as puzzles | No immediate retry | Retry in review, then SRS | N |
| Graduated hints | All | Several levels, first level never names the move | chess.com "Show Idea/Show Fork" (Diamond for all moves) **(prov.)** | Idea before answer | D | None | Total | 3-level ladder, spoiler rate 0% on level 1 | N |
| Puzzle volume and calibration | B,I | Unlimited, rated per user and per puzzle, themed | lichess (free) | Glicko-2, 6.19 M CC0 puzzles, themes | H + D | Own mistakes only, about 0.5 per game | Volume, rating, themes | CC0 puzzles in 400-1800 band, per-user rating | N |
| Answer validation | All | Multi-move lines, accepts equally good moves | lichess (free) | Multi-move with alternatives | H (multi-move), T (alternatives) | One move; accepts within 4 win-% | Multi-move | Multi-move with engine-checked alternatives | N |
| Practice from own games | All | Every real mistake becomes spaced practice, free | **Us** (free, unlimited); Aimchess (paid for unlimited) | Automatic, free | H | Shipped | Single-move, few items | Keep lead; add multi-move + hints | N |
| Spaced repetition | All | Fewest reviews for target retention | FSRS (Anki default); Chessable MoveTrainer in chess | FSRS reported ~25% fewer reviews than SM-2 (vendor-cited benchmark) | T | Fixed Leitner 1/3/7/14/30 | Algorithm | FSRS once there are 200+ reviews of data | L |
| Beginner fundamentals | B | Learn by doing, short, free, tied to real positions | lichess /learn + /practice (free); Duolingo Chess (free) | Interactive, play-to-goal | H (lichess), D (Duolingo) | None | Total | 8-10 lessons triggered by own mistakes; link to lichess for rules | X |
| Endgame practice | B,I | Play the position to a goal vs perfect defence | lichess /practice (free) | Engine sparring | H | None | Total | E1-E4 playable, tablebase-validated | X |
| Opening recall | I,C | SRS drill of my own lines | Chessable MoveTrainer (PRO $80/yr) | Mature SRS | T | None | Total | Defer; later from own games | L |
| AI tutor: explain a move | All | Correct, grounded, plain, ends with a practice step | evidence gap; chess.com Coach (Diamond) documented; Chessy/Chessigma (prov.) | Grounded per-move text | D/T | Copy-to-Claude prompt with FEN, evals, best line, grounding rule | Leaves app; no validation | In-app answer with legality and engine checks | X |
| AI tutor: hint | All | No spoiler, graduated | evidence gap | | I | 100% of tutor prompts contain the answer | Total | Hint-mode prompt + engine hint ladder | N |
| AI tutor: critique my idea | All | Responds to the learner's proposed move and reasoning | evidence gap | | I | Not possible (view-only board) | Total | Analysis board + "my idea" prompt with engine refutation | N/X |
| AI tutor: follow-up after change | All | Uses the new position | evidence gap | | I | Not possible | Total | FEN-aware follow-ups (BYOK) | X |
| AI tutor: claim accuracy | All | Every concrete claim legal and engine-confirmed | Engine-grounded tools (ACT-Eval 2026: ungrounded GPT-5.4 wrong on 22% of sub-claims) | Tool use reduces errors | T (paper abstract) | Grounded prompt, no checks | No verification | Auto-check every SAN in tutor output | X |
| Skill diagnosis | I | Weakest areas vs peers | Aimchess (1 report/mo free) | 6 areas incl. time management | D | Errors by phase, openings | No motifs, no clock | Motif tags + time use from %clk | X |
| Progress tracking | All | Trend that reflects skill | lichess dashboard (free); chess.com Insights (Diamond) | Theme accuracy, history | D | Accuracy trend, blunders/game, phases | No puzzle rating/theme stats | Puzzle rating + theme accuracy | X |
| Analysis board | All | Try any move, see engine lines | lichess (free) | Instant, MultiPV | H | View-only replay | Total | Interactive board in review | N |
| Bots / sparring | B,I | Human-like opponent at my level | Maia on lichess (free); Noctie (paid) | Human-like | T | None | Total | Link to lichess Maia bots | - |
| Accessibility | All | Screen reader and keyboard move entry | lichess blind mode (free) | Purpose-built | H (visible) / D | Keyboard stepping only; 0/64 squares labelled | Large | Keyboard + labelled squares for puzzles | L |
| Data safety / sync | All | Never lose progress | Account-based sites | Server storage | I | localStorage only | No backup | Export/import file | X |
| Offline | All | Train without network | Chessable app (I) | Native app | I | Engine local, no PWA | No install | PWA cache | L |
| Cost to run | All | $0 or user-controlled | Us, lichess | Client-side engine | H | $0 | none | Keep; BYOK optional | - |

## 3. Opportunity ranking

Scores 1-5 (5 best). Effort is inverted (5 = smallest). Weights: learner impact 30%, audience fit 25%, differentiation 15%, evidence confidence 15%, effort 15%.

| # | Opportunity | Impact | Fit | Diff. | Conf. | Effort | Score |
|---|---|---|---|---|---|---|---|
| 1 | Guided mistake review (retry, hint ladder, reveal, allowed-mate fix, multi-move) | 5 | 5 | 4 | 4 | 4 | **4.55** |
| 2 | Rated themed tactics (lichess CC0) | 5 | 5 | 2 | 5 | 3 | **4.25** |
| 3 | Tutor eval harness + hint/"my idea"/multi-move prompts | 3 | 5 | 4 | 3 | 5 | **3.95** |
| 4 | Beginner fundamentals tied to own mistakes | 4 | 5 | 4 | 3 | 2 | 3.80 |
| 5 | Interactive analysis board + MultiPV | 3 | 4 | 2 | 5 | 4 | 3.55 |
| 6 | BYOK in-app grounded tutor | 4 | 4 | 5 | 2 | 2 | 3.55 |
| 7 | Mistake motif tags + time-use insights | 3 | 4 | 4 | 3 | 3 | 3.40 |
| 8 | Onboarding + daily training queue | 3 | 4 | 2 | 3 | 5 | 3.40 |
| 9 | Backup/export | 2 | 4 | 1 | 5 | 5 | 3.25 |
| 10 | Endgame sparring | 3 | 3 | 1 | 5 | 3 | 3.00 |
| 11 | Opening repertoire SRS | 2 | 2 | 1 | 3 | 2 | 2.00 |

**Tradeoffs behind the top three.**

- **Why mistake review before more puzzles.** Rated puzzles (#2) have equal impact and better evidence, but lichess already gives them away; building them makes us a convenience, not a leader. Guided review is where the paid benchmark is locked behind Diamond and where our engine and own-game data give a real edge. It also builds the hint ladder and multi-move validation that #2 reuses, so doing #1 first makes #2 cheaper.
- **Why an eval harness before BYOK.** Micah asked for the API-key option and it is technically easy, but the one rigorous study found (paper abstract) that even top models make wrong chess claims about one time in five without tools. Spending money on unmeasured explanations would be guessing. The harness costs almost nothing, improves the free copy button right away, and gives the go/no-go numbers for BYOK.
- **Why not lessons first.** Beginner lessons fit the player best, but they need authored, verified content (the most expensive kind of work here), and lichess's free lessons already cover rules and basic motifs. We build only lessons that the player's own mistakes call for, after we can tag those mistakes (#7).

## Competitive advantages we claim, and how we would verify them

| Claim | Players who benefit | Task we do better | Verification |
|---|---|---|---|
| Free, unlimited review that teaches inside the app | Free-tier chess.com players under 1600 | Understand and fix a mistake within 2 minutes of finishing a game | Rerun G1/G2: TTFF to an in-app "why" under 30 s; hint level 1 spoiler rate 0%; compare with Micah's manual chess.com free-tier check (1/day, Coach limited) |
| Practice made from your own games, with graduated hints | Everyone, strongest for players who repeat the same mistake | Retain the fix for their own recurring errors | 4-week check: first-try solve rate on due own-game puzzles rises and repeat-mistake rate per game falls (needs 20+ reviewed games) |
| Grounded tutor that cannot state illegal moves | Players who use AI chat | Explanations with zero illegal or engine-contradicted moves | T1-T6 harness: claim accuracy 100% on moves named, vs ungrounded chat baseline on the same prompts |
