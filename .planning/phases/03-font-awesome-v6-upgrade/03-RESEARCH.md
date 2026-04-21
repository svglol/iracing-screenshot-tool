# Phase 3: Font Awesome v5 → v6 Upgrade - Research

**Researched:** 2026-04-21
**Domain:** Font Awesome SVG-with-JS stack on Vue 2.7 (Electron renderer)
**Confidence:** HIGH

## Summary

Font Awesome v5 → v6 on Vue 2.7 is a low-risk, mechanical upgrade. The SVG-with-JS API is essentially unchanged: `library.add()`, `Vue.component('font-awesome-icon', ...)`, and the `:icon="['fas', 'name']"` array syntax all continue to work in v6. The paired `vue-fontawesome` 0.1.x → 2.x jump is **functionally a no-op** — the official 2.x CHANGELOG explicitly states *"There is no difference between 0.1.10 and 2.0.0"*; the major bump was strategic branding for the Vue 2 track. Real work is limited to:

1. Version bumps in `package.json` with **explicit Vue 2 pinning** of `vue-fontawesome` (critical: npm `latest` dist-tag now points at v3 for Vue 3)
2. Five icon rename imports + template strings (already mapped in CONTEXT.md D-02)
3. Manual UAT across 4 views and a bundle-size delta check

**Primary recommendation:** Pin `@fortawesome/vue-fontawesome` to `^2.0.10` (or use the `latest-2` dist-tag), pin FA packages to `^6.7.2`, apply the 5 rename map from CONTEXT.md, prune the 3 potentially-unused icons after a thorough grep, and rely on manual UAT — no additional tooling needed. **`fas` and `fab` prefix strings continue to work in v6**; no template-prefix migration needed beyond the 5 icon renames.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Adopt v6 icon names directly across imports AND template `:icon="['fas', '...']"` call sites. No `/shims` compat package.
- **D-02:** Use the 11-icon rename map captured in CONTEXT.md (5 renamed, 6 unchanged). Rename map is authoritative; do not re-derive.
- **D-03:** Keep `free-solid` + `free-brands` only. Do NOT add `@fortawesome/free-regular-svg-icons`.
- **D-04:** Two atomic commits: (1) `chore(deps): bump Font Awesome core + icons to v6, vue-fontawesome to 2.x` — package.json + main.js imports + library.add; (2) `refactor(icons): migrate template usage sites to FA v6 names` — the 3 template files.
- **D-05:** Manual UAT across 4 views: `Home.vue`, `Settings.vue`, `TitleBar.vue`, `PromoCard.vue`. Every `<font-awesome-icon>` glyph confirmed visually.
- **D-06:** Bundle-size check via `npm run pack:renderer`. Acceptance: ≤10% increase vs baseline.
- **D-07:** Audit `faUserCog`, `faInfoCircle`, `faCamera` during the upgrade; prune if thorough grep confirms no dynamic usage.

### Claude's Discretion

- Exact plan-to-commit mapping (one plan producing both commits, or two plans).
- Whether to include a lint pass in commit 2 or a separate commit.
- Whether to add a lightweight pre-merge smoke test (would need user sign-off before adding tooling).

### Deferred Ideas (OUT OF SCOPE)

- FA v7 + `vue-fontawesome` 3.x — requires Vue 3 (v2.0 milestone).
- Playwright/visual-regression tooling — out of proportion to Phase 3.
- `@fortawesome/free-regular-svg-icons` — no current design pattern uses outlined icons.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Font Awesome upgraded from v5.13 / core 1.2 to v6.x across `fontawesome-svg-core`, `free-brands-svg-icons`, `free-solid-svg-icons`, PLUS `vue-fontawesome` 0.1.x → 2.x (required pairing). All existing icon usage continues to render; no visual regressions. | Version targets verified on npm registry (Standard Stack). Zero API breakage confirmed for SVG-with-JS (Architecture Patterns, Breaking Changes). Rename map complete (CONTEXT.md D-02). Validation procedure mapped to all 4 success criteria (Validation Architecture). |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Icon registration | Renderer bootstrap (`src/renderer/main.js`) | — | Single global registration point; `Vue.component('font-awesome-icon', …)` is the only integration surface. No component-level FA imports exist in the codebase. |
| Icon rendering | Vue components (templates) | — | `<font-awesome-icon :icon="[...]" />` in 9 call sites across 4 files. Pure presentational; no runtime logic. |
| Icon bundling | Webpack (`_scripts/webpack.renderer.config.js`) | — | Tree-shaking of individual icon imports is what keeps bundle size bounded. v6 improves this further. |
| Verification | Manual UAT (user) | — | Per D-05, no automated visual-regression tooling in scope. |

