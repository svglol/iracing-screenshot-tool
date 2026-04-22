---
phase: 08-vue3-core-merged
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - src/renderer/main.js
  - src/renderer/router/index.js
  - _scripts/webpack.renderer.config.js
autonomous: true
requirements: [VUE3-01, VUE3-02, VUE3-03, VUE3-04]
tags: [vue3, vue-router, vue-loader, webpack, electron-renderer, bootstrap]

must_haves:
  truths:
    - "npm install completes with zero ERESOLVE (no --legacy-peer-deps)"
    - "npm run pack:renderer exits 0 under Vue 3 + vue-loader 17"
    - "Electron renderer boots on Vue 3 (createApp pattern) without Vue 2 runtime symbols"
    - "IPC 'change-view' still invokes router.push() successfully"
  artifacts:
    - path: "package.json"
      provides: "Vue 3 + vue-router 4 + vue-loader 17 + @vue/devtools dep pins"
      contains: "\"vue\": \"^3.5."
    - path: "src/renderer/main.js"
      provides: "createApp(App).use(router).mount('#app') bootstrap"
      contains: "createApp"
    - path: "src/renderer/router/index.js"
      provides: "createRouter + createWebHashHistory API"
      contains: "createWebHashHistory"
    - path: "_scripts/webpack.renderer.config.js"
      provides: "vue-loader 17 named export + removed Vue 2 vue$ alias"
      contains: "{ VueLoaderPlugin } = require('vue-loader')"
  key_links:
    - from: "src/renderer/main.js"
      to: "vue-router instance"
      via: "app.use(router)"
      pattern: "app\\.use\\(router\\)"
    - from: "src/renderer/router/index.js"
      to: "createWebHashHistory"
      via: "history option"
      pattern: "history:\\s*createWebHashHistory\\("
---

<objective>
Land the Vue 3 core foundation: bump Vue, vue-router, vue-loader, and @vue/devtools to their Vue-3-native versions; rewrite `src/renderer/main.js` to the `createApp` bootstrap pattern; rewrite `src/renderer/router/index.js` to vue-router 4 API; fix the two webpack.renderer.config.js bits that are Vue-2-specific.

Buefy, vue-fontawesome 2.x, and the three dead Vue-2-only plugins (vue-shortkey, v-click-outside, vue-markdown-plus) stay in `main.js` for now — they still register via `app.use()` even if they may not fully function. This plan ONLY establishes the Vue 3 + router + webpack floor so that subsequent plans can build on it. The app WILL boot after this plan, but UI components will be visually broken because Buefy is Vue-2-only. That is expected and intentional — Plan 02/03/04 fix the UI side.

Purpose: Make subsequent Buefy→Oruga, FA v7, and plugin-swap work addressable. Per D-08-18 bisect shape (commits 1+2 of the 9-commit chain).
Output: `chore(deps): bump vue + vue-router + vue-loader + @vue/devtools` commit + `refactor(renderer): migrate main.js to createApp + vue-router 4 API + webpack alias cleanup` commit.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/08-vue3-core-merged/08-CONTEXT.md
@.planning/phases/08-vue3-core-merged/08-RESEARCH.md

# Source-of-truth files being edited
@package.json
@src/renderer/main.js
@src/renderer/router/index.js
@_scripts/webpack.renderer.config.js
@src/renderer/App.vue

<interfaces>
<!-- Key contracts from RESEARCH.md — executor uses these directly. -->

Vue 3 createApp API (from vue@3.5.x):
```javascript
import { createApp } from 'vue';
// createApp(rootComponent) returns an App instance with:
//   .use(plugin, ...options) → chainable
//   .component(name, definition) → chainable
//   .mount(selector) → returns the root component instance
```

Vue Router 4 API (from vue-router@4.5.x):
```javascript
import { createRouter, createWebHashHistory } from 'vue-router';
// createRouter({ history, routes }) returns a Router instance with:
//   .push(location) → Promise<NavigationFailure | void | undefined>
//   .afterEach((to, from, failure) => void) → unregister function
//   Catch-all route syntax: { path: '/:pathMatch(.*)*', redirect: '/home' }
```

