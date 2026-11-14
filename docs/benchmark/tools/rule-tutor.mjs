// Path 1 prototype: a tutor with no language model at all. It turns Stockfish lines, legal-move
// checks and simple motif detection into graduated hints and short explanations.
// Research prototype only (not app code); it shows what the in-app version would say.
//
//   node docs/benchmark/tools/rule-tutor.mjs [--depth short|normal|deep]
// Writes docs/benchmark/results/rule-tutor-<depth>.json

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Chess } from 'chess.js'
import { score } from './tutor-score.mjs'

const NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }
const DEF = {
  fork: 'A fork is one piece attacking two things at once.',
  'double attack': 'A double attack hits two targets with one move, so your opponent can only save one.',
  'back-rank mate': "A back-rank mate happens when a king is stuck behind its own pawns and a rook or queen checks along the last row.",
  'smothered mate': "A smothered mate is a knight checkmate against a king boxed in by its own pieces.",
  sacrifice: 'A sacrifice gives up material on purpose to get something bigger.',
  skewer: 'A skewer attacks a valuable piece that must move, exposing a piece behind it.',
  'loose piece': 'A loose piece is one that nothing defends.',
  pin: 'A pin is when a piece cannot move without exposing a more valuable piece behind it.',
}
const DRILL = {
  pin: 'Do 10 "pin" puzzles.',
  fork: 'Do 10 "fork" puzzles.', 'double attack': 'Do 10 "double attack" puzzles and, before each move, list everything your opponent\'s last move attacks.',
  'back-rank mate': 'Do 10 "back-rank mate" puzzles and check your own back rank before every rook move.',
  'smothered mate': 'Do 5 "smothered mate" puzzles.', sacrifice: 'Do 10 "sacrifice" puzzles.', skewer: 'Do 10 "skewer" puzzles.',
  'loose piece': 'Before each move this week, ask: which of my pieces is undefended, and can it be attacked with check?',
  checkmate: 'Do 10 "mate in 2" puzzles.', endgame: 'Play this position against the engine until you win (or hold) it twice in a row.',
  opening: 'Replay your repertoire line 3 times from memory.', choice: 'Pick one of these moves and play the first 5 moves of its plan against the engine.',
}
const sq = (s) => s
const pieceAt = (c, s) => c.get(s)