## Standard Stack

### Core — exact versions to pin

| Library | Target Version | Purpose | Source |
|---------|----------------|---------|--------|
| `@fortawesome/fontawesome-svg-core` | `^6.7.2` | Core runtime, `library` object | [VERIFIED: npm view, 2026-04-21] — latest 6.x published 2024-11-19 |
| `@fortawesome/free-solid-svg-icons` | `^6.7.2` | Solid-style icon data | [VERIFIED: npm view, 2026-04-21] — latest 6.x |
| `@fortawesome/free-brands-svg-icons` | `^6.7.2` | Brand icon data (Discord) | [VERIFIED: npm view, 2026-04-21] — latest 6.x |
| `@fortawesome/vue-fontawesome` | `^2.0.10` | Vue 2 wrapper component | [VERIFIED: npm view, 2026-04-21] — latest-2 dist-tag = 2.0.10, published 2023-01-24 |

**Install command (exact syntax to avoid v7/v3 pulls):**

```bash
npm install \
  @fortawesome/fontawesome-svg-core@^6.7.2 \
  @fortawesome/free-solid-svg-icons@^6.7.2 \
  @fortawesome/free-brands-svg-icons@^6.7.2 \
  @fortawesome/vue-fontawesome@^2.0.10
```

**Version pinning rationale:**

- **Use caret (`^`) ranges, not exact pins.** FA v6 is a closed/frozen major — latest 6.x (`6.7.2`) shipped 2024-11-19 with v7 branched off. The 6.x line will only receive security backports now; caret pinning is safe and future-proof against rare security patches while locking minor/major boundaries.
- **`vue-fontawesome@^2.0.10` is critical.** `npm view @fortawesome/vue-fontawesome dist-tags` shows `latest: 3.2.0` (Vue 3) and `latest-2: 2.0.10` (Vue 2). A bare `npm install @fortawesome/vue-fontawesome` would pull v3 and silently break Vue 2. The `^2` prefix pins the range; 2.0.10 is the final 2.x release (no 2.1 ever shipped).
- **Peer-dep constraint (verified):** `vue-fontawesome@2.0.10` declares `peerDependencies: { vue: "~2", "@fortawesome/fontawesome-svg-core": "~1 || ~6" }` — explicitly supports both FA core 1.x AND 6.x on Vue 2. This is why the paired upgrade works. [VERIFIED: npm view @fortawesome/vue-fontawesome@2.0.10 peerDependencies]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `^6.7.2` caret | Exact `6.7.2` pin | More deterministic but requires manual updates for any backported security fix. Caret is fine since 6.x is frozen. |
| `@latest-2` dist-tag in install | Use dist-tag at install time | Works but makes `package.json` less readable. Prefer `^2.0.10` range for clarity. |
| Add `@fortawesome/fontawesome-free-shims` | Map v5 names in a shim layer | Locked out by D-01. Would carry tech debt into the eventual v7/Vue3 migration. |

## Architecture Patterns

### Target `src/renderer/main.js` imports (exact diff shape)

**Before (current, v5):**

