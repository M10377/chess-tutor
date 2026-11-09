import { useState } from 'react'
import { GameList } from './components/GameList'
import { Replay } from './components/Replay'
import type { ChessComGame } from './lib/chesscom'
import { parsePgn, userColor, type ParsedGame } from './lib/game'

const USERNAME_KEY = 'chess-tutor:username'

function loadUsername(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function App() {
  const [username, setUsername] = useState(loadUsername)
  const [draft, setDraft] = useState(username)
  const [game, setGame] = useState<ParsedGame | null>(null)
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
      setGame(parsePgn(g.pgn))
    } catch {
      alert('Could not read this game.')
    }
  }

  const openPasted = () => {
    try {
      setGame(parsePgn(pgnText))
      setPgnError(null)
    } catch {
      setPgnError("That doesn't look like a valid PGN.")
    }
  }

  if (game) {
    return (
      <main>
        <Replay
          game={game}
          orientation={userColor(game.headers, username) ?? 'white'}
          onBack={() => setGame(null)}
        />
      </main>
    )
  }

  return (
    <main>
      <header>
        <h1>Chess Tutor</h1>
        <p className="muted">Review your chess.com games.</p>
      </header>

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
