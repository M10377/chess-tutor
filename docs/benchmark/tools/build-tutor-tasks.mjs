// Builds fixtures/tutor-tasks.json: one tutor task per fixture use (hint or explanation), each with
// the engine facts a tutor is allowed to rely on. All three tutor paths (rule-based, local model,
// chat handoff) are scored on exactly these tasks.
//
//   node --experimental-strip-types --import ./docs/benchmark/tools/ts-resolve.mjs docs/benchmark/tools/build-tutor-tasks.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Chess } from 'chess.js'
import { startEngine } from './engine.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const fx = JSON.parse(readFileSync(path.join(here, '../fixtures/fixtures.json'), 'utf8'))
const ver = JSON.parse(readFileSync(path.join(here, '../results/engine-verification.json'), 'utf8')).results
const eng = startEngine()
const DEPTH = 18

const fmt = (l) => (l.mate !== null ? (l.mate > 0 ? `mate in ${l.mate}` : `gets mated in ${-l.mate}`) : `${l.cp >= 0 ? '+' : ''}${(l.cp / 100).toFixed(2)} pawns`)
function san(fen, pv, n = 8) {
  const c = new Chess(fen)
  const s = []
  for (const u of pv.slice(0, n)) {
    try { s.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san) } catch { break }
  }
  return s
}
async function facts(fen, multipv = 3) {
  const lines = await eng.analyse(fen, { depth: DEPTH, multipv })
  return lines.map((l) => ({ line: san(fen, l.pv), eval: fmt(l), evalCp: l.mate !== null ? Math.sign(l.mate) * 10000 : l.cp }))
}
async function proposedFacts(fen, move) {
  const c = new Chess(fen)
  let m
  try { m = c.move(move) } catch { return { san: move, legal: false } }
  const reply = await facts(c.fen(), 1)
  return { san: m.san, legal: true, fenAfter: c.fen(), opponentBest: reply[0] }
}
const firstMove = (fen, s) => { const m = new Chess(fen).move(s); return { san: m.san, from: m.from, to: m.to, piece: m.piece } }
const side = (fen) => (fen.split(' ')[1] === 'w' ? 'White' : 'Black')

const tasks = []
const add = async (t) => {
  t.sideToMove = side(t.fen)
  t.engine ??= await facts(t.fen, t.multipv ?? 3)
  delete t.multipv
  if (t.solution) t.solutionFirst = firstMove(t.fen, t.solution[0])
  tasks.push(t)
}

// Lesson
const L = fx.lessons[0].steps
await add({ id: 'L1-explain', fixture: 'L1', mode: 'explain', level: 'beginner', fen: L[0].fen, question: 'Why is Ra8 checkmate? Teach me the pattern.', solution: ['Ra8#'] })
await add({ id: 'L1-transfer', fixture: 'L1', mode: 'critique', level: 'beginner', fen: L[2].fen, question: 'Can I do the back-rank mate with Ra8 here too?', proposed: await proposedFacts(L[2].fen, 'Ra8') })

// Puzzles: a hint (no spoilers) and an explanation after solving
for (const p of fx.puzzles) {
  const r = ver[p.id]
  const level = p.band === 'beginner' ? 'beginner' : p.band === 'club' ? 'club' : 'improver'
  const sol = r.solution.split(' ')
  await add({ id: `${p.id}-hint`, fixture: p.id, mode: 'hint', level, fen: r.puzzleFen, question: "I'm stuck on this puzzle. Give me a hint, but don't tell me the move.", solution: sol, themes: p.themes })
  await add({ id: `${p.id}-explain`, fixture: p.id, mode: 'explain', level, fen: r.puzzleFen, question: `I solved it with ${sol.join(' ')}. Explain why it works and what pattern to remember.`, solution: sol, themes: p.themes })
}

