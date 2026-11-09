import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { ParsedGame } from '../lib/game'

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
        <div className="board">
          <Chessboard
            options={{
              position: game.fens[ply],
              boardOrientation: orientation,
              allowDragging: false,
              squareStyles,
              animationDurationInMs: 150,
            }}
          />
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
          {[h.Result, h.Termination, h.Date?.replaceAll('.', '-'), h.ECOUrl?.split('/').pop()?.replaceAll('-', ' ')]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="moves">
          {rows.map((r) => (
            <div className="move-row" key={r.n}>
              <span className="num">{r.n}.</span>
              {[r.white, r.black].map((p, k) =>
                p ? (
                  <button
                    key={k}
                    ref={p === ply ? activeRef : undefined}
                    className={`move ${p === ply ? 'active' : ''}`}
                    onClick={() => go(p)}
                  >
                    {game.moves[p - 1].san}
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
