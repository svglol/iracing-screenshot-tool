---
phase: 08-vue3-core-merged
plan: 03
type: execute
wave: 3
depends_on: [08-02]
files_modified:
  - package.json
  - package-lock.json
  - src/renderer/main.js
  - src/renderer/assets/style/main.scss
autonomous: true
requirements: [UI-02, UI-03]
tags: [oruga, bulma, scss, dep-swap, theme-bulma]

must_haves:
  truths:
    - "buefy + bulma-pro removed from dependencies"
    - "@oruga-ui/oruga-next + @oruga-ui/theme-bulma + bulma@^1 installed"
    - "main.scss uses Bulma 1.0 @use pattern (no @import '~bulma' or '~buefy')"
    - "main.js drops bulma-pro + buefy CSS imports + Vue.use(Buefy) / app.use(Buefy) registration"
    - "npm install completes with zero ERESOLVE"
  artifacts:
    - path: "package.json"
      provides: "Oruga + Bulma 1 dep pins, buefy/bulma-pro removed"
      contains: "\"@oruga-ui/oruga-next\""
    - path: "src/renderer/main.js"
      provides: "createOruga() + oruga.use(OButton, OModal, ...) + app.use(oruga, bulmaConfig)"
      contains: "createOruga"
    - path: "src/renderer/assets/style/main.scss"
      provides: "Bulma 1.0 @use pattern replacing Bulma 0.9 @import"
      contains: "@use"
  key_links:
    - from: "src/renderer/main.js"
      to: "Oruga plugin + bulmaConfig"
      via: "app.use(oruga, { ...bulmaConfig, iconPack: 'fas' })"
      pattern: "app\\.use\\(oruga"
    - from: "src/renderer/assets/style/main.scss"
      to: "@oruga-ui/theme-bulma SCSS entry"
      via: "@use directive"
      pattern: "@use .*theme-bulma"
---

<objective>
Swap the UI framework dependencies (Buefy → Oruga + Bulma 1.0 + theme-bulma), remove `bulma-pro`, and rewrite `main.scss` to use Bulma 1.0's `@use` module pattern. Register Oruga per-component in `main.js` (per RESEARCH.md Pitfall 5 — Oruga 0.13 dropped auto-registration).

**Build WILL break after this plan lands.** That's intentional per D-08-18 bisect discipline: commit 4 is a `chore(deps)` + SCSS rewrite that removes Buefy imports; commit 5/6 (Plan 04) rewrites every `<b-*>` component to `<o-*>` which restores the build. `git bisect` between HEAD and the Plan 03 commit isolates UI-swap dep regressions from SFC-level regressions.

All `<b-*>` Buefy tags in SFCs remain untouched here — Plan 04's sole job. `this.$buefy.notification.open(...)` calls in three sites (Home.vue:396, SideBar.vue:176, 192) also stay untouched — Plan 04 swaps them.

**Assumption verification inlined:** this plan empirically resolves RESEARCH.md Assumptions A2 ($oruga injection exists), A4 (theme-bulma SCSS entry path), A6 (bulma-pro has no 1.0 version). If any of these fail, the task captures the failure mode and recommends the follow-up.

Purpose: Clear the UI-framework dep surface so Plan 04 can freely edit SFCs with a working Oruga/Bulma 1 build chain.
Output: Two commits (commit 4 of 9-commit chain + the main.scss SCSS rewrite happens in the same Plan 03 commit chain):
- `chore(deps): add @oruga-ui/oruga-next + @oruga-ui/theme-bulma + bulma@1; remove buefy + bulma-pro`
- `refactor(renderer): register Oruga + rewrite main.scss to Bulma 1.0 @use pattern`
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/08-vue3-core-merged/08-CONTEXT.md
@.planning/phases/08-vue3-core-merged/08-RESEARCH.md
@.planning/phases/08-vue3-core-merged/08-01-SUMMARY.md
@.planning/phases/08-vue3-core-merged/08-02-SUMMARY.md

@package.json
@src/renderer/main.js
@src/renderer/assets/style/main.scss

<interfaces>
<!-- Oruga + theme-bulma + Bulma 1.0 API contracts -->

