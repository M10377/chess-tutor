# 6. Evidence appendix

## Sources (all checked 2026-11-14 unless noted)

Type: **H** hands-on, **D** vendor documentation/pricing, **T** third-party article or paper, **A** API/data.

| # | Product / topic | Source | Type | Platform, tier | What it supports | Caveats |
|---|---|---|---|---|---|---|
| S1 | chess.com membership limits | support.chess.com/en/articles/8562418 ("Premium plans on Chess.com") | D | Web, Free/Gold/Platinum/Diamond | Free: 1 full Game Review/day, 3 puzzles/day, Puzzle Rush once/day, 1 lesson/day, 1 coach game/month, explorer 4 moves; Diamond: Coach explanations on all moves, Insights | Page lists no prices; Gold's review limit inferred |
| S2 | chess.com Game Review flow | support.chess.com/en/articles/9363826 ("Game Review") | D | Web | Labels incl. Brilliant/Great/Miss/Book, key moments, "Show Idea/Fork", Retry, read-aloud Coach | No hands-on (login) |
| S3 | lichess puzzle DB | database.lichess.org | A/D | Data | 6,193,530 puzzles, CC0; fields FEN, Moves, Rating, RD, Popularity, NbPlays, Themes, OpeningTags; 417.9 M evaluated positions | |
| S4 | lichess puzzle page | lichess.org/training/0LEQK | H | Web, anonymous | Loads without login, rating hidden until solved, multi-move | Hint control not observed |
| S5 | lichess puzzle features | mintlify.com/lichess-org/lila/features/puzzles | T | | Glicko-2, themes, dashboard, Storm/Streak/Racer, history, hints, "good but not best" | Third-party docs of the open-source code |
| S6 | lichess Learn / Practice | lichess.org/learn, lichess.org/practice; lichess blog "Announcing Practice" | H/D | Web, anonymous | Learn: pieces, capture, protection, check, mate; Practice: 18 topics, play vs engine to a goal | |
| S7 | lichess import + analysis | lichess.org/paste | H (blocked) | Web | Cloudflare bot check blocked the cloud browser | Manual check 3 |
| S8 | lichess 7-piece tablebase | tablebase.lichess.ovh | A | API | Used to verify E1-E4 | Online only |
| S9 | Aimchess | aimchess.com | D | Web/iOS/Android | Free: 1 x 40-game report/month, weekly plan, 1 lesson session/day; Premium $7.99/mo or $57.99/yr; insights in 6 areas; Retry Mistakes, Blunder Preventer | Claims of 31% faster rating gain are vendor-cited |
| S10 | Chess Tempo | en.chesstempo.com/memberships | D | Web/app | Free unlimited tactics; endgame 2/day free; SRS on Gold ($35/yr); Diamond $79/yr | |
| S11 | Chessable | ankichess.com blog (2026-02-04); chessiverse.com compare page (2026-09) | T | Web/app | MoveTrainer SRS; PRO $10/mo or $80/yr for unlimited reviews | Both publishers sell competing products |
| S12 | AI chess coaches roundup | lilachbullock.com/best-ai-chess-coaches (2026-10-28) | T | | Lists Aimchess, ChessGPT, ChessMogg, Chessy, DecodeChess, Dr. Wolf, Noctie, Outpost | Paid partnerships; no hands-on testing |
| S13 | AI chess tools roundup | chessigma.com/blog/best-chess-ai-tools (2026-08-15) | T | | Noctie 14 EUR/mo trial-only; Chessvia talking coach, free; Maia levels; chess.com 1 review/day | Publisher sells Chessigma Supercoach |
| S14 | LLM chess commentary accuracy | arXiv 2608.04240, "Hallucinations on the Board" (ACT-Eval) | T | Research | 325 position-move pairs; GPT-5.4 wrong on 22.0% of sub-claims without tools, small open models > 40%; tools improve correctness | Abstract only read; post-tool numbers not stated there |
| S15 | Duolingo Chess | blog.duolingo.com/chess-course (2025-06-10) | D | iOS/Android/web, free | ~75% puzzles, games vs "Oscar", to ~1500, SRS | |
| S16 | FSRS vs SM-2 | diane.app/en/guides/fsrs-vs-sm2 (2026-05-13) citing Expertium benchmark | T | | FSRS-5 log-loss 0.291 vs SM-2 0.354; ~25% fewer reviews | Vendor page; underlying benchmark not read directly |
| S17 | Claude API prices | claude-api skill model table (cached 2026-11-03) | D | API | Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per M tokens | OpenAI prices not checked |
| S18 | Micah's chess.com profile | api.chess.com/pub/player/internalguess/stats and /games/archives | A | Public API | Rapid 958 (13-5-0), tactics 400-766, one archive (2026-11) | Snapshot |
| S19 | Our app | m10377.github.io/chess-tutor, repo at 4ec859e | H | Web, Chromium | See `baseline.md`, `results/app-hands-on.json` | Cloud browser, not Micah's |
| S20 | Micah's Mac (Path 1 run) | Remote session, 2026-11-14 | H | Apple M4, 24 GB, macOS 15.7.4 | All 22 fixtures re-verified; G1 review 1.2 s, G2 3.5 s; 56 s for the full fixture run, ~200 MB | Ollama not installed at time of run |

