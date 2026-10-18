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
 "fixture": "f4-stale-memory",
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
   "detail": "9 items for a 14-day horizon"
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
 "fixture": "f4-stale-memory",
 "plansAfter": [
  {
   "id": 2,
   "createdAt": 1789936579727,
   "horizonDays": 14,
   "basedOn": 1,
   "focus": "## Two-pointer & window breadth\n\nMove beyond 1-D DP into the patterns that unlock most array and string problems. The block opens with **converging two pointers** (a sorted-array warm-up, then 3Sum), then **variable sliding windows** (uniqueness, then a frequency budget). It closes with a first pass at **linked-list pointer manipulation**, one step up in DP (unbounded knapsack), and a single stack rep to keep a second structure moving.",
   "notes": "Each pair ramps: the first problem isolates the pattern, the second adds a twist (dedup for 3Sum, a frequency budget for the window). Aim for about one problem a day — the 14-day horizon leaves room to split a harder one across two sittings.",
   "items": [
    {
     "id": 3,
     "lcId": 167,
     "slug": "two-sum-ii-input-array-is-sorted",
     "reason": "Two pointers is an untouched topic in the digest (no attempts under two-pointers). This sorted-array variant isolates the converging-pointer scan that 3Sum builds on, making it the clean first step of the block.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 4,
     "lcId": 15,
     "slug": "3sum",
     "reason": "Memory v1 flagged a paused Three Sum draft, but the session list shows no paused or active session, so the thread is re-queued here as fresh work. Step 2 of two pointers: fix one index, then run the converging scan with deduplication.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 5,
     "lcId": 3,
     "slug": "longest-substring-without-repeating-characters",
     "reason": "sliding-window has zero attempts in the digest. This is the minimal variable-size window (grow right, shrink on a repeat) and sets up the frequency-budget version next.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 6,
     "lcId": 424,
     "slug": "longest-repeating-character-replacement",
     "reason": "Progression inside the sliding-window pattern: from tracking uniqueness to maintaining a frequency budget with the max-count trick. Same pattern, harder invariant, still Medium — a safe next step given 100% on the two DP items but a thin overall sample (2 sessions).",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 7,
     "lcId": 206,
     "slug": "reverse-linked-list",
     "reason": "linked-list has zero attempts in the digest. Iterative pointer reversal is the base manipulation every linked-list problem reuses (prev/cur/next and dummy heads).",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 8,
     "lcId": 141,
     "slug": "linked-list-cycle",
     "reason": "Bridges this block's two-pointer intuition to linked lists via Floyd's tortoise-and-hare, reusing the converging-pointer idea already introduced in two-sum-ii and 3Sum.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 9,
     "lcId": 2,
     "slug": "add-two-numbers",
     "reason": "Linked-list traversal with carry and a dummy head at Medium, reusing reverse-linked-list's pointer mechanics in a different shape. Slope within the linked-list step: Easy (206) to Easy (141) to Medium traversal.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 10,
     "lcId": 20,
     "slug": "valid-parentheses",
     "reason": "stack is a zero-attempt topic; this is the canonical push/pop problem and a short confidence rep between the Medium items.",
     "status": "not_started",
     "carriedFrom": null
    },
    {
     "id": 11,
     "lcId": 322,
     "slug": "coin-change",
     "reason": "DP is the strongest topic in the digest (2/2, 100%), so the ladder should not abandon it. This advances from house-robber's 1-D take/skip recurrence to unbounded-knapsack DP — a real step up rather than a repeat of solved work.",
     "status": "not_started",
     "carriedFrom": null
    }
   ]
  },
  {
   "id": 1,
   "createdAt": 1789041600000,
   "horizonDays": 8,
   "basedOn": null,
   "focus": "Dynamic programming week.",
   "notes": null,
   "items": [
    {
     "id": 1,
     "lcId": 70,
     "slug": "climbing-stairs",
     "reason": "DP entry point",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 2,
     "lcId": 198,
     "slug": "house-robber",
     "reason": "1-D DP",
     "status": "solved",
     "carriedFrom": null
    }
   ]
  }
 ],
 "memoryVersionsAfter": [
  {
   "body": "# Memory\n\n## Ladder position (plan 2, current)\nPlan 2 (\"Two-pointer & window breadth\", 14 days) revises plan 1. Both plan-1 items\nare **solved**, so nothing is carried and no `carried_from` links exist:\n- climbing-stairs (item 1) — solved, retired.\n- house-robber (item 2) — solved, retired.\n\n## Decision and rationale\n- **DP is no longer weak — memory v1 was stale and is corrected here.** Digest\n  shows dynamic-programming at 2 attempts / 2 solved / 100%. The prior note\n  \"dynamic-programming still weak; keep the ladder there\" contradicted the\n  digest, so the digest wins. Instead of repeating solved DP, plan 2 advances\n  the DP thread with one harder step (coin-change, unbounded knapsack) and\n  spends the rest of the block on genuinely untouched topics.\n- Targeting is driven by **zero-attempt topics** in the digest: two-pointers,\n  sliding-window, linked-list, stack. Items are grouped in pattern pairs with a\n  difficulty ramp (two-sum-ii → 3sum; longest-substring → 424;\n  reverse-linked-list → linked-list-cycle → add-two-numbers).\n- Item count: 9 items over 14 days, consistent with the user's one-problem-a-day\n  preference and the thin sample (2 sessions; 100% solve rate is not yet robust).\n- No completed reviews exist (`review_status=completed` returned empty), so\n  coaching was integrated vacuously; no pending reviews either.\n\n## Open threads / watch list\n- **3sum re-queued as fresh work (item 4).** Memory v1 claimed a Three Sum\n  session was paused mid-draft, but `GET /api/agent/sessions?status=paused` and\n  `?status=active` both returned `[]`, and the full session list has only two\n  finished sessions (both plan-1). The paused-session thread is therefore\n  resolved as not present; 3sum stays scheduled because two-pointers is\n  untouched, not because of a recoverable session.\n- Watch whether the pattern pairs get attempted; if 3sum stalls, two-sum-ii\n  should be treated as the prerequisite, not a parallel item.\n- Watch first-attempt outcomes under two-pointers / sliding-window / linked-list\n  — this is the first time these topics are exercised, so solve rate here is the\n  real signal (not the current 100% on easier material).\n- Keep the one-problem-per-day preference.\n- No review requests have ever been created on these sessions; if that changes,\n  read the completed reviews next run before re-targeting.\n\n## Next run checks\n1. Re-read the digest; do not trust this notebook over it.\n2. Retire solved items and carry genuinely unfinished ones with `carried_from`.\n3. Check for paused/active sessions outside the plan graph before assuming none.\n4. Re-check whether any completed reviews now exist and fold in\n   `recommended_focus` / `weaknesses`.",
   "createdAt": 1789936591557,
   "size": 2707
  },
  {
   "body": "# Memory\n- Open thread: the Three Sum session is paused mid-draft — resume it first.\n- dynamic-programming still weak; keep the ladder there.\n- User prefers one problem per day.",
   "createdAt": 1789732800000,
   "size": 179
  }
 ],
 "currentMemoryAfter": "# Memory\n\n## Ladder position (plan 2, current)\nPlan 2 (\"Two-pointer & window breadth\", 14 days) revises plan 1. Both plan-1 items\nare **solved**, so nothing is carried and no `carried_from` links exist:\n- climbing-stairs (item 1) — solved, retired.\n- house-robber (item 2) — solved, retired.\n\n## Decision and rationale\n- **DP is no longer weak — memory v1 was stale and is corrected here.** Digest\n  shows dynamic-programming at 2 attempts / 2 solved / 100%. The prior note\n  \"dynamic-programming still weak; keep the ladder there\" contradicted the\n  digest, so the digest wins. Instead of repeating solved DP, plan 2 advances\n  the DP thread with one harder step (coin-change, unbounded knapsack) and\n  spends the rest of the block on genuinely untouched topics.\n- Targeting is driven by **zero-attempt topics** in the digest: two-pointers,\n  sliding-window, linked-list, stack. Items are grouped in pattern pairs with a\n  difficulty ramp (two-sum-ii → 3sum; longest-substring → 424;\n  reverse-linked-list → linked-list-cycle → add-two-numbers).\n- Item count: 9 items over 14 days, consistent with the user's one-problem-a-day\n  preference and the thin sample (2 sessions; 100% solve rate is not yet robust).\n- No completed reviews exist (`review_status=completed` returned empty), so\n  coaching was integrated vacuously; no pending reviews either.\n\n## Open threads / watch list\n- **3sum re-queued as fresh work (item 4).** Memory v1 claimed a Three Sum\n  session was paused mid-draft, but `GET /api/agent/sessions?status=paused` and\n  `?status=active` both returned `[]`, and the full session list has only two\n  finished sessions (both plan-1). The paused-session thread is therefore\n  resolved as not present; 3sum stays scheduled because two-pointers is\n  untouched, not because of a recoverable session.\n- Watch whether the pattern pairs get attempted; if 3sum stalls, two-sum-ii\n  should be treated as the prerequisite, not a parallel item.\n- Watch first-attempt outcomes under two-pointers / sliding-window / linked-list\n  — this is the first time these topics are exercised, so solve rate here is the\n  real signal (not the current 100% on easier material).\n- Keep the one-problem-per-day preference.\n- No review requests have ever been created on these sessions; if that changes,\n  read the completed reviews next run before re-targeting.\n\n## Next run checks\n1. Re-read the digest; do not trust this notebook over it.\n2. Retire solved items and carry genuinely unfinished ones with `carried_from`.\n3. Check for paused/active sessions outside the plan graph before assuming none.\n4. Re-check whether any completed reviews now exist and fold in\n   `recommended_focus` / `weaknesses`."
}
```

## Seeded ground truth (what the planner could know)

```json
{
 "fixture": "f4-stale-memory",
 "fixtureDescription": "Stale memory: the notebook claims an open thread (a paused session) and a DP weakness that the ground truth shows resolved. The planner must reconcile memory with the digest, not copy it.",
 "digest": {
  "totals": {
   "attempts": 2,
   "solved": 2
  },
  "topics": [
   {
    "topic": "dynamic-programming",
    "attempts": 2,
    "solved": 2,
    "solve_rate": 1,
    "last_practiced_at": 1789300800000
   },
   {
    "topic": "arrays-hashing",
    "attempts": 1,
    "solved": 1,
    "solve_rate": 1,
    "last_practiced_at": 1789300800000
   },
   {
    "topic": "math-bit-manipulation",
    "attempts": 1,
    "solved": 1,
    "solve_rate": 1,
    "last_practiced_at": 1789128000000
   }
  ],
  "current_plan": {
   "id": 1,
   "created_at": 1789041600000,
   "horizon_days": 8,
   "solved": 2,
   "practiced": 0,
   "not_started": 0,
   "carried_unsolved": []
  },
  "taxonomy_version": 1
 },
 "sessions": [
  {
   "id": 2,
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
   "startedAt": 1789300800000,
   "finishedAt": 1789302900000,
   "activeMs": 1800000,
   "status": "finished",
   "outcome": "Accepted",
   "reviewRequestStatus": null,
   "reviewCount": 0,
   "planItemId": 2
  },
  {
   "id": 1,
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
   "startedAt": 1789128000000,
   "finishedAt": 1789129800000,
   "activeMs": 1500000,
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
   "createdAt": 1789041600000,
   "horizonDays": 8,
   "focusMd": "Dynamic programming week.",
   "notesMd": null,
   "basedOn": null,
   "items": [
    {
     "id": 1,
     "planId": 1,
     "lcId": 70,
     "slug": "climbing-stairs",
     "reasonMd": "DP entry point",
     "status": "solved",
     "carriedFrom": null
    },
    {
     "id": 2,
     "planId": 1,
     "lcId": 198,
     "slug": "house-robber",
     "reasonMd": "1-D DP",
     "status": "solved",
     "carriedFrom": null
    }
   ]
  }
 ],
 "memory": {
  "body": "# Memory\n- Open thread: the Three Sum session is paused mid-draft — resume it first.\n- dynamic-programming still weak; keep the ladder there.\n- User prefers one problem per day.",
  "versionId": 1,
  "updatedAt": 1789732800000
 },
 "memoryVersions": [
  {
   "body": "# Memory\n- Open thread: the Three Sum session is paused mid-draft — resume it first.\n- dynamic-programming still weak; keep the ladder there.\n- User prefers one problem per day.",
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

Write ONLY a JSON object to agent/evals/runs/20260920-222457/f4-stale-memory/judge.json (create or
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
