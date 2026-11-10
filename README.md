# Chess Tutor

A personal web app for reviewing your chess.com games: import, replay, engine review, puzzles from your own mistakes, and an AI tutor.

## Status

- [x] Phase 1: import games from chess.com by username (or paste a PGN) and replay them on a board
- [x] Phase 2: Stockfish game review (move labels, accuracy, eval bar and graph)
- [x] Phase 3: puzzles from your own mistakes (with spaced repetition and batch analysis of a month of games)
- [x] Phase 4: AI tutor explanations ("Ask Claude" buttons that open Claude with the engine findings, using your own Claude plan)
- [ ] Phase 5: progress and pattern dashboard

## Use it

Open https://m10377.github.io/chess-tutor/ (rebuilt automatically whenever `main` changes).

## Run it locally

Requires [Node.js](https://nodejs.org) 20 or newer.

```sh
npm install
npm run dev
```

`npm test` runs the unit tests.

Then open the link it prints (usually http://localhost:5173).

## How it works

- Games come from chess.com's free [public API](https://www.chess.com/news/view/published-data-api), straight from your browser. No login or premium needed; only finished games are available.
- Analysis uses [Stockfish 19](https://github.com/nmrugg/stockfish.js) (lite, single-threaded WASM build) running in a Web Worker in your browser, at depth 16. Results are cached in the browser so a reviewed game opens instantly next time. Move labels and accuracy follow [lichess's formulas](https://lichess.org/page/accuracy).
- Built with React, TypeScript and Vite, using [chess.js](https://github.com/jhlywa/chess.js) for the rules and [react-chessboard](https://github.com/Clariity/react-chessboard) for the board.
