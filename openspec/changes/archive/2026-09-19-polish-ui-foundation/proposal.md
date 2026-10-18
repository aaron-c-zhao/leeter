## Why

The web UI is functional but entirely unstyled: no stylesheet exists, every visual is an inline style object, colors are ~12 ad-hoc hex values, and the dashboard — the app's home page and richest data surface — renders its data as bare tables with misleading sparse "bar charts" that hide skipped days. For a practice tool the user lives in daily (the session page hosts an hour-long workflow), the gap between Monaco's polish and the surrounding 1995-form look is jarring, and the dashboard cannot answer the only question that matters on open: "what should I work on right now?"

## What Changes

- Introduce a design-token stylesheet (CSS custom properties for color, spacing, typography, radii) and an app shell: styled top navigation with app identity, page container, and consistent native-element styling (buttons, selects, inputs, tables, links) via a global stylesheet.
- Add a light-default / dark theme toggle persisted in `localStorage`, applied as `data-theme` on `<html>`; the Monaco editor on the session page switches between `vs` and `vs-dark` to match the active theme.
- Extract shared UI primitives (Chip, Button variants, Card, PageHeader, EmptyState) and a global toast feedback system that replaces ad-hoc inline success/error text for async actions (syncs, session start, lifecycle actions).
- Redesign the dashboard as the pilot page: stat cards (sessions, solved with solve rate, active time), current-plan card with progress (x/y solved, percent bar, days-left countdown), a zero-filled activity bar chart distinguishing attempts from solved, tag distribution as horizontal bars, and consistent difficulty coloring (LeetCode green/amber/red).
- Add a "Continue" section to the dashboard showing the single unfinished (active/paused) session with a resume affordance and recent finished sessions. The dashboard API payload gains `activeSession` and `recentSessions` fields — additive only, no existing fields change.
- Consolidate scattered hardcoded colors into the token system app-wide where components already exist (e.g. status chips, diff coloring, the "from plan" badge).

Non-goals (explicitly deferred to a follow-up change):
- Layout/UX redesign of the problem bank, history, and session-detail pages (they only inherit the global stylesheet and the Monaco/theme hookup).
- Any change to the agent-facing API, agent protocol, or data model beyond the additive dashboard payload fields.
- Charting libraries, component libraries, or any new runtime dependency.

## Capabilities

### New Capabilities
- `ui-foundation`: The app-wide visual and interaction foundation — design tokens, app shell (navigation, page container), light/dark theming with persisted toggle, shared UI primitives, and toast feedback for async actions.
- `dashboard`: The redesigned dashboard home page — stat cards, current-plan progress display, zero-filled activity chart, tag distribution bars, and the Continue section (resume unfinished session, recent sessions).

### Modified Capabilities

(None — existing capabilities' requirements are unchanged. The dashboard payload addition touches the training-plans display surface but introduces no requirement change to plan submission, listing, or provenance behavior.)

## Impact

- **Web app** (`web/src/`): `App.tsx` (app shell, theme provider/toggle), `main.tsx` (stylesheet import, theme bootstrap), new `styles/tokens.css` + `styles/global.css`, new shared components directory, `pages/DashboardPage.tsx` fully redesigned, `pages/SessionDetailPage.tsx` receives only the Monaco theme hookup and token-based colors.
- **Server** (`server/sessions/service.ts`, `server/routes/ui.ts`): `getDashboard` gains `activeSession` and `recentSessions` (additive).
- **Tests**: `test/dashboard.test.ts` (payload cases), `test/web-dashboard.test.tsx` (redesigned page), new component tests for shared primitives and the theme toggle; existing bank/history/session component tests adjusted only where global element styling changes markup expectations.
- **Dependencies**: none added or removed.
