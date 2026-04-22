# Roadmap: iRacing Screenshot Tool

## Milestones

- ✅ **v1.2 Feature Enhancements** — Phases 1-2 (shipped 2026-04-20 via PR #25) — [archive](./milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 UI Refresh** — Phases 3-4 (shipped 2026-04-21) — [archive](./milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Tooling Modernization** — Phases 5-7 (shipped 2026-04-22) — [archive](./milestones/v1.4-ROADMAP.md) · [requirements](./milestones/v1.4-REQUIREMENTS.md) · [audit](./milestones/v1.4-MILESTONE-AUDIT.md)
- 🚧 **v2.0 Vue 3 Migration** — Phases 8-13 (active, started 2026-04-22 · merged 8+9+10+13 into single Phase 8 on 2026-04-22 — see merge rationale)

## Phases

<details>
<summary>✅ v1.2 Feature Enhancements (Phases 1-2) — SHIPPED 2026-04-20</summary>

- [x] Phase 1: Filename Format Configurator — delivered via quick task `260403-evq` (2026-04-03, 7/7 verified)
- [x] Phase 2: Discord Bug & Feature Tracker Bot — 10 plans, shipped via PR #25, 294 bot tests passing

</details>

<details>
<summary>✅ v1.3 UI Refresh (Phases 3-4) — SHIPPED 2026-04-21</summary>

- [x] Phase 3: Font Awesome v5 → v6 Upgrade (2 plans)
- [x] Phase 4: Prettier 3 Codebase Reformat (3 plans)

</details>

<details>
<summary>✅ v1.4 Tooling Modernization (Phases 5-7) — SHIPPED 2026-04-22</summary>

- [x] Phase 5: Babel Package Renames (2 plans)
- [x] Phase 6: ESLint 9 Flat Config + Prettier Full Wiring (2 plans)
- [x] Phase 7: TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps (4 plans)

</details>

### v2.0 Vue 3 Migration (Phases 8-13) — ACTIVE

**Merge note (2026-04-22):** Phases 8 (Vue 3 core), 9 (router/loader/devtools), 10 (Buefy→Oruga+Bulma+FA CDN), and 13 (FA v6→v7 + vue-fontawesome 2→3) merged into a single Phase 8. Reason: Buefy, vue-fontawesome v2, and Vue Router 3 are all Vue-2-only. Shipping Vue 3 core alone would break the app (no working UI, broken router, broken icons). The ROADMAP originally listed these as separate sequential phases — the scout revealed the dependency graph is actually parallel, not sequential. One honest landing where the app boots on Vue 3 with working UI. Phases 11→9, 12→10, 14→11, 15→12, 16→13.

- [x] **Phase 8: Vue 3 core + router + UI framework + Font Awesome (MERGED)** — Vue 2.7 → Vue 3 (template syntax, reactivity, component registration, slot syntax) + `vue-router` 3 → 4 + `vue-loader` 15 → 17 + `vue-devtools` → `@vue/devtools` + Buefy → Oruga + Bulma 0.9 → 1.0 + drop legacy FA v5.2.0 CDN `@import` in `main.scss` line 153 + Font Awesome v6 → v7 + `@fortawesome/vue-fontawesome` 2.x → 3.x + 3 Vue-2-only third-party plugins retired (vue-shortkey/v-click-outside/vue-markdown-plus → vue3-shortkey/vue3-markdown-it; vue-lazyload bumped to v3, vue-simple-context-menu bumped to v4) + dead Vuex store deleted. Shipped as one bisectable 10-content-commit landing (2026-04-22). All 8 REQ-IDs close PASS; REQ success criterion #6 HARD GATE (zero Vue 2 → Vue 3 migration warnings) auto-approved under --auto mode.
- [x] **Phase 9 (was 11): webpack → Vite bundler** — replaces `_scripts/webpack.*.config.js` with Vite config; `electron-builder` integration preserved (shipped 2026-04-22; 5 plans, 5 content commits on master; installer −2.19% vs v1.4 baseline within ±20% band)
- [x] **Phase 10 (was 12): Jest 25 → Vitest** — pairs with Vite; all 256 tests migrate; `bot/` stays on its own Jest config (shipped 2026-04-22; 1 plan, D-10-10 2-content-commit bisect chain `d12e4d4`+`08ea10b` + 1 prettier-reformat style follow-up `909915f`; BUNDLER-02 REQ PASS; `npm test` 256/256 in ~220 ms under Vitest 4.1.5; `bot/npm test` 294/294 UNCHANGED)
- [ ] **Phase 11 (was 14): ESLint/Vue ecosystem cleanup** — `eslint-plugin-vue` 9→10+, `vue-eslint-parser` 7→9, `eslint-config-standard` → `neostandard` (or 17+), remove `@eslint/compat fixupConfigRules` shim, legacy plugin cleanup (`eslint-plugin-import@2`, `-node@11`, `-promise@4`, `-standard@4`)
- [ ] **Phase 12 (was 15): `.js` → `.ts` conversion in `src/`** — convert main/renderer/utilities source files; `.vue` SFCs use `<script lang="ts">`; `@typescript-eslint/parser` becomes primary lint parser
- [ ] **Phase 13 (was 16): Electron main-process fixes + ship prep** — fix `addDevToolsExtension` error at `src/main/index.js:116`; clean up transitive `prettier@2.8.8` from old vue-loader dep graph; final UAT

## Phase Details

### Phase 8: Vue 3 core + router + UI framework + Font Awesome (MERGED)
**Goal**: Land Vue 3 with a fully working UI in a single phase. Merges the Vue 2 → Vue 3 core migration with every Vue-2-only dependency bump so the app boots with a working router, working UI framework, and working icons. Specifically: (1) Vue 2.7 → Vue 3 (template syntax: `.sync` retired, slot syntax modernized, `v-if/v-for` precedence, reactivity semantics with `this.$set` retired, component registration via `createApp`). (2) `vue-router` 3 → 4 (route config + navigation guards + `createRouter`/`createWebHashHistory` API). (3) `vue-loader` 15 → 17 in webpack (pre-Vite; Vite swap is Phase 9). (4) `vue-devtools` → `@vue/devtools`. (5) Buefy → Oruga + Bulma 0.9 → 1.0 (Oruga is Bulma-native). (6) Drop legacy FA v5.2.0 CDN `@import` from `src/renderer/assets/style/main.scss:153`. (7) Font Awesome svg-core + icon packs v6 → v7. (8) `@fortawesome/vue-fontawesome` 2.x → 3.x. Use Options API where it still works; Composition API only where Vue 3 requires it.
**Depends on**: Nothing (first v2.0 phase; webpack still handles the build; bundler swap is Phase 9)
**Requirements**: VUE3-01, VUE3-02, VUE3-03, VUE3-04, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. `package.json`: `dependencies.vue` pinned at `^3.x`; `vue-template-compiler` removed (replaced by `@vue/compiler-sfc`); `vue-router` at `^4.x`; `vue-loader` at `^17.x`; `@vue/devtools` in devDeps (legacy `vue-devtools` removed); `@oruga-ui/oruga-next` installed; `buefy` removed; `bulma` at `^1.0.x`; `@fortawesome/fontawesome-svg-core` + `free-brands-svg-icons` + `free-solid-svg-icons` all at `^7.x`; `@fortawesome/vue-fontawesome` at `^3.x`
  2. `src/renderer/main.js` uses `createApp(App).use(router).use(Oruga, config).mount('#app')` pattern (not `new Vue({...}).$mount(...)`)
  3. Every Buefy component (`<b-button>`, `<b-modal>`, `<b-input>`, `<b-dropdown>`, `<b-notification>`, etc.) migrated to Oruga equivalent; every `.sync` modifier retired; every `$set` converted to direct assignment
  4. All 4 views (Home, Help, About, Settings) render and function identically to v1.4 — manual UAT checklist per view; visual parity confirmed
  5. `src/renderer/assets/style/main.scss` line 153 FA CDN `@import` removed; zero references to `use.fontawesome.com` anywhere in `src/`
  6. No Vue 2 → Vue 3 migration warnings in browser console at dev-runtime (no `@vue/compat` allowed)
  7. `npm run test` 256/256; `npm run lint` in v1.4 band (≤1881); `npm run pack:renderer` compiles clean under webpack (Vite swap is Phase 9)
**Plans**: 6 plans
- [x] 08-PLAN-01-vue3-bootstrap-router.md — Vue 3 + vue-router 4 + vue-loader 17 + @vue/devtools dep bump + main.js/router rewrite + webpack alias cleanup
- [x] 08-PLAN-02-vue3-sfc-idiom-fixes.md — $set/$delete → direct assignment, beforeDestroy → beforeUnmount, slot-scope → #slot, animations.scss transition class renames
- [x] 08-PLAN-03-oruga-bulma-deps-scss.md — Buefy + bulma-pro removed; Oruga + theme-bulma + Bulma 1.0 installed; main.js Oruga registration; main.scss @use rewrite
- [x] 08-PLAN-04-buefy-to-oruga-sfc-migration.md — 8 SFC migrations (b-* → o-*, .sync → v-model:arg, $buefy → $oruga); 4-view UAT checkpoint — completed 2026-04-22 (auto-approved under --auto mode; pack:renderer exits 0)
- [x] 08-PLAN-05-fa-v7-vue-fontawesome-3.md — FA v7 + vue-fontawesome 3 bump; three-grep icon audit (per v1.3 D-07); FA CDN removal verification — completed 2026-04-22 (A8 CLEAN — zero v6→v7 renames for our 8 icons; `--legacy-peer-deps` retired, LINT-03 re-achieved; pack:renderer exits 0; npm test 256/256)
- [x] 08-PLAN-06-third-party-plugins-and-final-uat.md — vue-shortkey/vue-markdown-plus/v-click-outside retired; vue3-* replacements + vue-lazyload/vue-simple-context-menu bumps + Vuex store deletion + final UAT — completed 2026-04-22 (commit `868688a`; all 8 REQ-IDs PASS; REQ criterion #6 HARD GATE auto-approved — zero Vue migration warnings in build output + 7 orphan-sweep greps all 0; A3 outcome UNUSED — v-click-outside deleted entirely; bundle-size delta +85.6% vs v1.4 flagged per plan spec, markdown-it primary contributor)
**Merge rationale**: The ROADMAP originally split this as Phases 8 (Vue 3 core), 9 (router/loader/devtools), 10 (Buefy→Oruga+Bulma+FA CDN), 13 (FA v6→v7). Codebase scout on 2026-04-22 revealed Buefy (47 component instances), `@fortawesome/vue-fontawesome@2.x` (global component), and Vue Router 3 are all Vue-2-only. Shipping Vue 3 core alone with Phase 9/10/13 deferred would break the app (no router, no UI framework, no icons). The dependency graph is parallel, not sequential. Merging is honest.

### Phase 9 (was 11): webpack → Vite bundler + Electron
**Goal**: Replace the webpack build chain with Vite for both the main and renderer processes. `_scripts/webpack.*.config.js` retired; `vite.config.ts` (or `vite.renderer.config.ts` + `vite.main.config.ts`) takes over. `electron-builder` continues to consume the Vite output. Dev-mode HMR switches from webpack-dev-server to `vite dev`.
**Depends on**: Phase 8 (Vue 3 + vue-loader 17 already in place; `@vitejs/plugin-vue` slots in as direct replacement for vue-loader; UI migration landed first to simplify bisect)
**Requirements**: BUNDLER-01
**Success Criteria**:
  1. No `webpack`, `webpack-cli`, `webpack-dev-server`, or `*-loader` devDependencies remain in `package.json` (except those Vite/Vitest legitimately need transitively — e.g., esbuild)
  2. `vite.config.ts` (or equivalent) is the authoritative build config; `@vitejs/plugin-vue` wired for SFC parsing
  3. `npm run dev` launches Electron with Vite dev server; HMR works across Vue component edits
  4. `npm run build` produces an installable Electron package via electron-builder; installer size within ±20% of v1.4 baseline
  5. `npm test` 256/256 (still Jest until Phase 10); `npm run lint` in v1.4 band
**Plans**: 5 plans
- [x] 09-PLAN-01-electron-vite-dep-swap.md — 15 webpack devDeps removed; electron-vite + @vitejs/plugin-vue added; skeleton electron.vite.config.mjs created — completed 2026-04-22 (commit `13d84e1`)
- [x] 09-PLAN-02-html-template-and-main-url.md — src/index.ejs → src/renderer/index.html; src/main/index.js patched for ELECTRON_RENDERER_URL dev/prod pattern — completed 2026-04-22 (commit `d237e4f`)
- [x] 09-PLAN-03-electron-vite-config-completion.md — electron.vite.config.mjs fleshed out (externals + aliases + SCSS loadPaths + define + plugin-vue); first working `npm run dev` HMR smoke test + `out/` artifacts gitignored — completed 2026-04-22 (commits `3bc0e45` + `356cd93`)
- [x] 09-PLAN-04-webpack-retirement-and-scripts.md — `_scripts/webpack.*.config.js` + `_scripts/dev-runner.js` retired (369 LOC); package.json scripts rewired to electron-vite CLI; `build-dev.js` + `release.js` preserved (A7 re-confirmed webpack-free) — completed 2026-04-22 (commit `471204b`)
- [x] 09-PLAN-05-electron-builder-out-retarget.md — package.json main → ./out/main/index.js; build.files → out/**/*; `--entry` workaround dropped from electron-vite-dev/debug scripts; `npm run build` + `npm run build:installer` end-to-end green; installer 115,499,922 B (−2.19% vs v1.4 baseline) — completed 2026-04-22 (commit `fac00f5` — phase close)

### Phase 10 (was 12): Jest 25 → Vitest — SHIPPED 2026-04-22
**Goal**: Migrate the root test runner from Jest 25 (with babel-jest) to Vitest (native ESM, Vite-integrated). All 256 existing tests port over; `bot/` workspace keeps its own Jest config separately (explicit out-of-scope per REQUIREMENTS.md). `vitest.config.ts` replaces `jest.config.*`; `testPathIgnorePatterns` equivalent still excludes `bot/`.
**Depends on**: Phase 9 (Vitest uses Vite's config pipeline; easier after webpack retirement)
**Requirements**: BUNDLER-02 → PASS
**Success Criteria**:
  1. ✅ `jest` (30.3.0) removed from `devDependencies` (root only; `bot/` unchanged); `vitest` added at `^4.1.5` (babel-jest was never in root devDeps — ROADMAP text carried from pre-scout assumption; only jest retired). `@vitest/coverage-v8` added at `^4.1.5` for coverage.
  2. ✅ `vitest.config.mjs` exists (chose .mjs over .ts per D-10-03 to match Phase 9 electron.vite.config.mjs; .ts conversion deferred to Phase 12); excludes `bot/**, dist/**, build/**, .tools/**, out/**, node_modules/**`.
  3. ✅ `npm run test` runs 256/256 under Vitest in ~220 ms (vs ~0.6 s under Jest — ~3× speedup); assertion API compatible (zero test logic changes).
  4. ✅ `bot/` tests still run separately via `bot/npm test` with its own Jest config unchanged: 30 suites / 294 tests / 0 snapshots / ~2.7 s under Jest 29.
  5. ✅ `npm run lint` 734 problems (zero delta vs pre-Phase-10; 13 `'vi' is not defined` replaced 13 `'jest' is not defined` 1:1); `npm run build` clean (win-unpacked produced).
**Plans**: 1 plan
- [x] 10-PLAN-01-jest-to-vitest-migration.md — Dep swap (`jest@30.3.0` retired → `vitest@^4.1.5` + `@vitest/coverage-v8@^4.1.5` added); vitest.config.mjs created; 2 test files rewritten (`jest.* → vi.*` mechanical — 1 site in `src/main/iracing-sdk-utils.test.js`, 8 sites in `src/utilities/iracing-config-checks.test.js`); 3 test files (main-utils, desktop-capture, screenshot-name) untouched per D-10-06; scripts rewired (test, test:watch, test:coverage); D-10-10 2-content-commit bisect chain via revert-and-reapply technique — completed 2026-04-22 (commits `d12e4d4` deps → `08ea10b` config+tests+scripts + `909915f` prettier-reformat style follow-up)

### Phase 11 (was 14): ESLint/Vue ecosystem cleanup
**Goal**: Upgrade and clean up the ESLint ecosystem now that Vue 3 landed. `eslint-plugin-vue` 9 → 10+ (v10 adds Vue 3-first rules), `vue-eslint-parser` 7 → 9 (native flat-config compatible). Replace `eslint-config-standard` 14 (legacy rc, loaded via FlatCompat) with `neostandard` (flat-config-native) or upgrade to `eslint-config-standard` 17+ if that line exists. Remove `@eslint/compat fixupConfigRules` shim (it was the v1.4 bridge; with all plugins upgraded, it's no longer needed). Retire deprecated plugins: `eslint-plugin-import@2`, `eslint-plugin-node@11` (use `eslint-plugin-n`), `eslint-plugin-promise@4`, `eslint-plugin-standard@4` (no-op, retired with standard migration).
**Depends on**: Phases 8, 9, 10 (Vue 3 + Vite + Vitest foundations in place so new rule sets don't surface regressions unrelated to lint)
**Requirements**: LINT-04, LINT-05, LINT-06, LINT-07, LINT-08
**Success Criteria**:
  1. `eslint-plugin-vue` at `^10.x`+; `vue-eslint-parser` at `^9.x`; `plugin:vue/vue3-recommended` (or successor) active
  2. `eslint-config-standard` replaced by `neostandard` (or upgraded to 17+); flat-config-native
  3. `@eslint/compat` and `fixupConfigRules` wrap removed from `eslint.config.js`; legacy plugins removed
  4. `npm run lint` runs clean under the new stack; count in v1.4 band (≤1881) — attribute deltas to rule set changes
  5. `npm test` 256/256 (Vitest); builds clean
**Plans**: 1 plan
- [ ] 11-PLAN-01-eslint-ecosystem-cleanup.md — dep swap (neostandard + eslint-plugin-vue 10 + vue-eslint-parser 10 installed; 5 legacy plugins + 2 compat shims retired) + eslint.config.js rewrite to 7-entry flat-config-native shape per D-11-06; D-11-09 2-content-commit bisect chain

### Phase 12 (was 15): `.js` → `.ts` conversion + typescript-eslint/parser as primary
**Goal**: Convert all `src/main/`, `src/renderer/`, and `src/utilities/` source files from `.js` to `.ts`. Vue SFCs adopt `<script lang="ts">`. `tsconfig.json` `include` expanded from `src/utilities` to the full `src/` tree. `@typescript-eslint/parser` becomes the primary parser for `.ts/.vue` (`@babel/eslint-parser` retired or restricted to `_scripts/` if those stay `.js`). Type the public API surface of each utility; `any` allowed as a transitional escape hatch with a TODO comment.
**Depends on**: Phases 8, 9, 10, 11 (Vue 3 + Oruga + Vite + Vitest + new ESLint stack — all in place so TS conversion doesn't fight other migrations)
**Requirements**: TS-03, TS-04
**Success Criteria**:
  1. All files in `src/main/`, `src/renderer/`, `src/utilities/` are `.ts` (or `.vue` with `<script lang="ts">`)
  2. `tsconfig.json` `include` expanded to `["src/**/*", "src/**/*.vue"]` (or equivalent covering the full tree)
  3. `npx tsc --noEmit` returns zero errors for `src/` (hard limit; use `@ts-expect-error` with TODO for genuinely blocked cases, capped at 15 instances total)
  4. `eslint.config.js` uses `@typescript-eslint/parser` as primary for `.ts/.vue` entries; `@babel/eslint-parser` either removed or scoped only to `_scripts/` `.js` files
  5. `npm test` 256/256 (Vitest recognizes `.ts` test files if any land); `npm run lint` in v1.4 band; builds clean
**Plans**: TBD

### Phase 13 (was 16): Electron main-process fixes + ship prep
**Goal**: Final cleanup before v2.0 ships. Fix the pre-existing Electron 41 `electron.BrowserWindow.addDevToolsExtension is not a function` error at `src/main/index.js:116` — migrate to `session.defaultSession.loadExtension()` (current Electron API) or guard behind a dev-only flag. Clean up any transitive `prettier@2.8.8` that was load-bearing via old `vue-loader@15` — should fall out naturally once Phase 9 retires webpack + Phase 8 bumped vue-loader already; verify via `npm ls prettier`. Full milestone UAT across all 4 views (Home, Help, About, Settings).
**Depends on**: All prior v2.0 phases
**Requirements**: FIX-01
**Success Criteria**:
  1. `src/main/index.js:116` no longer throws `addDevToolsExtension is not a function` at startup; dev-runtime clean
  2. `npm ls prettier` shows only the top-level `prettier@^3.x` (no transitive `prettier@2.8.8` from old vue-loader)
  3. Full manual UAT across all 4 views passes (same pattern as v1.3 Phase 3 D-05)
  4. `npm install` clean with zero ERESOLVE (LINT-03 gate preserved from v1.4)
  5. `npm run build` produces an installable Electron package; smoke-test on Windows 11 (dev box) passes
  6. All 18 v2.0 REQ-IDs verified complete per REQUIREMENTS.md traceability
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Filename Format Configurator | v1.2 | 1/1 | Complete | 2026-04-03 |
| 2. Discord Bug & Feature Tracker Bot | v1.2 | 10/10 | Complete | 2026-04-20 |
| 3. Font Awesome v5 → v6 | v1.3 | 2/2 | Complete | 2026-04-21 |
| 4. Prettier 3 Codebase Reformat | v1.3 | 3/3 | Complete | 2026-04-21 |
| 5. Babel Package Renames | v1.4 | 2/2 | Complete | 2026-04-22 |
| 6. ESLint 9 Flat Config + Prettier Full Wiring | v1.4 | 2/2 | Complete | 2026-04-22 |
| 7. TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps | v1.4 | 4/4 | Complete | 2026-04-22 |
| 8. Vue 3 core + router + UI + Font Awesome (MERGED) | v2.0 | 6/6 | Complete | 2026-04-22 |
| 9. webpack → Vite bundler | v2.0 | 5/5 | Complete | 2026-04-22 |
| 10. Jest → Vitest | v2.0 | 1/1 | Complete | 2026-04-22 |
| 11. ESLint/Vue ecosystem cleanup | v2.0 | 0/1 | Not started | - |
| 12. .js → .ts conversion + typescript-eslint/parser primary | v2.0 | 0/? | Not started | - |
| 13. Electron main-process fixes + ship prep | v2.0 | 0/? | Not started | - |

---

## Next Milestone Candidates

Post-v2.0 considerations seeded:
- **v2.1 bot Vitest migration** — `bot/` workspace gets its own Jest → Vitest migration (kept separate from v2.0 per REQUIREMENTS scope)
- **v2.1 stricter tsconfig** — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` (deferred from v2.0 to keep `.js → .ts` scope manageable)
- **Electron major bump** — stays on Electron 41 through v2.0; future version-bump triggered by CVE or Electron LTS cadence

Run `/gsd-new-milestone` after v2.0 ships to scope the next cycle.
