# You are the leeter plan-quality judge

You score ONE captured planning run against the quality rubric below. You did
not run the planner; you see only what the planner could know (the seeded
ground truth) and what it produced (captured artifacts).

## Scoring rules

- Score dimensions 2-9 (grounding, ladder_continuity, targeting, coaching,
  hygiene, reason_quality, memory, efficiency). Dimension 1 (structural
  validity) is checked by the deterministic scripted checks — do not score it.
- 1 (bad) to 5 (excellent), integers only.
- **Evidence rule:** any score <= 3 must cite evidence — a digest field
  value, a quoted memory line, a plan item, a check result. A low score
  without evidence is an invalid judgment.
- Judge the output, not the effort. Use exactly the rubric anchors.

## Scripted checks (authoritative facts, computed from server data)

```json
{
 "fixture": "f1-first-run",
 "checks": [
  {
   "name": "plan_posted",
   "pass": true,
   "detail": "plans: 1 -> 2"
  },
  {
   "name": "bank_lc_ids",
   "dimension": 1,
   "pass": true,
   "detail": "all lc_ids exist in the bank"
  },
  {
   "name": "based_on_chained",
   "dimension": 1,
   "pass": true,
   "detail": "based_on=1, previous plan=1"
  },
  {
   "name": "carried_from_valid",
   "dimension": 1,
   "pass": true,
   "detail": "all carried_from target previous items"
  },
  {
   "name": "carried_unsolved_addressed",
   "dimension": 3,
   "pass": true,
   "detail": "0 carried item(s) carried or resolved"
  },
  {
   "name": "horizon_item_bounds",
   "dimension": 1,
   "pass": true,
   "detail": "7 items for a 14-day horizon"
  },
  {
   "name": "focus_notes_hygiene",
   "dimension": 6,
   "pass": true,
   "detail": "no process narration in focus/notes"
  },
  {
   "name": "not_a_noop",
   "dimension": 9,
   "pass": true,
   "detail": "item set differs from the previous plan"
  },
  {
   "name": "memory_updated",
   "dimension": 8,
   "pass": true,
   "detail": "memory versions: 0 -> 1"
  }
 ],
 "passed": 9,
 "total": 9
}
```

## Captured artifacts (what the planner produced)

