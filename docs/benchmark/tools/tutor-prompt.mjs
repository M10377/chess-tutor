// One prompt builder shared by the local-model path and the chat-handoff path, so both see the same
// engine facts. Depth: 'short' | 'normal' | 'deep'. Hints: mode 'hint' must never reveal the move.

const LEVEL = {
  beginner: 'a beginner (about 600-900 rating) who knows the rules. Use plain words, define any chess term in a few words.',
  improver: 'an improving player (about 900-1400). Plain English, name common patterns (fork, pin, back rank) without long definitions.',
  club: 'a club player (about 1700-2000). Be concise and precise; skip basic definitions.',
}
const DEPTH = { short: 'Answer in at most 3 sentences.', normal: 'Answer in at most 120 words.', deep: 'Answer in at most 250 words and include the key line.' }

export const SYSTEM = [
  'You are a chess tutor inside a training app.',
  'Rely ONLY on the Stockfish facts given. Every move you write must come from those lines or be legal in the given position. Never invent variations, evaluations or material counts.',
  'If the learner states something false or proposes an illegal move, say so plainly first.',
  'Evaluations are from the point of view of the side to move.',
  'End with one short, concrete thing the learner can practise next.',
].join(' ')

export function buildPrompt(t, { depth = 'normal' } = {}) {
  const L = []
  L.push(`Learner: ${LEVEL[t.level]}`)
  L.push(`Position (FEN): ${t.fen}`)
  L.push(`${t.sideToMove} to move.`)
  if (t.previous) L.push(`Context: ${t.previous}`)
  if (t.material) L.push(`Material: ${t.material}.`)
  L.push('Stockfish facts (depth 18):')
  t.engine.forEach((e, i) => L.push(`- Line ${i + 1}: ${e.line.join(' ')} (${e.eval})`))
  if (t.tablebase) L.push(`- Tablebase: ${t.tablebase.result}; best moves ${t.tablebase.bestMoves.join(', ')}${t.tablebase.dtm ? `; mate in ${Math.ceil(Math.abs(t.tablebase.dtm) / 2)} moves with perfect play` : ''}.`)
  if (t.proposed) {
    if (!t.proposed.legal) L.push(`- The learner's move ${t.proposed.san} is ILLEGAL in this position.`)
    else L.push(`- After the learner's move ${t.proposed.san}, the opponent's best reply line is ${t.proposed.opponentBest.line.join(' ')} (${t.proposed.opponentBest.eval} for the opponent).`)
  }
  if (t.repertoireMove) L.push(`- The learner's repertoire move here is ${t.repertoireMove}.`)
  if (t.mode === 'hint') {
    L.push('')
    L.push('TASK: Give ONE hint only. Do NOT name the move, the piece that moves, or its destination square. Point the learner at what to look at (a weakness, a loose piece, a checking idea, the enemy king).')
  }
  L.push('')
  L.push(`Learner asks: "${t.question}"`)
  L.push(t.mode === 'hint' ? 'Answer in at most 2 sentences.' : DEPTH[depth])
  return L.join('\n')
}
