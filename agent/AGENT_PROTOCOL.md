# leeter agent protocol — session log schema v1 + HTTP API

This document is written to be pasted directly into an agent prompt (harness
system prompt or task briefing). An agent given only this document and the
connection settings (`LEETER_URL`, `LEETER_TOKEN`) can discover work, fetch a
session, submit a review, and propose a training plan.

---

## Connection

- Base URL: `$LEETER_URL` (example: `http://leeter.home.lan:8080`)
- Auth: every `/api/agent/*` request needs `Authorization: Bearer $LEETER_TOKEN`.
  Missing or wrong token → HTTP 401 with no data.
- All request and response bodies are JSON unless noted otherwise.

---

## Workflow overview

1. `GET /api/agent/reviews/pending` — see what needs reviewing.
2. `POST /api/agent/reviews/requests/{requestId}/claim` — mark a request
   in-progress so other runs skip it.
3. `GET /api/agent/sessions/{sessionId}` — fetch everything needed for the
   review in one call (session metadata, notes, problem description, and the
   raw session `log`).
4. Analyze the session (see "Session log format" below).
5. `POST /api/agent/sessions/{sessionId}/reviews` — submit the structured
   review. Posting a review automatically completes its pending request.
   (Alternatively `POST /api/agent/reviews/requests/{requestId}/complete`
   marks a request completed without a review.)

### Planning workflow (training plans)

Plans are free-running: there is no claim/queue mechanism for plans. An
agent simply POSTs a plan on its normal cron cadence, and the newest plan
becomes the "current" plan the user sees on their dashboard (older plans
remain as readable history).

Each planning run is a *revision* of the previous plan, not a fresh guess.
Run this loop every time:

1. **Read the progress digest.** `GET /api/agent/progress` — the server
   computes, in one call: per-topic practice aggregates (attempts, solved,
   solve rate, last practiced) and adherence rollups for the current plan
   (solved / practiced / not-started counts, plus `carried_unsolved` items).
   This is the objective ground truth. Use it instead of cross-referencing
   sessions yourself; only call `GET /api/agent/sessions?problem_id={id}` if
   you need per-session detail the digest does not cover.
2. **Read your memory.** `GET /api/agent/memory` — your own notebook from the
   previous run: ladder position, open threads (e.g. a paused session to
   finish), weak spots, and process notes for this cycle.
