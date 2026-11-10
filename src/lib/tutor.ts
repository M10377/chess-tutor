// Builds prompts for the "Ask Claude" tutor. The prompts carry the engine's findings so Claude
// explains what Stockfish found instead of judging positions on its own (LLMs are unreliable at that).

import { Chess } from 'chess.js'
import type { ParsedGame } from './game'
import { formatEval, type GameReview } from './review'
import { cleanPgn } from './pgn'
import type { Puzzle } from './store'

export function pvToSan(fen: string, pv: string[], max = 6): string {
  const c = new Chess(fen)
  const out: string[] = []
  for (const uci of pv.slice(0, max)) {
    try {
      out.push(c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san)
    } catch {
      break
    }
  }
  return out.join(' ')
}

const GROUNDING =
  'Base your explanation on the Stockfish analysis given here. Do not invent other variations or claim things the engine data does not support; if something is unclear, say so.'

function level(game: ParsedGame, color: 'w' | 'b'): string {
  const elo = game.headers[color === 'w' ? 'WhiteElo' : 'BlackElo']
  return elo ? `a club player rated about ${elo}` : 'an improving club player'
}

function moveName(ply: number, san: string): string {
  return `${Math.ceil(ply / 2)}${ply % 2 === 1 ? '.' : '...'} ${san}`
}

export function moveQuestion(game: ParsedGame, pgn: string, review: GameReview, ply: number): string {
  const m = review.moves[ply - 1]
  const side = m.color === 'w' ? 'White' : 'Black'
  const before = review.evals[ply - 1]
  const after = review.evals[ply]
  const bestLine = pvToSan(game.fens[ply - 1], before.pv)
  const reply = pvToSan(game.fens[ply], after.pv)
  const lines = [
    `I'm ${level(game, m.color)} reviewing one of my chess games. Please explain move ${moveName(ply, m.san)} (${side}) in plain English.`,
    '',
    `Stockfish analysis (depth ~16; evals from White's point of view, + is good for White):`,
    `- Position before the move (FEN): ${game.fens[ply - 1]}`,
    `- Eval before: ${formatEval(before)}. Eval after ${m.san}: ${formatEval(after)}.`,
    `- Stockfish labels ${m.san} as: ${m.label}. ${side}'s winning chances went from ${m.winBefore.toFixed(0)}% to ${m.winAfter.toFixed(0)}%.`,
    m.bestSan ? `- Stockfish's preferred move: ${m.bestSan}. Its main line: ${bestLine || m.bestSan}` : `- ${m.san} was Stockfish's top choice.`,
    reply ? `- Best play after ${m.san}: ${reply}` : '',
    '',
    m.label === 'good' || m.label === 'best'
      ? `Explain why ${m.san} is a sound move and what idea it serves.`
      : `Explain what was wrong with ${m.san}${m.bestSan ? ` and why ${m.bestSan} is better` : ''}: what tactical or positional point did I miss, and what should I have noticed? Then give me one short rule of thumb to avoid this kind of mistake.`,
    GROUNDING,
    '',
    'Full game (PGN):',
    cleanPgn(pgn),
  ]
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n')
}

export function gameSummaryQuestion(game: ParsedGame, pgn: string, review: GameReview, userColor: 'w' | 'b' | null): string {
  const me = userColor ?? 'w'
  const side = me === 'w' ? 'White' : 'Black'
  const errors = review.moves.filter(
    (m) => m.color === me && (m.label === 'inaccuracy' || m.label === 'mistake' || m.label === 'blunder'),
  )
  const errorLines = errors.map(
    (m) =>
      `- ${moveName(m.ply, m.san)}: ${m.label} (winning chances ${m.winBefore.toFixed(0)}% → ${m.winAfter.toFixed(0)}%)${m.bestSan ? `, Stockfish preferred ${m.bestSan}` : ''}`,
  )
  return [
    `I'm ${level(game, me)} and I played ${side} in this game. Please act as my chess coach and review it.`,
    '',
    `Stockfish review: my accuracy ${review.accuracy[me].toFixed(1)}%, opponent ${review.accuracy[me === 'w' ? 'b' : 'w'].toFixed(1)}%.`,
    errors.length ? 'My inaccuracies, mistakes and blunders:' : 'Stockfish found no inaccuracies, mistakes or blunders by me.',
    ...errorLines,
    '',
    'Please give me:',
    '1. A short story of the game: where it was decided and why.',
    '2. The 2 or 3 most important lessons from my mistakes, each with the move it came from.',
    '3. One concrete thing to practice this week.',
    'Keep it plain and encouraging, without jargon I would need to look up. ' + GROUNDING,
    '',
    'Full game (PGN):',
    cleanPgn(pgn),
  ].join('\n')
}

export function puzzleQuestion(p: Puzzle): string {
  const side = p.color === 'w' ? 'White' : 'Black'
  return [
    `I'm working on a chess puzzle from one of my own games. Position (FEN): ${p.fen}`,
    `${side} to move. In the game I played ${p.playedSan}, which Stockfish rated a ${p.label}. Stockfish's best move is ${p.bestSan}.`,
    `Explain in plain English why ${p.bestSan} is strong and what is wrong with ${p.playedSan}, and give me one pattern to remember. ${GROUNDING}`,
  ].join('\n')
}

/** claude.ai accepts a prefilled prompt via ?q=. Very long prompts are copied instead. */
export const MAX_URL_PROMPT = 6000

export function claudeUrl(prompt: string): string {
  return prompt.length <= MAX_URL_PROMPT ? `https://claude.ai/new?q=${encodeURIComponent(prompt)}` : 'https://claude.ai/new'
}
