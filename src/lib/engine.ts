// Runs Stockfish (WASM, single-threaded "lite" build) in a Web Worker and speaks UCI to it.
// Single-threaded so it works on static hosts like GitHub Pages without special headers.

export interface EngineEval {
  /** Centipawns from White's point of view (undefined when a mate is found). */
  cp?: number
  /** Moves to mate from White's point of view: positive = White mates. */
  mate?: number
  /** Best move in UCI form, e.g. "e2e4". Empty when the game is over. */
  bestMove: string
  /** Principal variation in UCI moves. */
  pv: string[]
  depth: number
}

const ENGINE_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`

export class Engine {
  private worker: Worker
  private ready: Promise<void>
  private listeners = new Set<(line: string) => void>()
  private queue: Promise<unknown> = Promise.resolve()

  constructor(url = ENGINE_URL) {
    this.worker = new Worker(url)
    this.worker.onmessage = (e: MessageEvent) => {
      const line = String(e.data)
      for (const l of this.listeners) l(line)
    }
    this.ready = this.waitFor('uciok', () => this.send('uci'))
      .then(() => this.send('setoption name Hash value 32'))
      .then(() => this.waitFor('readyok', () => this.send('isready')))
      .then(() => undefined)
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd)
  }

  private waitFor(token: string, start: () => void, onLine?: (line: string) => void): Promise<string> {
    return new Promise((resolve) => {
      const l = (line: string) => {
        onLine?.(line)
        if (line.startsWith(token)) {
          this.listeners.delete(l)
          resolve(line)
        }
      }
      this.listeners.add(l)
      start()
    })
  }

  /** Evaluate a position (FEN) to the given depth. Calls are queued, one search at a time. */
  evaluate(fen: string, depth: number): Promise<EngineEval> {
    const run = async (): Promise<EngineEval> => {
      await this.ready
      const whiteToMove = fen.split(' ')[1] === 'w'
      const sign = whiteToMove ? 1 : -1
      let result: EngineEval = { bestMove: '', pv: [], depth: 0 }
      const bestLine = await this.waitFor(
        'bestmove',
        () => {
          this.send(`position fen ${fen}`)
          this.send(`go depth ${depth}`)
        },
        (line) => {
          if (!line.startsWith('info') || !line.includes(' score ')) return
          // Only the main line (multipv 1); ignore bound-only updates.
          if (/ multipv (?!1 )/.test(line) || / (lower|upper)bound/.test(line)) return
          const d = Number(line.match(/ depth (\d+)/)?.[1] ?? 0)
          const cp = line.match(/ score cp (-?\d+)/)
          const mate = line.match(/ score mate (-?\d+)/)
          const pv = line.match(/ pv (.+)$/)?.[1].trim().split(/\s+/) ?? []
          result = {
            cp: cp ? sign * Number(cp[1]) : undefined,
            mate: mate ? sign * Number(mate[1]) : undefined,
            bestMove: pv[0] ?? result.bestMove,
            pv,
            depth: d,
          }
        },
      )
      const best = bestLine.split(/\s+/)[1]
      if (best && best !== '(none)') result.bestMove = best
      else result.bestMove = ''
      return result
    }
    const p = this.queue.then(run, run)
    this.queue = p.catch(() => undefined)
    return p
  }

  terminate() {
    this.worker.terminate()
    this.listeners.clear()
  }
}
