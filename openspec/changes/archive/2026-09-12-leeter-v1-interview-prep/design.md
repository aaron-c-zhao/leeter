## Context

Greenfield project. The app is a single-user internal tool deployed on the home lab; the agent harness runs on the user's workstation and consumes the app over HTTP. LeetCode (unofficial GraphQL) is the problem source and final judge; solving happens on leetcode.com, optionally preceded by drafting in the app. See proposal.md for motivation and specs/ for behavior contracts.

## Goals / Non-Goals

**Goals:**
- One deployable unit for the home lab; near-zero operational overhead.
- A stable, versioned agent contract (session logs + HTTP API) that outlives UI churn and works with any agent harness.
- Faithful capture of the solving *process* (draft snapshots, timing, submission archaeology).
- Graceful degradation when the unofficial LeetCode integration breaks.

**Non-Goals:**
- No code execution/judging in-app (LC judges; the draft pad is a recorder).
- No write-back to LeetCode in v1 (no automated submissions).
- No skill model / adaptive plan in v1 (follow-up change; schema should not preclude it).
- No multi-user support or public exposure.

## Decisions

### D1: TypeScript end-to-end, one Node process
**Choice**: Vite + React SPA (frontend), Fastify (API + static file serving of the built SPA) in a single Node.js process, shipped as one Docker image.
**Why**: The agent API is a first-class consumer, so a purpose-built HTTP framework beats Next.js API routes; no SSR needs; one runtime, one container. Next.js was the alternative — heavier and SSR-centric for zero benefit here.

### D2: SQLite + Drizzle ORM
**Choice**: SQLite via `better-sqlite3`, accessed through Drizzle ORM.
**Why**: Single-user, single-node; zero-ops storage that lives in one file (trivially backed up with the container volume). Postgres was rejected as unwarranted for a home-lab single user.

### D3: Session logs are a serialization contract, not a storage format
**Choice**: Store events relationally (events table: session_id, seq, type, timestamp offset, JSON payload); serialize to versioned JSONL at API-read time.
**Why**: Keeps events queryable (history filters, dashboard aggregates) while the JSONL format stays a stable external contract. File-on-disk logs were rejected: they duplicate state, invite drift from the DB, and the agent runs on another machine anyway (HTTP, not filesystem).
Schema evolution: each log starts with a header line carrying `schema_version`; new event types or fields bump the version; old logs serialize with their original version marker. Snapshot events carry full code (no diffs) so agents need no reconstruction logic.

### D4: Draft pad = Monaco editor, snapshot-on-save, no execution
**Choice**: Monaco (`@monaco-editor/react`), manual save + periodic autosave, snapshots stored whole; a "copy to clipboard" action for pasting into LeetCode.
**Why**: Monaco matches the LeetCode-like editing experience and has first-class React integration. Executing code locally was rejected (v1 non-goal: judging belongs to LC); capturing the pre-submission draft phase was the point of building the pad at all.

### D5: LeetCode integration via unofficial GraphQL + session cookie
**Choice**: Direct `fetch` against `leetcode.com/graphql` with the user's `LEETCODE_SESSION` cookie + CSRFTOKEN header, wrapped in a thin `lc-client` module (limited surface: problem list, problem detail, submission list). A wrapper library (e.g., `leetcode-query`) may be used, but all LC access funnels through one module so breakage is isolated.
**Why**: No official API exists; a thin dedicated client keeps the blast radius of LC changes to one module. Sync is pull-only and user-triggered/scheduled — no automated submission traffic.
**Cookie handling**: credential supplied via environment/config file, excluded from logs, API responses, and error messages (redact at the transport layer).

### D6: Agent auth = static bearer token
**Choice**: One bearer token generated at setup, stored server-side in config; required on `/api/agent/*` routes.
**Why**: Internal LAN tool; token keeps other LAN clients out without an identity system. UI auth: none beyond LAN reach in v1 (single-user home lab), revisit if ever exposed beyond the LAN.

### D7: Agent trigger = workstation cron + manual, against a pending-review queue
**Choice**: The app exposes "review requested" state on sessions; agents list pending reviews, claim/mark them, and POST results. The workstation cron job is a thin script (agent CLI invocation with leeter API URL + token) — the app never launches agents; it only exposes the queue.
**Why**: App and agent have independent lifecycles (home lab vs. workstation). Manual trigger = the same CLI script run by hand.

### D8: Architecture shape
```
+-----------------------------------------------------------+
| Docker container (home lab)                               |
|  Fastify node process                                     |
|   /            -> static SPA (React + Vite build)         |
|   /api/ui/*    -> sessions, notes, bank, sync triggers    |
|   /api/agent/* -> bearer token: list sessions/logs,       |
|                   pending reviews, POST reviews           |
|   lc-client    -> leetcode.com GraphQL (cookie)           |
|   SQLite (volume-mounted file)                            |
+-----------------------------------------------------------+
           ^ HTTP (LAN)                    ^ HTTP (LAN/token)
     [Browser: user]               [Workstation: agent harness]
                                    cron job OR manual run
```

## Risks / Trade-offs

- [Unofficial LC API breaks or rate-limits] → All LC access in one module; sync failures surface explicitly and never block local recording; cached bank stays browsable.
- [LC session cookie expiry] → Detect auth-failure responses and report "credential renewal needed"; cookie is user-supplied config, replaced without code changes.
- [Log schema drift breaks agents] → Schema version header + append-only events; old logs keep their original version marker.
- [Draft pad vs. actual LC editor drift] → Accepted: pad is a thinking scratchpad, not an LC replica; copy-out is manual and explicit.
- [Single-user assumption encoded everywhere] → Acceptable for a personal tool; auth is the first seam to cut if that ever changes.
- [Agent reviews are untrusted input] → Validate review payload shape on POST; render as markdown from stored text; agent token is scoped to `/api/agent/*` only.

## Migration Plan

Greenfield: scaffold repo, `docker compose up` with a volume for the SQLite file, set `LEETCODE_SESSION`/`CSRFTOKEN`/agent token via env file. Rollback = stop container; data survives in the volume. No existing data to migrate.

## Open Questions

- Which languages to declare as "primary" for the draft pad (Monaco language modes) — cosmetic, decidable during implementation.
- Whether problem bank sync should also run on a schedule or stay manual-only — decidable after first real usage; no spec impact either way.
