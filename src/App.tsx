import { useState } from 'react'
import { GameList } from './components/GameList'
import { Progress } from './components/Progress'
import { Puzzles } from './components/Puzzles'
import { Replay } from './components/Replay'
import type { ChessComGame } from './lib/chesscom'
import { parsePgn, userColor, type ParsedGame } from './lib/game'
import { listPuzzles } from './lib/store'

const USERNAME_KEY = 'chess-tutor:username'

function loadUsername(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) ?? ''
  } catch {
    return ''
  }
}

type Tab = 'games' | 'puzzles' | 'progress'

export interface OpenGame {
  game: ParsedGame
  pgn: string
  meta?: { time?: number; timeClass?: string }
}

export default function App() {
  const [username, setUsername] = useState(loadUsername)
  const [draft, setDraft] = useState(username)
  const [tab, setTab] = useState<Tab>('games')
  const [open, setOpen] = useState<OpenGame | null>(null)
  const [pgnText, setPgnText] = useState('')
  const [pgnError, setPgnError] = useState<string | null>(null)

  const saveUsername = (e: React.FormEvent) => {
    e.preventDefault()
    const u = draft.trim()
    setUsername(u)
    try {
      localStorage.setItem(USERNAME_KEY, u)
    } catch {
      /* storage unavailable: fine, just not remembered */
    }
  }

  const openChessCom = (g: ChessComGame) => {
    try {
      setOpen({ game: parsePgn(g.pgn), pgn: g.pgn, meta: { time: g.end_time * 1000, timeClass: g.time_class } })
    } catch {
      alert('Could not read this game.')
    }
  }

  const openPasted = () => {
    try {
      setOpen({ game: parsePgn(pgnText), pgn: pgnText })
      setPgnError(null)
    } catch {
      setPgnError("That doesn't look like a valid PGN.")
    }
  }

  const due = (() => {
    const now = Date.now()
    return listPuzzles().filter((p) => p.due <= now).length
  })()

  const nav = (
    <nav className="tabs">
      <span className="brand">Chess Tutor</span>
      <button className={tab === 'games' && !open ? 'on' : ''} onClick={() => { setOpen(null); setTab('games') }}>
        Games
      </button>
      <button className={tab === 'puzzles' && !open ? 'on' : ''} onClick={() => { setOpen(null); setTab('puzzles') }}>
        Puzzles{due > 0 && <span className="count">{due}</span>}
      </button>
      <button className={tab === 'progress' && !open ? 'on' : ''} onClick={() => { setOpen(null); setTab('progress') }}>
        Progress
      </button>
    </nav>
  )

  if (open) {
    return (
      <main>
        {nav}
        <Replay
          key={open.pgn}
          game={open.game}
          pgn={open.pgn}
          meta={open.meta}
          username={username}
          orientation={userColor(open.game.headers, username) ?? 'white'}
          onBack={() => setOpen(null)}
        />
      </main>
    )
  }

  if (tab === 'progress') {
    return (
      <main>
        {nav}
        <Progress
          onOpen={(g) => {
            try {
              setOpen({ game: parsePgn(g.pgn), pgn: g.pgn, meta: { time: g.time, timeClass: g.timeClass ?? undefined } })
            } catch {
              alert('Could not open this game.')
            }
          }}
        />
      </main>
    )
  }

  if (tab === 'puzzles') {
    return (
      <main>
        {nav}
        <Puzzles />
      </main>
    )
  }

  return (
    <main>
      {nav}
      <p className="muted">Review your chess.com games.</p>

      <form className="username" onSubmit={saveUsername}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="chess.com username"
          aria-label="chess.com username"
        />
        <button type="submit">Load games</button>
      </form>

      {username && <GameList username={username} onOpen={openChessCom} />}

      <details className="paste">
        <summary>Or paste a PGN</summary>
        <textarea
          value={pgnText}
          onChange={(e) => setPgnText(e.target.value)}
          rows={8}
          placeholder={'[Event "Live Chess"]\n...\n1. e4 e5 2. Nf3 ...'}
        />
        {pgnError && <p className="error">{pgnError}</p>}
        <button onClick={openPasted} disabled={!pgnText.trim()}>
          Open game
        </button>
      </details>
    </main>
  )
}
