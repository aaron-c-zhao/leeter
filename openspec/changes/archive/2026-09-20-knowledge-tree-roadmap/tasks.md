## 1. Taxonomy seed & digest refactor

- [x] 1.1 Create `server/knowledge/taxonomy.ts`: versioned two-level seed (Data Structures / Algorithms domains, ~16 ordered topic nodes, ~50 tag→node mappings, `other` bucket) with `topicsForTags` returning node ids in roadmap order; verify unit tests cover tag→node mapping, multi-node membership, Other-bucket fallback, and that every mapped tag is a non-empty slug
- [x] 1.2 Refactor `server/memory/digest.ts` to source its grouping from the taxonomy seed, keeping the response contract (field names, `other` bucket) and adding the taxonomy version to the payload; verify existing digest/memory tests pass with curated topic keys and the memory-api tests still pass

## 2. Roadmap tree service & UI endpoint

- [x] 2.1 Extract the digest's session aggregation into a shared helper and implement the roadmap tree service in `server/knowledge/tree.ts`: domains in roadmap order, per-node mastery (attempts, solved, solve rate, last practiced) and frontier items (current-plan items mapped by tags, with status + carriedFrom); verify unit tests covering populated mastery, frontier mapping across nodes, carried flagging, and the empty state
- [x] 2.2 Add `GET /api/ui/roadmap` (camelCase) returning the tree with taxonomy version; verify route tests: success, no sync triggered, empty state, and that plan frontier reflects the current plan including carried items

## 3. Roadmap page

- [x] 3.1 Build the Roadmap page (`web/src/pages/RoadmapPage.tsx`): collapsible domain sections with topic rows, mastery bars (token classes), "next focus" and "carried" chips, node drill-down listing practiced problems newest-first with difficulty chip, outcome, and session-detail links, plus the untouched-node and empty-app states; verify component tests cover mastery bars, frontier/carried markers, drill-down lists, and empty states
- [x] 3.2 Add the Roadmap nav item to the app shell and verify active-link styling; verify the nav component test updated

## 4. Final verification

- [x] 4.1 Run the full quality gates (`npm run typecheck`, `npm run test`, `npm run build`) and fix failures; verify all gates pass
- [x] 4.2 Verify `README.md` reflects the Roadmap page and updated navigation; update the UI description and daily-usage flow if needed
