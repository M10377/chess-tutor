import { useState } from 'react'
import { claudeUrl, MAX_URL_PROMPT } from '../lib/tutor'

/**
 * Opens Claude with a ready-made question (and copies it to the clipboard as a fallback).
 * Uses the person's own Claude plan, so it costs nothing extra.
 */
export function AskClaude({ label, prompt }: { label: string; prompt: () => string }) {
  const [note, setNote] = useState('')

  const ask = async () => {
    const text = prompt()
    let copied = false
    try {
      await navigator.clipboard.writeText(text)
      copied = true
    } catch {
      /* clipboard blocked: the link still carries the question when it fits */
    }
    window.open(claudeUrl(text), '_blank', 'noopener')
    setNote(
      text.length > MAX_URL_PROMPT
        ? copied
          ? 'Question copied. Paste it into the new Claude chat.'
          : "Couldn't copy the question. Your browser blocked the clipboard."
        : copied
          ? 'Opened Claude with your question (also copied, in case it is not filled in).'
          : 'Opened Claude with your question.',
    )
    window.setTimeout(() => setNote(''), 6000)
  }

  return (
    <span className="ask-claude">
      <button onClick={ask}>{label}</button>
      {note && <span className="muted small"> {note}</span>}
    </span>
  )
}
