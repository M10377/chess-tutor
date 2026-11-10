import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeStats } from './stats.ts'

const zero = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
const g = (i: number, color: 'w' | 'b', outcome: 'win' | 'loss' | 'draw', acc: number, opening: string, blunders: number) => ({
  key: 'k' + i, pgn: '', white: 'a', black: 'b', userColor: color, outcome, result: '*', date: null, time: i,
  opening, timeClass: null, accuracy: { w: acc, b: acc },
  counts: { w: { ...zero, blunder: blunders }, b: { ...zero, blunder: blunders } },
  errorsByPhase: { opening: 0, middlegame: blunders, endgame: 0 }, plies: 40,
})

test('computeStats aggregates results, openings and trend', () => {
  const games = [
    ...Array.from({ length: 10 }, (_, i) => g(i, 'w', 'loss', 60, 'Italian Game', 2)),
    ...Array.from({ length: 10 }, (_, i) => g(10 + i, 'b', 'win', 80, 'Sicilian Defense', 0)),
    { ...g(99, 'w', 'win', 99, 'X', 0), userColor: null },
  ]
  const s = computeStats(games)!
  assert.equal(s.games.length, 20)
  assert.deepEqual([s.win, s.draw, s.loss], [10, 0, 10])
  assert.equal(s.avgAccuracy, 70)
  assert.equal(s.recentAccuracy! - s.earlierAccuracy!, 20)
  assert.equal(s.perGame.blunder, 1)
  assert.equal(s.openings.length, 2)
  assert.ok(s.tips.some((t) => t.includes('Italian Game')))
  assert.ok(s.tips.some((t) => t.includes('middlegame')))
})

test('computeStats returns null without user games', () => {
  assert.equal(computeStats([]), null)
})
