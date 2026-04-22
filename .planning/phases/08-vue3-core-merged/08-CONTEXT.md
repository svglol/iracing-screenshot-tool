# Phase 8: Vue 3 core + router + UI framework + Font Awesome (MERGED) - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Auto-generated after user decision to merge phases 8+9+10+13

<domain>
## Phase Boundary

Land Vue 3 on the Electron renderer with a fully working UI in one bisectable phase. Every Vue-2-only dependency ships in the same landing so the app boots on Vue 3 with working router, UI framework, and icons.

**In scope:**
1. Vue 2.7 → Vue 3 core (template syntax, reactivity, component registration, slot syntax)
2. `vue-router` 3 → 4 (`createRouter`/`createWebHashHistory`, guard API changes)
3. `vue-loader` 15 → 17 in webpack (pre-Vite; Vite swap is Phase 9)
4. `vue-devtools` → `@vue/devtools`
5. Buefy → Oruga (all 47 component instances) + Bulma 0.9 → 1.0 (Oruga is Bulma-native)
6. Drop legacy FA v5.2.0 CDN `@import` from `src/renderer/assets/style/main.scss:153`
7. Font Awesome svg-core + icon packs v6 → v7
8. `@fortawesome/vue-fontawesome` 2.x → 3.x

**Out of scope (deferred to later phases):**
- webpack → Vite bundler swap (Phase 9)
- Jest → Vitest (Phase 10)
- ESLint ecosystem cleanup (Phase 11)
- `.js` → `.ts` conversion (Phase 12)
- Electron `addDevToolsExtension` fix (Phase 13)
- Composition API rewrite of existing components (REQUIREMENTS.md out-of-scope — keep Options API where it works; Composition API only where Vue 3 requires or it's a clear per-component DX win)

</domain>

<decisions>
## Implementation Decisions

### Phase Structure (D-08-01)
- **D-08-01:** Phases 8+9+10+13 merged into one Phase 8. Reason: Buefy, `@fortawesome/vue-fontawesome@2.x`, and Vue Router 3 are all Vue-2-only — shipping Vue 3 core alone breaks the app. User confirmed merge on 2026-04-22 after scout report. Renumbered: 11→9, 12→10, 14→11, 15→12, 16→13.

### Vue 3 Migration Approach (D-08-02 to D-08-05)
- **D-08-02:** **No `@vue/compat` build** — ROADMAP explicitly disallows it; REQ success criterion #6 requires "no Vue 2 → Vue 3 migration warnings in browser console." Migrate directly, not through compat.
- **D-08-03:** **Options API preserved where it works** — REQUIREMENTS.md out-of-scope explicitly: "Composition API rewrite of all components." Touch each SFC minimally. Composition API only for cases Vue 3 forces (e.g., `<script setup>` is optional, not required).
- **D-08-04:** **`.sync` retirement** — Settings.vue has 3 `:active.sync` on `b-modal`. Rewrite as `v-model:active` in the equivalent `<o-modal>` after Buefy→Oruga swap. Don't migrate `.sync` in Buefy form and then again in Oruga form — do the Oruga migration in the same edit.
- **D-08-05:** **`this.$set` → direct assignment** — Home.vue has 2 instances (lines 351, 496). Vue 3 reactivity is proxy-based; direct `this.foo.bar = baz` on a reactive Options-API data property works. No code structure change needed, just drop `$set`.

### Router Migration (D-08-06 to D-08-08)
- **D-08-06:** **`createWebHashHistory`** — Electron app uses `file://` protocol so hash-mode routing is the safe choice (history mode requires a web server). Current Vue Router 3 setup is implicitly hash-mode; preserve that.
- **D-08-07:** **Keep existing routes as-is** — only 2 routes (`/home`, `/worker`) + root redirect. No route restructuring; just API translation. `routes` array syntax is compatible; `new Router({...})` → `createRouter({history, routes})`.
- **D-08-08:** **IPC `change-view` handler preserved** — `src/renderer/main.js:62` IPC handler calls `router.push()`. Vue Router 4's `router.push()` API is compatible; keep the handler intact.

### Buefy → Oruga Migration (D-08-09 to D-08-14)
- **D-08-09:** **`@oruga-ui/oruga-next` as the Vue 3 Buefy replacement** — locked at milestone start (PROJECT.md A1 decision). Bulma-native config preserved.
- **D-08-10:** **Visual parity via Bulma 1.0 + Oruga's Bulma-native config** — Oruga doesn't ship styling; we wire it to Bulma 1.0 via `@oruga-ui/theme-bulma` (or inline config). Visual parity on all 4 views is the UAT gate (success criterion #4).
- **D-08-11:** **Component mapping cheat sheet** — Each `<b-X>` maps 1:1 to `<o-X>` where the same prop names exist; API differences are mostly attribute renames. Key mappings:
  - `<b-button>` → `<o-button>`
  - `<b-modal :active.sync="x">` → `<o-modal v-model:active="x">`
  - `<b-input>` / `<b-field>` → `<o-input>` / `<o-field>`
  - `<b-select>` → `<o-select>`
  - `<b-switch>` → `<o-switch>`
  - `<b-tag>` → `<o-tag>`
  - `<b-carousel>` / `<b-carousel-item>` → `<o-carousel>` / `<o-carousel-item>` (verify API during plan)
  - `<b-message>` → `<o-notification>` (NOT `<o-message>` — Oruga renamed this one)
  - Researcher verifies any surprise mappings during plan-phase.
- **D-08-12:** **Bulma 0.9 → 1.0 SASS breaking changes** — Bulma 1.0 dropped some legacy mixins. Researcher audits `src/renderer/assets/style/*.scss` for breaking changes during plan-phase. Expect: `$family-sans-serif` rename, derived variables, and `mixins/_all.sass` entry point change.
- **D-08-13:** **Drop `use.fontawesome.com` CDN `@import`** — `src/renderer/assets/style/main.scss:153` is the only reference per scout. Remove the line; FA styling now comes exclusively through the `vue-fontawesome` v3.x integration. This is an instant win inside the Phase 8 commit chain — not a separate sub-step.
- **D-08-14:** **Buefy-specific plugins removed from `main.js`** — `Vue.use(Buefy)` at line ~30 retires; replaced with `app.use(Oruga, oragaConfig)`.

### Font Awesome Migration (D-08-15 to D-08-17)
- **D-08-15:** **`@fortawesome/vue-fontawesome` 2.x → 3.x** — required for Vue 3; `FontAwesomeIcon` component registration pattern changes slightly (uses Vue 3 app `.component()` instead of `Vue.component()`).
- **D-08-16:** **FA icon packs v6 → v7** — inherit v1.3 Phase 3 D-07 icon-pruning pattern (three-grep audit: templates + dynamic + any Oruga iconpack config). Research FA v7 rename list; capture migrations inline.
- **D-08-17:** **Library registration via Vue 3 app instance** — `library.add(...)` still works as a module-level call; `app.component('font-awesome-icon', FontAwesomeIcon)` replaces `Vue.component(...)`.

### Bisect Shape (D-08-18)
- **D-08-18:** **Multi-commit bisect chain per D-04 pattern** — despite the merge, keep each migration as its own commit-pair (`chore(deps): bump X` + content commit). Expected shape:
  1. `chore(deps): bump vue + vue-router + vue-loader + @vue/devtools` (dep bump)
  2. `refactor(renderer): migrate main.js to createApp pattern` (content)
  3. `refactor(renderer): migrate router to vue-router 4 API` (content)
  4. `chore(deps): bump @oruga-ui/oruga-next + bulma + remove buefy`
  5. `refactor(renderer): migrate SFCs from Buefy to Oruga` (content — likely split per view/component)
  6. `chore(deps): bump @fortawesome/* to v7 + vue-fontawesome to 3.x`
  7. `refactor(renderer): migrate FA icon registration + CDN cleanup`
  8. `docs(v2.0): align roadmap and traceability to merged phase 8`
  - Planner refines the exact commit order; each landing stays bisectable.

### Test / Lint Targets (D-08-19)
- **D-08-19:** **Test band: 256/256** — all root tests still pass; renderer has no Vue component tests (scout confirmed). Lint band: ≤1881 (v1.4 ceiling). `npm run pack:renderer` compiles clean under webpack.

### Claude's Discretion
- Exact order of SFC migrations (App.vue → modals → views, or top-down, etc.)
- Whether to use `<script setup>` sugar on new or heavily-changed components (not required, but allowed if it simplifies a specific migration)
- Oruga theme-bulma config vs inline SCSS overrides
- Handling of Vuex-as-imported-but-not-really-used (scout flagged: `store/index.js` imports Vuex but module isn't wired) — if truly unused, delete; otherwise preserve behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vue 3 migration
- `https://vuejs.org/guide/extras/migration.html` — Official Vue 3 migration guide (breaking changes overview)
- `https://v3-migration.vuejs.org/breaking-changes/` — Full breaking-change list with before/after snippets

### Vue Router 4
- `https://router.vuejs.org/guide/migration/` — vue-router 3→4 migration guide
- `https://router.vuejs.org/api/` — Vue Router 4 API reference

### Oruga
- `https://oruga-ui.com/documentation/` — Oruga component docs
- `https://github.com/oruga-ui/theme-bulma` — Oruga Bulma theme (install + config)

### Bulma 1.0
- `https://bulma.io/releases/1.0.0/` — Bulma 1.0 release notes
- `https://versions.bulma.io/` — Bulma version comparison tool

### Font Awesome
- `https://docs.fontawesome.com/web/use-with/vue/` — vue-fontawesome v3 docs (Vue 3)
- `https://fontawesome.com/v7/changelog/` — FA v7 changelog (icon renames)

### Project-local refs
- `.planning/PROJECT.md` — A1/B2/C1 milestone-start decisions
- `.planning/REQUIREMENTS.md` — 18 REQ-IDs (VUE3-01..04, UI-02..05 now all in this phase; BUNDLER/TS/LINT/FIX in later phases)
- `.planning/milestones/v1.3-phases/` — prior FA v5→v6 migration pattern (D-07 icon-pruning three-grep audit)
- `.planning/STATE.md` — current project state with v1.4 decisions carrying forward
- `src/renderer/main.js` — Vue 2 entry point (66 lines — all plugin registrations live here)
- `src/renderer/router/index.js` — Vue Router 3 config (routes)
- `src/renderer/assets/style/main.scss` — line 153 has the FA v5 CDN `@import` to remove
- `_scripts/webpack.renderer.config.js` — `vue$` alias line 108 (Vue 2 specific); vue-loader config

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/renderer/main.js` (66 lines):** All plugin registrations centralized here (`Vue.use(...)` × 5, `Vue.component(...)` × 3, IPC listener on line 62). Single-file blast radius for `createApp()` conversion.
- **`src/renderer/router/index.js`:** Small router config (2 routes); easy API swap. `router-view` implicitly via `App.vue`.
- **`src/renderer/App.vue` (23 lines):** Trivial root; minimal changes expected.
- **No Vuex store actually wired** — scout flagged `store/index.js` imports Vuex but isn't used in app.

### Established Patterns
- **D-04 two/three/four-commit bisect shape** — used across every v1.3 and v1.4 phase. Carry forward here: each dep bump is its own `chore(deps):` commit, each content-migration set is its own follow-up. D-08-18 sketches the expected chain.
- **FA icon-pruning three-grep audit (D-07 from v1.3 Phase 3)** — template grep + dynamic-icon grep + Buefy iconpack config grep. Repeat for Oruga iconpack config during Phase 8.
- **`^2` pin on `vue-fontawesome` dodged `latest`-resolves-to-v3 pitfall in v1.3 Phase 3** — bump to explicit `^3.x` now, same pinning discipline.
- **Preserve `.prettierrc` byte-for-byte** — v1.3 Phase 4 lesson; any formatter config changes get a separate commit.

### Integration Points
- **IPC `change-view` → `router.push()`** — preserve exact behavior; only the Vue Router 4 push API syntax changes (the call signature is compatible).
- **Webpack `vue$: 'vue/dist/vue.common.js'` alias** — Vue 2 specific; must change. Vue 3 shipping format differs; researcher confirms correct alias (likely `vue$: 'vue/dist/vue.esm-bundler.js'` or drop the alias entirely if Vue 3 defaults work).
- **vue-loader 15 `VueLoaderPlugin`** — API compatible with vue-loader 17, same plugin registration; researcher verifies.
- **Buefy's Vue 2-only iconpack config** — Buefy wires FA via a `defaultIconPack: 'fas'` config. Oruga has its own iconpack config (verify during plan).

### Risks Flagged by Scout
- **CRITICAL:** Buefy has no Vue 3 version — must full-replace in this phase (addressed by merge decision)
- **CRITICAL:** vue-fontawesome v2.x is Vue 2-only — must bump to 3.x in same phase (addressed by merge)
- **CRITICAL:** Vue Router 3 incompatible with Vue 3 — must bump to v4 in same phase (addressed by merge)
- **MEDIUM:** Third-party Vue 2 plugins (`vue-lazyload`, `vue-shortkey`, `v-click-outside`, `vue-simple-context-menu`, `vue-markdown-plus`) — researcher verifies Vue 3 compatibility during plan-phase. Expect at least one to need a replacement or major bump. **This is a plan-phase verify, not a blocker for discuss.**

</code_context>

<specifics>
## Specific Ideas

- **Bisect discipline matters more than usual here** — 9 breaking changes in one phase. Multi-commit D-04 shape (D-08-18) keeps any single regression isolatable via `git bisect`.
- **UAT checklist per view** — all 4 nav destinations (Home, Worker, Settings-modal, Help-modal) must click through and behave identically. Manual smoke-test gate before merge.
- **Don't touch Jest yet** — tests still run under Jest 25 with `@vue/test-utils` v1 (if any Vue tests exist — scout says none). Vitest is Phase 10. Keep current test stack working through Phase 8.
- **`_scripts/webpack.renderer.config.js` touches are minimal** — vue-loader version bump + alias swap. No webpack → Vite migration (that's Phase 9).

</specifics>

<deferred>
## Deferred Ideas

- **`@vue/compat` migration build** — explicitly rejected per ROADMAP. Not an option.
- **Composition API rewrite of stable components** — out-of-scope per REQUIREMENTS.md. Only rewrite to Composition API where Vue 3 requires it or where a specific component's migration is clearly simpler in setup()-form.
- **Switching renderer to TypeScript mid-phase** — Phase 12. Don't start converting `.js` → `.ts` even opportunistically; keep renderer JS through Phase 8.
- **Electron `addDevToolsExtension` fix at `src/main/index.js:116`** — Phase 13. Not blocking Phase 8; leave alone.
- **Third-party Vue 2 plugin replacements** — if any of `vue-lazyload`, `vue-shortkey`, etc. need replacing, scope that in the plan but don't add new capabilities; match existing behavior only.
- **`@electron/remote` removal** — REQUIREMENTS.md out-of-scope for v2.0; leave alone.

</deferred>

---

*Phase: 08-vue3-core-merged*
*Context gathered: 2026-04-22*
