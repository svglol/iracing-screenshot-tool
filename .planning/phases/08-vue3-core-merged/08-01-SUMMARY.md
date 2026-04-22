---
phase: 08-vue3-core-merged
plan: 01
subsystem: renderer-bootstrap
tags: [vue3, vue-router, vue-loader, webpack, electron-renderer, bootstrap]
requirements: [VUE3-01, VUE3-02, VUE3-03, VUE3-04]
dependency_graph:
  requires: []
  provides:
    - "createApp(App).mount('#app') bootstrap pattern"
    - "vue-router 4 createRouter + createWebHashHistory API"
    - "vue-loader 17 named-export plugin registration"
    - "@vue/devtools 8.x (vue-devtools 5 retired)"
  affects:
    - "src/renderer/main.js"
    - "src/renderer/router/index.js"
    - "src/renderer/App.vue"
    - "_scripts/webpack.renderer.config.js"
    - "package.json / package-lock.json"
tech_stack:
  added:
    - "vue@3.5.33"
    - "vue-router@4.6.4"
    - "vue-loader@17.4.2"
    - "@vue/devtools@8.1.1"
  removed:
    - "vue@2.7.16"
    - "vue-router@3.6.5"
    - "vue-loader@15.11.1"
    - "vue-devtools@5.1.3"
    - "vue-template-compiler@2.7.16"
  patterns:
    - "createApp(App).use(router).mount('#app')"
    - "createRouter({ history: createWebHashHistory(), routes })"
    - "const { VueLoaderPlugin } = require('vue-loader') (v16+ named export)"
    - "router.push(data.route).catch(() => {}) (swallow navigation-duplication promise rejection)"
key_files:
  created: []
  modified:
    - "package.json"
    - "package-lock.json"
    - "src/renderer/main.js"
    - "src/renderer/router/index.js"
    - "src/renderer/App.vue"
    - "_scripts/webpack.renderer.config.js"
decisions:
  - "D-08-18 bisect shape: chore(deps) commit precedes refactor(renderer) commit for 1-commit-granularity git bisect on Vue 3 core regression."
  - "Retained Buefy, vClickOutside, VueShortkey, VueMarkdownPlus, VueLazyload .use() + font-awesome-icon/vue-simple-context-menu/vue-markdown-plus .component() registrations — deferred removal to Plans 03/05/06 per CONTEXT scope-limit."
  - "Dropped Vue.config.devtools/performance/productionTip entirely — Vue 3 has no equivalent runtime API; devtools auto-attach via @vue/devtools + build-mode flags is sufficient."
  - "catch-all route syntax '*' → '/:pathMatch(.*)*' per vue-router 4 API."
metrics:
  duration_minutes: ~10
  tasks_completed: 3
  tasks_total: 3
  files_touched: 6
  completed_date: 2026-04-22
---

# Phase 8 Plan 01: Vue 3 Bootstrap + Router Summary

One-liner: Vue 3 + vue-router 4 + vue-loader 17 foundation landed via createApp pattern + named-export loader plugin + catch-all regex route, preserving all Vue-2-era plugin registrations for later-plan retirement.

## Outcome

- `npm install` completed with zero ERESOLVE blocking errors. Expected peer-dep WARN from `@fortawesome/vue-fontawesome@2` and `buefy@0.9.29` declaring `vue@~2` peer — npm auto-overrode to `vue@3.5.33` without `--legacy-peer-deps`. These two packages retire in Plans 03 (Buefy→Oruga) and 05 (FA v3.x).
- `npm run pack:renderer` exits 0. Bundle size: `dist/renderer.js = 1,981,701 bytes (~1.98 MB)`. 45 webpack warnings — all pre-existing Bulma SASS `if()` deprecation warnings (367 collapsed) plus one expected `vue-simple-context-menu` default-export-not-found (Vue 2 runtime API, retires in Plan 06).
- `npm test` → 256/256 passed. No regression from Vue 3 stack swap.
- `npm run lint` → 731 problems (728 errors, 3 warnings). WITHIN v1.4 band ≤1881. All pre-existing — jest globals in `main/**/*.test.js`, unused-vars in `src/main/index.js`, release.js helpers. None introduced by this plan. Per SCOPE BOUNDARY rule: out-of-scope and deferred.

## Installed Versions (from npm ls)

