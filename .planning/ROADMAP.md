# Roadmap: iRacing Screenshot Tool

## Milestones

- ✅ **v1.2 Feature Enhancements** — Phases 1-2 (shipped 2026-04-20 via PR #25) — [archive](./milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 UI Refresh** — Phases 3-4 (shipped 2026-04-21) — [archive](./milestones/v1.3-ROADMAP.md)
- 🚧 **v1.4 Tooling Modernization** — Phases 5-7 (active, started 2026-04-21)
- 📋 **v2.0 Vue 3 Migration** — planned (trigger: after v1.4 or on Vue 2 CVE)

## Phases

<details>
<summary>✅ v1.2 Feature Enhancements (Phases 1-2) — SHIPPED 2026-04-20</summary>

- [x] Phase 1: Filename Format Configurator — delivered via quick task `260403-evq` (2026-04-03, 7/7 verified)
- [x] Phase 2: Discord Bug & Feature Tracker Bot — 10 plans, shipped via PR #25, 294 bot tests passing

</details>

<details>
<summary>✅ v1.3 UI Refresh (Phases 3-4) — SHIPPED 2026-04-21</summary>

- [x] Phase 3: Font Awesome v5 → v6 Upgrade (2 plans) — completed 2026-04-21 (commits `ae2627b` chore(deps) + `b5ecc32` refactor(icons); bundle +1.82%; UAT approved in dev + prod)
- [x] Phase 4: Prettier 3 Codebase Reformat (3 plans) — completed 2026-04-21 (commits `62f7abc` fix(HelpModal) + `1082d7d` chore(deps) + `e0e4923` format: prettier 3; lint -48 below baseline; 256/256 tests pass; bundle +0.042%; D-12 UAT approved)

</details>

### v1.4 Tooling Modernization (Phases 5-7) — ACTIVE

- [ ] **Phase 5: Babel Package Renames** — Retire `babel-runtime` 6.x → `@babel/runtime` and `babel-eslint` 10.x → `@babel/eslint-parser` (pre-condition cleanup before ESLint flat-config migration)
- [ ] **Phase 6: ESLint 9 Flat Config + Prettier Full Wiring** — ESLint 7 → 9 with `eslint.config.js`, `eslint-config-prettier` 9 → 10, `plugin:prettier/recommended` full integration (resolves v1.3 Phase 4 Pitfall 4 derogation)
- [ ] **Phase 7: TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps** — TypeScript 3.8 → 5.7 with `@typescript-eslint/*` 2.25 → 8.x; final verification gate removes `--legacy-peer-deps` flag

## Phase Details

### Phase 5: Babel Package Renames
**Goal**: Retire the two deprecated Babel package names (`babel-runtime`, `babel-eslint`) so the lint config and runtime imports reference the canonical `@babel/*` scope, clearing deprecation warnings before the flat-config migration starts.
**Depends on**: Nothing (first v1.4 phase; ESLint 7 + legacy `.eslintrc.js` still in effect for BABEL-02's parser swap)
**Requirements**: BABEL-01, BABEL-02
**Success Criteria** (what must be TRUE):
  1. `grep -r "babel-runtime\|babel-eslint" package.json src/ _scripts/` returns only the renamed `@babel/runtime` and `@babel/eslint-parser` references (zero deprecated-name matches)
  2. `npm install --legacy-peer-deps` succeeds with the two new packages resolved and the old names removed from `package.json` and `package-lock.json`
  3. `npm run lint` runs against `.eslintrc.js` using `@babel/eslint-parser` and produces a lint count within the v1.3 baseline band (≤1881)
  4. `npm run test` passes 256/256 (no runtime regressions from the `@babel/runtime` helper swap)
  5. Phase lands on master as a D-04 shape: one `chore(deps): rename babel packages` commit plus a content commit updating the ESLint parser reference and any import-site updates
**Plans**: 2 plans
- [ ] 05-01-PLAN.md — chore(deps): rename babel packages (drop babel-runtime, replace babel-eslint with @babel/eslint-parser ^7.28.6, regen lockfile, capture 05-01-BASELINE.md)
- [ ] 05-02-PLAN.md — refactor(eslint): wire @babel/eslint-parser via parserOptions.parser (single-line insert in .eslintrc.js; verify lint band ≤1881, Vue SFC delegation intact, 256/256 tests, pack clean)

### Phase 6: ESLint 9 Flat Config + Prettier Full Wiring
**Goal**: Migrate from ESLint 7 + `.eslintrc.js` to ESLint 9 + `eslint.config.js` flat config, bump `eslint-config-prettier` 9 → 10, and wire `eslint-plugin-prettier` via `plugin:prettier/recommended` — superseding the v1.3 Phase 4 Pitfall 4 minimum-scope derogation.
**Depends on**: Phase 5 (Babel parser rename must land first so the flat config imports `@babel/eslint-parser`, not the deprecated name)
**Requirements**: LINT-01, LINT-02, FMT-01, FMT-02
**Success Criteria** (what must be TRUE):
  1. `npm run lint` runs against `eslint.config.js` (flat config) — legacy `.eslintrc.js` deleted or archived, no `eslintrc`-format files referenced by tooling
  2. Lint count is ≤ v1.3 baseline (1881) with every rule from the old `.eslintrc.js` re-enabled or deliberately retired with an entry in the decision log
  3. `eslint-config-prettier` is at v10.x and `eslint-plugin-prettier` is wired via `plugin:prettier/recommended` (not the v1.3 minimum-scope `eslint-config-prettier`-only wiring)
  4. `npm run prettier -- --check` passes — FMT-01 full integration did not break the v1.3 Prettier 3 format baseline
  5. `npm run test` passes 256/256 (lint config churn produced no runtime regressions)
**Plans**: TBD

### Phase 7: TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps
**Goal**: Upgrade TypeScript 3.8 → 5.7 and `@typescript-eslint/*` 2.25 → 8.x (which requires the ESLint 9 foundation from Phase 6), triage the inference-driven error backlog, and close the milestone by verifying `npm install` succeeds without `--legacy-peer-deps`.
**Depends on**: Phase 6 (typescript-eslint 8.x peer-requires ESLint 9; FMT-02 peer-requires ESLint 9; LINT-03 verification can only succeed after both peer conflicts clear)
**Requirements**: TS-01, TS-02, LINT-03
**Success Criteria** (what must be TRUE):
  1. `npx tsc --noEmit` compiles the codebase on TypeScript 5.7 — each remaining error is either fixed or explicitly captured via `@ts-expect-error` with a tracked follow-up comment
  2. `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` are at 8.x in `eslint.config.js` with rule renames migrated (no deprecated rule IDs in the flat config)
  3. `npm install` (no `--legacy-peer-deps` flag) succeeds with zero `ERESOLVE` errors — the two peer conflicts v1.3 documented (typescript-eslint@2 vs eslint@7 + eslint-plugin-prettier@5 vs eslint@7) are both resolved
  4. `npm run lint` passes at ≤ v1.3 baseline (1881) with the upgraded typescript-eslint plugin wired in
  5. `npm run test` passes 256/256 — no regressions from the TypeScript compiler major-version swap
  6. Phase lands on master as a D-04 shape chain so bisecting between HEAD and `chore(deps): typescript 5 + typescript-eslint 8` cleanly isolates dep-bump regressions from content changes
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Babel Package Renames | 0/? | Not started | - |
| 6. ESLint 9 Flat Config + Prettier Full Wiring | 0/? | Not started | - |
| 7. TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps | 0/? | Not started | - |

---

## Next Milestone Candidates

Seeded for future pickup (see `.planning/seeds/`):
- **v2.0 Vue 3 Migration** — Vue 3 + buefy replacement + Vite + Electron (trigger: after v1.4 or on Vue 2 CVE; includes Bulma 1.0, FA v7, remaining main.scss CDN cleanup, transitive prettier@2.8.8 via vue-loader, `eslint-plugin-vue` 6 → 9, `vue-eslint-parser` 7 → 9, Jest 25 → Vitest)

Run `/gsd-new-milestone` to start the next milestone.