function applyLine(fen, line) {
  const c = new Chess(fen)
  const ms = []
  for (const s of line) { try { ms.push(c.move(s)) } catch { break } }
  return { c, ms }
}
function material(fen) {
  const b = fen.split(' ')[0]
  let w = 0, k = 0
  for (const ch of b) { const v = VALUE[ch.toLowerCase()]; if (!v || v === 100) continue; if (ch === ch.toUpperCase()) w += v; else k += v }
  return { w, b: k }
}
/** Enemy pieces worth attacking that the piece on `square` attacks after the move. */
function targets(c, square) {
  const p = c.get(square)
  if (!p) return []
  const out = []
  for (const row of c.board()) for (const x of row) {
    if (!x || x.color === p.color) continue
    if (!c.attackers(x.square, p.color).includes(square)) continue
    const defended = c.attackers(x.square, x.color).length > 0
    if (x.type === 'k' || VALUE[x.type] > VALUE[p.type] || !defended) out.push({ square: x.square, type: x.type, defended })
  }
  return out
}
function motifs(fen, line) {
  const { c, ms } = applyLine(fen, line)
  const m = ms[0]
  if (!m) return { list: [] }
  const list = []
  const c1 = new Chess(m.after)
  const t1 = targets(c1, m.to)
  const sac = ms[1] && ms[1].captured && ms[1].to === m.to && VALUE[m.piece] > 1
  const lm = lineMotif(c1, m.to)
  if (lm) list.push(lm.kind)
  if (!sac && !lm && t1.length >= 2) list.push(t1.some((t) => t.type === 'k') ? 'fork' : 'double attack')
  if (sac) list.push('sacrifice')
  const last = ms[ms.length - 1]
  const mated = ms.length && new Chess(last.after).isCheckmate()
  if (mated) {
    const end = new Chess(last.after)
    const kSq = end.board().flat().find((x) => x && x.type === 'k' && x.color === end.turn()).square
    const backRank = kSq[1] === (end.turn() === 'w' ? '1' : '8')
    if (last.piece === 'n') list.push('smothered mate')
    else if (backRank && (last.piece === 'r' || last.piece === 'q') && last.to[1] === kSq[1]) list.push('back-rank mate')
    list.push('checkmate')
  }
  return { list, first: m, ms, end: c, mated, mateIn: mated ? Math.ceil(ms.length / 2) : null, t1, lm }
}
const DIRS = { r: [[1,0],[-1,0],[0,1],[0,-1]], b: [[1,1],[1,-1],[-1,1],[-1,-1]] }
DIRS.q = [...DIRS.r, ...DIRS.b]
/** Pin or skewer created by a sliding piece on `square`: first enemy piece on a ray, then a more valuable one behind. */
function lineMotif(c, square) {
  const p = c.get(square)
  if (!p || !DIRS[p.type]) return null
  for (const [df, dr] of DIRS[p.type]) {
    let f = square.charCodeAt(0) - 97, r = Number(square[1]) - 1
    const hits = []
    for (;;) {
      f += df; r += dr
      if (f < 0 || f > 7 || r < 0 || r > 7) break
      const x = c.get(String.fromCharCode(97 + f) + (r + 1))
      if (!x) continue
      if (x.color === p.color) break
      hits.push(x)
      if (hits.length === 2) break
    }
    if (hits.length === 2) {
      const [front, back] = hits
      if (front.type === 'k' || VALUE[front.type] > VALUE[back.type] && VALUE[back.type] >= 3) return { kind: 'skewer', front, back }
      if (VALUE[back.type] > VALUE[front.type]) return { kind: 'pin', front, back }
    }
  }
  return null
}
const listTargets = (ts) => ts.map((t) => `the ${NAME[t.type]} on ${t.square}`).join(' and ')

function hints(t) {
  const sol = t.solution ?? t.engine[0].line
  const mo = motifs(t.fen, sol)
  const m = mo.first
  const H = []
  // Level 1: what to look at, never the piece or square
  if (mo.mated) H.push(`There is a forced checkmate in ${mo.mateIn}. Look at the enemy king: which squares can it escape to, and what blocks them?`)
  else if (mo.list.includes('fork') || mo.list.includes('double attack')) H.push('Look for a move that attacks two things at once, ideally with check.')
  else if (mo.list.includes('skewer')) H.push('Two enemy pieces stand on the same line. Can you attack the front one so that it has to move?')
  else if (mo.list.includes('pin')) H.push('Look for an enemy piece that cannot move without exposing something more valuable behind it.')
  else if (m.san.includes('+')) H.push('Start with a forcing move: a check. After the reply, look at what is left undefended.')
  else if (m.captured) H.push('Something of your opponent\'s is loose. Count attackers and defenders.')
  else H.push('Look for your opponent\'s most dangerous threat first, then for a move that improves your worst-placed piece.')
  // Level 2: the piece (partial spoiler)
  H.push(`Use your ${NAME[m.piece]}.`)
  // Level 3: the move
  H.push(`The move is ${m.san}${sol.length > 1 ? `, and the main line is ${sol.slice(0, 5).join(' ')}` : ''}.`)
  return { hints: H, motifs: mo.list }
}

