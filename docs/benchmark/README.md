# Competitive benchmark and roadmap (started 2026-11-14)

Research and planning for Chess Tutor. No app code was changed for this work.

Read in this order:

1. `REPORT.md`: executive summary, benchmark matrix, opportunity ranking.
2. `baseline.md`: what the app does today, the learner journey, target player.
3. `inventory.md`: every capability, leader, our status and disposition.
4. `tests.md`: fixtures, metrics, scoring anchors, results for us and competitors, manual checks.
5. `deep-dives.md`: step-by-step benchmark experiences and our proposed versions, including the three AI-tutor paths.
6. `roadmap.md`: near-term / next / later initiatives with acceptance criteria, and the tutor decision.
7. `first-slice.md`: the first shippable improvement as ordered tickets and the tests to rerun.
8. `evidence.md`: dated sources, access limits, open questions.

## Reproduce

```sh
npm ci
# verify all fixtures with Stockfish 19 (+ lichess tablebase when online), ~2 min
node --experimental-strip-types --import ./docs/benchmark/tools/ts-resolve.mjs docs/benchmark/tools/verify-fixtures.mjs --depth 20
# rebuild the 32 tutor tasks from the fixtures, ~1.5 min
node --experimental-strip-types --import ./docs/benchmark/tools/ts-resolve.mjs docs/benchmark/tools/build-tutor-tasks.mjs
# Path 1 (no model) tutor on all tasks
node docs/benchmark/tools/rule-tutor.mjs --depth normal
# Path 2 (local model via Ollama on localhost:11434)
node docs/benchmark/tools/local-llm-eval.mjs --model qwen3:4b --depth normal
```

## Resume notes for a fresh session

- Status, 2026-11-14: baseline, inventory, competitor research, fixtures, Path 1 tutor results, roadmap and first slice are done. Path 2 (local model) is waiting on Micah installing Ollama on the Mac (permission rules there block an automated install). When results arrive in `results/local-llm/`, fill in `deep-dives.md` § 3.6 and confirm or change the tutor decision in `roadmap.md`.
- Micah's tutor rules (2026-11-14): first usable version costs $0; no paid API or hosted backend in the first release; Micah controls explanation depth and hint spoilers; always offer a Claude/ChatGPT handoff; a useful explanation must exist with no model at all.
- The next step after this research is `first-slice.md`, implemented in a separate pass.
