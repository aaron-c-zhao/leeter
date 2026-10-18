## Why

Preparing for coding interviews currently happens with no durable memory: problems get solved on LeetCode, progress lives only in LC's own history, and there is no structured record of *how* problems were solved, no place for notes, and no external analysis of solving behavior. This change builds an internal webapp ("leeter") deployed on the home lab that records practice sessions, maintains practice history and notes, and exposes a stable HTTP contract so an agent harness (e.g., antigravity running on the workstation) can review solutions and process, and later drive an adaptive study plan.

## What Changes

- Add a **LeetCode problem bank**: problems pulled from leetcode.com via its unofficial GraphQL endpoints using the user's session cookie; LC remains the final judge (solve on leetcode.com, submit there). No sync-back of submissions in v1.
- Add a **session recorder**: a draft pad (in-app editor, no code execution) that captures code snapshots, timing, and notes during a practice session; LC submissions (including failed ones, with code and verdicts) are pulled and stitched into the session log.
- Add a **session log store**: append-only, versioned JSONL session logs in a preagreed schema — this is the stable data contract consumed by agent harnesses.
- Add an **agent-facing HTTP API** secured by a bearer token: agents fetch session logs and problem context, and POST reviews back. Triggered by workstation cron (scheduled) or manual runs.
- Add a **practice history UI**: browse past sessions, notes, reviews, and submission outcomes; plan/skill modeling is explicitly out of scope for v1.

Out of scope for v1 (deferred to a follow-up change): skill model, periodic re-evaluation, and adaptive study plan; writing/submissions back to LeetCode; in-app code execution/judging; browser extension capture.

## Capabilities

### New Capabilities
- `lc-sync`: pulling the problem bank and submission history from leetcode.com (unofficial GraphQL, session-cookie auth), including rate/robustness behavior when LC changes or rejects requests.
- `session-recording`: capturing a practice session — draft pad snapshots, timing events, notes — and stitching in LC submission data to produce a session log.
- `session-logs`: the versioned JSONL session log format and its storage, the contract between the app and any agent harness.
- `agent-api`: the token-authenticated HTTP endpoints agents consume (fetch logs/context, POST reviews), plus the manual "request review" trigger surface.
- `practice-history`: the user-facing history: browsing sessions, notes, LC outcomes, and agent reviews.

### Modified Capabilities

## Impact

- New application codebase (TypeScript end-to-end: web UI + HTTP API), SQLite storage, deployed as a single container on the home lab.
- Depends on leetcode.com's unofficial GraphQL endpoints — inherently fragile; failures must degrade gracefully (stale cached bank, no data loss).
- Depends on a LeetCode session cookie supplied via configuration (secret; must not be committed or logged).
- Agent harness (antigravity or similar) on the workstation gains a dependency on the leeter API URL + token; a scheduled job (cron) and manual trigger both target it.
