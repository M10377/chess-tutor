import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { ParsedGame } from '../lib/game'
import { formatEval, type MoveLabel } from '../lib/review'
import { REVIEW_DEPTH, uciToSan, useReview } from '../lib/useReview'
import { EvalBar } from './EvalBar'
import { EvalGraph } from './EvalGraph'

const PLURAL = { inaccuracy: 'Inaccuracies', mistake: 'Mistakes', blunder: 'Blunders' } as const
const SYMBOL: Partial<Record<MoveLabel, string>> = { inaccuracy: '?!', mistake: '?', blunder: '??' }
const LABEL_TEXT: Record<MoveLabel, string> = {
  best: 'Best move',
  good: 'Good move',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

interface Props {
  game: ParsedGame
  orientation: 'white' | 'black'
  onBack: () => void
}

export function Replay({ game, orientation: initialOrientation, onBack }: Props) {
  // ply = number of half-moves played; 0 = start position.
  const [ply, setPly] = useState(0)
  const [orientation, setOrientation] = useState(initialOrientation)
  const last = game.moves.length
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const { review, progress, error, start } = useReview(game)

  const go = useCallback((p: number) => setPly(Math.max(0, Math.min(last, p))), [last])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') go(ply - 1)
      else if (e.key === 'ArrowRight') go(ply + 1)
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(last)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ply, last, go])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [ply])

  const lastMove = ply > 0 ? game.moves[ply - 1] : null
  const moveReview = review && ply > 0 ? review.moves[ply - 1] : null
  const evalNow = review?.evals[ply]
  const arrows = useMemo(
    () =>
      moveReview?.bestUci && moveReview.label !== 'good'
        ? [{ startSquare: moveReview.bestUci.slice(0, 2), endSquare: moveReview.bestUci.slice(2, 4), color: 'rgba(40, 140, 60, 0.8)' }]
        : [],
    [moveReview],
  )
  const bestLine = useMemo(() => {
    if (!evalNow?.pv.length) return ''
    // Convert the engine's line from the current position to SAN, stopping at the first bad move.
    const out: string[] = []
    let fen = game.fens[ply]
    for (const uci of evalNow.pv.slice(0, 6)) {
      const san = uciToSan(fen, uci)
      if (!san) break
      out.push(san)
      const c = new Chess(fen)
      c.move(san)
      fen = c.fen()
    }
    return out.join(' ')
  }, [evalNow, game, ply])
  const squareStyles = useMemo(
    () =>
      lastMove
        ? {
            [lastMove.from]: { background: 'rgba(255, 213, 0, 0.4)' },
            [lastMove.to]: { background: 'rgba(255, 213, 0, 0.5)' },
          }
        : {},
    [lastMove],
  )

  const h = game.headers
  const top = orientation === 'white' ? 'Black' : 'White'
  const bottom = orientation === 'white' ? 'White' : 'Black'
  const player = (c: string) => `${h[c] ?? c}${h[`${c}Elo`] ? ` (${h[`${c}Elo`]})` : ''}`

  const rows: { n: number; white?: number; black?: number }[] = []
  game.moves.forEach((m, i) => {
    const n = Math.floor(i / 2) + 1
    if (m.color === 'w' || rows.length === 0) rows.push({ n, white: m.color === 'w' ? i + 1 : undefined })
    if (m.color === 'b') rows[rows.length - 1].black = i + 1
  })

  return (
    <div className="replay">
      <div className="board-col">
        <div className="player">{player(top)}</div>
        <div className="board-row">
        {review && <EvalBar evaluation={evalNow} orientation={orientation} />}
        <div className="board">
          <Chessboard
            options={{
              position: game.fens[ply],
              boardOrientation: orientation,
              allowDragging: false,
              squareStyles,
              arrows,
              allowDrawingArrows: false,
              animationDurationInMs: 150,
            }}
          />
        </div>
        </div>
        <div className="player">{player(bottom)}</div>
        <div className="controls">
          <button onClick={() => go(0)} aria-label="Start">⏮</button>
          <button onClick={() => go(ply - 1)} aria-label="Previous move">◀</button>
          <button onClick={() => go(ply + 1)} aria-label="Next move">▶</button>
          <button onClick={() => go(last)} aria-label="End">⏭</button>
          <button onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>Flip</button>
        </div>
      </div>
      <div className="side-col">
        <button className="link" onClick={onBack}>← Back to games</button>
        <h2>
          {h.White ?? 'White'} vs {h.Black ?? 'Black'}
        </h2>
        <p className="muted small">
          {[h.Result, h.Termination, h.Date?.includes('?') ? undefined : h.Date?.replaceAll('.', '-'), h.ECOUrl?.split('/').pop()?.replaceAll('-', ' ')]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {review ? (
          <div className="review">
            <table className="summary">
              <thead>
                <tr><th></th><th>{h.White ?? 'White'}</th><th>{h.Black ?? 'Black'}</th></tr>
              </thead>
              <tbody>
                <tr><td>Accuracy</td><td className="acc">{review.accuracy.w.toFixed(1)}</td><td className="acc">{review.accuracy.b.toFixed(1)}</td></tr>
                {(['inaccuracy', 'mistake', 'blunder'] as const).map((l) => (
                  <tr key={l}>
                    <td><span className={`sym ${l}`}>{SYMBOL[l]}</span> {PLURAL[l]}</td>
                    <td>{review.counts.w[l]}</td>
                    <td>{review.counts.b[l]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <EvalGraph review={review} ply={ply} onSelect={go} />
            <div className="move-verdict">
              {moveReview ? (
                <>
                  <strong className={moveReview.label}>
                    {Math.ceil(moveReview.ply / 2)}{moveReview.color === 'w' ? '.' : '...'} {moveReview.san}: {LABEL_TEXT[moveReview.label]}
                  </strong>
                  {moveReview.bestSan && moveReview.label !== 'good' && <span> · best was <b>{moveReview.bestSan}</b> (green arrow)</span>}
                </>
              ) : (
                <span className="muted">Start position</span>
              )}
              {evalNow && (
                <div className="muted small">
                  Eval {formatEval(evalNow)}{bestLine && <> · engine line: {bestLine}</>}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="review-start">
            {progress === null ? (
              <button className="primary" onClick={start}>Analyze with Stockfish</button>
            ) : (
              <>
                <div className="progress"><div style={{ width: `${progress * 100}%` }} /></div>
                <p className="muted small">Analyzing… {Math.round(progress * 100)}% (depth {REVIEW_DEPTH})</p>
              </>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        )}
        <div className="moves">
          {rows.map((r) => (
            <div className="move-row" key={r.n}>
              <span className="num">{r.n}.</span>
              {[r.white, r.black].map((p, k) =>
                p ? (
                  <button
                    key={k}
                    ref={p === ply ? activeRef : undefined}
                    className={`move ${p === ply ? 'active' : ''} ${review?.moves[p - 1].label ?? ''}`}
                    onClick={() => go(p)}
                  >
                    {game.moves[p - 1].san}
                    {review && SYMBOL[review.moves[p - 1].label]}
                  </button>
                ) : (
                  <span key={k} className="move">{k === 0 ? '…' : ''}</span>
                ),
              )}
            </div>
          ))}
        </div>
        <p className="muted small">Tip: use the ← and → keys to step through moves.</p>
      </div>
    </div>
  )
}
