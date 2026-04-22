# Requirements — v1.4 Tooling Modernization

**Milestone:** v1.4 Tooling Modernization
**Started:** 2026-04-21
**Goal:** Modernize the invisible tooling layer (TypeScript, ESLint, Babel ecosystem) before the Vue 3 migration, and resolve tech debt carried over from v1.3.

---

## Active Requirements

### TypeScript (TS)

- [ ] **TS-01**: TypeScript compiler upgraded from 3.8 to 5.7 with inference-driven error backlog triaged and resolved (or explicitly deferred with `@ts-expect-error` comments pointing at tracked follow-ups)
- [x] **TS-02**: `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` upgraded from 2.25 to 8.x with rule renames migrated in config (Phase 7 plans 07-01 + 07-02, 2026-04-22; commit `d873b50` bumps @typescript-eslint/* 2.25→8.59.0 + new typescript-eslint umbrella; commit `b8f8e1c` wires tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] }) via helper — NOT direct spread per Pitfall 1; 'prettier' dropped from FlatCompat chain per D-07; lint count 735 delta +0; dual-parser preserved)

### ESLint (LINT)

- [x] **LINT-01**: ESLint upgraded from 7.10 to 9.x (Phase 6 plan 06-01, 2026-04-22; commit `15b7042` installs eslint@9.39.4; Phase 6 plan 06-02 commit `96fe918` wires ESLint 9 against flat config — no `ESLINT_USE_FLAT_CONFIG=false` escape hatch)
- [x] **LINT-02**: Lint configuration migrated from legacy `.eslintrc.js` to flat `eslint.config.js` (parity verified against v1.3 baseline lint count of 1881) (Phase 6 plan 06-02, 2026-04-22; commit `96fe918` creates eslint.config.js + `git rm` .eslintrc.js / .eslintignore; post-migration count 735 ≤ 1881 SC2 ceiling; D-11 rule-parity audit confirms no silent drops — +13 delta fully attributable to D-01 Amendment v6→v9 upgrade)
- [ ] **LINT-03**: `--legacy-peer-deps` npm flag removed from install workflow — no remaining peer-dependency conflicts after LINT-01 + TS-02 + FMT-02

### Formatter Wiring (FMT)

- [x] **FMT-01**: `eslint-plugin-prettier` wired via `plugin:prettier/recommended` for full rule integration, superseding the v1.3 Phase 4 Pitfall 4 minimum-scope `eslint-config-prettier`-only derogation (Phase 6 plan 06-02, 2026-04-22; commit `96fe918` adds `require('eslint-plugin-prettier/recommended')` as LAST entry in eslint.config.js — `prettier/prettier: error` rule now fires; 0 firings post-migration; `npm run prettier -- --check` exits 0)
- [x] **FMT-02**: `eslint-config-prettier` upgraded from 9 to 10 (ESLint-7 support drop aligned with LINT-01) (Phase 6 plan 06-01, 2026-04-22; commit `15b7042` bumps eslint-config-prettier 9.1.0 → 10.1.8; bundled into prettierRecommended's disables via plan 06-02)

### Babel Package Renames (BABEL)

- [x] **BABEL-01**: `babel-runtime` 6.x replaced with `@babel/runtime` — all import sites updated, no references to the deprecated name remain (Phase 5 plan 05-01, 2026-04-22; commit `eef6a7a` chore(deps) drops babel-runtime entirely per D-01 minimum-scope interpretation — zero import sites, `@babel/plugin-transform-runtime` not installed so @babel/runtime would be dead weight; ROADMAP SC1 grep satisfied by absence)
- [x] **BABEL-02**: `babel-eslint` 10.x replaced with `@babel/eslint-parser` — ESLint config updated to use the new parser (Phase 5 plan 05-02, 2026-04-22; commit `74e112f` refactor(eslint) wires parserOptions.parser per D-03)

---

## Success Criteria (Milestone-Level)

Observable outcomes that signal v1.4 is complete:
1. `npm install` succeeds without the `--legacy-peer-deps` flag
2. `npm run lint` runs against `eslint.config.js` (flat config), with total count ≤ v1.3 baseline (1881)
3. `npm run test` passes 256/256 (no regressions on main app)
4. `grep -r "babel-runtime\|babel-eslint" package.json src/ _scripts/` returns only the renamed `@babel/runtime` / `@babel/eslint-parser` references
5. TypeScript 5.7 compiles the codebase with no unresolved errors (or each remaining error is explicitly captured via `@ts-expect-error` with a tracked follow-up)
6. Running `npm run prettier -- --check` passes (FMT-01 wiring didn't break format)

---

## Future Requirements (deferred beyond v1.4)

_Deferred to v2.0 Vue 3 Migration:_
- `eslint-plugin-vue` 6 → 9 (must match Vue major)
- `vue-eslint-parser` 7 → 9 (must match Vue major)
- Jest 25 → Vitest (pairs naturally with Vite+Electron bundler switch)

---

## Out of Scope (v1.4)

- **Vue 3 migration itself** — dedicated v2.0 milestone
- **Bundler changes (webpack → Vite)** — deferred to v2.0
- **UI framework replacement (Buefy → Oruga/PrimeVue/Vuetify)** — deferred to v2.0
- **FA v6 → v7** — requires `vue-fontawesome` 3.x which requires Vue 3; deferred to v2.0
- **Bulma 0.9 → 1.0** — tied to Buefy replacement; deferred to v2.0
- **Prettier reformat** — already shipped in v1.3 Phase 4 (`.prettierrc` preserved byte-for-byte)
- **Jest 25 → 30** — already handled by upstream dependabot
- **Jimp 0.10 → 1.6** — already handled by upstream dependabot
- **`vue-router` 3 → 4, `vue-loader` 15 → 17, `vue-devtools` → `@vue/devtools`** — all tied to Vue 3, deferred to v2.0
- **Electron main-process `addDevToolsExtension` error fix** — main-process cleanup, not tooling; standalone ticket
- **FA v5.2.0 CDN `@import` removal in `main.scss`** — deferred to v2.0 Bulma/Buefy work

---

## Traceability

_Populated by roadmap creation — maps each REQ-ID to its phase._

| REQ-ID | Phase | Status |
|--------|-------|--------|
| BABEL-01 | Phase 5 | **complete** (2026-04-22, commit `eef6a7a`) |
| BABEL-02 | Phase 5 | **complete** (2026-04-22, commit `74e112f`) |
| LINT-01 | Phase 6 | **complete** (2026-04-22, commits `15b7042` + `96fe918`) |
| LINT-02 | Phase 6 | **complete** (2026-04-22, commit `96fe918`) |
| FMT-01 | Phase 6 | **complete** (2026-04-22, commit `96fe918`) |
| FMT-02 | Phase 6 | **complete** (2026-04-22, commits `15b7042` + `96fe918`) |
| TS-01 | Phase 7 | pending |
| TS-02 | Phase 7 | pending |
| LINT-03 | Phase 7 | pending |

**Coverage:** 9/9 requirements mapped — no orphans, no duplicates. **Completed:** 6/9 (BABEL-01, BABEL-02 via Phase 5; LINT-01, LINT-02, FMT-01, FMT-02 via Phase 6).

---

*Generated 2026-04-21 by `/gsd-new-milestone`. Updated on phase transitions and milestone close.*
