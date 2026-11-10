import { useMemo } from 'react'
import { computeStats, studyPlanQuestion } from '../lib/stats'
import { listSummaries, type GameSummary } from '../lib/store'
import { AskClaude } from './AskClaude'

const W = 600
const H = 160
const PAD = { l: 34, r: 8, t: 8, b: 20 }

function AccuracyChart({ games, onOpen }: { games: GameSummary[]; onOpen: (g: GameSummary) => void }) {
  const acc = games.map((g) => g.accuracy[g.userColor!])
  const lo = Math.max(0, Math.floor((Math.min(...acc) - 5) / 10) * 10)
  const hi = 100
  const x = (i: number) => PAD.l + (games.length === 1 ? 0.5 : i / (games.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const rolling = acc.map((_, i) => {
    const w = acc.slice(Math.max(0, i - 4), i + 1)
    return w.reduce((a, b) => a + b, 0) / w.length
  })
  const ticks = []
  for (let v = lo; v <= hi; v += lo <= 50 ? 20 : 10) ticks.push(v)
  return (
    <svg className="acc-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Your accuracy in each reviewed game, oldest to newest">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="grid" />
          <text x={PAD.l - 6} y={y(v) + 4} className="tick" textAnchor="end">{v}</text>
        </g>
      ))}
      <text x={PAD.l} y={H - 4} className="tick">oldest</text>
      <text x={W - PAD.r} y={H - 4} className="tick" textAnchor="end">newest</text>
      {games.length > 1 && (
        <polyline points={rolling.map((v, i) => `${x(i)},${y(v)}`).join(' ')} className="trend" />
      )}
      {games.map((g, i) => (
        <circle key={g.key} cx={x(i)} cy={y(acc[i])} r={4} className={`pt ${g.outcome ?? ''}`} onClick={() => onOpen(g)}>
          <title>{`${acc[i].toFixed(1)}% vs ${g.userColor === 'w' ? g.black : g.white}${g.date ? ` (${g.date})` : ''}, ${g.outcome ?? g.result}. Click to open.`}</title>
        </circle>
      ))}
    </svg>
  )
}

export function Progress({ onOpen }: { onOpen: (g: GameSummary) => void }) {
  const stats = useMemo(() => computeStats(listSummaries()), [])

  if (!stats) {
    return (
      <div className="progress-page">
        <h2>Your progress</h2>
        <p className="muted">
          Nothing here yet. Review some of your games (the "Analyze all" button on the Games tab does a whole month) and your
          accuracy, openings and mistake patterns show up here.
        </p>
      </div>
    )
  }

  const { win, draw, loss } = stats
  const phaseMax = Math.max(0.1, ...Object.values(stats.phase))
  const trend =
    stats.recentAccuracy !== null && stats.earlierAccuracy !== null ? stats.recentAccuracy - stats.earlierAccuracy : null

  return (
    <div className="progress-page">
      <h2>Your progress</h2>
      <div className="tiles">
        <div className="tile"><div className="big">{stats.games.length}</div><div className="muted small">games reviewed</div></div>
        <div className="tile"><div className="big">{win}–{draw}–{loss}</div><div className="muted small">wins–draws–losses</div></div>
        <div className="tile">
          <div className="big">{stats.avgAccuracy.toFixed(1)}</div>
          <div className="muted small">
            average accuracy
            {trend !== null && <> · last 10 games vs before: <b className={trend >= 0 ? 'up' : 'down'}>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}</b></>}
          </div>
        </div>
        <div className="tile">
          <div className="big">{stats.perGame.blunder.toFixed(1)}</div>
          <div className="muted small">blunders per game ({stats.perGame.mistake.toFixed(1)} mistakes)</div>
        </div>
      </div>

      <h3>Accuracy per game</h3>
      <AccuracyChart games={stats.games} onOpen={onOpen} />
      <p className="muted small">Each dot is a game (green win, red loss, grey draw); the line is your 5-game average. Click a dot to open that game.</p>

      <h3>Where your errors happen</h3>
      <div className="phases">
        {(['opening', 'middlegame', 'endgame'] as const).map((p) => (
          <div className="phase-row" key={p}>
            <span className="phase-name">{p[0].toUpperCase() + p.slice(1)}</span>
            <span className="phase-bar"><span style={{ width: `${(stats.phase[p] / phaseMax) * 100}%` }} /></span>
            <span className="phase-val">{stats.phase[p].toFixed(1)}</span>
          </div>
        ))}
      </div>
      <p className="muted small">Inaccuracies, mistakes and blunders per game. Opening = first 10 moves; endgame = few pieces left.</p>

      {stats.tips.length > 0 && (
        <>
          <h3>What to work on</h3>
          <ul className="tips">{stats.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          <AskClaude label="Ask Claude for a study plan" prompt={() => studyPlanQuestion(stats)} />
        </>
      )}

      <h3>Your openings</h3>
      <div className="table-wrap">
        <table className="openings">
          <thead>
            <tr><th>Opening</th><th>As</th><th>Games</th><th>W–D–L</th><th>Score</th><th>Accuracy</th></tr>
          </thead>
          <tbody>
            {stats.openings.map((o) => (
              <tr key={o.color + o.name}>
                <td>{o.name}</td>
                <td>{o.color === 'w' ? 'White' : 'Black'}</td>
                <td>{o.games}</td>
                <td>{o.win}–{o.draw}–{o.loss}</td>
                <td>{Math.round(((o.win + o.draw / 2) / o.games) * 100)}%</td>
                <td>{o.accuracy.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
