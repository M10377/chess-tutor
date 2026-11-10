import { Chess } from 'chess.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Engine, type EngineEval } from './engine'
import type { ParsedGame } from './game'
import { buildReview, type GameReview } from './review'

export const REVIEW_DEPTH = 16
const CACHE_PREFIX = `chess-tutor:review:d${REVIEW_DEPTH}:`

function cacheKey(game: ParsedGame): string {
  // Cheap stable hash of the move sequence + start position.
  const s = game.fens[0] + game.moves.map((m) => m.lan).join(' ')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return CACHE_PREFIX + (h >>> 0).toString(36) + ':' + game.moves.length
}

function loadCached(key: string): EngineEval[] | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as EngineEval[]) : null
  } catch {
    return null
  }
}

function saveCached(key: string, evals: EngineEval[]) {
  try {
    // Keep only what the review needs; pv trimmed to save space.
    localStorage.setItem(key, JSON.stringify(evals.map((e) => ({ ...e, pv: e.pv.slice(0, 8) }))))
  } catch {
    /* storage full or unavailable: review still works, just not cached */
  }
}

export function uciToSan(fen: string, uci: string): string | undefined {
  try {
    const c = new Chess(fen)
    return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san
  } catch {
    return undefined
  }
}

export function useReview(game: ParsedGame) {
  const key = cacheKey(game)
  const [review, setReview] = useState<GameReview | null>(() => {
    const cached = loadCached(key)
    return cached ? buildReview(game.moves, cached, (ply, uci) => uciToSan(game.fens[ply], uci)) : null
  })
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const engineRef = useRef<Engine | null>(null)

  useEffect(() => () => engineRef.current?.terminate(), [])

  const start = useCallback(async () => {
    setError(null)
    setProgress(0)
    try {
      engineRef.current ??= new Engine()
      const engine = engineRef.current
      const evals: EngineEval[] = []
      for (let i = 0; i < game.fens.length; i++) {
        evals.push(await engine.evaluate(game.fens[i], REVIEW_DEPTH))
        setProgress((i + 1) / game.fens.length)
      }
      saveCached(key, evals)
      setReview(buildReview(game.moves, evals, (ply, uci) => uciToSan(game.fens[ply], uci)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The engine failed to run.')
    } finally {
      setProgress(null)
    }
  }, [game, key])

  return { review, progress, error, start }
}
