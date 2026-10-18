## Context

See proposal.md for motivation. Current state that shapes the approach: `DashboardPage.tsx` renders five sibling cards from one `/api/ui/dashboard` payload (`getDashboard` in `server/sessions/service.ts` computes totals, daily activity, raw tag bars, plan items joined to problems by lcId, and the active/recent sessions); `RoadmapPage.tsx` renders `/api/ui/roadmap` (`server/knowledge/tree.ts`) as three stacked domain sections with read-only frontier chips; the shell's `.app-main` caps content at 1100px. The taxonomy (`server/knowledge/taxonomy.ts`) is pure seed data already used by both the digest and the tree service.

## Goals / Non-Goals

**Goals:**
- One vocabulary and one set of numbers: dashboard topic bars, roadmap mastery, and digest topics all derive from the taxonomy and the same solved semantics.
- Dashboard reorganized into Next up / Plan / Record with a two-column grid; roadmap domains side by side; both inside a wider bounded shell.
- Plan ↔ roadmap interaction: startable frontier, topic chips with deep links.

**Non-Goals:**
- Mobile design (single media-query collapse only).
- New endpoints, capabilities, or dependencies.
- Changing digest response shapes or agent-facing contracts.

## Decisions

### D1: Layout is pure CSS grid on existing primitives — no new component framework
`.app-main` widens from `1100px` to `min(94vw, 1600px)`. The dashboard gains a two-column grid (plan `1.4fr`, record `1fr`) under the full-width Next up strip; the roadmap gains a two-column grid for the curated domains. A single media query (below ~1100px) collapses both to today's stacked layout. Cards, chips, progress-track/fill, and EmptyState are reused as-is; only section containers and a few grid/strip classes are new CSS.

### D2: Dashboard payload — plan items gain topic ids; the tags rollup is replaced by a topics rollup
`getDashboard`'s plan-item problem join additionally selects `tags`, and the payload's plan items carry `topics: string[]` (taxonomy node ids, server-computed via `topicsForTags`). The raw `tags` rollup field is **replaced** by `topics: [{ topic, attempts, solved }]` computed in the same session loop (grouping by taxonomy node instead of raw tag). The endpoint is UI-internal and ships atomically with the web build, so replacing rather than duplicating the field is safe and leaves no dead data. Next Up needs **no server change**: precedence (unfinished session → carried unsolved → first not-started → guidance) is derivable client-side from existing payload fields (`activeSession`, item `status` + `carriedFrom`).

### D3: Unify "solved" on verdict-based Accepted everywhere (fixing a pre-existing inconsistency)
Today the digest/roadmap count a session as solved when it has *any* synced submission (a Wrong-Answer-only session counts as solved), while the dashboard counts only `Accepted` verdicts. Once topic bars (dashboard) and mastery bars (roadmap) sit in one design system sharing the taxonomy, those numbers disagreeing would be visible and confusing. Decision: the shared aggregation (`collectPracticedSessions` in `digest.ts`) switches to verdict-based accepted (session has an `Accepted` submission), and the dashboard's per-topic rollup reuses that same aggregation. Agent-facing digest *shapes* are unchanged; the numbers become strictly more correct (Wrong-Answer-only sessions stop counting as solved). The one place this is user/agent-visible is the digest's `solve_rate`/`solved` fields, whose semantics the protocol doc never pinned down.

### D4: All taxonomy mapping stays server-side — no shared web bundle
Plan-item topic chips, dashboard topic bars, and roadmap nodes are all computed server-side (dashboard/tree payloads already cross the boundary); the web only renders payload data and builds links (`/roadmap?topic=<id>`). Duplicating the seed into the web bundle or importing server modules from Vite would add a divergence risk for zero benefit.

### D5: Topic deep link is a query param handled by the roadmap page
`/roadmap?topic=<node-id>`: `RoadmapPage` reads the param on load, opens that node's domain section and drill-down. The dashboard's topic bars and plan-item chips link this way. (A hash anchor would fight the collapsible-details rendering; a query param is explicit and testable.)

### D6: Startable frontier reuses the existing session-start flow
`tree.ts` frontier items gain `problemId: number | null` (null only if the bank row vanished — Start is hidden then). The Start button posts the same `POST /api/ui/sessions {problemId, planItemId}` the dashboard uses, so provenance and best-effort problem-detail sync behave identically; no new endpoint.

### D7: Roadmap columns and the Other bucket
Data Structures (10 nodes) and Algorithms (5) render as two grid columns (equal `1fr` — the Algorithms column is simply shorter). The Other section renders only when it has attempts or frontier content; the payload keeps returning it always (the empty-roadmap contract), the page just hides the empty bucket so the two curated domains fill the screen.

### D8: Long plan lists cap client-side
The plan section shows the first 8 items plus an inline "show all N" toggle (component state); past plans stay collapsed as today. The cap keeps the plan column roughly height-matched with the record column in the common case.

## Risks / Trade-offs

- [D3 changes agent-visible digest numbers (Wrong-Answer-only sessions no longer counted as solved)] → strictly a correctness fix; shapes untouched; digest/roadmap/dashboard tests updated to cover the WA-only case explicitly so the semantics are pinned.
- [Very tall plans (show-all expanded) leave whitespace in the record column] → accepted; the grid row grows, the page scrolls — same behavior as today, only opt-in.
- [jsdom component tests cannot verify CSS layout] → tests assert section structure, precedence, links, and caps; the actual grid/widening is reviewed visually and covered by the ui-foundation width scenario as a spec statement.
- [Widening the shell affects Bank/History tables] → they are width-hungry tables; the change is a benefit. No table restructure included.

## Migration Plan

No data migration. Server payload changes (tags→topics rollup, item topics, frontier problemId, verdict-based accepted) ship atomically with the web build in one deploy — the endpoint and its only consumer are versioned together. Rollback = revert the deploy; no persisted state depends on the new fields.

## Open Questions

- Exact visual treatment of the compact stat strip (three inline cells vs. a single line of "42 sessions · 17 solved (40%) · 12.3 h") — purely cosmetic, decided during implementation.
- Whether the plan column ratio is 1.4fr or 1.5fr — visual tuning, no contract impact.
