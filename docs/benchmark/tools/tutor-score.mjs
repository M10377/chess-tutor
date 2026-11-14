// Automatic checks applied identically to every tutor path's answers.
import { Chess } from 'chess.js'

const SAN_RE = /\b(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?)[+#]?/g
const PIECE = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
const strip = (s) => s.replace(/[+#!?]/g, '')

function legalHere(fen, s) { try { new Chess(fen).move(s); return true } catch { return false } }
function linesOf(t) {
  const ls = t.engine.map((e) => e.line)
  if (t.proposed?.opponentBest) ls.push([t.proposed.san, ...t.proposed.opponentBest.line])
  if (t.solution) ls.push(t.solution)
  if (t.proposed) ls.push([t.proposed.san]) // quoting the learner's own move is fine
  return ls
}
// SAN is "supported" if legal now, or it appears in a provided line, or legal after the proposed move.
export function score(t, text) {
  const toks = [...new Set((text.match(SAN_RE) || []).map(strip))]
  const lineToks = new Set(linesOf(t).flat().map(strip))
  const unsupported = toks.filter((s) => !lineToks.has(s) && !legalHere(t.fen, s) && !(t.proposed?.fenAfter && legalHere(t.proposed.fenAfter, s)))
  const r = { sanMentioned: toks.length, unsupportedSan: unsupported, words: text.split(/\s+/).filter(Boolean).length }
  if (t.mode === 'hint' && t.solutionFirst) {
    const f = t.solutionFirst
    const lower = text.toLowerCase()
    const sanHit = toks.includes(strip(f.san))
    const squareHit = new RegExp(`\\b${f.to}\\b`).test(lower)
    const pieceAndSquare = squareHit && lower.includes(PIECE[f.piece])
    r.spoiler = sanHit || pieceAndSquare ? 'full' : squareHit ? 'partial' : 'none'
  }
  if (t.id === 'T4-illegal') {
    r.saysIllegal = /illegal|not (a )?legal|isn't legal|can(no|')t (play|reach|go|capture|take)|not possible|impossible|blocked/i.test(text)
    r.correctsMaterial = /(material is|material's) (equal|level|even)|not (a )?pawn up|aren't (a )?pawn up|no extra pawn|equal material|level material|material (is )?(still )?(equal|even|level)/i.test(text)
  }
  if (t.fixture === 'T6' || t.fixture === 'L1') r.overclaimsWin = /winning (position|game|endgame)|wins the game|white is winning/i.test(text) && t.fixture === 'T6'
  if (t.fixture === 'T6') r.mentionsDraw = /draw/i.test(text)
  return r
}