- `vue@3.5.33` (top-level)
- `vue-router@4.6.4` (newer 4.x patch than pin — acceptable per ^4.5.0)
- `vue-loader@17.4.2`
- `@vue/devtools@8.1.1`
- `@vue/compiler-sfc@3.5.33` — present transitively via vue@3; no explicit pin added per plan Task 1.
- `vue-template-compiler` / `vue-devtools` → removed (both npm ls queries return empty).

## Commits

| Hash       | Message                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------- |
| `97bc6e8`  | chore(deps): bump vue + vue-router + vue-loader + @vue/devtools                             |
| `4564ac3`  | refactor(renderer): migrate main.js to createApp + vue-router 4 API + webpack alias cleanup |

Bisect range: `git bisect start 4564ac3 4564ac3^^` covers Plan 01 with 1-commit granularity per D-08-18.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Lint autofix] ESLint `vue/component-definition-name-casing` renamed `app.component()` string keys**
- **Found during:** Task 2 (after `npm run lint --fix` ran as part of verify)
- **Issue:** ESLint's `eslint-plugin-vue` rule autofixed `app.component('font-awesome-icon', ...)` → `app.component('FontAwesomeIcon', ...)` (and same for the other two). Plan specified kebab-case literals.
- **Fix:** Accepted the autofix. Vue 3 normalizes PascalCase-registered component names to kebab-case template lookups automatically (documented behavior). All 14 kebab-case usages across Home.vue / Settings.vue / TitleBar.vue / ChangelogModal.vue / PromoCard.vue continue to resolve correctly.
- **Files modified:** `src/renderer/main.js` (3 `.component()` lines)
- **Commit:** included in `4564ac3`
- **Verification impact:** Plan grep check `grep -c "app.component(" src/renderer/main.js` returns 3 — still passes. Exact string literals differ from plan spec but functional contract preserved.

## Known Stubs

None. Plan 01 only rewires bootstrap plumbing; no placeholder data paths introduced.

## Threat Flags

None. No new trust-boundary surface (the IPC `change-view` handler retains its v1.4 trust posture; `router.push().catch()` pattern merely swallows duplication errors as RESEARCH Pattern 2 prescribed).

## Success Criteria

| Criterion                                                                                                 | Status |
| --------------------------------------------------------------------------------------------------------- | ------ |
| package.json shows vue@^3.5.x, vue-router@^4.5.x, vue-loader@^17.4.x, @vue/devtools@^8.1.x                 | PASS   |
| package.json no longer contains `vue-template-compiler` or `vue-devtools`                                  | PASS   |
| `npm install` completes clean (no ERESOLVE blocker, no `--legacy-peer-deps`)                               | PASS   |
| main.js uses `createApp(App).mount('#app')` (zero `new Vue(`, zero `Vue.use(`, zero `Vue.component(`)      | PASS   |
| router/index.js uses `createRouter({ history: createWebHashHistory(), ... })`                              | PASS   |
| App.vue exports plain object (no `Vue.extend`)                                                             | PASS   |
| webpack.renderer.config.js uses `{ VueLoaderPlugin } = require('vue-loader')` + no `vue$` alias            | PASS   |
| `npm run pack:renderer` exits 0                                                                            | PASS   |
| `npm test` returns 256/256                                                                                  | PASS   |
| Two commits on master: chore(deps) → refactor(renderer)                                                     | PASS   |
| No Co-Authored-By line on either commit                                                                    | PASS   |
| Plan summary at .planning/phases/08-vue3-core-merged/08-01-SUMMARY.md                                       | PASS   |

## Self-Check: PASSED

- `src/renderer/main.js` FOUND
- `src/renderer/router/index.js` FOUND
- `src/renderer/App.vue` FOUND
- `_scripts/webpack.renderer.config.js` FOUND
- Commit `97bc6e8` FOUND on master
- Commit `4564ac3` FOUND on master

## Notes for Plan 02

- `vue-simple-context-menu` emits a webpack warning about `default export not found in 'vue'` — it imports `Vue from 'vue'` which Vue 3 no longer provides as a default export. This surface breaks at runtime when the component mounts. Plan 06 retires the dep; Plan 02 may need to temporarily stub `<vue-simple-context-menu>` usages if they appear on the critical UAT path before Plan 06.
- Bulma SASS `if()` deprecation warnings (367 of them) are pre-existing and unrelated to Phase 8 — will be swept by the Phase 8 Plan 04 (Bulma 1.0 upgrade) CSS audit.
- Runtime smoke test intentionally skipped — app UI is expected to be visually broken until Plans 03+04 retire Buefy. First clickable verification is at Plan 04 UAT gate.
