import { Chess, type Move } from 'chess.js'

export interface ParsedGame {
  headers: Record<string, string>
  /** moves[i] is the i-th half-move. */
  moves: Move[]
  /** fens[0] is the start position; fens[i] is the position after moves[i-1]. */
  fens: string[]
}

/** Parse a PGN into its moves and every position along the way. Throws on invalid PGN. */
export function parsePgn(pgn: string): ParsedGame {
  const chess = new Chess()
  chess.loadPgn(pgn.trim())
  const headers = Object.fromEntries(
    Object.entries(chess.getHeaders()).filter((e): e is [string, string] => typeof e[1] === 'string'),
  )
  const moves = chess.history({ verbose: true })
  const fens = moves.length ? [moves[0].before, ...moves.map((m) => m.after)] : [chess.fen()]
  return { headers, moves, fens }
}

/** Which side the given username played, if either. */
export function userColor(headers: Record<string, string>, username: string): 'white' | 'black' | null {
  const u = username.trim().toLowerCase()
  if (!u) return null
  if (headers.White?.toLowerCase() === u) return 'white'
  if (headers.Black?.toLowerCase() === u) return 'black'
  return null
}
