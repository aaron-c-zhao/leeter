## 1. Scaffold

- [x] 1.1 Scaffold repo: Vite + React SPA, Fastify server, TypeScript config, single package layout per design D1/D8; verify `npm run dev` serves the SPA and a stub API responds
- [x] 1.2 Add SQLite via better-sqlite3 + Drizzle ORM; define core schema (problems, submissions, sessions, session_events, notes, reviews, review_requests); verify migration runs and tables exist
- [x] 1.3 Add Dockerfile + compose file with volume-mounted SQLite file and env-based config (LC cookie, agent token); verify `docker compose up` serves the app on the LAN

## 2. LeetCode sync (lc-sync)

- [x] 2.1 Implement `lc-client` module (problem list, problem detail, submission list) with cookie/CSRF auth and redaction of credentials in all logging; verify unit test with mocked GraphQL responses shows no cookie leakage in errors
- [x] 2.2 Implement problem bank sync + storage and a manual "sync bank" UI action; verify initial sync populates the bank and a refresh updates in place without data loss
- [x] 2.3 Implement submission history ingestion (including failed submissions, idempotent re-sync keyed on LC submission ids); verify pulling twice creates no duplicates
- [x] 2.4 Implement failure surfacing: detect auth failure ("renew cookie") vs. network error; verify app stays fully usable with LC unreachable and errors are shown, per spec Graceful degradation scenarios

## 3. Session recording (session-recording)

- [x] 3.1 Implement session lifecycle (start/pause/finish, active-time tracking) with persistence; verify pause excludes time and a restart resumes state
- [x] 3.2 Implement draft pad (Monaco, manual save + autosave snapshots, no execution) and snapshot timeline view; verify each save appends a full-code snapshot
- [x] 3.3 Implement markdown notes with incremental persistence; verify notes survive reload/restart mid-session
- [x] 3.4 Implement copy-to-clipboard copy-out action recorded as a timeline event; verify event appears in the timeline
- [x] 3.5 Implement stitching LC submissions into the session timeline in chronological order; verify a synced submission appears interleaved with draft events

## 4. Session logs (session-logs)

- [x] 4.1 Define JSONL schema v1 (header with schema_version, event objects with offset + type) and the serializer from relational events; verify emitted logs parse as JSONL and snapshots contain full code
- [x] 4.2 Implement append-only semantics (late-arriving submissions append as new events; no rewrites); verify a late submission append leaves prior events unchanged
- [x] 4.3 Implement version marker preservation for logs serialized from older data; verify an old-versioned log serves with its original marker

## 5. Agent API (agent-api)

- [x] 5.1 Add bearer-token auth middleware on `/api/agent/*` with token from config, excluded from logs; verify 401 on missing/wrong token and success with the right token
- [x] 5.2 Implement session list (filters: date range, problem, review status) and session-context fetch (log + problem metadata + description); verify a review-ready agent payload in one call
- [x] 5.3 Implement review POST with payload validation; verify well-formed reviews persist and appear linked to the session, malformed ones are rejected with nothing stored
- [x] 5.4 Implement review-request queue (request/cancel in UI; agent sees pending list and can mark in-progress/completed); verify the full request→claim→complete round trip via API calls

## 6. Practice history UI (practice-history)

- [x] 6.1 Build history list with filters (problem, difficulty, tags, date range, outcome); verify filtered queries return only matching sessions
- [x] 6.2 Build session detail view: timeline, notes, LC verdicts, agent reviews, snapshot diff view; verify two snapshots can be compared
- [x] 6.3 Surface reviews posted after session end on next page load; verify a review POSTed via API appears on the detail view
- [x] 6.4 Build dashboard summary (attempts/solved over time, time spent, tag distribution); verify aggregates match session data

## 7. Agent integration + end-to-end verification

- [x] 7.1 Write the workstation agent runner script (leeter API URL + token + agent CLI invocation) for cron and manual use; verify a manual run against a pending review produces a stored review visible in the UI
- [x] 7.2 Document the session log schema v1 and agent API in a prompt-ready format for harnesses (agent-facing doc in repo); verify an agent instructed only with this doc can fetch a log and post a valid review
- [x] 7.3 End-to-end run: start session → draft → copy-out → submit on LC → sync → request review → agent run → review visible; verify the whole flow works against the deployed container
