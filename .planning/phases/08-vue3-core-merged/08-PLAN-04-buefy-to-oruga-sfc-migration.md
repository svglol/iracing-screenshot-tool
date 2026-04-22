---
phase: 08-vue3-core-merged
plan: 04
type: execute
wave: 4
depends_on: [08-03]
files_modified:
  - src/renderer/components/SideBar.vue
  - src/renderer/components/TitleBar.vue
  - src/renderer/components/HelpModal.vue
  - src/renderer/components/ChangelogModal.vue
  - src/renderer/components/PromoCard.vue
  - src/renderer/components/Settings.vue
  - src/renderer/components/SettingsModal.vue
  - src/renderer/views/Home.vue
autonomous: false
requirements: [UI-02, VUE3-01]
tags: [oruga, buefy-migration, sfc, vue3, uat]

must_haves:
  truths:
    - "Zero <b-*> Buefy component tags remain in any renderer SFC"
    - "Zero this.$buefy.* calls remain"
    - "Zero .sync modifiers remain (all converted to v-model:arg)"
    - "All 4 UI destinations (Home view, Settings modal, Help modal, Changelog modal) render and behave identically to v1.4 per manual UAT"
    - "npm run pack:renderer exits 0 under the full Oruga/Bulma 1 stack"
  artifacts:
    - path: "src/renderer/components/Settings.vue"
      provides: "3 <o-modal v-model:active=\"...\"> replacing 3 <b-modal :active.sync>"
      contains: "o-modal"
    - path: "src/renderer/components/SettingsModal.vue"
      provides: "Oruga form components (o-field, o-input, o-select, o-switch) + o-dropdown"
      contains: "o-field"
    - path: "src/renderer/components/SideBar.vue"
      provides: "Oruga form + notification (o-notification replaces b-message)"
      contains: "o-notification"
    - path: "src/renderer/views/Home.vue"
      provides: "Oruga carousel + $oruga.notification.open()"
      contains: "o-carousel"
  key_links:
    - from: "All SFCs"
      to: "Oruga registered components"
      via: "<o-* /> template tags"
      pattern: "<o-[a-z]+"
    - from: "programmatic notification call sites"
      to: "Oruga $oruga instance"
      via: "this.$oruga.notification.open() OR useProgrammatic()"
      pattern: "\\$oruga\\.notification|useProgrammatic"
---

<objective>
Migrate every Buefy `<b-*>` component across all renderer SFCs to Oruga `<o-*>` equivalents. This restores buildability (broken intentionally after Plan 03) and yields a visually functional app on Vue 3 + Oruga + Bulma 1.0.

**Scope:** 8 SFCs, ~47 `<b-*>` component instances, 3 `.sync` modifiers, 3 `$buefy.notification.open(...)` call sites. Per D-08-18 researcher refinement, this plan produces commits 5+6 of the 9-commit chain split by SFC size for smaller bisect windows:
- Commit 5: small/shell SFCs (SideBar, TitleBar, HelpModal, ChangelogModal, PromoCard)
- Commit 6: large SFCs (App.vue refresh if needed, Home.vue, Settings.vue, SettingsModal.vue) + programmatic API swap for $buefy.notification

**This plan is NON-AUTONOMOUS** — includes a human-verify checkpoint at the end for 4-view UAT. Autonomous parts do the SFC mechanical rewrites; checkpoint validates visual + interactive parity.

Key rules per RESEARCH.md:
- `type="is-X"` → `variant="X"` (prefix stripped — Pitfall 7)
- `size="is-X"` → `size="X"` (same rule)
- `<b-message>` → `<o-notification>` (NOT `<o-message>` — Pitfall 6)
- `<b-modal :active.sync="x">` → `<o-modal v-model:active="x">` (Pattern 3)
- `this.$buefy.notification.open()` → `this.$oruga.notification.open()` with `variant:` not `type:` (Pattern 9, Pitfall 8)
- OModal (deprecated) is intentionally kept (not ODialog) per CONTEXT.md A2 decision — deprecation warning tolerable

