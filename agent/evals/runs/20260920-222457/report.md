# Planning eval report

- Run root: `agent/evals/runs/20260920-222457`
- Rubric version: 1
- Rubric + skill fingerprint: b188161f40c0

## f1-first-run

**Scripted checks:** 9/9 passed.
- pass `plan_posted`: plans: 1 -> 2

**Judge scores:**

| dimension | score | evidence |
|---|---|---|
| grounding | 5 | Every targeting claim traces to digest/session data: items cite `two-pointers 1/0`, `sliding-window 1/0`, `binary-search 1/0`, `arrays-hashi |
| ladder_continuity | 5 | based_on=1 and carried_from 1,2,3,4 all resolve to plan-1 items. Digest `carried_unsolved` is empty (plan 1 is root), but the out-of-graph p |
| targeting | 5 | Targets the three zero-solve threads: two-pointers 0/1 -> 167/15/141, sliding-window 0/1 -> 3/424, binary-search 0/1 via 167. Keeps one hash |
| coaching | 5 | Completed reviews 1 & 2 ('Notes were thin'; recommendedFocus: leave a key-insight note and submit on LeetCode + re-sync) are visibly folded  |
| hygiene | 5 | focus is a crisp user-facing block statement ('Two-pointer & sliding-window block. Finish the sorted Two Sum ...'); notes is a single practi |
| reason_quality | 5 | Each reason names its evidence: item 6 (open session + two-pointers 1/0 + binary-search 1/0), item 7 (paused 40-min session), item 8 (two-po |
| memory | 5 | PUT recorded decision + rationale ('Why this revision'), all open threads (active session 8, paused session 3, review signal, no pending req |
| efficiency | 5 | Scripted not_a_noop passed. Diff is adherence-driven: plan-1 item 5 (lc350) retired with a reason, four untouched/bridged items carried with |

Judge notes: Strong run: all scripted checks pass (9/9), based_on chains to plan 1, out-of-graph paused session 3 and active session 8 are both addressed, and review coaching signals reach both the plan notes and memory. All eight judged dimensions meet the 5 anchors.

## f2-mid-ladder

**Scripted checks:** 9/9 passed.
- pass `plan_posted`: plans: 2 -> 3

**Judge scores:**

| dimension | score | evidence |
|---|---|---|
| grounding | 5 | Every targeting claim traces to source: 'two pointers is 0/1 in the digest' matches digest two-pointers (1 attempt / 0 solved); 'recorded at |
| ladder_continuity | 5 | All three kinds addressed. [A] digest carried_unsolved item 4 (3sum, practiced) carried to new item 6 with carriedFrom 4. [B] off-graph sess |
| targeting | 5 | Covers the digest's weak spots with a gradient: two-pointers 0/1 (carried 3Sum + Two Sum II stepping stone), dynamic-programming 33% (Coin C |
| coaching | 5 | No completed reviews exist in this instance — every session shows reviewCount 0 and reviewRequestStatus null, and memory notes 'reviews/pend |
| hygiene | 5 | focus is a crisp user-facing statement of the repair block and its order; notes gives cadence and study tactics. No adherence recaps, histor |
| reason_quality | 5 | Every item reason names its evidence and why-now: item 6 cites the carried thread, two-pointers 0/1, and the WA; item 7 justifies the two-po |
| memory | 5 | Memory PUT recorded decision/rationale, open threads (3Sum carried, Coin Change re-attempt, House Robber plan-item linkage, hash-map probes) |
| efficiency | 5 | Diff is progress-driven: carried 3Sum advanced, Coin Change re-attempted, four new items each justified by digest weakness, and retired item |

Judge notes: Strong mid-ladder revision: fully grounded in the digest and session list, handles the two invisible off-graph sessions, reconciles the stale memory thread, and is hygiene-clean. All scripted checks passed; all eight judged dimensions score at the top anchor. Coaching passes vacuously because no completed reviews exist.

## f3-plateau

**Scripted checks:** 9/9 passed.
- pass `plan_posted`: plans: 1 -> 2

**Judge scores:**

| dimension | score | evidence |
|---|---|---|
| grounding | 5 | Every targeting claim cites read data: item 5 cites two-pointers 2/2 (digest) and observes both solved items sat on sorted arrays (sessions  |
| ladder_continuity | 5 | All three open-work kinds accounted for: [A] digest carried_unsolved=[] so no carry needed, and memory states 'No carries: all plan-1 items  |
| targeting | 5 | Digest is a plateau (solved=4, practiced=0, not_started=0; every topic 100%), so the planner pivots to untouched families: sliding window (3 |
| coaching | 5 | No completed reviews available (all sessions reviewRequestStatus=null, reviewCount=0; pending queue empty), so this dimension passes vacuous |
| hygiene | 5 | focus and notes are crisp user-facing statements with no process narration: focus 'Sliding windows, linked lists, and first DP. Two weeks of |
| reason_quality | 5 | Every reason names its evidence and ladder position: item 5 cites '2/2 (digest)' plus the sorted-array gap; item 8 'Transfers the two-pointe |
| memory | 5 | Memory PUT recorded (version 1 -> 2, scripted check memory_updated pass) with rationale ('Why this block' including the pace derivation), op |
| efficiency | 5 | Diff is driven by adherence: all four plan-1 items are solved so they are retired, and the plan posts genuinely new, justified work rather t |

Judge notes: Clean plateau response: with the prior plan fully solved and coverage flat, the planner retired the solved ladder and opened three untouched families with a defensible Easy->Medium->Hard gradient, then reconciled the stale 'keep building the same ladder' memory against the digest. All nine scripted checks pass; no dimension warranted a deduction.

## f4-stale-memory

**Scripted checks:** 9/9 passed.
- pass `plan_posted`: plans: 1 -> 2

**Judge scores:**

| dimension | score | evidence |
|---|---|---|
| grounding | 5 | Plan explicitly reconciles stale memory against the digest: memory v2 records 'DP is no longer weak — memory v1 was stale and is corrected h |
| ladder_continuity | 5 | All three kinds of open work addressed. [A] digest carried_unsolved=[] and both plan-1 items are solved; retired in memory with 'nothing is  |
| targeting | 5 | Targets the digest's weak spots — the four zero-attempt topics two-pointers, sliding-window, linked-list, stack — grouped as pattern pairs w |
| coaching | 5 | No completed reviews exist: both ground-truth sessions have reviewRequestStatus=null and reviewCount=0, and memory notes 'review_status=comp |
| hygiene | 5 | focus and notes are crisp, user-facing statements of the block and its ramp ('Two-pointer & window breadth', with notes explaining each pair |
| reason_quality | 5 | Every item's reason names its evidence: digest zero-attempt topics (items 3, 5, 7, 10), ladder/pattern progression (items 6, 8, 9, e.g. item |
| memory | 5 | Memory v2 captures the decision and rationale (prior 'dynamic-programming still weak' note contradicted the digest, so the digest wins), all |
| efficiency | 5 | Diff is driven by progress: both solved plan-1 items are retired, no unwarranted carried links, and the new set is justified from digest zer |

Judge notes: Well-executed run for a stale-memory fixture: the planner consistently let the digest override memory, retired solved items, resolved the phantom paused-session thread with an explicit check and reason, and re-derived targeting from zero-attempt topics. All scripted checks pass; no dimension warranted a deduction.

## Aggregate

| dimension | avg | fixtures scored |
|---|---|---|
| grounding | 5.00 | 4 |
| ladder_continuity | 5.00 | 4 |
| targeting | 5.00 | 4 |
| coaching | 5.00 | 4 |
| hygiene | 5.00 | 4 |
| reason_quality | 5.00 | 4 |
| memory | 5.00 | 4 |
| efficiency | 5.00 | 4 |

**Weakest dimension:** grounding (avg 5.00 over 4 fixtures) — first prompt-iteration target.

Cells scored: 32/32.
