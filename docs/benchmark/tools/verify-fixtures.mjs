// Re-verifies every benchmark fixture with Stockfish 19 (the engine the app ships) and, for endgames,
// the lichess 7-piece tablebase. Also runs the app's own review code on the fixture games, so the
// "our app" results in results/ can be reproduced.
//
//   node --experimental-strip-types --import ./docs/benchmark/tools/ts-resolve.mjs docs/benchmark/tools/verify-fixtures.mjs [--offline] [--depth 20]
//
// Writes docs/benchmark/results/engine-verification.json.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Chess } from 'chess.js'
import { startEngine } from './engine.mjs'
import { buildReview, winPercent } from '../../../src/lib/review.ts'
import { moveQuestion, gameSummaryQuestion, puzzleQuestion } from '../../../src/lib/tutor.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const fx = JSON.parse(readFileSync(path.join(here, '../fixtures/fixtures.json'), 'utf8'))
const args = process.argv.slice(2)
const offline = args.includes('--offline')
const DEPTH = Number(args[args.indexOf('--depth') + 1]) || 20
const APP_DEPTH = 16 // REVIEW_DEPTH in src/lib/useReview.ts

const eng = startEngine()
const out = { checkedAt: new Date().toISOString(), engine: 'Stockfish 19 lite single (WASM, node_modules/stockfish)', depth: DEPTH, results: {} }

