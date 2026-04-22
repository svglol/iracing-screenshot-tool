---
phase: 08-vue3-core-merged
plan: 02
type: execute
wave: 2
depends_on: [08-01]
files_modified:
  - src/renderer/views/Home.vue
  - src/renderer/components/SettingsModal.vue
  - src/renderer/assets/style/animations.scss
autonomous: true
requirements: [VUE3-01]
tags: [vue3, sfc, reactivity, transitions, slots, lifecycle]

must_haves:
  truths:
    - "All Vue 2-specific SFC idioms retired across the renderer (no $set, no $delete, no beforeDestroy, no slot-scope, no transition '-enter' class without '-from')"
    - "Vue 3 Proxy reactivity replaces $set/$delete semantics with direct assignment / splice"
    - "Transitions keep rendering (no silent regression from Vue 2 class names)"
    - "npm run pack:renderer still exits 0"
  artifacts:
    - path: "src/renderer/views/Home.vue"
      provides: "$set/$delete retirement + slot-scope → #slot syntax + Vue.extend drop"
      contains: "item.thumb = item.thumbDisplayPath"
    - path: "src/renderer/components/SettingsModal.vue"
      provides: "beforeDestroy → beforeUnmount rename"
      contains: "beforeUnmount"
    - path: "src/renderer/assets/style/animations.scss"
      provides: "Vue 3 transition class names with -enter-from suffix"
      contains: ".slide-up-enter-from"
  key_links:
    - from: "src/renderer/views/Home.vue"
      to: "item (data property reactive proxy)"
      via: "direct assignment"
      pattern: "item\\.thumb = item\\.thumbDisplayPath"
    - from: "src/renderer/components/SettingsModal.vue"
      to: "Vue 3 lifecycle hooks"
      via: "beforeUnmount"
      pattern: "beforeUnmount\\(\\)"
---

<objective>
Retire every Vue 2-specific SFC idiom that Vue 3 either dropped or silently broke. This plan is Vue-3-only — no UI framework change yet; all `<b-*>` Buefy tags stay intact, and Buefy component rendering remains broken under Vue 3 (that's Plan 03+04's job). Specifically:

1. **Drop `Vue.extend(...)` wrapper in Home.vue** (still present at line 270 after Plan 01 fixed App.vue)
2. **`this.$set(obj, 'key', val)` → direct assignment** (Home.vue lines 351, 496) per Vue 3 Proxy reactivity
3. **`this.$delete(this.items, index)` → `this.items.splice(index, 1)`** (Home.vue line 438)
4. **`beforeDestroy()` → `beforeUnmount()`** (SettingsModal.vue line 395)
5. **Old slot syntax `<template slot="X" slot-scope="Y">` → `<template #X="Y">`** (Home.vue line 110)
6. **Vue 3 transition class renames in animations.scss** — `.X-enter` / `.X-leave` → `.X-enter-from` / `.X-leave-from` (8 transitions affected: list-in, list-out, list-out-delayed, slide-up, slide-down, slide-right, slide-left, list-complete)

Purpose: Close the Vue 2-idiom surface so that after Plan 04 (Buefy→Oruga) lands, runtime console has zero Vue 2 → Vue 3 migration warnings. Catches the **silent** transition regression flagged in RESEARCH.md Pattern 8 (transitions would partially break without throwing).
Output: One commit: `refactor(renderer): Vue 3 SFC idiom fixes ($set/$delete, beforeDestroy, slot-scope, transitions)` (commit 3 of the 9-commit chain per D-08-18 + researcher refinement).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/08-vue3-core-merged/08-CONTEXT.md
@.planning/phases/08-vue3-core-merged/08-RESEARCH.md
@.planning/phases/08-vue3-core-merged/08-01-SUMMARY.md

# Files being edited
@src/renderer/views/Home.vue
@src/renderer/components/SettingsModal.vue
@src/renderer/assets/style/animations.scss

<interfaces>
<!-- Vue 3 Options API lifecycle / reactivity contract -->

