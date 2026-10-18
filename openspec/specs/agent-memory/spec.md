## Purpose

The agent's long-term memory surface: a server-computed objective progress digest and an agent-authored subjective notebook with a versioned audit trail, so planning runs carry continuity across sessions instead of re-deriving everything from raw history.

## Requirements

### Requirement: Progress digest endpoint
The system SHALL provide a token-authenticated agent endpoint returning an objective progress digest derived from sessions, submissions, problems, and the current plan: per-topic aggregates (attempts, solved, solve rate, last-practiced timestamp) keyed by the agent-consumable topic grouping, plus adherence rollups for the current plan (solved / practiced / not-started counts and carried-over unfinished items). Calling it SHALL NOT trigger a LeetCode sync and SHALL NOT require the agent to cross-reference sessions itself.

#### Scenario: Digest summarizes practice state
- **WHEN** an agent requests the digest after sessions have been recorded across several problem tags
- **THEN** the response contains per-topic attempt/solve aggregates with last-practiced timestamps and a current-plan adherence rollup, computed server-side

#### Scenario: Empty state digest
- **WHEN** an agent requests the digest with no sessions and no plans recorded
- **THEN** the response contains zeroed aggregates and no current-plan section, without erroring

### Requirement: Agent memory notebook
The system SHALL let an authorized agent store a single current memory notebook (markdown, size-capped) via a token-authenticated PUT, overwriting only by creating a new version: stored memory versions are immutable and auditable, and reads return the latest version. The notebook is agent-facing only — the user-facing UI SHALL NOT render it.

#### Scenario: Agent updates its memory
- **WHEN** an authorized agent PUTs a new memory body
- **THEN** it is stored as a new version, becomes the version returned by subsequent GETs, and the previous version remains retrievable via the history endpoint

#### Scenario: Malformed memory rejected
- **WHEN** an agent PUTs a memory missing the required body or with unknown fields
- **THEN** the request is rejected with a validation error and nothing is stored

### Requirement: Memory audit trail for human inspection
The system SHALL keep every memory version with its timestamp and size, and expose the version history through a token-authenticated agent endpoint, so a human with the agent token can inspect how the agent's memory evolved. The UI remains agent-only for memory.

#### Scenario: Human inspects memory evolution
- **WHEN** the version-history endpoint is called with the agent token
- **THEN** it returns all stored versions newest-first with timestamps, sizes, and bodies, regardless of which version is current

### Requirement: Planning workflow uses digest and notebook
The agent protocol's planning workflow SHALL direct the agent to consult the progress digest and the memory notebook as the basis for each plan (revising the previous ladder rather than re-deriving from scratch), and SHALL instruct the agent to keep process bookkeeping (adherence narration, history-used lists, cycle process notes) in the memory notebook rather than in plan focus or notes fields.

#### Scenario: Protocol directs continuous planning
- **WHEN** a planning run follows the protocol's planning workflow
- **THEN** the documented steps are: read digest, read latest memory, post a plan that revises the previous one (carrying unfinished items explicitly), then update the memory — with plan focus/notes reserved for the user-facing plan statement
