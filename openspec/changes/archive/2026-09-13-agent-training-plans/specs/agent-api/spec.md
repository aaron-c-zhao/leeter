## ADDED Requirements

### Requirement: Posting and listing training plans
The system SHALL expose authenticated agent endpoints to POST a structured training plan (horizon, focus, optional notes, suggested problems with ids and reasons) and to list stored plans newest-first with their items.

#### Scenario: Agent submits a plan
- **WHEN** an authorized agent POSTs a well-formed plan
- **THEN** the plan is stored, becomes the current plan, and the response identifies the created plan and its items

#### Scenario: Malformed plan rejected
- **WHEN** an agent POSTs a plan missing required fields or with unknown fields
- **THEN** the system rejects it with a validation error and stores nothing

#### Scenario: Agent lists plans
- **WHEN** an authorized agent requests the plan list
- **THEN** it receives all stored plans newest-first with their items and problem references

### Requirement: Reading the problem bank
The system SHALL expose an authenticated agent endpoint that lists the cached problem bank (id, title, slug, difficulty, tags) without triggering a LeetCode sync.

#### Scenario: Agent lists bank problems
- **WHEN** an authorized agent requests the problem list
- **THEN** it receives the cached bank entries with their metadata
