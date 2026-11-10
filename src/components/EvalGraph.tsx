import type { GameReview, MoveLabel } from '../lib/review'
import { whiteCp, winPercent } from '../lib/review'

const W = 600
const H = 120
const DOT: Partial<Record<MoveLabel, string>> = {
  inaccuracy: 'var(--inaccuracy)',
  mistake: 'var(--mistake)',
  blunder: 'var(--blunder)',
}

/** White's winning chances over the game. Click to jump to a move. */
export function EvalGraph({ review, ply, onSelect }: { review: GameReview; ply: number; onSelect: (ply: number) => void }) {
  const n = review.evals.length - 1
  const x = (i: number) => (n === 0 ? 0 : (i / n) * W)
  const y = (i: number) => H - (winPercent(whiteCp(review.evals[i])) / 100) * H
  const line = review.evals.map((_, i) => `${x(i).toFixed(1)},${y(i).toFixed(1)}`).join(' ')
  const area = `0,${H} ${line} ${W},${H}`

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onSelect(Math.round(((e.clientX - r.left) / r.width) * n))
  }

  return (
    <svg className="eval-graph" viewBox={`0 0 ${W} ${H}`} onClick={onClick} role="img"
      aria-label="Evaluation graph: white area shows White's winning chances over the game">
      <rect width={W} height={H} className="graph-black" />
      <polygon points={area} className="graph-white" />
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="graph-mid" />
      <line x1={x(ply)} x2={x(ply)} y1={0} y2={H} className="graph-cursor" />
      {review.moves.map((m) =>
        DOT[m.label] ? <circle key={m.ply} cx={x(m.ply)} cy={y(m.ply)} r={4} fill={DOT[m.label]} /> : null,
      )}
    </svg>
  )
}
