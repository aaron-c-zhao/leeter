## Why

The README deliberately deferred a training-plan model in v1, sketching the intended pattern: agents use the same contract (session list, session logs, past reviews) to spot patterns and propose the next practice set. The data to support that now fully exists — filtered agent session listing, per-session logs, past reviews, and a cached problem bank — but there is nowhere for an agent to post a plan, nowhere to see it, and no way to practice from it in one click. This change adds the "plan" half of the loop: agent proposes what to focus on next, the app displays it on the dashboard, and planned problems are one click away from a practice session.

## What Changes

- New append-only `plans` + `plan_items` tables: an agent-posted plan has a horizon, focus notes, and a list of suggested problems (lc_id, slug, reason).
- New agent endpoints: `POST /api/agent/plans` (submit a plan) and `GET /api/agent/plans` (list plans newest-first, so the next agent run can reconstruct adherence).
- New agent endpoint `GET /api/agent/problems`: mirror of the cached problem bank (tags, difficulty) so the planner can propose new problems, not just previously-practiced ones.
- `sessions.plan_item_id`: nullable provenance FK, set when a session is started from the plan panel; many sessions may link to one plan item.
- Dashboard "Current plan" section: focus markdown, problem items with derived status chips (solved / practiced / not started, derived from linked sessions' verdicts), Start session buttons, and collapsed past-plans history.
- Session detail shows a "from plan" badge when the session carries plan provenance.
- `agent/AGENT_PROTOCOL.md` extended with the plans and problems endpoints and cadence guidance. No trigger/queue for plans (agent runs free, posting a plan each run); no plan expiry enforcement; newest plan is "current".
- Plan adherence analysis stays with the agent across runs (inference over plans + session history), strengthened by the provenance FK.

Non-goals: no plan status state machine in the app (no started/done/expired columns or transitions), no plan request queue, no automatic session→plan linkage for sessions started outside the panel, no plan editing by the user.

## Capabilities

### New Capabilities
- `training-plans`: agent-submitted training plans — storage, current-plan display on the dashboard, derived item status, start-session-from-plan with provenance, and past-plan history.

### Modified Capabilities
- `agent-api`: new requirements — posting and listing training plans, and reading the cached problem bank.

## Impact

- `server/db/schema.ts` + migrations: new `plans`, `plan_items` tables; nullable `sessions.plan_item_id`.
- `server/routes/agent.ts`: three new endpoints (plans POST/GET, problems GET).
- `server/routes/ui.ts` + `server/sessions/service.ts`: accept optional `planItemId` on session creation; dashboard payload gains the current plan and item statuses.
- `server/AGENT_PROTOCOL` docs: `agent/AGENT_PROTOCOL.md` gains plan/problems sections.
- `web/`: dashboard plan section (status chips, Start buttons, past plans), session detail badge.
- `test/`: plans service, agent endpoints, session-provenance, dashboard-plan tests.
- No breaking changes; all new surface is additive.
