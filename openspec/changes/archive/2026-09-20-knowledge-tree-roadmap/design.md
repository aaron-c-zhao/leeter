## Context

The agent-memory change shipped the progress digest (`server/memory/digest.ts`): a coarse `TOPIC_TAGS` tag→topic map, per-topic aggregates, and current-plan adherence. The web app has a token-based design system, shared primitives (Card, Chip, EmptyState, PageHeader), an app shell with nav, and a Dashboard rendering plan/tag aggregates. The digest response shape is a published agent contract and must not change.

## Goals / Non-Goals

**Goals:**
- One curated taxonomy powering both the digest's topic keys and the roadmap tree.
- A Roadmap page that answers "what have I covered, how solid is it, what's next".
- Zero new dependencies; tree rendered with existing tokens/primitives.

**Non-Goals:**
- Prerequisite-graph rendering (roadmap order = ordered sections; graph view deferred).
- Memory-notebook rendering (agent-only), taxonomy editing, charting libraries.

## Decisions

### D1: Taxonomy lives as a versioned TypeScript seed module (`server/knowledge/taxonomy.ts`)
Structure: ordered `{id, label, domain, tags[], order}` topic nodes grouped into domains; `topicForTags(tags) -> topic id(s)` with an `other` bucket; a `version` constant. ~16 nodes / ~50 tag mappings per the research-confirmed structure (NeetCode 18-category dependency order collapsed into 2 domains; LeetCode 75 study-plan categories merged where they are one pattern; mapping curated at the tag level so problems inherit membership). Content decision recorded: the user approved this shape; extending the seed is a data edit.

### D2: Digest refactored onto the taxonomy — contract unchanged
`digest.ts`'s `TOPIC_TAGS`/`topicsForTags` move to (or delegate to) the taxonomy module; the digest response keeps its field names, now keyed by curated node ids. Existing digest tests' topic keys are updated accordingly (the only allowed test churn). This makes the taxonomy the single grouping authority for agent and UI.

### D3: Roadmap tree = digest aggregation + tree structure, one service
`server/knowledge/tree.ts` reuses the digest's session-accepted aggregation (extracted into a shared helper, not duplicated) and composes: domains in roadmap order → topic nodes with mastery + frontier items (current-plan items whose problem tags map to the node, with status + `carried_from`). Frontier mapping reuses `getCurrentPlan` item data already carried in the digest; the roadmap endpoint returns the same aggregates the agent digest computes for those nodes — no second aggregation path.

### D4: `GET /api/ui/roadmap` in camelCase (UI convention)
Payload: `{ domains: [{ id, label, topics: [{ id, label, attempts, solved, solveRate, lastPracticedAt, frontier: [{ itemId, title, slug, difficulty, status, carriedFrom }] }] }] }`.camelCase per the existing `/api/ui/*` convention; agent-facing digest stays snake_case. No new capability on the agent surface.

### D5: Roadmap page renders order, not a graph
Collapsible domain `<details>`-style sections (like the dashboard's past-plans pattern), topic rows with mastery bars reusing `.progress-track`/`.progress-fill` token classes, `Chip` for "next focus"/"carried" markers, `EmptyState` for the untouched app, drill-down as a nested list of practiced problems (newest first, capped ~10 per node) linking to session detail. A graph rendering of prerequisite edges is deferred; the curated order is conveyed by section ordering and numbering.

### D6: Taxonomy version surfaced in the payload
The roadmap payload (and digest) carry the taxonomy `version` so future seed updates are observable in tests and logs without changing shapes.

## Risks / Trade-offs

- [Topic keys in the digest change from coarse names (`arrays-hashing` as seeded) to curated ids] → same aggregation, renamed keys only; digest tests updated; agent protocol's `"other"` example remains valid (bucket kept).
- [Frontier mapping by tags can put a plan item on multiple nodes] → accepted and intentional (a problem legitimately develops several topics); drill-down and frontier both show every node membership.
- [Taxonomy drift from real LeetCode tags as the bank syncs] → the "Other" bucket keeps every session visible; seed updates are data changes with tests asserting every mapped tag is a plausible LC slug.
- [Roadmap page adds a 4th nav item] → shell nav is flexbox with active states; no layout risk.

## Migration Plan

No data migration (taxonomy is seed data). The digest refactor must keep the response contract byte-compatible apart from topic keys (documented, test-updated). Rollback = revert; the new endpoint and page are additive.

## Open Questions

- Exact mastery-bar scale when a node has attempts but zero solves (empty vs zero bar) — decide during implementation; purely visual, no contract impact.
- Whether drill-down caps at 10 problems or paginates — placeholder 10, revisit in implementation; no contract impact.
