## Why

Planning runs so far have been ad-hoc: the only guidance an agent has is the four-step loop in `agent/AGENT_PROTOCOL.md` (digest → memory → POST plan → memory) plus one anti-pattern note. There is no definition of what a *good* training plan is, no planning prompt/skill the agent can load, and no way to measure whether a prompt change actually improved plan quality. The real instance confirms the gaps: the first plan was authored with no memory notebook, the plan references a paused session that adherence tracking cannot see, and two completed reviews' coaching signals were never folded in.

## What Changes

- **Plan rubric** (`agent/planning-rubric.md`): a versioned, 9-dimension definition of plan quality — structural validity, grounding, ladder & thread continuity (plan-item carries + paused sessions outside the plan graph + memory threads), targeting & progression, coaching integration (completed reviews' `recommended_focus`), plan hygiene, reason quality, memory stewardship, and efficiency — with a 1–5 scale and an evidence-citation rule for scores ≤ 3. Single source of truth, consumed by both the planner prompt and the eval judge.
- **Planning skill** (`agent/skills/leeter-plan/SKILL.md`, installed into opencode via a symlink at `.opencode/skills/leeter-plan`): the planning run formalized as a skill mirroring `leeter-review` — the protocol loop (read digest, read memory, discover candidates, post plan, update memory) with the rubric as explicit quality guidance (three kinds of open work, coaching via session list + per-session reviews, no-op avoidance).
- **Eval harness** (`agent/evals/`): reproducible offline evaluation of the planning prompt:
  - Seed scripts boot a scratch leeter instance (temp SQLite db + temp port) per fixture scenario; F1 replicates the real instance's current state (one plan, no memory, paused unlinked session), plus F2 mid-ladder carried item, F3 plateau, F4 stale memory.
  - The planner agent (opencode, same skill) runs the real loop against the scratch instance; plan POSTs and memory PUTs are captured.
  - Scoring is hybrid: scripted checks (dimension 1 + linkage/diff signals) plus an opencode judge prompted with the rubric (dimensions 2–9, evidence-cited), producing a per-fixture × per-dimension score report.

Non-goals:
- App/server behavior changes (endpoints, digest shape) — the change is agent-side tooling; coaching integration uses existing endpoints (session list + detail).
- Automating the iteration loop (prompt optimization is manual, driven by the eval report).
- Adding an automated cron planning runner (planning stays free-running).

## Capabilities

### New Capabilities

(None — this change adds agent-side tooling (rubric, skill, eval harness) and alters no system behavior; `skip_specs: true`.)

### Modified Capabilities

(None — no endpoint, digest, or app behavior changes. The eval harness runs against a scratch instance using existing agent endpoints; the skill and rubric are guidance, not contracts.)

## Impact

- **New files**: `agent/planning-rubric.md`, `agent/skills/leeter-plan/SKILL.md` (source; symlinked into `.opencode/skills/` for opencode to install), `agent/evals/` (fixtures, judge prompt, run script, README).
- **Server**: untouched (the eval reuses `createApp` + seeded SQLite exactly as the test suite does; no schema or endpoint changes).
- **Docs**: `agent/AGENT_PROTOCOL.md` gains a pointer to the skill and rubric (guidance reference, no contract change); `README.md` notes the planning skill and the eval loop.
- **Tests**: none in `test/` (the eval is a manual/nightly loop requiring a real model, kept out of `npm run test`); the harness itself is exercised by running it.
- **Dependencies**: none added (opencode is the planner and the judge; better-sqlite3 and jq are already present).