Not used as evidence: a Chessvia "how it works" page (chessvia-test.onrender.com) that turned out to describe a human-coach marketplace test site.

## Test fixtures and raw results

| File | Content |
|---|---|
| `fixtures/fixtures.json` | 22 fixtures: L1 (3 steps), P1-P8, G1-G2, O1, E1-E4, T1-T6, plus 3 player profiles |
| `fixtures/tutor-tasks.json` | 32 tutor tasks derived from the fixtures with engine facts (depth 18) |
| `results/engine-verification.json` | Stockfish depth-20 verification + tablebase + the app's own review on G1/G2 |
| `results/app-hands-on.json`, `results/screenshots/app-*.png` | Live app run (Playwright) |
| `results/lichess-hands-on.json`, `results/screenshots/lichess-*.png` | lichess run (anonymous) |
| `results/rule-tutor-normal.json`, `results/rule-tutor-short.json` | Path 1 answers, automatic checks, my 0-3 ratings |
| `results/local-llm/*.json` | Path 2 answers from Micah's Mac (when run) |
| `tools/*.mjs` | Engine driver, verifier, task builder, prompt builder, scorer, rule tutor, local-model runner |

Notable observations:

- The first draft of fixture E3 was wrong (tablebase: win, not draw). Caught by verification and fixed. Evals differ by 0.1 to 0.2 pawns between runs and machines at depth 20 (Micah's Mac run vs the cloud), and O1's top move switched between Ba7 and O-O at near-equal evals: treat evals within 0.2 as ties in any test.
- P5's lichess solution has 14...Bd2 as White's reply while the engine prefers 14.Qd2: puzzle checkers must accept either defence.
- Path 1 prototype first run had template defects that the manual read found (allowed mate described as "winning your pawn", pin/skewer not detected, "side to move wins" phrasing). They were fixed before the recorded run; this is why a human read of generated text stays part of the eval.

## Access limitations

| Blocked | Why | What stays unverified | Exact manual check |
|---|---|---|---|
| chess.com Game Review, puzzles, lessons | Needs login | Free-tier behaviour on G1, hint availability, current limits | `tests.md` manual checks 1-2 |
| lichess import/analysis | Cloudflare bot check on the cloud browser | Labels and "Learn from your mistakes" on G1 | `tests.md` manual check 3 |
| lichess puzzle hint | Not observed | Whether a hint control exists for puzzles | `tests.md` manual check 4 |
| claude.ai / chatgpt.com answers | Need Micah's logins | Path 3 answer quality on the 32 tasks; `chatgpt.com/?q=` prefill | `tests.md` manual check 5 |
| Local model on the Mac | Ollama install blocked by Mac permission rules until Micah runs it | Path 2 latency and accuracy | Micah runs the install command; the remote session runs `local-llm-eval.mjs` |
| AI coach apps (Chessy, DecodeChess, Noctie, Chessigma Supercoach) | Paid trials/accounts | All hands-on quality | Optional: one week trial of the most relevant, run T1-T6 by hand |
| Aimchess, Chessable, Chess Tempo | Accounts | Hands-on flows | Not needed for current roadmap |

## Unresolved questions that could change the roadmap

1. **Does Micah prefer drills or conversation?** If conversation, the handoff and local model matter more than rated puzzles; N2 and X5 swap.
2. **Phone or desktop as the main device?** If phone, Path 2 has almost no value (Mac only) and mobile polish of N1 matters more.
3. **How many minutes a day?** Under 15 minutes: the daily queue (X6) moves up and lessons (X3) move down.
4. **Does Micah's rating rise fast?** At 1400+, openings (L3) and endgame sparring (X4) move up; beginner lessons move down.
5. **Is the free chess.com 1 review/day actually binding?** If Micah plays fewer than 1 game a day, our "unlimited" advantage is smaller and teaching quality (N1) is the whole case.
6. **Does a local model on the M4 meet the bar?** Decides X5.
7. **Will chess.com keep allowing browser access to archives?** The cloud block seen on 2026-11-09 did not happen on 2026-11-14; if it spreads to browsers, PGN paste and lichess import (L5) become urgent.
8. **Other GitHub Pages projects on m10377.github.io**: they share an origin with this app. Matters for any stored secret (BYOK, L1).
