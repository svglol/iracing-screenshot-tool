---
phase: 08-vue3-core-merged
plan: 06
type: execute
wave: 6
depends_on: [08-05]
files_modified:
  - package.json
  - package-lock.json
  - src/renderer/main.js
  - src/renderer/components/ChangelogModal.vue
  - src/renderer/store/
autonomous: false
requirements: [VUE3-01, UI-02]
tags: [plugin-swap, vue3, vuex-cleanup, uat, final-gate]

must_haves:
  truths:
    - "Zero Vue-2-only plugins remain (vue-shortkey@3.x, v-click-outside@3.x, vue-markdown-plus@2.x all retired)"
    - "Replacements installed: vue3-shortkey@^4, vue3-markdown-it@^1, vue-lazyload@^3, vue-simple-context-menu@^4"
    - "v-click-outside deleted (unused per RESEARCH.md grep + A3)"
    - "Dead Vuex store at src/renderer/store/ deleted (per CONTEXT.md Claude's Discretion)"
    - "Final UAT: 4-view click-through on Vue 3 + Oruga + Bulma 1 + FA v7 stack with zero Vue migration warnings in console (REQ success criterion #6 hard gate)"
    - "npm run pack:renderer clean; npm test 256/256; lint ≤1881; bundle size within ±10% of v1.4 baseline"
  artifacts:
    - path: "package.json"
      provides: "Vue-3-compatible plugin pins; dead Vue 2 plugins removed"
      contains: "vue3-shortkey"
    - path: "src/renderer/main.js"
      provides: "Vue 3 plugin registrations (vue3-shortkey, vue3-markdown-it, vue-lazyload@3, vue-simple-context-menu@4); v-click-outside removed"
      contains: "vue3-shortkey"
    - path: "src/renderer/components/ChangelogModal.vue"
      provides: "<vue3-markdown-it> tag replacing <vue-markdown-plus>"
      contains: "vue3-markdown-it"
  key_links:
    - from: "src/renderer/main.js"
      to: "Vue 3 plugins"
      via: "app.use(VueShortkey from vue3-shortkey)"
      pattern: "vue3-shortkey"
    - from: "src/renderer/components/ChangelogModal.vue"
      to: "vue3-markdown-it component"
      via: "global component registration"
      pattern: "<(vue3-markdown-it|Markdown)"
---

<objective>
Retire the three dead Vue-2-only plugins (vue-shortkey@3 unmaintained since 2019, v-click-outside@3 unmaintained since 2022, vue-markdown-plus@2 unmaintained since 2022) and replace with Vue-3-native equivalents. Bump vue-lazyload and vue-simple-context-menu to their Vue-3-compatible majors. Delete the dead Vuex store that was imported nowhere.

Then run the **milestone-level UAT gate**: 4-view click-through with DevTools console scan for Vue 2 → Vue 3 migration warnings. REQ success criterion #6 is a HARD GATE: zero Vue migration warnings. Component-lib deprecations (OModal, etc.) remain tolerable.

This closes Phase 8. On success, Phase 8 ships to master as a clean 9-commit bisect chain; on failure, this plan creates revision tasks back into earlier plans.