```javascript
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faUserCog,
  faInfoCircle,
  faCog,
  faExternalLinkAlt,
  faFolder,
  faTrash,
  faCamera,
  faCopy,
  faQuestionCircle,
  faArrowDown
} from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

library.add(
  faUserCog,
  faInfoCircle,
  faCog,
  faExternalLinkAlt,
  faFolder,
  faTrash,
  faCamera,
  faCopy,
  faQuestionCircle,
  faArrowDown,
  faDiscord
);

Vue.component('font-awesome-icon', FontAwesomeIcon);
```

**After (v6, with D-07 prune of the 3 potentially-unused icons — PENDING GREP CONFIRMATION):**

```javascript
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faGear,                  // was faCog
  faUpRightFromSquare,     // was faExternalLinkAlt
  faFolder,
  faTrash,
  faCopy,
  faCircleQuestion,        // was faQuestionCircle
  faArrowDown
} from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

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

Vue.component('font-awesome-icon', FontAwesomeIcon);
```

**After (v6, keep-all variant — if D-07 grep finds dynamic references):**

```javascript
import {
  faUserGear,              // was faUserCog
  faCircleInfo,            // was faInfoCircle
  faGear,                  // was faCog
  faUpRightFromSquare,     // was faExternalLinkAlt
  faFolder,
  faTrash,
  faCamera,
  faCopy,
  faCircleQuestion,        // was faQuestionCircle
  faArrowDown
} from '@fortawesome/free-solid-svg-icons';
```

**Key observations:**

- Zero structural change. `library.add()` signature, `FontAwesomeIcon` named export, and `Vue.component(...)` registration are identical across 0.1.x and 2.x. [VERIFIED: vue-fontawesome 2.x CHANGELOG states "There is no difference between 0.1.10 and 2.0.0"]
- Package specifier paths (`@fortawesome/free-solid-svg-icons`, `@fortawesome/free-brands-svg-icons`, `@fortawesome/fontawesome-svg-core`, `@fortawesome/vue-fontawesome`) are unchanged in v6. [VERIFIED: npm view 2026-04-21]
- Only the **named icon exports** change (5 of 11 — see CONTEXT.md D-02).

### Template syntax (what changes and what doesn't)

**No breaking changes to prop shape.** `:icon="['fas', 'name']"` array syntax continues to work in FA v6 — the docs explicitly confirm both shorthand (`fas`/`fab`) and long-form (`fa-solid`/`fa-brands`) are interchangeable. [CITED: docs.fontawesome.com/web/use-with/vue/add-icons — "both `['fas', 'icon-name']` and string format `'fa-solid fa-icon-name'` are equally valid"]

**Only 5 icon strings change** in templates (per CONTEXT.md D-02):

| File | Line | Before | After |
|------|------|--------|-------|
| `src/renderer/components/Settings.vue` | 8 | `['fas', 'cog']` | `['fas', 'gear']` |
| `src/renderer/components/Settings.vue` | 15 | `['fas', 'question-circle']` | `['fas', 'circle-question']` |
| `src/renderer/components/PromoCard.vue` | 21 | `['fas', 'external-link-alt']` | `['fas', 'up-right-from-square']` |
| `src/renderer/views/Home.vue` | 54 | `['fas', 'external-link-alt']` | `['fas', 'up-right-from-square']` |

(`Home.vue` also has `trash` / `folder` / `copy` call sites and `TitleBar.vue` has `arrow-down` — none of those names changed. `Settings.vue` line 19 uses the `discord` brand which also did not change.)

### Anti-Patterns to Avoid

- **DO NOT** run `npm install @fortawesome/vue-fontawesome` without the version range — npm's `latest` dist-tag is Vue 3 (v3.2.0). This would silently install an incompatible version and Vue 2.7 would throw runtime errors on first render.
- **DO NOT** mix v5 and v6 packages. All four `@fortawesome/*` packages must upgrade together in a single commit. The packages share internal type/data structures; a mismatch will produce unknown-icon renders or runtime errors.
- **DO NOT** switch template prefix strings from `'fas'` to `'fa-solid'` unnecessarily. Both work; changing them adds diff noise without benefit and contradicts the "minimal change" surface in D-04.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon name migration | Custom v5→v6 string map in runtime code | The 5-icon direct rename per D-02 | Shims add runtime overhead and tech debt for 5 one-line changes. |
| Vue 2 compatibility bridge | Custom wrapper around `FontAwesomeIcon` | `vue-fontawesome@^2.0.10` natively supports Vue 2.7 (CI-tested since v2.0.10) | Official support exists; wrappers add bugs. |
| Bundle-size verification | Write a custom stats comparator | Read `stats.json` output from `webpack --mode=production` OR just compare file sizes of `dist/renderer/*.js` before/after | Webpack already emits per-chunk sizes; no tooling needed. |

