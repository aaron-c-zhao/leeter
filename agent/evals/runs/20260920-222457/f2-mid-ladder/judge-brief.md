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
 "fixture": "f2-mid-ladder",
 "checks": [
  {
   "name": "plan_posted",
   "pass": true,
   "detail": "plans: 2 -> 3"
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
   "detail": "based_on=2, previous plan=2"
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
   "detail": "1 carried item(s) carried or resolved"
  },
  {
   "name": "horizon_item_bounds",
   "dimension": 1,
   "pass": true,
   "detail": "6 items for a 14-day horizon"
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
 "fixture": "f2-mid-ladder",
 "plansAfter": [
  {
   "id": 3,
   "createdAt": 1789936210710,
   "horizonDays": 14,
   "basedOn": 2,
   "focus": "A repair block for two pointers and dynamic programming. Close out the carried 3Sum, then lock in the pointer pattern on the sorted two-sum before the next k-sum step. On the DP side, turn your coin-change and house-robber near-misses into clean bottom-up solutions, then bring hash-map work back at the end, aimed at your weakest practiced topic.",
   "notes": "Stay on medium difficulty this round — skip the Easy warm-ups. Suggested cadence: one problem every two to three days. Before coding a DP problem, write the recurrence and the base case by hand; before a two-pointer problem, write down the invariant and where the pointers start and stop.",
   "items": [
    {
     "id": 6,
     "lcId": 15,
     "slug": "3sum",
     "reason": "Carried from plan 2 (item 4). Two pointers is 0/1 in the digest, and the recorded attempt was a Wrong Answer on the sort-based approach — the skeleton is right, the open work is duplicate-skipping and pointer bounds. Closing this carried thread is the first ladder step.",
     "status": "not_started",
     "carriedFrom": 4
    },
    {
     "id": 7,
     "lcId": 167,
     "slug": "two-sum-ii-input-array-is-sorted",
     "reason": "The cleanest two-pointer invariant: both pointers on a sorted array, no dedup complexity. It drills exactly the mechanic 3Sum needs and moves the 0/1 two-pointers topic forward at medium difficulty, so it is a new problem rather than an Easy repeat.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 8,
     "lcId": 322,
     "slug": "coin-change",
     "reason": "Re-attempt of plan 2 item 5: the linked attempt hit Time Limit Exceeded, which points at the search/greedy route instead of the intended DP. Dynamic programming is 33% (1/3, digest) and this is its highest-value step — bottom-up coin DP before any knapsack-style material.",
     "status": "not_started",
     "carriedFrom": 5
    },
    {
     "id": 9,
     "lcId": 198,
     "slug": "house-robber",
     "reason": "Session 5 was a Wrong-Answer DP attempt started outside the plan graph, so adherence never counted it. After the coin-change recurrence, House Robber adds the take-vs-skip state transition; the pair is the core rebuild of the 33% dynamic-programming topic.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 10,
     "lcId": 49,
     "slug": "group-anagrams",
     "reason": "arrays-hashing is the weakest practiced topic at 25% (1/4, digest). Grouping by a canonical key (sorted string or count tuple) is the hash-map pattern that topic is missing, and medium difficulty keeps it off the Easy-repeat path.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 11,
     "lcId": 3,
     "slug": "longest-substring-without-repeating-characters",
     "reason": "Sliding window is unpracticed and compounds the hash-table weakness behind the 25% arrays-hashing rate. A moving window with a last-seen map is the standard medium-grade entry to the family and connects hashing back to string work.",
     "status": "not_started",
     "carriedFrom": null
    }
   ]
  },
  {
   "id": 2,
   "createdAt": 1789732800000,
   "horizonDays": 10,
   "basedOn": 1,
   "focus": "Two pointers week, carrying Three Sum forward.",
   "notes": null,
   "items": [
    {
     "id": 4,
     "lcId": 15,
     "slug": "3sum",
     "reason": "continue from last week",
     "status": "practiced",
     "carriedFrom": 2
    },
    {
     "id": 5,
     "lcId": 322,
     "slug": "coin-change",
     "reason": "new topic",
     "status": "not_started",
     "carriedFrom": null
    }
   ]
  },
  {
   "id": 1,
   "createdAt": 1788696000000,
   "horizonDays": 7,
   "basedOn": null,
   "focus": "Warm-up week: hash maps and two pointers.",
   "notes": null,
   "items": [
    {
     "id": 1,
     "lcId": 1,
     "slug": "two-sum",
     "reason": "start of the ladder",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 2,
     "lcId": 15,
     "slug": "3sum",
     "reason": "two pointers step",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 3,
     "lcId": 20,
     "slug": "valid-parentheses",
     "reason": "stack warm-up",
     "status": "practiced",
     "carriedFrom": null
    }
   ]
  }
 ],
 "memoryVersionsAfter": [
  {
   "body": "# Memory\n\n- **Ladder position:** plan 3 (posted, `based_on` 2, 14-day horizon). Repair block: two pointers + dynamic programming, hash-map work reintroduced last.\n- **Decision & rationale:** carried 3Sum (plan 2 item 4, still `practiced`/unsolved) and re-attempted Coin Change (plan 2 item 5) — both chained via `carried_from`. Added Two Sum II as the two-pointer stepping stone, House Robber as the second DP rung, Group Anagrams for the weak hash-map topic, and Longest Substring for sliding window. Kept everything medium per the user's stated preference (recorded last run); no Easy repeats.\n- **Reconciled:** prior memory asked \"watch whether Coin Change improves\" — answered: it did not. Session 6 (Coin Change) hit Time Limit Exceeded, so the re-attempt targets bottom-up DP, not search.\n- **Open threads (next run):**\n  - 3Sum — carried again (new item 6, `carried_from` 4). Check whether it finally gets an Accepted verdict; two-pointers remains 0/1.\n  - Coin Change — re-attempt (new item 8, `carried_from` 5). Watch for the TLE pattern recurring (sign of skipping memoization/bottom-up).\n  - House Robber — session 5 was a Wrong-Answer DP attempt with `planItemId: null`, invisible to adherence. It is now planned (item 9); confirm it gets linked to a plan item this time.\n  - Group Anagrams / Longest Substring — new hash-map probes; arrays-hashing is the weakest practiced topic (25%, 1/4).\n- **Retired / resolved:** Valid Parentheses (plan 1 item 3) had a finished session with no verdict; not re-added — stack fundamentals are not the current bottleneck. Graph topic shows 0/1 but that is only Coin Change's BFS tag; the bank has no real graph problem, so no graph work is scheduled.\n- **Coaching signals:** no completed reviews exist in this instance (`reviews/pending` empty, all sessions `reviewCount: 0`) — nothing to fold in this run.\n- **Watch next run:** plan 2 adherence was 0 solved / 1 practiced / 1 not started, so engagement is the real risk — if plan 3 shows little activity, shrink the item list rather than raising difficulty. Also re-check DP solve rate (currently 33%) after Coin Change and House Robber.",
   "createdAt": 1789936226068,
   "size": 2154
  },
  {
   "body": "# Memory\n- Carried Three Sum from plan 1 into plan 2; user practiced it once, Wrong Answer on the sort-based approach.\n- dynamic-programming looks weak (1 accepted of 3 attempts); watch whether Coin Change improves.\n- User asked for medium-difficulty steps, not easy repeats.",
   "createdAt": 1789732800000,
   "size": 275
  }
 ],
 "currentMemoryAfter": "# Memory\n\n- **Ladder position:** plan 3 (posted, `based_on` 2, 14-day horizon). Repair block: two pointers + dynamic programming, hash-map work reintroduced last.\n- **Decision & rationale:** carried 3Sum (plan 2 item 4, still `practiced`/unsolved) and re-attempted Coin Change (plan 2 item 5) — both chained via `carried_from`. Added Two Sum II as the two-pointer stepping stone, House Robber as the second DP rung, Group Anagrams for the weak hash-map topic, and Longest Substring for sliding window. Kept everything medium per the user's stated preference (recorded last run); no Easy repeats.\n- **Reconciled:** prior memory asked \"watch whether Coin Change improves\" — answered: it did not. Session 6 (Coin Change) hit Time Limit Exceeded, so the re-attempt targets bottom-up DP, not search.\n- **Open threads (next run):**\n  - 3Sum — carried again (new item 6, `carried_from` 4). Check whether it finally gets an Accepted verdict; two-pointers remains 0/1.\n  - Coin Change — re-attempt (new item 8, `carried_from` 5). Watch for the TLE pattern recurring (sign of skipping memoization/bottom-up).\n  - House Robber — session 5 was a Wrong-Answer DP attempt with `planItemId: null`, invisible to adherence. It is now planned (item 9); confirm it gets linked to a plan item this time.\n  - Group Anagrams / Longest Substring — new hash-map probes; arrays-hashing is the weakest practiced topic (25%, 1/4).\n- **Retired / resolved:** Valid Parentheses (plan 1 item 3) had a finished session with no verdict; not re-added — stack fundamentals are not the current bottleneck. Graph topic shows 0/1 but that is only Coin Change's BFS tag; the bank has no real graph problem, so no graph work is scheduled.\n- **Coaching signals:** no completed reviews exist in this instance (`reviews/pending` empty, all sessions `reviewCount: 0`) — nothing to fold in this run.\n- **Watch next run:** plan 2 adherence was 0 solved / 1 practiced / 1 not started, so engagement is the real risk — if plan 3 shows little activity, shrink the item list rather than raising difficulty. Also re-check DP solve rate (currently 33%) after Coin Change and House Robber."
}
```

## Seeded ground truth (what the planner could know)

```json
{
 "fixture": "f2-mid-ladder",
 "fixtureDescription": "Mid-ladder revision: a carried unsolved item (based_on + carried_from chaining), a weak topic at 33% solve rate, and a partially worked plan.",
 "digest": {
  "totals": {
   "attempts": 6,
   "solved": 2
  },
  "topics": [
   {
    "topic": "arrays-hashing",
    "attempts": 4,
    "solved": 1,
    "solve_rate": 0.25,
    "last_practiced_at": 1789819200000
   },
   {
    "topic": "dynamic-programming",
    "attempts": 3,
    "solved": 1,
    "solve_rate": 0.33,
    "last_practiced_at": 1789646400000
   },
   {
    "topic": "graphs",
    "attempts": 1,
    "solved": 0,
    "solve_rate": 0,
    "last_practiced_at": 1789646400000
   },
   {
    "topic": "math-bit-manipulation",
    "attempts": 1,
    "solved": 1,
    "solve_rate": 1,
    "last_practiced_at": 1789041600000
   },
   {
    "topic": "stack-queue",
    "attempts": 1,
    "solved": 0,
    "solve_rate": 0,
    "last_practiced_at": 1788868800000
   },
   {
    "topic": "two-pointers",
    "attempts": 1,
    "solved": 0,
    "solve_rate": 0,
    "last_practiced_at": 1789819200000
   }
  ],
  "current_plan": {
   "id": 2,
   "created_at": 1789732800000,
   "horizon_days": 10,
   "solved": 0,
   "practiced": 1,
   "not_started": 1,
   "carried_unsolved": [
    {
     "item_id": 4,
     "carried_from": 2,
     "slug": "3sum",
     "status": "practiced"
    }
   ]
  },
  "taxonomy_version": 1
 },
 "sessions": [
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
   "startedAt": 1789819200000,
   "finishedAt": 1789822200000,
   "activeMs": 3000000,
   "status": "finished",
   "outcome": "Wrong Answer",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": 4
  },
  {
   "id": 6,
   "problem": {
    "id": 17,
    "title": "coin-change",
    "slug": "coin-change",
    "difficulty": "Medium",
    "tags": [
     "dynamic-programming",
     "breadth-first-search"
    ]
   },
   "startedAt": 1789646400000,
   "finishedAt": 1789650000000,
   "activeMs": 3300000,
   "status": "finished",
   "outcome": "Time Limit Exceeded",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": null
  },
  {
   "id": 5,
   "problem": {
    "id": 11,
    "title": "house-robber",
    "slug": "house-robber",
    "difficulty": "Medium",
    "tags": [
     "array",
     "dynamic-programming"
    ]
   },
   "startedAt": 1789128000000,
   "finishedAt": 1789130700000,
   "activeMs": 2400000,
   "status": "finished",
   "outcome": "Wrong Answer",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": null
  },
  {
   "id": 4,
   "problem": {
    "id": 7,
    "title": "climbing-stairs",
    "slug": "climbing-stairs",
    "difficulty": "Easy",
    "tags": [
     "math",
     "dynamic-programming",
     "memoization"
    ]
   },
   "startedAt": 1789041600000,
   "finishedAt": 1789043400000,
   "activeMs": 1800000,
   "status": "finished",
   "outcome": "Accepted",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": null
  },
  {
   "id": 2,
   "problem": {
    "id": 5,
    "title": "valid-parentheses",
    "slug": "valid-parentheses",
    "difficulty": "Easy",
    "tags": [
     "string",
     "stack"
    ]
   },
   "startedAt": 1788868800000,
   "finishedAt": 1788871200000,
   "activeMs": 2400000,
   "status": "finished",
   "outcome": null,
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": 3
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
   "startedAt": 1788782400000,
   "finishedAt": 1788786000000,
   "activeMs": 3600000,
   "status": "finished",
   "outcome": "Accepted",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": 1
  }
 ],
 "plans": [
  {
   "id": 2,
   "createdAt": 1789732800000,
   "horizonDays": 10,
   "focusMd": "Two pointers week, carrying Three Sum forward.",
   "notesMd": null,
   "basedOn": 1,
   "items": [
    {
     "id": 4,
     "planId": 2,
     "lcId": 15,
     "slug": "3sum",
     "reasonMd": "continue from last week",
     "status": "practiced",
     "carriedFrom": 2
    },
    {
     "id": 5,
     "planId": 2,
     "lcId": 322,
     "slug": "coin-change",
     "reasonMd": "new topic",
     "status": "not_started",
     "carriedFrom": null
    }
   ]
  },
  {
   "id": 1,
   "createdAt": 1788696000000,
   "horizonDays": 7,
   "focusMd": "Warm-up week: hash maps and two pointers.",
   "notesMd": null,
   "basedOn": null,
   "items": [
    {
     "id": 1,
     "planId": 1,
     "lcId": 1,
     "slug": "two-sum",
     "reasonMd": "start of the ladder",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 2,
     "planId": 1,
     "lcId": 15,
     "slug": "3sum",
     "reasonMd": "two pointers step",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 3,
     "planId": 1,
     "lcId": 20,
     "slug": "valid-parentheses",
     "reasonMd": "stack warm-up",
     "status": "practiced",
     "carriedFrom": null
    }
   ]
  }
 ],
 "memory": {
  "body": "# Memory\n- Carried Three Sum from plan 1 into plan 2; user practiced it once, Wrong Answer on the sort-based approach.\n- dynamic-programming looks weak (1 accepted of 3 attempts); watch whether Coin Change improves.\n- User asked for medium-difficulty steps, not easy repeats.",
  "versionId": 1,
  "updatedAt": 1789732800000
 },
 "memoryVersions": [
  {
   "body": "# Memory\n- Carried Three Sum from plan 1 into plan 2; user practiced it once, Wrong Answer on the sort-based approach.\n- dynamic-programming looks weak (1 accepted of 3 attempts); watch whether Coin Change improves.\n- User asked for medium-difficulty steps, not easy repeats.",
   "createdAt": 1789732800000
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

Write ONLY a JSON object to agent/evals/runs/20260920-222457/f2-mid-ladder/judge.json (create or
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
