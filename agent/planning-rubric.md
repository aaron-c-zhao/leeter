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
