## Purpose

The dashboard home page: a Next up strip that answers "what should I work on right now?", the current plan, and the record of past practice (totals, a truthful activity chart, curated topic distribution, recent results) organized into functional sections.

## Requirements

### Requirement: Dashboard summary stat cards
The dashboard SHALL show summary statistics — total sessions recorded, total solved (with solve rate percentage), and total active time — as a compact summary strip at the top of the record section rather than three separate large cards.

#### Scenario: Viewing the dashboard with recorded history
- **WHEN** the user opens the dashboard with past sessions
- **THEN** the stat strip displays session count, solved count with solve rate, and total active time in one compact row

### Requirement: Current plan progress display
When a current plan exists, the dashboard SHALL display it in the plan section with the plan's focus (rendered markdown), a progress summary (solved count out of total items), a visual progress bar, and the number of days remaining in the plan's horizon. Each plan item SHALL show title, difficulty (with shared difficulty colors), reason, derived status chip, the curated topics the item's problem trains (as chips linking to the corresponding roadmap topic node with its drill-down expanded), and a Start button that creates a session linked to that plan item and navigates to it. Long item lists SHALL cap the visible rows with an inline control to show all items. Past plans SHALL remain viewable in a collapsed history with their items and statuses.

#### Scenario: Current plan with mixed item statuses
- **WHEN** the dashboard loads with a current plan containing solved, practiced, and not-started items
- **THEN** the plan section shows the progress summary and bar reflecting the solved ratio, days left in the horizon, and each item with its status chip

#### Scenario: Starting a session from a plan item
- **WHEN** the user clicks Start on a not-started plan item
- **THEN** a session is created linked to that plan item and the user is navigated to the session page

#### Scenario: Plan items show the topics they train
- **WHEN** a plan item's problem tags map to one or more curated topic nodes
- **THEN** the item displays a chip per topic, and each chip links to the roadmap view with that topic node's drill-down expanded

#### Scenario: Long plan lists cap with show-all
- **WHEN** the current plan contains more items than the visible cap
- **THEN** the item list shows the capped rows plus an inline control that reveals the remaining items

#### Scenario: No current plan
- **WHEN** the dashboard loads with no plans stored
- **THEN** the plan section is absent or shows an empty state without errors

### Requirement: Truthful activity chart
The dashboard SHALL render practice activity as a bar chart over time where every day in the displayed range appears — including days with zero activity — with attempts and solved counts visually distinguished per day, and active time available per day.

#### Scenario: Gap days are visible
- **WHEN** the user practiced on Monday and Friday but not Tuesday through Thursday
- **THEN** the activity chart renders zero-height bars for the skipped days rather than omitting them

#### Scenario: Distinguishing attempts from solves
- **WHEN** a day has 3 attempts of which 1 was accepted
- **THEN** the day's bar visually distinguishes the solved portion from the remaining attempts

### Requirement: Next up action
The dashboard SHALL surface the single most actionable item as a full-width strip at the top of the page, chosen by precedence: the unfinished (active or paused) session with a resume link, else a current-plan carried unsolved item with a Start action, else the first not-started current-plan item with a Start action, else guidance to start practicing from the problem bank.

#### Scenario: Unfinished session takes precedence
- **WHEN** the dashboard loads with a paused or active session and a current plan
- **THEN** the Next up strip shows that session with its status, accumulated active time, and a link to resume it, rather than a plan item

#### Scenario: Carried item is the next action
- **WHEN** there is no unfinished session and the current plan contains a carried unsolved item
- **THEN** the Next up strip shows that item with a Start action, ahead of plain not-started items

#### Scenario: Nothing actionable
- **WHEN** there is no unfinished session and no current plan
- **THEN** the Next up strip shows guidance linking to the problem bank

### Requirement: Topic distribution bars
The dashboard SHALL display practice distribution by curated topic (the shared taxonomy, including the Other bucket) as horizontal bars ordered by attempts, showing attempts and solved counts per topic. Each topic bar SHALL link to the roadmap view with that topic node's drill-down expanded, so the dashboard's record and the roadmap share one vocabulary.

#### Scenario: Viewing topic distribution
- **WHEN** the dashboard loads with practice history
- **THEN** curated topics render as horizontal bars ordered by attempts with solved counts shown, and following a bar opens the roadmap focused on that topic

#### Scenario: Unmapped practice lands in Other
- **WHEN** practice exists whose tags map to no curated topic node
- **THEN** it is represented under the Other topic bar rather than omitted

### Requirement: Sectioned two-column dashboard layout
The dashboard SHALL organize its content into three functional sections: a full-width Next up strip; the plan section (current plan and past plans); and the record section (the stat strip, the activity chart, topic distribution bars, and the recent finished results list). On wide viewports the plan and record sections SHALL render side by side (plan left, record right); on narrow viewports they SHALL collapse to a single-column stack in the same order.

#### Scenario: Wide viewport uses two columns
- **WHEN** the dashboard renders on a wide viewport
- **THEN** the plan and record sections appear side by side, with the Next up strip spanning the full width above them

#### Scenario: Narrow viewport collapses to one column
- **WHEN** the dashboard renders on a narrow viewport
- **THEN** the sections stack vertically in a single column without horizontal overflow

#### Scenario: Recent results live in the record section
- **WHEN** the dashboard loads with finished sessions
- **THEN** the record section lists recent finished sessions newest-first with outcome and links to their detail pages
