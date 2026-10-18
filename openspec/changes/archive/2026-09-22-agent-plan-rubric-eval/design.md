## Context

See proposal.md for motivation. Constraints that shape the approach: the plan surface is `POST /api/agent/plans` (strict schema validation — unknown fields, unknown `lc_id`s, and nonexistent `based_on`/`carried_from` references all 400), the digest (`GET /api/agent/progress`) is the server-computed ground truth including `carried_unsolved`, the memory notebook is versioned append-only, and reviews are reachable per-session (`GET /api/agent/sessions` exposes `reviewRequestStatus`/`reviewCount`; `GET /api/agent/sessions/{id}` returns `reviews`). The review flow already has the pattern to mirror: a prompt embedded in `leeter-agent-run.sh` plus the `leeter-review` skill. The app boots in-process from a plain config (`createApp`) and the test suite seeds SQLite via drizzle — the eval reuses exactly that machinery. Real instance state (one plan, no memory, paused unlinked session, two completed reviews) grounds the fixtures.

## Goals / Non-Goals

**Goals:**
- Make "good plan" explicit and measurable: one rubric, used by both the planner prompt and the judge.
- A reproducible eval loop: same fixtures, same scoring, so prompt edits produce comparable scores.
- The skill is the product — the eval tests the *actual* prompt the planner will run.

**Non-Goals:**
- App behavior or endpoint changes; automated prompt optimization; cron planning runner; keeping the eval inside `npm run test`.

## Decisions

### D1: The rubric is a standalone versioned document, referenced (not inlined) by both consumers
`agent/planning-rubric.md` defines 9 dimensions with 1–5 anchors and the evidence rule (any score ≤ 3 must cite evidence: a digest field, a memory line, a session, an item). The skill embeds the rubric's *intent* as quality guidance but points to the file as the canonical source; the judge prompt points to it too. Rationale: two inlined copies would drift; the rubric itself is iterated on like the prompt. Alternative (rubric fully inlined in the skill) rejected — divergence between judge and planner guidance is the failure mode this change exists to prevent.

### D2: The planning skill mirrors `leeter-review`'s shape
`agent/skills/leeter-plan/SKILL.md` (source of truth in the repo's agent toolkit; opencode discovers it via a symlink at `.opencode/skills/leeter-plan` so there is exactly one copy to edit — the same install pattern later applied to the existing `leeter-review` skill): setup (LEETER_URL/TOKEN), workflow (the protocol's four steps, expanded with candidate discovery via `GET /api/agent/problems` and coaching reads via session list + detail), quality guidance mapped to rubric dimensions (three kinds of open work — carried items, paused/active sessions outside the plan graph, memory threads; coaching signals; hygiene rules), and rules (never modify history, plans append-only, token never in text). Interactive-first (triggered by user request) like `leeter-review`; the eval invokes the same skill so eval and reality test the same prompt.

### D3: Fixtures are seed scripts booting a scratch instance — not prompt-only mockups
Each fixture is a script that creates a temp SQLite db (via the existing `createDb`/`runMigrations`/drizzle patterns from `test/`), seeds a scenario, boots `createApp` on a temp port with `LEETCODE_SESSION=""` (network calls would fail loudly — the planner must work offline), and starts `opencode run` with a short briefing that points at the `leeter-plan` skill and the instance URL/token. Rationale: the eval must exercise the real tool-use loop (curl, memory PUT, bank discovery), because that loop is part of what's being evaluated; a prompt-only mockup would evaluate a different prompt. The scratch instance's agent token is generated into the temp data dir as the app already does.

### D4: Four fixtures, each isolating one failure surface
- **F1 first-run** — one prior plan, no memory, paused session not linked to a plan item, a few Easy sessions (replica of the real instance; `data/leeter.db` state as of 2026-09-20). Tests memory cold-start, thread continuity for work outside the plan graph.
- **F2 mid-ladder** — current plan with a `carried_unsolved` item (chained via `based_on`/`carried_from`), weak topic with low solve rate. Tests carry-or-justify behavior.
- **F3 plateau** — all plan items practiced/solved, no carries, flat topic coverage. Tests targeting away from comfort zones and no-op avoidance (re-posting essentially unchanged plan).
- **F4 stale memory** — memory notebook exists but contradicts the digest (e.g. claims a thread the digest shows resolved). Tests grounding over memory (digest is ground truth; memory is state to reconcile, not copy).

### D5: Hybrid scoring — server as oracle for structure, judge for judgment
Scripted checks (zero model cost, deterministic): POST accepted/400 reasons, `lc_id`s in bank, `based_on` = previous plan, `carried_from` targets valid items, horizon positive, item count bounds vs. horizon, focus/notes length bounds and a narration heuristic (regex for "I checked/checked the digest/adherence"), plan-diff vs. previous plan for the no-op signal. Judge (a separate `opencode run` with the rubric + fixture context + captured artifacts): dimensions 2–9, JSON scores with evidence fields. Report: per fixture × dimension table plus aggregate; weakest-dimension summary to steer the next prompt edit.

### D6: The judge is a separate run, not self-scoring
The planner scores nothing itself; the judge gets only the rubric, the seeded scenario (what the ground truth *was*), and the captured plan/memory payloads — not the planner's reasoning. This keeps scoring independent of the planner's self-narrative. The judge model is the same configured opencode (same environment, no extra setup); a stronger judge model can be swapped later via an env var without design change.

### D7: Eval lives out of `npm run test`
`agent/evals/run.sh` orchestrates seed → plan → capture → judge → report. It requires a working `opencode` and spends tokens; it is a manual/nightly loop. The scratch instance uses a temp data dir/port so it cannot touch the real instance; the run script fails fast if the planner can't reach the instance rather than silently scoring zero.

## Risks / Trade-offs

- [Judge variance run-to-run] → evidence-citation rule + scripted half covers the objective dimensions; scores are compared across identical fixtures, not absolute; optional judge repetition (median of 3) if variance matters later.
- [Fixture seeding drifts from app schema as migrations evolve] → fixtures seed through the same drizzle schema/migrations the tests use; a broken seed fails loudly before the planner runs.
- [Planner behavior depends on opencode skill loading] → the eval briefing names the skill explicitly; a planner that ignores it scores visibly on rubric dimension 1 (server 400s from hand-rolled payloads).
- [Rubric churn invalidates score history] → rubric carries a version; the report records the rubric version + skill prompt hash so old scores are interpretable.

## Migration Plan

Purely additive files; no deploy step (agent-side tooling). Rollback = delete the files; the app and the review flow are untouched.

## Open Questions

- Exact fixture difficulty values (seeded outcomes, timestamps) — tuned while implementing fixtures, no contract impact.
- Report format (markdown table vs. JSON with a rendered summary) — decided in implementation; both derive from the same judge output.
