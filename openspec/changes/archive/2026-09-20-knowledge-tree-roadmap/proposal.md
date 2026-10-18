## Why

Practice data is aggregated as flat lists (tags table, plan items), so the user cannot see their progress as a roadmap: which topics they have covered, how solid each one is, and where the agent's current plan is pushing them next. The agent-memory change produced a server-computed progress digest; this change renders that accumulated state as the curated knowledge tree the planning exploration converged on (taxonomy shape confirmed with the user against authoritative roadmaps: NeetCode dependency order + LeetCode study-plan categories).

## What Changes

- Add a **curated topic taxonomy seed** in the app: a versioned, code-resident mapping from LeetCode tag slugs to a two-level topic tree (~16 topic nodes under Data Structures / Algorithms domains, with an explicit "Other" bucket for unmapped tags). Problems inherit topic membership through their tags — no per-problem curation.
- Refactor the **progress digest** to source its topic grouping from the taxonomy seed (response shape unchanged; topic keys become curated node ids). Digest and roadmap share one aggregation function so they cannot diverge.
- Add a **roadmap tree service + UI endpoint** (`GET /api/ui/roadmap`): the taxonomy tree enriched per node with mastery (attempts, solved, solve rate, last practiced) and the current-plan frontier (items targeting that node, carried unfinished items flagged).
- Build the **Roadmap page**: a new nav item rendering the tree as collapsible domain → topic sections, per-node mastery bars, "next focus" markers on nodes the current plan targets, carried-item markers, and a node drill-down listing recently practiced problems with derived outcomes. Empty states when nothing is practiced yet.

Non-goals:
- Graph-style rendering of prerequisite edges (the curated roadmap order is expressed as ordered sections; a dependency-graph view can come later).
- Rendering the agent memory notebook (agent-only per the agent-memory capability) — the tree shows objective mastery + plan frontier only.
- Editing the taxonomy from the UI (seed is code-owned data).
- New runtime dependencies.

## Capabilities

### New Capabilities
- `knowledge-tree`: The roadmap knowledge tree — curated topic taxonomy (tag→node seed), mastery/frontier derivation shared with the progress digest, the UI roadmap endpoint, and the collapsible Roadmap page with per-node mastery and drill-down.

### Modified Capabilities

(None — the progress digest's response contract is unchanged; its topic grouping function now sources from the taxonomy seed, which is an implementation refactor. No agent-facing, plan, or session behavior changes.)

## Impact

- **Server**: new `server/knowledge/` module (taxonomy seed + tree service); `server/memory/digest.ts` grouping refactored onto the taxonomy (response shape unchanged); new `GET /api/ui/roadmap` route in `server/routes/ui.ts`.
- **Web**: new `web/src/pages/RoadmapPage.tsx`, nav item in `App.tsx`, reuses existing primitives (Card, Chip, EmptyState) and tokens.
- **Tests**: taxonomy mapping tests, tree service tests, UI route tests, RoadmapPage component tests; existing memory/digest tests updated only where topic keys change from coarse names to curated ids.
- **Dependencies**: none added.
