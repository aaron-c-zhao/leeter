## Context

See proposal.md for motivation. The app already has every ingredient the planner needs except the plan itself: an authenticated agent surface (`server/routes/agent.ts`) with a filtered session listing that returns problem references and outcomes, append-only JSONL session logs, per-session agent reviews, a cached problem bank (synced via lc-client, browsable offline), dashboard aggregations computed in `server/sessions/service.ts`, and an existing session-creation route taking `{problemId}`. The DB is SQLite with idempotent Drizzle migrations.

## Goals / Non-Goals

**Goals:**

- Close the practice loop: agent looks back at history → posts a plan → user practices from it in one click → next agent run sees what happened.
- Keep the app's role minimal: store, display, and record provenance. No plan lifecycle logic.

**Non-Goals:**

- No plan status state machine (no started/done/expired columns or transitions); status is derived at read time.
- No plan request queue or trigger; agents run free and POST a plan on each run.
- No automatic session→plan linkage for sessions started outside the plan panel.
- No plan editing or manual plan creation by the user.
- No user-facing UI to cancel/delete plans.

## Decisions

### D1: Plan storage — two append-only tables, no status

`plans(id, created_at, horizon_days, focus_md, notes_md)` and `plan_items(id, plan_id, lc_id, slug, reason_md)`, mirroring the session-log philosophy: append-only, never rewritten.

*Alternatives considered:* a JSON blob column on one table (looser validation, harder to join for provenance); a status column on plan_items (rejected — see D3).

### D2: Provenance as a nullable FK on sessions, not derived

`sessions.plan_item_id` is set at creation time when the request comes from the plan panel (`POST /api/ui/sessions {problemId, planItemId}`). Multiple sessions may reference one plan item (retries are allowed and all get provenance). Chosen over client-side date-window inference because the link is permanent and server-side: any view (history, dashboard, agent API) can ask "which sessions came from plans?" without re-deriving from timestamps. Cost is one column and one optional validated field.

*Alternative considered:* pure navigation (Flavor 1) — zero schema change, but the link would be invisible everywhere except the one panel that re-derives it, and the agent's adherence signal would stay reconstructed rather than authoritative.

### D3: Item status derived at read time, not stored

"solved" = any session with `plan_item_id` = item has an Accepted verdict; "practiced" = linked sessions exist, none Accepted; "not started" = none. Computed in the dashboard query (join sessions on plan_item_id, aggregate verdicts). No state machine, no expiry enforcement — the newest plan is current by creation order.

*Alternative considered:* stored status updated by triggers on submission sync — more rules (what counts as done? when do items expire?), and the derived view is cheap at this data volume.

### D4: Agent contract — two plan endpoints plus a bank mirror

- `POST /api/agent/plans`: body `{horizon_days, focus, notes?, problems: [{lc_id, slug, reason}]}`; strict validation like the review endpoint (unknown fields → 400). Items stored with ids assigned by the app; the agent never refers to item ids afterwards.
- `GET /api/agent/plans`: newest-first list with items.
- `GET /api/agent/problems`: thin mirror of the cached bank (id, title, slug, difficulty, tags). Read-only from cache — never triggers a LeetCode sync. Needed so the planner can propose problems the user hasn't practiced yet.

### D5: Adherence analysis lives with the agent, not the app

The next agent run reconstructs adherence from `GET /api/agent/plans` + `GET /api/agent/sessions` (now also strengthened by plan provenance exposed in the session list). The app does not compute adherence reports. This keeps the agent harness's freedom and avoids building a reports feature nobody has asked for yet; the protocol doc will spell out the recommended reconstruction step.

### D6: UI — dashboard section, not a new page

The current plan renders as a dashboard section (the dashboard is already the "trends / what now" surface): focus markdown, items with derived status chips and Start buttons, plus a collapsed past-plans history list. Start button calls the existing session-creation flow with `planItemId` added, then navigates to the session detail page. Session detail shows a "from plan" badge when provenance exists. No dedicated Plan page in this change.

## Risks / Trade-offs

- [Agent drifts and never reads past plans] → Protocol doc makes "reconstruct previous plan adherence before proposing" a required workflow step; the endpoint design makes it cheap.
- [Plan items reference problems not in the bank (bad lc_id from the LLM)] → Validate lc_id against the bank at POST time; unknown ids rejected with a validation error listing the offending ids. Session creation from the panel is still safe because bank entries are cached offline.
- [Multiple rapid agent runs post duplicate/near-duplicate plans] → Acceptable for a single-user tool; the newest plan wins as current, older ones remain as history. De-duplication is explicitly deferred.
- [Dashboard query grows with linked sessions] → Single indexed join on `sessions.plan_item_id`; volumes are personal-practice scale.
- [Unlinked sessions hide adherence gaps] → Accepted trade-off (decided in exploration); agent-side inference over session history covers the gap approximately.

## Migration Plan

Single additive migration: create `plans` and `plan_items`, add nullable `sessions.plan_item_id` (with index), all idempotent per the existing migration pattern. No backfill needed — existing sessions have no provenance. Rollback = previous container image; the new tables are inert for old code. New endpoints are additive to the agent protocol (schema_version on logs untouched).

## Open Questions

None — the triggering cadence (free-running agent, no queue) and current-plan rule (newest wins, no expiry) were settled during exploration.
