## Why

The Dashboard renders five unrelated full-width cards stacked vertically: it wastes screen width (the shell caps at 1100px), forces constant scrolling, and has no functional grouping — the retrospective (stats, activity, tags), the forward-looking plan, and the "do this now" actions sit as equal siblings. Meanwhile the Roadmap and the plan barely interact: the Roadmap shows the plan's frontier as read-only chips, plan items don't say which topics they train, and the two pages speak different vocabularies (raw LeetCode tags vs curated topics).

## What Changes

- **Dashboard information architecture**: reorganize into three functional sections — a slim full-width **Next Up** strip (the single most actionable item: unfinished session, else carried-unsolved plan item, else next not-started item, else guidance), **The Plan** column (current plan with progress, compact item rows, past plans), and **The Record** column (compact stat strip, 30-day activity chart, topic bars). Plan left / record right on a two-column grid that collapses to a stack on narrow viewports.
- **Screen utilization**: widen the app shell's bounded content container from 1100px to `min(94vw, 1600px)`; plan item lists cap with an inline "show all".
- **One vocabulary across pages**: the Dashboard's raw tag distribution bars become **curated topic bars** (taxonomy-based), linking to the corresponding Roadmap topic node with its drill-down pre-expanded.
- **Plan ↔ Roadmap synergy**: dashboard plan items show **topic chips** ("trains: arrays, two-pointers") deep-linking to Roadmap nodes; Roadmap **frontier items become startable** (Start button creates a session linked to the plan item, preserving agent provenance).
- **Roadmap layout**: the two curated domains (Data Structures / Algorithms) render side by side instead of stacked, with the Other bucket below only when non-empty.

Non-goals:
- Mobile/small-screen design (single-column collapse only, below ~1100px).
- Prerequisite-graph rendering or new roadmap data (layout only).
- Changes to agent-facing endpoints or the digest contract.

## Capabilities

### New Capabilities

(None.)

### Modified Capabilities

- `dashboard`: Dashboard summary stat cards become a compact stat strip inside the record section; the Continue section becomes the Next Up strip with plan-item fallback and precedence; tag distribution becomes taxonomy topic bars linked to the Roadmap; plan items show the topics they train; the page renders as functional sections in a two-column layout.
- `knowledge-tree`: frontier items on the Roadmap are startable (session created with plan-item linkage); the Roadmap accepts a topic deep-link that opens that node's drill-down; domains render side by side.
- `ui-foundation`: the app shell's page container widens to a larger bounded width; the nav description includes the Roadmap link (stale since the knowledge-tree change).

## Impact

- **Server**: `server/sessions/service.ts` `getDashboard` — the raw tag rollup is replaced by a curated topic rollup (taxonomy grouping; the endpoint is UI-internal and ships atomically with the web build), and plan items gain their problem's topic ids; `server/knowledge/tree.ts` — frontier items gain the problem id needed to start a session. No new endpoints; the roadmap frontier payload change is additive.
- **Web**: `DashboardPage.tsx` restructured into the three sections; `RoadmapPage.tsx` two-column domains, startable frontier, topic deep-link; `global.css` grid/section styles and wider `.app-main`; taxonomy seed shared into the web bundle for client-side tag→topic mapping on plan items.
- **Tests**: dashboard component/service tests updated (stat strip, Next Up precedence, topic bars, topic chips), roadmap tests updated (startable frontier, deep-link, two-column), ui-foundation shell width/nav test updated.
- **Dependencies**: none added.