const fmt = (l) => (l.mate !== null ? `M${l.mate}` : (l.cp / 100).toFixed(2))
const sanLine = (fen, pv, n = 8) => {
  const c = new Chess(fen)
  const s = []
  for (const u of pv.slice(0, n)) {
    try { s.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san) } catch { break }
  }
  return s.join(' ')
}
const legal = (fen, san) => { try { return new Chess(fen).move(san).san } catch { return null } }
async function top(fen, multipv = 3, depth = DEPTH) {
  const lines = await eng.analyse(fen, { depth, multipv })
  return lines.map((l) => ({ eval: fmt(l), line: sanLine(fen, l.pv) }))
}
async function tablebase(fen) {
  if (offline) return null
  try {
    const r = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`)
    if (!r.ok) return { error: r.status }
    const j = await r.json()
    return { category: j.category, dtm: j.dtm, bestMoves: j.moves.filter((m) => m.category === j.moves[0].category).slice(0, 4).map((m) => m.san) }
  } catch (e) { return { error: String(e) } }
}

// Lessons
for (const l of fx.lessons) {
  out.results[l.id] = []
  for (const s of l.steps) {
    const t = await top(s.fen, 2)
    const exp = s.expect ?? s.expectNot
    out.results[l.id].push({ fen: s.fen, role: s.role, expected: s.expect ? `best = ${s.expect}` : `not ${s.expectNot}`, legal: !!legal(s.fen, exp), engine: t, pass: s.expect ? t[0].line.startsWith(s.expect) : !t[0].line.startsWith(s.expectNot) })
  }
}

// Puzzles: lichess FEN is before the opponent's move; first UCI move is the opponent's.
for (const p of fx.puzzles) {
  const c = new Chess(p.fen)
  const ms = p.moves.split(' ')
  c.move({ from: ms[0].slice(0, 2), to: ms[0].slice(2, 4), promotion: ms[0][4] })
  const startFen = c.fen()
  const solution = sanLine(startFen, ms.slice(1))
  const t = await top(startFen, 3)
  out.results[p.id] = { source: p.source, rating: p.rating, puzzleFen: startFen, solution, engine: t, firstMoveMatches: t[0].line.split(' ')[0] === solution.split(' ')[0], solutionPlies: ms.length - 1 }
}

// Endgames
for (const e of fx.endgames) {
  const t = await top(e.fen, 2, Math.min(DEPTH, 24))
  out.results[e.id] = { fen: e.fen, expectedCategory: e.expectCategory, engine: t, tablebase: await tablebase(e.fen) }
}

// Tutor fixtures
for (const tc of fx.tutor) {
  const t = await top(tc.fen, tc.id === 'T3' ? 4 : 3)
  const r = { fen: tc.fen, legalFen: true, engine: t }
  try { new Chess(tc.fen) } catch { r.legalFen = false }
  if (tc.proposed) {
    const san = legal(tc.fen, tc.proposed)
    r.proposedLegal = !!san
    if (san) {
      const c = new Chess(tc.fen)
      c.move(tc.proposed)
      const reply = await top(c.fen(), 1)
      r.afterProposed = { fen: c.fen(), opponentBest: reply[0] }
    }
  }
  out.results[tc.id] = r
}

// Opening line legality
for (const o of fx.openings) {
  const c = new Chess()
  let ok = true
  try { c.loadPgn(o.line) } catch { ok = false }
  const t = ok ? await top(c.fen(), 1, 18) : null
  out.results[o.id] = { legalLine: ok, finalFen: ok ? c.fen() : null, engineAtEnd: t }
}

// Our app's review pipeline on the fixture games, at the app's depth (16), single PV like the app.
for (const g of fx.games) {
  const c = new Chess()
  c.loadPgn(g.pgn)
  const moves = c.history({ verbose: true })
  const fens = [moves[0].before, ...moves.map((m) => m.after)]
  const t0 = Date.now()
  const evals = []
  for (const f of fens) {
    const [l] = await eng.analyse(f, { depth: APP_DEPTH, multipv: 1 })
    const sign = f.split(' ')[1] === 'w' ? 1 : -1
    evals.push(l ? { cp: l.cp === null ? undefined : sign * l.cp, mate: l.mate === null ? undefined : sign * l.mate, bestMove: l.pv[0] ?? '', pv: l.pv, depth: l.depth } : { bestMove: '', pv: [], depth: 0 })
  }
  const ms = Date.now() - t0
  const toSan = (ply, uci) => legal(fens[ply], { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  const review = buildReview(moves, evals, toSan)
  const headers = c.getHeaders()
  const parsed = { headers, moves, fens }
  const userColor = headers.Black === 'InternalGuess' ? 'b' : 'w'
  // Same filter as recordReview in src/lib/store.ts
  const puzzles = review.moves.filter((m) => m.color === userColor && m.bestUci && (m.label === 'mistake' || m.label === 'blunder') && m.winBefore >= 15)
  const worst = review.moves.filter((m) => m.color === userColor).sort((a, b) => (b.winBefore - b.winAfter) - (a.winBefore - a.winAfter))[0]
  const prompts = {
    moveQuestionChars: moveQuestion(parsed, g.pgn, review, worst.ply).length,
    gameSummaryChars: gameSummaryQuestion(parsed, g.pgn, review, userColor).length,
  }
  out.results[g.id] = {
    analysisMs: ms,
    positions: fens.length,
    accuracy: { w: +review.accuracy.w.toFixed(1), b: +review.accuracy.b.toFixed(1) },
    labels: review.moves.map((m) => `${Math.ceil(m.ply / 2)}${m.color === 'w' ? '.' : '...'}${m.san}:${m.label}${m.bestSan ? `(best ${m.bestSan})` : ''}`),
    puzzlesCreated: puzzles.map((m) => ({ ply: m.ply, played: m.san, best: m.bestSan, label: m.label, winBefore: +m.winBefore.toFixed(0) })),
    prompts,
    sampleMoveQuestion: moveQuestion(parsed, g.pgn, review, worst.ply),
    samplePuzzleQuestion: puzzles[0] ? puzzleQuestion({ fen: fens[puzzles[0].ply - 1], color: userColor, playedSan: puzzles[0].san, label: puzzles[0].label, bestSan: puzzles[0].bestSan }) : null,
  }
}

eng.quit()
const file = path.join(here, '../results/engine-verification.json')
writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
console.log('wrote', path.relative(process.cwd(), file))
for (const [k, v] of Object.entries(out.results)) {
  const s = Array.isArray(v) ? v.map((x) => `${x.pass ? 'PASS' : 'FAIL'} ${x.engine[0].eval} ${x.engine[0].line}`).join(' | ') : JSON.stringify(v).slice(0, 260)
  console.log(k, s)
}
