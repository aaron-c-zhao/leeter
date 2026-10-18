## Purpose

The token-authenticated HTTP surface that agent harnesses (e.g., antigravity on the workstation) consume: fetching session logs and problem context, posting reviews back, and discovering pending work. Designed for both scheduled (cron) and manual agent runs.

## Requirements

### Requirement: Token-authenticated agent access
The system MUST require a bearer token on all agent-facing endpoints, rejecting unauthenticated or wrong-token requests, and MUST keep the token out of source control and logs.

#### Scenario: Agent with valid token
- **WHEN** an agent calls an agent endpoint with the configured bearer token
- **THEN** the request succeeds

#### Scenario: Missing or invalid token
- **WHEN** an agent endpoint is called without a token or with a wrong token
- **THEN** the system rejects the request with an authentication error and grants no data

### Requirement: Fetch session logs and context
The system SHALL expose endpoints for an agent to list sessions (with filters such as date range, problem, or review status) and fetch a session log plus the problem's metadata and description.

#### Scenario: Agent lists recent sessions
- **WHEN** an agent requests the session list with a date-range filter
- **THEN** it receives matching sessions with ids, problem references, outcomes, and review status

#### Scenario: Agent fetches full context for review
- **WHEN** an agent requests a session by id
- **THEN** it receives the session log, the problem metadata, and the problem description in one coherent response

### Requirement: Posting reviews
The system SHALL provide an endpoint for agents to POST a structured review for a session (observations, strengths, weaknesses, recommended focus), which is stored and shown in the practice history.

#### Scenario: Agent submits a review
- **WHEN** an authorized agent POSTs a well-formed review for a session
- **THEN** the review is stored, linked to that session, and visible in the UI

#### Scenario: Malformed review rejected
- **WHEN** an agent POSTs a review missing required fields or with invalid content
- **THEN** the system rejects it with a validation error and stores nothing

### Requirement: Review request and pending queue
The system SHALL let the user mark sessions as "review requested" in the UI, and expose the queue of pending review requests so an agent (cron-scheduled or manually run) can discover which sessions to work on; the user SHALL also be able to cancel a pending request.

#### Scenario: Request a review manually
- **WHEN** the user marks a finished session as "review requested"
- **THEN** the session appears in the pending-review queue visible to agents

#### Scenario: Cron-driven agent picks up work
- **WHEN** a scheduled agent run queries pending reviews and processes one
- **THEN** it can mark the request as in-progress or completed, and the UI reflects the review status

#### Scenario: Cancel a pending request
- **WHEN** the user cancels a pending review request before an agent picks it up
- **THEN** the session is removed from the pending queue

### Requirement: Posting and listing training plans
The system SHALL expose authenticated agent endpoints to POST a structured training plan (horizon, focus, optional notes, suggested problems with ids and reasons; optional `based_on` plan id and per-item `carried_from` item ids) and to list stored plans newest-first with their items including chaining fields. Unknown `based_on`/`carried_from` references SHALL be rejected; known references SHALL be stored and echoed.

#### Scenario: Agent submits a plan
- **WHEN** an authorized agent POSTs a well-formed plan
- **THEN** the plan is stored, becomes the current plan, and the response identifies the created plan and its items

#### Scenario: Malformed plan rejected
- **WHEN** an agent POSTs a plan missing required fields or with unknown fields
- **THEN** the system rejects it with a validation error and stores nothing

#### Scenario: Agent lists plans
- **WHEN** an authorized agent requests the plan list
- **THEN** it receives all stored plans newest-first with their items, problem references, and chaining fields where declared

#### Scenario: Plan with chaining references stored
- **WHEN** an authorized agent POSTs a plan with a valid `based_on` plan id and valid per-item `carried_from` item ids
- **THEN** the response echoes those fields and the stored plan carries them
### Requirement: Reading the problem bank
The system SHALL expose an authenticated agent endpoint that lists the cached problem bank (id, title, slug, difficulty, tags) without triggering a LeetCode sync.

#### Scenario: Agent lists bank problems
- **WHEN** an authorized agent requests the problem list
- **THEN** it receives the cached bank entries with their metadata

### Requirement: Progress digest endpoint
The system SHALL expose an authenticated agent endpoint returning the objective progress digest (per-topic practice aggregates and current-plan adherence rollup) without triggering a LeetCode sync or requiring per-session cross-referencing by the agent.

#### Scenario: Agent reads the digest
- **WHEN** an authorized agent requests the digest
- **THEN** it receives per-topic aggregates and current-plan adherence computed by the server


### Requirement: Memory notebook endpoints
The system SHALL expose authenticated agent endpoints to store the agent memory notebook as a new immutable version (PUT), read the current version (GET), and list all versions newest-first (history), with the same token authentication as the rest of the agent surface.

#### Scenario: Agent stores and reads memory
- **WHEN** an authorized agent PUTs a memory body and later GETs memory
- **THEN** the stored body is returned as the current version, and the history endpoint lists all versions
