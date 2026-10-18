## Why

Agent planning runs are stateless: every run re-derives skill state, plan adherence, and coaching reasoning from raw sessions/plans/reviews, burning tokens on repeated inference and producing no durable coaching narrative. With nowhere to keep it, the agent already pastes ephemeral state (adherence checks, process notes, history used) into plan `focus`/`notes` — fields meant to be stable, user-facing plan statements — polluting the current plan text, and each new plan silently replaces the previous ladder instead of continuing it.

## What Changes

- Add a server-computed **progress digest** (`GET /api/agent/progress`): per-topic aggregates (attempts, solves, solve rate, last-practiced) derived from sessions + problems, plus current-plan adherence rollups. Deterministic ground truth any agent can consult instead of re-deriving it from primitive endpoints.
- Add an **agent memory notebook** (`PUT/GET /api/agent/memory` + version history endpoint): agent-authored long-term coaching state (skill interpretation, open threads, ladder position, process notes). Append-only with versioned audit trail, human-inspectable; latest version is current. Agent-only surface — no dashboard/UI rendering.
- Add **plan chaining**: plan items may carry `carried_from` (the previous plan item id they continue) and plans may declare `based_on` (the plan id they revise), so successive plans are explicitly linked ladders rather than isolated snapshots. Dashboard "from plan" provenance behavior is unchanged.
- Rewrite the **planning workflow section** of `agent/AGENT_PROTOCOL.md` around the new primitives: consult digest → read notebook → revise the ladder (carry unfinished items explicitly) → post plan → update notebook. Add guidance to keep plan focus/notes free of process bookkeeping (that lives in the notebook).

Non-goals (deferred to the follow-up knowledge-tree change):
- Roadmap/knowledge-tree UI and the topic taxonomy seed it consumes.
- Rendering the memory notebook in the UI (agent-only; audit trail is stored versions + a token-authenticated history endpoint).
- Any change to review endpoints or session recording.

## Capabilities

### New Capabilities
- `agent-memory`: The agent's long-term memory surface — the server-computed objective progress digest and the agent-authored subjective notebook with versioned audit trail, consumed by planning runs.

### Modified Capabilities
- `training-plans`: Plans gain `based_on` plan chaining and items gain `carried_from` item linkage (additive fields on the existing plan contract).
- `agent-api`: New digest and memory endpoints added to the token-authenticated agent surface; plan POST/GET payloads gain the chaining fields.

## Impact

- **Server**: new `server/memory/` module (digest aggregation + notebook storage), schema migration (memory + memory_versions tables; nullable `carried_from`/`based_on` columns on plan tables), plan service validation for the new fields.
- **Agent contract**: `agent/AGENT_PROTOCOL.md` planning section rewritten; plan payload/response gains optional fields.
- **Tests**: memory/digest/chaining unit + route tests; existing plan tests updated for additive fields.
- **Dependencies**: none added.
