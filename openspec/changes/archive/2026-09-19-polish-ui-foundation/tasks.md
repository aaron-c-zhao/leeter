## 1. Design foundation

- [x] 1.1 Create `web/src/styles/tokens.css` with CSS custom properties for color (light palette on `:root`, dark overrides on `:root[data-theme="dark"]`), spacing, type scale, radii, and shadows, including difficulty colors (Easy green / Medium amber / Hard red) and status/success/error tokens; verify the file defines both palettes with matching token names
- [x] 1.2 Create `web/src/styles/global.css` styling native elements (buttons, inputs, selects, tables, links, `marked` markdown output under both themes) and import both stylesheets in `web/src/main.tsx`; verify the app renders styled elements on every page and `npm run typecheck` passes
- [x] 1.3 Add the pre-render theme bootstrap script to `web/index.html` (read `localStorage`, set `data-theme` on `<html>`, try/catch default light) and a `ThemeProvider` context exposing `theme`/`toggle` in `web/src`; verify a component test covering default-light, toggle-to-dark (attribute flips, storage written), and stored-dark initialization
- [x] 1.4 Build the app shell in `App.tsx`: top nav with app name, links (Dashboard, Problem bank, History) with active-link styling, theme toggle button, page container; verify nav active state and toggle render in a component test
- [x] 1.5 Extract shared primitives into `web/src/components/` (Chip, Button with primary/secondary variants, Card, PageHeader, EmptyState) styled via global classes; verify component tests cover chip variants, button variants, and EmptyState's message + action link

## 2. Toast feedback

- [x] 2.1 Implement the module-level toast emitter (`toast.success`/`toast.error`) and `ToastHost` (stacked, auto-dismiss ~5s, click-to-dismiss) rendered once in the app shell; verify a component test covering emit → render → auto-dismiss and click-dismiss
- [x] 2.2 Route async-action outcomes through toasts on bank (sync bank, sync submissions, start session) and session detail (lifecycle actions, sync submissions, snapshot save, copy-out), keeping contextual inline indicators (unsaved-changes marker, notes saving state, per-item start errors); verify existing bank/session component tests updated and passing with toast feedback

## 3. Dashboard payload (server)

- [x] 3.1 Extend `getDashboard` in `server/sessions/service.ts` with additive `activeSession` (single non-finished session, newest first, with problem ref/status/activeMs/startedAt) and `recentSessions` (last 5 finished, newest first, plus finishedAt and derived outcome); verify unit tests covering active-vs-paused selection, no unfinished session, fewer than 5 finished, newest-first ordering, and that all existing payload fields are unchanged
- [x] 3.2 Swap hardcoded inline colors on untouched pages (session detail header/badges/diff, history, bank) for token CSS variables and pass the matching Monaco theme (`vs`/`vs-dark`) from the theme provider on the session page; verify those pages render correctly in both themes (manual check) and their existing component tests pass

## 4. Dashboard redesign

- [x] 4.1 Build the stat-cards row (sessions, solved with solve rate %, active time) using Card primitives; verify component test covers card values and solve-rate computation
- [x] 4.2 Build the current-plan card: focus/notes markdown, progress summary (solved/total), progress bar, days-left countdown (derived per design D8), item rows with difficulty colors, status chips, reasons, and Start buttons creating linked sessions; verify component tests cover mixed-status rendering, progress values, days-left, start-click API body with `planItemId`, and collapsed past-plans history
- [x] 4.3 Build the zero-filled activity chart (last 30 days, one bar per day, attempts vs solved visually distinct, hover with date/attempts/solved/active); verify component tests cover gap-day zero bars, solved-portion distinction, and the empty-history case
- [x] 4.4 Build tag distribution as ordered horizontal bars with solved counts; verify component test covers ordering and counts
- [x] 4.5 Build the Continue section: unfinished session (problem, status, active time, link) when present, recent finished sessions (newest-first with outcome links), and the no-sessions empty state guiding to the problem bank; verify component tests cover all three states
- [x] 4.6 Verify the dashboard against the new payload end-to-end (active session resume link navigates; recent sessions link to detail pages) and check rendered markdown (plan focus, reviews, notes) legibility in both light and dark themes

## 5. Final verification

- [x] 5.1 Run the full quality gates (`npm run typecheck`, `npm run test`, `npm run build`) and fix failures; verify all gates pass
- [x] 5.2 Update `README.md` if any user-facing behavior or screenshots/description changed; verify README reflects the theme toggle and dashboard sections
