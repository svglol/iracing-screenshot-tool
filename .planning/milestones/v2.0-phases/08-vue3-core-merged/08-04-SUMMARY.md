---
phase: 08-vue3-core-merged
plan: 04
subsystem: renderer-sfc-migration
tags: [oruga, buefy-migration, sfc, vue3, uat, bulma]
requires: [08-03]
provides:
  - "All 8 renderer SFCs migrated from Buefy <b-*> to Oruga <o-*>"
  - "v-model:active replaces .sync modifier for modal two-way binding"
  - "$oruga.notification.open() replaces $buefy.notification.open() (Options API injection confirmed)"
  - "Oruga carousel indicator slot uses singular #indicator with props.index (A3 verified vs Oruga 0.13 types)"
  - "pack:renderer exits 0 — first successful renderer build since Plan 03"
  - "sass-loader.sassOptions.loadPaths pointing at node_modules so @oruga-ui/theme-bulma/dist/scss/ resolves through webpack"
affects:
  - "src/renderer/components/SideBar.vue"
  - "src/renderer/components/TitleBar.vue"
  - "src/renderer/components/HelpModal.vue"
  - "src/renderer/components/ChangelogModal.vue"
  - "src/renderer/components/PromoCard.vue"
  - "src/renderer/components/Settings.vue"
  - "src/renderer/components/SettingsModal.vue"
  - "src/renderer/views/Home.vue"
  - "_scripts/webpack.renderer.config.js"
requirements: [UI-02, VUE3-01]
tech_stack:
  added: []
  removed: []
  patterns:
    - "v-model:active replaces :active.sync for Oruga modals (Vue 3 Pattern 3)"
    - "this.$oruga.notification.open({variant: 'X'}) replaces this.$buefy.notification.open({type: 'is-X'}) (Pattern 9 + Pitfall 7/8)"
    - "<o-notification> replaces <b-message> (Pitfall 6 — Oruga renamed message→notification)"
    - "Oruga carousel per-item indicator override uses #indicator singular slot with props.index (A3)"
    - "sass-loader.sassOptions.loadPaths: [node_modules] for package-qualified @use resolution under webpack"
key_files:
  created: []
  modified:
    - "src/renderer/components/SideBar.vue"
    - "src/renderer/components/Settings.vue"
    - "src/renderer/components/SettingsModal.vue"
    - "src/renderer/views/Home.vue"
    - "_scripts/webpack.renderer.config.js"
decisions:
  - "A2 empirically verified: $oruga IS injected on globalProperties (grep of node_modules/@oruga-ui/oruga-next/dist/index.js line 141 shows s.config.globalProperties.$oruga = t plus the Wa=Symbol('$oruga') provide on line 141). No useProgrammatic() fallback required for the three notification call sites in SideBar.vue (×2) + Home.vue (×1). Options API this.$oruga.notification.open({...}) works cleanly."
  - "A3 empirically verified: Oruga 0.13 carousel exposes BOTH 'indicators' (plural — overrides entire indicator bar with {activeIndex, switchTo} props) and 'indicator' (singular — fires once per indicator item with {index} prop). The v1.4 Buefy code used slot='indicators' with slot-scope='props' where props.i was the per-item index — that's semantically the SINGULAR slot in Oruga. Migrated from #indicators to #indicator with props.index (renamed from props.i)."
  - "[Rule 3 - Blocking] Added sassOptions.loadPaths: [node_modules] to _scripts/webpack.renderer.config.js because webpack's sass-loader v16 (modern Sass API) does NOT traverse @oruga-ui/theme-bulma's package.json exports map for bare package-qualified @use targets without a pkg-importer registration. Plan 03's SCSS worked via npx sass --load-path=node_modules but pack:renderer was never exercised then (build was expected-broken). Fix bundled into commit 6 alongside Home/Settings/SettingsModal as Task 3 explicitly allowed main.js-level bundling for A2 fallbacks — same principle applied to the webpack config fix."
  - "TitleBar.vue, HelpModal.vue, ChangelogModal.vue, PromoCard.vue contained zero <b-*> tags (confirmed via pre-scan); no edits required. The parent-level b-modal wrapping was entirely in Settings.vue and migrated there."
  - "ChangelogModal.vue's <vue-markdown-plus :source='changelog' /> custom tag LEFT UNCHANGED per plan scope note; Plan 06 swaps it to vue3-markdown-it."
  - "v-lazy, v-shortkey, v-click-outside directives LEFT UNCHANGED; Plan 06 handles their Vue 3 peer-dep compat."
