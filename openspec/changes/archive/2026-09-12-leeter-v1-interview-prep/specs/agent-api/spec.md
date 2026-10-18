## Purpose

The token-authenticated HTTP surface that agent harnesses (e.g., antigravity on the workstation) consume: fetching session logs and problem context, posting reviews back, and discovering pending work. Designed for both scheduled (cron) and manual agent runs.

## ADDED Requirements

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