Vue 3 Proxy reactivity (from vue@3.5.x docs):
```javascript
// Before (Vue 2):
this.$set(obj, 'newKey', value);  // tracks new property
this.$delete(arr, index);          // untracks a property

// After (Vue 3 — Proxy tracks mutations):
obj.newKey = value;               // direct assignment tracked
arr.splice(index, 1);             // array splice tracked
// (delete obj.key also works; splice is safer for arrays.)
```

Vue 3 lifecycle rename:
```javascript
// Before: beforeDestroy() {}  → After: beforeUnmount() {}
// Before: destroyed() {}      → After: unmounted() {}
// (Only 1 site in codebase: SettingsModal.vue:395 uses beforeDestroy)
```

Vue 3 transition class names (hard break at Vue 3.0):
```scss
// Before (Vue 2):
.fade-enter, .fade-leave-to { opacity: 0; }
// After (Vue 3):
.fade-enter-from, .fade-leave-to { opacity: 0; }
// '-enter' (active-state start) became '-enter-from'.
// '-leave-to' DID NOT change — Vue 2 also used '-leave-to'.
```

Vue 3 slot syntax (Vue 2 deprecation hardened in Vue 3):
```html
<!-- Before (Vue 2): -->
<template slot="indicators" slot-scope="props"> ... </template>
<!-- After (Vue 3): -->
<template #indicators="props"> ... </template>
<!-- 'props.i' access pattern inside template body unchanged. -->
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Drop Vue.extend wrapper + $set/$delete + slot-scope in Home.vue</name>
  <read_first>
    - src/renderer/views/Home.vue (full file — locate lines 110, 270, 351, 438, 496)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 4 ($set/$delete retirement)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 5 (Vue.extend drop)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 6 (slot-scope → v-slot)
  </read_first>
  <behavior>
    - Behavior 1: `Vue.extend({...})` wrapper on line 270 → plain options object `{...}`
    - Behavior 2: `import Vue from 'vue';` at top of `<script>` → removed (no longer needed)
    - Behavior 3: Line 351 `this.$set(item, 'thumb', item.thumbDisplayPath);` → `item.thumb = item.thumbDisplayPath;`
    - Behavior 4: Line 438 `this.$delete(this.items, index);` → `this.items.splice(index, 1);`
    - Behavior 5: Line 496 `this.$set(item, 'thumb', item.thumbDisplayPath);` → `item.thumb = item.thumbDisplayPath;`
    - Behavior 6: Line 110 `<template slot="indicators" slot-scope="props">` → `<template #indicators="props">` (prop access `props.i` inside the template unchanged)
  </behavior>
  <action>
    Open `src/renderer/views/Home.vue`.

    **Edit 1 (line ~270 area — drop Vue.extend):**
    Locate `export default Vue.extend({` and change to `export default {`. Find the matching closing `});` at the end of the export block and change to `};`.

    Also remove the top-of-script `import Vue from 'vue';` line — it becomes unused after this edit.

    Do NOT use `defineComponent` (Phase 12 scope).

    **Edit 2 (line 110 area — slot syntax):**
    Replace exactly this template line:
    ```
    <template slot="indicators" slot-scope="props">
    ```
    with:
    ```
    <template #indicators="props">
    ```
    The inside of the template (lines 111+) uses `props.i` — that access pattern is unchanged in Vue 3. Do NOT touch the template body.

    Note: `<o-carousel>` (after Plan 04) may expose a different slot name (verify Oruga carousel slots during Plan 04 — Research Assumption A3 flagged this). For now, this Plan 02 only fixes the v-slot SYNTAX; the slot NAME swap (if needed) is Plan 04's concern.

    **Edit 3 (line 351 — $set):**
    Change `this.$set(item, 'thumb', item.thumbDisplayPath);` to `item.thumb = item.thumbDisplayPath;`

    **Edit 4 (line 438 — $delete):**
    Change `this.$delete(this.items, index);` to `this.items.splice(index, 1);`

    **Edit 5 (line 496 — $set, second occurrence):**
    Change `this.$set(item, 'thumb', item.thumbDisplayPath);` to `item.thumb = item.thumbDisplayPath;`

    Do NOT refactor surrounding code. Do NOT change indentation beyond what the specific substitutions require. Do NOT convert any method from Options API to Composition API.

    Do NOT touch any `<b-*>` Buefy tags or any `@buefy` related call — Plan 04 handles those.
  </action>
  <verify>
    <automated>
      grep -c "Vue.extend" src/renderer/views/Home.vue  # returns 0
      grep -c "import Vue from 'vue'" src/renderer/views/Home.vue  # returns 0
      grep -c "this.\$set(" src/renderer/views/Home.vue  # returns 0
      grep -c "this.\$delete(" src/renderer/views/Home.vue  # returns 0
      grep -c "slot-scope=" src/renderer/views/Home.vue  # returns 0
      grep -cF '#indicators="props"' src/renderer/views/Home.vue  # returns 1
      grep -c "item.thumb = item.thumbDisplayPath" src/renderer/views/Home.vue  # returns 2
      grep -c "this.items.splice(index, 1)" src/renderer/views/Home.vue  # returns 1
      npm run pack:renderer  # exits 0
    </automated>
  </verify>
  <acceptance_criteria>
    - All 8 grep checks return their expected counts
    - `npm run pack:renderer` exits 0 (Vue 3 + vue-loader 17 still compiles Home.vue)
    - `npm test` → 256/256
    - `<b-*>` tag count in Home.vue unchanged from Plan 01 state (count with `grep -c '<b-' src/renderer/views/Home.vue` — preserve)
    - Lint count ≤1881
  </acceptance_criteria>
  <done>
    Home.vue has zero Vue 2-specific JS idioms (Vue.extend, $set, $delete, slot-scope retired). Build + tests pass. Buefy tags preserved for Plan 04.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Rename beforeDestroy → beforeUnmount in SettingsModal.vue</name>
  <read_first>
    - src/renderer/components/SettingsModal.vue (line 395 area)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 7 (beforeDestroy rename)
  </read_first>
  <behavior>
    - Behavior 1: Line 395 `beforeDestroy()` hook renamed to `beforeUnmount()`
    - Behavior 2: Hook BODY unchanged (the config comparison + electron-store write inside stays intact)
    - Behavior 3: No other lifecycle hooks affected (verified: no `destroyed()` or `beforeDestroy()` elsewhere)
  </behavior>
  <action>
    Open `src/renderer/components/SettingsModal.vue`.

    Locate the `beforeDestroy() {` line (currently line 395). Change ONLY the hook name from `beforeDestroy` to `beforeUnmount`. Do NOT touch the hook body, do NOT touch surrounding methods or computed, do NOT reorder hooks in the Options API object.

    Check the full file once more for any `destroyed()` hook — if present, rename to `unmounted()`. If not present (expected), this is a no-op.

    Do NOT touch any `<b-*>` tags in the template or `$buefy` references in methods — Plan 04 scope.
  </action>
  <verify>
    <automated>
      grep -c "beforeDestroy" src/renderer/components/SettingsModal.vue  # returns 0
      grep -c "beforeUnmount" src/renderer/components/SettingsModal.vue  # returns 1
      grep -rc "beforeDestroy" src/renderer/  # returns 0 across the entire renderer
      grep -rc "destroyed()" src/renderer/  # returns 0 (if hits exist, rename to unmounted)
      npm run pack:renderer  # exits 0
    </automated>
  </verify>
  <acceptance_criteria>
    - `beforeDestroy` appears 0 times in `src/renderer/` tree
    - `beforeUnmount` appears 1 time (only at the renamed site)
    - `npm run pack:renderer` exits 0
    - `npm test` → 256/256
    - The hook body inside the renamed method is byte-identical to the original (except for the method-name line)
  </acceptance_criteria>
  <done>
    Vue 3 lifecycle rename complete; no Vue 2 lifecycle hooks remain in the renderer.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Vue 3 transition class renames in animations.scss</name>
  <read_first>
    - src/renderer/assets/style/animations.scss (full file — 241 lines)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 8 (transition class renames — 8 transitions affected)
  </read_first>
  <behavior>
    - Behavior 1: 8 `.X-enter` class selectors become `.X-enter-from` (list-in, list-out, list-out-delayed, slide-up, slide-down, slide-right, slide-left, list-complete)
    - Behavior 2: `.X-leave-to` class selectors are UNCHANGED (Vue 2 and Vue 3 both use `-leave-to`)
    - Behavior 3: `.X-enter-active` / `.X-leave-active` (the transition-phase classes) are UNCHANGED
    - Behavior 4: Animation keyframe selectors (`.animate-warn`, `.animate-danger`, `.animate-active`, `.rotating`) and their `@keyframes` are UNCHANGED — they're CSS animations, not Vue transitions
  </behavior>
  <action>
    Open `src/renderer/assets/style/animations.scss`.

    Perform 8 exact substitutions. Each is a single-line selector change. The selectors currently on these lines (after Plan 01 — confirm by re-reading):

    - Line 135: `.list-in-enter,` → `.list-in-enter-from,`
    - Line 147: `.list-out-enter,` → `.list-out-enter-from,`
    - Line 159: `.list-out-delayed-enter,` → `.list-out-delayed-enter-from,`
    - Line 171: `.slide-up-enter,` → `.slide-up-enter-from,`
    - Line 183: `.slide-down-enter,` → `.slide-down-enter-from,`
    - Line 195: `.slide-right-enter,` → `.slide-right-enter-from,`
    - Line 207: `.slide-left-enter,` → `.slide-left-enter-from,`
    - Line 218: `.list-complete-enter,` → `.list-complete-enter-from,`

    Each of these is followed on the next line by a `.X-leave-to,` selector that stays unchanged.

    Do NOT touch any of the `-enter-active` / `-leave-active` selectors (those are the transition-phase active classes and are not renamed in Vue 3).

    Do NOT touch any `@keyframes` rules, `.animate-*` class rules, or `.rotating` — those are CSS-animation rules independent of Vue transitions.

    Do NOT touch any `-webkit-` prefixed rules — those are inside `@keyframes` bodies.
  </action>
  <verify>
    <automated>
      grep -cE "\.[a-z-]+-enter," src/renderer/assets/style/animations.scss  # returns 0 (all Vue-2 enter classes gone — note the leading '.' and trailing ',')
      grep -cE "\.[a-z-]+-enter-from," src/renderer/assets/style/animations.scss  # returns 8
      grep -cE "\.[a-z-]+-leave-to," src/renderer/assets/style/animations.scss  # returns 8 (unchanged — still 8 leave-to selectors)
      grep -cE "\.[a-z-]+-enter-active," src/renderer/assets/style/animations.scss  # returns 8 (unchanged)
      grep -cE "\.[a-z-]+-leave-active," src/renderer/assets/style/animations.scss  # returns 8 (unchanged)
      npm run pack:renderer  # exits 0
    </automated>
  </verify>
  <acceptance_criteria>
    - Zero bare `-enter,` class selectors remain (all have `-from` suffix now)
    - 8 `-enter-from,` class selectors present
    - `-leave-to,`, `-enter-active,`, `-leave-active,` counts all unchanged (=8 each)
    - `@keyframes` blocks byte-identical to pre-edit
    - `.animate-*` / `.rotating` rules byte-identical
    - `npm run pack:renderer` exits 0 (SCSS compiles clean)
    - `npm test` → 256/256
  </acceptance_criteria>
  <done>
    All Vue 3 transition class name renames applied. Silent transition regression risk (RESEARCH.md Pattern 8 flag) eliminated. CSS-animation rules preserved.
  </done>
