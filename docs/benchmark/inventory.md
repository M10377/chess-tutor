# 2. Capability inventory (full)

Every capability gets a row, including ones we will never build. Columns:

- **Segment**: B = beginner (<1000), I = improver 1000-1600 (Micah is at the B/I boundary, 958 rapid), C = club 1600-2000+, All.
- **Leader**: who sets the bar for that segment and task, with tier. "Best" is defined per row family in `REPORT.md` § Matrix. **(prov.)** = provisional, evidence thin.
- **Conf.**: H = hands-on today, D = vendor documentation, T = third-party article, I = inferred.
- **Ours**: S = shipped (verified), SC = shipped (code only), P = partial, A = absent. Evidence in `baseline.md` / `tests.md`.
- **Disposition**: **Lead** (beat the leader for our player), **Parity** (match), **Link** (send the player to a free leader instead of building), **Defer**, **Out** (out of scope).
- **Pri**: N = near-term, X = next, L = later, `-` = none.

## A. Getting started and progression

| ID | Capability | User need | Seg | Leader (tier) | Conf | Ours | Disposition | Pri |
|---|---|---|---|---|---|---|---|---|
| A1 | Onboarding / first-run explanation | Know what the app can do in 30 s | All | Duolingo Chess (free) | D | A (one muted line) | Parity (light) | N |
| A2 | Placement / skill estimate | Start at the right level | B,I | Duolingo (placement "planned"), chess.com puzzle rating (Free) | D | A | Parity via puzzle rating (A3) | X |
| A3 | Rating calibration for training items | Items neither trivial nor impossible | All | lichess puzzles (Glicko-2 per user and per puzzle, free) | H/D | A | Parity | N |
| A4 | Goal setting | "Reach 1200 by March" | All | chess.com (I) | I | A | Defer | L |
| A5 | Study plan | What to do today | B,I | Aimchess weekly plan (free) | D | P (rule tips + "Ask Claude for a study plan") | Lead: plan from own errors, daily queue | X |
| A6 | Skill diagnosis by area | Know weakest skill | I,C | Aimchess 6-area insights vs peers (1 report/mo free) | D | P (errors by phase, openings) | Parity+ (themes of own mistakes) | X |
| A7 | Progress tracking | See improvement | All | lichess puzzle dashboard (free); chess.com Insights (Diamond) | H/D | S (accuracy trend, blunders/game, phase, openings) | Lead for free tier | X |
| A8 | Retention loop (daily goal, streak, reminders) | Come back tomorrow | B | Duolingo (free) | D | P (due-count badge) | Parity, ethical (no dark patterns) | X |

## B. Curriculum

| ID | Capability | User need | Seg | Leader (tier) | Conf | Ours | Disposition | Pri |
|---|---|---|---|---|---|---|---|---|
| B1 | Rules for new players | Learn how pieces move | B | lichess /learn (free, H), Duolingo (free) | H | A | Link | - |
| B2 | Beginner fundamentals (hanging pieces, checks-captures-threats, basic mates) | Stop losing to one-move tactics | B,I | lichess /practice (free, H); chess.com lessons (1/day free) | H/D | A | Parity, tied to own games (Lead) | X |
| B3 | Tactics curriculum by motif | Learn fork, pin, skewer... | B,I | lichess /practice + themed puzzles (free) | H | A | Parity via themed puzzles | N |
| B4 | Calculation training | See 3+ moves ahead | I,C | Chess Tempo (long problems, free); Aimchess 360 trainer | D | A | Defer | L |
| B5 | Visualization / blindfold | Board vision | I,C | Aimchess blindfold tactics; lichess coordinates (free) | D | A | Link | - |
| B6 | Openings: principles | Develop, castle, centre | B | chess.com lessons; Duolingo | D | A | Parity (lesson) | X |
| B7 | Openings: specific repertoire content | Know my lines | I,C | Chessable (paid courses) | T | A | Defer (licensing) | L |
| B8 | Middlegame / strategy lessons | Plans, pawn structure | I,C | chess.com lessons (Gold+); Chessable courses | D | A | Defer | L |
| B9 | Endgame curriculum | Basic mates, KP, rook endings | B,I | lichess /practice (free); Chess Tempo endgame trainer (2/day free) | H/D | A | Parity | X |
| B10 | Transfer from lessons to games | Use it in real games | All | Aimchess (lessons from own games); nobody measures transfer well (evidence gap) | D | P (own-mistake puzzles) | **Lead**: link each lesson to the player's own positions | X |

## C. Practice and retention

