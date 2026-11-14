// Runs every tutor task against a local model served by Ollama (http://localhost:11434) and scores it.
//   node docs/benchmark/tools/local-llm-eval.mjs --model qwen3:4b [--depth normal] [--host http://localhost:11434]
// Writes docs/benchmark/results/local-llm/<model>.json. Needs: npm ci (for chess.js), Ollama running.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { SYSTEM, buildPrompt } from './tutor-prompt.mjs'
import { score } from './tutor-score.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const model = arg('--model')
const host = arg('--host', 'http://localhost:11434')
const depth = arg('--depth', 'normal')
const only = arg('--only')
const noThink = process.argv.includes('--no-think') // qwen3: soft switch, since some Ollama versions ignore think:false
if (!model) { console.error('--model required'); process.exit(1) }
const { tasks } = JSON.parse(readFileSync(path.join(here, '../fixtures/tutor-tasks.json'), 'utf8'))

async function run(t) {
  const body = { model, stream: true, think: false, options: { temperature: 0.2, num_ctx: 4096 }, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: buildPrompt(t, { depth }) + (noThink ? '\n/no_think' : '') }] }
  const t0 = performance.now()
  let ttft = null, text = '', final = null
  let res = await fetch(`${host}/api/chat`, { method: 'POST', body: JSON.stringify(body) })
  if (res.status === 400) { delete body.think; res = await fetch(`${host}/api/chat`, { method: 'POST', body: JSON.stringify(body) }) }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  const dec = new TextDecoder()
  let buf = ''
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true })
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1)
      if (!line.trim()) continue
      const j = JSON.parse(line)
      const c = j.message?.content ?? ''
      if (c && ttft === null) ttft = performance.now() - t0
      text += c
      if (j.done) final = j
    }
  }
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  return { id: t.id, ttftMs: Math.round(ttft ?? 0), totalMs: Math.round(performance.now() - t0), tokPerSec: final?.eval_count ? +(final.eval_count / (final.eval_duration / 1e9)).toFixed(1) : null, text, auto: score(t, text) }
}

const results = []
let save = () => {}
// warm-up (model load) measured separately
const w0 = performance.now()
await fetch(`${host}/api/generate`, { method: 'POST', body: JSON.stringify({ model, prompt: 'ok', stream: false, options: { num_predict: 1 } }) })
const loadMs = Math.round(performance.now() - w0)
for (const t of tasks) {
  if (only && !t.id.startsWith(only)) continue
  try { const r = await run(t); results.push(r); console.log(r.id, r.ttftMs + 'ms', r.totalMs + 'ms', JSON.stringify(r.auto)) }
  catch (e) { results.push({ id: t.id, error: String(e) }); console.log(t.id, 'ERROR', String(e)) }
  save()
}
save = () => {}
const outDir = path.join(here, '../results/local-llm')
mkdirSync(outDir, { recursive: true })
const file = path.join(outDir, `${model.replace(/[:/]/g, '_')}-${depth}${noThink ? '-nothink' : ''}.json`)
writeFileSync(file, JSON.stringify({ model, depth, noThink, host, ranAt: new Date().toISOString(), machine: { platform: os.platform(), arch: os.arch(), cpus: os.cpus()[0]?.model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30) }, loadMs, results }, null, 2) + '\n')
console.log('wrote', file)
