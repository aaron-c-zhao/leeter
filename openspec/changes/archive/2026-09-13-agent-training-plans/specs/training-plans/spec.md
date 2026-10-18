## Purpose

Agent-submitted training plans: an external agent proposes what problems to focus on next, the app stores and displays the plan on the dashboard, and planned problems can be turned into practice sessions with recorded provenance.

## ADDED Requirements

### Requirement: Agents submit training plans
The system SHALL provide an authenticated agent endpoint to POST a structured training plan consisting of a horizon (days), a focus statement (markdown), optional notes, and a list of suggested problems (LeetCode problem id, slug, reason). Plans are append-only: an accepted plan SHALL be stored and SHALL NOT be modifiable afterwards. Repeated agent runs create successive plans; the newest plan SHALL be the "current" plan.

#### Scenario: Agent posts a plan
- **WHEN** an authorized agent POSTs a well-formed plan with a horizon, focus, and at least one problem
- **THEN** the plan is stored and becomes the current plan, and the response identifies the created plan and its items

#### Scenario: Malformed plan rejected
- **WHEN** an agent POSTs a plan missing required fields, with no problems, or with unknown fields
- **THEN** the system rejects it with a validation error and stores nothing

#### Scenario: Successive plans
- **WHEN** an agent POSTs a new plan while older plans exist
- **THEN** the new plan is stored alongside them and becomes the current plan; older plans remain readable

### Requirement: Agents list training plans
The system SHALL provide an authenticated agent endpoint to list stored plans newest-first, including their items with problem references and reasons, so a subsequent agent run can reconstruct adherence to past plans.

#### Scenario: Agent reads plan history
- **WHEN** an agent requests the plan list
- **THEN** it receives all stored plans, newest first, each with its items and their problem references

### Requirement: Agents read the problem bank
The system SHALL provide an authenticated agent endpoint to list the cached problem bank (id, title, slug, difficulty, tags) so the planner can propose problems beyond those already practiced.

#### Scenario: Agent lists bank problems
- **WHEN** an agent requests the problem list
- **THEN** it receives the cached bank entries with their metadata, without triggering a LeetCode sync

### Requirement: Sessions carry plan provenance
When a practice session is created from a plan item, the system SHALL record the originating plan item on the session. Multiple sessions MAY reference the same plan item. Sessions created outside the plan flow SHALL have no plan provenance.

#### Scenario: Start a session from a plan
- **WHEN** the user starts a session from a plan item
- **THEN** the created session references that plan item

#### Scenario: Session started outside the plan
- **WHEN** the user starts a session without plan context
- **THEN** the session is created with no plan reference

### Requirement: Current plan display with derived status
The system SHALL display the current plan on the dashboard: its focus and notes, and each item with its problem reference, reason, and a status derived from the sessions linked to it — solved (at least one linked session with an Accepted verdict), practiced (linked sessions exist, none Accepted), or not started (no linked sessions). Each item SHALL offer an action to start a practice session on its problem. Past plans SHALL be viewable in a collapsed history.

#### Scenario: Solved item
- **WHEN** the user opens the dashboard and a plan item has a linked session whose LeetCode verdict is Accepted
- **THEN** that item shows a solved status

#### Scenario: Practiced but unsolved item
- **WHEN** a plan item has linked sessions but no Accepted verdict among them
- **THEN** that item shows a practiced status

#### Scenario: Untouched item
- **WHEN** a plan item has no linked sessions
- **THEN** that item shows a not-started status

#### Scenario: Start session from the dashboard
- **WHEN** the user activates the start action on a plan item
- **THEN** a practice session is created for that item's problem with the plan provenance recorded, and the user is taken to the session detail view

#### Scenario: Past plans remain viewable
- **WHEN** the user expands the past-plans history on the dashboard
- **THEN** older plans are listed with their items and statuses

### Requirement: Plan provenance visible on sessions
The system SHALL indicate on a session's detail view that the session originated from a plan item when such provenance exists.

#### Scenario: Session from plan shows badge
- **WHEN** the user opens a session that references a plan item
- **THEN** the session detail view shows its plan origin
