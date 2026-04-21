# Milestone v1.3 Requirements: UI Refresh

**Milestone goal:** Ship user-visible UI polish via isolated, low-risk dependency upgrades — independent of the Vue 2/3 migration track.

Derived from dependency analysis (`.planning/notes/dependency-analysis-2026-04.md`) and the v1.3 UI Refresh seed (`.planning/seeds/v1.3-ui-refresh.md`), updated after codebase scout revealed Vue-2 ceilings on Font Awesome and Bulma.

---

## v1.3 Requirements

### UI — User-visible upgrades

- [ ] **UI-01**: Font Awesome upgraded from v5.13 / core 1.2 to **v6.x** across `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-brands-svg-icons`, and `@fortawesome/free-solid-svg-icons`, PLUS `@fortawesome/vue-fontawesome` 0.1.x → 2.x (required pairing for FA core 6.x on Vue 2). All existing icon usage continues to render; no visual regressions on existing glyphs.

### TOOL — Developer-facing upgrades

- [ ] **TOOL-01**: Codebase reformatted with Prettier 3.3 in a single "format: prettier 3" commit for clean git blame. ESLint + Prettier integration (`eslint-config-prettier`, `eslint-plugin-prettier`) continues to pass with no new warnings.

---

## Future Requirements (deferred)

From `v1.4-tooling-modernization.md` seed — deferred to milestone v1.4:

- TypeScript 3.8 → 5.7 with `@typescript-eslint/*` 2 → 8
- ESLint 7 → 9 with flat config migration
- Retire deprecated `babel-runtime` 6.x (→ `@babel/runtime`) and `babel-eslint` 10.x (→ `@babel/eslint-parser`)
- Prettier ESLint ecosystem (`eslint-config-prettier` 6 → 10, `eslint-plugin-prettier` 3 → 5) — may need minor bumps during Phase 4 for compatibility; full migration to flat-config versions deferred to v1.4

From `v2.0-vue-3-migration.md` seed — deferred to milestone v2.0:

- Vue 2.7.16 → Vue 3.5.x (EOL-driven; infectious migration)
- `buefy` 0.9.29 replacement (no Vue 3 version exists — Oruga / PrimeVue / Vuetify 3)
- **Bulma 0.9.4 → 1.0.2** (moved here from v1.3 after codebase scout — Buefy's SCSS depends on Bulma 0.9's `findColorInvert` / old `$colors` map; Bulma 1.0 CSS-variable theming would break Buefy. Natural fit once Buefy is replaced in v2.0.)
- **Font Awesome v6 → v7** (`@fortawesome/vue-fontawesome` 2 → 3 requires Vue 3)
- `vue-router` 3 → 4, `vue-loader` 15 → 17, `vue-devtools` 5 → 7
- Bundler switch: webpack → Vite + Electron (`electron-vite`)
- Test runner: Jest 30 → Vitest (Jest 30 already done by dependabot, but Vite switch favours Vitest)
- `eslint-plugin-vue` 6 → 9, `vue-eslint-parser` 7 → 9

---

## Already Done Upstream (dependabot, since PR #25 merge)

Removed from milestone scope:

- ✅ **Jimp 0.10 → 1.6.1** — was originally TOOL-02. Consolidated via dependabot PR #42.
- ✅ **Jest 25 → 30.3.0** (main repo + bot) — unexpected bonus; bot test harness was previously pinned to Jest 25 for `babel-jest` ESM bridge. Test suite implications to be verified as part of any phase that exercises tests.
- ✅ **np 6 → 11.2.0** — release tool bumped.
- ✅ **got** — transitive dep bumped.

---

## Out of Scope for v1.3

- **Font Awesome v7** — requires `vue-fontawesome` 3.x which requires Vue 3; v6 is the Vue-2 ceiling. Deferred to v2.0.
- **Bulma 1.0** — would break Buefy 0.9.29's SCSS; natural fit for v2.0 alongside Buefy replacement.
- **`@fortawesome/vue-fontawesome` 0.1 → 3** — requires Vue 3; v1.3 takes it to 2.x only, v3.x deferred to v2.0.
- **Vue 2 → Vue 3 migration** — scope too large; dedicated v2.0 milestone.
- **TypeScript 3 → 5** — deferred to v1.4 (paired with ESLint 9 and `@typescript-eslint/*` 8).
- **ESLint 7 → 9 flat config** — deferred to v1.4.
- **Cascade updates** (`vue-router`, `vue-loader`, etc.) — tied to Vue 3 migration, defer to v2.0.
- **`chalk` 3 → 5** — deferred indefinitely (no blocker).

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 (Font Awesome v5 → v6 + vue-fontawesome 0.1 → 2) | Phase 3 | Pending |
| TOOL-01 (Prettier 3) | Phase 4 | Pending |

100% of v1.3 requirements mapped to phases.

---

*Created: 2026-04-21 at milestone v1.3 kickoff. Rescoped after codebase scout: FA target dropped v7 → v6, Bulma 1.0 moved to v2.0.*
