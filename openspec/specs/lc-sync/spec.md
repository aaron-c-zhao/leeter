## Purpose

Keeps the local problem bank and submission history synchronized with leetcode.com, which serves as the authoritative source of problems and the final judge. Uses LeetCode's unofficial GraphQL endpoints with the user's session cookie; failures must degrade gracefully because the integration is inherently unofficial and fragile.

## Requirements

### Requirement: Problem bank synchronization
The system SHALL pull the LeetCode problem list and per-problem details (title, slug, difficulty, topic tags, description) from leetcode.com using the configured session credentials, and store them in the local database.

#### Scenario: Initial bank sync
- **WHEN** the user triggers an initial problem bank sync
- **THEN** the system stores the problem list with title, slug, difficulty, tags, and description, and the problem bank is browsable offline afterwards

#### Scenario: Refresh an existing bank
- **WHEN** a sync runs against an already-populated bank
- **THEN** existing problems are updated in place and no user-authored data (notes, sessions) is lost

### Requirement: Submission history ingestion
The system SHALL pull the user's submission history for a problem — including failed submissions — with code, verdict, timestamp, and runtime/memory results where LeetCode exposes them.

#### Scenario: Pulling submissions for a session
- **WHEN** the user requests a sync for a problem with new LeetCode submissions
- **THEN** all submissions since the last sync are retrieved, including non-accepted ones, with their code and verdicts attached to the corresponding session

#### Scenario: Idempotent re-sync
- **WHEN** a submission sync runs twice without new LeetCode activity in between
- **THEN** the second run creates no duplicate submissions or duplicate session entries

### Requirement: Graceful degradation on LeetCode unavailability
The system SHALL continue to operate (browsing, recording, notes, history) when LeetCode is unreachable or rejects requests, surfacing sync errors without losing locally recorded data.

#### Scenario: LeetCode rejects or times out
- **WHEN** a sync fails due to network error, expired session cookie, or LeetCode rejecting the request
- **THEN** the system reports the failure to the user, keeps previously synced data intact, and any session recording in progress is unaffected

#### Scenario: Expired session cookie detected
- **WHEN** LeetCode responds indicating authentication failure
- **THEN** the system reports that the session credential needs renewal rather than a generic error

### Requirement: Credential handling
The system MUST keep the LeetCode session credential out of source control, logs, and API responses.

#### Scenario: Credential never exposed
- **WHEN** any API response, log line, or error message is produced
- **THEN** the LeetCode session credential value does not appear in it