</task>

<task type="auto">
  <name>Task 4: Commit the Vue 3 SFC idiom fixes</name>
  <read_first>
    - .planning/phases/08-vue3-core-merged/08-CONTEXT.md §D-08-18 (bisect shape)
  </read_first>
  <action>
    Stage the three edited files as a single content commit:

    ```bash
    git add src/renderer/views/Home.vue src/renderer/components/SettingsModal.vue src/renderer/assets/style/animations.scss
    git commit -m "refactor(renderer): Vue 3 SFC idiom fixes ($set/$delete, beforeDestroy, slot-scope, transitions)"
    ```

    Do NOT use `--no-verify`. Do NOT add Co-Authored-By. If pre-commit hooks modify files, re-stage and re-commit; do NOT bypass.

    Do NOT stage any files beyond the three listed — any drift from Plan 03+ scope is out-of-bounds for this commit.
  </action>
  <verify>
    <automated>
      git log --oneline -n 1 | grep -c "Vue 3 SFC idiom fixes"  # returns 1
      git diff HEAD~1 HEAD --stat | grep -E "Home.vue|SettingsModal.vue|animations.scss" | wc -l  # returns 3
    </automated>
  </verify>
  <acceptance_criteria>
    - Single commit landed with message "refactor(renderer): Vue 3 SFC idiom fixes..."
    - Exactly 3 files in the diff (Home.vue, SettingsModal.vue, animations.scss)
    - No Co-Authored-By line
  </acceptance_criteria>
  <done>
    Commit 3 of the 9-commit chain landed per D-08-18. Plan 03 can proceed with the Oruga+Bulma dep swap on top of a clean Vue-3-idiom foundation.
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none new) | Phase 8 Plan 02 is pure SFC idiom translation; no new surface crosses a trust boundary |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-02-01 | Tampering | Silent transition regression (animations.scss) | mitigate | Task 3 rewrites all 8 `-enter` class selectors to `-enter-from`. Without this, transitions would partially render (wrong starting state) without throwing a runtime warning — exactly the silent failure RESEARCH.md Pattern 8 flagged. Verify gate counts 8 `-enter-from` selectors; anything less means a selector was missed. |
| T-08-02-02 | Denial of Service | Vue 3 Proxy reactivity not tracking `item.thumb` direct assignment | accept | Vue 3 Proxy-based reactivity tracks direct assignment on existing reactive proxies; `item` in Home.vue is a data-property-array element, which is proxied at component-create time. Direct assignment works. Manual UAT in Plan 04 verifies thumbnail rendering. |

