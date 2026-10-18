# leeter — interview prep recorder & agent reviewer

leeter is a single-user, self-hosted webapp for coding-interview practice. Instead of leaving your history inside LeetCode, it records *how* you solve problems: a draft pad captures code snapshots while you think, timing and notes are logged, and your LeetCode submissions (including failed ones) are stitched into a session timeline. Every session is serialized into a stable, versioned JSONL log that an external agent (LLM harness) can fetch over HTTP to review your solving process — and later to drive a training plan.

## What it does

- **Problem bank** — pulls the LeetCode problem list and details via its unofficial GraphQL endpoints using your session cookie; browsable offline afterwards.
- **Session recording** — start/pause/finish a session on a problem; the draft pad (Monaco, no execution) appends full-code snapshots on save/autosave; markdown notes persist incrementally; a copy-out action records the moment you pasted into LeetCode.
- **LeetCode stitching** — sync pulls your real submissions (verdict, code, runtime/memory, including failures) and interleaves them chronologically with draft events.
- **Session logs** — each session serializes to append-only JSONL (`schema_version` header + one event per line); snapshots always carry the complete code, so agents need no reconstruction logic.
- **Agent review queue** — request a review from the UI; an agent run on your workstation claims the request, fetches log + context, and posts a structured review back.
- **Practice history** — filtered session list, detail view with timeline and snapshot diff, and a dashboard organized into functional sections: a **Next up** strip (resume your unfinished session, or start the next plan item — carried items first), **The plan** (progress, items with the topics they train, past plans), and **The record** (summary stats, a truthful 30-day activity chart, curated topic distribution linking into the roadmap, and recent results).
- **Knowledge roadmap** — a curated, ordered topic tree (Data Structures / Algorithms, plus an Other bucket for unmapped tags) showing per-topic mastery (attempts, solves, solve rate, last practiced), "next focus" markers where your current plan is pushing you, flags on carried unfinished items, startable plan-frontier items, and a drill-down into recently practiced problems per topic. Topic links from the dashboard land on the matching node with its drill-down expanded.
- **Polished, themed UI** — token-based design system with a light/dark toggle (persisted, and the code editor follows the theme), and toast feedback for async actions like syncs and session lifecycle.

**Out of scope (v1):** in-app code execution/judging (LeetCode is the judge), write-back to LeetCode, skill model / in-app adaptive planning (training plans are agent-authored over the agent API, not computed in-app), multi-user support.

## How it works

One Node.js process serves everything:

```
Fastify node process
 ├─ /             static SPA (React + Vite build)
 ├─ /api/ui/*     sessions, notes, bank, sync triggers, dashboard, roadmap
 ├─ /api/agent/*  bearer-token API for agents (list/claim, logs, reviews)
 └─ lc-client ──► leetcode.com GraphQL (session-cookie auth)
SQLite (single file, volume-mounted)
```

Agent-facing HTTP contract: [`agent/AGENT_PROTOCOL.md`](agent/AGENT_PROTOCOL.md) — a prompt-ready document covering the JSONL log schema (v1) and every agent endpoint.

## Running the app

### Local development

```bash
npm install
cp .env.example .env          # add your LeetCode cookie (see Deploying)
npm run dev                   # SPA on :5173 (proxied /api) + API on :8080
```

Quality gates:

```bash
npm run typecheck             # tsc over server + web
npm run test                  # vitest (unit tests, incl. lc-client + sync)
npm run build                 # production SPA + server build
```

### Daily usage (the practice loop)

1. **Problem bank** page → *Sync bank* (first run pulls the whole bank; descriptions enrich in the background).
2. Pick a problem → **Start session**. The session detail page has the draft pad, notes, and timeline.
3. Draft in the pad — *Save snapshot* (manual or 30 s autosave), jot markdown notes, then **Copy out → LeetCode** and paste there.
4. Solve and submit on leetcode.com, then click **Sync LC submissions** — your verdicts (and failures) appear as timeline events with code and runtime.
5. **Finish session**, then **Request agent review** (or cancel later if you change your mind).
6. Browse **History** (filter by problem/difficulty/tag/date/outcome) and the **Dashboard** — it opens with what to do next in the **Next up** strip: resume an unfinished session, or start the next plan item (carried ones first). Below it, **The plan** shows the current plan with the topics each item trains, and **The record** shows your stats, activity over the last 30 days, and the topics you've practiced — each topic links into the **Roadmap** (Data Structures and Algorithms side by side) where mastery bars, next-focus markers, and startable plan items connect your plan to the map. Prefer dark mode? The header toggle remembers your choice.

## Using the agent

### Setup

The agent needs two values:

- `LEETER_URL` — the app's LAN URL, e.g. `http://leeter.home.lan:8080`
- `LEETER_TOKEN` — the agent bearer token, auto-generated at `data/agent-token` on first start (host path: `./data/agent-token` next to the repo when deployed with the compose file)

### Requesting reviews

On any **finished** session's detail page, click **Request agent review**. Pending/cancel state is visible on the same page.

### Running the agent

`agent/leeter-agent-run.sh` is the entire integration — a thin script for workstation cron or manual runs. The app never launches agents; the script discovers pending reviews, claims each one, fetches the session context, invokes *your* agent CLI, and posts the result:

```bash
export LEETER_URL=http://leeter.home.lan:8080
export LEETER_TOKEN=$(cat /path/to/agent-token)
export AGENT_CMD="antigravity run --prompt {prompt} --out {out}"

# manual run
./agent/leeter-agent-run.sh

# cron: every 2 hours
0 */2 * * * LEETER_URL=... LEETER_TOKEN=... AGENT_CMD=... /path/to/agent/leeter-agent-run.sh
```

