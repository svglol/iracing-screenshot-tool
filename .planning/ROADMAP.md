# Roadmap: iRacing Screenshot Tool

## Milestones

- ✅ **v1.2 Feature Enhancements** — Phases 1-2 (shipped 2026-04-20 via PR #25)
- 🚧 **v1.3 UI Refresh** — Phases 3-4 (in progress, started 2026-04-21)

## Phases

<details>
<summary>✅ v1.2 Feature Enhancements (Phases 1-2) — SHIPPED 2026-04-20</summary>

- [x] Phase 1: Filename Format Configurator — delivered via quick task `260403-evq` (2026-04-03, 7/7 verified)
- [x] Phase 2: Discord Bug & Feature Tracker Bot — 10 plans, shipped via PR #25, 294 bot tests passing

</details>

### 🚧 v1.3 UI Refresh (Phases 3-4) — IN PROGRESS

- [ ] **Phase 3: UI Dependency Refresh** — Font Awesome 5 → 7 + Bulma 0.9 → 1.0 (user-visible)
- [ ] **Phase 4: Prettier 3 Codebase Reformat** — Prettier 2 → 3 (developer-facing, single-requirement phase)

---

## Phase Details — v1.3

### Phase 3: UI Dependency Refresh

**Goal:** Upgrade the user-visible UI dependency stack (Font Awesome 5 → 7, Bulma 0.9 → 1.0) with zero visual regressions while enabling future dark-mode support.

**Requirements:** UI-01, UI-02

**Depends on:** None

**Success criteria:**
1. All icons in the Vue UI continue to render correctly after Font Awesome 7 upgrade — no missing/broken glyphs across every route and component.
2. Visual parity with v1.2 after Bulma 1.0 migration (or intentional style updates are documented) — confirmed via manual UAT across Settings, Gallery, and Capture views.
3. `bulma-pro` 0.1.8 integrates cleanly with Bulma 1.0 OR is removed with a documented replacement (pure Bulma 1.0 themes, or no replacement needed).
4. App runs in `npm run dev` and in a production `electron-builder` install without console errors/warnings originating from FA7 or Bulma 1.0.
5. Bundle size does not regress meaningfully (tolerance: ≤ 10% increase, ideally a decrease).

### Phase 4: Prettier 3 Codebase Reformat

**Goal:** Upgrade Prettier 2 → 3 and reformat the codebase in a single commit for clean git blame, without changing runtime behavior.

**Requirements:** TOOL-01

**Depends on:** Phase 3 (avoids a conflict between the Prettier reformat and FA/Bulma SFC changes)

**Success criteria:**
1. `npm run prettier` completes cleanly on the entire codebase using Prettier 3.3; the reformat is captured as a single `format: prettier 3` commit for clean blame.
2. `npm run lint` passes with the Prettier-3-compatible ESLint plugin versions (`eslint-config-prettier`, `eslint-plugin-prettier` may need minor bumps to their v3-compatible lines); no new warnings introduced.
3. `npm run build` produces a working production build post-reformat; manual smoke test of a screenshot capture round-trips successfully.

---

## Next Milestone Candidates

Seeded for future pickup (see `.planning/seeds/`):
- **v1.4 Tooling Modernization** — TypeScript 5 + ESLint 9 flat config (trigger: after v1.3 ships)
- **v2.0 Vue 3 Migration** — Vue 3 + buefy replacement + Vite + Electron (trigger: after v1.4 or on Vue 2 CVE)

Run `/gsd-new-milestone` after v1.3 completion.