```json
{
 "fixture": "f1-first-run",
 "plansAfter": [
  {
   "id": 2,
   "createdAt": 1789936022495,
   "horizonDays": 14,
   "basedOn": 1,
   "focus": "**Two-pointer & sliding-window block.** Finish the sorted Two Sum you already have open and the paused Longest Substring, then extend the converging-pointer idea to 3Sum. Level up sliding-window with Longest Repeating Character Replacement, add fast/slow pointers on a linked list, and keep Group Anagrams plus Valid Parentheses to hold the hash-map and stack base.",
   "notes": "Practice habit for this block: before you finish a problem, write one line capturing the key insight (complement map, two-pointer movement rule, or window-shrink condition), and submit on LeetCode so your verdict lands in the log.",
   "items": [
    {
     "id": 6,
     "lcId": 167,
     "slug": "two-sum-ii-input-array-is-sorted",
     "reason": "There is a session already open on this problem (linked to plan item 1, status *practiced*), so finish it before starting anything new. Digest shows **two-pointers 1/0 and binary-search 1/0** — both entirely unproven — and this sorted-array complement is the bridge from the hash-map Two Sum to real pointer movement.",
     "status": "not_started",
     "carriedFrom": 1
    },
    {
     "id": 7,
     "lcId": 3,
     "slug": "longest-substring-without-repeating-characters",
     "reason": "The Sep 16 attempt on this problem is **paused at 40 minutes with no plan link**, so it never shows up in adherence — re-attempt it and close it out. **sliding-window is 0/1** and this is the canonical window-shrink template the rest of the block builds on.",
     "status": "not_started",
     "carriedFrom": 2
    },
    {
     "id": 8,
     "lcId": 15,
     "slug": "3sum",
     "reason": "Next rung on the same thread as the sorted Two Sum: **two-pointers is 0/1**. Sorting plus a fixed pivot and converging pointers is the general k-sum move, and it should land while the two-pointer mechanics from the sorted Two Sum are fresh.",
     "status": "not_started",
     "carriedFrom": 3
    },
    {
     "id": 9,
     "lcId": 49,
     "slug": "group-anagrams",
     "reason": "**Arrays-hashing is 8 attempts but only 13% solved, and all of it is Two Sum.** Group Anagrams forces a different hash key (canonical form) instead of the complement lookup, which is exactly the variety the base pattern is missing.",
     "status": "not_started",
     "carriedFrom": 4
    },
    {
     "id": 10,
     "lcId": 141,
     "slug": "linked-list-cycle",
     "reason": "**Two-pointers is the weakest thread (0/1).** Fast/slow pointers on a linked list is the Easy on-ramp to the pattern in a new data structure — an achievable win that is not another Two Sum variant, and it introduces linked-list, which the digest has no practice on at all.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 11,
     "lcId": 424,
     "slug": "longest-repeating-character-replacement",
     "reason": "Direct difficulty step after Longest Substring in the **sliding-window thread (0/1)**: same window mechanics, plus the max-frequency-in-window constraint. Keep it after the Longest Substring item so the shrink rule is established first.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 12,
     "lcId": 20,
     "slug": "valid-parentheses",
     "reason": "The digest shows **no stack practice whatsoever**, and a short Easy that pairs with the string work in Group Anagrams / Longest Substring adds a second core structure without raising difficulty on the unproven two-pointer thread.",
     "status": "not_started",
     "carriedFrom": null
    }
   ]
  },
  {
   "id": 1,
   "createdAt": 1789819200000,
   "horizonDays": 14,
   "basedOn": null,
   "focus": "Two weeks on the hash-map -> two-pointers -> sliding-window ladder. Two Sum is already solved optimally (one-pass complement map); the next step is the same idea under different constraints (sorted array, k-sum, windowed uniqueness) plus finishing the paused Longest Substring session.",
   "notes": null,
   "items": [
    {
     "id": 1,
     "lcId": 167,
     "slug": "two-sum-ii-input-array-is-sorted",
     "reason": "same complement idea on a sorted array",
     "status": "practiced",
     "carriedFrom": null
    },
    {
     "id": 2,
     "lcId": 3,
     "slug": "longest-substring-without-repeating-characters",
     "reason": "finish the paused session",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 3,
     "lcId": 15,
     "slug": "3sum",
     "reason": "k-sum generalization",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 4,
     "lcId": 49,
     "slug": "group-anagrams",
     "reason": "hash-map pattern on strings",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 5,
     "lcId": 350,
     "slug": "two-sum-iv-input-is-a-bst",
     "reason": "two pointers on a BST",
     "status": "not_started",
     "carriedFrom": null
    }
   ]
  }
 ],
 "memoryVersionsAfter": [
  {
   "body": "# Memory — planning state\n\n## Current ladder\n- Plan **2** (posted 2026-09-20, horizon 14d), `based_on: 1`. Theme: two-pointer & sliding-window.\n- Order: `two-sum-ii`(167) → `longest-substring`(3) → `3sum`(15) → `group-anagrams`(49) → `linked-list-cycle`(141) → `longest-repeating-char-replacement`(424) → `valid-parentheses`(20).\n- Item ids in plan 2: 167→6, 3→7, 15→8, 49→9, 141→10, 424→11, 20→12.\n\n## Why this revision\n- Digest (ground truth): 8 attempts / 1 solved. `arrays-hashing` 8/1 (0.13), `binary-search` 1/0, `sliding-window` 1/0, `two-pointers` 1/0. Plan 1 adherence: 0 solved, 1 practiced, 4 not started; `carried_unsolved` empty because plan 1 is the root (no `carried_from`).\n- The 8 arrays-hashing attempts are almost entirely repeated Two Sum (sessions 1,2,4,5,6,7) with only session 1 Accepted — so the real story is *Two Sum grinding*, not broad arrays mastery. Chose not to add more Two Sum variants.\n- Carried plan-1 items 1–4 (`carried_from` 1,2,3,4) because 167 has an open session and 3/15/49 are untouched next rungs.\n- New picks: 141 (Easy two-pointers on a new structure — two-pointers is the weakest thread), 424 (sliding-window difficulty step after 3), 20 (stack — zero digest practice).\n- **Retired plan-1 item 5 = `lc350` two-sum-iv-input-is-a-bst.** Reason: a third Easy Two Sum variant; the comfort-zone trap the rubric warns about. Defer BST/tree review until the two-pointer thread is stable.\n- Count = 7 items for 14d (5 Medium, 2 Easy). Deliberately modest: user pace is ~1–2 short sessions/week, and 4 of 7 are carried.\n\n## Open threads (watch next run)\n- **[in-graph active]** Session 8 on `two-sum-ii` (lc167), `planItemId 1`, `activeMs 0`, 1 log line — opened Sep 20 but essentially not worked. Check whether it gets finished under plan-2 item 6 (carried_from 1).\n- **[outside graph, paused]** Session 3 on `longest-substring` (lc3), `planItemId null`, 40 min active. Invisible to `carried_unsolved`; carried as plan-2 item 7. Confirm it gets re-attempted, not abandoned.\n- **[review signal]** Reviews 1 & 2 (sessions 1, 7): \"Notes were thin\" both times; `recommendedFocus` = leave a key-insight note, compare draft snapshots, and **submit on LeetCode + re-sync so verdicts land**. 7 of 8 sessions have `outcome: null` — verdicts are not reaching the log. Notes in plan 2 tell the user to note the insight and submit.\n- Review signals to re-check: are notes appearing on new sessions? Are outcomes no longer null (i.e. is the submit/re-sync loop working)?\n- No pending review requests this run (`/reviews/pending` empty).\n\n## Stale / reconcile\n- Memory was previously **empty** (`body: null`, no versions). This is a fresh notebook; digest is authority. Nothing to reconcile.\n\n## Next-run checks\n1. `GET /api/agent/progress`: did `two-pointers` / `sliding-window` / `binary-search` move off 0/1? Did plan-2 solved count rise above 0?\n2. Is the paused session 3 resolved (finished) or still dangling? Is session 8 (lc167) still `active`?\n3. New sessions carry non-null `outcome` and non-empty notes (review signals)?\n4. If 167/3 still unstarted/unfinished, do **not** ladder up to 3Sum/424; instead re-scope to a shorter two-pointer-only block.",
   "createdAt": 1789936038550,
   "size": 3226
  }
 ],
 "currentMemoryAfter": "# Memory — planning state\n\n## Current ladder\n- Plan **2** (posted 2026-09-20, horizon 14d), `based_on: 1`. Theme: two-pointer & sliding-window.\n- Order: `two-sum-ii`(167) → `longest-substring`(3) → `3sum`(15) → `group-anagrams`(49) → `linked-list-cycle`(141) → `longest-repeating-char-replacement`(424) → `valid-parentheses`(20).\n- Item ids in plan 2: 167→6, 3→7, 15→8, 49→9, 141→10, 424→11, 20→12.\n\n## Why this revision\n- Digest (ground truth): 8 attempts / 1 solved. `arrays-hashing` 8/1 (0.13), `binary-search` 1/0, `sliding-window` 1/0, `two-pointers` 1/0. Plan 1 adherence: 0 solved, 1 practiced, 4 not started; `carried_unsolved` empty because plan 1 is the root (no `carried_from`).\n- The 8 arrays-hashing attempts are almost entirely repeated Two Sum (sessions 1,2,4,5,6,7) with only session 1 Accepted — so the real story is *Two Sum grinding*, not broad arrays mastery. Chose not to add more Two Sum variants.\n- Carried plan-1 items 1–4 (`carried_from` 1,2,3,4) because 167 has an open session and 3/15/49 are untouched next rungs.\n- New picks: 141 (Easy two-pointers on a new structure — two-pointers is the weakest thread), 424 (sliding-window difficulty step after 3), 20 (stack — zero digest practice).\n- **Retired plan-1 item 5 = `lc350` two-sum-iv-input-is-a-bst.** Reason: a third Easy Two Sum variant; the comfort-zone trap the rubric warns about. Defer BST/tree review until the two-pointer thread is stable.\n- Count = 7 items for 14d (5 Medium, 2 Easy). Deliberately modest: user pace is ~1–2 short sessions/week, and 4 of 7 are carried.\n\n## Open threads (watch next run)\n- **[in-graph active]** Session 8 on `two-sum-ii` (lc167), `planItemId 1`, `activeMs 0`, 1 log line — opened Sep 20 but essentially not worked. Check whether it gets finished under plan-2 item 6 (carried_from 1).\n- **[outside graph, paused]** Session 3 on `longest-substring` (lc3), `planItemId null`, 40 min active. Invisible to `carried_unsolved`; carried as plan-2 item 7. Confirm it gets re-attempted, not abandoned.\n- **[review signal]** Reviews 1 & 2 (sessions 1, 7): \"Notes were thin\" both times; `recommendedFocus` = leave a key-insight note, compare draft snapshots, and **submit on LeetCode + re-sync so verdicts land**. 7 of 8 sessions have `outcome: null` — verdicts are not reaching the log. Notes in plan 2 tell the user to note the insight and submit.\n- Review signals to re-check: are notes appearing on new sessions? Are outcomes no longer null (i.e. is the submit/re-sync loop working)?\n- No pending review requests this run (`/reviews/pending` empty).\n\n## Stale / reconcile\n- Memory was previously **empty** (`body: null`, no versions). This is a fresh notebook; digest is authority. Nothing to reconcile.\n\n## Next-run checks\n1. `GET /api/agent/progress`: did `two-pointers` / `sliding-window` / `binary-search` move off 0/1? Did plan-2 solved count rise above 0?\n2. Is the paused session 3 resolved (finished) or still dangling? Is session 8 (lc167) still `active`?\n3. New sessions carry non-null `outcome` and non-empty notes (review signals)?\n4. If 167/3 still unstarted/unfinished, do **not** ladder up to 3Sum/424; instead re-scope to a shorter two-pointer-only block."
}
```

