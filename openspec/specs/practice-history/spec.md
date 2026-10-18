## Purpose

The user-facing memory of practice: browsing past sessions with their timelines, notes, LeetCode outcomes, and agent reviews — the record the user relies on and that gives agents their history.

## Requirements

### Requirement: Session history browsing
The system SHALL provide a history view listing past sessions with problem, date, duration, outcome (from LeetCode verdicts), and review status, filterable by problem, difficulty, tags, date range, and outcome.

#### Scenario: Filter history by tag and outcome
- **WHEN** the user filters history by a topic tag and an outcome
- **THEN** only matching sessions are listed with their metadata

### Requirement: Session detail view
The system SHALL let the user open a session and see its full timeline — snapshots, events, submissions with verdicts — plus notes and any agent reviews, with the ability to view snapshot diffs over time.

#### Scenario: Reviewing a past session
- **WHEN** the user opens a finished session in the history
- **THEN** the full event timeline, notes, LeetCode submission outcomes, and any agent reviews are shown

#### Scenario: Comparing snapshots
- **WHEN** the user selects two snapshots in a session
- **THEN** the system shows the differences between them

### Requirement: Review visibility
The system SHALL display agent reviews on the session detail view as they arrive, including reviews posted while the user is not viewing the page (visible on next load).

#### Scenario: Review posted after session end
- **WHEN** an agent POSTs a review for a session the user finished yesterday
- **THEN** the review appears on that session's detail page on the next visit

### Requirement: Dashboard summary
The system SHALL provide a summary view of practice activity (e.g., problems attempted/solved over time, time spent, tag distribution) computed from recorded sessions.

#### Scenario: Viewing weekly activity
- **WHEN** the user opens the dashboard
- **THEN** it shows recent practice volume and outcome trends derived from session data
