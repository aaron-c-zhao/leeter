## Purpose

Captures the solving process — not just outcomes — for a practice session: draft-pad code snapshots, timing, notes, and stitched-in LeetCode submissions. This recorded process is the raw material agent reviews are built on.

## Requirements

### Requirement: Session lifecycle
The system SHALL let the user start, pause, and finish a practice session tied to one problem, tracking elapsed active time.

#### Scenario: Start and finish a session
- **WHEN** the user starts a session on a problem and finishes it later
- **THEN** the session is stored with its problem, start/end times, and accumulated active time excluding paused periods

### Requirement: Draft pad snapshot recording
The system SHALL provide an in-app draft editor that records a code snapshot each time the user saves or submits from the pad, with a timestamp and optional label, and without executing any code.

#### Scenario: Snapshot on save
- **WHEN** the user edits code in the draft pad and saves (manually or by autosave)
- **THEN** a timestamped snapshot of the full code is appended to the session, and the user can view the snapshot timeline afterwards

#### Scenario: No execution in the draft pad
- **WHEN** the user works in the draft pad
- **THEN** the app never runs the code locally; judging happens only via LeetCode

### Requirement: Notes during and after a session
The system SHALL let the user attach and edit markdown notes to a session at any time, including after the session has ended.

#### Scenario: Note during session
- **WHEN** the user types notes during an active session
- **THEN** the notes are persisted incrementally and survive a page reload or app restart

### Requirement: Stitching LeetCode submissions into the session
The system SHALL associate LeetCode submissions pulled for the session's problem with the session in chronological order alongside draft-pad events.

#### Scenario: Submission appears in the session timeline
- **WHEN** a session is synced after the user submitted on LeetCode
- **THEN** each submission (verdict, code, timestamp, runtime where available) appears as an event in the session timeline ordered with the draft-pad events

### Requirement: Manual copy-out to LeetCode
The system SHALL let the user copy the current draft-pad code to the clipboard for submission on leetcode.com.

#### Scenario: Copy draft for submission
- **WHEN** the user clicks copy-out during a session
- **THEN** the current draft code is placed on the clipboard unchanged, and the copy event is recorded in the session timeline
