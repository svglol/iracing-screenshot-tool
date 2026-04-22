# Requirements — v2.0 Vue 3 Migration

**Milestone:** v2.0 Vue 3 Migration
**Started:** 2026-04-22
**Goal:** Migrate the Electron app from Vue 2.7 + Buefy + webpack to Vue 3 + Oruga + Vite, clear all deferred v1.4 tech debt, and complete the `.js` → `.ts` conversion in `src/`.

---

## Active Requirements

### Vue 3 Core (VUE3)

- [ ] **VUE3-01**: Vue 2.7 → Vue 3 migrated — template syntax, reactivity semantics, component registration, slot syntax all updated; existing view behavior preserved across all 4 views (Home, Help, About, Settings); no runtime console warnings from Vue 3 migration patterns
- [ ] **VUE3-02**: `vue-router` 3 → 4 migrated — route definitions, navigation guards, `<router-view>` / `<router-link>` usage all compatible with Vue Router 4 API
- [ ] **VUE3-03**: `vue-loader` 15 → 17 migrated — webpack (or Vite post-Phase-11) parses and compiles `.vue` SFCs with no loader warnings; `@vue/compiler-sfc` transitive dependency replaces `vue-template-compiler`
- [ ] **VUE3-04**: `vue-devtools` → `@vue/devtools` migrated — dev-time devtools integration works with Vue 3; legacy `vue-devtools` removed from devDependencies

### UI Framework (UI)

