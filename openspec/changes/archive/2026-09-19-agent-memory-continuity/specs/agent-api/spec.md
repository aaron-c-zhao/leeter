## MODIFIED Requirements

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

## ADDED Requirements

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
