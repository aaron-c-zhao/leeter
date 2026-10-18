## 1. Schema & plans service

- [x] 1.1 Add `plans` and `plan_items` tables plus nullable indexed `sessions.plan_item_id` to the Drizzle schema and the idempotent migration; verify `npm run typecheck` passes and a fresh DB migrates cleanly in a test
- [x] 1.2 Implement the plans service: create (validates horizon, focus, problems list, and that every lc_id exists in the bank) and list (newest-first with items); verify with unit tests covering success, malformed payloads, unknown lc_id rejection, and ordering
- [x] 1.3 Implement the derived item-status query (join sessions on plan_item_id, solved iff any linked session Accepted, practiced if sessions but none Accepted, not-started otherwise); verify with unit tests covering all three statuses and retry linking (many sessions → one item)

## 2. Agent API

- [x] 2.1 Add `POST /api/agent/plans` with strict validation (unknown fields → 400) mirroring the review endpoint's error contract; verify with agent-route tests (auth required, success, malformed, unknown problem ids)
- [x] 2.2 Add `GET /api/agent/plans` (newest-first, items with problem references); verify with an agent-route test
- [x] 2.3 Add `GET /api/agent/problems` mirroring the cached bank without triggering sync; verify with an agent-route test that no lc-client call occurs
- [x] 2.4 Expose `planItemId` in the agent session listing output; verify the field appears in listSessions responses (null for unlinked sessions)

## 3. UI session creation with provenance

- [x] 3.1 Accept optional `planItemId` on `POST /api/ui/sessions`, validating it references an existing plan item and recording it on the session; verify with route tests (provenance recorded; invalid id → 400; absent field → unlinked session)
- [x] 3.2 Surface plan origin (plan reference / item reason) in the session detail payload and show a "from plan" badge on the session detail page; verify in the session detail component test

## 4. Dashboard plan section

- [x] 4.1 Extend the dashboard payload with the current plan (focus, notes, horizon, created_at) and per-item derived statuses; verify with dashboard test covering current-plan selection (newest wins) and status derivation
- [x] 4.2 Build the "Current plan" dashboard section: focus markdown, items with status chips, Start-session buttons calling session creation with `planItemId` and navigating to the session page; verify in component test (status chip per state, start click hits the API with the right body)
- [x] 4.3 Add the collapsed past-plans history list with items and statuses; verify in component test

## 5. Agent protocol doc & protocol tests

- [x] 5.1 Extend `agent/AGENT_PROTOCOL.md` with the plans POST/GET and problems GET endpoints, the required "reconstruct previous plan adherence before proposing" workflow step, and cadence guidance (free-running agent, no queue); verify the doc covers every new field and error case by reading it end-to-end
- [x] 5.2 Update the protocol/agent integration tests to cover the new endpoints end-to-end (claim-free flow: post plan → appears in list → session from plan item shows provenance)

## 6. Final verification

- [x] 6.1 Run the full quality gates (`npm run typecheck`, `npm run test`, `npm run build`) and fix any failures; verify all gates pass