- [ ] **UI-02**: Buefy → Oruga UI framework migrated — all Buefy components replaced with Oruga equivalents; visual identity preserved (Bulma-native, same CSS customization surface); all existing UI behavior (modals, dropdowns, buttons, form inputs, navigation) functional
- [ ] **UI-03**: Bulma 0.9 → 1.0 SASS migration — updated Bulma mixins/variables; compiled CSS bundle works with Oruga's Bulma-native theming; no SASS compile errors under the new version
- [x] **UI-04**: `main.scss` Font Awesome v5.2.0 CDN `@import` removed (line 153) — the legacy `@import "https://use.fontawesome.com/releases/v5.2.0/css/..."` is retired; FA styling comes entirely from `@fortawesome/vue-fontawesome` 3.x + `@fortawesome/fontawesome-svg-core` (no CDN dependency) — CLOSED 2026-04-22 in Phase 8 Plan 05 (verified via `grep -rc "use.fontawesome.com" src/` = 0; CDN was already removed in Plan 03's main.scss rewrite to Bulma 1.0 `@use`, Plan 05 verifies it stays gone)
- [x] **UI-05**: Font Awesome v6 → v7 upgraded — `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-brands-svg-icons`, `@fortawesome/free-solid-svg-icons` all at v7.x; `@fortawesome/vue-fontawesome` 2.x → 3.x (requires Vue 3) — CLOSED 2026-04-22 in Phase 8 Plan 05 (all 4 FA pins now `^7.2.0` / `^3.2.0`; three-grep icon audit confirmed A8 CLEAN — zero v6→v7 renames on our surface; `npm run pack:renderer` exit 0; `npm test` 256/256)

### Bundler (BUNDLER)

- [ ] **BUNDLER-01**: webpack → Vite bundler migrated for both `pack:main` and `pack:renderer` — `_scripts/webpack.*.config.js` replaced with `vite.config.ts` (or equivalent); `electron-builder` build flow unchanged; `npm run build` produces a working Electron package; dev-mode HMR works via `vite dev`
- [ ] **BUNDLER-02**: Jest 25 → Vitest migrated — `jest.config.*` replaced with `vitest.config.ts`; all 256 existing tests pass under Vitest; `testPathIgnorePatterns` equivalent excludes `bot/` per existing convention; `jimp` tests (transitive-migrated by dependabot) still pass

### TypeScript Conversion (TS)

- [ ] **TS-03**: `.js` → `.ts` conversion in `src/` — all source files in `src/main/`, `src/renderer/`, `src/utilities/` converted to TypeScript; `.vue` files use `<script lang="ts">`; `tsconfig.json` `include` expanded beyond `src/utilities` to cover the full `src/` tree; zero `tsc --noEmit` errors in `src/`
- [ ] **TS-04**: `@typescript-eslint/parser` adopted as primary lint parser for `.ts/.vue` — replaces `@babel/eslint-parser` for source lints; `@babel/eslint-parser` either removed or retained only for `_scripts/` if those stay `.js`

### ESLint Ecosystem Cleanup (LINT)

- [ ] **LINT-04**: `eslint-plugin-vue` 9 → 10+ (Vue-3-matched major) — rule renames migrated; `plugin:vue/vue3-recommended` (or successor) replaces `plugin:vue/recommended`
- [ ] **LINT-05**: `vue-eslint-parser` 7 → 9 — native flat-config parser for Vue 3 SFCs
- [ ] **LINT-06**: `eslint-config-standard` 14 → 17+ or replaced with `neostandard` — one of the two migrations complete; flat-config native
- [ ] **LINT-07**: `@eslint/compat fixupConfigRules` shim removed — all legacy plugins upgraded or replaced; flat-config native loading throughout `eslint.config.js`
- [ ] **LINT-08**: Legacy plugin cleanup — `eslint-plugin-import@2`, `eslint-plugin-node@11`, `eslint-plugin-promise@4`, `eslint-plugin-standard@4` either upgraded to flat-config-native majors or removed if obsoleted by `neostandard` / typescript-eslint 8 coverage

### Pre-existing Fixes (FIX)

- [ ] **FIX-01**: Electron main-process `electron.BrowserWindow.addDevToolsExtension is not a function` error fixed at `src/main/index.js:116` — either migrated to `session.defaultSession.loadExtension()` (current Electron API) or feature-flagged behind dev-only guard

---

## Success Criteria (Milestone-Level)

Observable outcomes signaling v2.0 complete:
1. `npm run dev` launches Electron app with Vue 3 + Oruga + Vite HMR; no console errors
2. `npm run build` produces a working Electron installer using Vite (not webpack)
3. `npm run test` runs 256/256 (or renamed equivalent count) under Vitest
4. `npm run lint` runs against `eslint.config.js` with typescript-eslint 8 as primary parser; count in the v1.4 band (≤1881 legacy ceiling) with all Vue 3 rules active
5. `npx tsc --noEmit` compiles full `src/` tree (not just `src/utilities/`) with zero errors
6. All 4 views (Home, Help, About, Settings) render and function as before (visual + interactive parity)
7. No `--legacy-peer-deps` needed (inherited from v1.4 LINT-03 closure)
8. No `@eslint/compat fixupConfigRules` shim in `eslint.config.js`
9. `bot/` workspace unchanged (out of v2.0 scope; still uses its own Vitest-or-Jest config separately)

---

## Future Requirements (deferred beyond v2.0)

_Deferred to post-v2.0:_
- Stricter tsconfig flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`)
- Jest globals override for test files if Vitest migration doesn't naturally fix the `no-undef` surface on globals
- `bot/` workspace migration to Vitest (if desired — currently `bot/` has its own Jest config)
- In-app "Report a bug" button from Electron app (v1.2 deferral, remains deferred)
- Auto-duplicate detection via embeddings (v1.2 deferral, remains deferred)
- Automatic crash/telemetry reporting (v1.2 deferral, remains deferred)

---

## Out of Scope (v2.0)

- **Mac/Linux Electron builds** — iRacing is Windows-only (v1.0 scope rule, unchanged)
- **Feature additions** — v2.0 is a pure migration milestone; no new user-facing capabilities
- **`bot/` workspace refactoring** — separate codebase; keeps its own tooling through v2.0
- **Discord bot Vitest migration** — bot has its own Jest config; deferred to a post-v2.0 bot-specific milestone
- **Switching Electron major version** — stays on Electron 41 unless CVE-forced; Electron upgrade is a standalone ticket
- **Replacing `sharp`, `irsdk-node`, or `jimp`** — all at recent stable; not migration-relevant
- **Composition API rewrite of all components** — use Options API where it works; only rewrite to Composition API where Vue 3 requires it or where it's a clear DX win per-component
- **Removing `@electron/remote`** — still load-bearing; post-v2.0 ticket if the Electron ecosystem deprecates it further

---

## Traceability

_Populated by roadmap creation — maps each REQ-ID to its phase._

| REQ-ID | Phase | Status |
|--------|-------|--------|
| VUE3-01 | Phase 8 (merged) | pending |
| VUE3-02 | Phase 8 (merged) | pending |
| VUE3-03 | Phase 8 (merged) | pending |
| VUE3-04 | Phase 8 (merged) | pending |
| UI-02 | Phase 8 (merged) | pending |
| UI-03 | Phase 8 (merged) | pending |
| UI-04 | Phase 8 (merged) | complete (2026-04-22, Plan 05) |
| UI-05 | Phase 8 (merged) | complete (2026-04-22, Plan 05) |
| BUNDLER-01 | Phase 9 (was 11) | pending |
| BUNDLER-02 | Phase 10 (was 12) | pending |
| LINT-04 | Phase 11 (was 14) | pending |
| LINT-05 | Phase 11 (was 14) | pending |
| LINT-06 | Phase 11 (was 14) | pending |
| LINT-07 | Phase 11 (was 14) | pending |
| LINT-08 | Phase 11 (was 14) | pending |
| TS-03 | Phase 12 (was 15) | pending |
| TS-04 | Phase 12 (was 15) | pending |
| FIX-01 | Phase 13 (was 16) | pending |

**Coverage:** 18/18 requirements mapped — no orphans, no duplicates.

**Phase merge note (2026-04-22):** Original phases 8, 9, 10, 13 merged into one Phase 8 after codebase scout revealed Buefy + vue-fontawesome v2 + Vue Router 3 are all Vue-2-only. Shipping Vue 3 core alone would break the app. Phases renumbered: 11→9, 12→10, 14→11, 15→12, 16→13. All 18 REQ-IDs still covered.

---

*Generated 2026-04-22 by `/gsd-new-milestone`. Updated on phase transitions and milestone close.*
