## MODIFIED Requirements

### Requirement: App shell
The app SHALL present a persistent shell on every page: a top navigation bar with the app name, links to Dashboard, Problem bank, History, and Roadmap, and a page container bounding content width to a wide desktop layout — fluid with the viewport up to a fixed maximum (~1600px) — so multi-column pages use the available screen width. The active navigation link SHALL be visually distinguished.

#### Scenario: Navigation identifies the current page
- **WHEN** the user is on the problem bank page
- **THEN** the "Problem bank" nav link is visually distinguished from the other nav links

#### Scenario: Wide viewports utilize screen width
- **WHEN** the app renders on a wide desktop viewport (e.g. a 16-inch laptop or 4K monitor)
- **THEN** the page container expands with the viewport up to its bounded maximum instead of stopping at a narrow fixed width
