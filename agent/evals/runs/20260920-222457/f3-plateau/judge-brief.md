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
 "fixture": "f3-plateau",
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
   "detail": "8 items for a 14-day horizon"
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
   "detail": "memory versions: 1 -> 2"
  }
 ],
 "passed": 9,
 "total": 9
}
```

## Captured artifacts (what the planner produced)

```json
{
 "fixture": "f3-plateau",
 "plansAfter": [
  {
   "id": 2,
   "createdAt": 1789936420292,
   "horizonDays": 14,
   "basedOn": 1,
   "focus": "**Sliding windows, linked lists, and first DP.** Two weeks of new patterns: variable-width windows over strings, fast/slow pointers through linked lists, and your first recurrence problems — closing with a Hard window capstone.",
   "notes": "Each block ramps inside one family — two window scans, three list problems, two DP problems — so every session adds a single new idea on top of a familiar technique.",
   "items": [
    {
     "id": 5,
     "lcId": 3,
     "slug": "longest-substring-without-repeating-characters",
     "reason": "Two-pointer work is 2/2 (digest), but both solved problems sat on sorted arrays. This is the first variable-width window over a string, testing the pointer discipline without the sorted-array shortcut.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 6,
     "lcId": 424,
     "slug": "longest-repeating-character-replacement",
     "reason": "Second sliding-window step, adding a frequency map and an 'at most k replacements' condition. It reuses the hash-map fluency behind the 4/4 arrays-hashing record while forcing the window to shrink dynamically.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 7,
     "lcId": 206,
     "slug": "reverse-linked-list",
     "reason": "First linked-list problem, deliberately Easy: establishes node and pointer mechanics in a new structure before cycles and carry arithmetic.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 8,
     "lcId": 141,
     "slug": "linked-list-cycle",
     "reason": "Transfers the two-pointer skill (2/2) to linked lists — Floyd's fast/slow pointers are the list analogue of a pattern already owned.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 9,
     "lcId": 2,
     "slug": "add-two-numbers",
     "reason": "Medium list problem pairing traversal with carry bookkeeping; the natural next step after reverse and cycle, adding digit-level state.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 10,
     "lcId": 70,
     "slug": "climbing-stairs",
     "reason": "Entry point to dynamic programming, the largest untouched topic in the bank. Easy and self-contained, it introduces the recurrence-and-memo framing before array-shaped DP.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 11,
     "lcId": 198,
     "slug": "house-robber",
     "reason": "First non-trivial recurrence: state depends on the previous two choices. Directly builds on Climbing Stairs and moves DP onto an array, matching your strongest data structure.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 12,
     "lcId": 239,
     "slug": "sliding-window-maximum",
     "reason": "Capstone stretch — the bank's only Hard, and untouched. A monotonic deque generalizes the earlier window scans, giving a ceiling now that every attempted Easy and Medium has been solved.",
     "status": "not_started",
     "carriedFrom": null
    }
   ]
  },
  {
   "id": 1,
   "createdAt": 1788868800000,
   "horizonDays": 10,
   "basedOn": null,
   "focus": "Arrays and hashing week: the complement map family.",
   "notes": null,
   "items": [
    {
     "id": 1,
     "lcId": 1,
     "slug": "two-sum",
     "reason": "complement map",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 2,
     "lcId": 49,
     "slug": "group-anagrams",
     "reason": "hash map on strings",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 3,
     "lcId": 15,
     "slug": "3sum",
     "reason": "two pointers",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 4,
     "lcId": 167,
     "slug": "two-sum-ii-input-array-is-sorted",
     "reason": "sorted variant",
     "status": "solved",
     "carriedFrom": null
    }
   ]
  }
 ],
 "memoryVersionsAfter": [
  {
   "body": "# Memory\n\n## Position\n- Plan 1 (arrays-hashing complement map, 10d, 4 items) is complete: digest shows solved=4, practiced=0, not_started=0, carried_unsolved=[].\n- Advanced to plan 2 (14d, 8 items, based_on=1): sliding window -> linked list -> first DP, with the bank's only Hard as a window capstone.\n\n## Why this block\n- Every practiced topic is at 100%: arrays-hashing 4/4, two-pointers 2/2, binary-search 1/1 (digest). Nothing to remediate, so targeting = untouched families + one difficulty step up, not more repetition of solved patterns.\n- Difficulty gradient: first exposure to linked lists is Easy (206, 141), then Medium (2); DP starts Easy (70) then Medium (198); the lone Hard (239) is a deliberate end-of-block stretch.\n- Pace check: plan 1 created 1788868800000, last session 1789473600000 -> 4 items in 7 days (~4/week). 8 items / 14 days matches that demonstrated pace; previous 10d/4-item plan was light relative to the user's throughput.\n\n## Open threads\n- No carries: all plan-1 items solved, so they are retired rather than carried (no carried_from in plan 2).\n- No paused/active sessions and none with planItemId=null; nothing outside the plan graph.\n- No completed reviews exist (all sessions reviewRequestStatus=null, reviewCount=0; pending queue empty) -> coaching dimension passes vacuously this cycle.\n- Reconcile: previous memory said \"keep building the same ladder\"; the digest contradicts it (ladder fully solved), so this version supersedes that instruction.\n\n## Next-run checks\n- Digest adherence on plan 2: any carried_unsolved, and solve_rate on sliding-window / linked-list / dynamic-programming topics.\n- Watch for the first completed reviews; if any appear, fold recommended_focus and weaknesses into plan 3 targeting.\n- Watch for the first linked-list session (206/141) for pointer bugs or copy-out-before-submit patterns; and whether 239 (Hard) is attempted and how it lands.\n- Bank still untouched for future blocks: stacks (20), trees (226, 19), heap (215), prefix-sum (238), plus coin-change (322) and best-time-to-buy-and-sell-stock (121) for DP follow-ups.",
   "createdAt": 1789936433103,
   "size": 2099
  },
  {
   "body": "# Memory\n- Plan going well; all items solved.\n- Keep building the same ladder next week.",
   "createdAt": 1789560000000,
   "size": 88
  }
 ],
 "currentMemoryAfter": "# Memory\n\n## Position\n- Plan 1 (arrays-hashing complement map, 10d, 4 items) is complete: digest shows solved=4, practiced=0, not_started=0, carried_unsolved=[].\n- Advanced to plan 2 (14d, 8 items, based_on=1): sliding window -> linked list -> first DP, with the bank's only Hard as a window capstone.\n\n## Why this block\n- Every practiced topic is at 100%: arrays-hashing 4/4, two-pointers 2/2, binary-search 1/1 (digest). Nothing to remediate, so targeting = untouched families + one difficulty step up, not more repetition of solved patterns.\n- Difficulty gradient: first exposure to linked lists is Easy (206, 141), then Medium (2); DP starts Easy (70) then Medium (198); the lone Hard (239) is a deliberate end-of-block stretch.\n- Pace check: plan 1 created 1788868800000, last session 1789473600000 -> 4 items in 7 days (~4/week). 8 items / 14 days matches that demonstrated pace; previous 10d/4-item plan was light relative to the user's throughput.\n\n## Open threads\n- No carries: all plan-1 items solved, so they are retired rather than carried (no carried_from in plan 2).\n- No paused/active sessions and none with planItemId=null; nothing outside the plan graph.\n- No completed reviews exist (all sessions reviewRequestStatus=null, reviewCount=0; pending queue empty) -> coaching dimension passes vacuously this cycle.\n- Reconcile: previous memory said \"keep building the same ladder\"; the digest contradicts it (ladder fully solved), so this version supersedes that instruction.\n\n## Next-run checks\n- Digest adherence on plan 2: any carried_unsolved, and solve_rate on sliding-window / linked-list / dynamic-programming topics.\n- Watch for the first completed reviews; if any appear, fold recommended_focus and weaknesses into plan 3 targeting.\n- Watch for the first linked-list session (206/141) for pointer bugs or copy-out-before-submit patterns; and whether 239 (Hard) is attempted and how it lands.\n- Bank still untouched for future blocks: stacks (20), trees (226, 19), heap (215), prefix-sum (238), plus coin-change (322) and best-time-to-buy-and-sell-stock (121) for DP follow-ups."
}
```

## Seeded ground truth (what the planner could know)

```json
{
 "fixture": "f3-plateau",
 "fixtureDescription": "Plateau: the current plan is fully solved, no carried items, and coverage is flat (one topic group repeated). The planner must target untouched material and avoid re-posting an unchanged plan.",
 "digest": {
  "totals": {
   "attempts": 4,
   "solved": 4
  },
  "topics": [
   {
    "topic": "arrays-hashing",
    "attempts": 4,
    "solved": 4,
    "solve_rate": 1,
    "last_practiced_at": 1789473600000
   },
   {
    "topic": "two-pointers",
    "attempts": 2,
    "solved": 2,
    "solve_rate": 1,
    "last_practiced_at": 1789473600000
   },
   {
    "topic": "binary-search",
    "attempts": 1,
    "solved": 1,
    "solve_rate": 1,
    "last_practiced_at": 1789473600000
   }
  ],
  "current_plan": {
   "id": 1,
   "created_at": 1788868800000,
   "horizon_days": 10,
   "solved": 4,
   "practiced": 0,
   "not_started": 0,
   "carried_unsolved": []
  },
  "taxonomy_version": 1
 },
 "sessions": [
  {
   "id": 4,
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
   "startedAt": 1789473600000,
   "finishedAt": 1789476000000,
   "activeMs": 2100000,
   "status": "finished",
   "outcome": "Accepted",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": 4
  },
  {
   "id": 3,
   "problem": {
    "id": 4,
    "title": "3sum",
    "slug": "3sum",
    "difficulty": "Medium",
    "tags": [
     "array",
     "two-pointers",
     "sorting"
    ]
   },
   "startedAt": 1789300800000,
   "finishedAt": 1789303200000,
   "activeMs": 2100000,
   "status": "finished",
   "outcome": "Accepted",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": 3
  },
  {
   "id": 2,
   "problem": {
    "id": 6,
    "title": "group-anagrams",
    "slug": "group-anagrams",
    "difficulty": "Medium",
    "tags": [
     "hash-table",
     "string",
     "sorting"
    ]
   },
   "startedAt": 1789128000000,
   "finishedAt": 1789130400000,
   "activeMs": 2100000,
   "status": "finished",
   "outcome": "Accepted",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": 2
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
   "startedAt": 1788955200000,
   "finishedAt": 1788957600000,
   "activeMs": 2100000,
   "status": "finished",
   "outcome": "Accepted",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": 1
  }
 ],
 "plans": [
  {
   "id": 1,
   "createdAt": 1788868800000,
   "horizonDays": 10,
   "focusMd": "Arrays and hashing week: the complement map family.",
   "notesMd": null,
   "basedOn": null,
   "items": [
    {
     "id": 1,
     "planId": 1,
     "lcId": 1,
     "slug": "two-sum",
     "reasonMd": "complement map",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 2,
     "planId": 1,
     "lcId": 49,
     "slug": "group-anagrams",
     "reasonMd": "hash map on strings",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 3,
     "planId": 1,
     "lcId": 15,
     "slug": "3sum",
     "reasonMd": "two pointers",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 4,
     "planId": 1,
     "lcId": 167,
     "slug": "two-sum-ii-input-array-is-sorted",
     "reasonMd": "sorted variant",
     "status": "solved",
     "carriedFrom": null
    }
   ]
  }
 ],
 "memory": {
  "body": "# Memory\n- Plan going well; all items solved.\n- Keep building the same ladder next week.",
  "versionId": 1,
  "updatedAt": 1789560000000
 },
 "memoryVersions": [
  {
   "body": "# Memory\n- Plan going well; all items solved.\n- Keep building the same ladder next week.",
   "createdAt": 1789560000000
  }
 ],
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

Write ONLY a JSON object to agent/evals/runs/20260920-222457/f3-plateau/judge.json (create or
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
