## Purpose

The dashboard home page: at-a-glance practice totals, current-plan progress, a truthful activity chart, tag distribution, and a Continue section that answers "what should I work on right now?"

## ADDED Requirements

### Requirement: Dashboard summary stat cards
The dashboard SHALL show summary statistics as cards: total sessions recorded, total solved (with solve rate percentage), and total active time.

#### Scenario: Viewing the dashboard with recorded history
- **WHEN** the user opens the dashboard with past sessions
- **THEN** stat cards display session count, solved count with solve rate, and total active time

### Requirement: Current plan progress display
When a current plan exists, the dashboard SHALL display it as a card with the plan's focus (rendered markdown), a progress summary (solved count out of total items), a visual progress bar, and the number of days remaining in the plan's horizon. Each plan item SHALL show title, difficulty (with shared difficulty colors), reason, derived status chip, and a Start button that creates a session linked to that plan item and navigates to it. Past plans SHALL remain viewable in a collapsed history with their items and statuses.

#### Scenario: Current plan with mixed item statuses
- **WHEN** the dashboard loads with a current plan containing solved, practiced, and not-started items
- **THEN** the plan card shows the progress summary and bar reflecting the solved ratio, days left in the horizon, and each item with its status chip

#### Scenario: Starting a session from a plan item
- **WHEN** the user clicks Start on a not-started plan item
- **THEN** a session is created linked to that plan item and the user is navigated to the session page

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

### Requirement: Tag distribution bars
The dashboard SHALL display practice tag distribution as horizontal bars ordered by session count, showing sessions and solved counts per tag.

#### Scenario: Viewing tag distribution
- **WHEN** the dashboard loads with tagged practice history
- **THEN** tags render as horizontal bars ordered by session count with solved counts shown

### Requirement: Continue section
The dashboard SHALL surface the user's most actionable work: the single unfinished (active or paused) session, if any, with its problem, accumulated active time, status, and a link to resume it; plus the most recent finished sessions with problem, date, outcome, and links to their detail pages. When there is no unfinished session, the Continue section SHALL present recent finished sessions and, if no sessions exist at all, guidance to start one. The dashboard API payload SHALL include these fields additively without altering existing fields.

#### Scenario: Resuming an unfinished session
- **WHEN** the user opens the dashboard while a session is paused
- **THEN** the Continue section shows that session with its status and active time, and clicking it navigates to the session page where it can be resumed

#### Scenario: Recent finished sessions listed
- **WHEN** the user opens the dashboard after finishing sessions
- **THEN** recent finished sessions are listed newest-first with outcome and link to each session's detail page

#### Scenario: New user with no sessions
- **WHEN** the dashboard loads with no sessions recorded
- **THEN** the Continue section guides the user to the problem bank to start a first session
