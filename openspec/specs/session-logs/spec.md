## Purpose

Defines the versioned JSONL session log format and its storage — the stable contract between the app and any agent harness. Agents consume logs through the agent API; the format is designed to be explained once in an agent prompt and remain backward-compatible.

## Requirements

### Requirement: Session log format
The system SHALL serialize each session as a versioned JSONL document containing session metadata, problem metadata, and a chronological event list (problem opened, snapshots, test/copy events, notes changes, submissions with verdicts).

#### Scenario: Log is well-formed and versioned
- **WHEN** an agent fetches a session log
- **THEN** it receives JSONL whose header declares a schema version, followed by one JSON object per event, each with a timestamp offset and event type

#### Scenario: Snapshots carry full code state
- **WHEN** the log contains a code snapshot event
- **THEN** the event includes the complete code at that moment (not a diff-only view) so agents need no reconstruction logic

### Requirement: Log immutability and stability
The system SHALL treat published session log events as append-only: once emitted, past events for a session are not rewritten; late-arriving data (e.g., a LeetCode submission pulled after session end) is appended as a new event.

#### Scenario: Late submission arrives after session end
- **WHEN** a LeetCode submission is synced after the session was finished
- **THEN** it is appended to the session's log as a new event and previously emitted events are unchanged

### Requirement: Log availability to agents
The system SHALL make every finished (and, when requested, in-progress) session log retrievable in the documented format via the agent API.

#### Scenario: Agent fetches a specific session
- **WHEN** an authorized agent requests the log for a session id
- **THEN** it receives the complete log for that session in the documented format

### Requirement: Schema evolution
The system MUST version the log schema and remain able to serve logs written under older schema versions, documenting any field changes between versions.

#### Scenario: Older log still served
- **WHEN** a session log was written under an older schema version and a new version is introduced
- **THEN** the older log remains retrievable with its original version marker intact
