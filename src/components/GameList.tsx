import { useEffect, useState } from 'react'
import { archiveLabel, fetchArchive, fetchArchives, type ChessComGame } from '../lib/chesscom'

interface Props {
  username: string
  onOpen: (game: ChessComGame) => void
}

function outcome(game: ChessComGame, username: string): { label: string; cls: string } {
  const u = username.toLowerCase()
  const me = game.white.username.toLowerCase() === u ? game.white : game.black
  if (me.result === 'win') return { label: 'Won', cls: 'win' }
  if (['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(me.result))
    return { label: 'Draw', cls: 'draw' }
  return { label: 'Lost', cls: 'loss' }
}

export function GameList({ username, onOpen }: Props) {
  const [archives, setArchives] = useState<string[]>([])
  const [month, setMonth] = useState<string>('')
  const [games, setGames] = useState<ChessComGame[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setArchives([])
    setGames([])
    setLoading(true)
    fetchArchives(username)
      .then((list) => {
        if (cancelled) return
        const newestFirst = [...list].reverse()
        setArchives(newestFirst)
        setMonth(newestFirst[0] ?? '')
        if (!newestFirst.length) setLoading(false)
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [username])

  useEffect(() => {
    if (!month) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchArchive(month)
      .then((g) => !cancelled && setGames(g))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [month])

  if (error) return <p className="error">{error}</p>

  return (
    <div className="game-list">
      {archives.length > 0 && (
        <label className="month-picker">
          Month{' '}
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {archives.map((a) => (
              <option key={a} value={a}>
                {archiveLabel(a)}
              </option>
            ))}
          </select>
        </label>
      )}
      {loading && <p className="muted">Loading games…</p>}
      {!loading && archives.length === 0 && <p className="muted">No games found for {username}.</p>}
      {!loading && archives.length > 0 && games.length === 0 && <p className="muted">No standard games this month.</p>}
      <ul>
        {games.map((g) => {
          const u = username.toLowerCase()
          const iAmWhite = g.white.username.toLowerCase() === u
          const opp = iAmWhite ? g.black : g.white
          const o = outcome(g, username)
          return (
            <li key={g.url}>
              <button className="game-row" onClick={() => onOpen(g)}>
                <span className={`badge ${o.cls}`}>{o.label}</span>
                <span className="opp">
                  vs {opp.username} <span className="muted">({opp.rating})</span>
                </span>
                <span className="muted small">
                  {iAmWhite ? 'White' : 'Black'} · {g.time_class} ·{' '}
                  {new Date(g.end_time * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
