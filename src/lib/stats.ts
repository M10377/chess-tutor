// Aggregates reviewed-game summaries into the numbers the Progress tab shows.

import type { GamePhase, GameSummary } from './store'

export interface OpeningRow {
  name: string
  color: 'w' | 'b'
  games: number
  win: number
  draw: number
  loss: number
  accuracy: number
}

export interface Stats {
  games: GameSummary[]
  win: number
  draw: number
  loss: number
  avgAccuracy: number
  recentAccuracy: number | null
  earlierAccuracy: number | null
  perGame: { inaccuracy: number; mistake: number; blunder: number }
  phase: Record<GamePhase, number>
  openings: OpeningRow[]
  tips: string[]
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Only games where the user is known; oldest first. */
export function computeStats(all: GameSummary[]): Stats | null {
  const games = all.filter((g) => g.userColor).sort((a, b) => a.time - b.time)
  if (!games.length) return null
  const acc = games.map((g) => g.accuracy[g.userColor!])
  const RECENT = 10
  const recent = acc.length >= RECENT * 2 ? avg(acc.slice(-RECENT)) : null
  const earlier = recent !== null ? avg(acc.slice(0, -RECENT)) : null

  const phase: Record<GamePhase, number> = { opening: 0, middlegame: 0, endgame: 0 }
  for (const g of games) for (const k of Object.keys(phase) as GamePhase[]) phase[k] += g.errorsByPhase[k] / games.length

  const perGame = {
    inaccuracy: avg(games.map((g) => g.counts[g.userColor!].inaccuracy)),
    mistake: avg(games.map((g) => g.counts[g.userColor!].mistake)),
    blunder: avg(games.map((g) => g.counts[g.userColor!].blunder)),
  }

  const byOpening = new Map<string, OpeningRow & { accs: number[] }>()
  for (const g of games) {
    const name = g.opening ?? 'Unknown opening'
    const key = `${g.userColor}|${name}`
    const row = byOpening.get(key) ?? { name, color: g.userColor!, games: 0, win: 0, draw: 0, loss: 0, accuracy: 0, accs: [] }
    row.games++
    if (g.outcome === 'win') row.win++
    else if (g.outcome === 'draw') row.draw++
    else if (g.outcome === 'loss') row.loss++
    row.accs.push(g.accuracy[g.userColor!])
    byOpening.set(key, row)
  }
  const openings = [...byOpening.values()]
    .map(({ accs, ...r }) => ({ ...r, accuracy: avg(accs) }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name))

  const win = games.filter((g) => g.outcome === 'win').length
  const draw = games.filter((g) => g.outcome === 'draw').length
  const loss = games.filter((g) => g.outcome === 'loss').length

  return {
    games,
    win,
    draw,
    loss,
    avgAccuracy: avg(acc),
    recentAccuracy: recent,
    earlierAccuracy: earlier,
    perGame,
    phase,
    openings,
    tips: tips(games.length, perGame, phase, openings),
  }
}

function tips(n: number, perGame: Stats['perGame'], phase: Record<GamePhase, number>, openings: OpeningRow[]): string[] {
  const out: string[] = []
  if (n < 5) out.push('Review at least 5 games for reliable patterns. "Analyze all" on the Games tab does a month at once.')
  if (perGame.blunder >= 1)
    out.push(
      `You average ${perGame.blunder.toFixed(1)} blunders a game. Before every move, check what your opponent's last move attacks and whether your move leaves a piece undefended.`,
    )
  const worst = (Object.entries(phase) as [GamePhase, number][]).sort((a, b) => b[1] - a[1])[0]
  if (worst && worst[1] > 0) {
    const advice: Record<GamePhase, string> = {
      opening: 'Most of your errors come in the opening (first 10 moves). Pick one opening for White and one defense for Black and learn their first few moves and ideas.',
      middlegame: 'Most of your errors come in the middlegame. Your daily puzzles target exactly these positions; aim to clear them each day.',
      endgame: 'Most of your errors come in the endgame. Practice basic endings: king and pawn, rook endings, and checkmating with a queen or rook.',
    }
    out.push(advice[worst[0]])
  }
  const score = (o: OpeningRow) => (o.win + o.draw / 2) / o.games
  const weak = openings.filter((o) => o.games >= 3).sort((a, b) => score(a) - score(b))[0]
  if (weak && score(weak) < 0.45)
    out.push(
      `Your weakest opening: ${weak.name} as ${weak.color === 'w' ? 'White' : 'Black'} (${Math.round(score(weak) * 100)}% score over ${weak.games} games). It is worth studying or switching away from.`,
    )
  return out
}

export function studyPlanQuestion(s: Stats): string {
  const me = s.games.map((g) => g.accuracy[g.userColor!])
  const lines = [
    `I'm an improving chess player. Here are my stats from ${s.games.length} games reviewed with Stockfish. Please give me a focused 2-week study plan (about 30 minutes a day) based on them.`,
    '',
    `Results: ${s.win} wins, ${s.draw} draws, ${s.loss} losses. Average accuracy ${s.avgAccuracy.toFixed(1)}% (last games: ${me.slice(-10).map((a) => a.toFixed(0)).join(', ')}).`,
    `Per game: ${s.perGame.inaccuracy.toFixed(1)} inaccuracies, ${s.perGame.mistake.toFixed(1)} mistakes, ${s.perGame.blunder.toFixed(1)} blunders.`,
    `Errors per game by phase: opening ${s.phase.opening.toFixed(1)}, middlegame ${s.phase.middlegame.toFixed(1)}, endgame ${s.phase.endgame.toFixed(1)}.`,
    'Openings (as color: games, W-D-L, accuracy):',
    ...s.openings.slice(0, 8).map((o) => `- ${o.name} as ${o.color === 'w' ? 'White' : 'Black'}: ${o.games}, ${o.win}-${o.draw}-${o.loss}, ${o.accuracy.toFixed(0)}%`),
    '',
    'I have a puzzle trainer built from my own mistakes and can review games with Stockfish. Keep the plan concrete and plain, and base it only on these numbers.',
  ]
  return lines.join('\n')
}
