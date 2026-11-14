// Minimal UCI driver for the Stockfish 19 WASM build that ships with the app (node_modules/stockfish).
// Used only by the benchmark scripts, never by the app.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const ENGINE = path.resolve(here, '../../../node_modules/stockfish/bin/stockfish-19-lite-single.js')

export function startEngine() {
  const p = spawn(process.execPath, [ENGINE], { stdio: ['pipe', 'pipe', 'inherit'] })
  let buf = ''
  let waiter = null
  const lines = []
  p.stdout.on('data', (d) => {
    buf += d
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 1)
      lines.push(line)
      if (waiter && line.startsWith(waiter.token)) {
        const w = waiter
        waiter = null
        w.resolve(lines.splice(0))
      }
    }
  })
  const send = (c) => p.stdin.write(c + '\n')
  const until = (token) => new Promise((resolve) => { waiter = { token, resolve } })
  const ready = (async () => { const u = until('uciok'); send('uci'); await u; const r = until('readyok'); send('setoption name Hash value 64'); send('isready'); await r })()

  /** Multi-PV search. Returns lines sorted by multipv, scores from side-to-move's view. */
  async function analyse(fen, { depth = 18, multipv = 1 } = {}) {
    await ready
    send(`setoption name MultiPV value ${multipv}`)
    const done = until('bestmove')
    send(`position fen ${fen}`)
    send(`go depth ${depth}`)
    const out = await done
    const best = new Map()
    for (const l of out) {
      if (!l.startsWith('info') || !l.includes(' pv ') || / (lower|upper)bound/.test(l)) continue
      const k = Number(l.match(/ multipv (\d+)/)?.[1] ?? 1)
      const d = Number(l.match(/ depth (\d+)/)[1])
      const cp = l.match(/ score cp (-?\d+)/)
      const mate = l.match(/ score mate (-?\d+)/)
      const pv = l.match(/ pv (.+)$/)[1].split(/\s+/)
      best.set(k, { depth: d, cp: cp ? Number(cp[1]) : null, mate: mate ? Number(mate[1]) : null, pv })
    }
    return [...best.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
  }
  return { analyse, quit: () => { send('quit'); p.kill() } }
}
