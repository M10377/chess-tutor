# Chess Tutor

A personal web app for reviewing your chess.com games: import, replay, engine review, puzzles from your own mistakes, and an AI tutor.

## Status

- [x] Phase 1: import games from chess.com by username (or paste a PGN) and replay them on a board
- [ ] Phase 2: Stockfish game review (move labels, accuracy, eval bar and graph)
- [ ] Phase 3: puzzles from your own mistakes
- [ ] Phase 4: AI tutor explanations
- [ ] Phase 5: progress and pattern dashboard

## Use it

Open https://m10377.github.io/chess-tutor/ (rebuilt automatically whenever `main` changes).

## Run it locally

Requires [Node.js](https://nodejs.org) 20 or newer.

```sh
npm install
npm run dev
```

Then open the link it prints (usually http://localhost:5173).

## How it works

- Games come from chess.com's free [public API](https://www.chess.com/news/view/published-data-api), straight from your browser. No login or premium needed; only finished games are available.
- Built with React, TypeScript and Vite, using [chess.js](https://github.com/jhlywa/chess.js) for the rules and [react-chessboard](https://github.com/Clariity/react-chessboard) for the board.