3. **Post the revised plan.** `POST /api/agent/plans` — declare `based_on`
   (the previous plan's id) and carry unfinished items forward with
   `carried_from` (the previous item's id) when they should stay on the
   ladder. Discover candidate problems from the bank:
   `GET /api/agent/problems` (cached, no sync). Never re-post an unchanged
   plan without re-checking adherence.
4. **Update your memory.** `PUT /api/agent/memory` — record what you decided
   and why: current ladder position, open threads, what you are watching for
   next run. Your memory is your long-term coaching state; every PUT creates
   a new version (the history is auditable via
   `GET /api/agent/memory/versions`).

**Anti-pattern:** do not narrate adherence checks, history-used lists, or
process notes inside plan `focus` or `notes`. Those fields are the
user-facing plan statement shown on the dashboard. The same content belongs
in your memory notebook, where it persists across runs instead of being
re-pasted into every plan.

**Planning prompt & quality standard:** run planning cycles with the
`leeter-plan` skill (`agent/skills/leeter-plan/SKILL.md`) — it expands
this loop into concrete steps (paused-session discovery outside the plan
graph, completed-review coaching reads, rubric self-checks). Plan quality is
defined by [`agent/planning-rubric.md`](agent/planning-rubric.md): nine
dimensions with anchors, used both as planner guidance and as the judge
rubric for `agent/evals/run.sh` (the eval loop that scores a planning run
and names the next prompt-iteration target).

---

## Endpoints

### Field naming conventions

Plan and problem endpoints use **snake_case** (`horizon_days`, `lc_id`,
`created_at`). Session endpoints use **camelCase** (`startedAt`,
`reviewRequestStatus`) — including `planItemId` on the session list, so do
not be surprised by the mixed convention when joining plan items to
sessions.

### GET /api/agent/reviews/pending

Returns an array (possibly empty) of pending review requests:

```json
[
  {
    "requestId": 1,
    "sessionId": 3,
    "status": "pending",            // or "in_progress"
    "requestedAt": 1789072754625,
    "problem": {
      "id": 1, "title": "Two Sum", "slug": "two-sum",
      "difficulty": "Easy", "tags": ["array", "hash-table"]
    },
    "sessionStartedAt": 1789072121312,
    "sessionFinishedAt": 1789072125738
  }
]
```

### POST /api/agent/reviews/requests/{requestId}/claim

Marks the request `in_progress`. Returns `{"ok": true}`.
HTTP 409 if the request is already completed or cancelled.

### POST /api/agent/reviews/requests/{requestId}/complete

Marks the request `completed`. Returns `{"ok": true}`. HTTP 409 as above.

### GET /api/agent/sessions/{sessionId}

Returns:

```json
{
  "session": {
    "id": 3,
    "startedAt": 1789072121312,
    "finishedAt": 1789072125738,
    "activeMs": 2417,
    "status": "finished",
    "reviewRequestStatus": "pending",
    "notes": "markdown notes from the user",
    "reviews": [ { "observations": "...", "strengths": "...",
                   "weaknesses": "...", "recommendedFocus": "...",
                   "overall": null, "createdAt": 1789072754625, "id": 1 } ]
  },
  "problem": {
    "lcId": 1, "title": "Two Sum", "slug": "two-sum",
    "difficulty": "Easy", "tags": ["array"], "description": "<p>HTML…</p>",
    "fetchedAt": 1789072121311
  },
  "log": "{\"schema_version\":1,…}\n{\"kind\":\"event\",…}\n"
}
```

`log` is the complete session log as one JSONL string (see below). A plain
version is also available at `GET /api/agent/sessions/{sessionId}/log`
(`Content-Type: application/x-ndjson`).

### POST /api/agent/sessions/{sessionId}/reviews

Request body — EXACTLY these fields (strings). Unknown fields are rejected:

```json
{
  "observations": "what happened in the session (markdown)",
  "strengths": "what went well (markdown)",
  "weaknesses": "what needs work (markdown)",
  "recommended_focus": "concrete next steps (markdown)",
  "overall": "optional short verdict, e.g. good | needs_work"
}
```

Rules:
- `observations`, `strengths`, `weaknesses`, `recommended_focus` are required
  and must be strings (may be empty individually, but at least one must be
  non-empty).
- `overall` is optional.
- Unknown/extra fields → HTTP 400, nothing is stored.
- Unknown session id → HTTP 404, nothing is stored.

Success: HTTP 200 with `{"ok": true, "reviewId": 7}`.

### GET /api/agent/sessions

Returns session summaries, newest first, for history analysis. Filterable
via query parameters: `from` / `to` (epoch ms), `problem_id`, `difficulty`,
`tag`, `outcome` (`accepted` / `wrong_answer` / `unsolved`),
`review_status` (`none` / `pending` / `in_progress` / `completed`), and
`status` (`active` / `paused` / `finished`):

```json
[
  {
    "id": 3,
    "problem": { "id": 1, "title": "Two Sum", "slug": "two-sum",
                 "difficulty": "Easy", "tags": ["array", "hash-table"] },
    "startedAt": 1789072121312,
    "finishedAt": 1789072125738,
    "activeMs": 2417,
    "status": "finished",
    "outcome": "Accepted",
    "reviewRequestStatus": "pending",
    "reviewCount": 0,
    "planItemId": 5
  }
]
```

`planItemId` is the id of the plan item this session was started from, or
`null` for sessions started outside the plan flow. Use it to tie practice
back to a plan (provenance).

### GET /api/agent/problems

Returns the cached problem bank, ordered by `lc_id`. Read-only from the
local cache — calling it never triggers a LeetCode sync:

```json
[
  {
    "id": 1,
    "lc_id": 1,
    "title": "Two Sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "tags": ["array", "hash-table"]
  }
]
```

`id` is the app's internal problem row id; `lc_id` is the LeetCode problem
id (use `lc_id` in plan payloads).

### GET /api/agent/plans

Returns all stored plans, newest first. Plans are append-only: they are
never modified or deleted. `based_on` (when set) is the earlier plan a plan
revises, and an item's `carried_from` (when set) is the earlier plan item it
continues. Each item's `status` is derived at read time from the sessions
linked to it:

- `"solved"` — at least one linked session has an Accepted submission.
- `"practiced"` — linked sessions exist, but none has an Accepted verdict.
- `"not_started"` — no linked sessions.

```json
[
  {
    "id": 2,
    "created_at": 1789159354625,
    "horizon_days": 14,
    "based_on": 1,
    "focus": "two weeks on hash maps and two pointers (markdown)",
    "notes": "optional extra context for the user (markdown)",
    "items": [
      {
        "id": 5,
        "lc_id": 1,
        "slug": "two-sum",
        "reason": "solidify the hash-map pattern before moving on (markdown)",
        "carried_from": null,
        "status": "practiced"
      }
    ]
  }
]
```

### POST /api/agent/plans

Request body — EXACTLY these fields. Unknown fields are rejected:

```json
{
  "horizon_days": 14,
  "focus": "focus statement for the next two weeks (markdown)",
  "notes": "optional extra context (markdown)",
  "problems": [
    { "lc_id": 1, "slug": "two-sum", "reason": "why this problem now (markdown)" }
  ]
}
```

Rules:
- `horizon_days` (positive integer), `focus` (must be non-empty after
  trimming), and `problems` (at least one entry) are required. `notes` is
  optional.
- Every `problems` entry needs `lc_id` (integer), `slug`, and `reason`.
- Every `lc_id` must exist in the problem bank — unknown ids → HTTP 400
  with the offending ids listed in the error message.
- Unknown/extra fields (top level or inside a problem entry) → HTTP 400.
- Plans are append-only: on success the plan is stored and cannot be
  modified afterwards; on rejection nothing is stored. A new plan never
  overwrites an old one — the newest plan simply becomes the current one.

Success: HTTP 200 with the stored plan, same shape as elements of
`GET /api/agent/plans` (item statuses are always `"not_started"` in the
POST response, since no session is linked yet):

```json
{
  "id": 2,
  "created_at": 1789159354625,
  "horizon_days": 14,
  "based_on": null,
  "focus": "focus statement for the next two weeks (markdown)",
  "notes": "optional extra context (markdown)",
  "items": [
    {
      "id": 5,
      "lc_id": 1,
      "slug": "two-sum",
      "reason": "why this problem now (markdown)",
      "carried_from": null,
      "status": "not_started"
    }
  ]
}
```

Chaining fields (optional, validated): `based_on` must be an existing plan
id; each item's `carried_from` must be an existing plan item id. Unknown or
nonexistent references → HTTP 400 with the offending id in the message.
Use them to make each plan an explicit revision of the previous ladder.

### GET /api/agent/progress

Returns the objective progress digest — per-topic aggregates computed from
recorded sessions and the problem bank's tags, plus adherence rollups for
the current plan. Read-only from local data; calling it never triggers a
LeetCode sync.

```json
{
  "totals": { "attempts": 6, "solved": 2 },
  "taxonomy_version": 1,
  "topics": [
    {
      "topic": "arrays-hashing",
      "attempts": 5,
      "solved": 2,
      "solve_rate": 0.4,
      "last_practiced_at": 1789159354625
    },
    { "topic": "other", "attempts": 1, "solved": 0, "solve_rate": 0, "last_practiced_at": 1789072754625 }
  ],
  "current_plan": {
    "id": 2,
    "created_at": 1789159354625,
    "horizon_days": 14,
    "solved": 1,
    "practiced": 1,
    "not_started": 3,
    "carried_unsolved": [
      { "item_id": 9, "carried_from": 5, "slug": "three-sum", "status": "practiced" }
    ]
  }
}
```

With no sessions and no plans, `topics` is empty and `current_plan` is
`null`. Topic keys are the ids of the app's curated topic taxonomy (a
versioned two-level tree of Data Structures / Algorithms topics mapping
LeetCode tag slugs to nodes); `taxonomy_version` reports which seed produced
the keys, so a seed update is observable without changing shapes. A problem
whose tags map to several topics counts once per topic; problems whose tags
match no curated node land under `"other"`.

### PUT /api/agent/memory

Store your memory notebook — the body is markdown, exactly one field
(`body`), unknown fields rejected. Every PUT creates a new immutable
version; the newest version is what you read back. Cap: 64 KiB.

```json
{ "body": "# Memory\n- Ladder position: two-pointers step 2/5\n- Open threads: finish paused Longest Substring session\n- Watch next run: whether 3Sum gets attempted" }
```

Success: HTTP 200 with `{"ok": true, "version_id": 3, "size": 123}`.
Missing `body`, unknown fields, or a body over the cap → HTTP 400, nothing
stored.

### GET /api/agent/memory

Returns the current memory notebook:

```json
{ "body": "# Memory\n...markdown...", "version_id": 3, "updated_at": 1789159354625 }
```

If no memory has been stored yet: `{ "body": null, "version_id": null,
"updated_at": null }`.

### GET /api/agent/memory/versions

Full version history of your memory, newest first — the audit trail:

```json
[
  { "id": 3, "size": 512, "created_at": 1789159354625, "body": "# Memory\n..." },
  { "id": 2, "size": 498, "created_at": 1789072754625, "body": "# Memory\n..." }
]
```

---

## Session log format (schema v1)

The log is JSONL: the first line is a header object, every following line is
one event object. Fields on every line: `kind` (`"header"` / `"event"`),
`schema_version` (header only), `type`, `offset_ms` (milliseconds since
session start), `ts` (absolute epoch ms). Events are ordered by `seq`
(emission order). `offset_ms` + `ts` recover chronology even when events were
appended later.

### Header

```json
{"schema_version":1,"kind":"header","session_id":3,
 "problem":{"lc_id":1,"title":"Two Sum","slug":"two-sum",
            "difficulty":"Easy","tags":["array","hash-table"]},
 "started_at":1789072121312,"finished_at":1789072125738,
 "active_ms":2417,"status":"finished"}
```

### Event types

| type | payload fields |
|---|---|
| `session_started` | `problem_slug` |
| `problem_opened` | `problem_slug`, `title` |
| `snapshot` | `code` (**complete code at that moment** — not a diff), `label` (nullable), `language` (nullable) |
| `copy_out` | `code`, `language` — user copied the draft out to paste into LeetCode |
| `note_change` | `size` — user's notes changed (full notes are in the session context) |
| `submission` | `lc_submission_id`, `verdict` (LeetCode status, e.g. `Accepted`, `Wrong Answer`), `code`, `lang`, `runtime` (nullable), `memory` (nullable) |
| `session_paused` / `session_resumed` | {} |
| `session_finished` | `active_ms` — total active time excluding pauses |

Example event:

```json
{"kind":"event","seq":3,"type":"snapshot","offset_ms":11,
 "ts":1789072121323,
 "payload":{"code":"def twoSum(a, b):\n    return a + b",
            "label":"first try","language":"python3"}}
```

Notes for interpretation:
- Failed submissions appear exactly like accepted ones (`verdict` differs) —
  they are valuable signal.
- Late-arriving submissions (synced after the session ended) are appended as
  new events; previously emitted events are never rewritten.
- The schema is versioned: `schema_version` on the header line. Treat unknown
  event types or payload fields in future versions as skip-and-continue.

---

## Error handling summary

| HTTP | Meaning |
|---|---|
| 401 | missing/invalid token — check `Authorization: Bearer` |
| 400 | invalid review or plan payload — fix fields, nothing was stored |
| 404 | unknown session/request id |
| 409 | request already completed/cancelled |
| 502 | LeetCode sync backend failure — not the agent's fault; retry later |