## Seeded ground truth (what the planner could know)

```json
{
 "fixture": "f1-first-run",
 "fixtureDescription": "First planning run after an ad-hoc plan: one prior plan, NO memory notebook, a paused session outside the plan graph, Easy-heavy history, two completed reviews with coaching signals.",
 "digest": {
  "totals": {
   "attempts": 8,
   "solved": 1
  },
  "topics": [
   {
    "topic": "arrays-hashing",
    "attempts": 8,
    "solved": 1,
    "solve_rate": 0.13,
    "last_practiced_at": 1789862400000
   },
   {
    "topic": "binary-search",
    "attempts": 1,
    "solved": 0,
    "solve_rate": 0,
    "last_practiced_at": 1789862400000
   },
   {
    "topic": "sliding-window",
    "attempts": 1,
    "solved": 0,
    "solve_rate": 0,
    "last_practiced_at": 1789560000000
   },
   {
    "topic": "two-pointers",
    "attempts": 1,
    "solved": 0,
    "solve_rate": 0,
    "last_practiced_at": 1789862400000
   }
  ],
  "current_plan": {
   "id": 1,
   "created_at": 1789819200000,
   "horizon_days": 14,
   "solved": 0,
   "practiced": 1,
   "not_started": 4,
   "carried_unsolved": []
  },
  "taxonomy_version": 1
 },
 "sessions": [
  {
   "id": 8,
   "problem": {
    "id": 10,
    "title": "two-sum-ii-input-array-is-sorted",
    "slug": "two-sum-ii-input-array-is-sorted",
    "difficulty": "Medium",
    "tags": [
     "array",
     "two-pointers",
     "binary-search"
    ]
   },
   "startedAt": 1789862400000,
   "finishedAt": null,
   "activeMs": 0,
   "status": "active",
   "outcome": null,
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": 1
  },
  {
   "id": 6,
   "problem": {
    "id": 1,
    "title": "two-sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "tags": [
     "array",
     "hash-table"
    ]
   },
   "startedAt": 1789819200000,
   "finishedAt": 1789820400000,
   "activeMs": 900000,
   "status": "finished",
   "outcome": null,
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": null
  },
  {
   "id": 7,
   "problem": {
    "id": 1,
    "title": "two-sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "tags": [
     "array",
     "hash-table"
    ]
   },
   "startedAt": 1789736400000,
   "finishedAt": 1789736400000,
   "activeMs": 2700000,
   "status": "finished",
   "outcome": null,
   "reviewRequestStatus": "completed",
   "reviewCount": 1,
   "planItemId": null
  },
  {
   "id": 5,
   "problem": {
    "id": 1,
    "title": "two-sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "tags": [
     "array",
     "hash-table"
    ]
   },
   "startedAt": 1789732800000,
   "finishedAt": 1789735200000,
   "activeMs": 1800000,
   "status": "finished",
   "outcome": null,
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": null
  },
  {
   "id": 4,
   "problem": {
    "id": 1,
    "title": "two-sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "tags": [
     "array",
     "hash-table"
    ]
   },
   "startedAt": 1789646400000,
   "finishedAt": 1789648200000,
   "activeMs": 1500000,
   "status": "finished",
   "outcome": null,
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": null
  },
  {
   "id": 3,
   "problem": {
    "id": 3,
    "title": "longest-substring-without-repeating-characters",
    "slug": "longest-substring-without-repeating-characters",
    "difficulty": "Medium",
    "tags": [
     "hash-table",
     "string",
     "sliding-window"
    ]
   },
   "startedAt": 1789560000000,
   "finishedAt": null,
   "activeMs": 2400000,
   "status": "paused",
   "outcome": null,
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": null
  },
  {
   "id": 2,
   "problem": {
    "id": 1,
    "title": "two-sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "tags": [
     "array",
     "hash-table"
    ]
   },
   "startedAt": 1789473600000,
   "finishedAt": 1789477200000,
   "activeMs": 3600000,
   "status": "finished",
   "outcome": null,
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": null
  },
  {
   "id": 1,
   "problem": {
    "id": 1,
    "title": "two-sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "tags": [
     "array",
     "hash-table"
    ]
   },
   "startedAt": 1789387200000,
   "finishedAt": 1789394400000,
   "activeMs": 4320000,
   "status": "finished",
   "outcome": "Accepted",
   "reviewRequestStatus": "completed",
   "reviewCount": 1,
   "planItemId": null
  }
 ],
 "plans": [
  {
   "id": 1,
   "createdAt": 1789819200000,
   "horizonDays": 14,
   "focusMd": "Two weeks on the hash-map -> two-pointers -> sliding-window ladder. Two Sum is already solved optimally (one-pass complement map); the next step is the same idea under different constraints (sorted array, k-sum, windowed uniqueness) plus finishing the paused Longest Substring session.",
   "notesMd": null,
   "basedOn": null,
   "items": [
    {
     "id": 1,
     "planId": 1,
     "lcId": 167,
     "slug": "two-sum-ii-input-array-is-sorted",
     "reasonMd": "same complement idea on a sorted array",
     "status": "practiced",
     "carriedFrom": null
    },
    {
     "id": 2,
     "planId": 1,
     "lcId": 3,
     "slug": "longest-substring-without-repeating-characters",
     "reasonMd": "finish the paused session",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 3,
     "planId": 1,
     "lcId": 15,
     "slug": "3sum",
     "reasonMd": "k-sum generalization",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 4,
     "planId": 1,
     "lcId": 49,
     "slug": "group-anagrams",
     "reasonMd": "hash-map pattern on strings",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 5,
     "planId": 1,
     "lcId": 350,
     "slug": "two-sum-iv-input-is-a-bst",
     "reasonMd": "two pointers on a BST",
     "status": "not_started",
     "carriedFrom": null
    }
   ]
  }
 ],
 "memory": null,
 "memoryVersions": [],
 "bank": [
  {
   "id": 1,
   "lcId": 1,
   "title": "two-sum",
   "slug": "two-sum",
   "difficulty": "Easy",
   "tags": [
    "array",
    "hash-table"
   ]
  },
  {
   "id": 2,
   "lcId": 2,
   "title": "add-two-numbers",
   "slug": "add-two-numbers",
   "difficulty": "Medium",
   "tags": [
    "linked-list",
    "math"
   ]
  },
  {
   "id": 3,
   "lcId": 3,
   "title": "longest-substring-without-repeating-characters",
   "slug": "longest-substring-without-repeating-characters",
   "difficulty": "Medium",
   "tags": [
    "hash-table",
    "string",
    "sliding-window"
   ]
  },
  {
   "id": 4,
   "lcId": 15,
   "title": "3sum",
   "slug": "3sum",
   "difficulty": "Medium",
   "tags": [
    "array",
    "two-pointers",
    "sorting"
   ]
  },
  {
   "id": 5,
   "lcId": 20,
   "title": "valid-parentheses",
   "slug": "valid-parentheses",
   "difficulty": "Easy",
   "tags": [
    "string",
    "stack"
   ]
  },
  {
   "id": 6,
   "lcId": 49,
   "title": "group-anagrams",
   "slug": "group-anagrams",
   "difficulty": "Medium",
   "tags": [
    "hash-table",
    "string",
    "sorting"
   ]
  },
  {
   "id": 7,
   "lcId": 70,
   "title": "climbing-stairs",
   "slug": "climbing-stairs",
   "difficulty": "Easy",
   "tags": [
    "math",
    "dynamic-programming",
    "memoization"
   ]
  },
  {
   "id": 8,
   "lcId": 121,
   "title": "best-time-to-buy-and-sell-stock",
   "slug": "best-time-to-buy-and-sell-stock",
   "difficulty": "Easy",
   "tags": [
    "array",
    "dynamic-programming"
   ]
  },
  {
   "id": 9,
   "lcId": 141,
   "title": "linked-list-cycle",
   "slug": "linked-list-cycle",
   "difficulty": "Easy",
   "tags": [
    "hash-table",
    "linked-list",
    "two-pointers"
   ]
  },
  {
   "id": 10,
   "lcId": 167,
   "title": "two-sum-ii-input-array-is-sorted",
   "slug": "two-sum-ii-input-array-is-sorted",
   "difficulty": "Medium",
   "tags": [
    "array",
    "two-pointers",
    "binary-search"
   ]
  },
  {
   "id": 11,
   "lcId": 198,
   "title": "house-robber",
   "slug": "house-robber",
   "difficulty": "Medium",
   "tags": [
    "array",
    "dynamic-programming"
   ]
  },
  {
   "id": 12,
   "lcId": 206,
   "title": "reverse-linked-list",
   "slug": "reverse-linked-list",
   "difficulty": "Easy",
   "tags": [
    "linked-list",
    "recursion"
   ]
  },
  {
   "id": 13,
   "lcId": 215,
   "title": "kth-largest-element-in-an-array",
   "slug": "kth-largest-element-in-an-array",
   "difficulty": "Medium",
   "tags": [
    "heap",
    "divide-and-conquer",
    "sorting"
   ]
  },
  {
   "id": 14,
   "lcId": 226,
   "title": "invert-binary-tree",
   "slug": "invert-binary-tree",
   "difficulty": "Easy",
   "tags": [
    "tree",
    "depth-first-search",
    "breadth-first-search"
   ]
  },
  {
   "id": 15,
   "lcId": 238,
   "title": "product-of-array-except-self",
   "slug": "product-of-array-except-self",
   "difficulty": "Medium",
   "tags": [
    "array",
    "prefix-sum"
   ]
  },
  {
   "id": 16,
   "lcId": 239,
   "title": "sliding-window-maximum",
   "slug": "sliding-window-maximum",
   "difficulty": "Hard",
   "tags": [
    "sliding-window",
    "heap",
    "monotonic-queue"
   ]
  },
  {
   "id": 17,
   "lcId": 322,
   "title": "coin-change",
   "slug": "coin-change",
   "difficulty": "Medium",
   "tags": [
    "dynamic-programming",
    "breadth-first-search"
   ]
  },
  {
   "id": 18,
   "lcId": 326,
   "title": "power-of-three",
   "slug": "power-of-three",
   "difficulty": "Easy",
   "tags": [
    "math"
   ]
  },
  {
   "id": 19,
   "lcId": 350,
   "title": "two-sum-iv-input-is-a-bst",
   "slug": "two-sum-iv-input-is-a-bst",
   "difficulty": "Easy",
   "tags": [
    "hash-table",
    "two-pointers",
    "tree",
    "depth-first-search"
   ]
  },
  {
   "id": 20,
   "lcId": 424,
   "title": "longest-repeating-character-replacement",
   "slug": "longest-repeating-character-replacement",
   "difficulty": "Medium",
   "tags": [
    "hash-table",
    "string",
    "sliding-window"
   ]
  }
 ]
}
```

