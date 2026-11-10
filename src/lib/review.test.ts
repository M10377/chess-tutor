import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildReview, formatEval, labelFor, moveAccuracy, winPercent } from './review.ts'

test('winPercent is 50 at equality and symmetric', () => {
  assert.equal(winPercent(0), 50)
  assert.ok(Math.abs(winPercent(300) + winPercent(-300) - 100) < 1e-9)
  assert.ok(winPercent(10000) > 97)
})

test('moveAccuracy is ~100 with no drop and falls with bigger drops', () => {
  assert.ok(moveAccuracy(60, 60) > 99.9)
  assert.ok(moveAccuracy(60, 30) < moveAccuracy(60, 50))
  assert.equal(moveAccuracy(30, 60), moveAccuracy(30, 30))
})

test('labelFor thresholds', () => {
  assert.equal(labelFor(35, false), 'blunder')
  assert.equal(labelFor(25, false), 'mistake')
  assert.equal(labelFor(12, false), 'inaccuracy')
  assert.equal(labelFor(5, false), 'good')
  assert.equal(labelFor(50, true), 'best')
})

test('formatEval', () => {
  assert.equal(formatEval({ cp: 134, bestMove: '', pv: [], depth: 1 }), '+1.3')
  assert.equal(formatEval({ mate: -2, bestMove: '', pv: [], depth: 1 }), '-M2')
})

test('buildReview flags a blunder and credits a best move, from each side', () => {
  const mv = (color: 'w' | 'b', from: string, to: string, san: string) => ({ color, from, to, san }) as never
  const moves = [mv('w', 'e2', 'e4', 'e4'), mv('b', 'f7', 'f6', 'f6'), mv('w', 'd1', 'h5', 'Qh5+')]
  const evals = [
    { cp: 30, bestMove: 'e2e4', pv: [], depth: 14 },
    { cp: 30, bestMove: 'e7e5', pv: [], depth: 14 },
    { cp: 600, bestMove: 'd1h5', pv: [], depth: 14 }, // Black's f6 dropped a lot
    { cp: 600, bestMove: 'g7g6', pv: [], depth: 14 },
  ]
  const r = buildReview(moves, evals, (_p, uci) => (uci === 'e7e5' ? 'e5' : undefined))
  assert.equal(r.moves[0].label, 'best')
  assert.equal(r.moves[1].label, 'blunder')
  assert.equal(r.moves[1].bestSan, 'e5')
  assert.equal(r.moves[2].label, 'best')
  assert.equal(r.counts.b.blunder, 1)
  assert.ok(r.accuracy.w > 99 && r.accuracy.b < 50)
})

test('final checkmate position counts as mate for the mover', () => {
  const moves = [{ color: 'w', from: 'h5', to: 'f7', san: 'Qxf7#' } as never]
  const evals = [
    { mate: 1, bestMove: 'h5f7', pv: [], depth: 14 },
    { bestMove: '', pv: [], depth: 0 },
  ]
  const r = buildReview(moves, evals, () => undefined)
  assert.equal(r.evals[1].mate, 1)
  assert.equal(r.moves[0].label, 'best')
})

test('cleanPgn strips clocks and keeps key headers', async () => {
  const { cleanPgn } = await import('./pgn.ts')
  const pgn = `[Event "Live Chess"]\n[Site "Chess.com"]\n[White "A"]\n[Black "B"]\n\n1. e4 {[%clk 0:09:58.1]} 1... e5 {[%clk 0:09:57]} 2. Nf3 1-0`
  assert.equal(cleanPgn(pgn), '[Event "Live Chess"]\n[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 1-0')
})
