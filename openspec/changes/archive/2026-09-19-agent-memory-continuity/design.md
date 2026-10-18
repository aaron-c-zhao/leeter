## Context

The agent surface (`server/routes/agent.ts`) is token-authenticated and covers sessions, reviews, problems, and plans (`server/sessions/plans.ts`). Plans are append-only snapshots with derived item statuses; agent runs reconstruct adherence by hand via `GET /api/agent/plans` + per-session cross-referencing. The project's design language is: server-side SQLite (Drizzle), append-only records with derived read-time status, strict zod validation with unknown-field rejection, and a protocol doc (`agent/AGENT_PROTOCOL.md`) written to be pasted into agent prompts. Evidence of the missing memory layer is already visible in stored plan text (adherence narration pasted into plan focus/notes).

## Goals / Non-Goals

**Goals:**
- Planning runs consult two first-class primitives (digest, notebook) instead of re-deriving state from raw history.
- Successive plans are explicitly chained (`based_on`, `carried_from`) so a new plan is a revision, not a replacement guess.
- A versioned, human-inspectable audit trail for agent memory.

**Non-Goals:**
- Roadmap/knowledge-tree UI and taxonomy seed (follow-up change consumes the digest).
- Rendering memory in the user-facing UI.
- Changing review endpoints, session recording, or the UI plan provenance flow.

## Decisions

### D1: Digest = server-computed aggregation service, no new agent-side inference
A `getProgressDigest(db)` service produces: per-topic buckets keyed by a topic-grouping function `{topic, tag_keys[], attempts, solved, solve_rate, last_practiced_at}` plus `{plan: {id, created_at, solved, practiced, not_started, carried_unsolved[]}}`. Grouping in this change keys topics by a *coarse server-side mapping* from problem tags (the same tag vocabulary the knowledge-tree change will curate further); the endpoint shape stays stable when the richer taxonomy lands. The digest reuses the accepted-count pattern already in `getDashboard` — the N+1 there is accepted as-is for this scale (single user, local SQLite).

### D2: Notebook = one current row + immutable version rows
Tables: `memory (id, current_version_id, updated_at)`-style singleton plus `memory_versions (id, body, size, created_at)`; PUT always inserts a version and repoints current. Alternative rejected: upsert-in-place (loses the audit trail the requirement demands). Body capped (e.g. 64 KiB) with a 400 on overflow. Agent-only: no UI route.

### D3: Chaining is additive and validated at write time
`plan_items.carried_from` (nullable FK to plan_items), `plans.based_on` (nullable FK to plans). Validation on POST: referenced ids must exist; self-reference or referencing a newer plan rejected (chain must point backwards). Fields are optional — older agents and old plans remain valid. The UI ignores these fields for now (they surface in the knowledge-tree change).

### D4: Protocol planning section rewritten as a 6-step loop
Consult digest → read latest memory → reconstruct adherence only if needed beyond the digest → POST plan (carry unfinished items with `carried_from`, declare `based_on`) → update memory (open threads, ladder position, process notes) → keep plan focus/notes purely user-facing. The "optimize the prompt" ask is satisfied here: explicit anti-pattern call-out ("do not narrate adherence inside plan focus"), plus the notebook's role as the home for exactly the content observed polluting stored plans.

### D5: Endpoints follow the existing agent surface conventions
`GET /api/agent/progress`, `PUT /api/agent/memory`, `GET /api/agent/memory`, `GET /api/agent/memory/versions` — snake_case fields (consistent with plan/problem endpoints), zod strict validation, 400 on unknown fields, 404 where applicable, all token-authenticated like existing agent routes.

## Risks / Trade-offs

- [Agent writes memory that contradicts the digest] → digest is the stated ground truth; protocol instructs citing digest numbers; versioned history makes drift inspectable. No server-side enforcement in v1 (would over-constrain coaching language).
- [Tag-based topic grouping is coarse until the taxonomy seed lands] → acceptable: digest shape is topic-keyed and the follow-up change upgrades the grouping function without changing the contract.
- [Memory size cap arbitrary] → 64 KiB enforced server-side; agent error message states the cap; adjustable later.
- [Chaining could encourage agents to re-post plans too often] → protocol retains the "never re-post unchanged plans" rule; digest adherence makes needless re-posts visible.

## Migration Plan

One idempotent migration adding the two tables and two nullable columns. Rollback = revert; additive columns and new tables are safe with the existing UI and older agent payloads (fields optional).

## Open Questions

- Exact digest topic-grouping seed (initial tag→topic map) — finalize during implementation; the follow-up taxonomy change refines it.
- Whether memory versions need a retention cap — defer; append-only at this scale is fine.
