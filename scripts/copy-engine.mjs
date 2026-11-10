// Copies the Stockfish browser engine (lite, single-threaded) from node_modules into public/,
// so Vite serves it as a static file. Runs before `dev` and `build`.
import { copyFileSync, mkdirSync } from 'node:fs'

const src = 'node_modules/stockfish/bin'
const dest = 'public/stockfish'
mkdirSync(dest, { recursive: true })
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  copyFileSync(`${src}/${f}`, `${dest}/${f}`)
}