| ID | Capability | User need | Seg | Leader (tier) | Conf | Ours | Disposition | Pri |
|---|---|---|---|---|---|---|---|---|
| C1 | Puzzle selection (volume, variety) | Enough good puzzles | All | lichess (6.19 M CC0, free, unlimited) | H/D | A (own mistakes only) | Parity by reusing lichess CC0 data | N |
| C2 | Puzzle difficulty calibration | Right difficulty | All | lichess Glicko-2 (free) | D | A | Parity | N |
| C3 | Puzzle hints | Unstick without spoiling | All | chess.com "Show Idea/Show Fork" in review (Diamond); lichess hint (prov.) | D/T | A | **Lead** (graduated, engine-derived, free) | N |
| C4 | Answer validation (alternatives, multi-move) | Fair marking | All | lichess (multi-move, accepts mates/"good not best") | H/T | P (one move, alternatives within 4 win-%) | Parity (multi-move) | N |
| C5 | Explanation after solve | Know why | All | chess.com Coach (Diamond) | D | P (external Ask Claude) | Lead via in-app templated + optional AI | N/X |
| C6 | Puzzle review / retry failed | Fix weaknesses | All | lichess puzzle history (free) | D | S (SRS returns misses in 10 min) | Lead (SRS on own mistakes) | - |
| C7 | Themed drills | Drill one motif | All | lichess themes (free); Chess Tempo themes (free) | H/D | A | Parity | N |
| C8 | Timed / streak modes | Speed, fun | B,I | lichess Storm/Streak (free) | D | A | Link | - |
| C9 | Spaced repetition quality | Remember with fewest reviews | All | FSRS (Anki default) beats SM-2 by ~25% fewer reviews (vendor-reported benchmark); Chessable MoveTrainer is the chess default | T | P (fixed Leitner 1-3-7-14-30) | Parity+ (FSRS later) | L |
| C10 | Practice generated from my games | Fix *my* mistakes | All | Aimchess "Retry Mistakes" (paid unlimited); chess.com Retry (key moments) | D | S (every mistake becomes a puzzle, free, unlimited) | **Lead** | N (improve) |
| C11 | Mistake review inside the game review | Retry right after the game | All | chess.com Retry (Free key moments; Coach on Diamond) | D | A | **Lead** (first slice) | N |
| C12 | Repertoire recall drill | Remember my opening moves | I,C | Chessable MoveTrainer (PRO for unlimited reviews) | T | A | Defer, lightweight from own games later | L |
| C13 | Repertoire deviations from my games | Where I left book | I,C | AnkiChess, Chessbook (prov.) | T | A | X (from own games) | L |
| C14 | Endgame sparring (play to goal vs engine/tablebase) | Convert won endings | B,I | lichess /practice (free) | H | A | Parity | X |
| C15 | Blunder-check habit training | Stop hanging pieces | B | Aimchess Blunder Preventer (paid) | D | A | Lead (from own blunders) | X |

## D. Teaching and coaching

| ID | Capability | User need | Seg | Leader (tier) | Conf | Ours | Disposition | Pri |
|---|---|---|---|---|---|---|---|---|
| D1 | Interactive lessons | Learn by doing | B | lichess /learn, /practice (free) | H | A | Parity (few, targeted) | X |
| D2 | Annotated examples | See master ideas | I,C | lichess studies (free) | H | A | Link | - |
| D3 | Graduated hints | Struggle productively | All | chess.com Coach key moments (Diamond) | D | A | **Lead** | N |
| D4 | Socratic questioning | Think, don't copy | All | evidence gap: no product demonstrated in tests | I | A | Lead (experiment) | X |
| D5 | AI chat about a position | Ask "why" | All | Chessvia/Chessy, Chessigma Supercoach (prov.); Claude/ChatGPT general | T | SC (copy to Claude) | Lead via grounding (X1) | X |
| D6 | Voice | Hands-free coach | B | chess.com Coach read-aloud (Free+); Chessy (prov.) | D | A | Defer | L |
| D7 | Feedback on the player's reasoning ("I played X because...") | Correct the thought, not just the move | All | evidence gap | I | A | **Lead** (X1) | X |
| D8 | Adaptation to skill level | Not too basic, not too hard | All | chess.com Coach (prov.) | D | P (Elo in prompt) | Parity | X |
| D9 | Follow-up exercises | Practise the fix | All | Aimchess; chess.com study suggestions | D | P (mistakes become puzzles) | Lead | N |
| D10 | Claim accuracy / grounding | Don't learn wrong things | All | Engine-grounded tools; ungrounded LLMs err on 22% of sub-claims (ACT-Eval, 2026) | T | P (prompt grounding, no validation) | **Lead** (validated) | N/X |

## E. Playing and reviewing