## Rubric (canonical)

# Leeter plan quality rubric

**Version:** 1

This rubric defines what a *good* leeter training plan is. It is the single
source of truth for two consumers: the `leeter-plan` skill (quality guidance
for the planning run) and the eval judge (`agent/evals/`) scoring a captured
plan. If you are the planner, treat every dimension as a checklist before you
POST; if you are the judge, score each dimension 1–5 and follow the evidence
rule below.

Payload shapes referenced below are defined in `agent/AGENT_PROTOCOL.md`
(`GET /api/agent/progress`, `GET /api/agent/plans`, `GET /api/agent/problems`,
`GET /api/agent/memory`, `GET /api/agent/sessions`).

## Scoring rules

- Each dimension is scored 1 (bad) to 5 (excellent) — integers only.
- **Evidence rule:** any score ≤ 3 must cite concrete evidence (a digest
  field value, a quoted memory line, a session, a plan item, a server
  response). A low score without evidence is an invalid judgment.
- A missing artifact scores the affected dimensions low, not N/A (e.g. no
  memory PUT is a Memory stewardship failure, not "nothing to judge").

## Dimensions

### 1. Structural validity

The plan POST must be accepted by the server: exact fields only, positive
integer `horizon_days`, non-empty `focus`, every `lc_id` present in the bank,
every `carried_from` an existing plan item id, `based_on` an existing plan id.