Oruga 0.13 per-component registration (from @oruga-ui/oruga-next@0.13.4 — Pitfall 5):
```javascript
import { createOruga } from '@oruga-ui/oruga-next';
import {
  OButton, OModal, OInput, OField, OSelect,
  OSwitch, OTag, OCarousel, OCarouselItem, ONotification, ODropdown,
} from '@oruga-ui/oruga-next';

const oruga = createOruga();
[OButton, OModal, OInput, OField, OSelect, OSwitch, OTag,
 OCarousel, OCarouselItem, ONotification, ODropdown].forEach((c) => oruga.use(c));

// Then:
app.use(oruga, bulmaConfig);
// bulmaConfig is the default config object; we override iconComponent + iconPack below.
```

theme-bulma config (from @oruga-ui/theme-bulma@0.9.0):
```javascript
import { bulmaConfig } from '@oruga-ui/theme-bulma';
// bulmaConfig is an object exported from the package — Oruga consumes it via app.use().
// Override keys with spread: { ...bulmaConfig, iconComponent: 'vue-fontawesome', iconPack: 'fas' }
```

Bulma 1.0 @use pattern (from bulma@1.0.4):
```scss
// Before (Bulma 0.9):
$primary: #ec202a;  // global variable assignment
@import '~bulma';

// After (Bulma 1.0 + Dart Sass):
@use '@oruga-ui/theme-bulma/scss/theme-build' with (
  $primary: #ec202a,
  $custom-colors: ("twitter": #4099ff),
);
// @use REPLACES @import for bulma; you cannot mix the two systems in one file (Pitfall 10).
```

