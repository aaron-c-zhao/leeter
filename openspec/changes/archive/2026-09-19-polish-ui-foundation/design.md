## Context

The web app (`web/src/`) is React 18 + react-router 6 with four pages and zero stylesheets — every visual is an inline `style={{...}}` object, ~12 ad-hoc hardcoded colors. Monaco (`@monaco-editor/react`) is the only polished surface. Component tests (`@testing-library/react` in `test/web-*.test.tsx`) query by role and text, not styling. The dashboard payload comes from `getDashboard` in `server/sessions/service.ts` (`totals`, `daily`, `tags`, `plan`, `pastPlans`) and is rendered by `DashboardPage.tsx` as bare tables. The project has a deliberate minimal-dependency ethos (no CSS system, no UI library, thin agent integration).

## Goals / Non-Goals

**Goals:**
- A token-based design system usable by all future pages, proven on the dashboard (pilot page).
- Light-default/dark-toggle theming that stays in sync with the Monaco editor theme.
- Additive dashboard payload extension (`activeSession`, `recentSessions`) without touching existing fields or the agent API.

**Non-Goals:**
- Layout/UX redesign of bank, history, and session-detail pages (follow-up change; they only inherit the global stylesheet and Monaco theme hookup).
- Charting or component libraries, CSS frameworks, runtime dependencies of any kind.
- Server-side rendering of theme preference (client-side storage only).
- Auth, multi-user, or mobile-specific layouts (responsive flex-wrap behavior is kept as-is).

## Decisions

### D1: Hand-rolled CSS with custom properties — no framework or library
One `tokens.css` (CSS custom properties: colors, spacing, type scale, radii, shadows) plus one `global.css` (native-element styling: buttons, inputs, selects, tables, links) imported once in `main.tsx`. Alternatives: Tailwind (adds build dependency and a utility-class migration across four files for little gain at this size), component libraries (heavy, visually fight Monaco, and impose markup that breaks role/text-based component tests). Hand-rolled CSS matches the project's DIY ethos and keeps `dist` output dependency-free.

### D2: Theming via `data-theme` attribute on `<html>`, bootstrapped before React renders
Token files define two palettes: `:root` holds light values, `:root[data-theme="dark"]` overrides them. A small inline script in `web/index.html` reads `localStorage` and sets `data-theme` before the React root renders — this avoids a light-flash on reload in dark mode (spec requirement). A `ThemeProvider` context in React exposes `theme` + `toggle()`; toggling flips the attribute and writes storage. No `prefers-color-scheme` auto-detection in v1: light is the stated default; auto-detection would fight an explicit user choice and can be added later as a "system" option.

### D3: Monaco theme follows the React theme
`SessionDetailPage` passes `theme={theme === "dark" ? "vs-dark" : "vs"}` to the Monaco `Editor`. The `@monaco-editor/react` component handles theme switching live. The session page is *not* redesigned in this change — it receives only this hookup plus swapping inline hex colors for CSS variables (`var(--color-...)`) so it participates in dark mode correctly. (A hardcoded color there would otherwise leave the page half-light in dark mode — worse than no polish.)

### D4: Shared primitives as plain function components in `web/src/components/`
`Chip`, `Button` (primary/secondary via `className`), `Card`, `PageHeader`, `EmptyState`, `Toast`/`ToastHost`. Styled via global classes from the token stylesheet — components stay presentational, no CSS-in-JS. Existing inline-styled equivalents (status chips, "from plan" badge) migrate to these primitives so colors consolidate into tokens.

### D5: Toast system as a module-level pub/sub with a `ToastHost` in the app shell
A `toast` module exposing `toast.success(msg)` / `toast.error(msg)` and a `ToastHost` component rendered once in `App.tsx` (fixed position, stacked, auto-dismiss ~5s, click-to-dismiss, exit animation). Module-level emitter rather than React context: call sites are plain async handlers (`syncBankNow`, `lifecycle`, `startSession`) that don't want a hook dependency; the host subscribes. Alternative considered: context-based — rejected because several call sites are outside any convenient provider nesting and the emitter is simpler to test. Errors that are *contextual* (e.g. "unsaved changes" marker, per-item start-button failure) stay inline; toasts are for async action outcomes, per the spec.

### D6: Dashboard payload: additive `activeSession` + `recentSessions` in `getDashboard`
`activeSession`: the single non-finished session (active or paused) if one exists, newest first — `{ id, problem {id, title, slug, difficulty}, startedAt, activeMs, status }`. `recentSessions`: the last 5 finished sessions newest-first with the same shape plus `finishedAt` and `outcome` (derived as in the history list). Chosen shapes mirror existing `SessionRow` fields so the UI reuses one row component. The existing N+1 accepted-count query pattern in `getDashboard` is untouched — performance is out of scope for this change (noted as a follow-up risk).

### D7: Activity chart = zero-filled bar chart rendered as CSS, last 30 days
The dashboard's `daily` array is sparse. The component zero-fills the range between `today - 29d` and `today` (or the first session date if history is shorter) client-side, rendering one bar per day via divs with token colors: attempt height proportional to max, solved portion visually distinct (darker/lighter segment or stacked segment). Last-30-days window (vs all-time) is chosen because all-time grows unboundedly; hover shows date, attempts, solved, active time. Tag bars: same technique, horizontal, width proportional to max tag session count. No SVG/canvas needed.

### D8: Plan progress derived client-side
`daysLeft = max(0, ceil((createdAt + horizonDays*86400000 - now) / 86400000))`; progress = solved items / total items. No server change needed — both derive from fields already in the payload (`training-plans` capability already delivers `createdAt`, `horizonDays`, per-item `status`).

## Risks / Trade-offs

- [Dark-mode contrast across markdown content (plan focus, notes, reviews) may look wrong] → style `marked` output globally in `global.css` under both themes; review rendered markdown in both themes as an explicit task.
- [Global stylesheet restyles native elements on untouched pages, possibly breaking their component tests' layout assumptions] → run the full `npm run test`; adjust only markup-affecting expectations, and keep bank/history layouts otherwise identical.
- [Theme flash on first load if the inline bootstrap script fails] → script is one line with a try/catch default to light; worst case matches today's behavior (light).
- [`getDashboard` N+1 accepted-count queries get slightly heavier with new fields] → accepted for now (single-user local app, small data); note as follow-up optimization, out of scope.
- [Monaco theme prop mismatch if provider mounts late] → provider reads the already-set `data-theme` at init (the bootstrap script guarantees it), so first render is correct.

## Migration Plan

No data migration. Deploy is a normal build; `data-theme` and `localStorage` are additive client-side only. Rollback = revert the change; dashboard payload additions are additive so older UI works against newer server and vice versa.

## Open Questions

- Toast auto-dismiss duration (5s placeholder) and stacking limit — tune during implementation; no spec impact.
- Exact stat-card fourth slot (streak was sketched but is client-derivable and optional) — decide during implementation; the spec requires only sessions/solved-rate/active-time.