// Games: explain the user's costliest move
for (const g of fx.games) {
  const c = new Chess()
  c.loadPgn(g.pgn)
  const moves = c.history({ verbose: true })
  const labels = ver[g.id].labels
  // costliest Black move by engine label order then first occurrence
  const order = ['blunder', 'mistake', 'inaccuracy']
  let idx = -1
  for (const lab of order) {
    idx = labels.findIndex((l, i) => moves[i].color === 'b' && l.includes(`:${lab}`))
    if (idx >= 0) break
  }
  const m = moves[idx]
  await add({ id: `${g.id}-explain`, fixture: g.id, mode: 'critique', level: 'improver', fen: m.before, question: `In my game I played ${m.san} here (move ${Math.ceil((idx + 1) / 2)}). What was wrong with it?`, proposed: await proposedFacts(m.before, m.san), engineLabel: labels[idx] })
}

// Opening recall: deviation 4.d4 instead of 4.c3
{
  const c = new Chess()
  for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']) c.move(s)
  await add({ id: 'O1-deviation', fixture: 'O1', mode: 'critique', level: 'improver', fen: c.fen(), question: 'My repertoire says 4.c3 here but I played 4.d4. Is that bad? What is the idea of c3?', proposed: await proposedFacts(c.fen(), 'd4'), repertoireMove: 'c3' })
}

// Endgames
for (const e of fx.endgames) {
  const tb = ver[e.id].tablebase
  await add({ id: `${e.id}-explain`, fixture: e.id, mode: 'explain', level: 'improver', fen: e.fen, question: `${e.title}. What is the result with best play and what is the plan?`, tablebase: tb ? { result: tb.category === 'loss' ? 'side to move loses' : tb.category === 'win' ? 'side to move wins' : tb.category, bestMoves: tb.bestMoves, dtm: tb.dtm } : null, multipv: 2 })
}

// AI tutor cases
const T = Object.fromEntries(fx.tutor.map((t) => [t.id, t]))
await add({ id: 'T1-hint', fixture: 'T1', mode: 'hint', level: 'improver', fen: T.T1.fen, question: T.T1.prompt, solution: ['Qg8+', 'Rxg8', 'Nf7#'] })
await add({ id: 'T2-critique', fixture: 'T2', mode: 'critique', level: 'improver', fen: T.T2.fen, question: T.T2.prompt, proposed: await proposedFacts(T.T2.fen, 'Nxe5') })
await add({ id: 'T3-options', fixture: 'T3', mode: 'explain', level: 'improver', fen: T.T3.fen, question: T.T3.prompt, multipv: 4 })
await add({ id: 'T4-illegal', fixture: 'T4', mode: 'critique', level: 'improver', fen: T.T4.fen, question: T.T4.prompt, proposed: await proposedFacts(T.T4.fen, 'Bxf7+'), material: 'equal (both sides have all their pieces and 8 pawns)' })
await add({ id: 'T5-followup', fixture: 'T5', mode: 'critique', level: 'improver', fen: T.T5.fen, question: T.T5.prompt, proposed: await proposedFacts(T.T5.fen, 'Nxf7'), previous: 'Earlier position: after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 the learner asked about 4.Nxe5 and was told ...Qg5 hits e5 and g2. The learner played 4.Nxe5 anyway and Black replied 4...Qg5.' })
await add({ id: 'T6-beginner', fixture: 'T6', mode: 'explain', level: 'beginner', fen: T.T6.fen, question: T.T6.prompt, solution: ['Nc7+'] })
await add({ id: 'T6-club', fixture: 'T6', mode: 'explain', level: 'club', fen: T.T6.fen, question: T.T6.prompt, solution: ['Nc7+'] })

eng.quit()
const out = path.join(here, '../fixtures/tutor-tasks.json')
writeFileSync(out, JSON.stringify({ created: new Date().toISOString(), engine: `Stockfish 19 lite single, depth ${DEPTH}`, count: tasks.length, tasks }, null, 2) + '\n')
console.log('wrote', tasks.length, 'tasks to', path.relative(process.cwd(), out))