$oruga programmatic API (Assumption A2 — verify empirically):
```javascript
// Option B (Options API friendly — RESEARCH.md Pattern 9):
this.$oruga.notification.open({ message: '...', variant: 'dark' });

// If A2 fails (i.e. $oruga not injected), fall back to:
import { useProgrammatic } from '@oruga-ui/oruga-next';
const { oruga } = useProgrammatic();
oruga.notification.open({ ... });
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Dep swap — remove buefy + bulma-pro, add @oruga-ui + bulma@1 + theme-bulma</name>
  <read_first>
    - package.json (current: buefy@^0.9.29 line 51, bulma@^0.9.4 line 52, bulma-pro@^0.1.8 line 53)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Standard Stack §UI Framework (pinned versions)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Installation (full install command)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Note on bulma-pro (A6: no 1.0-compatible version exists)
  </read_first>
  <action>
    Edit `package.json` dependencies block:

    **Remove** (these three lines under `"dependencies"`):
    - `"buefy": "^0.9.29",`
    - `"bulma": "^0.9.4",`  ← will be re-added at 1.0.4 pin below
    - `"bulma-pro": "^0.1.8",`

    **Add** (insert alphabetically in `"dependencies"`):
    - `"@oruga-ui/oruga-next": "^0.13.4",`
    - `"@oruga-ui/theme-bulma": "^0.9.0",`
    - `"bulma": "^1.0.4",`  ← re-added at 1.0 line

    **Note on bulma peer-dep:** `@oruga-ui/theme-bulma@0.9.0` declares `bulma: 1.0.4` as a direct dependency. Pinning `bulma: ^1.0.4` in our own package.json is deliberate — matches the theme-bulma peer to prevent dedupe drift.

    **Do NOT** remove any FA packages or vue-fontawesome — those are Plan 05 scope. Do NOT remove any of the three dead Vue 2 plugins (vue-shortkey, v-click-outside, vue-markdown-plus) — Plan 06 scope.

    Run `npm install`. Expect zero ERESOLVE. If ERESOLVE surfaces:
    - Capture the exact error text
    - Most likely cause: `@oruga-ui/theme-bulma` peer-deps `@oruga-ui/oruga-next ^0.13.0` — our pin satisfies this
    - Second-most-likely: transitive bulma version conflict — if so, pin bulma to exact `1.0.4` (drop the `^`)
    - Do NOT use `--legacy-peer-deps` — that regression would fail LINT-03 preservation

    Sanity check Assumption A6 — `npm view bulma-pro version` to confirm the registry has not released a 1.0-compatible fork since research date. Record in the plan summary.
  </action>
  <verify>
    <automated>
      grep -c '"buefy"' package.json  # returns 0
      grep -c '"bulma-pro"' package.json  # returns 0
      grep -Pc '"bulma":\s*"\^1\.' package.json  # returns 1
      grep -Pc '"@oruga-ui/oruga-next":\s*"\^0\.13' package.json  # returns 1
      grep -Pc '"@oruga-ui/theme-bulma":\s*"\^0\.9' package.json  # returns 1
      npm ls buefy 2>&1 | grep -c "empty"  # returns 1 (no buefy in tree) — adjust to `npm ls buefy || true; npm ls @oruga-ui/oruga-next`
      npm ls @oruga-ui/oruga-next  # returns an entry at 0.13.x
      npm ls bulma  # returns 1.0.x
    </automated>
  </verify>
  <acceptance_criteria>
    - package.json shows the three removals and three additions
    - `npm install` exits 0 with no `--legacy-peer-deps`
    - `node_modules/@oruga-ui/oruga-next/package.json` reports `"version": "0.13.x"` (x≥4)
    - `node_modules/@oruga-ui/theme-bulma/package.json` reports `"version": "0.9.x"`
    - `node_modules/bulma/package.json` reports `"version": "1.0.x"` (x≥4)
    - `node_modules/buefy/` directory does NOT exist (`ls node_modules/buefy 2>&1 | grep -c "No such"` returns 1, or similar)
    - Sanity-check output for `npm view bulma-pro version` captured in plan summary; if a 1.0-compatible version was released since RESEARCH.md, note it but do not re-add (theme-bulma subsumes its role)
  </acceptance_criteria>
  <done>
    Deps swapped; Oruga + theme-bulma + Bulma 1 installed; Buefy + bulma-pro removed. Build WILL be broken until Task 2+3 land.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Register Oruga in main.js + drop bulma-pro + buefy CSS imports</name>
  <read_first>
    - src/renderer/main.js (current state post-Plan-01 — all Buefy + plugin registrations still present)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 1 (main.js after rewrite)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pitfall 5 (per-component registration)
  </read_first>
  <behavior>
    - Behavior 1: `import 'bulma-pro/bulma.sass';` line 1 removed — package no longer installed
    - Behavior 2: `import 'buefy/dist/buefy.css';` line 5 removed — package no longer installed
    - Behavior 3: `import Buefy from 'buefy';` line 8 removed
    - Behavior 4: `app.use(Buefy);` registration removed
    - Behavior 5: Oruga imports + `createOruga()` + per-component `oruga.use(...)` block inserted
    - Behavior 6: `app.use(oruga, { ...bulmaConfig, iconComponent: 'vue-fontawesome', iconPack: 'fas' });` registered
    - Behavior 7: The three dead Vue 2 plugins (`vue-shortkey` via `require`, `vClickOutside`, `VueMarkdownPlus`) remain registered for now — Plan 06 swaps them
    - Behavior 8: Font Awesome `app.component('font-awesome-icon', FontAwesomeIcon)` + FA library registrations STAY — Plan 05 bumps FA to v7
  </behavior>
  <action>
    Open `src/renderer/main.js`.

    Apply these edits in order (do not skip; do not combine):

    **Edit 1 — Remove three Buefy/bulma-pro lines (currently lines 1, 5, 8):**
    - Delete line 1: `import 'bulma-pro/bulma.sass';`
    - Delete line 5: `import 'buefy/dist/buefy.css';`
    - Delete line 8: `import Buefy from 'buefy';`

    **Edit 2 — Add Oruga imports** (insert after the existing `import VueLazyload from 'vue-lazyload';` line — which is around line 9 of the original, or whatever position it now occupies post-Edit-1):

    ```javascript
    import {
    	createOruga,
    	OButton,
    	OModal,
    	OInput,
    	OField,
    	OSelect,
    	OSwitch,
    	OTag,
    	OCarousel,
    	OCarouselItem,
    	ONotification,
    	ODropdown,
    } from '@oruga-ui/oruga-next';
    import { bulmaConfig } from '@oruga-ui/theme-bulma';
    ```

    **Rationale for the 11 registered components:** match the Buefy component types used across SFCs per the researcher's grep: `b-button, b-modal, b-input, b-field, b-select, b-switch, b-tag, b-carousel, b-carousel-item, b-message→notification, b-dropdown`. `ODropdown` is included for completeness though usage is light; verify actual usage during Plan 04 and trim if unused.

    **Do NOT** import `@oruga-ui/theme-bulma/style.css` — the SCSS `@use` pattern in main.scss (Task 3) supersedes the prebuilt CSS import. Double-loading would bloat the bundle.

    **Edit 3 — Replace `app.use(Buefy);` with Oruga registration:**

    Locate the `app.use(Buefy);` line (inserted by Plan 01 Task 2). Replace it with this block:

    ```javascript
    const oruga = createOruga();
    [
    	OButton,
    	OModal,
    	OInput,
    	OField,
    	OSelect,
    	OSwitch,
    	OTag,
    	OCarousel,
    	OCarouselItem,
    	ONotification,
    	ODropdown,
    ].forEach((c) => oruga.use(c));
    app.use(oruga, {
    	...bulmaConfig,
    	iconComponent: 'vue-fontawesome',
    	iconPack: 'fas',
    });
    ```

    **Verification note on A5 (Oruga iconpack config):** `iconPack: 'fas'` matches Buefy's existing Font Awesome Solid config. If Oruga 0.13 docs surface a different key name (e.g. `defaultIconPack` vs `iconPack`), empirically verify by launching `npm run pack:renderer` and then `npm run dev` at the end of Plan 04 — icons missing in UAT means the key is wrong. Capture the correct key in plan summary.

    **Preservation checklist** — DO NOT touch these existing lines:
    - `import 'buefy/dist/buefy.css';` already removed in Edit 1
    - `import './assets/style/animations.scss';` STAYS
    - `import './assets/style/main.scss';` STAYS (its contents change in Task 3)
    - `import VueLazyload from 'vue-lazyload';` + `app.use(VueLazyload);` STAY
    - `app.use(require('vue-shortkey'));` STAYS (Plan 06 swaps it)
    - `app.use(vClickOutside);` STAYS (Plan 06 removes it)
    - `app.use(VueMarkdownPlus);` STAYS (Plan 06 swaps it)
    - All FA imports + `library.add(...)` + `app.component('font-awesome-icon', ...)` STAY (Plan 05 bumps them)
    - IPC `change-view` handler block at bottom STAYS verbatim

    Result: `main.js` now has a valid Oruga registration; Buefy is gone; FA v2 + three dead plugins still register (to be cleaned in Plans 05+06).
  </action>
  <verify>
    <automated>
      grep -c "bulma-pro" src/renderer/main.js  # returns 0
      grep -c "buefy/dist/buefy.css" src/renderer/main.js  # returns 0
      grep -c "from 'buefy'" src/renderer/main.js  # returns 0
      grep -c "Vue.use(Buefy)" src/renderer/main.js  # returns 0
      grep -c "app.use(Buefy)" src/renderer/main.js  # returns 0
      grep -c "createOruga" src/renderer/main.js  # returns 1
      grep -c "@oruga-ui/oruga-next" src/renderer/main.js  # returns 1
      grep -c "@oruga-ui/theme-bulma" src/renderer/main.js  # returns 1
      grep -c "oruga.use(" src/renderer/main.js  # returns 1 (inside forEach)
      grep -c "app.use(oruga" src/renderer/main.js  # returns 1
      # Build WILL fail at this point because SFCs still reference b-* components and $buefy —
      # do NOT gate on pack:renderer here. Plan 04 restores the build.
    </automated>
  </verify>
  <acceptance_criteria>
    - All 10 grep checks return their expected counts
    - `main.js` still contains: `VueLazyload`, `vue-shortkey`, `vClickOutside`, `VueMarkdownPlus`, FA imports, `library.add`, IPC handler
    - `npm run pack:renderer` may fail (expected — SFCs still reference Buefy components)
    - This is the broken-by-design intermediate commit; Plan 04 restores buildability
  </acceptance_criteria>
  <done>
    main.js registers Oruga per-component; Buefy registration fully removed; build intentionally broken pending Plan 04 SFC migrations.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Rewrite main.scss to Bulma 1.0 @use pattern</name>
  <read_first>
    - src/renderer/assets/style/main.scss (full file — 240 lines)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pattern 10 (Bulma 1.0 SCSS rewrite)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pitfall 10 (Cannot mix @import and @use)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Open Question 4 (Material Design Icons CDN drop)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Assumption A4 (theme-bulma SCSS entry path — VERIFY)
  </read_first>
  <behavior>
    - Behavior 1: Remove `@import '~bulma/sass/utilities/_all';` (line 68)
    - Behavior 2: Remove `@import '~bulma';` (line 120)
    - Behavior 3: Remove `@import '~buefy/src/scss/buefy';` (line 121)
    - Behavior 4: Remove three CDN `@import` URLs (lines 152, 153, 154)
    - Behavior 5: Remove two dead sibling-margin `material-icons` CSS rules (lines 28-34)
    - Behavior 6: Remove `$colors: (...)` map (lines 71-112) — superseded by theme-bulma `$custom-colors`
    - Behavior 7: Remove `findColorInvert` calls — Bulma 1.0 handles color inversion automatically
    - Behavior 8: Replace with `@use` directive at top that pulls in theme-bulma + bulma 1.0 with custom `$primary` + `$custom-colors`
    - Behavior 9: Preserve all custom non-Bulma styles (scrollbar, modal-close, vue-simple-context-menu, `.shadow`, `.text`, `:focus`, `a:hover`, `h2/p/li/ul` rules)
    - Behavior 10: `$primary`, `$twitter` variable references inside the preserved custom styles must still resolve
  </behavior>
  <action>
    **A4 empirical verification FIRST:** before editing, confirm the theme-bulma SCSS entry path by listing the installed package's scss/ directory:

    ```bash
    ls node_modules/@oruga-ui/theme-bulma/scss/
    ```

    Expected output includes a file like `theme-build.scss` OR `index.scss` OR similar. Record the correct entry filename in the plan summary. If `theme-build.scss` is the filename, use `@use '@oruga-ui/theme-bulma/scss/theme-build'` in the rewrite. If the actual filename differs (e.g. `index.scss`), use `@use '@oruga-ui/theme-bulma/scss/index'` instead.

    Open `src/renderer/assets/style/main.scss`. Replace the ENTIRE file contents with the following template, adjusted for the verified theme-bulma entry path. This is a complete rewrite — preserving preserved custom styles verbatim:

    ```scss
    // Bulma 1.0 + Oruga theme-bulma @use entry (Phase 8 Plan 03).
    // Bulma 1.0 REQUIRES @use; @import for third-party SCSS is retired.
    //
    // $custom-colors makes the "twitter" variant available as class "is-twitter"
    // plus Oruga prop variant="twitter"; theme-bulma computes the invert automatically.
    @use '@oruga-ui/theme-bulma/scss/theme-build' with (
    	$primary: #ec202a,
    	$custom-colors: (
    		'twitter': #4099ff,
    	)
    );

    // Re-expose $primary as a local Sass variable for the custom rules below.
    // (theme-bulma's @use scope does not auto-expose $primary at the root unless re-asserted.)
    $primary: #ec202a;
    $twitter: #4099ff;

    html {
    	overflow: hidden;
    	overflow-y: hidden !important;
    }

    body {
    	-webkit-user-select: none;
    	-moz-user-select: -moz-none;
    	-ms-user-select: none;
    	user-select: none;
    	color: white;
    }

    img {
    	box-shadow: none;
    }

    .section {
    	padding: 1.5em;
    }

    .has-pointer {
    	cursor: pointer;
    }

    .no-padding {
    	padding: 0 !important;
    }

    .file-name {
    	padding-top: 0.25em;
    }

    /* custom Scroll bars */
    ::-webkit-scrollbar {
    	width: 10px !important;
    	height: 10px !important;
    }

    ::-webkit-scrollbar-track {
    	background: #f0f0f0;
    }

    ::-webkit-scrollbar-thumb {
    	background: $primary;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
    	-webkit-appearance: none;
    	margin: 0;
    }

    input,
    select,
    textarea {
    	color: black !important;
    }

    ::-webkit-scrollbar {
    	width: 8px !important;
    	height: 8px !important;
    }

    ::-webkit-scrollbar-track {
    	background-color: rgba(0, 0, 0, 0.5) !important;
    }

    ::-webkit-scrollbar-thumb:horizontal {
    	background-color: $primary;
    	border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb {
    	background-color: $primary;
    	border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb:horizontal:hover {
    	background-color: darken($primary, 10%);
    }

    .shadow {
    	box-shadow: 0 1rem 1rem rgba(0, 0, 0, 0.175) !important;
    }

    .modal-close {
    	top: 40px !important;
    }

    .modal.is-full-screen > .animation-content,
    .modal.is-full-screen > .animation-content > .modal-card {
    	background: rgb(37, 37, 37);
    	background: linear-gradient(
    		0deg,
    		rgba(37, 37, 37, 1) 0%,
    		rgba(61, 61, 61, 1) 100%
    	);
    }

    :focus {
    	outline: -webkit-focus-ring-color auto 0px;
    }

    $white: #fff;
    $grey: darken($white, 15%);
    $black: #333;

    .vue-simple-context-menu {
    	top: 0;
    	left: 0;
    	margin: 0;
    	padding: 0;
    	display: none;
    	list-style: none;
    	position: absolute;
    	z-index: 1000000;
    	background-color: $black;
    	border-bottom-width: 0px;
    	box-shadow: 0 3px 6px 0 rgba($black, 0.2);
    	border-radius: 5px;
    	&--active {
    		display: block;
    	}
    	&__item {
    		display: flex;
    		color: $grey;
    		cursor: pointer;
    		font-size: 0.75rem;
    		padding: 5px 15px;
    		align-items: center;
    		&:hover {
    			background-color: $primary;
    			color: $white;
    		}
    	}
    	li {
    		&:first-of-type {
    			border-top-left-radius: 5px;
    			border-top-right-radius: 5px;
    		}
    		&:last-of-type {
    			border-bottom-left-radius: 5px;
    			border-bottom-right-radius: 5px;
    		}
    	}
    }

    a:hover {
    	color: darken($primary, 20%);
    }

    h2 {
    	display: block;
    	font-size: 1rem;
    	font-weight: 700;
    }

    p,
    li {
    	font-size: 0.8rem;
    	color: #aaaaaa;
    }

    ul {
    	list-style-type: square;
    	margin-left: 1.5rem;
    }

    .text {
    	color: white;
    }
    ```

    **Changes from original main.scss:**
    - **Dropped:** `@import '~bulma/sass/utilities/_all';` (line 68 of original)
    - **Dropped:** `@import '~bulma';` (line 120)
    - **Dropped:** `@import '~buefy/src/scss/buefy';` (line 121)
    - **Dropped:** all three CDN `@import` URLs (lines 152-154) — Material Icons CDN (A7: no usage); FA v5 CDN (D-08-13); Material Design Icons CDN (A7: only two sibling-margin selectors, both dropped below)
    - **Dropped:** two sibling-margin rules `span + .material-icons { margin-left: 0.25em; }` and `.material-icons + span { margin-left: 0.25em; }` (lines 28-34)
    - **Dropped:** the `$colors: (...)` map (lines 71-112) — theme-bulma's `$custom-colors` parameter subsumes it
    - **Dropped:** `findColorInvert($primary)` and `findColorInvert($twitter)` calls — Bulma 1.0 automates inversion
    - **Dropped:** `$link`, `$link-invert`, `$link-focus-border` variables — superseded by theme-bulma defaults (if link color regresses visually, Plan 04 UAT catches; re-add to `with()` block there)
    - **Dropped:** the old line `a:hover { color: darken($red,20%); }` → changed to `darken($primary, 20%)` (the `$red` reference was from Bulma 0.9's exported palette which is no longer in scope post-@use)
    - **Added:** single `@use '@oruga-ui/theme-bulma/scss/theme-build' with (...)` directive at top (adjust filename per A4 verification)
    - **Added:** local re-declarations of `$primary: #ec202a;` and `$twitter: #4099ff;` after `@use` so custom rules resolve them

    **IMPORTANT — Sass scope gotcha:** Dart Sass `@use` is NAMESPACED by default. The `$primary: #ec202a;` local re-declaration is intentional so the existing custom selectors (scrollbar, h2, a:hover etc.) continue to compile. Without this, they'd error on "Undefined variable $primary."

    **Do NOT** touch `animations.scss` (Plan 02's scope, already done).

    **Do NOT** add `@use 'sass:color'` imports unless a `color.adjust()` call replaces the `darken()` builtin — Dart Sass 1.26 still supports `darken()` as a global legacy function; keep it for now.
  </action>
  <verify>
    <automated>
      grep -c "@import '~bulma" src/renderer/assets/style/main.scss  # returns 0
      grep -c "@import '~buefy" src/renderer/assets/style/main.scss  # returns 0
      grep -c "use.fontawesome.com" src/renderer/assets/style/main.scss  # returns 0
      grep -c "materialdesignicons" src/renderer/assets/style/main.scss  # returns 0
      grep -c "fonts.googleapis.com" src/renderer/assets/style/main.scss  # returns 0
      grep -c "material-icons" src/renderer/assets/style/main.scss  # returns 0
      grep -c "findColorInvert" src/renderer/assets/style/main.scss  # returns 0
      grep -c '^\$colors:' src/renderer/assets/style/main.scss  # returns 0
      grep -c "@use '@oruga-ui/theme-bulma" src/renderer/assets/style/main.scss  # returns 1
      grep -c '\$primary: #ec202a' src/renderer/assets/style/main.scss  # returns 2 (one in @use with(), one local re-declaration)
      # Note: pack:renderer may still fail due to SFC-level Buefy tags — do NOT gate on it here.
      # Instead: verify the SCSS entry file resolves via a small test-compile:
      npx sass --load-path=node_modules src/renderer/assets/style/main.scss /tmp/test-main-scss.css 2>&1 | head -30
      # Expected: no "Undefined variable", no "Can't find stylesheet"
    </automated>
  </verify>
  <acceptance_criteria>
    - All 10 grep checks return expected counts
    - `npx sass` test-compile of main.scss succeeds (compiles to CSS with zero errors) — this isolates SCSS validation from the webpack pipeline since pack:renderer is expected to fail on SFCs still referencing b-* components
    - If `npx sass` errors with "Undefined variable $primary" or similar, the local `$primary: #ec202a;` re-declaration was missed — fix and re-verify
    - If `npx sass` errors with "Can't find stylesheet to import", the theme-bulma path is wrong — re-run the A4 verification `ls node_modules/@oruga-ui/theme-bulma/scss/` and correct the `@use` path
    - `main.scss` preserves all the custom non-Bulma rules (count of `::-webkit-scrollbar` selectors = 4, `.vue-simple-context-menu` block intact, `.modal-close`, `:focus`, `h2/p/li/ul` rules all present)
    - Build (`pack:renderer`) NOT expected to succeed until Plan 04 lands — do NOT gate on it
  </acceptance_criteria>
  <done>
    main.scss uses Bulma 1.0 @use pattern with theme-bulma entry; all legacy @import directives + CDN imports + dead material-icons rules removed; SCSS compiles clean in isolation.
  </done>
</task>

<task type="auto">
  <name>Task 4: Commit the two-commit bisect pair (deps + registration/SCSS)</name>
  <read_first>
    - .planning/phases/08-vue3-core-merged/08-CONTEXT.md §D-08-18 (bisect shape)
  </read_first>
  <action>
    Per D-08-18 and the researcher's refinement, commit as two commits so `git bisect` between HEAD and the dep-bump commit isolates Oruga/Bulma regressions from the SCSS rewrite:

    Commit 1 (deps only):

    ```bash
    git add package.json package-lock.json
    git commit -m "chore(deps): add @oruga-ui/oruga-next + @oruga-ui/theme-bulma + bulma@1; remove buefy + bulma-pro"
    ```

    Commit 2 (main.js + main.scss — registration + SCSS rewrite):

    ```bash
    git add src/renderer/main.js src/renderer/assets/style/main.scss
    git commit -m "refactor(renderer): register Oruga per-component + rewrite main.scss to Bulma 1.0 @use pattern"
    ```

    Bisect expectation: if a regression surfaces in Plan 04 that's caused by a Bulma 1.0 SCSS difference, `git bisect` will land on commit 2 (the SCSS rewrite). If caused by Oruga 0.13 API, it'll land on Plan 04's SFC commits. Clean separation.

    Do NOT use `--no-verify`. Do NOT add Co-Authored-By. If pre-commit hooks touch files, re-stage and re-commit.
  </action>
  <verify>
    <automated>
      git log --oneline -n 2 | head -1 | grep -c "register Oruga"  # returns 1
      git log --oneline -n 2 | tail -1 | grep -c "chore(deps): add @oruga-ui"  # returns 1
      git diff HEAD~2 HEAD --stat | grep -cE "package.json|main.js|main.scss"  # returns 3
    </automated>
  </verify>
  <acceptance_criteria>
    - Two commits on master in order: `chore(deps)` then `refactor(renderer)`
    - package.json + package-lock.json in commit 1 only
    - main.js + main.scss in commit 2 only
    - No Co-Authored-By
  </acceptance_criteria>
  <done>
    Commits 4+5 partial (SCSS part) of the 9-commit chain landed. Plan 04 can now freely edit SFCs with Oruga registered and Bulma 1 SCSS compiling.
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → local node_modules | Three new packages (@oruga-ui/oruga-next, @oruga-ui/theme-bulma, bulma@1) resolved transitively |
| Build-time SCSS pipeline → runtime CSS | theme-bulma + custom overrides compile at pack time |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-03-01 | Tampering | Oruga + theme-bulma supply chain | mitigate | @oruga-ui is a known-maintained GitHub org (oruga-ui); version pins verified against live npm 2026-04-22. `npm audit` runs on install; HIGH/CRITICAL findings block the commit until triaged. |
| T-08-03-02 | Denial of Service | Bulma 1.0 @use migration breaks the build | mitigate | Task 3 verify block runs `npx sass` in isolation (bypassing webpack) to confirm SCSS compiles. Task also re-runs the `ls node_modules/@oruga-ui/theme-bulma/scss/` check to empirically verify the entry path (Assumption A4). Fallback: if `theme-build.scss` doesn't exist, task instructs to use whatever filename exists. |
| T-08-03-03 | Denial of Service | Dart Sass version < 1.23 lacks @use support | accept | RESEARCH.md Environment Availability confirms `sass@^1.26.3` is already installed; `@use` has been supported since 1.23.0. No additional install needed. |
| T-08-03-04 | Tampering | CSS custom-variant styling regresses (Bulma 1.0 custom-colors API vs Bulma 0.9 $colors map) | accept | `is-twitter` variant is used sparingly in the codebase (verify during Plan 04). If visual regression on twitter-variant elements, add explicit `$custom-colors` entry or restore a bespoke class rule. Detection: Plan 04 UAT gate. |

Block threshold: none.

</threat_model>

<verification>

After all four tasks complete:

1. `npm install` → zero ERESOLVE, zero `--legacy-peer-deps`
2. `npm ls buefy` → not present
3. `npm ls bulma-pro` → not present
4. `npm ls @oruga-ui/oruga-next` → 0.13.x present
5. `npm ls bulma` → 1.0.x present
6. `grep -c "buefy" src/renderer/main.js` → 0
7. `grep -c "createOruga" src/renderer/main.js` → 1
8. `grep -c "@import '~bulma" src/renderer/assets/style/main.scss` → 0
9. `grep -c "@use '@oruga-ui/theme-bulma" src/renderer/assets/style/main.scss` → 1
10. `npx sass` test-compile of main.scss → 0 errors
11. Two commits landed per D-08-18 shape
12. **`npm run pack:renderer` NOT gated** — will fail because SFCs reference b-* tags; Plan 04 restores build

</verification>

<success_criteria>

Plan 03 complete when:
- [ ] package.json: buefy + bulma-pro gone; @oruga-ui/oruga-next + @oruga-ui/theme-bulma + bulma@^1 present
- [ ] `npm install` clean
- [ ] main.js registers Oruga via `createOruga()` + `oruga.use(...)` per-component + `app.use(oruga, bulmaConfig)`
- [ ] main.js has zero `buefy` / `bulma-pro` / `Vue.use(Buefy)` / `app.use(Buefy)` references
- [ ] main.scss uses `@use '@oruga-ui/theme-bulma/scss/theme-build' with (...)` (or the correct filename per A4 verification)
- [ ] main.scss has zero `@import '~bulma`, zero `@import '~buefy`, zero CDN `@import` URLs, zero `findColorInvert`
- [ ] `npx sass` test-compile of main.scss succeeds
- [ ] Two commits landed
- [ ] Plan summary at `.planning/phases/08-vue3-core-merged/08-03-SUMMARY.md` documenting:
  - Verified theme-bulma SCSS entry filename (A4 resolution)
  - `npm view bulma-pro version` output (A6 resolution)
  - Pinned versions of the three new packages from `npm ls`
  - Any ERESOLVE encountered and how resolved

</success_criteria>

<output>
After completion, create `.planning/phases/08-vue3-core-merged/08-03-SUMMARY.md` with:
- Verified theme-bulma SCSS entry path (was `theme-build.scss` or something else?)
- `npm view bulma-pro version` output
- `npm ls @oruga-ui/oruga-next @oruga-ui/theme-bulma bulma` output
- Any peer-dep warnings during install
- Two commit SHAs
- Note: pack:renderer expected to fail — Plan 04 restores buildability
</output>