function explain(t, depth) {
  const lvlBeg = t.level === 'beginner', club = t.level === 'club'
  const S = []
  let drill = 'checkmate'
  const best = t.engine[0]
  const mat = material(t.fen)
  if (t.proposed && !t.proposed.legal) {
    S.push(`${t.proposed.san} is not a legal move in this position${/x/.test(t.proposed.san) ? ': no piece of yours can capture on that square right now' : ''}.`)
    if (t.question.match(/pawn up|piece up|ahead/i)) S.push(mat.w === mat.b ? 'Material is level (equal pieces and pawns).' : `Material: White ${mat.w}, Black ${mat.b} (pawn = 1, knight/bishop = 3, rook = 5, queen = 9).`)
    S.push(`Good moves here are ${t.engine.slice(0, 3).map((e) => `${e.line[0]} (${e.eval})`).join(', ')}.`)
    drill = 'choice'
  } else if (t.proposed) {
    const p = t.proposed
    const reply = p.opponentBest.line
    const after = applyLine(p.fenAfter, reply.slice(0, 1))
    const r1 = after.ms[0]
    const tg = r1 ? targets(new Chess(r1.after), r1.to) : []
    const bestFirst = best.line[0]
    if (bestFirst === p.san || (t.repertoireMove && p.san !== t.repertoireMove && Math.abs(best.evalCp) < 60)) {
      if (t.repertoireMove) { S.push(`${p.san} is playable (the engine rates the position about equal after it), but it is not your repertoire move ${t.repertoireMove}.`); S.push(`${t.repertoireMove} prepares d4 so that a pawn can recapture in the centre; ${p.san} at once lets Black open the position early (engine line: ${reply.slice(0, 4).join(' ')}).`); drill = 'opening' }
      else S.push(`${p.san} is the engine's top choice here.`)
    } else {
      if (p.opponentBest.eval.startsWith('mate')) { S.push(`${p.san} is a serious mistake: it allows a forced checkmate, ${[p.san, ...reply].join(' ')}.`); S.push(`Better is ${bestFirst} (${best.eval} for you)${depth !== 'short' ? `, main line ${best.line.slice(0, 4).join(' ')}` : ''}.`); drill = 'checkmate' } else {
      S.push(`${p.san} is not best. After ${p.san}, your opponent plays ${reply[0]}${tg.length >= 2 ? `, attacking ${listTargets(tg)} at the same time` : r1?.captured ? `, winning your ${NAME[r1.captured]}` : ''}.`)
      if (tg.length >= 2) drill = 'double attack'
      else if (r1?.san.includes('#')) drill = 'checkmate'
      else drill = 'loose piece'
      const ev = p.opponentBest.eval
      S.push(`The engine line ${[p.san, ...reply.slice(0, depth === 'deep' ? 7 : 4)].join(' ')} leaves your opponent ${ev.startsWith('mate') ? `with ${ev}` : `${ev} better`}.`)
      S.push(`Better is ${bestFirst} (${best.eval} for you)${depth !== 'short' ? `, main line ${best.line.slice(0, 4).join(' ')}` : ''}.`)
      if (lvlBeg && DEF[drill]) S.push(DEF[drill])
      }
    }
  } else if (t.tablebase) {
    const res = t.tablebase.result
    S.push(`With perfect play, ${res === 'draw' ? 'this is a draw' : res === 'side to move wins' ? `${t.sideToMove} wins` : `${t.sideToMove} loses`}${t.tablebase.dtm ? ` (mate in about ${Math.ceil(Math.abs(t.tablebase.dtm) / 2)} moves)` : ''}. Best moves: ${t.tablebase.bestMoves.join(', ')}.`)
    const PLAN = {
      E1: 'Plan: use the queen to shrink the box around the enemy king (stay a knight\'s move away to avoid stalemate), walk your own king up, then mate on the edge.',
      E2: 'Plan (Lucena): get your rook to the 4th rank to "build a bridge", so your king can step out and the rook blocks the checks.',
      E3: 'Plan: the defending king keeps the opposition (kings face each other with one square between, and the other side must move). With White to move here, Black can always answer and draw; if Black had to move, White would win.',
      E4: 'Plan (Philidor): keep the rook on the 6th rank to stop the white king advancing; once the pawn moves forward, swing the rook back and check from behind.',
    }
    S.push(PLAN[t.fixture] ?? '')
    drill = 'endgame'
  } else if (t.fixture === 'T3') {
    const close = t.engine.filter((e) => Math.abs(e.evalCp - best.evalCp) <= 50)
    S.push(`There is no single best move here: ${close.map((e) => `${e.line[0]} (${e.eval})`).join(', ')} are within half a pawn of each other.`)
    if (depth !== 'short') S.push(`${close.map((e) => `${e.line[0]} leads to ${e.line.slice(0, 4).join(' ')}`).join('; ')}.`)
    S.push('Choose the plan you understand best; at this level the difference is too small to matter.')
    drill = 'choice'
  } else {
    const sol = t.solution ?? best.line
    const mo = motifs(t.fen, sol)
    const m = mo.first
    const main = mo.list.find((x) => x !== 'checkmate') ?? (mo.mated ? 'checkmate' : null)
    if (mo.mated) S.push(`${sol.join(' ')} is a forced checkmate${main && main !== 'checkmate' ? ` (${main})` : ''}.`)
    else if (mo.lm) S.push(`${m.san} is a ${mo.lm.kind}: it attacks the ${NAME[mo.lm.front.type]}${mo.lm.kind === 'skewer' ? `, which has to move and leaves the ${NAME[mo.lm.back.type]} behind it to be taken` : `, which cannot move without exposing the ${NAME[mo.lm.back.type]} behind it`}. The line ${sol.slice(0, 5).join(' ')} leaves you ${best.eval} ahead.`)
    else S.push(`${m.san} works because it ${mo.t1.length >= 2 ? `attacks ${listTargets(mo.t1)} at once` : m.san.includes('+') ? 'gives check, so your opponent has no time to defend' : 'wins material by force'}${Math.abs(best.evalCp) >= 50 ? `; the line ${best.line.slice(0, 5).join(' ')} leaves you ${best.eval} ahead` : `, winning material (line: ${best.line.slice(0, 3).join(' ')})`}.`)
    if (mo.list.includes('sacrifice')) S.push(`It is a sacrifice: your ${NAME[m.piece]} can be taken, but taking it ${mo.mated ? 'allows mate' : 'loses more'}.`)
    const endFen = applyLine(t.fen, best.line).c
    if (!mo.mated && endFen.isInsufficientMaterial()) S.push('Careful: winning the material does not win the game here. After the exchanges, a lone knight cannot checkmate, so the engine calls it a draw (0.00).')
    else if (!mo.mated && Math.abs(best.evalCp) < 50) S.push(`Note the engine rates the end position about equal (${best.eval}).`)
    if (lvlBeg && main && DEF[main]) S.push(DEF[main])
    if (club && main) S.push(`Pattern: ${main}.`)
    drill = main ?? 'loose piece'
  }
  if (depth === 'short') return `${S[0]} Next: ${DRILL[drill]}`
  return `${S.filter(Boolean).join(' ')} Next: ${DRILL[drill]}`
}

const here = path.dirname(fileURLToPath(import.meta.url))
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  const depth = process.argv.includes('--depth') ? process.argv[process.argv.indexOf('--depth') + 1] : 'normal'
  const { tasks } = JSON.parse(readFileSync(path.join(here, '../fixtures/tutor-tasks.json'), 'utf8'))
  const results = tasks.map((t) => {
    const t0 = performance.now()
    let text, extra = {}
    if (t.mode === 'hint') { const h = hints(t); text = h.hints[0]; extra = { ladder: h.hints, motifs: h.motifs } }
    else text = explain(t, depth)
    return { id: t.id, totalMs: +(performance.now() - t0).toFixed(1), text, ...extra, auto: score(t, text) }
  })
  const file = path.join(here, `../results/rule-tutor-${depth}.json`)
  writeFileSync(file, JSON.stringify({ path: 'rule-based (no model)', depth, ranAt: new Date().toISOString(), results }, null, 2) + '\n')
  for (const r of results) console.log(`${r.id} [${r.totalMs}ms] ${JSON.stringify(r.auto)}\n  ${r.text}${r.ladder ? `\n  L2: ${r.ladder[1]}\n  L3: ${r.ladder[2]}` : ''}`)
}
export { hints, explain }