## Runtime State Inventory

Phase 3 is a dependency upgrade + code edit. There is **no runtime/persisted state** that embeds Font Awesome icon names:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `electron-store` user config (`config.js`) stores screenshot folder path, filename format template, first-time flag. No icon names stored. | None |
| Live service config | None — no external services reference icon names. | None |
| OS-registered state | None — the renderer-side icon changes do not affect Windows shortcut, auto-updater, or installer metadata. | None |
| Secrets/env vars | None — no env vars reference FA. | None |
| Build artifacts | `dist/` renderer output embeds icon SVG paths inline. Will be regenerated on the next `npm run pack:renderer`. | Rebuild (automatic on first run after upgrade) |

**Nothing found in category:** Verified by grep of `src/**`, `_scripts/**`, and `package.json` for icon string names (`cog`, `question-circle`, `external-link-alt`, `user-cog`, `info-circle`) — all occurrences are in the files already catalogued in CONTEXT.md §Integration Points.

## Common Pitfalls

### Pitfall 1: npm installing Vue 3 version by accident
**What goes wrong:** `npm install @fortawesome/vue-fontawesome` (without version) pulls `3.2.0`, which uses Vue 3's Composition API registration (`app.component(...)`) and breaks on Vue 2.7 with runtime errors like `TypeError: app.component is not a function`.
**Why it happens:** Post-v2.0.10 (Jan 2023), FortAwesome moved the `latest` npm dist-tag to the v3 line to prepare for Vue 3 dominance. [VERIFIED: `npm view @fortawesome/vue-fontawesome dist-tags` → `latest: 3.2.0, latest-2: 2.0.10`]
**How to avoid:** Always pin with `^2.0.10` in `package.json`, never call bare `npm install @fortawesome/vue-fontawesome`.
**Warning signs:** `npm install` output shows `@fortawesome/vue-fontawesome@3.x.x` added; or runtime error immediately on app boot referencing `app.component` or `h` import. Verify by running `npm ls @fortawesome/vue-fontawesome` after install.

### Pitfall 2: Forgetting the paired upgrade
**What goes wrong:** Bumping `fontawesome-svg-core` to 6.x while leaving `vue-fontawesome` at `0.1.9` (or vice versa).
**Why it happens:** `vue-fontawesome@0.1.9` declares `peerDependencies: { @fortawesome/fontawesome-svg-core: ~1 }` — it does NOT accept `~6`. [INFERRED from the 2.x-added constraint `~1 || ~6`]. Only 2.0.4+ relaxed the constraint to include 6.x.
**How to avoid:** Bump all four packages in one commit (D-04 commit 1).
**Warning signs:** npm emits `EPEERINVALID` or `npm warn ERESOLVE` warnings at install; or runtime errors about mismatched internal types.