Purpose: Restore buildability; deliver REQ UI-02 (Buefy retired) + visual-parity gate (VUE3-01 success criterion #4).
Output: Two content commits + one checkpoint summary.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/08-vue3-core-merged/08-CONTEXT.md
@.planning/phases/08-vue3-core-merged/08-RESEARCH.md
@.planning/phases/08-vue3-core-merged/08-03-SUMMARY.md

# All 8 SFCs being edited
@src/renderer/components/SideBar.vue
@src/renderer/components/TitleBar.vue
@src/renderer/components/HelpModal.vue
@src/renderer/components/ChangelogModal.vue
@src/renderer/components/PromoCard.vue
@src/renderer/components/Settings.vue
@src/renderer/components/SettingsModal.vue
@src/renderer/views/Home.vue

<interfaces>
<!-- Buefy → Oruga mapping cheat sheet — apply literally -->

Component tag renames (1:1 where possible):
```
<b-button>        → <o-button>
<b-modal>         → <o-modal>
<b-input>         → <o-input>
<b-field>         → <o-field>
<b-select>        → <o-select>
<b-switch>        → <o-switch>
<b-tag>           → <o-tag>
<b-carousel>      → <o-carousel>
<b-carousel-item> → <o-carousel-item>
<b-message>       → <o-notification>   [Pitfall 6 — NOT o-message]
<b-dropdown>      → <o-dropdown>
<b-dropdown-item> → <o-dropdown-item>
<b-notification>  → <o-notification>
```

Prop renames (Pitfall 7 — "is-" prefix dropped):
```
type="is-info"          → variant="info"
type="is-warning"        → variant="warning"
type="is-danger"         → variant="danger"
type="is-primary"        → variant="primary"
type="is-dark"           → variant="dark"
type="is-twitter"        → variant="twitter"
size="is-small"          → size="small"
size="is-medium"         → size="medium"
size="is-large"          → size="large"
```

Two-way binding:
```
<b-modal :active.sync="x"> → <o-modal v-model:active="x">
<b-foo :prop.sync="y">     → <o-foo v-model:prop="y">
```
(Vue 3 Pattern 3 — .sync retired across the board)

Programmatic API (Pattern 9, Pitfall 8 — A2 verify):
```javascript
// Before (Buefy):
this.$buefy.notification.open({ message: '...', type: 'is-dark' });

// After (Oruga — Option B, Options-API-friendly):
this.$oruga.notification.open({ message: '...', variant: 'dark' });

// Fallback if $oruga is NOT injected in 0.13 (empirically verify in Task 3):
import { useProgrammatic } from '@oruga-ui/oruga-next';
const { oruga } = useProgrammatic();
oruga.notification.open({ message: '...', variant: 'dark' });
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Migrate small/shell SFCs — SideBar, TitleBar, HelpModal, ChangelogModal, PromoCard</name>
  <read_first>
    - src/renderer/components/SideBar.vue (b-field, b-select, b-input, b-message, b-switch, b-button, $buefy.notification — 22 b-* instances per Plan 03 grep)
    - src/renderer/components/TitleBar.vue (FA icons only — check for any b-* tag before assuming no Buefy)
    - src/renderer/components/HelpModal.vue (plain template — verify b-* count; if zero, only content changes are prop renames inside existing Oruga tags — likely a no-op)
    - src/renderer/components/ChangelogModal.vue (uses vue-markdown-plus custom tag; check for any b-*)
    - src/renderer/components/PromoCard.vue (FA icon only per scout; check for any b-*)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Component mapping + §Pitfall 6 + §Pitfall 7
  </read_first>
  <behavior>
    - Behavior 1: SideBar.vue — all 22 `<b-*>` tags become `<o-*>` equivalents; `<b-message>` → `<o-notification>`; all `type="is-X"` → `variant="X"`; all `size="is-X"` → `size="X"`
    - Behavior 2: SideBar.vue — two `this.$buefy.notification.open({...type: 'is-dark'})` calls (lines 176, 192) become `this.$oruga.notification.open({...variant: 'dark'})` (Task 3 validates $oruga injection works; if A2 fails, fall back to `useProgrammatic()`)
    - Behavior 3: TitleBar.vue, HelpModal.vue, ChangelogModal.vue, PromoCard.vue — any `<b-*>` occurrences (even zero) migrated; `vue-markdown-plus` custom tag in ChangelogModal STAYS (Plan 06 swaps it to `vue3-markdown-it`)
    - Behavior 4: No programmatic API calls beyond the two in SideBar in this group of SFCs
    - Behavior 5: `v-lazy` directive usages stay unchanged (vue-lazyload directive works in Vue 3 after Plan 06 bumps it to v3)
  </behavior>
  <action>
    **Per-file migration strategy.** For each of the 5 SFCs, perform the same set of transformations:

    1. **Tag renames** — `<b-X>` → `<o-X>` for every Buefy component type (see interfaces table above). Close-tag form too: `</b-X>` → `</o-X>`.
    2. **Special tag renames** — `<b-message>` → `<o-notification>` (Pitfall 6); `</b-message>` → `</o-notification>`.
    3. **Prop renames** — every `type="is-X"` → `variant="X"` (strip `is-` prefix). Every `size="is-X"` → `size="X"`. Bound variants (`:type="..."`) left alone if the bound expression does NOT return an `is-` prefixed string — flag in summary; inspect manually.
    4. **`:X.sync=` → `v-model:X=`** — for any `.sync` modifier. (Task 2 handles the modals in Settings.vue; Task 1 handles any stragglers in SideBar/TitleBar/etc.)
    5. **`$buefy.X` → `$oruga.X`** in method bodies (SideBar only for this task).

    **Specifics by file:**

    **A. SideBar.vue** (the heavy hitter in this group — 22 Buefy component instances):

    - Apply all five transformation rules above.
    - For the two `this.$buefy.notification.open({ message: ..., type: 'is-dark' })` calls on lines 176 and 192: rewrite BOTH of them to `this.$oruga.notification.open({ message: ..., variant: 'dark' })`. Note: `type: 'is-dark'` → `variant: 'dark'` (strip `is-` prefix here too since Oruga's notification uses `variant` with unprefixed values).
    - For every `<b-message>` tag, rewrite BOTH the opening tag and closing tag to `<o-notification>` / `</o-notification>`. There are 5 `<b-message>` per scout (Pitfall 6 callout).
    - For every `type="is-warning"` / `type="is-info"` etc. on `<b-message>` → `variant="warning"` / `variant="info"` etc.
    - The `v-lazy` directive (if present — grep first) stays unchanged; `vue-lazyload` still registered in main.js (Plan 06 handles its version bump).

    **B. TitleBar.vue:**
    - Scout reports "No Buefy — FA icon only." Re-verify with `grep -c '<b-' src/renderer/components/TitleBar.vue`. If 0, no Buefy edits needed.
    - No programmatic API calls.
    - File likely unchanged by this task (confirm in summary).

    **C. HelpModal.vue:**
    - Scout reports "Plain template, no Buefy components." Verify with grep. If zero `<b-*>` tags, no edits.
    - `<o-modal>` wrapping likely happens at the PARENT level (Settings.vue contains `<b-modal>` that wraps HelpModal) — that's Task 2's scope.

    **D. ChangelogModal.vue:**
    - Contains `<vue-markdown-plus :source="changelog" />` at line 19 — this STAYS. Plan 06 swaps to `<vue3-markdown-it>`.
    - Verify for any `<b-*>` tags (likely zero — the parent modal wrapping is in Settings.vue).
    - If zero `<b-*>`, no edits to this file in this task.

    **E. PromoCard.vue:**
    - Scout reports "FA icon only." Verify `grep -c '<b-' src/renderer/components/PromoCard.vue` = 0.
    - If zero Buefy tags, no edits.

    **IMPORTANT — bounded prop expressions:**
    If you encounter `:type="someExpr"` where `someExpr` is a computed or data returning an `is-`-prefixed string, rewriting the TEMPLATE to `:variant="someExpr"` is still correct, but the `someExpr` VALUE must be rewritten too. Example:
    ```javascript
    // Before (Buefy):
    computed: { messageType() { return this.isWarning ? 'is-warning' : 'is-info'; } }
    // Template: <b-message :type="messageType">

    // After (Oruga):
    computed: { messageVariant() { return this.isWarning ? 'warning' : 'info'; } }
    // Template: <o-notification :variant="messageVariant">
    ```
    Flag any such pattern in the plan summary; inspect each match and rewrite both template attr NAME (`type` → `variant`) AND the computed return value (strip `is-` prefix).

    **Do NOT touch Plan 02 idioms:**
    - Animations classes (handled)
    - $set/$delete (handled in Home.vue)
    - beforeDestroy (handled in SettingsModal.vue)
    - slot-scope (handled in Home.vue)

    **Do NOT touch FA:** `<font-awesome-icon :icon="...">` stays verbatim. Plan 05 bumps the FA version.

    **Do NOT touch dead plugins:** `v-shortkey`, `v-click-outside`, `vue-markdown-plus` custom tags stay. Plan 06 handles them.
  </action>
  <verify>
    <automated>
      # Across all 5 SFCs: zero Buefy tags remain
      grep -rEc "<\/?b-[a-z]+" src/renderer/components/SideBar.vue src/renderer/components/TitleBar.vue src/renderer/components/HelpModal.vue src/renderer/components/ChangelogModal.vue src/renderer/components/PromoCard.vue
      # expected output: each file's count is 0

      # SideBar has the Oruga additions
      grep -c "<o-" src/renderer/components/SideBar.vue  # returns ≥10 (or whatever Oruga instance count — some fraction of the 22)
      grep -c "o-notification" src/renderer/components/SideBar.vue  # returns ≥5 (replaces the 5 b-message)
      grep -c "\$buefy" src/renderer/components/SideBar.vue  # returns 0
      grep -c "\$oruga.notification" src/renderer/components/SideBar.vue  # returns 2 (was 2 $buefy.notification calls)
      grep -c "variant=" src/renderer/components/SideBar.vue  # returns ≥N matching the number of type="is-" the file had
      grep -c 'type="is-' src/renderer/components/SideBar.vue  # returns 0
      grep -c 'size="is-' src/renderer/components/SideBar.vue  # returns 0

      # ChangelogModal still has vue-markdown-plus (Plan 06 swaps)
      grep -c "vue-markdown-plus" src/renderer/components/ChangelogModal.vue  # returns ≥1
    </automated>
  </verify>
  <acceptance_criteria>
    - All 5 files have zero `<b-` tags (opening or closing)
    - SideBar.vue has zero `$buefy` references and 2 `$oruga.notification` calls
    - SideBar.vue has zero `type="is-` / `size="is-` prefix strings
    - `<b-message>` replaced by `<o-notification>` specifically (not `<o-message>` — Pitfall 6)
    - ChangelogModal.vue still has `vue-markdown-plus` (Plan 06 scope)
    - No `defineComponent` wrappers introduced
    - File structure unchanged (same `<template>` / `<script>` / `<style>` block order as before)
    - Do NOT gate on `pack:renderer` yet — Home/Settings still have `<b-*>`; Task 2 restores the build
  </acceptance_criteria>
  <done>
    5 small/shell SFCs migrated from Buefy to Oruga. SideBar programmatic API swapped to Oruga. Still expected to fail build (Home/Settings remaining).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Migrate large SFCs — Settings, SettingsModal, Home; verify $oruga injection (A2)</name>
  <read_first>
    - src/renderer/components/Settings.vue (3 `<b-modal :active.sync="X">` on lines 26, 35, 47 — the 3 `.sync` retirements per Pattern 3)
    - src/renderer/components/SettingsModal.vue (14 b-* component instances per scout — heaviest SFC)
    - src/renderer/views/Home.vue (5 b-* instances + 1 $buefy.notification.open on line 396 + `<b-carousel>` + `<b-carousel-item>`)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 3 (.sync → v-model:arg)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 9 (useProgrammatic fallback for $oruga)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Assumption A2 (empirically verify $oruga injection — ~~smoke test during this task~~)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Assumption A3 (OCarousel slot name "indicators" may differ — verify vs Oruga docs OR by launching dev mode)
  </read_first>
  <behavior>
    - Behavior 1: Settings.vue — three `<b-modal :active.sync="X">` rewrites to `<o-modal v-model:active="X">` (Pattern 3)
    - Behavior 2: SettingsModal.vue — all 14 `<b-*>` → `<o-*>` + all `type="is-"` → `variant="` + `size="is-"` → `size="` + any `.sync` modifiers retired
    - Behavior 3: Home.vue — all 5 `<b-*>` → `<o-*>` + 1 `this.$buefy.notification.open()` → `this.$oruga.notification.open()` + carousel slot name verified against Oruga docs (A3)
    - Behavior 4: `npm run pack:renderer` exits 0 AFTER all three files migrate (the first point in Phase 8 since Plan 03 where the build compiles cleanly)
    - Behavior 5: A2 empirically verified — if `this.$oruga` is undefined at runtime, Task 3 switches to `useProgrammatic()` pattern
  </behavior>
  <action>
    Apply the same five transformation rules from Task 1 to each of the three large SFCs. Pay special attention to the `.sync` retirements in Settings.vue and the programmatic notification in Home.vue.

    **A. Settings.vue** (lightest of the three):
    - Line 26: `<b-modal :active.sync="showSettings" has-modal-card full-screen :can-cancel="true">` → `<o-modal v-model:active="showSettings" has-modal-card full-screen :can-cancel="true">`
    - Line 35: `<b-modal :active.sync="showHelp"` ... → `<o-modal v-model:active="showHelp"` ...
    - Line 47: `<b-modal :active.sync="showChangelog"` ... → `<o-modal v-model:active="showChangelog"` ...
    - Any closing `</b-modal>` tags → `</o-modal>`
    - Keep OModal (NOT ODialog) per CONTEXT.md A2 — deprecation warning in dev-runtime is tolerable under success criterion #6 (scoped to Vue migration warnings only, not component-lib warnings)
    - Preserve all attributes/props verbatim: `has-modal-card`, `full-screen`, `:can-cancel="true"`, scoped slot content — only the tag name and `.sync` modifier change
    - Preserve the `v-shortkey="['f1']"` directive (Plan 06 swaps the underlying package)

    **B. SettingsModal.vue** (14 Buefy instances — heavy):
    - Apply the five transformation rules across the entire template
    - Pay attention to `<b-field>` + nested `<b-input>` / `<b-select>` / `<b-switch>` combinations — structure unchanged, tags change
    - If any `.sync` modifier appears, rewrite to `v-model:arg`
    - If any `<b-dropdown>` appears, rewrite to `<o-dropdown>`
    - Programmatic API calls — grep first. If any `this.$buefy.*` appears, rewrite to `this.$oruga.*` with Buefy-to-Oruga prop mapping (`type: 'is-X'` → `variant: 'X'`)
    - Do NOT modify the `beforeUnmount()` hook or any electron-store config logic — that's Plan 02 work (already done)

    **C. Home.vue** (5 Buefy + carousel + notification — moderate):
    - Apply the five transformation rules
    - `<b-carousel>` → `<o-carousel>`; `<b-carousel-item>` → `<o-carousel-item>`
    - **A3 verification for carousel indicator slot name:** Plan 02 already rewrote `<template slot="indicators" slot-scope="props">` to `<template #indicators="props">`. Now verify: does Oruga's `<o-carousel>` expose an `indicators` slot? Check the installed Oruga package:
      ```bash
      grep -r "slot" node_modules/@oruga-ui/oruga-next/dist/carousel*.d.ts 2>/dev/null | head -20
      ```
      OR check the web docs https://oruga-ui.com/components/carousel. If the slot name is DIFFERENT (e.g. `indicator` singular, or `thumbnail`), update Home.vue's slot name match accordingly. Capture findings in plan summary.
      If uncertain, keep `#indicators="props"` for now and let the Task 3 checkpoint UAT catch a missing-indicator regression.
    - Line 396: `this.$buefy.notification.open({ message: ..., type: 'is-dark' })` → `this.$oruga.notification.open({ message: ..., variant: 'dark' })`
    - Preserve `v-shortkey` directives on lines 54, 68 (Plan 06 swaps the package)
    - Preserve `v-lazy` directive on lines 97, 113 (Plan 06 bumps vue-lazyload to v3)
    - Preserve all `<font-awesome-icon>` elements (Plan 05 bumps FA to v7 + vue-fontawesome 3)

    **Post-edit build gate (THIS is the first time since Plan 03 that the build should succeed):**

    ```bash
    npm run pack:renderer
    ```

    Expected: exit code 0. Webpack compiles through vue-loader 17 with all SFCs now using Oruga tags that Oruga registered in main.js knows about.

    If `pack:renderer` fails with "Failed to resolve component: o-X":
    - The `o-X` wasn't registered in main.js's `oruga.use(...)` list. Add `OX` to the imports + the forEach loop in main.js.
    - Re-run `pack:renderer`.

    If `pack:renderer` fails with an SCSS error: re-run `npx sass --load-path=node_modules src/renderer/assets/style/main.scss /tmp/test.css` to isolate. Likely a Bulma 1.0 variable reference that wasn't updated.
  </action>
  <verify>
    <automated>
      # Zero Buefy across all renderer SFCs at this point (Task 1 handled the small ones; this task finishes the large ones)
      grep -rEc "<\/?b-[a-z]+" src/renderer/components/ src/renderer/views/  # returns 0 total across all files
      grep -rc "\$buefy" src/renderer/  # returns 0
      grep -rEc ":[a-z]+\.sync=" src/renderer/  # returns 0 (.sync modifiers fully retired)
      grep -rc 'type="is-' src/renderer/components/ src/renderer/views/  # returns 0
      grep -rc 'size="is-' src/renderer/components/ src/renderer/views/  # returns 0

      # Specific checks for the three files
      grep -c "v-model:active=" src/renderer/components/Settings.vue  # returns 3
      grep -c "o-modal" src/renderer/components/Settings.vue  # returns ≥6 (3 open + 3 close tags)
      grep -c "\$oruga.notification" src/renderer/views/Home.vue  # returns 1
      grep -c "o-carousel" src/renderer/views/Home.vue  # returns ≥2 (open + close)

      # Build gate
      npm run pack:renderer  # exits 0
      npm test  # 256/256
    </automated>
  </verify>
  <acceptance_criteria>
    - Zero `<b-*>` tags across `src/renderer/`
    - Zero `$buefy` references across `src/renderer/`
    - Zero `.sync` modifiers across `src/renderer/`
    - Zero `type="is-"` / `size="is-"` prop strings
    - `npm run pack:renderer` exits 0 — FIRST successful build since Plan 03
    - `dist/renderer.js` produced
    - `npm test` 256/256
    - Lint count ≤1881
    - A3 carousel slot name verified; findings documented in summary
  </acceptance_criteria>
  <done>
    All 8 SFCs migrated from Buefy to Oruga. Build restored. App boots on Vue 3 + Oruga + Bulma 1 (runtime UAT pending Task 3 checkpoint).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Empirical A2 verification + commit the two-commit SFC bisect pair</name>
  <read_first>
    - src/renderer/main.js (Oruga registration already in place from Plan 03)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 9 + §Pitfall 8 (useProgrammatic fallback)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Assumption A2 (empirical verification REQUIRED)
  </read_first>
  <action>
    **A2 empirical verification:** the Task 2 code calls `this.$oruga.notification.open(...)` at 3 sites (SideBar.vue:176, SideBar.vue:192, Home.vue:396). If Oruga 0.13 does NOT inject `$oruga` on component instances, all three calls throw `TypeError: Cannot read properties of undefined (reading 'notification')` at runtime.

    Run this check:

    ```bash
    grep -rE "globalProperties\.oruga|\\\$oruga" node_modules/@oruga-ui/oruga-next/dist/ 2>/dev/null | head -10
    ```

    Expected: some match like `globalProperties.$oruga = this` or similar suggesting global injection exists.

    If the grep returns nothing OR if manual testing during the checkpoint below shows `$oruga is undefined`, switch to the `useProgrammatic()` fallback:

    **Fallback rewrite (Option A from Pattern 9)** — applied to all 3 notification sites:

    In each of SideBar.vue and Home.vue where `this.$oruga.notification.open(...)` is called:

    ```javascript
    // At top of <script>:
    import { useProgrammatic } from '@oruga-ui/oruga-next';

    // Inside the method body that previously had this.$oruga.notification.open:
    methodName() {
    	const { oruga } = useProgrammatic();
    	oruga.notification.open({ message: '...', variant: 'dark' });
    }
    ```

    Record A2 outcome (`$oruga injected: YES/NO`) in plan summary.

    **If A2 PASS (i.e. `this.$oruga` works):** no code change needed; commit as-is.
    **If A2 FAIL:** apply the fallback rewrite to the 3 sites, re-run `npm run pack:renderer` (should still exit 0), then commit.

    **Commit the two-commit pair per D-08-18:**

    Commit 5 of the 9-commit chain (small/shell SFCs):
    ```bash
    git add src/renderer/components/SideBar.vue src/renderer/components/TitleBar.vue src/renderer/components/HelpModal.vue src/renderer/components/ChangelogModal.vue src/renderer/components/PromoCard.vue
    git commit -m "refactor(renderer): migrate small SFCs Buefy → Oruga (SideBar, TitleBar, HelpModal, ChangelogModal, PromoCard)"
    ```

    Commit 6 of the 9-commit chain (large SFCs + programmatic API + any A2 fallback):
    ```bash
    git add src/renderer/components/Settings.vue src/renderer/components/SettingsModal.vue src/renderer/views/Home.vue
    git commit -m "refactor(renderer): migrate large SFCs Buefy → Oruga (Home, Settings, SettingsModal) + oruga programmatic API"
    ```

    If A2 fallback required an edit to main.js (unlikely but possible): stage main.js in commit 6 alongside the large SFCs.

    No Co-Authored-By. No --no-verify.
  </action>
  <verify>
    <automated>
      git log --oneline -n 2 | head -1 | grep -c "migrate large SFCs"  # returns 1
      git log --oneline -n 2 | tail -1 | grep -c "migrate small SFCs"  # returns 1
      git diff HEAD~2 HEAD~1 --stat | grep -c "SideBar.vue"  # returns 1
      git diff HEAD~1 HEAD --stat | grep -cE "Home.vue|Settings.vue|SettingsModal.vue"  # returns 3
      npm run pack:renderer  # exits 0
      npm test  # 256/256
    </automated>
  </verify>
  <acceptance_criteria>
    - Two commits landed with the specified messages
    - Commit 1 (small SFCs) has exactly 5 files in diff
    - Commit 2 (large SFCs) has exactly 3 files (or 4 if main.js A2 fallback included)
    - `npm run pack:renderer` exits 0
    - A2 outcome recorded in plan summary (`$oruga` injected: YES or NO; if NO, fallback applied to 3 sites)
    - No Co-Authored-By lines
  </acceptance_criteria>
  <done>
    Commits 5+6 of the 9-commit chain landed. Build + tests pass. App is NOW ready for runtime UAT at Task 4 checkpoint.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: 4-view UAT checkpoint — verify visual + interactive parity with v1.4</name>
  <what-built>
    After Tasks 1+2+3, the app boots on Vue 3 + vue-router 4 + Oruga 0.13 + Bulma 1.0 + theme-bulma with all 8 SFCs migrated from Buefy to Oruga. Tasks 1-3 are fully autonomous; runtime visual and interactive behavior requires human eyes to validate. FA icons are still at v6.x (Plan 05 bumps to v7); three dead plugins still registered (Plan 06 swaps).
  </what-built>
  <how-to-verify>
    Launch the dev build and walk through all 4 UI destinations. This is REQ success criterion #4 and the milestone-level UAT gate.

    **Step 1 — Launch:**
    ```bash
    npm run dev
    ```
    Wait for the Electron window to open. It should display the app on the Home view.

    **Step 2 — Open DevTools console** (Ctrl+Shift+I inside the Electron window). Keep it open throughout the UAT.
      - Expected: zero red errors
      - Expected: zero "[Vue warn]" messages matching pattern "Failed to resolve component: o-" (if any — that means a Buefy component mapped to an Oruga one not registered in main.js; log the component name and we fix in Plan 04 follow-up)
      - Tolerable: "OModal is deprecated; please use ODialog" (single warning per first-open — CONTEXT.md A2 accepts this)
      - Tolerable: FA-related warnings if any (Plan 05 bumps FA to v7)
      - Tolerable: deprecation warnings from vue-shortkey, v-click-outside, vue-markdown-plus (Plan 06 swaps these)

    **Step 3 — Home view visual check:**
      - Sidebar visible on left
      - Main content area renders (carousel or placeholder depending on screenshot state)
      - PromoCard visible with Discord FA icon
      - Title bar shows "iRacing Screenshot Tool" with app icon
      - Styling: primary color (red #ec202a) appears on buttons/highlights; twitter-blue (#4099ff) appears where used
      - No unstyled custom-element blotches (e.g. literal `<o-button>` showing in DOM — if present, Oruga missed a registration)

    **Step 4 — Settings modal:**
      - Click the gear icon in the sidebar → Settings modal opens (v-model:active works)
      - Form fields render: input fields, selects, switches all functional
      - Entering a value, then closing the modal, then re-opening it → value persists (electron-store + beforeUnmount hook)
      - Click the settings gear in a way that opens the Help sub-modal (if exposed via button) → Help modal opens on top → close returns to Settings
      - Similarly for Changelog modal (if exposed via button)
      - Close the Settings modal → returns to Home view

    **Step 5 — Help modal:**
      - Can be opened via F1 (v-shortkey directive — Plan 06 swaps the underlying package; may or may not work depending on vue-shortkey@3 + Vue 3 peer-dep compat)
      - If F1 doesn't fire the modal: it's an expected Plan 06 concern. Log it ("F1 shortcut non-functional in Plan 04 — Plan 06 swaps vue-shortkey") and continue; it's not a blocker for Plan 04 approval.
      - Content renders (plain HTML template)
      - Close button dismisses the modal

    **Step 6 — Changelog modal:**
      - Open via Settings → Changelog button (or whatever the existing UX is)
      - Markdown renders via `<vue-markdown-plus>` — Plan 06 swaps this to vue3-markdown-it; for Plan 04, either it works (Vue 3 + vue-markdown-plus@2 happen to be compat) or it shows blank/broken markdown (expected; Plan 06 fixes)
      - If markdown is broken: log "Changelog markdown blank — Plan 06 to fix." Not a blocker.

    **Step 7 — Screenshot flow (optional but valuable):**
      - If iRacing is running in-background OR dev mode supports mock, take a screenshot via the primary button/shortcut
      - Thumbnail appears in Home view carousel
      - `this.$oruga.notification.open({...})` fires → a toast notification appears with "copied to clipboard" message
      - If notification DOES NOT appear: Assumption A2 failed ($oruga not injected). Task 3's fallback should have kicked in; if it didn't, that's a Plan 04 revision.

    **Step 8 — Route switching check:**
      - Trigger an IPC `change-view` (only testable via actual iRacing integration OR dev console manual fire) — if possible, invoke the handler and confirm router.push works
      - If not easy to test: skip. Plan 06's final UAT checkpoint re-covers this.

    **Step 9 — Console sweep at end:**
      - Dock the DevTools console; scroll through all messages from launch to now
      - Count red errors → expected: 0
      - Count `[Vue warn]` messages → expected: ~0-3 (anything from vue-shortkey/v-click-outside/vue-markdown-plus is Plan 06 deferred; anything OModal-deprecation is CONTEXT.md A2 tolerable)
      - ANY `[Vue warn]: Failed to resolve component:` matching `o-X` → BLOCKER. Log which component, add to main.js registration list, redo Task 2 build.
      - ANY `TypeError: Cannot read properties of undefined (reading 'notification')` → A2 fallback wasn't applied correctly. Redo Task 3 A2 fallback.

    **Expected approval signals (all must be YES):**
    - [ ] Home view renders with sidebar + title bar + content area
    - [ ] Settings modal opens (v-model:active works)
    - [ ] Settings modal form fields render (oruga field/input/select/switch)
    - [ ] Settings persistence works on close (config gets saved via beforeUnmount)
    - [ ] Primary red color visible on Oruga-variant buttons/highlights
    - [ ] Zero "Failed to resolve component: o-" warnings in console
    - [ ] Zero unhandled TypeErrors on notification calls

    **Capture:** Take a screenshot of Home view + Settings modal (optional, but useful for comparison in the milestone audit).
  </how-to-verify>
  <resume-signal>
    Reply with one of:
    - `approved — all 4 views render, console clean (except tolerable deprecations)` → Plan 04 closes; proceed to Plan 05
    - `issue: <specific description>` → describe what broke; planner (you) identifies whether it's a Plan 04 bug (fix here) or a Plan 05/06 deferral (log and proceed)
    - `blocker: <specific description>` → stop Plan 04; open a revision task to fix before proceeding
  </resume-signal>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| SFC template → Oruga component runtime | 47+ component instances now resolve through `oruga.use(...)` registrations rather than `Vue.use(Buefy)` global install |
| Method body → Oruga programmatic API | 3 notification sites rely on `$oruga` injection OR `useProgrammatic()` composable |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-04-01 | Tampering | SFC template uses `<o-X>` with `X` not registered in main.js | mitigate | Task 2 verify step includes `npm run pack:renderer` + Task 4 UAT checks console for "Failed to resolve component: o-" warnings. Per-component list in main.js is explicit; gaps surface immediately. |
| T-08-04-02 | Denial of Service | `$oruga` not injected → TypeError on notification open | mitigate | Task 3 empirically verifies A2; fallback to `useProgrammatic()` if injection missing. Task 4 UAT exercises notification path to confirm. |
| T-08-04-03 | Tampering | Silent styling regression from theme-bulma vs Bulma 0.9 `$colors` map | accept | Task 4 UAT visual check catches color/styling deltas; minor regressions (e.g. twitter-blue variant rendering slightly differently) acceptable if overall identity preserved (per UI-02's "visual identity preserved" language). |
| T-08-04-04 | Tampering | OModal deprecation warning floods console | accept | Single deprecation warning per modal type, per app lifetime — CONTEXT.md A2 accepts this as tolerable. Success criterion #6 is scoped to Vue migration warnings specifically. |

Block threshold: high. T-08-04-01 and T-08-04-02 are blocking; T-08-04-03 and T-08-04-04 are tolerable with user acknowledgment.

</threat_model>

<verification>

After all 4 tasks complete:

1. `grep -rEc "<\/?b-[a-z]+" src/renderer/` → 0
2. `grep -rc "\$buefy" src/renderer/` → 0
3. `grep -rEc ":[a-z]+\.sync=" src/renderer/` → 0
4. `grep -rc 'type="is-' src/renderer/components/ src/renderer/views/` → 0
5. `npm run pack:renderer` → exits 0
6. `npm test` → 256/256
7. Three commits landed (two SFC migrations + A2 resolution if applied)
8. UAT checkpoint signed off by human

</verification>

<success_criteria>

Plan 04 complete when:
- [ ] All 8 SFCs have zero Buefy `<b-*>` tags
- [ ] All programmatic `$buefy` calls swapped to `$oruga` OR `useProgrammatic()` per A2 outcome
- [ ] Zero `.sync` modifiers across `src/renderer/`
- [ ] Zero `type="is-"` / `size="is-"` prop prefixes
- [ ] `npm run pack:renderer` exits 0
- [ ] `npm test` → 256/256
- [ ] Lint count ≤1881
- [ ] UAT checkpoint approved by user (all 4 views render; console clean except tolerable deprecations)
- [ ] Two commits: small SFCs + large SFCs
- [ ] A2 outcome documented in plan summary (YES = $oruga injected / NO = useProgrammatic fallback applied)
- [ ] A3 outcome documented (carousel indicator slot name)
- [ ] Plan summary at `.planning/phases/08-vue3-core-merged/08-04-SUMMARY.md`

</success_criteria>

<output>
After completion, create `.planning/phases/08-vue3-core-merged/08-04-SUMMARY.md` documenting:
- Files edited + per-file Buefy instance count → Oruga count
- A2 empirical outcome (`$oruga` injected YES/NO; if NO, list the 3 fallback sites)
- A3 carousel slot verification outcome
- `npm run pack:renderer` exit code + warning count
- `dist/renderer.js` bundle size (compared to Plan 02 baseline — ±10% gate tracked across all plans to Plan 06)
- Lint count
- UAT findings: list any tolerable warnings/deprecations observed
- Commit SHAs for commits 5+6 of the 9-commit chain
</output>