| ID | Capability | User need | Seg | Leader (tier) | Conf | Ours | Disposition | Pri |
|---|---|---|---|---|---|---|---|---|
| E1 | Practice opponents / bots | Play safely | All | chess.com bots (20+ free, 100+ Gold); lichess Maia (free, human-like) | D/T | A | Link | - |
| E2 | Adjustable/human-like bots | Realistic sparring | I | Noctie (14 EUR/mo), Maia (free) | T | A | Link | - |
| E3 | Position setup / analysis board | Try ideas | All | lichess analysis board (free) | H | A (view-only replay) | Parity (needed by tutor) | N |
| E4 | Game import: chess.com | Get my games | All | Aimchess, us | H | S | - | - |
| E5 | Game import: lichess / PGN file | Other sources | All | Aimchess | D | P (PGN paste) | X (lichess API) | L |
| E6 | Engine analysis depth/speed | Trust labels | All | lichess server analysis (free); chess.com Deep/Max (Diamond) | D | S (depth 16 single-thread, ~20 s/game) | Parity | L (multi-thread) |
| E7 | Post-game review summary | What happened | All | chess.com Game Review (1/day free) | D | S (no daily limit) | Lead on limits | - |
| E8 | Move classification | Know severity | All | chess.com (Brilliant..Blunder, Miss, Book) | D | P (5 classes; allowed mate mislabeled) | Parity | N |
| E9 | Alternative lines (MultiPV) | Several good moves | I,C | lichess (free) | H | A | Parity | N |
| E10 | Key moments navigation | Jump to what matters | All | chess.com "Next" key moves | D | P (eval graph, labels) | Parity | N |
| E11 | Recurring mistake identification | Patterns across games | I,C | Aimchess (free monthly, paid unlimited) | D | P (phase counts, openings) | Lead (motif tags) | X |
| E12 | Time-management analysis | Am I slow? | I,C | Aimchess | D | A (chess.com PGNs carry %clk, unused) | X | X |
| E13 | Opening identification | Which opening | All | chess.com/lichess | D | S (ECOUrl name) | - | - |

## F. Workflow and experience

| ID | Capability | User need | Seg | Leader (tier) | Conf | Ours | Disposition | Pri |
|---|---|---|---|---|---|---|---|---|
| F1 | Board controls (drag, click-move, arrows) | Smooth use | All | lichess | H | P (puzzles drag/click; replay view-only) | Parity | N |
| F2 | Notation (SAN, figurine) | Read moves | All | lichess | H | S (SAN) | - | - |
| F3 | Mobile UX | Use on phone | All | lichess/chess.com apps | D | S (no overflow at 390 px) | Parity | - |
| F4 | Accessibility (screen reader, keyboard moves) | Play without mouse/sight | All | lichess blind mode (free) | H/D | P (keyboard stepping only) | Parity basics | L |
| F5 | Localization | Own language | All | lichess (many languages) | D | A | Out (single English user) | - |
| F6 | Offline use | Train without network | All | Chessable app (I) | I | A (engine is local; no PWA) | X (cheap PWA) | L |
| F7 | Speed | No waiting | All | lichess | H | S (3.5 s review on 13 plies) | - | - |
| F8 | Reliability / data safety | Don't lose my puzzles | All | any account-based site | I | A (localStorage only, no backup) | Parity (export/import) | X |
| F9 | Account sync across devices | Phone + laptop | All | chess.com/lichess | D | A | Defer (export first) | L |
| F10 | Integrations (chess.com, lichess, Claude) | Use what I have | All | Aimchess | D | P (chess.com, Claude) | Lead (Claude) | - |

## G. Product and operations

| ID | Capability | User need | Seg | Leader (tier) | Conf | Ours | Disposition | Pri |
|---|---|---|---|---|---|---|---|---|
| G1 | Pricing / paywalls | Free | All | lichess (free) | H | S (free, no limits) | Keep | - |
| G2 | Ethical retention | Habit without manipulation | All | evidence gap | I | n/a | Principle for A8 | - |
| G3 | Content quality and authoring | Correct lessons | All | lichess practice (master-game sourced) | H | n/a | Engine/tablebase check on all content (tool exists) | N |
| G4 | Community | Peers | All | chess.com/lichess | D | A | Out | - |
| G5 | Coach workflows | Share with a coach | I,C | Aimchess coach sharing (paid) | D | A | Out | - |
| G6 | Privacy | My data stays mine | All | us (all local) | H | S | Keep | - |
| G7 | AI operating cost | Afford it | All | us (copy-to-Claude, $0) | H | S | Keep default; BYOK optional | X |
| G8 | Engine operating cost | Afford it | All | us/lichess (client or donated) | H | S ($0, client-side) | Keep | - |
| G9 | Licensing of data/engines | Stay legal | All | Stockfish GPL-3, lichess puzzles CC0, Maia GPL-3 | D | S (Stockfish npm, attributed) | Keep CC0/GPL compliance | N |
