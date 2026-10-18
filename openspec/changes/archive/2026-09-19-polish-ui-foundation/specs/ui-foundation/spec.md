## Purpose

The app-wide visual and interaction foundation for the leeter web UI: a token-based design system, the app shell (navigation and page container), light/dark theming with a persisted toggle, shared UI primitives, and toast feedback for async actions.

## ADDED Requirements

### Requirement: Design tokens and global styling
The system SHALL style all pages from a single token-based stylesheet: colors, spacing, typography, and radii defined once as CSS custom properties, with native elements (buttons, selects, inputs, tables, links) consistently styled globally. Scattered hardcoded colors in components SHALL be replaced by token references.

#### Scenario: Native elements are styled globally
- **WHEN** any page renders buttons, inputs, selects, or tables
- **THEN** they share one consistent visual treatment without per-page inline styling

#### Scenario: Difficulty colors follow the LeetCode convention
- **WHEN** a difficulty (Easy, Medium, Hard) is displayed anywhere in the app
- **THEN** it uses the shared token colors (green for Easy, amber for Medium, red for Hard) consistently across pages

### Requirement: App shell
The app SHALL present a persistent shell on every page: a top navigation bar with the app name, links to Dashboard, Problem bank, and History, and a page container bounding content width. The active navigation link SHALL be visually distinguished.

#### Scenario: Navigation identifies the current page
- **WHEN** the user is on the problem bank page
- **THEN** the "Problem bank" nav link is visually distinguished from the other links

### Requirement: Light/dark theme toggle
The app SHALL default to a light theme and offer a dark theme toggle. The choice SHALL persist across reloads (client-side storage) and SHALL apply without a full page reload. When the theme changes, the code editor on the session page SHALL switch to the matching editor theme.

#### Scenario: Toggling to dark theme
- **WHEN** the user activates the dark toggle
- **THEN** all styled surfaces switch to dark tokens immediately, the choice survives a page reload, and the session page's Monaco editor renders with its dark theme

#### Scenario: Returning with dark theme stored
- **WHEN** the app loads and the stored preference is dark
- **THEN** the app renders in dark theme from first paint without a visible light flash

### Requirement: Shared UI primitives
The system SHALL provide shared UI components used across pages: status/difficulty chips, button variants (primary and secondary), cards for grouped content, a page header, and empty states that explain the situation and offer a next action.

#### Scenario: Empty state with guidance
- **WHEN** a page renders no data (e.g. no sessions recorded yet)
- **THEN** it shows an empty state naming what is missing and linking the next action (e.g. going to the problem bank)

### Requirement: Toast feedback for async actions
The system SHALL report the outcome of user-triggered async actions (bank/submission sync, session lifecycle actions, starting a session) as transient toast notifications — success and failure — instead of ad-hoc inline text blocks. Multiple toasts SHALL be able to stack, and each SHALL dismiss automatically and on click.

#### Scenario: Sync failure reported as a toast
- **WHEN** a bank sync the user triggered fails
- **THEN** an error toast appears with the failure reason and dismisses automatically

#### Scenario: Success feedback is transient
- **WHEN** a submission sync completes successfully
- **THEN** a success toast summarizes the result and disappears without requiring a click
