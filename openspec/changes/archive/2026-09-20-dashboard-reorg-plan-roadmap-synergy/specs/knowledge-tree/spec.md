## MODIFIED Requirements

### Requirement: Roadmap page rendering
The app SHALL provide a Roadmap page reachable from the main navigation, rendering the taxonomy tree as collapsible domain sections containing topic nodes. On wide viewports the two curated domains (Data Structures, Algorithms) SHALL render side by side; on narrow viewports they SHALL stack vertically in roadmap order. The Other bucket SHALL render only when it has practice or frontier content. Each node SHALL display a mastery bar (solved/attempts ratio) with attempt and solved counts, and a "next focus" marker when the current plan targets that node. Nodes with carried unfinished plan items SHALL visibly flag them. The page SHALL show an empty state guiding the user to start practicing when no sessions exist.

#### Scenario: Browsing the roadmap
- **WHEN** the user opens the Roadmap page with practice history
- **THEN** each topic node shows a mastery bar with counts, and nodes targeted by the current plan are visually marked as next focus

#### Scenario: Domains use the screen width
- **WHEN** the Roadmap page renders on a wide viewport
- **THEN** the Data Structures and Algorithms domain sections appear side by side rather than stacked

#### Scenario: Carried items are visible
- **WHEN** a topic node has a current-plan item carried from a previous plan that is not solved
- **THEN** that node flags the carried item so the user sees unfinished ladder work

#### Scenario: Empty roadmap guidance
- **WHEN** the Roadmap page opens with no recorded sessions
- **THEN** an empty state names what is missing and links the next action (starting practice from the problem bank)

## ADDED Requirements

### Requirement: Startable plan frontier
The Roadmap page's frontier items SHALL offer a Start action with the same behavior as starting from the dashboard's plan display: clicking it creates a practice session linked to that plan item and navigates the user to the session page, preserving the plan-item provenance the agent consumes.

#### Scenario: Starting practice from the roadmap
- **WHEN** the user clicks Start on a frontier item of a not-started current-plan item
- **THEN** a session linked to that plan item is created and the user is navigated to the session detail page

#### Scenario: Frontier start preserves provenance
- **WHEN** a session is started from a roadmap frontier item
- **THEN** it is recorded with the same plan-item linkage as if started from the dashboard plan display

### Requirement: Topic deep link
The Roadmap page SHALL accept a link targeting a specific topic node; opening the page through such a link SHALL render that node's drill-down expanded so the user lands directly on that topic's practiced problems.

#### Scenario: Following a topic link from the dashboard
- **WHEN** the user follows a dashboard topic bar or plan-item topic chip that targets a topic node
- **THEN** the Roadmap page opens with that node's drill-down expanded and its problems listed
