## 1. Server: unified aggregation & payload changes

- [x] 1.1 Switch the shared session aggregation (`collectPracticedSessions` in `server/memory/digest.ts`) to verdict-based accepted (a session counts as solved only when it has an `Accepted` submission) and reuse it for the dashboard's per-topic rollup; verify digest, memory-api, knowledge-tree, and dashboard service tests are updated to pin the Wrong-Answer-only case (attempt counted, not solved) and pass
- [x] 1.2 In `getDashboard` (`server/sessions/service.ts`): replace the raw `tags` rollup with a `topics` rollup (taxonomy node ids incl. the Other bucket, attempts + solved, ordered by attempts) and add `topics: string[]` to each plan item from its problem's tags; verify dashboard service tests cover topic rollup (multi-node membership, Other bucket) and per-item topics
- [x] 1.3 Add `problemId` to roadmap frontier items in `server/knowledge/tree.ts`; verify tree service and roadmap-api tests cover the field (present for bank-known items, Start hidden when null)

## 2. Dashboard page reorganization

- [x] 2.1 Implement the Next up strip in `DashboardPage.tsx` with the precedence chain (unfinished session → carried unsolved item → first not-started item → bank guidance) derived from existing payload fields; verify component tests cover each precedence level and the empty state
- [x] 2.2 Restructure the dashboard into the three sections (Next up strip full-width; Plan column; Record column) on a two-column grid with the compact stat strip, activity chart, topic bars linking to `/roadmap?topic=<id>`, and the recent-results list in the record section; verify component tests cover section structure, stat strip content, topic bar ordering/links (incl. Other), and the recent list
- [x] 2.3 Add trained-topic chips to plan items (linking to `/roadmap?topic=<id>`) and the capped item list with inline show-all; verify component tests cover chips per mapped node and the cap/show-all toggle

## 3. Roadmap synergy & layout

- [x] 3.1 Implement the topic deep link in `RoadmapPage.tsx` (`?topic=<node-id>` opens that node's domain section and drill-down on load); verify component tests cover deep-link expansion and the plain-load behavior
- [x] 3.2 Add the Start action to roadmap frontier items (posting the existing session-start body with `problemId` + `planItemId`, navigating to the session); verify component tests cover start success, in-flight/error states, and hiding Start when `problemId` is null
- [x] 3.3 Render the curated domains side by side on wide viewports with the Other section shown only when it has practice or frontier content; verify component tests cover conditional Other rendering and unchanged payload consumption

## 4. Shell & final verification

- [x] 4.1 Widen the shell's page container (`min(94vw, 1600px)`) and add the grid/section/strip CSS using existing tokens, with the narrow-viewport single-column collapse; verify the ui-foundation shell test asserts the nav set (incl. Roadmap) and no other page regresses
- [x] 4.2 Run the full quality gates (`npm run typecheck`, `npm run test`, `npm run build`) and fix failures; verify all gates pass
- [x] 4.3 Verify `README.md` reflects the reorganized dashboard sections, the plan↔roadmap interactions, and the wider layout; update the UI description and daily-usage flow if needed
