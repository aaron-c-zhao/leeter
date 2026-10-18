# Planning prompt eval loop

Measures whether a change to the planning prompt actually improved plan
quality, using the rubric in [`../planning-rubric.md`](../planning-rubric.md)
as the single scoring standard.

## The loop

```
edit agent/skills/leeter-plan/SKILL.md (or the rubric)
        |
        v
agent/evals/run.sh            seeds 4 scenarios, runs 1 planning cycle each,
        |                     captures plan/memory artifacts, scores them
        v
agent/evals/runs/<ts>/report.md   per-fixture x dimension scores + aggregate
        |
        v
weakest dimension -> next prompt edit -> repeat
```

## What runs

- **Fixtures** (`fixtures/`) — reproducible scenarios seeded into a scratch
  leeter instance (temp db, ephemeral localhost port, no LeetCode
  credentials):
  - `f1-first-run` — replica of a real first run: one ad-hoc plan, no
    memory, a paused session outside the plan graph, Easy-heavy history,
    two completed reviews with coaching signals.
  - `f2-mid-ladder` — a carried unsolved item (chained via
    `based_on`/`carried_from`) and a 33%-solve-rate topic.
  - `f3-plateau` — the current plan fully solved, flat coverage; the planner
    must move into untouched material, not re-post the ladder.
  - `f4-stale-memory` — the memory notebook contradicts the digest; the
    planner must reconcile (digest wins), not copy.
- **Scripted checks** (`lib/checks.ts`) — deterministic, zero model cost:
  schema validity (the server is the oracle), bank `lc_id`s, `based_on` /
  `carried_from` linkage, horizon/item bounds, a narration heuristic on
  `focus`/`notes`, no-op detection, memory-update, carried-item coverage.
- **Judge** (`lib/judge.ts` brief, scored by opencode) — rubric dimensions
  2–9 with 1–5 anchors; any score ≤ 3 must cite evidence. The judge sees the
  seeded ground truth and the captured artifacts, never the planner's
  reasoning.
- **Report** (`lib/report.ts`) — per-fixture tables, per-dimension
  aggregates, and the weakest dimension (the next prompt-iteration target).
  Records the rubric version and a rubric+skill fingerprint so score
  histories stay interpretable across edits.

## Running it

```bash
agent/evals/run.sh                    # all four fixtures
agent/evals/run.sh f2-mid-ladder      # one fixture (fast iteration)
```

Results land in `agent/evals/runs/<timestamp>/` (`report.md`,
`aggregate.json`, and per-fixture `groundtruth/captured/checks/judge.json`).
Requires `opencode` on PATH and `jq`; costs model tokens — manual or nightly,
never part of `npm run test`.

## Baseline

Recorded from the first full run (rubric v1, fingerprint b188161f40c0):

- All four fixtures: 9/9 scripted checks.
- Judge: 32/32 cells scored, 5/5 on every dimension across all four fixtures.
- Run kept at `agent/evals/runs/20260920-222457/` (this is the recorded
  baseline report).

Interpretation: a clean sweep means the prompt already satisfies the rubric's
anchors on these scenarios — but it also means the eval currently cannot
discriminate (ceiling effect). The fixtures and anchors stay useful as a
regression guard; harden them (tighter anchors, harder trade-offs in F2/F3,
larger item budgets) whenever a prompt change is under test and the report
flatlines.
