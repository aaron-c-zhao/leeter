## Purpose

The roadmap knowledge tree: a curated topic taxonomy rendered as a visual tree of what has been practiced (per-node mastery) and where practice will focus next (the current plan's frontier), powered by the same aggregation as the agent progress digest.

## ADDED Requirements

### Requirement: Curated topic taxonomy
The system SHALL maintain a curated, versioned topic taxonomy as seed data: a two-level tree of topic nodes grouped into domains (Data Structures, Algorithms), each topic node mapping a set of LeetCode tag slugs to itself, ordered as a recommended learning roadmap. Problems SHALL inherit membership of every topic node their tags map to; tags matching no node SHALL fall into an explicit "Other" bucket. The seed SHALL NOT require per-problem curation and SHALL be extendable without schema changes.

#### Scenario: Problem inherits topic membership
- **WHEN** a problem is tagged `array` and `hash-table`, and both tags map to the arrays-and-hashing topic node
- **THEN** the problem counts toward that topic node's practice aggregates

#### Scenario: Unmapped tags land in the Other bucket
- **WHEN** a problem's tags map to no curated topic node
- **THEN** its practice aggregates appear under the "Other" bucket rather than being omitted

#### Scenario: Digest and roadmap share one grouping
- **WHEN** the progress digest is computed after the taxonomy lands
- **THEN** its per-topic keys are the curated topic node ids, produced by the same aggregation used by the roadmap tree

### Requirement: Roadmap tree data
The system SHALL expose a UI endpoint returning the taxonomy tree enriched per topic node with mastery aggregates (attempts, solved, solve rate, last-practiced timestamp) derived from recorded sessions, and the current-plan frontier: plan items whose problem tags map to that node, each with its derived status and `carried_from` linkage, so the tree shows both what has been practiced and where the current plan focuses next. Calling it SHALL NOT trigger a LeetCode sync.

#### Scenario: Tree with mastery and frontier
- **WHEN** the user has practiced problems under some topics and a current plan targets others
- **THEN** the roadmap payload lists domains in roadmap order, each topic node carrying its mastery aggregates and the plan items targeting it with statuses and carried linkage

#### Scenario: Empty roadmap state
- **WHEN** no sessions and no plans exist
- **THEN** the payload returns the full taxonomy tree with zeroed mastery, no frontier items, and no error

### Requirement: Roadmap page rendering
The app SHALL provide a Roadmap page reachable from the main navigation, rendering the taxonomy tree as collapsible domain sections containing topic nodes. Each node SHALL display a mastery bar (solved/attempts ratio) with attempt and solved counts, and a "next focus" marker when the current plan targets that node. Nodes with carried unfinished plan items SHALL visibly flag them. The page SHALL show an empty state guiding the user to start practicing when no sessions exist.

#### Scenario: Browsing the roadmap
- **WHEN** the user opens the Roadmap page with practice history
- **THEN** each topic node shows a mastery bar with counts, and nodes targeted by the current plan are visually marked as next focus

#### Scenario: Carried items are visible
- **WHEN** a topic node has a current-plan item carried from a previous plan that is not solved
- **THEN** that node flags the carried item so the user sees unfinished ladder work

#### Scenario: Empty roadmap guidance
- **WHEN** the Roadmap page opens with no recorded sessions
- **THEN** an empty state names what is missing and links the next action (starting practice from the problem bank)

### Requirement: Topic node drill-down
The system SHALL let the user expand a topic node to see the problems practiced under it, newest-practiced first, each showing title, difficulty, derived outcome, and a link to the practice session detail when a session exists.

#### Scenario: Expanding a practiced topic node
- **WHEN** the user expands a topic node with practice history
- **THEN** recently practiced problems are listed with title, difficulty, and outcome, linking to their session detail views

#### Scenario: Expanding an untouched topic node
- **WHEN** the user expands a topic node with no practice history
- **THEN** the drill-down shows that nothing has been practiced here yet, without error