| Score | Anchor |
|---|---|
| 1 | POST rejected with 400; payload shows the agent ignored the documented schema |
| 3 | Accepted after one or more 400 retries (schema learned by trial and error) |
| 5 | First POST accepted; schema followed exactly from the protocol |

*Scripted check — server responses are the oracle; no judge needed.*

### 2. Grounding

Every factual claim about the user's state must trace to the digest, memory,
session data, or bank data the planner actually read. The digest is ground
truth: when memory and digest disagree, the digest wins and memory is
reconciled (rewritten), not copied.

| Score | Anchor |
|---|---|
| 1 | Plan asserts states the digest contradicts (e.g. "revisit your weak DP work" when DP is the strongest topic) |
| 3 | Mostly grounded; one or two soft claims without a source |
| 5 | Every targeting claim cites digest numbers, memory threads, or observed sessions |

### 3. Ladder & thread continuity

Three kinds of open work must each be accounted for — carried forward,
re-attempted, or explicitly resolved with a reason in memory:

- **[A] Carried items**: every `carried_unsolved` entry in the digest's
  current plan (`item_id`, `carried_from`, `slug`).
- **[B] Paused/active sessions outside the plan graph**: unfinished sessions
  whose `planItemId` is null are invisible to adherence; find them via
  `GET /api/agent/sessions` (status `paused`/`active`).
