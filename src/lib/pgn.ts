/** PGN without clock comments and extra headers, to keep prompts short. */
export function cleanPgn(pgn: string): string {
  const keep = /^\[(Event|Date|White|Black|Result|WhiteElo|BlackElo|TimeControl|Termination|ECO)\s/
  const lines = pgn.trim().split(/\r?\n/)
  const headers = lines.filter((l) => l.startsWith('[') && keep.test(l))
  const moves = lines
    .filter((l) => !l.startsWith('['))
    .join(' ')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\$\d+/g, '')
    .replace(/\d+\.\.\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return [...headers, '', moves].join('\n')
}
