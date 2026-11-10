// Everything the app remembers lives in the browser's localStorage, under "chess-tutor:" keys.
// All access is wrapped so the app still works (without memory) if storage is blocked or full.

import type { EngineEval } from './engine'
import type { ParsedGame } from './game'
import type { GameReview, MoveLabel } from './review'

const NS = 'chess-tutor:'

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Stable id for a game: hash of its start position and moves. */
export function gameKey(game: ParsedGame): string {
  const s = game.fens[0] + game.moves.map((m) => m.lan).join(' ')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36) + '-' + game.moves.length
}

// ---- Engine results -------------------------------------------------------

export function loadEvals(key: string, depth: number): EngineEval[] | null {
  return readJson<EngineEval[] | null>(`review:d${depth}:${key}`, null)
}

export function saveEvals(key: string, depth: number, evals: EngineEval[]) {
  writeJson(
    `review:d${depth}:${key}`,
    evals.map((e) => ({ ...e, pv: e.pv.slice(0, 8) })),
  )
}

// ---- Reviewed-game summaries (for the progress dashboard) -----------------

export type GamePhase = 'opening' | 'middlegame' | 'endgame'

export interface GameSummary {
  key: string
  pgn: string
  white: string
  black: string
  /** The side the app's user played, if known. */
  userColor: 'w' | 'b' | null
  /** 'win' | 'loss' | 'draw' from the user's side, or the raw result when the user isn't in the game. */
  outcome: 'win' | 'loss' | 'draw' | null
  result: string
  /** ISO date (yyyy-mm-dd) the game was played, if known. */
  date: string | null
  /** Unix ms when the game ended (chess.com games) or was reviewed. */
  time: number
  opening: string | null
  timeClass: string | null
  accuracy: { w: number; b: number }
  counts: { w: Record<MoveLabel, number>; b: Record<MoveLabel, number> }
  /** The user's inaccuracies + mistakes + blunders split by game phase. */
  errorsByPhase: Record<GamePhase, number>
  plies: number
}

export function listSummaries(): GameSummary[] {
  return readJson<GameSummary[]>('games', [])
}

function saveSummaries(list: GameSummary[]) {
  writeJson('games', list)
}

// ---- Puzzles ---------------------------------------------------------------

export interface Puzzle {
  id: string
  gameKey: string
  fen: string
  color: 'w' | 'b'
  bestUci: string
  bestSan: string
  playedSan: string
  label: MoveLabel
  /** Mover's winning chances (0-100) with the best move. */
  bestWin: number
  moveNumber: number
  opponent: string
  date: string | null
  // Spaced repetition state
  box: number
  due: number
  attempts: number
  solved: number
}

export function listPuzzles(): Puzzle[] {
  return readJson<Puzzle[]>('puzzles', [])
}

export function savePuzzles(list: Puzzle[]) {
  writeJson('puzzles', list)
}

/** Days until a puzzle comes back after being solved, by box. */
export const BOX_DAYS = [0, 1, 3, 7, 14, 30]
const RETRY_MS = 10 * 60 * 1000

/** Update spaced-repetition state after an attempt. */
export function schedule(p: Puzzle, solvedFirstTry: boolean, now = Date.now()): Puzzle {
  if (!solvedFirstTry) return { ...p, box: 0, due: now + RETRY_MS, attempts: p.attempts + 1 }
  const box = Math.min(p.box + 1, BOX_DAYS.length - 1)
  return { ...p, box, due: now + BOX_DAYS[box] * 86400000, attempts: p.attempts + 1, solved: p.solved + 1 }
}

export function phaseOf(ply: number, fenAfter: string): GamePhase {
  if (ply <= 20) return 'opening'
  // Endgame: few non-pawn, non-king pieces left (queens count double).
  const board = fenAfter.split(' ')[0]
  let material = 0
  for (const ch of board) {
    const c = ch.toLowerCase()
    if (c === 'q') material += 2
    else if (c === 'r' || c === 'b' || c === 'n') material += 1
  }
  return material <= 6 ? 'endgame' : 'middlegame'
}

function outcomeFor(result: string, color: 'w' | 'b' | null): GameSummary['outcome'] {
  if (!color) return null
  if (result === '1/2-1/2') return 'draw'
  if (result === '1-0') return color === 'w' ? 'win' : 'loss'
  if (result === '0-1') return color === 'b' ? 'win' : 'loss'
  return null
}

function openingName(h: Record<string, string>): string | null {
  const fromUrl = h.ECOUrl?.split('/').pop()
  if (fromUrl) {
    // chess.com: "Sicilian-Defense-Old-Sicilian-2...Nc6" -> "Sicilian Defense Old Sicilian"
    const words = fromUrl.split('-').filter((w) => /^[A-Za-z']+$/.test(w))
    return words.slice(0, 6).join(' ') || null
  }
  return h.Opening ?? null
}

/**
 * Remember a reviewed game: its summary for the dashboard and its user mistakes as puzzles.
 * Returns how many new puzzles were added.
 */
export function recordReview(
  game: ParsedGame,
  pgn: string,
  review: GameReview,
  username: string,
  opts: { time?: number; timeClass?: string } = {},
): number {
  const key = gameKey(game)
  const h = game.headers
  const u = username.trim().toLowerCase()
  const userColor: 'w' | 'b' | null = !u ? null : h.White?.toLowerCase() === u ? 'w' : h.Black?.toLowerCase() === u ? 'b' : null
  const errorsByPhase: Record<GamePhase, number> = { opening: 0, middlegame: 0, endgame: 0 }
  for (const m of review.moves) {
    if (m.color !== userColor) continue
    if (m.label === 'inaccuracy' || m.label === 'mistake' || m.label === 'blunder')
      errorsByPhase[phaseOf(m.ply, game.fens[m.ply])]++
  }
  const date = h.UTCDate ?? h.Date
  const summary: GameSummary = {
    key,
    pgn,
    white: h.White ?? 'White',
    black: h.Black ?? 'Black',
    userColor,
    outcome: outcomeFor(h.Result ?? '*', userColor),
    result: h.Result ?? '*',
    date: date && !date.includes('?') ? date.replaceAll('.', '-') : null,
    time: opts.time ?? Date.now(),
    opening: openingName(h),
    timeClass: opts.timeClass ?? null,
    accuracy: review.accuracy,
    counts: review.counts,
    errorsByPhase,
    plies: game.moves.length,
  }
  saveSummaries([summary, ...listSummaries().filter((s) => s.key !== key)])

  if (!userColor) return 0
  const puzzles = listPuzzles()
  const have = new Set(puzzles.map((p) => p.id))
  const opponent = userColor === 'w' ? summary.black : summary.white
  const fresh: Puzzle[] = []
  for (const m of review.moves) {
    if (m.color !== userColor || !m.bestUci || !m.bestSan) continue
    if (m.label !== 'mistake' && m.label !== 'blunder') continue
    // Skip positions that were already hopeless; there's little to learn there.
    if (m.winBefore < 15) continue
    const id = `${key}:${m.ply}`
    if (have.has(id)) continue
    fresh.push({
      id,
      gameKey: key,
      fen: game.fens[m.ply - 1],
      color: m.color,
      bestUci: m.bestUci,
      bestSan: m.bestSan,
      playedSan: m.san,
      label: m.label,
      bestWin: m.winBefore,
      moveNumber: Math.ceil(m.ply / 2),
      opponent,
      date: summary.date,
      box: 0,
      due: Date.now(),
      attempts: 0,
      solved: 0,
    })
  }
  if (fresh.length) savePuzzles([...puzzles, ...fresh])
  return fresh.length
}