- **[C] Memory threads**: open threads the previous run recorded.

`based_on` must chain to the previous plan; continuing items must carry
`carried_from`.

| Score | Anchor |
|---|---|
| 1 | Unfinished work silently dropped (no carry, no memory justification); `based_on` missing |
| 3 | Carried items handled; paused sessions or memory threads ignored |
| 5 | All three kinds addressed — carried, re-attempted, or resolved with a reason; chaining fields correct |

### 4. Targeting & progression

Weak material gets appropriate weight: low-solve-rate topics, zero-attempt
topics, and topics the user has drifted away from. Difficulty must progress
relative to demonstrated mastery (an Easy-heavy history with a 40% solve rate
does not need five more Easy problems). Item count must be plausible for the
horizon (roughly 4–8 items per week, fewer when many are carried).

| Score | Anchor |
|---|---|
| 1 | Comfort-zone repetition (e.g. a fifth Easy attempt at an already-solved pattern) while weak topics go untouched |
| 3 | Weak topics appear, but the spread is arbitrary or the count doesn't fit the horizon |
| 5 | Targeting follows the digest's weak spots with a defensible difficulty gradient and horizon-appropriate item count |

### 5. Coaching integration

Completed reviews carry coaching signals (`recommended_focus`, `weaknesses`,
`overall`). The planner should read recent completed reviews (via
`GET /api/agent/sessions` filtering `reviewRequestStatus: "completed"`, then
`GET /api/agent/sessions/{id}`) and fold their signals into targeting and
item reasons. When reviews exist and none were consulted, this fails; when
none exist, this dimension passes vacuously (score 5, note "no completed
reviews available").

| Score | Anchor |
|---|---|
| 1 | Completed reviews exist, planner shows no trace of them |
| 3 | Reviews read but their signals not reflected in the plan or memory |
| 5 | Review signals visibly shape targeting, item choice, or memory (cited) — or no completed reviews exist (vacuous pass, noted) |

### 6. Plan hygiene

`focus` and `notes` are the user-facing plan statement. They must be concise
and free of process narration: no adherence recaps ("3 of 5 solved, I
checked…"), no history-used lists, no memory dumps (the protocol's
anti-pattern). Markdown allowed; length proportionate to the plan (a few
sentences to a short paragraph).

| Score | Anchor |
|---|---|
| 1 | Focus/notes contain adherence narration, history-used lists, or memory pastes |
| 3 | Mostly clean but padded with process detail |
| 5 | Crisp, user-facing statement of what the ladder is and why |

### 7. Reason quality

Each item's `reason` states why *this* problem *now*: which weakness, ladder
step, or thread it serves. Generic filler ("good practice problem", "classic
must-do") is a failure; evidence-cited specificity is the bar.

| Score | Anchor |
|---|---|
| 1 | Reasons are generic or duplicated across items |
| 3 | Some items reasoned, some filler |
| 5 | Every reason names its evidence (weak topic, carried thread, ladder position, review signal) |

### 8. Memory stewardship

`PUT /api/agent/memory` must record: the decision and its rationale, open
threads (paused sessions, carried items, watch list), and what to check next
run. First-run case (empty memory) must be filled, not skipped. Memory must
not wholesale duplicate the plan text; it is the coaching state that
persists between runs.

| Score | Anchor |
|---|---|
| 1 | No memory PUT, or memory pastes the plan |
| 3 | Memory updated but thin (decision without threads or watch list) |
| 5 | Memory captures rationale, all open threads, and next-run checks — and reconciles stale entries |

### 9. Efficiency / no-op avoidance

Do not POST a plan that is materially identical to the current one without a
re-checked reason (the protocol forbids re-posting unchanged plans without
re-checking adherence). A revision may legitimately keep items, but the
*set* must change when the digest says it should — and must not churn
pointlessly when nothing has changed since the last plan.

| Score | Anchor |
|---|---|
| 1 | Unchanged repost with no re-check, or wholesale churn discarding a working ladder for no reason |
| 3 | Plan differs but the diff is incidental (renames, one gratuitous swap) |
| 5 | Diff is driven by adherence/progress: solved items retired, carried items advanced, new work justified |

## Worked examples

*Reason quality (7):*

```text
Bad:  "classic problem, good practice"
Good: "Solve rate on dynamic-programming is 33% (digest); Climbing Stairs is
       the smallest DP that builds the memoization pattern before
       House Robber — both unpracticed topics this month"
```

*Focus hygiene (6):*

```text
Bad:  "I checked the digest: 3 solved, 1 practiced, 1 not started, and the
       carried item from plan 1 is still unsolved, so I decided to..."
Good: "Two pointers week: finish the carried Three Sum, then windowed
       uniqueness before the mid-month k-sum set."
```

*Ladder continuity (3) — the real-instance failure mode:* a paused session
without `planItemId` does not appear in `carried_unsolved`; only the session
list (or memory) reveals it. A plan that re-posts the ladder without
finishing or re-attempting that session scores 3 here, not 5.


## Your output

Write ONLY a JSON object to agent/evals/runs/20260920-222457/f1-first-run/judge.json (create or
overwrite it), exactly this shape — no other text in the file:

```json
{
  "dimensions": {
    "grounding":        { "score": 1, "evidence": "..." },
    "ladder_continuity":{ "score": 1, "evidence": "..." },
    "targeting":        { "score": 1, "evidence": "..." },
    "coaching":         { "score": 1, "evidence": "..." },
    "hygiene":          { "score": 1, "evidence": "..." },
    "reason_quality":   { "score": 1, "evidence": "..." },
    "memory":           { "score": 1, "evidence": "..." },
    "efficiency":       { "score": 1, "evidence": "..." }
  },
  "notes": "optional overall observations"
}
```

All eight dimensions are required. Vacuous-pass cases (e.g. no completed
reviews exist for the coaching dimension) score 5 with a one-line note in
evidence, per the rubric.
