# Roadmap: iRacing Screenshot Tool

## Milestones

- ✅ **v1.2 Feature Enhancements** — Phases 1-2 (shipped 2026-04-20 via PR #25) — [archive](./milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 UI Refresh** — Phases 3-4 (shipped 2026-04-21) — [archive](./milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Tooling Modernization** — Phases 5-7 (shipped 2026-04-22) — [archive](./milestones/v1.4-ROADMAP.md) · [requirements](./milestones/v1.4-REQUIREMENTS.md) · [audit](./milestones/v1.4-MILESTONE-AUDIT.md)
- 🚧 **v2.0 Vue 3 Migration** — Phases 8-16 (active, started 2026-04-22)

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

### v2.0 Vue 3 Migration (Phases 8-16) — ACTIVE

- [ ] **Phase 8: Vue 2 → Vue 3 core** — migrate template syntax, reactivity semantics, component registration, slot syntax across all 4 views (Home, Help, About, Settings). Vue 2 compat build disallowed — land full Vue 3 in one phase.
- [ ] **Phase 9: Vue 3 ecosystem routing/tooling** — `vue-router` 3→4, `vue-loader` 15→17 (or Vite plugin post-Phase-11), `vue-devtools` → `@vue/devtools`
- [ ] **Phase 10: Buefy → Oruga + Bulma 0.9 → 1.0 + FA CDN cleanup** — paired UI migration (Oruga is Bulma-native, so Bulma bump travels with it); drops legacy FA v5.2.0 CDN `@import` in `main.scss` line 153
- [ ] **Phase 11: webpack → Vite bundler** — replaces `_scripts/webpack.*.config.js` with Vite config; `electron-builder` integration preserved
- [ ] **Phase 12: Jest 25 → Vitest** — pairs with Vite; all 256 tests migrate; `bot/` stays on its own Jest config
- [ ] **Phase 13: Font Awesome v6 → v7** — paired with `@fortawesome/vue-fontawesome` 2.x → 3.x (requires Vue 3 — lands after Phase 8)
- [ ] **Phase 14: ESLint/Vue ecosystem cleanup** — `eslint-plugin-vue` 9→10+, `vue-eslint-parser` 7→9, `eslint-config-standard` → `neostandard` (or 17+), remove `@eslint/compat fixupConfigRules` shim, legacy plugin cleanup (`eslint-plugin-import@2`, `-node@11`, `-promise@4`, `-standard@4`)
- [ ] **Phase 15: `.js` → `.ts` conversion in `src/`** — convert main/renderer/utilities source files; `.vue` SFCs use `<script lang="ts">`; `@typescript-eslint/parser` becomes primary lint parser
- [ ] **Phase 16: Electron main-process fixes + ship prep** — fix `addDevToolsExtension` error at `src/main/index.js:116`; clean up transitive `prettier@2.8.8` from old vue-loader dep graph; final UAT

## Phase Details

### Phase 8: Vue 2 → Vue 3 core
**Goal**: Migrate the Electron renderer from Vue 2.7 to Vue 3 — template syntax (`v-model` behavior change, `.sync` retired, slot syntax, `v-if/v-for` precedence), reactivity semantics (`ref`/`reactive` where needed, `this.$set` retired), component registration (`createApp` vs `new Vue`), global properties surface. Use the Options API where it continues to work; Composition API only where Vue 3 requires it or where it clearly improves the component.
**Depends on**: Nothing (first v2.0 phase; webpack still handles the build; bundler swap is Phase 11)
**Requirements**: VUE3-01
**Success Criteria** (what must be TRUE):
  1. `package.json` `dependencies.vue` pinned at `^3.x`; `vue-template-compiler` removed (replaced by `@vue/compiler-sfc`)
  2. `src/renderer/main.js` uses `createApp(App).use(router).mount('#app')` pattern (not `new Vue({...}).$mount(...)`)
  3. All 4 views (Home, Help, About, Settings) render and function identically to v1.4 — manual UAT checklist per view
  4. No Vue 2 → Vue 3 migration warnings in browser console at dev-runtime
  5. `npm run test` 256/256; `npm run lint` in v1.4 band (≤1881); `npm run pack:renderer` compiles clean under webpack (Vite swap comes Phase 11)
**Plans**: TBD

### Phase 9: Vue 3 ecosystem — router / loader / devtools
**Goal**: Migrate the Vue-adjacent build and navigation stack to Vue 3's ecosystem. `vue-router` 3 → 4 (route config + navigation guards + `<router-link>`/`<router-view>` API changes). `vue-loader` 15 → 17 in webpack config (this phase still pre-Vite). `vue-devtools` → `@vue/devtools` for dev-time inspection.
**Depends on**: Phase 8 (all require Vue 3 runtime in place first)
**Requirements**: VUE3-02, VUE3-03, VUE3-04
**Success Criteria**:
  1. `vue-router` at `^4.x`; navigation across all 4 views works end-to-end
  2. `vue-loader` at `^17.x` in `_scripts/webpack.renderer.config.js`; `npm run pack:renderer` compiles SFCs clean
  3. `@vue/devtools` launches in dev-mode via `npm run dev`; `vue-devtools` dep removed from `devDependencies`
  4. `npm run test` 256/256; `npm run lint` in v1.4 band
**Plans**: TBD

### Phase 10: Buefy → Oruga + Bulma 0.9 → 1.0 + main.scss FA CDN cleanup
**Goal**: Replace Buefy (Vue 2, Bulma 0.9-tied) with Oruga (Vue 3, Bulma-agnostic but Bulma-native config preserved). Bump Bulma 0.9 → 1.0 alongside (Oruga is intentionally Bulma-compatible, so these travel together). Remove the legacy `@import "https://use.fontawesome.com/releases/v5.2.0/css/..."` from `src/renderer/assets/style/main.scss:153` — FA styling comes entirely from the `@fortawesome/vue-fontawesome` integration now (Phase 13 bumps it to v7).
**Depends on**: Phase 8 (Oruga requires Vue 3)
**Requirements**: UI-02, UI-03, UI-04
**Success Criteria**:
  1. `package.json` `dependencies.buefy` removed; `@oruga-ui/oruga-next` installed at `^0.x` latest; Oruga imports registered via `createApp(App).use(Oruga, config)` in `src/renderer/main.js`
  2. Every Buefy component (`<b-button>`, `<b-modal>`, `<b-input>`, `<b-dropdown>`, `<b-navbar>`, `<b-notification>`, etc.) migrated to its Oruga equivalent (`<o-button>`, `<o-modal>`, `<o-input>`, `<o-dropdown>`, etc.)
  3. `bulma` at `^1.0.x`; SASS compiles clean with no deprecation warnings; visual parity on all 4 views
  4. `src/renderer/assets/style/main.scss` line 153 FA CDN `@import` removed; no references to `use.fontawesome.com` anywhere in `src/`
  5. `npm run test` 256/256 (or migrated Vitest count); builds clean; UAT on all 4 views approves visual parity
**Plans**: TBD

### Phase 11: webpack → Vite bundler + Electron
**Goal**: Replace the webpack build chain with Vite for both the main and renderer processes. `_scripts/webpack.*.config.js` retired; `vite.config.ts` (or `vite.renderer.config.ts` + `vite.main.config.ts`) takes over. `electron-builder` continues to consume the Vite output. Dev-mode HMR switches from webpack-dev-server to `vite dev`.
**Depends on**: Phase 9 (vue-loader 17 carries through to vite via `@vitejs/plugin-vue`), Phase 10 (UI migration landed before bundler swap to simplify bisect)
**Requirements**: BUNDLER-01
**Success Criteria**:
  1. No `webpack`, `webpack-cli`, `webpack-dev-server`, or `*-loader` devDependencies remain in `package.json` (except those Vite/Vitest legitimately need transitively — e.g., esbuild)
  2. `vite.config.ts` (or equivalent) is the authoritative build config; `@vitejs/plugin-vue` wired for SFC parsing
  3. `npm run dev` launches Electron with Vite dev server; HMR works across Vue component edits
  4. `npm run build` produces an installable Electron package via electron-builder; installer size within ±20% of v1.4 baseline
  5. `npm test` 256/256 (still Jest until Phase 12); `npm run lint` in v1.4 band
**Plans**: TBD

### Phase 12: Jest 25 → Vitest
**Goal**: Migrate the root test runner from Jest 25 (with babel-jest) to Vitest (native ESM, Vite-integrated). All 256 existing tests port over; `bot/` workspace keeps its own Jest config separately (explicit out-of-scope per REQUIREMENTS.md). `vitest.config.ts` replaces `jest.config.*`; `testPathIgnorePatterns` equivalent still excludes `bot/`.
**Depends on**: Phase 11 (Vitest uses Vite's config pipeline; easier after webpack retirement)
**Requirements**: BUNDLER-02
**Success Criteria**:
  1. `jest` + `babel-jest` removed from `devDependencies` (root only; `bot/` unchanged); `vitest` added at `^x.x` latest
  2. `vitest.config.ts` exists; excludes `bot/**`, `dist/**`, `build/**`, `.tools/**`
  3. `npm run test` runs 256/256 under Vitest; assertion API compatible (Vitest provides Jest-compatible `expect` by default)
  4. `bot/` tests still run separately via `bot/npm test` with its own Jest config unchanged (294/294)
  5. `npm run lint` in v1.4 band; builds clean
**Plans**: TBD

### Phase 13: Font Awesome v6 → v7 + vue-fontawesome 2.x → 3.x
**Goal**: Upgrade `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-brands-svg-icons`, `@fortawesome/free-solid-svg-icons` from v6 to v7. Upgrade `@fortawesome/vue-fontawesome` 2.x → 3.x (requires Vue 3 — deliberately scheduled after Phase 8). Inherit v1.3 Phase 3's icon-pruning pattern; any icon renames in FA v7 captured and migrated.
**Depends on**: Phase 8 (Vue 3), Phase 10 (UI migration — ensures all icon call sites are known)
**Requirements**: UI-05
**Success Criteria**:
  1. `package.json` FA packages all at `^7.x`; `@fortawesome/vue-fontawesome` at `^3.x`
  2. All icons in templates render correctly (v1.3 four-view UAT pattern); bundle delta ≤ 10% tolerance (FA v7 changelog reference)
  3. Any FA v6 → v7 renamed-icon migrations captured inline; `library.add(...)` still registers only icons used in templates (three-grep audit per v1.3 Phase 3 D-07)
  4. `npm run test` passes; `npm run lint` in v1.4 band; builds clean
**Plans**: TBD

### Phase 14: ESLint/Vue ecosystem cleanup
**Goal**: Upgrade and clean up the ESLint ecosystem now that Vue 3 landed. `eslint-plugin-vue` 9 → 10+ (v10 adds Vue 3-first rules), `vue-eslint-parser` 7 → 9 (native flat-config compatible). Replace `eslint-config-standard` 14 (legacy rc, loaded via FlatCompat) with `neostandard` (flat-config-native) or upgrade to `eslint-config-standard` 17+ if that line exists. Remove `@eslint/compat fixupConfigRules` shim (it was the v1.4 bridge; with all plugins upgraded, it's no longer needed). Retire deprecated plugins: `eslint-plugin-import@2`, `eslint-plugin-node@11` (use `eslint-plugin-n`), `eslint-plugin-promise@4`, `eslint-plugin-standard@4` (no-op, retired with standard migration).
**Depends on**: Phases 8, 11, 12 (Vue 3 + Vite + Vitest foundations in place so new rule sets don't surface regressions unrelated to lint)
**Requirements**: LINT-04, LINT-05, LINT-06, LINT-07, LINT-08
**Success Criteria**:
  1. `eslint-plugin-vue` at `^10.x`+; `vue-eslint-parser` at `^9.x`; `plugin:vue/vue3-recommended` (or successor) active
  2. `eslint-config-standard` replaced by `neostandard` (or upgraded to 17+); flat-config-native
  3. `@eslint/compat` and `fixupConfigRules` wrap removed from `eslint.config.js`; legacy plugins removed
  4. `npm run lint` runs clean under the new stack; count in v1.4 band (≤1881) — attribute deltas to rule set changes
  5. `npm test` 256/256 (Vitest); builds clean
**Plans**: TBD

### Phase 15: `.js` → `.ts` conversion + typescript-eslint/parser as primary
**Goal**: Convert all `src/main/`, `src/renderer/`, and `src/utilities/` source files from `.js` to `.ts`. Vue SFCs adopt `<script lang="ts">`. `tsconfig.json` `include` expanded from `src/utilities` to the full `src/` tree. `@typescript-eslint/parser` becomes the primary parser for `.ts/.vue` (`@babel/eslint-parser` retired or restricted to `_scripts/` if those stay `.js`). Type the public API surface of each utility; `any` allowed as a transitional escape hatch with a TODO comment.
**Depends on**: Phases 8, 10, 11, 12, 14 (Vue 3 + Oruga + Vite + Vitest + new ESLint stack — all in place so TS conversion doesn't fight other migrations)
**Requirements**: TS-03, TS-04
**Success Criteria**:
  1. All files in `src/main/`, `src/renderer/`, `src/utilities/` are `.ts` (or `.vue` with `<script lang="ts">`)
  2. `tsconfig.json` `include` expanded to `["src/**/*", "src/**/*.vue"]` (or equivalent covering the full tree)
  3. `npx tsc --noEmit` returns zero errors for `src/` (hard limit; use `@ts-expect-error` with TODO for genuinely blocked cases, capped at 15 instances total)
  4. `eslint.config.js` uses `@typescript-eslint/parser` as primary for `.ts/.vue` entries; `@babel/eslint-parser` either removed or scoped only to `_scripts/` `.js` files
  5. `npm test` 256/256 (Vitest recognizes `.ts` test files if any land); `npm run lint` in v1.4 band; builds clean
**Plans**: TBD

### Phase 16: Electron main-process fixes + ship prep
**Goal**: Final cleanup before v2.0 ships. Fix the pre-existing Electron 41 `electron.BrowserWindow.addDevToolsExtension is not a function` error at `src/main/index.js:116` — migrate to `session.defaultSession.loadExtension()` (current Electron API) or guard behind a dev-only flag. Clean up any transitive `prettier@2.8.8` that was load-bearing via old `vue-loader@15` — should fall out naturally once Phase 11 + Phase 9 retire the old dep graph; verify via `npm ls prettier`. Full milestone UAT across all 4 views (Home, Help, About, Settings).
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
| 8. Vue 2 → Vue 3 core | v2.0 | 0/? | Not started | - |
| 9. Vue 3 ecosystem (router/loader/devtools) | v2.0 | 0/? | Not started | - |
| 10. Buefy → Oruga + Bulma 1.0 + main.scss FA CDN cleanup | v2.0 | 0/? | Not started | - |
| 11. webpack → Vite bundler | v2.0 | 0/? | Not started | - |
| 12. Jest → Vitest | v2.0 | 0/? | Not started | - |
| 13. Font Awesome v6 → v7 + vue-fontawesome 2→3 | v2.0 | 0/? | Not started | - |
| 14. ESLint/Vue ecosystem cleanup | v2.0 | 0/? | Not started | - |
| 15. .js → .ts conversion + typescript-eslint/parser primary | v2.0 | 0/? | Not started | - |
| 16. Electron main-process fixes + ship prep | v2.0 | 0/? | Not started | - |

---

## Next Milestone Candidates

Post-v2.0 considerations seeded:
- **v2.1 bot Vitest migration** — `bot/` workspace gets its own Jest → Vitest migration (kept separate from v2.0 per REQUIREMENTS scope)
- **v2.1 stricter tsconfig** — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` (deferred from v2.0 to keep `.js → .ts` scope manageable)
- **Electron major bump** — stays on Electron 41 through v2.0; future version-bump triggered by CVE or Electron LTS cadence

Run `/gsd-new-milestone` after v2.0 ships to scope the next cycle.