Block threshold: none.

</threat_model>

<verification>

After all four tasks complete:

1. `grep -r "Vue.extend\|this.\$set\|this.\$delete\|beforeDestroy\|slot-scope\|\\.[a-z-]+-enter," src/renderer/` → zero matches across all six checks
2. `npm run pack:renderer` → exits 0
3. `npm test` → 256/256
4. `npm run lint` → count ≤1881
5. `git log --oneline -n 1` shows "refactor(renderer): Vue 3 SFC idiom fixes..."

Note: runtime UAT still not possible (Buefy rendering broken). Plan 04 is the first point where a human validates UI behaviour.

</verification>

<success_criteria>

Plan 02 complete when:
- [ ] Home.vue has zero `Vue.extend`, zero `this.$set`, zero `this.$delete`, zero `slot-scope`
- [ ] Home.vue has one `#indicators="props"` v-slot syntax at the carousel indicator template
- [ ] SettingsModal.vue uses `beforeUnmount()` (not `beforeDestroy()`)
- [ ] animations.scss has 8 `-enter-from` class selectors; zero bare `-enter,` Vue 2 selectors
- [ ] `npm run pack:renderer` exits 0
- [ ] `npm test` → 256/256
- [ ] Single commit with the specified message landed
- [ ] Plan summary captured at `.planning/phases/08-vue3-core-merged/08-02-SUMMARY.md`

</success_criteria>

<output>
After completion, create `.planning/phases/08-vue3-core-merged/08-02-SUMMARY.md` documenting:
- Commit SHA
- Counts from the verification grep sweep (should all be 0 for the Vue 2 patterns)
- `npm run pack:renderer` exit status + warning count
- Lint count
- Bundle size of `dist/renderer.js` after this plan (for delta tracking toward Plan 06 ±10% gate)
</output>
