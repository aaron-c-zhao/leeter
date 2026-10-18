## 1. Schema & chaining fields

- [x] 1.1 Add `memory` + `memory_versions` tables and nullable `plans.based_on` / `plan_items.carried_from` columns to the Drizzle schema and the idempotent migration; verify `npm run typecheck` passes and a fresh DB migrates cleanly in a test
- [x] 1.2 Extend plan validation/storage for optional `based_on` and per-item `carried_from` (must exist, must point backwards; invalid → reject); verify unit tests cover accepted chains, missing ids, self/forward references, and that plans without chaining fields still store

## 2. Memory & digest services

- [x] 2.1 Implement the memory service: PUT creates a new immutable version and repoints current, GET returns the latest body, versions listed newest-first with timestamp and size, 64 KiB cap; verify unit tests cover versioning, current reads, history ordering, cap rejection, and malformed payloads
- [x] 2.2 Implement `getProgressDigest`: per-topic aggregates (attempts, solved, solve rate, last_practiced_at) from sessions+problems via the initial tag→topic map, plus current-plan adherence rollup (solved/practiced/not-started counts, carried unsolved items); verify unit tests covering populated state, empty state, and that no LC sync is triggered

## 3. Agent API

- [x] 3.1 Add `GET /api/agent/progress` and `GET/PUT /api/agent/memory` + `GET /api/agent/memory/versions` with strict validation (unknown fields → 400), mirroring the existing agent error contract; verify agent-route tests for auth, success, malformed, and that plan responses now echo chaining fields
- [x] 3.2 Extend agent plan POST/GET payloads with `based_on`/`carried_from` (snake_case) and update `GET /api/agent/plans` listing to include them; verify route tests for chained plan round-trip and legacy plan payloads without the fields

## 4. Protocol optimization

- [x] 4.1 Rewrite the `AGENT_PROTOCOL.md` planning workflow to the 6-step digest→memory→plan→memory loop, document the new endpoints and payload fields, add the anti-pattern rule (process bookkeeping belongs in memory, not plan focus/notes); verify the doc covers every new endpoint, field, and error case by reading it end-to-end
- [x] 4.2 Update protocol/agent integration tests to cover the new flow end-to-end (digest → memory PUT → chained plan POST → plan list shows linkage → memory versions audit)

## 5. Final verification

- [x] 5.1 Run the full quality gates (`npm run typecheck`, `npm run test`, `npm run build`) and fix failures; verify all gates pass
- [x] 5.2 Verify `README.md` still reflects reality (agent protocol changes, new endpoints); update the agent/protocol descriptions if needed
