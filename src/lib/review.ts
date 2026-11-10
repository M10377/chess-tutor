// Turns engine evaluations into a game review: move labels, accuracy, and the best alternative.
// Formulas follow lichess's published ones (https://lichess.org/page/accuracy).

import type { Move } from 'chess.js'
import type { EngineEval } from './engine'

export type MoveLabel = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export interface MoveReview {
  ply: number
  san: string
  color: 'w' | 'b'
  label: MoveLabel
  /** 0-100 accuracy of this move. */
  accuracy: number
  /** Mover's winning chances (0-100) before and after the move. */
  winBefore: number
  winAfter: number
  /** Engine's preferred move in the position before, in SAN, if different from the move played. */
  bestSan?: string
  bestUci?: string
}

export interface GameReview {
  evals: EngineEval[]
  moves: MoveReview[]
  accuracy: { w: number; b: number }
  counts: { w: Record<MoveLabel, number>; b: Record<MoveLabel, number> }
}

/** Evaluation as centipawns from White's view, with mates mapped to large values. */
export function whiteCp(e: EngineEval): number {
  if (e.mate !== undefined) {
    if (e.mate === 0) return 0
    return Math.sign(e.mate) * (10000 - Math.abs(e.mate) * 10)
  }
  return e.cp ?? 0
}

/** White's winning chances 0-100 from centipawns. */
export function winPercent(cp: number): number {
  const c = Math.max(-1000, Math.min(1000, cp))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1)
}

export function moveAccuracy(winBefore: number, winAfter: number): number {
  const drop = Math.max(0, winBefore - winAfter)
  const acc = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  return Math.max(0, Math.min(100, acc))
}

export function labelFor(drop: number, playedBest: boolean): MoveLabel {
  if (playedBest) return 'best'
  if (drop >= 30) return 'blunder'
  if (drop >= 20) return 'mistake'
  if (drop >= 10) return 'inaccuracy'
  return 'good'
}

/** Final position eval when the game ended in mate or a draw (engine returns no move there). */
function terminalEval(e: EngineEval, move: Move | undefined): EngineEval {
  if (e.bestMove || !move) return e
  if (move.san.endsWith('#')) return { ...e, cp: undefined, mate: move.color === 'w' ? 1 : -1 }
  return { ...e, cp: 0, mate: undefined }
}

const zero = (): Record<MoveLabel, number> => ({ best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 })

function harmonicMean(xs: number[]): number {
  const v = xs.map((x) => Math.max(x, 1))
  return v.length / v.reduce((s, x) => s + 1 / x, 0)
}

function sideAccuracy(xs: number[]): number {
  if (!xs.length) return 0
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  return (mean + harmonicMean(xs)) / 2
}

/**
 * @param evals evals[i] is the engine's view of fens[i] (evals.length === moves.length + 1).
 * @param toSan converts a UCI move in the position fens[i] to SAN.
 */
export function buildReview(
  moves: Move[],
  rawEvals: EngineEval[],
  toSan: (ply: number, uci: string) => string | undefined,
): GameReview {
  const evals = rawEvals.map((e, i) => (i === rawEvals.length - 1 ? terminalEval(e, moves[i - 1]) : e))
  const counts = { w: zero(), b: zero() }
  const accs: { w: number[]; b: number[] } = { w: [], b: [] }
  const reviews = moves.map((m, i) => {
    const sign = m.color === 'w' ? 1 : -1
    const winBefore = winPercent(sign * whiteCp(evals[i]))
    const winAfter = winPercent(sign * whiteCp(evals[i + 1]))
    const uci = m.from + m.to + (m.promotion ?? '')
    const bestUci = evals[i].bestMove
    const playedBest = bestUci === uci
    const label = labelFor(winBefore - winAfter, playedBest)
    const accuracy = moveAccuracy(winBefore, winAfter)
    counts[m.color][label]++
    accs[m.color].push(accuracy)
    return {
      ply: i + 1,
      san: m.san,
      color: m.color,
      label,
      accuracy,
      winBefore,
      winAfter,
      bestUci: playedBest ? undefined : bestUci || undefined,
      bestSan: playedBest || !bestUci ? undefined : toSan(i, bestUci),
    }
  })
  return {
    evals,
    moves: reviews,
    accuracy: { w: sideAccuracy(accs.w), b: sideAccuracy(accs.b) },
    counts,
  }
}

/** Short human-readable eval, e.g. "+1.3", "-0.4", "M3", "-M2". */
export function formatEval(e: EngineEval): string {
  if (e.mate !== undefined) return e.mate === 0 ? '#' : `${e.mate < 0 ? '-' : ''}M${Math.abs(e.mate)}`
  const cp = (e.cp ?? 0) / 100
  return `${cp > 0 ? '+' : ''}${cp.toFixed(1)}`
}