**Plugin swap sites (from RESEARCH.md):**
- `vue-shortkey@3.1.7` → `vue3-shortkey@^4.0.0` — preserves `v-shortkey` + `@shortkey` API (3 directive sites: Home.vue:54, Home.vue:68, Settings.vue:11)
- `v-click-outside@3.0.1` → **DELETE** (unused per researcher's grep; just unregister from main.js and uninstall)
- `vue-markdown-plus@2.0.17` → `vue3-markdown-it@^1.0.10` — changes tag name: `<vue-markdown-plus>` → `<vue3-markdown-it>` (1 template site: ChangelogModal.vue:19)
- `vue-lazyload@1.3.3` → `vue-lazyload@^3.0.0` — v3 adds Vue 3 support with same `v-lazy` directive API (2 sites: Home.vue:97, 113)
- `vue-simple-context-menu@3.1.10` → `vue-simple-context-menu@^4.1.0` — v4 peers on Vue 3; same global component API

Purpose: Close REQ VUE3-01 (no console warnings), close final success criterion gates for Phase 8, deliver the milestone-level UAT approval.
Output: One commit (commit 9 of the 9-commit chain): `chore(deps): swap Vue 2 plugins for Vue 3 equivalents + delete dead Vuex store`. Plus the final UAT gate checkpoint.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/08-vue3-core-merged/08-CONTEXT.md
@.planning/phases/08-vue3-core-merged/08-RESEARCH.md
@.planning/phases/08-vue3-core-merged/08-05-SUMMARY.md

@package.json
@src/renderer/main.js
@src/renderer/components/ChangelogModal.vue

<interfaces>
<!-- Vue 3 plugin API contracts -->

vue3-shortkey@4 (from npm — preserves v-shortkey + @shortkey directive/event API):
```javascript
// main.js:
import VueShortkey from 'vue3-shortkey';
app.use(VueShortkey);

// Template usage (unchanged from vue-shortkey@3):
// <button v-shortkey="['del']" @shortkey="deleteItem">
// <input v-shortkey.push="['f1']" @shortkey="showHelp">
```

vue3-markdown-it@1.0.10 (from npm):
```javascript
// main.js:
import Vue3MarkdownIt from 'vue3-markdown-it';
app.component('vue3-markdown-it', Vue3MarkdownIt);

// Template usage:
// <vue3-markdown-it :source="changelog" />
// (Drop-in replacement for <vue-markdown-plus :source="...">)
```

vue-lazyload@3 (from npm):
```javascript
// main.js (registration unchanged):
import VueLazyload from 'vue-lazyload';
app.use(VueLazyload);

// Template usage (v-lazy directive preserved):
// <img v-lazy="imageUrl" />
```

vue-simple-context-menu@4 (from npm — Vue 3 peer-deps):
```javascript
// main.js (registration unchanged):
import VueSimpleContextMenu from 'vue-simple-context-menu';
app.component('vue-simple-context-menu', VueSimpleContextMenu);

// Template usage: <vue-simple-context-menu :options="..." :ref="..." @option-clicked="...">
// Unchanged from v3 per Assumption A9 (verify during UAT — if template API broke, separate revision commit)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Swap plugin deps + empirically verify v-click-outside is unused</name>
  <read_first>
    - package.json (current plugin lines: v-click-outside line 60, vue-lazyload line 62, vue-markdown-plus line 63, vue-shortkey line 65, vue-simple-context-menu line 66)
    - src/renderer/main.js (current plugin registrations — v-click-outside registered but possibly unused)
    - src/renderer/ — entire tree (to empirically verify v-click-outside has zero directive usage)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Third-Party Plugin Replacements
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Assumption A3 (v-click-outside unused — empirically verify)
  </read_first>
  <action>
    **Step 1 — empirically verify v-click-outside is unused.**

    Run these checks in order:

    ```bash
    # Directive usage in templates
    grep -rE "v-click-outside" src/renderer/ --include="*.vue"

    # JS/method references (rare but possible — e.g. manually invoking the directive)
    grep -rE "clickOutside|ClickOutside" src/renderer/ --include="*.js" --include="*.vue"

    # Transitive usage — does any other package we use need v-click-outside as a peer?
    npm ls v-click-outside
    ```

    Expected: template grep returns 0 matches (per RESEARCH.md). JS/method grep may return `document.addEventListener('click', ...)` or similar unrelated code — those are NOT v-click-outside usage.

    **If template grep returns 0 (expected):** delete the package entirely. Install no replacement.
    **If template grep returns ≥1 match (unexpected):** install `vue3-click-away@^1.2.4` instead; rewrite the matching template sites from `v-click-outside="handler"` to `v-click-away="handler"`. Record outcome in plan summary.

    **Step 2 — update package.json:**

    Under `"dependencies"`:

    **Remove:**
    - `"v-click-outside": "^3.0.1",`
    - `"vue-markdown-plus": "^2.0.17",`
    - `"vue-shortkey": "^3.1.7",`

    **Add/bump:**
    - `"vue-lazyload": "^1.3.3"` → `"vue-lazyload": "^3.0.0"`
    - `"vue-simple-context-menu": "^3.1.10"` → `"vue-simple-context-menu": "^4.1.0"`
    - Add `"vue3-markdown-it": "^1.0.10",`
    - Add `"vue3-shortkey": "^4.0.0",`
    - **IF Step 1 found v-click-outside usage:** add `"vue3-click-away": "^1.2.4",` (else do NOT add any click-outside replacement)

    Run `npm install`. Zero ERESOLVE expected — all replacements peer-dep on Vue 3 which we already have.

    **Step 3 — `npm audit` post-install.**

    ```bash
    npm audit --audit-level=high
    ```

    Expected: zero HIGH or CRITICAL findings. If any surface: document in plan summary; do NOT silently ship. User decision needed before commit.
  </action>
  <verify>
    <automated>
      grep -c '"v-click-outside"' package.json  # returns 0
      grep -c '"vue-markdown-plus"' package.json  # returns 0
      grep -c '"vue-shortkey"' package.json  # returns 0 (distinct from vue3-shortkey below)
      grep -Pc '"vue3-shortkey":\s*"\^4\.' package.json  # returns 1
      grep -Pc '"vue3-markdown-it":\s*"\^1\.' package.json  # returns 1
      grep -Pc '"vue-lazyload":\s*"\^3\.' package.json  # returns 1
      grep -Pc '"vue-simple-context-menu":\s*"\^4\.' package.json  # returns 1
      npm ls vue-shortkey 2>&1 | grep -c "empty"  # returns 1 (not in tree)
      npm ls vue-markdown-plus 2>&1 | grep -c "empty"  # returns 1 (not in tree)
      npm ls vue3-shortkey  # shows 4.x
    </automated>
  </verify>
  <acceptance_criteria>
    - Step 1 grep outcome recorded in summary (A3 resolved: USED / UNUSED)
    - package.json shows 3 removals + 4 additions/bumps (or 5 if v-click-outside was used → vue3-click-away added)
    - `npm install` clean
    - `npm audit --audit-level=high` shows 0 HIGH/CRITICAL findings (or findings documented with user decision)
    - All replacement packages resolve at listed versions
  </acceptance_criteria>
  <done>
    Plugin deps swapped. Supply-chain audit clean. Ready for main.js + ChangelogModal content edits.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Rewrite main.js plugin registrations + ChangelogModal tag + delete Vuex store</name>
  <read_first>
    - src/renderer/main.js (current: registers vue-shortkey via require, v-click-outside, vue-markdown-plus, VueLazyload, VueSimpleContextMenu)
    - src/renderer/components/ChangelogModal.vue (current line 19 uses `<vue-markdown-plus>`)
    - src/renderer/store/index.js (dead — imported nowhere per scout)
    - src/renderer/store/modules/index.js (also dead)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Open Question 5 (Vuex store delete per Claude's Discretion)
  </read_first>
  <behavior>
    - Behavior 1: `import vClickOutside from 'v-click-outside';` removed (package uninstalled in Task 1)
    - Behavior 2: `app.use(vClickOutside);` removed
    - Behavior 3: `import VueMarkdownPlus from 'vue-markdown-plus';` and `app.use(VueMarkdownPlus);` and `app.component('vue-markdown-plus', VueMarkdownPlus);` removed
    - Behavior 4: New `import Vue3MarkdownIt from 'vue3-markdown-it';` + `app.component('vue3-markdown-it', Vue3MarkdownIt);` added
    - Behavior 5: `app.use(require('vue-shortkey'));` → `import VueShortkey from 'vue3-shortkey';` + `app.use(VueShortkey);` (converted from CommonJS require to ES import — cleaner form)
    - Behavior 6: ChangelogModal.vue line 19 `<vue-markdown-plus :source="changelog" />` → `<vue3-markdown-it :source="changelog" />`
    - Behavior 7: `src/renderer/store/` entire directory deleted
    - Behavior 8: `npm run pack:renderer` exits 0 + `npm test` 256/256
  </behavior>
  <action>
    **A. Rewrite main.js plugin registration block.**

    Open `src/renderer/main.js`. Make these edits:

    **Edit 1 — top-of-file imports:**
    - DELETE: `import vClickOutside from 'v-click-outside';`
    - DELETE: `import VueMarkdownPlus from 'vue-markdown-plus';`
    - ADD (after existing `VueLazyload` import): `import VueShortkey from 'vue3-shortkey';`
    - ADD (after existing `VueSimpleContextMenu` import): `import Vue3MarkdownIt from 'vue3-markdown-it';`

    **Edit 2 — plugin registrations:**
    - DELETE: `app.use(require('vue-shortkey'));` (the CommonJS require form from Plan 01)
    - DELETE: `app.use(vClickOutside);`
    - DELETE: `app.use(VueMarkdownPlus);`
    - ADD (near the other `app.use(...)` calls): `app.use(VueShortkey);`

    **Edit 3 — component registrations:**
    - DELETE: `app.component('vue-markdown-plus', VueMarkdownPlus);`
    - ADD: `app.component('vue3-markdown-it', Vue3MarkdownIt);` (the new global tag name)

    **Preservation checklist** — DO NOT touch these (they stay from Plan 03+05):
    - All Oruga imports + `createOruga()` + `oruga.use(...)` forEach + `app.use(oruga, bulmaConfig)`
    - All FA imports + `library.add(...)` + `app.component('font-awesome-icon', FontAwesomeIcon)`
    - `import VueLazyload from 'vue-lazyload';` + `app.use(VueLazyload);` (v-lazy directive API unchanged between v1 and v3; tested in UAT)
    - `import VueSimpleContextMenu from 'vue-simple-context-menu';` + `app.component('vue-simple-context-menu', VueSimpleContextMenu);` (v3→v4 preserves API per A9)
    - `createApp(App)` + `app.use(router)` + `app.mount('#app')`
    - IPC `change-view` handler at bottom

    **B. Update ChangelogModal.vue template tag name.**

    Open `src/renderer/components/ChangelogModal.vue`. On line 19 (or wherever `<vue-markdown-plus` appears):

    Change: `<vue-markdown-plus :source="changelog" />` (self-closing; or `<vue-markdown-plus :source="changelog"></vue-markdown-plus>` pair form)

    To: `<vue3-markdown-it :source="changelog" />` (preserving whatever self-closing or paired form the original used)

    Verify no other template references to `vue-markdown-plus` exist in the file (should be the only one per scout).

    **C. Delete the dead Vuex store.**

    Per CONTEXT.md Claude's Discretion + RESEARCH.md Open Question 5: `src/renderer/store/` is imported nowhere. Delete:

    ```bash
    rm -rf src/renderer/store/
    ```

    Verify nothing else imports from it:
    ```bash
    grep -rE "from ['\"].*store['\"]" src/renderer/ --include="*.js" --include="*.vue"
    # Expected: 0 matches (if any match surfaces, the store is used — do NOT delete; revise plan)
    ```

    **D. Build + test gate.**

    ```bash
    npm run pack:renderer  # exits 0
    npm test  # 256/256
    npm run lint  # count ≤1881
    ```
  </action>
  <verify>
    <automated>
      # main.js plugin registrations
      grep -c "v-click-outside" src/renderer/main.js  # returns 0
      grep -c "vue-markdown-plus" src/renderer/main.js  # returns 0
      grep -c "require('vue-shortkey')" src/renderer/main.js  # returns 0
      grep -c "from 'vue3-shortkey'" src/renderer/main.js  # returns 1
      grep -c "from 'vue3-markdown-it'" src/renderer/main.js  # returns 1
      grep -c "app.use(VueShortkey)" src/renderer/main.js  # returns 1
      grep -c "app.component('vue3-markdown-it'" src/renderer/main.js  # returns 1

      # ChangelogModal tag swap
      grep -c "vue-markdown-plus" src/renderer/components/ChangelogModal.vue  # returns 0
      grep -c "vue3-markdown-it" src/renderer/components/ChangelogModal.vue  # returns 1

      # Vuex store deleted
      ls src/renderer/store/ 2>&1 | grep -c "No such"  # returns 1 (directory gone)
      grep -rE "from ['\"].*store['\"]" src/renderer/ --include="*.js" --include="*.vue" | wc -l  # returns 0

      # Build + test gate
      npm run pack:renderer  # exits 0
      npm test  # 256/256
    </automated>
  </verify>
  <acceptance_criteria>
    - main.js: 0 refs to `v-click-outside`, `vue-markdown-plus`, `vue-shortkey` (bare form); 1 ref each to `vue3-shortkey` and `vue3-markdown-it`
    - ChangelogModal.vue: `vue-markdown-plus` tag replaced by `vue3-markdown-it`
    - `src/renderer/store/` directory does NOT exist
    - Zero imports from a `store` path in the renderer
    - `npm run pack:renderer` exits 0
    - `npm test` → 256/256
    - Lint ≤1881
  </acceptance_criteria>
  <done>
    Plugin swap + Vuex cleanup complete. Build + tests pass. Ready for final UAT gate.
  </done>
</task>

<task type="auto">
  <name>Task 3: Commit the final plan commit + bundle-size delta check</name>
  <read_first>
    - .planning/phases/08-vue3-core-merged/08-CONTEXT.md §D-08-18 (bisect shape)
    - .planning/phases/08-vue3-core-merged/08-01-SUMMARY.md (baseline bundle size from Plan 01)
  </read_first>
  <action>
    **Bundle-size delta check (±10% gate per RESEARCH.md Validation Architecture).**

    ```bash
    ls -la dist/renderer.js dist/main.css 2>/dev/null
    ```

    Compare against the v1.4 baseline. The v1.4 baseline should be documented somewhere (check milestones/v1.4 artifacts or Plan 01 summary for the starting-state capture).

    Expected: `dist/renderer.js` within ±10% of v1.4 size; `dist/main.css` within ±10%.

    If either delta > ±10%: document in plan summary as a risk flag. User may accept or request revision.

    **Commit 9 of the 9-commit chain per D-08-18.** This is a single commit for plugin swap + Vuex cleanup (content + deps combined since it's a cleanup commit):

    ```bash
    git add package.json package-lock.json src/renderer/main.js src/renderer/components/ChangelogModal.vue
    git rm -r src/renderer/store/
    git commit -m "chore(deps): swap Vue 2 plugins for Vue 3 equivalents + delete dead Vuex store"
    ```

    Note: `git rm -r` rather than plain `rm -rf` before staging — this ensures git records the deletion atomically with the other changes.

    Then Phase 8's closing doc commit (this is actually "commit 9/10" depending on how you count D-08-18's original suggestion of a separate docs commit). Defer the docs commit (roadmap/state sync) to `/gsd-transition` which runs after this plan closes — that's the conventional GSD pattern, not a plan commit.

    No Co-Authored-By. No --no-verify.
  </action>
  <verify>
    <automated>
      git log --oneline -n 1 | grep -c "swap Vue 2 plugins"  # returns 1
      git diff HEAD~1 HEAD --name-only | wc -l  # ≥4 (package.json, package-lock.json, main.js, ChangelogModal.vue, plus store/ deletions)
      git diff HEAD~1 HEAD --name-only | grep -c "src/renderer/store"  # ≥1 (store files deleted)
      git log --oneline -n 9 | wc -l  # ≥9 (the full 9-commit chain visible)
    </automated>
  </verify>
  <acceptance_criteria>
    - Single commit for the final plugin-swap + store deletion
    - 9-commit bisect chain visible in git log (plus any pre-phase commits above)
    - Bundle size delta captured in plan summary; within ±10% of v1.4 baseline OR flagged for user decision
    - No Co-Authored-By
  </acceptance_criteria>
  <done>
    Commit 9 (final content commit) landed. Phase 8 implementation work complete. Next task: final UAT gate.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Phase 8 final UAT + dev-runtime Vue migration warnings check (REQ success criterion #6 hard gate)</name>
  <what-built>
    Phase 8 is now implementation-complete: Vue 3.5 + vue-router 4 + vue-loader 17 + @vue/devtools 8 + Oruga 0.13 + theme-bulma + Bulma 1 + FA v7 + vue-fontawesome 3 + vue3-shortkey + vue3-markdown-it + vue-lazyload 3 + vue-simple-context-menu 4, with the dead Vuex store gone. All 9 commits of the D-08-18 bisect chain on master. This final checkpoint validates the REQ success criteria end-to-end.

    The big difference from Plan 04's UAT: THIS checkpoint is the milestone-level gate. REQ success criterion #6 is a HARD gate: **zero Vue 2 → Vue 3 migration warnings** in dev-runtime console. Any such warning → BLOCKER, revision required.
  </what-built>
  <how-to-verify>

    **Step 1 — Clean launch.**

    ```bash
    rm -rf dist/
    npm run pack:renderer  # regenerate
    npm run dev
    ```

    Wait for the Electron window.

    **Step 2 — DevTools console open (Ctrl+Shift+I). Scan every message.**

    Classify each console entry:

    | Category | Example pattern | Verdict |
    |----------|----------------|---------|
    | **Vue migration warning** | `[Vue warn]: Deprecation`, `.sync modifier`, `beforeDestroy`, `$set is not a function`, `Vue 2 transition`, `slot-scope` | **BLOCKER** — fix before phase ships |
    | **Oruga library deprecation** | `OModal is deprecated; use ODialog` | Tolerable (CONTEXT.md A2) |
    | **vue-lazyload v3 startup notice** | Any informational message from VueLazyload | Tolerable |
    | **vue3-shortkey informational** | Version banner | Tolerable |
    | **FA warn about fallback icon** | `Icon X not found; fallback to Y` | **BLOCKER if found** — means Plan 05 three-grep audit missed a site |
    | **Failed to resolve component: o-X** | Any such warning | **BLOCKER** — Plan 04 missed a registration |
    | **Plain errors (red)** | Runtime TypeErrors, unhandled Promise rejections | **BLOCKER** — investigate root cause |
    | **Supply-chain / eval security warnings** | CSP violation | **BLOCKER** — escalate |

    Count each category. Target outcome: zero BLOCKER entries.

    **Step 3 — 4-view click-through UAT.**

    Per REQ success criterion #4 — all 4 UI destinations render and function identically to v1.4:

    - **Home view:**
      - [ ] Sidebar renders with buttons (Screenshot, Folder, Copy, Trash icons) — all Font Awesome v7 visible and correctly colored
      - [ ] Carousel renders (if there are screenshots in the default gallery directory; empty state is acceptable)
      - [ ] PromoCard with Discord (`faDiscord`) brand icon visible
      - [ ] Taking a screenshot (if iRacing active OR mock mode) → thumbnail appears → notification toast fires ("copied to clipboard" via `$oruga.notification.open`)
      - [ ] Keyboard shortcut Ctrl+C triggers copy method (via vue3-shortkey); Del triggers delete method — if shortcuts don't fire, vue3-shortkey replacement has an API quirk — document but not blocker if UI-button path works

    - **Settings modal:**
      - [ ] Gear icon click in sidebar → modal opens via `<o-modal v-model:active="showSettings">`
      - [ ] Form fields: resolution input (o-input), screenshot directory (o-input with folder-browse), keybind (o-input with modifier capture), output format selector (o-select), manual-window-restore toggle (o-switch)
      - [ ] Changing a value and closing the modal → value persists (electron-store + beforeUnmount hook fires)
      - [ ] Close button dismisses modal

    - **Help modal:**
      - [ ] Accessible via F1 shortcut (vue3-shortkey) OR Settings → Help button
      - [ ] HelpModal.vue plain HTML content renders
      - [ ] Close button dismisses

    - **Changelog modal:**
      - [ ] Settings → Changelog button (or whatever the existing UX is) opens the modal
      - [ ] Markdown content renders via `<vue3-markdown-it :source="changelog">` — replaces vue-markdown-plus
      - [ ] Release notes content visible; code blocks + lists + links all render as markdown
      - [ ] Close button dismisses

    **Step 4 — Build/test/lint/bundle gate (re-verify after dev-mode testing).**

    ```bash
    # Close dev mode first (Ctrl+C in the terminal running npm run dev)
    npm run pack:renderer  # exits 0
    npm test  # 256/256
    npm run lint  # count ≤1881
    ls -la dist/renderer.js dist/main.css  # capture byte sizes
    ```

    Compare `dist/renderer.js` byte size against v1.4 baseline (documented somewhere pre-Phase-8). Within ±10% tolerance per RESEARCH.md Validation Architecture.

    Compare `dist/main.css` byte size against v1.4 baseline. Within ±10%.

    **Step 5 — Required-reading sweep for orphans.**

    ```bash
    # Nothing Vue 2 should remain anywhere in renderer
    grep -rEc "Vue\.(use|component|extend|config|mixin)" src/renderer/
    # Expected: 0 across all renderer files

    # No v-click-outside directives (A3)
    grep -rE "v-click-outside|v-click-away" src/renderer/
    # Expected: 0 matches (or matches in vue3-click-away sites if Step 1 of Plan 06 Task 1 surfaced usage)

    # No .sync anywhere
    grep -rEc ":[a-z]+\.sync=" src/renderer/
    # Expected: 0

    # No $buefy or $set or $delete
    grep -rEc "\$buefy|\\.\\\$set\\(|\\.\\\$delete\\(" src/renderer/
    # Expected: 0

    # FA CDN fully gone
    grep -rE "use\.fontawesome\.com|fontawesome\.com/releases" src/
    # Expected: 0

    # Buefy-era @imports gone from SCSS
    grep -rE "@import '~bulma|@import '~buefy" src/renderer/
    # Expected: 0
    ```

    All expected outcomes = 0 counts.

    **Step 6 — Phase 8 completion declaration.**

    Check every REQ-ID:

    - [ ] **VUE3-01:** Vue 3 migrated; no console Vue-migration warnings (per Step 2)
    - [ ] **VUE3-02:** vue-router 4 working — 4 views accessible; IPC change-view still calls router.push()
    - [ ] **VUE3-03:** vue-loader 17 compiling — `npm run pack:renderer` exits 0 (Step 4)
    - [ ] **VUE3-04:** @vue/devtools in devDeps (check `npm ls @vue/devtools`); legacy `vue-devtools` removed
    - [ ] **UI-02:** Buefy retired; Oruga functional — all 4 views render; zero `<b-*>` in tree (Step 5)
    - [ ] **UI-03:** Bulma 1 compiled — `pack:renderer` succeeds; visual identity preserved
    - [ ] **UI-04:** FA CDN removed from main.scss — Step 5 grep
    - [ ] **UI-05:** FA v7 + vue-fontawesome 3 — check `npm ls @fortawesome/vue-fontawesome` → 3.x; icons visible in all 4 views

    **Expected approval signals (all MUST be YES):**

    - [ ] Zero Vue migration warnings in dev-runtime console (REQ criterion #6 HARD gate)
    - [ ] All 4 views render with visual parity to v1.4
    - [ ] Settings persistence works (beforeUnmount hook fires correctly)
    - [ ] FA icons render in all sites (including Discord brand icon)
    - [ ] Changelog markdown renders via vue3-markdown-it
    - [ ] Ctrl+C / Del / F1 shortcuts functional (vue3-shortkey)
    - [ ] Bundle size within ±10% of v1.4 baseline
    - [ ] `npm test` 256/256; lint ≤1881
    - [ ] 9 commits on master in the D-08-18 chain
  </how-to-verify>
  <resume-signal>
    Reply with one of:
    - `approved — Phase 8 ships; all 8 REQ-IDs verified; zero Vue migration warnings; 4-view UAT passes` → Phase 8 complete; next step `/gsd-transition` to move to Phase 9 (webpack → Vite)
    - `tolerable-only: <list>` → list the tolerable deprecations observed (OModal, etc.); Phase 8 still ships; the listed items are deferred concerns
    - `blocker: <specific warning or regression>` → Phase 8 does NOT ship yet; describe the issue; planner creates a revision plan to address
    - `bundle-delta: <size before/after>` → bundle outside ±10% tolerance; user accepts or requests optimization
  </resume-signal>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → local node_modules | 4 plugin changes (3 removals + 4 adds/bumps), single-maintainer replacement packages |
| File system → git tree | `src/renderer/store/` directory + 2 JS files deleted from the working tree |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-06-01 | Tampering | vue3-shortkey / vue3-markdown-it / vue3-click-away — single-maintainer supply chain | mitigate | `npm audit --audit-level=high` runs Task 1 Step 3; HIGH/CRITICAL blocks the commit. Each package is Vue-community-known; pin via caret. Post-install lockfile captured in git. |
| T-08-06-02 | Denial of Service | vue-lazyload@3 breaking API change silently breaks `v-lazy` directive | mitigate | Final UAT exercises 2 Home.vue v-lazy sites (carousel thumbnails). If directive broken, thumbnails don't appear → UAT catches it. |
| T-08-06-03 | Denial of Service | vue-simple-context-menu@4 breaking API change (Assumption A9) | mitigate | Final UAT covers the context-menu right-click flow if currently exposed in Home.vue. If API changed: revision plan. |
| T-08-06-04 | Information Disclosure | Deleting `src/renderer/store/` loses committed source code | accept | Per CONTEXT.md Claude's Discretion; scout confirmed zero imports. File history preserved in git log even after deletion. If future Vue 3 Pinia store is needed, fresh start is cleaner than Vuex→Pinia migration of dead code. |

Block threshold: high. T-08-06-01 and T-08-06-02 are blocking (supply-chain + core directive); T-08-06-03 is blocking if A9 fails (revision); T-08-06-04 accepted.

</threat_model>

<verification>

Final phase verification (Step 5 of Task 4):

1. `grep -rEc "Vue\.(use|component|extend|config|mixin)" src/renderer/` → 0
2. `grep -rEc ":[a-z]+\.sync=" src/renderer/` → 0
3. `grep -rEc "\$buefy|\\.\\\$set\\(|\\.\\\$delete\\(" src/renderer/` → 0
4. `grep -rE "use\.fontawesome\.com" src/` → 0
5. `grep -rE "@import '~bulma|@import '~buefy" src/renderer/` → 0
6. `grep -rEc "<\/?b-[a-z]+" src/renderer/` → 0
7. `npm ls @vue/devtools` → 8.x present
8. `npm ls vue-devtools` → not present
9. `npm ls buefy` → not present
10. `npm run pack:renderer` → exits 0
11. `npm test` → 256/256
12. `npm run lint` → ≤1881
13. `git log --oneline -n 9` shows 9 commits in the D-08-18 chain
14. UAT human approval with zero Vue migration warnings

</verification>

<success_criteria>

Plan 06 (and Phase 8) complete when:
- [ ] package.json: no `v-click-outside`, `vue-markdown-plus`, `vue-shortkey` (bare); has `vue3-shortkey@^4`, `vue3-markdown-it@^1`, `vue-lazyload@^3`, `vue-simple-context-menu@^4`
- [ ] `npm install` clean; `npm audit --audit-level=high` clean
- [ ] main.js: no Vue 2 plugin registrations; vue3-shortkey + vue3-markdown-it registered
- [ ] ChangelogModal.vue uses `<vue3-markdown-it>` tag
- [ ] `src/renderer/store/` directory deleted
- [ ] `npm run pack:renderer` exits 0; `npm test` 256/256; lint ≤1881
- [ ] Bundle size within ±10% of v1.4 baseline
- [ ] 9 commits visible on master per D-08-18 chain
- [ ] UAT checkpoint approved by user
- [ ] **REQ success criterion #6 HARD GATE**: zero Vue 2 → Vue 3 migration warnings in dev-runtime console
- [ ] All 8 REQ-IDs (VUE3-01..04, UI-02..05) verified
- [ ] Plan summary at `.planning/phases/08-vue3-core-merged/08-06-SUMMARY.md`
- [ ] Phase 8 ready for `/gsd-transition` to Phase 9 (webpack → Vite)

</success_criteria>

<output>
After completion, create `.planning/phases/08-vue3-core-merged/08-06-SUMMARY.md` documenting:
- A3 empirical outcome: was v-click-outside used or truly unused?
- A9 empirical outcome: vue-simple-context-menu@4 API preserved?
- A10 empirical outcome: vue-lazyload@3 v-lazy directive functional?
- A11 empirical outcome: vue3-shortkey v-shortkey/shortkey API preserved?
- `npm audit --audit-level=high` output
- Final `dist/renderer.js` + `dist/main.css` bundle sizes; ±10% delta vs v1.4 baseline
- Final lint count; final test count
- UAT findings: list of console messages observed (classified per Step 2 table)
- 8 REQ-ID verdicts (PASS / FAIL per each)
- 9-commit bisect chain SHAs (one row per commit)
- Phase 8 closing declaration: SHIPPED / REVISION REQUIRED
</output>
