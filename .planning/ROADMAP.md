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

- [x] **Phase 3: Font Awesome v5 → v6 Upgrade** — FA core 1.2 → 6, free-solid/brands 5 → 6, vue-fontawesome 0.1 → 2 (completed 2026-04-21 — commits `ae2627b` chore(deps) + `b5ecc32` refactor(icons))
- [ ] **Phase 4: Prettier 3 Codebase Reformat** — Prettier 2 → 3 (developer-facing, single-requirement phase)

---

## Phase Details — v1.3

### Phase 3: Font Awesome v5 → v6 Upgrade

**Goal:** Upgrade the Font Awesome stack from v5 to v6 (the Vue 2 ceiling) with zero visual regressions on existing icons. Unlocks sharp/thin styles and 1500+ new icons for future phases.

**Requirements:** UI-01

**Depends on:** None

**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Bump FA v6 deps + vue-fontawesome 2.x + rewrite main.js imports/library.add (commit 1: chore(deps)) — **completed 2026-04-21 (commit `ae2627b`)**
- [x] 03-02-PLAN.md — Migrate 4 template strings across 3 Vue files + bundle-size regression check + UAT (commit 2: refactor(icons)) — **completed 2026-04-21 (commit `b5ecc32`; bundle +1.82% PASS; UAT approved in dev + prod)**

**Key constraint:** `@fortawesome/vue-fontawesome` must move from 0.1.x to 2.x as a PAIRED upgrade with FA core 1.x → 6.x. The 3.x line requires Vue 3 (deferred to v2.0). FA v7 likewise requires vue-fontawesome 3.x and is out of scope.

**Success criteria:**
1. All 11 icons currently registered in `src/renderer/main.js` (faUserCog, faInfoCircle, faCog, faExternalLinkAlt, faFolder, faTrash, faCamera, faCopy, faQuestionCircle, faArrowDown, faDiscord) continue to render correctly after the FA v6 upgrade — visual parity against v1.2 confirmed.
2. `<font-awesome-icon>` component registration in `main.js` migrates to the FA 6 / vue-fontawesome 2.x API (import paths, `library.add()` shape, component props) without runtime warnings.
3. App runs in `npm run dev` and in a production `electron-builder` install without console errors/warnings originating from FA.
4. Bundle size does not regress meaningfully (tolerance: ≤ 10% increase, ideally a decrease — tree-shaking of individual icon imports should keep this tight).

### Phase 4: Prettier 3 Codebase Reformat

**Goal:** Upgrade Prettier 2 → 3 and reformat the codebase in a single commit for clean git blame, without changing runtime behavior.

**Requirements:** TOOL-01

**Depends on:** Phase 3 (avoids a conflict between the Prettier reformat and FA-related `main.js` edits)

**Success criteria:**
1. `npm run prettier` completes cleanly on the entire codebase using Prettier 3.3; the reformat is captured as a single `format: prettier 3` commit for clean blame.
2. `npm run lint` passes with the Prettier-3-compatible ESLint plugin versions (`eslint-config-prettier`, `eslint-plugin-prettier` may need minor bumps to their v3-compatible lines); no new warnings introduced.
3. `npm run build` produces a working production build post-reformat; manual smoke test of a screenshot capture round-trips successfully.

**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md — Wave 1: `fix(HelpModal): remove orphan p tags` (pre-reformat HTML source prep + pre-upgrade baseline capture for lint/bundle denominators) — **completed 2026-04-21 (commit `62f7abc`; baselines captured: lint 1929, prettier-check 35, dist/renderer.js 1,477,180 bytes)**
- [x] 04-02-PLAN.md — Wave 2: `chore(deps): bump Prettier to v3 + ESLint-Prettier plugins` (package.json 3-line devDep bump + `npm install --legacy-peer-deps` + lint/test no-regression gates) — **completed 2026-04-21 (commit `1082d7d`; resolved: prettier@3.8.3, eslint-plugin-prettier@5.5.5, eslint-config-prettier@9.1.2; lint 1929 = baseline, tests 256/256, pack:renderer exit 0)**
- [ ] 04-03-PLAN.md — Wave 3: `format: prettier 3` (run `npm run prettier`, automated gates SC1/SC2/SC3a, D-12 blocking manual smoke, atomic reformat commit)

---

## Next Milestone Candidates

Seeded for future pickup (see `.planning/seeds/`):
- **v1.4 Tooling Modernization** — TypeScript 5 + ESLint 9 flat config (trigger: after v1.3 ships)
- **v2.0 Vue 3 Migration** — Vue 3 + buefy replacement + Vite + Electron (trigger: after v1.4 or on Vue 2 CVE)

Run `/gsd-new-milestone` after v1.3 completion.