If your "agent CLI" is opencode itself, use the bundled wrapper (exports in `~/.bashrc` already point here):

```bash
export AGENT_CMD=/path/to/leeter/agent/leeter-opencode-agent.sh   # no placeholders needed
```

Placeholders in `AGENT_CMD` (all optional; if none are used the four paths are appended as trailing arguments):

| Placeholder | Contents |
|---|---|
| `{prompt}` | review instructions (what to analyze, what JSON to write) |
| `{context}` | session context JSON: problem metadata + description, notes, prior reviews, and the raw log |
| `{log}` | the raw JSONL session log (schema v1) |
| `{out}` | file your agent must write the review JSON to |

The agent only needs [`agent/AGENT_PROTOCOL.md`](agent/AGENT_PROTOCOL.md) plus these two env values — paste the doc into any harness prompt. Reviews appear on the session detail page and automatically complete their queue entry.

### Planning training sessions

An agent plans on your behalf with long-term continuity. On its cron cadence (or a manual run) it consults the **progress digest** (`GET /api/agent/progress` — server-computed per-topic aggregates over the curated topic taxonomy plus current-plan adherence, no manual cross-referencing; "solved" means an `Accepted` verdict was synced for the session) and its own **memory notebook** (a persistent coaching state the agent reads and rewrites each run, versioned with a full audit trail) — then POSTs a revised plan that declares `based_on` (the previous plan it revises) and carries unfinished items forward via `carried_from`. The newest plan becomes the *current* plan, shown on the **Dashboard** with a derived status per item (solved / practiced / not started) and a **Start** button that opens a practice session straight from the plan; sessions started from the plan carry that provenance, which the agent sees on the next run. No queue or claim flow — plans are free-running, append-only history, and the memory notebook is agent-only (inspectable by a human with the agent token at `GET /api/agent/memory/versions`). The full contract (plan endpoints, digest, memory, bank listing, planning workflow) is in [`agent/AGENT_PROTOCOL.md`](agent/AGENT_PROTOCOL.md).

Plan quality is standardized: planning runs follow the **`leeter-plan` skill** ([`agent/skills/leeter-plan/SKILL.md`](agent/skills/leeter-plan/SKILL.md), symlinked into `.opencode/skills/` for opencode to install) and are scored against the **plan rubric** ([`agent/planning-rubric.md`](agent/planning-rubric.md) — nine dimensions from structural validity to efficiency). `agent/evals/run.sh` evaluates the prompt: it seeds four reproducible scenarios into a scratch instance, runs one planning cycle per scenario, and reports per-dimension scores with the weakest dimension named as the next prompt-iteration target.

## Deploying (home lab)

Everything ships as one Docker container with a mounted SQLite volume.

**1. Configure `.env`** (compose loads it; never commit real values):

```ini
# LeetCode credentials — from your browser (DevTools → Application → Cookies,
# on https://leetcode.com): cookie values LEETCODE_SESSION and CSRFTOKEN.
LEETCODE_SESSION=
CSRFTOKEN=

# Agent bearer token — leave unset to auto-generate into data/agent-token.
AGENT_TOKEN=

PORT=8080
DATA_DIR=/data
```

`LEETCODE_SESSION` expires eventually (browser-cookie lifetime). When the UI reports *"renew the session cookie"*, grab fresh values and recreate the container.

**2. Start:**

```bash
docker compose up -d --build     # build + run; app on port 8080 (LAN-accessible)
```

**3. Operate:**

- Update app code: `docker compose up -d --build`
- Rotate credentials only: edit `.env`, then `docker compose up -d --force-recreate`
- Verify sync works: `curl -s -X POST http://localhost:8080/api/ui/sync/submissions -H 'Content-Type: application/json' -d '{"problemId": 1}'` — a valid cookie returns `{"fetched":…}`, an expired one returns `{"kind":"auth", …}`

**Backups:** the entire state is `./data/leeter.db` (+ WAL sidecars) — copy that directory while the container is stopped, or snapshot the volume. Rollback = stop the container; data survives in the volume.

**Security:** the UI has no authentication — keep the service LAN-only. The LeetCode cookie lives only in the container env and is redacted from logs, API responses, and error messages. The agent token is required on every `/api/agent/*` route.

## Project layout

```
server/           Fastify API + domain modules
  app.ts          app factory (routes, static serving, error handling)
  db/             Drizzle schema + idempotent migrations
  knowledge/      curated topic taxonomy seed + roadmap tree service
  lc/             lc-client (GraphQL) + bank/submission sync
  sessions/       session lifecycle, timeline, reviews service
  logs/           JSONL session-log serializer (schema v1)
  routes/         /api/ui/* and /api/agent/*
web/              React SPA (Vite) — bank, session detail (draft pad, timeline,
                  diff, notes), history, dashboard, roadmap
agent/            leeter-agent-run.sh + AGENT_PROTOCOL.md (agent-facing contract),
                  skills/ (leeter-plan + leeter-review skill sources, symlinked
                  into .opencode/skills/), planning-rubric.md + evals/ (planning
                  prompt quality loop)
test/             vitest unit tests (lc-client, sync, sessions, logs, agent, dashboard, roadmap)
Dockerfile        multi-stage build → single node:24 container
docker-compose.yml service definition (volume + env_file)
```
