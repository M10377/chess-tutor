import type { EngineEval } from '../lib/engine'
import { formatEval, whiteCp, winPercent } from '../lib/review'

export function EvalBar({ evaluation, orientation }: { evaluation?: EngineEval; orientation: 'white' | 'black' }) {
  const white = evaluation ? winPercent(whiteCp(evaluation)) : 50
  const label = evaluation ? formatEval(evaluation) : ''
  return (
    <div className={`eval-bar ${orientation === 'black' ? 'flipped' : ''}`} title={label} aria-label={`Evaluation ${label}`}>
      <div className="eval-white" style={{ height: `${white}%` }} />
      <span className={`eval-label ${white >= 50 ? 'on-white' : 'on-black'}`}>{label}</span>
    </div>
  )
}