metrics:
  duration_minutes: 8
  tasks_completed: 4
  tasks_total: 4
  files_touched: 5
  completed_date: 2026-04-22
---

# Phase 8 Plan 04: Buefy → Oruga SFC Migration Summary

One-liner: Migrated every Buefy `<b-*>` component across all 8 renderer SFCs to their Oruga `<o-*>` equivalents, retired 3 `.sync` modifiers into `v-model:arg`, swapped 3 `this.$buefy.notification.open()` calls to `this.$oruga.notification.open()` with variant remapping, and unblocked webpack's sass-loader so `pack:renderer` exits 0 — the first successful renderer build since Plan 03 intentionally broke buildability.

## Per-SFC Migration Summary

| File                                         | Buefy instance count BEFORE | Oruga instance count AFTER | Notes |
| -------------------------------------------- | --------------------------- | -------------------------- | ----- |
| `src/renderer/components/SideBar.vue`        | 22 (3 field + 1 select + 2 input + 5 message + 1 switch + 1 button + 2 $buefy.notification) | 12 <o-* tags + 2 $oruga.notification | 5 `<b-message>` → `<o-notification>` per Pitfall 6; `type="is-X"` → `variant="X"`; `size="is-small"` → `size="small"`; `type:'is-dark/danger/success'` in $buefy calls → `variant:'dark/danger/success'`. Two `<b-message>` iterations through `v-if/v-for`. |
| `src/renderer/components/TitleBar.vue`       | 0                           | 0                          | No Buefy content — FA icons + manual HTML button elements only. No edits. |
| `src/renderer/components/HelpModal.vue`      | 0                           | 0                          | Plain template (modal-card scaffolding, no Buefy components). No edits. |
| `src/renderer/components/ChangelogModal.vue` | 0                           | 0                          | Uses `<vue-markdown-plus>` (custom registered tag) — left for Plan 06. No Buefy. No edits. |
| `src/renderer/components/PromoCard.vue`      | 0                           | 0                          | Scoped CSS-only + FA icon. No edits. |
| `src/renderer/components/Settings.vue`       | 3 modals with `.sync`       | 3 `<o-modal v-model:active>` | Mechanical tag rename + `.sync` → `v-model:active`. All other attrs preserved (`has-modal-card`, `full-screen`, `trap-focus`, `:can-cancel`, `:destroy-on-hide`, `aria-role`, `aria-modal`). |
| `src/renderer/components/SettingsModal.vue`  | 14 (10 field + 4 input + 1 select + 4 switch + 4 button + 1 tag) | 24 <o-* instances (open+close counted) | Largest file; `type="is-primary/is-info"` → `variant="primary/info"`. `@click.native` on `<b-tag>` preserved as `@click.native` (Vue 3 no longer requires `.native` but a later lint-pass will strip if needed — out of Plan 04 scope). |
| `src/renderer/views/Home.vue`                | 5 (1 tag + 1 carousel + 1 carousel-item + 1 $buefy.notification + 1 indicators slot rewrite) | 6 <o-* instances + 1 $oruga.notification | `<b-carousel>` → `<o-carousel>`; `<b-carousel-item>` → `<o-carousel-item>`; `#indicators="props"` → `#indicator="props"` (A3 — Oruga singular slot matches Buefy's per-item iteration semantics) with `props.i` → `props.index`. $buefy.notification `type:'is-dark'` → $oruga.notification `variant:'dark'`. |

**Total Buefy instance count BEFORE:** 44 (matches the plan's ~47 estimate — close-tag pairs counted once above).
**Total Oruga instance count AFTER:** 0 Buefy remaining across renderer SFCs + programmatic API; verified via four grep gates all returning 0 across `src/renderer/`.

## A2 Empirical Verification — `$oruga` Injection

Plan asked us to empirically verify whether `this.$oruga.notification.open({...})` works in Options API (Oruga 0.13 injection) or requires the `useProgrammatic()` composable fallback.

Result: **PASS — `$oruga` IS injected as `app.config.globalProperties.$oruga`.**

Evidence (from `node_modules/@oruga-ui/oruga-next/dist/index.js`):
```
104: const Wa = /* @__PURE__ */ Symbol("$oruga");
141:     s.provide(Wa, t), s.config.globalProperties.$oruga = t;
```

This is the install-time hook in `createOruga()` / `app.use(oruga, ...)`: both the Symbol-keyed `provide()` AND the global `$oruga` property are set. Options-API access via `this.$oruga.notification.open(...)` works without any fallback.

**No `useProgrammatic()` imports added.** The three notification call sites (SideBar.vue:176, SideBar.vue:192, Home.vue:323) all use `this.$oruga.notification.open({...})` directly.

## A3 Empirical Verification — Oruga Carousel Indicator Slot

Plan asked us to verify whether `<o-carousel>` exposes an `indicators` slot matching Buefy's old per-item `slot="indicators"` semantics.

Result: **Oruga 0.13 exposes TWO slots: `indicators` (plural) and `indicator` (singular).**

Evidence (from `node_modules/@oruga-ui/oruga-next/dist/types/components/carousel/Carousel.vue.d.ts` lines 84-98):
```typescript
/**
 * Override the indicators
 * @param activeIndex {number} - active item index
 * @param switchTo {(idx?: number): void} - switch to item function
 */
indicators?(props: {
    activeIndex: number;
    switchTo: (idx?: number) => void;
}): void;
/**
 * Override the indicator elements
 * @param index {number} - indicator index
 */
indicator?(props: {
    index: number;
}): void;
```

Runtime confirmation (`dist/index.js` lines 2978-2980):
```
j(Q.$slots, "indicator", {
  index: Re.index
}, () => [ ... ])
```

The v1.4 Buefy code used `slot="indicators"` with `slot-scope="props"` where `props.i` was the per-item index — this matches the SINGULAR Oruga slot semantics (one render per indicator item with `{index}`), NOT the plural slot (one render of the whole indicator bar with `{activeIndex, switchTo}`).

**Migration:** `<template #indicators="props">` → `<template #indicator="props">`; `props.i` → `props.index` (3 references on lines 114, 115, 122 of Home.vue).

## pack:renderer + npm test Results

```
$ npm run pack:renderer
...
renderer (webpack 5.106.2) compiled with 13 warnings in 19144 ms
# exit code: 0
```

**Bundle sizes:**
- `dist/renderer.js`: 2,321,249 bytes (≈2.32 MB)
- `dist/renderer.css`: 918,207 bytes (≈918 KB)

No prior Plan 02 baseline size for direct comparison (Plan 02 ran Plan 03's code with pack:renderer NOT gated — Plan 04 is the first successful build under the full Oruga+Bulma 1.0 stack). This becomes the new baseline for Plans 05-06.

**13 pre-existing deprecation warnings** (NOT from Plan 04's SFC edits):
- `bulma@1.0.4` `mixins.scss` uses `if()` function, deprecated by Sass 1.99 in favor of modern CSS `if(condition: then; else: else)` — 7 repetitive warnings from the package (Plan 06 candidate: bump `bulma` or suppress via `silenceDeprecations`)
- `vue-simple-context-menu` imports `Vue` as default export from `'vue'` — doesn't exist in Vue 3's ESM API (Plan 06 swaps this plugin)
- Others from `bulma`'s component SCSS using legacy color functions

All warnings are package-level and accepted per CONTEXT.md A2-style reasoning; REQ success criterion #6 is scoped to Vue 3 migration warnings specifically, not third-party dep deprecations.

```
$ npm test
Tests: 256 passed, 256 total
```

256/256 (D-08-19 band holds).

## Commits

| Hash      | Message                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `4d46469` | refactor(renderer): migrate small SFCs Buefy → Oruga (SideBar, TitleBar, HelpModal, ChangelogModal, PromoCard) |
| `7a8a25d` | refactor(renderer): migrate large SFCs Buefy → Oruga (Home, Settings, SettingsModal) + oruga programmatic API |

These are commits 5+6 of the D-08-18 9-commit chain (Plan 04's assigned slot — per the plan's Task 3 "commit the two-commit SFC bisect pair" spec).

**Bisect shape:**
- `git bisect` between `4d46469^` and `4d46469` isolates regressions in the 5 small SFCs (SideBar is the only content diff; the other 4 files were untouched).
- `git bisect` between `4d46469` and `7a8a25d` isolates regressions in the 3 large SFCs + webpack sass-loader change.

Files per commit:
- `4d46469`: `src/renderer/components/SideBar.vue` only (other 4 small SFCs had zero Buefy tags — no edits).
- `7a8a25d`: `src/renderer/components/Settings.vue`, `src/renderer/components/SettingsModal.vue`, `src/renderer/views/Home.vue`, `_scripts/webpack.renderer.config.js`.

Neither commit touches `bot/**` or any pre-existing dirty file (verified via `git diff --stat` on each commit).

No Co-Authored-By lines (verified via `git log --format="%B" -n 2 | grep -c "Co-Authored"` returns 0).

## UAT Checkpoint — Auto-Approved

Task 4 was a `checkpoint:human-verify` 4-view UAT gate.

**This plan runs under --auto mode.** The auto-mode instructions specified: auto-approve `human-verify` once the build and automated checks pass. Verification of the auto-approval preconditions:

| Precondition | Status |
| ------------ | ------ |
| `pack:renderer` exits 0 | PASS |
| `npm test` 256/256 | PASS |
| Zero `<b-*>` tags across `src/renderer/` | PASS |
| Zero `$buefy.*` across `src/renderer/` | PASS |
| Zero `.sync` modifiers across `src/renderer/` | PASS |
| Zero `type="is-"` / `size="is-"` prefixes | PASS |
| Oruga components registered in main.js match the tags used in templates | PASS (manually cross-referenced main.js's per-component import list against grep of `<o-*` across SFCs — all 11 registered OButton/OModal/OInput/OField/OSelect/OSwitch/OTag/OCarousel/OCarouselItem/ONotification/ODropdown resolve the templates) |
| A2 ($oruga injected) verified empirically | PASS |
| A3 (carousel indicator slot) verified empirically | PASS |

**⚡ Auto-approved UAT checkpoint.** Runtime visual verification (4 views rendered with correct styling, dark theme primary red `#ec202a`, modal interactions, console clean) is deferred to the final Plan 06 UAT gate which re-covers this surface after FA v7, vue-fontawesome v3, and the Plan 06 dead-plugin swaps land. Plan 04's automated gates are the strongest pre-runtime signal available.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added sass-loader.sassOptions.loadPaths = [node_modules] to webpack config**
- **Found during:** Task 2 — first `npm run pack:renderer` invocation after SFC migration.
- **Issue:** Build failed with `Can't find stylesheet to import` for `@use '@oruga-ui/theme-bulma/dist/scss/theme-build'`. Plan 03 tested SCSS via `npx sass --load-path=node_modules` which DOES walk node_modules for bare package-qualified paths. Webpack's sass-loader v16 (modern Sass API) does NOT by default — it relies on either `~package/...` syntax (css-loader resolver) or explicit `sassOptions.loadPaths`. Plan 03's `pack:renderer NOT gated` deferral meant this was never exercised then. Surfaces now in Plan 04 because the SFC migration restores buildability at the template level.
- **Fix:** Added `sassOptions: { loadPaths: [path.join(__dirname, '../node_modules')] }` to the `sass-loader` options block in `_scripts/webpack.renderer.config.js`. This mirrors Plan 03's CLI `--load-path=node_modules` flag so webpack resolves the @use target the same way.
- **Files modified:** `_scripts/webpack.renderer.config.js`
- **Commit:** `7a8a25d` (bundled into the large-SFC commit per Task 3's guidance that `main.js`-level fixes can land in commit 6 alongside the SFC changes — same principle applied to the webpack config).
- **Verification impact:** None — fix is additive to the sass-loader options block; no existing behavior altered. The CLI `npx sass` path still works exactly as Plan 03 tested it.

### Scope handling (not deviations — scope boundary enforcement)

Pre-existing uncommitted edits in `bot/src/**` from before this plan started were explicitly NOT staged (confirmed via `git status --short | grep -E '^[AM]'` after each `git add`). `bot/docs/community-guide.md` (untracked) also left alone.

Pre-commit hook (lint + prettier) reformatted the staged files in both commits (method-order changes inside each SFC's `<script>` block, prop-order changes on some Oruga tags, `v-on:click` → `@click` shorthand, `:elementId` → `:element-id` kebab-case). These are cosmetic-only changes the hook applied — the commit captured that reformatted content without semantic change. All the plan's grep acceptance criteria still pass against the reformatted content.

## TDD Gate Compliance

N/A — Plan 04 is `type: execute` per frontmatter (no `tdd="true"` on any task). No RED/GREEN/REFACTOR gates required.

## Known Stubs

None. Plan 04 only mechanically renames tags and preserves all existing behavior; no placeholder data paths introduced. The three third-party plugins (`vue-shortkey`, `v-click-outside`, `vue-simple-context-menu`) are still registered in `main.js` and their usages in SFCs are unchanged — Plan 06 handles them per scope.

## Threat Flags

None beyond those captured in Plan 04's own threat model:
- T-08-04-01 (Tampering — unregistered Oruga component): MITIGATED. All `<o-*>` tags used across SFCs (OButton, OModal, OInput, OField, OSelect, OSwitch, OTag, OCarousel, OCarouselItem, ONotification) are registered in `main.js`'s `oruga.use(...)` list. No `Failed to resolve component: o-*` warnings possible — webpack would have failed the build at template compile otherwise.
- T-08-04-02 (DoS — `$oruga` not injected): MITIGATED via A2 empirical verification. `$oruga` IS globally injected; the 3 notification call sites work as written. No fallback required.
- T-08-04-03 (Tampering — styling regression vs Bulma 0.9): ACCEPTED. Auto-approved UAT defers runtime visual comparison to Plan 06's final gate.
- T-08-04-04 (OModal deprecation warning): ACCEPTED (CONTEXT.md A2); tolerable in runtime console.

## Success Criteria

| Criterion                                                                                 | Status |
| ----------------------------------------------------------------------------------------- | ------ |
| All 8 SFCs have zero Buefy `<b-*>` tags                                                   | PASS (grep count = 0 across src/renderer/) |
| All programmatic `$buefy` calls swapped to `$oruga` OR `useProgrammatic()` per A2 outcome | PASS (grep `\$buefy` = 0; 3 `$oruga.notification.open(...)` calls; A2 = YES, no fallback) |
| Zero `.sync` modifiers across `src/renderer/`                                             | PASS (grep `:[a-z]+\.sync=` = 0) |
| Zero `type="is-"` / `size="is-"` prop prefixes                                            | PASS (grep = 0) |
| `npm run pack:renderer` exits 0                                                           | PASS |
| `npm test` → 256/256                                                                      | PASS |
| Lint count ≤ 1881                                                                         | PASS (734 problems, well under 1881 ceiling) |
| UAT checkpoint approved                                                                   | PASS (auto-approved under --auto mode per preconditions table) |
| Two commits: small SFCs + large SFCs                                                      | PASS (`4d46469` + `7a8a25d`) |
| A2 outcome documented in plan summary                                                     | PASS (YES; no fallback applied) |
| A3 outcome documented                                                                     | PASS (used `indicator` singular slot; `props.i` → `props.index`) |
| Plan summary at `.planning/phases/08-vue3-core-merged/08-04-SUMMARY.md`                   | PASS (this file) |

## Self-Check: PASSED

- `src/renderer/components/SideBar.vue` — FOUND, modified (12 `<o-*>` tags, 2 `$oruga.notification.open(...)`, zero Buefy references, pre-commit hook reformatting preserved)
- `src/renderer/components/Settings.vue` — FOUND, modified (3 `<o-modal v-model:active>`, 9 occurrences of `o-modal` or `v-model:active`)
- `src/renderer/components/SettingsModal.vue` — FOUND, modified (14 `<o-*>` tags + `@click.native` preserved)
- `src/renderer/views/Home.vue` — FOUND, modified (`<o-tag>`, `<o-carousel>`, `<o-carousel-item>`, `#indicator` slot with `props.index`, `$oruga.notification.open(...)`)
- `_scripts/webpack.renderer.config.js` — FOUND, modified (sassOptions.loadPaths added)
- Commit `4d46469` — FOUND on master via `git log --oneline -6`
- Commit `7a8a25d` — FOUND on master via `git log --oneline -6`
- No `bot/**` files in the commit range (verified via `git diff 4d46469~1 7a8a25d --stat` — only the 5 in-scope files touched)
- Zero file deletions in the commit range (verified via `git diff --diff-filter=D --name-only 4d46469~1 7a8a25d` returned empty)

## Notes for Plan 05

- **Oruga now active and exercised.** Plan 05 (FA v6 → v7 + vue-fontawesome 2.x → 3.x + CDN cleanup) can assume a working Vue 3 + Oruga + Bulma 1.0 render stack. FA icons used in SFCs (trash, folder, copy, up-right-from-square, camera, gear, circle-question, arrow-down, expand-arrows-alt, Discord brand) are the Plan 05 migration surface.
- **`@fortawesome/vue-fontawesome@2.0.10` peer dep still blocking `--legacy-peer-deps` retirement** — Plan 03's deviation 1 carries forward to Plan 05's close. Plan 05 retires FA v2 for FA v3.x which removes the vue@~2 peer conflict; `--legacy-peer-deps` usage ends at Plan 05 completion.
- **Oruga's `iconPack: 'fas'` config surface** (from Plan 03 main.js) is unexercised by Plan 04 because `o-button icon-left="camera"` on SideBar.vue doesn't render any icon until FA is correctly wired in Plan 05. This is a latent Plan 05 smoke-test target: first FA+Oruga icon test will validate whether Oruga's config key name is `iconPack` (as set) or needs to be `defaultIconPack` etc. (RESEARCH A5 verification).
- **`expand-arrows-alt` icon on SettingsModal.vue line 223** — this is FA v5/v6 naming; FA v7 may have renamed it. Plan 05's three-grep audit (D-07 pattern) covers this.
- **13 pack:renderer warnings** — most are package-level deprecations (Bulma 1.0 `if()`, vue-simple-context-menu's Vue 2 default import). Plan 05 can reasonably leave them; Plan 06 may be able to address if bumping `bulma` or swapping `vue-simple-context-menu` lands there.
- **pre-commit hook activity** — The hook lints + prettier-formats staged files. This can produce commit diffs larger than the semantic change (method reordering, attribute kebab-case normalization, etc.). Plan 05+ should expect the same; it's not a deviation.
- **`@click.native` on `<o-tag>` in SettingsModal.vue** — Vue 3 eliminated `.native`; modifiers-on-components pass through to root element automatically in many cases. If Plan 06 or the final UAT surfaces a non-functional click on these tags, strip `.native` in that plan. Out of Plan 04 scope — mechanical migration only, semantics preserved as-is.
- **Bundle size baseline for Plans 05-06:** `dist/renderer.js` = 2.32 MB, `dist/renderer.css` = 918 KB. The ±10% gate tracked across plans starts here.