### Pitfall 3: Template-only regression after commit 1 (bisect hazard)
**What goes wrong:** After D-04 commit 1 is in but commit 2 is not yet applied, the 5 renamed-icon call sites render as missing/blank icons (because `library.add()` now contains only v6 names, but templates still reference v5 names like `cog`).
**Why it happens:** vue-fontawesome's `FontAwesomeIcon` component looks up the icon by name in the library; unregistered names render nothing (or a fallback icon depending on config).
**How to avoid:** Treat commit 1 → commit 2 as atomic in the merge (even though they're split commits for bisect). Either merge both or neither; don't deploy commit 1 alone. This is consistent with D-04's rationale.
**Warning signs:** Settings gear icon, help icon, external-link icons render blank after commit 1.

### Pitfall 4: Electron renderer + webpack ESM/CJS interop
**What goes wrong:** `@fortawesome/free-solid-svg-icons@6.x` ships with both `main: "index.js"` (CJS) and `module: "index.mjs"` (ESM). Webpack 5 should pick the right one automatically, but older Babel setups can trip on the named-export re-export pattern.
**Why it happens:** The project uses `babel-runtime` 6.x (current) and `@babel/preset-env` 7.9. This combo is old but has been tested against tree-shakeable ESM packages (the 5.x version of these packages worked).
**How to avoid:** No proactive change needed — the shape of the package didn't change v5 → v6. But test during UAT: if build fails, inspect the webpack error; most commonly resolved by ensuring no custom `resolve.mainFields` override excludes `module`.
**Warning signs:** `webpack` emits `Can't resolve '@fortawesome/free-solid-svg-icons/…'` or runtime `undefined is not a function` on `library.add(...)`. Confidence: LOW — no specific issue reports found for FA v6 on webpack 5 + babel-runtime 6; listed as a risk not a known bug.

### Pitfall 5: Phantom "free-regular" requirement
**What goes wrong:** After upgrade, a template references an icon that only exists as a regular-style (outlined) glyph in FA's data. Import from `free-solid` succeeds but renders a solid variant the user didn't want.
**Why it happens:** Non-issue for this project — CONTEXT.md D-03 locks us to solid+brands only, and none of the 11 icons are regular-only. Listed for completeness only.
**How to avoid:** Enforce D-03. If a future icon need arises, revisit.

### Pitfall 6: Bundle-size regression (unlikely but possible)
**What goes wrong:** Renderer bundle grows >10% after upgrade.
**Why it happens:** Each individual icon's SVG path data changed in v6 (new drawings). The SVG-with-JS runtime (`fontawesome-svg-core`) also added features like duotone/sharp support hooks that may slightly inflate the core bundle.
**How to avoid:** Not likely a problem because (a) tree-shaking still works — unused icons stay out; (b) the per-icon SVG path data is similar in size to v5. Community reports on 5→6 migrations generally note *decreased* bundle sizes due to improved tree-shaking.
**Warning signs:** `pack:renderer` output shows renderer chunk size increased significantly vs pre-upgrade baseline.
**Mitigation:** D-06 tolerance is ≤10%. If exceeded, the D-07 prune of 3 unused icons (`faUserCog` / `faInfoCircle` / `faCamera`) will shave bytes and likely bring it back under tolerance.

## Code Examples

### Target main.js upgrade (commit 1 diff)

```javascript
// Source: Adapted from official vue-fontawesome 2.x docs + current main.js
// CITED: github.com/FortAwesome/vue-fontawesome/tree/2.x (README, CHANGELOG)

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faGear,
  faUpRightFromSquare,
  faFolder,
  faTrash,
  faCopy,
  faCircleQuestion,
  faArrowDown
} from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// ...other imports unchanged...

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

Vue.component('font-awesome-icon', FontAwesomeIcon);
```

### Template call-site updates (commit 2 — three diffs)

```vue
<!-- src/renderer/components/Settings.vue:8 -->
<a @click="showSettings = true"><font-awesome-icon :icon="['fas', 'gear']" /></a>

<!-- src/renderer/components/Settings.vue:15 -->
<font-awesome-icon :icon="['fas', 'circle-question']" />

<!-- src/renderer/components/PromoCard.vue:21 -->
<font-awesome-icon :icon="['fas', 'up-right-from-square']" />

<!-- src/renderer/views/Home.vue:54 -->
<a @click="openExternally" v-show="false"><font-awesome-icon :icon="['fas', 'up-right-from-square']" /></a>
```

All other `<font-awesome-icon>` call sites (trash, folder, copy, arrow-down, discord, and the 3 grep-suppressed Buefy `icon-left="camera"` / `icon-left="expand-arrows-alt"` sites which are MDI not FA) remain unchanged.

### D-07 pruning grep — commands to run during planning

```bash
# 1. Confirm no dynamic/computed usage of the 3 suspect icons in .vue files
grep -rE "user-cog|info-circle|faUserCog|faInfoCircle|faCamera" src/renderer/ 2>&1
# Only expected hits: src/renderer/main.js (the import + library.add — i.e., what we're pruning)
# Any hit in .vue template attributes = DO NOT PRUNE that icon.

# 2. Also grep for computed icon patterns that could construct names dynamically
grep -rE ":icon=\"\[?'fas'" src/renderer/ | grep -vE "trash|folder|copy|arrow-down|external-link-alt|cog|question-circle|camera|user-cog|info-circle|gear|up-right-from-square|circle-question|circle-info|user-gear"
# Should return empty. Any hit = a dynamic icon name that grep-by-string missed.

# 3. Check Buefy's icon-left attribute for accidental FA prefixes
grep -rE "icon-left=" src/renderer/
# Expected: Buefy defaults to MDI, so icon-left values are MDI names, not FA names.
# Any `icon-pack="fa"` attribute would mean we're using FA through Buefy — flag for planner.
```

If all three greps come back clean, prune `faUserCog`, `faInfoCircle`, `faCamera` from main.js (reduces library by 3 icons; modest bundle-size win; reduces ongoing maintenance surface).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@fortawesome/vue-fontawesome@0.1.x` pinned to FA core `~1` | `@fortawesome/vue-fontawesome@^2.0.10` accepts FA core `~1 || ~6` | vue-fontawesome 2.0.4 (2021-10-15) | Unlocks v6 core upgrade without Vue 3 migration — exactly the Phase 3 opportunity. |
| `faCog`, `faUserCog`, etc. (v5 naming: style-as-adjective) | `faGear`, `faUserGear`, etc. (v6 naming: noun-first) | FA v6.0.0 (2022) | Template + import diffs; no runtime impact beyond the rename. |
| npm `@fortawesome/vue-fontawesome@latest` = Vue 2 version | npm `@fortawesome/vue-fontawesome@latest` = Vue 3 version; Vue 2 requires `@latest-2` | ~2023-01-24 (v2.0.10 release note) | Requires explicit version pinning; bare install is a footgun. |

**Deprecated/outdated:**

- `@fortawesome/fontawesome-free-shims` — the v5→v6 compat shim package. Intentionally not used per D-01. Still exists on npm for projects that can't do the rename, but creates forward tech debt.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Current webpack 5.105 + babel-runtime 6.x + `@babel/preset-env` 7.9 will resolve FA v6's dual ESM/CJS entry points without config changes. | Pitfall 4 | Build fails during `npm run pack:renderer`. Recovery: add `resolve.mainFields: ['module', 'main']` to `_scripts/webpack.renderer.config.js`. Low-medium risk. |
| A2 | The 3 suspect icons (`faUserCog`, `faInfoCircle`, `faCamera`) are safe to prune after the grep commands above. | D-07 / Code Examples | If a computed icon name like `:icon="['fas', dynamicName]"` exists and was missed, the blank render will be caught by manual UAT (D-05). Low risk because the visual-UAT step is the safety net. |
| A3 | Bundle-size change from v5 → v6 will be within the ≤10% D-06 tolerance. | Pitfall 6 | If exceeded, prune per A2 mitigates. No separate contingency needed. Low risk — community evidence points to decreases, not increases. |

## Open Questions

1. **Is `electron-builder`'s `asar` / `files` packaging impacted?**
   - What we know: `package.json` `build.files` includes `node_modules/**/*`, so new FA packages ship with the app automatically.
   - What's unclear: Whether an FA v6 cached/bundled asset under `node_modules/@fortawesome/fontawesome-svg-core/webfonts/` would unexpectedly bloat the electron-builder output (separate from the webpack renderer bundle — D-06 only measures renderer).
   - Recommendation: Defer — `electron-builder` bundle size is a secondary concern; renderer-bundle is what users see at cold start. If D-06 passes and the built installer still fits reasonable expectations (< ~10MB increase from baseline), this is a non-issue.

2. **Does Buefy's bundled Bulma stylesheet reference any FA v5 class names?**
   - What we know: Buefy defaults to MDI iconPack, not FA. CONTEXT.md confirms `icon-left="camera"` / etc. in templates are MDI.
   - What's unclear: Whether Buefy's internal SCSS has any `fa-*` selectors (e.g., for fallback rendering).
   - Recommendation: Non-blocking — SVG-with-JS doesn't use CSS classes, so even if Buefy has stale `fa-*` selectors, they wouldn't affect our `<font-awesome-icon>` components. Skip unless UAT surfaces an actual visual bug.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm registry access | `npm install` for FA packages | ✓ (assumed, matches prior phase workflow) | — | None needed |
| `npm run dev` (electron + webpack-dev-server) | UAT iteration | ✓ (verified working in Phase 2) | — | None needed |
| `npm run pack:renderer` (webpack production build) | Bundle-size measurement (D-06) | ✓ (verified working in Phase 2) | webpack 5.105.4 | None needed |
| `electron-builder` | Full installer build (optional, not in D-06 scope) | ✓ | 26.8.1 | Skip — D-06 only requires renderer pack, not installer |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 (main repo) — but no renderer-component tests currently exist |
| Config file | `package.json` `"jest"` block + top-level defaults |
| Quick run command | `npm test` (respects `--passWithNoTests`) |
| Full suite command | `npm run jest:coverage` |
| Visual verification | Manual UAT per D-05 — no automated visual regression |

Per D-05/D-06 decisions, Phase 3 validation is **primarily manual** (visual UAT + bundle-size diff). Automated Jest tests are not expected to cover icon rendering.

### Phase Requirements → Test Map

Mapping each ROADMAP.md success criterion to concrete verification:

| Success Criterion (from ROADMAP.md) | Verification Type | Command / Procedure | Pass Condition |
|-------------------------------------|-------------------|---------------------|----------------|
| **SC1**: All 11 icons registered in `src/renderer/main.js` continue to render correctly; visual parity vs v1.2 | Manual UAT | `npm run dev`, open app, walk through 4 views: Home, Settings, TitleBar, PromoCard. For each `<font-awesome-icon>` call site (9 total), confirm glyph visible and matches v1.2 shape. Settings also requires opening the Help modal (F1) and config dialog. Checklist: **Home**: trash, folder, copy, up-right-from-square. **Settings**: gear, circle-question, discord (brand). **TitleBar**: arrow-down (visible when update-ready). **PromoCard**: up-right-from-square. | All 9 glyphs render correctly; none blank; discord brand icon recognizable. |
| **SC2**: `<font-awesome-icon>` registration migrates to FA 6 / vue-fontawesome 2.x API without runtime warnings | Manual — devtools console | During SC1 UAT, open Electron devtools (`Ctrl+Shift+I`). Filter console for `fontawesome`, `vue-fontawesome`, `Warn`, `Error`. | Zero warnings or errors mentioning Font Awesome, peer deps, or unknown icons. |
| **SC3**: App runs in `npm run dev` and production `electron-builder` install without FA-originated console errors | Dev + prod build | Dev: as SC2. Prod: `npm run build` produces a working installer; run installer locally; open installed app; repeat console check. | Dev console clean. Prod app launches; console clean; basic screenshot capture works (smoke test). |
| **SC4**: Bundle size does not regress meaningfully (≤10% increase; ideally decrease) | Automated command | Before upgrade: `npm run pack:renderer`; record size of `dist/renderer/*.js` output files (sum or largest chunk). After upgrade: repeat; diff. | `(after - before) / before ≤ 0.10` (i.e., ≤10% growth). Log values in commit 2 message or planning notes. |

### Sampling Rate

- **Per task commit:** n/a — no automated test suite for renderer. Rely on commit discipline (D-04 two-commit shape).
- **Per wave / phase gate:** Run the full Manual UAT + Bundle Size measurement before declaring Phase 3 complete. Record bundle delta in commit message or STATE.md.

### Wave 0 Gaps

- [ ] None — no new test infrastructure is required. D-05/D-06 accept manual + bundle-measurement approach.
- [ ] Document pre-upgrade bundle baseline **before** commit 1 lands. Add to plan as a pre-flight task: "Measure renderer bundle size on current HEAD, record in planning notes, THEN bump deps."

*(Existing test infrastructure — Jest 30 — remains operational. Bot tests (`/bot/**`) are unaffected; they're excluded from main jest config's `testPathIgnorePatterns`.)*

## Security Domain

Font Awesome is a presentational icon library; no authentication, session, access control, or cryptographic concerns arise from the upgrade. No user-supplied data flows through icon rendering.

Applicable ASVS categories: **none** for this phase specifically. Standard renderer-process hardening (Electron context isolation, nodeIntegration, CSP) is unchanged by this upgrade and is already a pre-existing baseline for the project — not in scope here.

**Supply-chain note (VERIFIED: npm view):** Both target versions (`vue-fontawesome@2.0.10` and FA packages at `6.7.2`) are official `@fortawesome/*` scoped packages published by Fort Awesome Inc. No known CVEs on these specific versions as of 2026-04-21.

## Sources

### Primary (HIGH confidence)

- [VERIFIED: npm registry, 2026-04-21] — `npm view @fortawesome/fontawesome-svg-core versions` → latest 6.x = 6.7.2
- [VERIFIED: npm registry, 2026-04-21] — `npm view @fortawesome/vue-fontawesome dist-tags` → `latest-2: 2.0.10`
- [VERIFIED: npm registry, 2026-04-21] — `npm view @fortawesome/vue-fontawesome@2.0.10 peerDependencies` → `{ vue: "~2", "@fortawesome/fontawesome-svg-core": "~1 || ~6" }`
- [CITED: github.com/FortAwesome/vue-fontawesome/blob/2.x/CHANGELOG.md] — "There is no difference between 0.1.10 and 2.0.0"; v2.0.10 adds Vue 2.7.x CI coverage; npm `latest` moved to Vue 3 at v2.0.10
- [CITED: docs.fontawesome.com/web/use-with/vue/add-icons] — both `['fas', 'name']` array and `'fa-solid fa-name'` string prop syntax valid in v6

### Secondary (MEDIUM confidence)

- [CITED: blog.fontawesome.com/upgrade-font-awesome-to-version-6/] — "No Breakage Club" backward-compat commitment for v6 (applies mostly to webfont users; SVG-with-JS confirmed above)
- [CITED: docs-v6.fontawesome.com/web/setup/upgrade] — v5→v6 general upgrade steps (does not address SVG-with-JS API specifics explicitly; cross-referenced with vue-fontawesome CHANGELOG)

### Tertiary (LOW confidence)

- [ASSUMED] — webpack 5.105 + babel-runtime 6 will resolve FA v6 ESM/CJS dual-entry without config changes (A1 in Assumptions Log). Evidence is absence: no specific breakage reports found. Validate at build time.
- [ASSUMED] — bundle size will be within D-06 tolerance. Evidence is community consensus (5→6 migrations generally shrink bundles); not directly measured for this project.

## Metadata

**Confidence breakdown:**

- Standard stack (versions, peer deps): **HIGH** — all verified via `npm view` 2026-04-21
- API changes (library.add, prop shapes, prefix strings): **HIGH** — confirmed via both vue-fontawesome 2.x CHANGELOG and FA v6 docs
- Icon rename map: **HIGH** (authoritative in CONTEXT.md D-02; not re-derived)
- Template call-site inventory: **HIGH** (authoritative in CONTEXT.md §Integration Points; not re-derived)
- Webpack/babel interop: **MEDIUM-LOW** — no specific reports for this exact stack; listed as A1
- Bundle-size prediction: **MEDIUM** — based on community patterns; measured at D-06 time

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stable major lines, low drift risk)
