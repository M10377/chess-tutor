import { Chess } from 'chess.js'
import { useCallback, useState } from 'react'
import { Engine, type EngineEval } from './engine'
import type { ParsedGame } from './game'
import { buildReview, type GameReview } from './review'
import { gameKey, loadEvals, recordReview, saveEvals } from './store'

export const REVIEW_DEPTH = 16

let shared: Engine | null = null
/** One engine (one Web Worker) for the whole app; its searches are queued. */
export function getEngine(): Engine {
  shared ??= new Engine()
  return shared
}

export function uciToSan(fen: string, uci: string): string | undefined {
  try {
    const c = new Chess(fen)
    return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san
  } catch {
    return undefined
  }
}

export function reviewFromEvals(game: ParsedGame, evals: EngineEval[]): GameReview {
  return buildReview(game.moves, evals, (ply, uci) => uciToSan(game.fens[ply], uci))
}

export function cachedReview(game: ParsedGame): GameReview | null {
  const evals = loadEvals(gameKey(game), REVIEW_DEPTH)
  return evals && evals.length === game.fens.length ? reviewFromEvals(game, evals) : null
}

/**
 * Analyze every position of a game, cache the result, and record the game summary and puzzles.
 * `shouldStop` is checked between positions so a batch can be cancelled.
 */
export async function analyzeGame(
  game: ParsedGame,
  pgn: string,
  username: string,
  onProgress?: (fraction: number) => void,
  shouldStop?: () => boolean,
  meta?: { time?: number; timeClass?: string },
): Promise<GameReview | null> {
  const engine = getEngine()
  const evals: EngineEval[] = []
  for (let i = 0; i < game.fens.length; i++) {
    if (shouldStop?.()) return null
    evals.push(await engine.evaluate(game.fens[i], REVIEW_DEPTH))
    onProgress?.((i + 1) / game.fens.length)
  }
  saveEvals(gameKey(game), REVIEW_DEPTH, evals)
  const review = reviewFromEvals(game, evals)
  recordReview(game, pgn, review, username, meta)
  return review
}

export function useReview(game: ParsedGame, pgn: string, username: string, meta?: { time?: number; timeClass?: string }) {
  const [review, setReview] = useState<GameReview | null>(() => cachedReview(game))
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    setError(null)
    setProgress(0)
    try {
      setReview(await analyzeGame(game, pgn, username, setProgress, undefined, meta))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The engine failed to run.')
    } finally {
      setProgress(null)
    }
  }, [game, pgn, username, meta])

  return { review, progress, error, start }
}
