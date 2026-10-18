## MODIFIED Requirements

### Requirement: Agents submit training plans
The system SHALL provide an authenticated agent endpoint to POST a structured training plan consisting of a horizon (days), a focus statement (markdown), optional notes, and a list of suggested problems (LeetCode problem id, slug, reason). Each problem entry MAY carry `carried_from` — the id of a plan item on an earlier plan that this item continues. A plan MAY declare `based_on` — the id of an earlier plan it revises. Referenced `carried_from` item ids and `based_on` plan ids MUST exist; invalid references SHALL be rejected. Plans are append-only: an accepted plan SHALL be stored and SHALL NOT be modifiable afterwards. Repeated agent runs create successive plans; the newest plan SHALL be the "current" plan.

#### Scenario: Agent posts a plan
- **WHEN** an authorized agent POSTs a well-formed plan with a horizon, focus, and at least one problem
- **THEN** the plan is stored and becomes the current plan, and the response identifies the created plan and its items

#### Scenario: Malformed plan rejected
- **WHEN** an agent POSTs a plan missing required fields, with no problems, or with unknown fields
- **THEN** the system rejects it with a validation error and stores nothing

#### Scenario: Successive plans
- **WHEN** an agent POSTs a new plan while older plans exist
- **THEN** the new plan is stored alongside them and becomes the current plan; older plans remain readable

#### Scenario: Chained revision of the previous plan
- **WHEN** an agent POSTs a plan declaring `based_on` with items that carry `carried_from` ids pointing at earlier plan items
- **THEN** the stored plan records those linkages and the response echoes them, so successive plans form an auditable chain

#### Scenario: Chaining references rejected
- **WHEN** an agent POSTs a plan whose `carried_from` or `based_on` id does not exist
- **THEN** the system rejects it with a validation error and stores nothing

### Requirement: Agents list training plans
The system SHALL provide an authenticated agent endpoint to list stored plans newest-first, including their items with problem references, reasons, and `carried_from` linkage where present, so a subsequent agent run can reconstruct adherence to past plans and continue unfinished ladders.

#### Scenario: Agent reads plan history
- **WHEN** an agent requests the plan list
- **THEN** it receives all stored plans, newest first, each with its items, their problem references, and carried-from linkage where declared
