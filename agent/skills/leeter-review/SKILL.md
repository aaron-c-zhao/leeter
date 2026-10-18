---
name: leeter-review
description: Act as the leeter reviewing agent — fetch pending review requests from the leeter API, analyze a practice session (draft snapshots, submissions, notes), and post a structured review. Use when the user asks to review sessions, check the leeter review queue, run an agent review, or mentions leeter pending reviews.
---

# leeter review agent

You are the reviewing agent for the leeter practice recorder. A session review
analyzes the solving *process* (draft evolution, notes, failures), not just the
final verdict.

Canonical contract: `agent/AGENT_PROTOCOL.md` in this repo. Read it if any
endpoint or field shape here is unclear.

## Setup

- Base URL: `$LEETER_URL` (default `http://localhost:8080`)
- Token: `$LEETER_TOKEN` from the environment, else `cat ./data/agent-token`

All `/api/agent/*` calls need `Authorization: Bearer $TOKEN` (use
`-H "Authorization: Bearer $TOKEN"`).

## Workflow

1. **Discover work** — unless the user names a session:
   ```bash
   curl -sf -H "Authorization: Bearer $TOKEN" "$LEETER_URL/api/agent/reviews/pending"
   ```
   Each row has `requestId`, `sessionId`, and `problem`. Present the list and
   review one (or all, if the user asks) — ask when the choice is ambiguous.

2. **Claim the request** (marks it in-progress so other runs skip it):
   ```bash
   curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
     "$LEETER_URL/api/agent/reviews/requests/$REQUEST_ID/claim"
   ```
   409 = already completed/cancelled — skip to the next.

3. **Fetch context** (one call returns everything):
   ```bash
   curl -sf -H "Authorization: Bearer $TOKEN" \
     "$LEETER_URL/api/agent/sessions/$SESSION_ID"
   ```
   Use: `problem` (title, difficulty, HTML description, tags), `session.notes`,
   `session.reviews` (past reviews — cite or extend, don't repeat), and
   `session.log` — a JSONL string; first line is the header
   (`schema_version`, problem, timing), every following line is an event with
   `type`, `offset_ms`, `payload`.

4. **Analyze** the log. Focus on:
   - **Draft evolution** — compare consecutive `snapshot` events (payloads
     contain the complete code). What changed between attempts? Was the
     progression structured (e.g., brute force → optimized) or erratic?
   - **Submissions** — `verdict` includes failures (`Wrong Answer`, TLE, …);
     read failed submissions' code and infer what went wrong.
   - **Notes** — do they capture the approach? Are insights missing?
   - **Copy-out timing** — `copy_out` offset vs. session length: how long
     before first submit?
   - **Active time** — `active_ms` on `session_finished`, pause gaps.
   - The problem's difficulty vs. the observed process.

5. **Write the review** as JSON — exactly these fields (strings; unknown
   fields are rejected, and the server 400s if every field is empty):
   ```json
   {
     "observations": "what happened in the session (markdown)",
     "strengths": "what went well (markdown)",
     "weaknesses": "what needs work (markdown)",
     "recommended_focus": "concrete next steps / practice suggestions (markdown)",
     "overall": "optional: good | needs_work | strong"
   }
   ```
   Cite concrete evidence (snapshot diffs, verdicts, timestamps) rather than
   generic advice.

6. **Post it**:
   ```bash
   curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "$LEETER_URL/api/agent/sessions/$SESSION_ID/reviews" -d @review.json
   ```
   200 `{"ok":true,"reviewId":N}` — the queue entry auto-completes.
   400 = validation error (read the message, fix the payload, retry);
   404 = unknown session; 502 = LeetCode sync issue, not yours — report it.

7. **Report back** — summarize per session: what you reviewed, the review's
   key points, and that it is now visible in the leeter UI.

## Rules

- Never edit session data; reviews are append-only via POST.
- One review POST per session per run; if a review already exists for the
  session, mention it in `observations` and build on it rather than duplicating.
- If a session has almost no recorded process (e.g., no snapshots, synced
  straight from LC), say so explicitly and review what exists — do not invent
  detail.
- Token stays in env/config; never include it in prompts or review text.
