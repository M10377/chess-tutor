import { Chess } from 'chess.js'
import { useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { winPercent, whiteCp } from '../lib/review'
import { listPuzzles, savePuzzles, schedule, type Puzzle } from '../lib/store'
import { getEngine } from '../lib/useReview'

type Status = 'solving' | 'checking' | 'correct' | 'wrong' | 'revealed'

/** A move is accepted if it's the engine's choice or keeps nearly the same winning chances. */
const TOLERANCE = 4
const CHECK_DEPTH = 14

function dueQueue(all: Puzzle[], includeNotDue: boolean): Puzzle[] {
  const now = Date.now()
  const list = includeNotDue ? all : all.filter((p) => p.due <= now)
  return [...list].sort((a, b) => a.due - b.due)
}

export function Puzzles() {
  const [all, setAll] = useState(listPuzzles)
  const [practiceAll, setPracticeAll] = useState(false)
  const [sessionIds, setSessionIds] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<Status>('solving')
  const [failed, setFailed] = useState(false)
  const [fen, setFen] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [streak, setStreak] = useState({ solved: 0, seen: 0 })

  const now = Date.now()
  const due = all.filter((p) => p.due <= now).length
  const puzzle = sessionIds ? all.find((p) => p.id === sessionIds[index]) : undefined

  const begin = (includeNotDue: boolean) => {
    const q = dueQueue(all, includeNotDue)
    if (!q.length) return
    setPracticeAll(includeNotDue)
    setSessionIds(q.map((p) => p.id))
    setIndex(0)
    load(q[0])
    setStreak({ solved: 0, seen: 0 })
  }

  const load = (p: Puzzle) => {
    setFen(p.fen)
    setStatus('solving')
    setFailed(false)
    setSelected(null)
    setMessage('')
  }

  const update = (p: Puzzle, solvedFirstTry: boolean) => {
    const next = all.map((x) => (x.id === p.id ? schedule(x, solvedFirstTry) : x))
    setAll(next)
    savePuzzles(next)
    setStreak((s) => ({ solved: s.solved + (solvedFirstTry ? 1 : 0), seen: s.seen + 1 }))
  }

  const tryMove = (from: string, to: string): boolean => {
    if (!puzzle || status !== 'solving') return false
    const chess = new Chess(puzzle.fen)
    const promotion = puzzle.bestUci.slice(0, 4) === from + to ? puzzle.bestUci[4] : 'q'
    let move
    try {
      move = chess.move({ from, to, promotion })
    } catch {
      return false
    }
    setFen(chess.fen())
    setSelected(null)
    const uci = move.from + move.to + (move.promotion ?? '')
    if (uci === puzzle.bestUci) {
      succeed(puzzle, `Correct! ${move.san} is the engine's top move.`)
      return true
    }
    // Not the engine's move: check whether it's just as good.
    setStatus('checking')
    setMessage('Checking your move…')
    const fenAfter = chess.fen()
    getEngine()
      .evaluate(fenAfter, CHECK_DEPTH)
      .then((e) => {
        const sign = puzzle.color === 'w' ? 1 : -1
        const finished = !e.bestMove
        const mateDelivered = finished && chess.isCheckmate()
        const win = mateDelivered ? 100 : finished ? 50 : winPercent(sign * whiteCp(e))
        if (win >= puzzle.bestWin - TOLERANCE) {
          succeed(puzzle, `Correct! ${move.san} works too (the engine's first choice was ${puzzle.bestSan}).`)
        } else {
          fail(puzzle, `${move.san} isn't it. Try again, or show the answer.`)
        }
      })
      .catch(() => fail(puzzle, 'Could not check that move. Try again.'))
    return true
  }

  const succeed = (p: Puzzle, msg: string) => {
    setStatus('correct')
    setMessage(msg)
    if (!failed) update(p, true)
  }

  const fail = (p: Puzzle, msg: string) => {
    setStatus('wrong')
    setMessage(msg)
    if (!failed) {
      setFailed(true)
      update(p, false)
    }
  }

  const retry = () => {
    if (!puzzle) return
    setFen(puzzle.fen)
    setStatus('solving')
    setMessage('')
  }

  const reveal = () => {
    if (!puzzle) return
    if (!failed) {
      setFailed(true)
      update(puzzle, false)
    }
    setFen(puzzle.fen)
    setStatus('revealed')
    setMessage(`The answer was ${puzzle.bestSan}.`)
  }

  const next = () => {
    if (!sessionIds) return
    const i = index + 1
    if (i >= sessionIds.length) {
      setSessionIds(null)
      return
    }
    setIndex(i)
    const p = all.find((x) => x.id === sessionIds[i])
    if (p) load(p)
  }

  const onSquareClick = ({ square, piece }: { square: string; piece: { pieceType: string } | null }) => {
    if (!puzzle || status !== 'solving') return
    const mine = piece && piece.pieceType[0] === puzzle.color
    if (selected && !mine) {
      tryMove(selected, square)
      return
    }
    setSelected(mine ? square : null)
  }

  const arrows = useMemo(
    () =>
      puzzle && status === 'revealed'
        ? [{ startSquare: puzzle.bestUci.slice(0, 2), endSquare: puzzle.bestUci.slice(2, 4), color: 'rgba(40, 140, 60, 0.85)' }]
        : [],
    [puzzle, status],
  )

  if (!puzzle) {
    return (
      <div className="puzzles-home">
        <h2>Puzzles from your games</h2>
        {all.length === 0 ? (
          <p className="muted">
            No puzzles yet. Review some games (or use "Analyze all" on the Games tab) and every mistake or blunder you made
            becomes a puzzle here.
          </p>
        ) : (
          <>
            <p>
              <b>{due}</b> due now · {all.length} total · {all.filter((p) => p.box >= 3).length} learned
            </p>
            {streak.seen > 0 && (
              <p className="muted">Last session: solved {streak.solved} of {streak.seen} on the first try.</p>
            )}
            <div className="row">
              <button className="primary" disabled={!due} onClick={() => begin(false)}>
                {due ? `Start (${due} due)` : 'Nothing due right now'}
              </button>
              <button onClick={() => begin(true)}>Practice all {all.length}</button>
            </div>
            <p className="muted small">
              Puzzles you solve come back after 1, 3, 7, 14, then 30 days. Ones you miss come back in 10 minutes.
            </p>
          </>
        )}
      </div>
    )
  }

  const side = puzzle.color === 'w' ? 'White' : 'Black'
  return (
    <div className="replay">
      <div className="board-col">
        <div className="board">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: puzzle.color === 'w' ? 'white' : 'black',
              allowDragging: status === 'solving',
              canDragPiece: ({ piece }) => piece.pieceType[0] === puzzle.color,
              onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare ? tryMove(sourceSquare, targetSquare) : false),
              onSquareClick,
              squareStyles: selected ? { [selected]: { background: 'rgba(255, 213, 0, 0.5)' } } : {},
              arrows,
              allowDrawingArrows: false,
              animationDurationInMs: 150,
            }}
          />
        </div>
      </div>
      <div className="side-col">
        <button className="link" onClick={() => setSessionIds(null)}>← End session</button>
        <p className="muted small">
          Puzzle {index + 1} of {sessionIds!.length}
          {practiceAll ? ' (practice)' : ''}
        </p>
        <h2>{side} to move. Find the best move.</h2>
        <p>
          In your game vs {puzzle.opponent}
          {puzzle.date ? ` (${puzzle.date})` : ''}, you played <b>{puzzle.playedSan}</b> here on move {puzzle.moveNumber},
          which was a {puzzle.label}.
        </p>
        {message && <p className={`puzzle-msg ${status}`}>{message}</p>}
        <div className="row">
          {status === 'wrong' && <button onClick={retry}>Try again</button>}
          {(status === 'solving' || status === 'wrong') && <button onClick={reveal}>Show answer</button>}
          {(status === 'correct' || status === 'revealed') && (
            <button className="primary" onClick={next}>{index + 1 < sessionIds!.length ? 'Next puzzle' : 'Finish'}</button>
          )}
        </div>
        <p className="muted small">Drag a piece, or tap it and then tap where it should go.</p>
      </div>
    </div>
  )
}
