// Thin client for chess.com's public API (https://www.chess.com/news/view/published-data-api).
// No login needed. Only finished games are available.

const API = 'https://api.chess.com/pub/player'

export interface ChessComPlayer {
  username: string
  rating: number
  result: string
}

export interface ChessComGame {
  url: string
  pgn: string
  end_time: number
  time_class: string
  time_control: string
  rules: string
  white: ChessComPlayer
  black: ChessComPlayer
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (res.status === 404) throw new Error('Player not found on chess.com.')
  if (!res.ok) throw new Error(`chess.com returned ${res.status}. Try again in a minute.`)
  return res.json() as Promise<T>
}

/** Monthly archive URLs for a player, oldest first. */
export async function fetchArchives(username: string): Promise<string[]> {
  const data = await getJson<{ archives: string[] }>(
    `${API}/${encodeURIComponent(username.trim().toLowerCase())}/games/archives`,
  )
  return data.archives
}

/** Standard-chess games from one monthly archive, newest first. */
export async function fetchArchive(archiveUrl: string): Promise<ChessComGame[]> {
  const data = await getJson<{ games: ChessComGame[] }>(archiveUrl)
  return data.games
    .filter((g) => g.rules === 'chess' && g.pgn)
    .sort((a, b) => b.end_time - a.end_time)
}

/** "2026/11" style label from an archive URL. */
export function archiveLabel(archiveUrl: string): string {
  const m = archiveUrl.match(/(\d{4})\/(\d{2})$/)
  if (!m) return archiveUrl
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}