vue-loader 17 (from vue-loader@17.4.x):
```javascript
// CommonJS named export pattern (v16+):
const { VueLoaderPlugin } = require('vue-loader');
// Same plugin instance, same registration in webpack config plugins array.
```

IPC handler signature (unchanged behaviour):
```javascript
// Electron IPC: 'change-view' event carries { route: string }
// router.push in v4 returns a Promise; unhandled rejections on navigation duplicates
// must be swallowed with .catch(() => {}) per RESEARCH.md Pattern 2.
ipcRenderer.on('change-view', (event, data) => { ... router.push(data.route).catch(() => {}); });
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump Vue + vue-router + vue-loader + @vue/devtools + remove vue-template-compiler/vue-devtools</name>
  <read_first>
    - package.json (current Vue 2 pins on lines 50, 61, 64; vue-template-compiler line 119; vue-devtools line 115)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Standard Stack (version pins)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pitfall 1 (vue-router v4 NOT v5)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pitfall 4 (vue-template-compiler retired)
  </read_first>
  <action>
    Edit `package.json`:

    Under `"dependencies"` — replace existing `"vue"`, `"vue-router"` pins:
    - `"vue": "^2.7.16"` → `"vue": "^3.5.33"`
    - `"vue-router": "^3.6.5"` → `"vue-router": "^4.5.0"` (NOT v5 per Pitfall 1 — v5 is the npm latest but is post-training and unverified)

    Under `"devDependencies"` — bump vue-loader, add @vue/devtools, remove vue-devtools, remove vue-template-compiler:
    - `"vue-loader": "^15.11.1"` → `"vue-loader": "^17.4.2"`
    - Remove line `"vue-devtools": "^5.1.3",`
    - Add `"@vue/devtools": "^8.1.1"` (insert alphabetically, before `@vue/compat`-like positions — reasonable slot is near the top of devDependencies in alphabetical order under `@`)
    - Remove line `"vue-template-compiler": "^2.7.16",` entirely — vue@3.5.x transitively includes `@vue/compiler-sfc`; do NOT replace with an explicit `@vue/compiler-sfc` pin

    Run `npm install` — expect zero ERESOLVE since `--legacy-peer-deps` was retired in v1.4 LINT-03. If ERESOLVE surfaces, capture the error verbatim in the task summary and STOP (do not add `--legacy-peer-deps`; that regression would fail this plan's success criteria).

    Do NOT touch Buefy, vue-fontawesome, bulma, or the three dead plugins in this task — those are Plan 03+04+05+06 scope. They will continue to resolve against Vue 3 peer-deps with warnings; that's acceptable for Plan 01.

    Do NOT run `npm audit fix` or otherwise mutate `package-lock.json` beyond what `npm install` produces.
  </action>
  <verify>
    <automated>
      grep -Pc '"vue":\s*"\^3\.' package.json  # returns 1
      grep -Pc '"vue-router":\s*"\^4\.' package.json  # returns 1
      grep -Pc '"vue-loader":\s*"\^17\.' package.json  # returns 1
      grep -Pc '"@vue/devtools":\s*"\^8\.' package.json  # returns 1
      grep -c '"vue-template-compiler"' package.json  # returns 0
      grep -c '"vue-devtools"' package.json  # returns 0 (note: grep for exact quoted key, not @vue/devtools)
      npm ls vue  # shows vue@3.5.x at top level (no v2 duplicate)
      npm ls vue-router  # shows vue-router@4.x
    </automated>
  </verify>
  <acceptance_criteria>
    - `package.json` has the six edits above, verified by grep counts
    - `npm install` exits 0 without any `--legacy-peer-deps` flag
    - `node_modules/vue/package.json` reports `"version": "3.5.x"` (x ≥ 33)
    - `node_modules/vue-router/package.json` reports `"version": "4.5.x"` or newer 4.x patch
    - `node_modules/@vue/compiler-sfc/package.json` exists (transitive via vue@3)
    - `package-lock.json` updated in the same staging bundle as `package.json`
    - App build is NOT expected to succeed yet — `pack:renderer` will fail in this task because `main.js` still uses Vue 2 API. That's Task 2's job to fix.
  </acceptance_criteria>
  <done>
    package.json + package-lock.json reflect Vue 3 + vue-router 4 + vue-loader 17 + @vue/devtools 8; Vue-2-only deps (vue-template-compiler, vue-devtools) removed; npm install clean.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Rewrite main.js + router/index.js + App.vue + webpack config to Vue 3 + vue-router 4 APIs</name>
  <read_first>
    - src/renderer/main.js (entire file — 66 lines)
    - src/renderer/router/index.js (entire file — 48 lines)
    - src/renderer/App.vue (23 lines)
    - _scripts/webpack.renderer.config.js (lines 4 and 108)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 1 (main.js rewrite)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 2 (router rewrite)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 5 (Vue.extend drop)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pitfall 2 (vue$ alias drop)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pitfall 3 (VueLoaderPlugin import path change)
  </read_first>
  <behavior>
    - Behavior 1: `npm run pack:renderer` exits 0 after this task — webpack compiles the Vue 3 entry through vue-loader 17
    - Behavior 2: `createApp(App).use(router).mount('#app')` is the bootstrap (no `new Vue({...})`)
    - Behavior 3: `router.push()` called from the IPC `change-view` handler still navigates — and its returned Promise rejection (navigation duplication) is swallowed with `.catch(() => {})`
    - Behavior 4: `App.vue` exports a plain options object (or `defineComponent`) — no `Vue.extend`
    - Behavior 5: Buefy, vClickOutside, VueShortkey (legacy), VueMarkdownPlus, VueLazyload all continue to register via `app.use(...)` — this intentionally leaves a migration-warnings surface to be cleaned up by Plan 03+06. Do NOT remove these yet.
    - Behavior 6: `Vue.component(...)` calls for `font-awesome-icon`, `vue-simple-context-menu`, `vue-markdown-plus` are translated to `app.component(...)` — but FA is still v2.x vue-fontawesome (Plan 05 bumps to v3.x)
    - Behavior 7: `Vue.config.productionTip` line removed (no Vue 3 equivalent); `Vue.config.devtools` and `Vue.config.performance` lines removed (Vue 3 uses build-time flags — acceptable defaults)
  </behavior>
  <action>
    **2a. Rewrite `src/renderer/main.js`** (full replacement — do not incrementally edit):

    The file currently contains Vue 2 bootstrap. Replace the entire contents of `src/renderer/main.js` with:

    ```javascript
    import 'bulma-pro/bulma.sass';
    import { createApp } from 'vue';
    import App from './App.vue';
    import router from './router';
    import 'buefy/dist/buefy.css';
    import './assets/style/animations.scss';
    import './assets/style/main.scss';
    import Buefy from 'buefy';
    import VueLazyload from 'vue-lazyload';
    import { library } from '@fortawesome/fontawesome-svg-core';
    import {
    	faGear,
    	faUpRightFromSquare,
    	faFolder,
    	faTrash,
    	faCopy,
    	faCircleQuestion,
    	faArrowDown,
    } from '@fortawesome/free-solid-svg-icons';
    import { faDiscord } from '@fortawesome/free-brands-svg-icons';
    import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
    import VueSimpleContextMenu from 'vue-simple-context-menu';
    import vClickOutside from 'v-click-outside';
    import VueMarkdownPlus from 'vue-markdown-plus';

    library.add(
    	faGear,
    	faUpRightFromSquare,
    	faFolder,
    	faTrash,
    	faCopy,
    	faCircleQuestion,
    	faArrowDown,
    	faDiscord
    );

    const app = createApp(App);
    app.use(router);
    app.use(VueLazyload);
    app.use(Buefy);
    app.use(require('vue-shortkey'));
    app.use(vClickOutside);
    app.use(VueMarkdownPlus);
    app.component('font-awesome-icon', FontAwesomeIcon);
    app.component('vue-simple-context-menu', VueSimpleContextMenu);
    app.component('vue-markdown-plus', VueMarkdownPlus);
    app.mount('#app');

    if (window && window.process && window.process.type === 'renderer') {
    	const { ipcRenderer } = require('electron');

    	ipcRenderer.on('change-view', (event, data) => {
    		if (data.route) {
    			router.push(data.route).catch(() => {});
    		}
    	});
    }
    ```

    Note: This rewrite preserves ALL five plugin `.use()` calls and ALL three `.component()` registrations — the v2-only ones will be retired in Plan 03 (Buefy), Plan 05 (FA), Plan 06 (shortkey/click-outside/markdown-plus). Do NOT remove them in this task. The `Vue.config.*` lines (47-49 in original) are deleted — no equivalent needed.

    **2b. Rewrite `src/renderer/router/index.js`** (full replacement):

    Replace entire contents with:

    ```javascript
    import { createRouter, createWebHashHistory } from 'vue-router';
    import Home from '../views/Home.vue';
    import Worker from '../views/Worker.vue';

    const router = createRouter({
    	history: createWebHashHistory(),
    	routes: [
    		{
    			path: '/',
    			redirect: '/home',
    		},
    		{
    			path: '/home',
    			meta: {
    				title: 'Home',
    				icon: 'fa-home',
    			},
    			component: Home,
    		},
    		{
    			path: '/worker',
    			name: 'worker',
    			component: Worker,
    		},
    		{
    			path: '/:pathMatch(.*)*',
    			redirect: '/home',
    		},
    	],
    });

    // dynamically set application title to current view
    router.afterEach((to) => {
    	let title =
    		to.path === '/home'
    			? process.env.PRODUCT_NAME
    			: `${to.meta.title} - ${process.env.PRODUCT_NAME}`;

    	if (!title) {
    		title = 'Home';
    	}

    	document.title = title;
    });

    export default router;
    ```

    Changes from the old version:
    - `import Vue from 'vue'; import Router from 'vue-router'; Vue.use(Router);` → `import { createRouter, createWebHashHistory } from 'vue-router';`
    - `new Router({ routes: [...] })` → `createRouter({ history: createWebHashHistory(), routes: [...] })`
    - catch-all path `'*'` → `'/:pathMatch(.*)*'` (vue-router 4 regex catch-all syntax)
    - `afterEach` signature unchanged — Vue Router 4 preserves it

    **2c. Rewrite `src/renderer/App.vue`** (drop Vue.extend wrapper):

    In `src/renderer/App.vue` lines 13-19, change the `<script>` block from:

    ```javascript
    import Vue from 'vue';
    import TitleBar from './components/TitleBar.vue';

    export default Vue.extend({
    	name: 'App',
    	components: { TitleBar },
    });
    ```

    To:

    ```javascript
    import TitleBar from './components/TitleBar.vue';

    export default {
    	name: 'App',
    	components: { TitleBar },
    };
    ```

    Do NOT use `defineComponent` — TS inference wrapper is Phase 12 scope; plain object suffices for Vue 3 Options API.

    **2d. Fix `_scripts/webpack.renderer.config.js`** (two edits):

    - Line 4: change `const VueLoaderPlugin = require('vue-loader/lib/plugin');` to `const { VueLoaderPlugin } = require('vue-loader');` (per Pitfall 3 — vue-loader 16+ named export)
    - Line 108: delete the line `vue$: 'vue/dist/vue.common.js',` entirely (per Pitfall 2 — Vue 2 CommonJS build path; Vue 3's package exports handle resolution correctly)

    Do NOT replace the alias — drop it. The three remaining alias entries (`'@'`, `src`, `icons`) stay unchanged.

    Do NOT touch any other webpack config (sass-loader options, other rules, plugins, etc.).
  </action>
  <verify>
    <automated>
      grep -c "new Vue(" src/renderer/main.js  # returns 0
      grep -c "createApp" src/renderer/main.js  # returns 1
      grep -c "Vue.component(" src/renderer/main.js  # returns 0
      grep -c "app.component(" src/renderer/main.js  # returns 3
      grep -c "Vue.use(" src/renderer/main.js  # returns 0
      grep -c "app.use(" src/renderer/main.js  # returns 5  (router + VueLazyload + Buefy + vue-shortkey + vClickOutside + VueMarkdownPlus = 6 actually; verify count)
      grep -c "Vue.config" src/renderer/main.js  # returns 0
      grep -c "new Router(" src/renderer/router/index.js  # returns 0
      grep -c "createRouter" src/renderer/router/index.js  # returns 1
      grep -c "createWebHashHistory" src/renderer/router/index.js  # returns 1
      grep -c "pathMatch(.\*)\*" src/renderer/router/index.js  # returns 1
      grep -c "Vue.extend" src/renderer/App.vue  # returns 0
      grep -c "vue\$:" _scripts/webpack.renderer.config.js  # returns 0
      grep -c "vue-loader/lib/plugin" _scripts/webpack.renderer.config.js  # returns 0
      grep -c "{ VueLoaderPlugin } = require('vue-loader')" _scripts/webpack.renderer.config.js  # returns 1
      npm run pack:renderer  # exits 0
    </automated>
  </verify>
  <acceptance_criteria>
    - All 15 grep checks above return the specified counts
    - `npm run pack:renderer` exits 0 (webpack build under Vue 3 + vue-loader 17 succeeds)
    - `dist/renderer.js` produced, non-empty (≥100KB reasonable; size compared against v1.4 baseline in Plan 06 final gate)
    - `npm test` 256/256 passes (renderer bundle changes must not break non-renderer Jest tests)
    - Lint count ≤1881 (v1.4 band preserved — run `npm run lint` before committing; if over, investigate but do not auto-fix ad-hoc)
    - No runtime execution required at this stage — Plan 02 fixes the SFC-level Vue 3 idiom gaps; app running still has Buefy mismatch visible until Plan 04.
  </acceptance_criteria>
  <done>
    main.js + router/index.js + App.vue + webpack.renderer.config.js all rewritten to Vue 3 / vue-router 4 APIs. `pack:renderer` succeeds. Tests pass. Lint band preserved.
  </done>
</task>

<task type="auto">
  <name>Task 3: Commit the two-commit bisect pair per D-08-18</name>
  <read_first>
    - .planning/phases/08-vue3-core-merged/08-CONTEXT.md §D-08-18 (bisect shape)
    - .planning/STATE.md (D-04 commit discipline: no Co-Authored-By, no --no-verify, explicit `git add <path>`)
  </read_first>
  <action>
    Stage and commit in two commits — the `chore(deps)` bump first, then the `refactor(renderer)` content commit, so that `git bisect` between HEAD and the `chore(deps)` commit isolates dep-bump regressions from content regressions.

    Commit 1 (deps only):

    ```bash
    git add package.json package-lock.json
    git commit -m "chore(deps): bump vue + vue-router + vue-loader + @vue/devtools"
    ```

    Commit 2 (content — main.js + router + App + webpack):

    ```bash
    git add src/renderer/main.js src/renderer/router/index.js src/renderer/App.vue _scripts/webpack.renderer.config.js
    git commit -m "refactor(renderer): migrate main.js to createApp + vue-router 4 API + webpack alias cleanup"
    ```

    Do NOT use `--no-verify`. Do NOT add a Co-Authored-By line. Do NOT stage any other file — if `git status` shows other modified files (the renderer components with Settings modal .sync modifiers, SideBar.vue etc.), they're Plan 02+ scope and stay unstaged at this point.

    If pre-commit hooks (eslint/prettier) modify staged files, re-stage and re-run the commit. Do NOT bypass.
  </action>
  <verify>
    <automated>
      git log --oneline -n 2 | head -2
      # Expected: HEAD is "refactor(renderer): migrate main.js..."
      # HEAD~1 is "chore(deps): bump vue + vue-router..."
      git log --oneline -n 2 | head -1 | grep -c "refactor(renderer)"  # returns 1
      git log --oneline -n 2 | tail -1 | grep -c "chore(deps)"  # returns 1
      git diff HEAD~2 HEAD --stat | grep -c "package.json"  # returns 1
      git diff HEAD~2 HEAD --stat | grep -c "main.js"  # returns 1
    </automated>
  </verify>
  <acceptance_criteria>
    - Two commits land on master in order: `chore(deps)` then `refactor(renderer)`
    - `git bisect` between HEAD and HEAD~2 covers both regressions with 1-commit granularity each
    - No Co-Authored-By footer on either commit
    - No `--no-verify` used
  </acceptance_criteria>
  <done>
    Two commits pushed to the local master branch per D-08-18 shape. Ready for Plan 02 to proceed.
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Electron main → renderer (IPC) | `change-view` event carries `{route}` from main-process; renderer calls `router.push(data.route)` |
| npm registry → local node_modules | 4 new dep lines resolve transitively during `npm install` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-01-01 | Tampering | IPC `change-view` route argument | accept | Main process already controls the route string; renderer is the relying party. No change to trust model from Phase 8. Promise-returning `router.push()` catches the navigation-duplication error but does not trust-validate the route — matches v1.4 behaviour. |
| T-08-01-02 | Tampering | npm supply chain (vue, vue-router, vue-loader, @vue/devtools) | mitigate | All four packages are Vue-core mainstream (github.com/vuejs). Pin via caret to the minor line verified in RESEARCH.md. `npm audit` runs as part of install; any HIGH/CRITICAL surfacing blocks the commit until triaged. |
| T-08-01-03 | Denial of Service | `pack:renderer` build regression from vue-loader 17 parsing a Vue 2 SFC | mitigate | Task 2 rewrites App.vue to drop Vue.extend BEFORE committing; all remaining SFCs are Vue-2-but-Vue-3-compatible syntax (no slot-scope in App.vue). If pack fails, the dev loop breaks. `npm run pack:renderer` gate in Task 2 verify block catches this immediately. |

Block threshold: none. All three threats are mitigated or accepted with rationale.

</threat_model>

<verification>

After all three tasks complete:

1. `npm install` → zero ERESOLVE
2. `npm run pack:renderer` → exits 0
3. `npm test` → 256/256
4. `npm run lint` → count ≤1881
5. `git log --oneline -n 2` shows the two-commit bisect pair
6. `npm ls vue` → vue@3.5.x at top level
7. `npm ls vue-template-compiler` → not present
8. `grep -r "new Vue(" src/renderer/main.js` → zero matches

Note: **runtime smoke test is NOT part of this plan.** The app will not render correctly (Buefy is Vue-2-only) until Plans 03+04 land. The build must compile; runtime parity is a Plan 04 gate.

</verification>

<success_criteria>

Plan 01 complete when:
- [ ] package.json shows vue@^3.5.x, vue-router@^4.5.x, vue-loader@^17.4.x, @vue/devtools@^8.1.x
- [ ] package.json no longer contains `vue-template-compiler` or `vue-devtools` (the exact legacy package names)
- [ ] `npm install` completes clean (no ERESOLVE, no `--legacy-peer-deps` used)
- [ ] src/renderer/main.js uses `createApp(App).mount('#app')` pattern (zero `new Vue(`, zero `Vue.use(`, zero `Vue.component(`)
- [ ] src/renderer/router/index.js uses `createRouter({ history: createWebHashHistory(), ... })`
- [ ] src/renderer/App.vue exports a plain object (no `Vue.extend`)
- [ ] _scripts/webpack.renderer.config.js uses `{ VueLoaderPlugin } = require('vue-loader')` and has no `vue$` alias
- [ ] `npm run pack:renderer` exits 0
- [ ] `npm test` returns 256/256
- [ ] Two commits present on master: `chore(deps):` then `refactor(renderer):`
- [ ] No Co-Authored-By line on either commit
- [ ] Plan summary captured at `.planning/phases/08-vue3-core-merged/08-01-SUMMARY.md`

</success_criteria>

<output>
After completion, create `.planning/phases/08-vue3-core-merged/08-01-SUMMARY.md` documenting:
- Actual pinned versions from `npm ls vue vue-router vue-loader @vue/devtools`
- Bundle size for `dist/renderer.js` after this plan (baseline for Plan 03+04 comparison)
- `npm run pack:renderer` exit code + warning count (if any)
- Any ERESOLVE encountered (if triaged without `--legacy-peer-deps`)
- Lint count after this plan (should still be ≤1881)
- Two commit SHAs for bisect reference
</output>
