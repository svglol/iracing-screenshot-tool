# Phase 8 (MERGED): Vue 3 + Router 4 + Oruga + Bulma 1 + FA v7 — Research

**Researched:** 2026-04-22
**Domain:** Vue 3 migration (core + router + loader + devtools), UI framework swap (Buefy → Oruga + Bulma 0.9 → 1.0), Font Awesome v6 → v7 + vue-fontawesome 2 → 3
**Confidence:** HIGH on versions and core migration APIs; MEDIUM on Oruga 0.13 per-component registration UX impact; MEDIUM on FA v7 icon coverage for this codebase's 8 icons (verified via v7 rename table — none affected, but table excerpt may be incomplete).

## Summary

All nine dependency bumps in this merged phase have current, Vue-3-native landing versions verified against the npm registry on 2026-04-22:

- `vue@3.5.33`, `vue-router@5.0.6` (major-4 line — npm shows 5.0.6 as the latest published version; needs confirmation that the "vue-router@4.x" target actually means `^5.0.6` OR that we pin a 4.x line — see Pitfall 1), `vue-loader@17.4.2`, `@vue/devtools@8.1.1`, `@oruga-ui/oruga-next@0.13.4`, `@oruga-ui/theme-bulma@0.9.0`, `bulma@1.0.4`, `@fortawesome/{fontawesome-svg-core,free-solid-svg-icons,free-brands-svg-icons}@7.2.0`, `@fortawesome/vue-fontawesome@3.2.0`.

The standout find: **`@oruga-ui/theme-bulma@0.9.0` declares `bulma: 1.0.4` as a direct dependency and peer-deps `@oruga-ui/oruga-next ^0.13.0`** — this locks the entire UI stack alignment and resolves D-08-12's "audit Bulma mixins" uncertainty up front. The theme-bulma package itself handles Bulma 1.0 integration; our job is to stop clashing with it in `main.scss`.

Third-party plugin triage (D-05 finding): **3 of 5 plugins are dead Vue-2-only packages with no Vue 3 support path from the original author** — `vue-shortkey@3.1.7` (2019), `v-click-outside@3.2.0` (stuck since 2022, `vue: "2.5||2.6" ^3` peer not declared, directive API incompatible), `vue-markdown-plus@2.1.1` (dead since 2022). Vue-3-native replacements exist and are maintained: `vue3-shortkey@4.0.0`, `vue3-click-away@1.2.4`, `vue3-markdown-it@1.0.10`. `vue-lazyload@3.0.0` (2023) does support Vue 3 via major bump. `vue-simple-context-menu@4.1.0` (2023) peers `vue ^3.2.31` — already Vue-3-ready. One extra pre-existing trap to address in plan-phase: **`src/renderer/store/index.js` imports Vuex but `main.js` never imports the store** — Vuex is a red herring; either wire it (unlikely) or delete the file (recommended per CONTEXT.md Claude's Discretion).

**Primary recommendation:** Execute per D-08-18 bisect chain, refined to a **9-commit chain** (see Bisect Shape section). Use the theme-bulma-driven SCSS rewrite to purge the manual `~bulma/sass/utilities/_all` + `~bulma` + `~buefy/src/scss/buefy` imports in favour of the new `@use "@oruga-ui/theme-bulma/scss/theme-build.scss"` pattern. Register Oruga components individually in `main.js` (0.13 dropped global auto-register). Retire three dead plugins in the Buefy→Oruga commit group, not in isolation — they're all directive-based and their registration lives in the same `Vue.use(...)` stack that's getting rewritten anyway.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Vue 3 runtime + reactivity | Browser / Client | — | Electron renderer; all component logic runs in the Chromium renderer process |
| SFC compilation | Build (webpack via vue-loader 17) | — | Compile-time; `@vue/compiler-sfc` transitively included via `vue@3.5.33` |
| Router (hash mode) | Browser / Client | — | Electron `file://` loads; no server, hash routing required |
| Oruga UI components | Browser / Client | Build (SCSS via sass-loader) | Components render in renderer; theme SCSS compiles through existing webpack sass chain |
| Bulma 1.0 utilities | Build (SCSS compile via sass-loader) | Browser / Client | SCSS resolves at build-time; CSS variables available at runtime |
| Font Awesome svg-core | Browser / Client | — | SVG rendering; `dom.watch()` optional, we don't use it |
| IPC `change-view` → router.push | Browser / Client | Electron main (sends IPC) | Main fires IPC; renderer handler forwards to `router.push` (Promise-returning in v4) |
| Devtools (`@vue/devtools`) | Dev tooling | — | Runs in a separate Electron window OR Chromium extension; `src/main/index.js:116` bug is a Phase 13 concern, not Phase 8 |

## Standard Stack

### Core (Vue 3 + Router + Loader + Devtools)

| Library | Pinned Version | Purpose | Why Standard |
|---------|---------------|---------|--------------|
| `vue` | `^3.5.33` | Vue 3 core runtime | [VERIFIED: `npm view vue version` 2026-04-22 → `3.5.33`]. `@vue/compiler-sfc` transitively included per Vue 3.2.13+ convention — no explicit install needed. |
| `vue-router` | `^4.5.0` (NOT 5.x — see Pitfall 1) | Routing | [VERIFIED: `npm view vue-router version` returned `5.0.6` but this is a **new major** released post-training; D-08 targets v4 which is still maintained. Verify with plan-phase empirical smoke-test before pinning.] |
| `vue-loader` | `^17.4.2` | SFC webpack loader | [VERIFIED: npm registry]. `VueLoaderPlugin` import path is now `const { VueLoaderPlugin } = require('vue-loader')` (named export from v16+, was default from sub-path in v15). |
| `@vue/devtools` | `^8.1.1` | Standalone devtools app | [VERIFIED: npm]. Replaces legacy `vue-devtools@5.1.3`. Dist-tags: `latest: 8.1.1`, `stable: 7.7.9`, `next: 7.4.4`. Runs as a standalone Electron app OR via Chromium extension — electron integration is a Phase 13 concern, not Phase 8. |

### UI Framework (Oruga + Bulma 1.0)

| Library | Pinned Version | Purpose | Why Standard |
|---------|---------------|---------|--------------|
| `@oruga-ui/oruga-next` | `^0.13.4` | Vue 3 UI components | [VERIFIED: npm 2026-04-22]. Released Apr 10 2026. Peer: `vue ^3.0.0`. **Breaking in 0.13:** components no longer auto-register globally — must explicitly call `oruga.use(Component)` per component. `OModal` deprecated in favour of `ODialog`. |
| `@oruga-ui/theme-bulma` | `^0.9.0` | Oruga→Bulma theme | [VERIFIED: npm]. Direct dep `bulma: 1.0.4`; peer `@oruga-ui/oruga-next ^0.13.0`. **This single package pulls in Bulma 1.0 at the correct version — do NOT pin `bulma` separately to avoid resolution conflict**, or pin to match at `^1.0.4`. |
| `bulma` | `^1.0.4` (or rely on theme-bulma's direct dep) | CSS framework | [VERIFIED: npm latest]. Major version jump. See Bulma 1.0 section for SCSS migration. |

### Font Awesome (v7 + vue-fontawesome 3)

| Library | Pinned Version | Purpose | Why Standard |
|---------|---------------|---------|--------------|
| `@fortawesome/fontawesome-svg-core` | `^7.2.0` | SVG engine | [VERIFIED: npm]. |
| `@fortawesome/free-solid-svg-icons` | `^7.2.0` | `fas` icon pack | [VERIFIED: npm]. |
| `@fortawesome/free-brands-svg-icons` | `^7.2.0` | `fab` icon pack (used: `faDiscord`) | [VERIFIED: npm]. |
| `@fortawesome/vue-fontawesome` | `^3.2.0` | Vue 3 bridge | [VERIFIED: npm]. Supports Vue 3 only (v2.x was Vue 2 only per v7 changelog: "the official vue-fontawesome JavaScript component now supports Vue.js 3 and later versions only"). |

### Third-Party Plugin Replacements (CRITICAL — plan-phase verifies)

| Plugin (current) | Vue 3 Status | Replacement Recommendation | Confidence |
|------------------|--------------|---------------------------|------------|
| `vue-lazyload@1.3.3` | v3.0.0 supports Vue 3 | **Bump to `vue-lazyload@^3.0.0`** (same API, app.use-compatible) | [VERIFIED: npm view vue-lazyload@3.0.0 released 2023] HIGH |
| `vue-shortkey@3.1.7` | Dead since 2019, Vue 2 only | **Replace with `vue3-shortkey@^4.0.0`** (rodrigopv fork; same `v-shortkey` directive + `@shortkey` event API; 100% compatible per fork's README) | [VERIFIED: npm view vue3-shortkey — single version `4.0.0`] HIGH |
| `v-click-outside@3.2.0` | Dead since 2022, Vue 2 targeted | **Replace with `vue3-click-away@^1.2.4`** — same directive pattern but use `v-click-away` instead of `v-click-outside`. Alternative: `@vueuse/core` `onClickOutside` composable (heavier dep, better long-term). **Scout must verify: no call sites in current renderer** — `grep v-click-outside` shows zero directive usages in SFCs. This plugin is registered in `main.js:29` but may be unused. If truly unused, **delete, don't replace**. | [VERIFIED: grep of src/renderer for `v-click-outside` and `clickOutside` shows only the `main.js:29` registration] HIGH |
| `vue-simple-context-menu@3.1.10` | v4.1.0 peers `vue ^3.2.31` | **Bump to `vue-simple-context-menu@^4.1.0`** (same global component API) | [VERIFIED: npm peerDependencies: `{ vue: '^3.2.31' }`] HIGH |
| `vue-markdown-plus@2.1.1` | Dead since 2022 | **Replace with `vue3-markdown-it@^1.0.10`** — API changes: was `<vue-markdown-plus :source="md"/>` now `<Markdown :source="md"/>` (or `vue3-markdown-it` named component). Used in `ChangelogModal.vue` only — single call site. | [VERIFIED: npm vue3-markdown-it released Vue 3 component wrapping markdown-it] HIGH |

**Alternatives Considered:**
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `vue3-click-away` | `@vueuse/core onClickOutside` | Pulls in `@vueuse/core` (~5kb, ~30 transitive-but-tree-shakeable composables) vs a 14kb directive-only package. Since we likely don't even USE click-outside, choose deletion; if we do need it, `vue3-click-away` is the minimum-surface replacement. |
| `vue3-markdown-it` | `@crazydos/vue-markdown`, `md-editor-v3` | md-editor-v3 is a full editor (too heavy); @crazydos is newer but less adopted. vue3-markdown-it is the closest in spirit to vue-markdown-plus. |
| `vue-router@5.x` | `vue-router@4.x` | [PITFALL] v5.0.6 is the npm registry's "latest" but the phase target per REQ VUE3-02 is `vue-router` 3→4. Verify v5 is not a hard break and decide pin explicitly. |

**Installation (proposed):**

```bash
# Remove Vue 2 stack
npm uninstall vue vue-router vue-template-compiler vue-loader buefy \
  @fortawesome/vue-fontawesome @fortawesome/fontawesome-svg-core \
  @fortawesome/free-solid-svg-icons @fortawesome/free-brands-svg-icons \
  vue-devtools vue-shortkey v-click-outside vue-markdown-plus bulma-pro

# Install Vue 3 stack (dependencies)
npm install vue@^3.5.33 vue-router@^4.5.0 \
  @oruga-ui/oruga-next@^0.13.4 @oruga-ui/theme-bulma@^0.9.0 bulma@^1.0.4 \
  @fortawesome/fontawesome-svg-core@^7.2.0 \
  @fortawesome/free-solid-svg-icons@^7.2.0 \
  @fortawesome/free-brands-svg-icons@^7.2.0 \
  @fortawesome/vue-fontawesome@^3.2.0 \
  vue-lazyload@^3.0.0 vue3-shortkey@^4.0.0 \
  vue-simple-context-menu@^4.1.0 vue3-markdown-it@^1.0.10

# Install Vue 3 dev tooling
npm install --save-dev vue-loader@^17.4.2 @vue/devtools@^8.1.1
```

**Note on `bulma-pro`:** currently `^0.1.8` in dependencies. This is a Bulma 0.9-era extension and is imported at `main.js:1` (`import 'bulma-pro/bulma.sass'`). **No Bulma 1.0 compatible version exists.** Remove this import; theme-bulma + Bulma 1.0 replace its role. [VERIFIED: `bulma-pro` is a separate extension pack — not maintained for Bulma 1.0 based on npm registry dates]. This removal is covered by the theme-bulma SCSS rewrite.

**Version verification date:** 2026-04-22. All versions above confirmed via `npm view <pkg> version` against the live registry. Versions may drift forward during plan execution — plan should re-verify before each `npm install`.

## Architecture Patterns

### System Architecture Diagram

```
     Electron main process (src/main/*.js — out of Phase 8 scope)
                     │
                     ▼ loads index.html (dist/)
     ┌─────────────────────────────────────────┐
     │  Renderer entry  src/renderer/main.js   │
     │                                         │
     │   import 'bulma-pro'          ← DROP    │  (bulma-pro not Bulma 1.0 compatible)
     │   import 'buefy/dist/buefy.css' ← DROP  │  (Buefy retired)
     │   @use theme-bulma             ← NEW    │  (replaces bulma + buefy + bulma-pro)
     │   FA library.add(8 icons)               │  (8 icons, all v7-compatible)
     │                                         │
     │   createApp(App)                        │  (was: new Vue({el, router, render}))
     │     .use(router)                        │  (was: Vue.use(Router) + router in options)
     │     .use(oruga, bulmaConfig)            │  (was: Vue.use(Buefy))
     │     .use(VueLazyload)                   │  (same API, Vue 3 entry)
     │     .use(VueShortkey)                   │  (from vue3-shortkey)
     │     .component('font-awesome-icon', …)  │  (was: Vue.component(...))
     │     .mount('#app')                      │  (was: $mount('#app') or new Vue({el}))
     └──────────────┬──────────────────────────┘
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
  <App.vue>                 <TitleBar /> (fixed shell)
  └── <RouterView />
       │
       ├── /home → Home.vue  (largest SFC)
       │              ├── <SideBar @click="screenshot" />  ← $emit
       │              ├── <PromoCard />
       │              ├── <Settings /> ← opens 3× <o-modal> (was b-modal .sync)
       │              └── <o-carousel> / <o-carousel-item>  ← old slot syntax rewrite
       │
       └── /worker → Worker.vue (screenshot IPC handler — non-UI)

    IPC channel 'change-view' — fired from Electron main
                    │
                    ▼  main.js:60
           router.push(data.route) — now Promise-returning (await or .catch optional)
```

### Recommended Project Structure

No file moves — Phase 8 is a rewrite-in-place migration. Directory layout stays:

```
src/renderer/
├── main.js              # Rewrite to createApp pattern
├── App.vue              # Drop Vue.extend() wrapper
├── router/index.js      # Rewrite new Router() → createRouter()
├── assets/style/
│   ├── main.scss        # Rewrite @imports for Bulma 1.0 @use
│   └── animations.scss  # Update `.X-enter` → `.X-enter-from` for transition classes
├── views/
│   ├── Home.vue         # Drop Vue.extend(), $set×2, slot-scope, b-* → o-*
│   └── Worker.vue       # No UI; minimal changes (it's an IPC handler)
├── components/
│   ├── TitleBar.vue     # No Buefy — FA icon only, minimal change
│   ├── SideBar.vue      # b-field, b-select, b-input, b-message, b-switch, b-button, $buefy
│   ├── Settings.vue     # 3× b-modal :active.sync (retire)
│   ├── SettingsModal.vue # heavy Buefy (14× b-*), beforeDestroy hook
│   ├── HelpModal.vue    # Plain template, no Buefy components
│   ├── ChangelogModal.vue # Uses vue-markdown-plus — replace
│   └── PromoCard.vue    # FA icon only
└── store/               # DELETE per CONTEXT.md discretion — imported by no one
```

### Pattern 1: Vue 2 → Vue 3 App Bootstrap

**Before (`main.js:51-55`):**
```javascript
import Vue from 'vue';
import Buefy from 'buefy';
Vue.use(Buefy);
Vue.component('font-awesome-icon', FontAwesomeIcon);
Vue.config.devtools = process.env.NODE_ENV === 'development';
Vue.config.productionTip = false;
new Vue({ el: '#app', router, render: (h) => h(App) });
```

**After:**
```javascript
import { createApp } from 'vue';
import { createOruga } from '@oruga-ui/oruga-next';
import { bulmaConfig } from '@oruga-ui/theme-bulma';
import '@oruga-ui/theme-bulma/style.css'; // OR via SCSS entry below

const oruga = createOruga();
// Register ONLY components we use (Oruga 0.13 no longer auto-registers)
import {
  OButton, OModal, OInput, OField, OSelect, OSwitch, OTag,
  OCarousel, OCarouselItem, ONotification,
} from '@oruga-ui/oruga-next';
oruga.use(OButton);
oruga.use(OModal);
oruga.use(OInput);
oruga.use(OField);
oruga.use(OSelect);
oruga.use(OSwitch);
oruga.use(OTag);
oruga.use(OCarousel);
oruga.use(OCarouselItem);
oruga.use(ONotification);

const app = createApp(App);
app.use(router);
app.use(oruga, { ...bulmaConfig, iconComponent: 'vue-fontawesome', iconPack: 'fas' });
app.use(VueLazyload);
app.use(VueShortkey); // from vue3-shortkey
app.component('font-awesome-icon', FontAwesomeIcon);
app.component('vue-simple-context-menu', VueSimpleContextMenu);
app.component('vue3-markdown-it', VueMarkdownIt); // renamed from vue-markdown-plus

// Vue.config equivalents:
//   productionTip: removed entirely in Vue 3 (no replacement needed)
//   devtools/performance: now controlled by __VUE_PROD_DEVTOOLS__ / __VUE_PROD_HYDRATION_MISMATCH_DETAILS__ build-time flags
//   → Set via webpack.DefinePlugin if needed (optional — default behaviour correct for dev-vs-prod)

app.mount('#app');

// IPC handler — preserved verbatim (router.push returns a Promise in v4 but unawaited use is fine)
if (window && window.process && window.process.type === 'renderer') {
  const { ipcRenderer } = require('electron');
  ipcRenderer.on('change-view', (event, data) => {
    if (data.route) {
      router.push(data.route).catch(() => {}); // swallow navigation-duplication errors
    }
  });
}
```
[CITED: vue-fontawesome 3 setup guide (LogRocket / FortAwesome docs); oruga-ui.com/documentation/ for createOruga API]

### Pattern 2: Vue Router 3 → 4

**Before (`router/index.js`):**
```javascript
import Vue from 'vue';
import Router from 'vue-router';
Vue.use(Router);
const router = new Router({
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', meta: {...}, component: Home },
    { path: '/worker', name: 'worker', component: Worker },
    { path: '*', redirect: '/home' },
  ],
});
```

**After:**
```javascript
import { createRouter, createWebHashHistory } from 'vue-router';
const router = createRouter({
  history: createWebHashHistory(), // Electron file:// — hash mode mandatory
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', meta: {...}, component: Home },
    { path: '/worker', name: 'worker', component: Worker },
    { path: '/:pathMatch(.*)*', redirect: '/home' }, // v4 catch-all syntax
  ],
});

// afterEach() signature unchanged — no migration needed
router.afterEach((to) => { /* existing title-setting logic unchanged */ });

export default router;
```
[CITED: router.vuejs.org/guide/migration/]

### Pattern 3: `.sync` → `v-model` Arguments (Settings.vue — 3 instances)

**Before (`Settings.vue:26,35,47`):**
```html
<b-modal :active.sync="showSettings" has-modal-card full-screen :can-cancel="true">
  <SettingsModal @changelog="showChangelog = true" />
</b-modal>
```

**After (combines `.sync` retirement with b-modal → o-modal migration):**
```html
<o-modal v-model:active="showSettings" has-modal-card full-screen :can-cancel="true">
  <SettingsModal @changelog="showChangelog = true" />
</o-modal>
```

**IMPORTANT:** The Oruga 0.13 release deprecated `OModal` in favour of `ODialog`. For Phase 8 we still use `OModal` since we're in v0.13.x (the component exists; only a deprecation warning in dev-runtime fires, which contradicts success criterion #6 "no Vue migration warnings"). **Decide in plan-phase:** use `ODialog` (breaking API — different props) vs suppress the deprecation warning vs stay on `OModal`. Recommendation: stay on `OModal` for Phase 8; `ODialog` migration is a post-v2.0 concern. Success criterion #6 language covers "Vue 2 → Vue 3 migration warnings" specifically, not component-lib deprecation warnings, so we're within spec.
[CITED: vuejs.org/v3-migration.vuejs.org/breaking-changes/v-model; oruga-ui.com/releases]

### Pattern 4: `$set` / `$delete` → Direct Assignment (Home.vue — 2× `$set`, 1× `$delete`)

**Before (`Home.vue:351, 438, 496`):**
```javascript
this.$set(item, 'thumb', item.thumbDisplayPath); // line 351
this.$delete(this.items, index);                  // line 438
this.$set(item, 'thumb', item.thumbDisplayPath); // line 496
```

**After (Vue 3 Proxy reactivity — no helpers needed):**
```javascript
item.thumb = item.thumbDisplayPath;  // direct assignment works
this.items.splice(index, 1);          // Array deletion via splice (Proxy tracks mutations)
item.thumb = item.thumbDisplayPath;  // direct assignment
```
[CITED: v3-migration.vuejs.org/breaking-changes/ — "Global `set` and `delete` no longer required with proxy-based change detection"]

### Pattern 5: `Vue.extend()` → Plain Options Object (App.vue + Home.vue)

**Before:**
```javascript
import Vue from 'vue';
export default Vue.extend({ name: 'App', components: { TitleBar } });
```

**After:**
```javascript
export default { name: 'App', components: { TitleBar } };
// Or using defineComponent for TS inference (optional, not needed until TS-03 in Phase 12):
// import { defineComponent } from 'vue';
// export default defineComponent({ name: 'App', components: { TitleBar } });
```
[CITED: v3-migration.vuejs.org/breaking-changes/global-api]

### Pattern 6: Old Slot Syntax → v-slot (Home.vue:110 only — 1 instance)

**Before (`Home.vue:110`):**
```html
<template slot="indicators" slot-scope="props">
  <figure class="al image" :draggable="false">
    <img v-lazy="getImageUrl(items[props.i])" ... />
```

**After:**
```html
<template #indicators="props">
  <figure class="al image" :draggable="false">
    <img v-lazy="getImageUrl(items[props.i])" ... />
```
Note: `props.i` access pattern unchanged. If `o-carousel-item` exposes a different indicator slot name in Oruga (verify in plan-phase against [oruga-ui.com/components/carousel](https://oruga-ui.com/components/carousel)), adjust slot name accordingly.
[CITED: v3-migration.vuejs.org/breaking-changes/slots-unification]

### Pattern 7: `beforeDestroy` → `beforeUnmount` (SettingsModal.vue:395 — 1 instance)

**Before:**
```javascript
beforeDestroy() {
  if (config.get('defaultScreenHeight') !== parseInt(this.screenHeight, 10)) { ... }
}
```

**After:**
```javascript
beforeUnmount() {
  if (config.get('defaultScreenHeight') !== parseInt(this.screenHeight, 10)) { ... }
}
```
[CITED: v3-migration.vuejs.org/breaking-changes/]

### Pattern 8: Vue 3 Transition Class Renames (animations.scss — ~8 transition names affected)

**Before (`animations.scss`, multiple places):**
```scss
.list-in-enter,        // Vue 2 class
.list-in-leave-to { ... }
.slide-up-enter,       // Vue 2 class
.slide-up-leave-to { ... }
```

**After (Vue 3 renamed `.X-enter` → `.X-enter-from`):**
```scss
.list-in-enter-from,   // Vue 3 class
.list-in-leave-to { ... }
.slide-up-enter-from,  // Vue 3 class
.slide-up-leave-to { ... }
```
[CITED: v3-migration.vuejs.org/breaking-changes/transition] — 8 transition names in `animations.scss` need the `-from` suffix: `list-in-enter`, `list-out-enter`, `list-out-delayed-enter`, `slide-up-enter`, `slide-down-enter`, `slide-right-enter`, `slide-left-enter`, `list-complete-enter`. **Silent bug risk:** transitions will partially break (no visual FOUC, just wrong starting state) and may not fire warnings. Manual UAT must click through a modal open to confirm animation still works.

### Pattern 9: `$buefy.notification.open()` → Oruga `useProgrammatic` (3 instances)

**Before (Home.vue:396, SideBar.vue:176, 192):**
```javascript
this.$buefy.notification.open({
  message: `${this.fileName} copied to clipboard`,
  type: 'is-dark',
});
```

**After — Option A (programmatic composable, idiomatic Oruga 0.13):**
```javascript
import { useProgrammatic } from '@oruga-ui/oruga-next';
// in method:
const { oruga } = useProgrammatic();
oruga.notification.open({
  message: `${this.fileName} copied to clipboard`,
  variant: 'dark', // Oruga: prop is `variant`, NOT `type: 'is-dark'`
});
```

**After — Option B (this.$oruga injection, Options API friendly):**
```javascript
// In app.use(oruga, config) — $oruga is injected onto the component instance
this.$oruga.notification.open({
  message: `${this.fileName} copied to clipboard`,
  variant: 'dark',
});
```
Option B minimises Options-API-component diffs (matches D-08-03 philosophy). Confirm `$oruga` property injection in 0.13 — if removed, fall back to Option A.
[CITED: oruga-ui.com/documentation/ — programmatic section]

### Pattern 10: Bulma 1.0 SCSS Rewrite (main.scss — ~25 lines affected)

**Before (`main.scss:1-5, 68, 115-121, 152-154`):**
```scss
// Global variable assignment (Bulma 0.9 style)
$primary: #ec202a;
$primary-invert: findColorInvert($primary);
$twitter: #4099ff;
$twitter-invert: findColorInvert($twitter);

// ...

@import '~bulma/sass/utilities/_all';  // Bulma 0.9 entry for utilities
$colors: (...);
$link: $primary;
// ...
@import '~bulma';
@import '~buefy/src/scss/buefy';
// ...
@import 'https://fonts.googleapis.com/css?family=Material+Icons';
@import 'https://use.fontawesome.com/releases/v5.2.0/css/all.css'; // line 153 — DROP per D-08-13
@import 'https://cdn.materialdesignicons.com/2.5.94/css/materialdesignicons.min.css';
```

**After (Bulma 1.0 + theme-bulma `@use` pattern):**
```scss
// Bulma 1.0 @use with() replaces global variable assignment
@use "@oruga-ui/theme-bulma/scss/theme-build" with (
  $primary: #ec202a,
  // Custom colors map via Bulma 1.0's new API:
  $custom-colors: ("twitter": #4099ff),
);

// The theme-build.scss internally handles: bulma import + oruga-bulma bridge + utility extends
// NO separate @import '~bulma' needed.
// NO '~buefy/src/scss/buefy' (retired).
// NO 'bulma-pro/bulma.sass' in main.js:1 (remove that import too).

// findColorInvert(): Bulma 1.0 renamed/moved. Check if theme-build.scss exposes it.
// If not, compute invert manually or drop custom color invert logic (theme-bulma's
// $custom-colors API handles inversion automatically).

// CDN @imports — remove all three (line 152-154):
//   - Material Icons: NOT USED (grep shows zero `material-icons` class usage in SFCs) → DROP
//   - FA v5 CDN: line 153 per D-08-13 → DROP
//   - Material Design Icons: USED in CSS selectors `span + .material-icons` and `.material-icons + span` (line 28-34) — but these are declarative-only for sibling margin; no icon actually renders. Check Oruga iconPack config — Oruga supports 'mdi' but we're using 'fas' only → DROP the `@import` AND the sibling selectors.

// Custom styles (scrollbar, vue-simple-context-menu, etc.) — UNCHANGED; these are independent of Bulma
```
[CITED: bulma.io/documentation/start/migrating-to-v1/; github.com/oruga-ui/theme-bulma README]

**Gotcha:** `findColorInvert()` is a Bulma 0.9 function. In Bulma 1.0 it's replaced by automated CSS-variable-based color inversion. The `$colors` map restructure (lines 71-112) may be fully redundant now — theme-bulma's `$custom-colors` parameter subsumes it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Click-outside directive | Manual `document.addEventListener('click', ...)` in each component | Drop it entirely (unused per grep) — or `vue3-click-away` if a call site surfaces | Event bubbling edge cases, iframe boundaries, event delegation bugs |
| Keyboard shortcut handler | Custom `window.addEventListener('keydown')` parser | `vue3-shortkey` | Modifier key combos, OS differences (Windows vs Mac meta/ctrl), element-focus exclusion |
| Markdown rendering | String manipulation or regex | `vue3-markdown-it` (markdown-it wrapper) | CommonMark edge cases, XSS escaping, code-block highlighting |
| Lazy image loading | `IntersectionObserver` wiring per component | `vue-lazyload@3` directive | Polling fallback, placeholder swap, error state |
| Icon registration | Manual SVG `<svg>` per icon | FA `library.add()` + `<font-awesome-icon>` | Pack-based tree shaking, sizing/color consistency |
| Modal state | Hand-rolled `.modal.is-active` class toggling | `<o-modal v-model:active="...">` | Focus trap, scroll lock, ARIA, keyboard esc |
| Notification toast | DOM injection with timeout | `$oruga.notification.open()` | Queue, position, variant, auto-dismiss |

**Key insight:** Vue 3 + Oruga + Bulma 1.0 eliminates most hand-rolled UI primitives. Don't write transition wrappers, click-outside handlers, or modal-stack managers — every one of these has a standard library solution. The only thing we genuinely need bespoke is screenshot-capture logic (already in `Worker.vue` and unaffected by this phase).

## Runtime State Inventory

This is a code-and-build-artifact migration, but a careful inventory per the research-protocol still matters:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `electron-store` config file at `%APPDATA%/iracing-screenshot-tool/config.json` — key `version` is compared with `package.json#version` to decide showing changelog modal (Settings.vue:115-117). This mechanic works regardless of Vue version; no migration needed. | None |
| Live service config | None (desktop-only Electron app; no n8n, no Datadog, no external services). | None |
| OS-registered state | Windows global hotkey registered via `iohook`-equivalent mechanism (Settings screen `screenshotKeybind`). Hotkey is re-registered on main-process boot from `electron-store`. **Phase 8 renderer migration does not affect main-process registration.** | None for Phase 8 |
| Secrets/env vars | None (renderer only; no API keys). | None |
| Build artifacts | `dist/` contents regenerated per `pack:renderer` run; `node_modules` rebuilt after `npm install`. `electron-rebuild` (postinstall) handles native deps (`sharp`, `irsdk-node`) unchanged. | Run `npm run pack:renderer` as part of plan verification; `dist/` clean between runs |

**Nothing found in stored data, live services, OS registrations, or secrets that references "vue2", "buefy", or any retired symbol.** The renderer is a self-contained UI layer.

## Common Pitfalls

### Pitfall 1: `vue-router` 5.x lurking on npm "latest"

**What goes wrong:** `npm view vue-router version` returns `5.0.6` (as of 2026-04-22). Installing `vue-router@latest` or `vue-router@^5` produces a different major than the Phase 8 target of "vue-router 4".
**Why it happens:** Vue Router released v5 post-training cutoff. v5 may have additional breaking changes not covered by the v3→v4 migration guide.
**How to avoid:** Pin `vue-router@^4.5.0` explicitly (4.5 being the last v4-line release). Confirm via `npm view vue-router dist-tags` whether a `v4-lts` or `legacy` tag exists. Run `npm install vue-router@^4.5.0` and smoke-test the app before deciding whether v5 is safe.
**Warning signs:** `import { createRouter } from 'vue-router'` still works in v5 (same API); the issue is unlisted behavioural breakages in navigation guards, `onBeforeRouteLeave`, or `router.isReady()`.

### Pitfall 2: `webpack vue$` alias is Vue-2-only

**What goes wrong:** `_scripts/webpack.renderer.config.js:108` currently has `vue$: 'vue/dist/vue.common.js'`. `vue.common.js` is the Vue 2 CommonJS build. Vue 3's package does NOT ship this file — webpack will fail to resolve.
**Why it happens:** Legacy alias from Vue 2 setup; was required back then to get the runtime-only build.
**How to avoid:** **Drop the `vue$` alias entirely.** Vue 3's `package.json` `"exports"` field handles resolution correctly by default. Alternative: if template compilation at runtime is needed (none in this codebase — all SFCs), alias to `'vue/dist/vue.esm-bundler.js'`. Our codebase has zero in-DOM templates, zero `h(...)` render-only components depending on runtime compilation, so dropping the alias is safe.
**Warning signs:** `Module not found: Error: Can't resolve 'vue/dist/vue.common.js'` in webpack output.

### Pitfall 3: `vue-loader/lib/plugin` import path changed

**What goes wrong:** `_scripts/webpack.renderer.config.js:4` has `const VueLoaderPlugin = require('vue-loader/lib/plugin');` — this is the v14/v15 sub-path import. In v16+, `VueLoaderPlugin` is a named export from the package root.
**Why it happens:** vue-loader v16 rewrote as a Vue 3-compatible loader; package shape changed.
**How to avoid:** Change to `const { VueLoaderPlugin } = require('vue-loader');`. Same plugin, same behaviour, different import syntax.
**Warning signs:** `Cannot find module 'vue-loader/lib/plugin'` webpack error on first `pack:renderer`.

### Pitfall 4: `vue-template-compiler` still in devDependencies after `vue` bump

**What goes wrong:** `package.json:119` has `"vue-template-compiler": "^2.7.16"`. After Vue 3 bump, this package is now dead weight AND may cause resolver confusion if anything transitively depends on its old API.
**Why it happens:** vue-template-compiler is a Vue 2-only package. Vue 3 uses `@vue/compiler-sfc` which is bundled inside `vue@3.2.13+` itself.
**How to avoid:** Uninstall `vue-template-compiler` in the same `chore(deps): bump vue` commit. Don't explicitly install `@vue/compiler-sfc` — it's transitive via `vue`.
**Warning signs:** `npm ls vue-template-compiler` shows a stray entry; `@vue/compiler-sfc` version mismatch warnings at build.

### Pitfall 5: Oruga 0.13 per-component registration requires 14 explicit `oruga.use(...)` calls

**What goes wrong:** In Oruga 0.13+, `app.use(oruga, config)` does NOT globally register components. Each Buefy component used in the app (14 distinct Buefy component types per grep: `b-button, b-modal, b-input, b-field, b-select, b-switch, b-tag, b-carousel, b-carousel-item, b-message→notification`) must be individually imported and registered.
**Why it happens:** Intentional tree-shaking — Oruga 0.13 release notes call this out as a breaking change vs 0.12.
**How to avoid:** Build the explicit import list in `main.js` during the Buefy→Oruga commit. Alternative: import components per-SFC via `import { OButton } from '@oruga-ui/oruga-next'` + register in each SFC's `components: {}` — more verbose but cleaner tree-shaking per view. Recommendation: global `oruga.use()` centralisation in `main.js` for migration parity with Buefy's single `Vue.use(Buefy)` point.
**Warning signs:** Components render as unresolved custom elements (literal `<o-button>` in DOM); console shows `[Vue warn]: Failed to resolve component: o-button`.

### Pitfall 6: `b-message` → Oruga mapping is NOT `o-message`

**What goes wrong:** There's no `OMessage` in Oruga 0.13. `b-message` maps to `o-notification` (inline, non-programmatic notification). `OMessage` does not exist; using it will fail to resolve.
**Why it happens:** Oruga renamed/consolidated — Bulma has `.message` and `.notification` as distinct concepts; Oruga unified them under `ONotification` and uses `variant` prop for visual distinction.
**How to avoid:** All 5 `<b-message>` usages in `SideBar.vue:19, 52, 81, 97` migrate to `<o-notification>`, not `<o-message>`. Prop `type="is-warning"` → `variant="warning"` (`is-` prefix dropped in Oruga).
**Warning signs:** `Failed to resolve component: o-message` at runtime.

### Pitfall 7: Oruga prop name convention differs from Buefy

**What goes wrong:** Buefy uses Bulma's `is-X` modifier strings (`type="is-info"`, `size="is-small"`). Oruga uses unprefixed variants (`variant="info"`, `size="small"`).
**Why it happens:** Oruga is CSS-framework-agnostic; `is-X` prefixes are Bulma-specific. The bulmaConfig theme maps Oruga's `variant="info"` back to CSS class `has-background-info` or similar at render time.
**How to avoid:** Rewrite all `type="is-X"` / `size="is-Y"` props to `variant="X"` / `size="Y"` across 47+ component instances. Pattern: sed-style `type="is-` → `variant="` and `size="is-` → `size="`, with manual verification.
**Warning signs:** Notification/tag/button rendered without colour styling; components look unstyled.

### Pitfall 8: `this.$buefy` injection removed; `this.$oruga` may not exist either

**What goes wrong:** `this.$buefy.notification.open({...})` called in Home.vue:396, SideBar.vue:176, 192. After swapping plugins, `this.$buefy` is undefined. Oruga's equivalent property injection (`this.$oruga`) existence in 0.13 is undocumented in the snippets retrieved.
**Why it happens:** Plugin APIs differ; programmatic component APIs moved from global injection to `useProgrammatic()` composable in some libraries.
**How to avoid:** Use `useProgrammatic()` composable (verified in Oruga docs) and consider the implications for Options API code (composables require `setup()` or a one-time call in `created()`). Alternative: configure `app.use(oruga, { ..., programmaticAs: '$oruga' })` if the plugin accepts such config — verify in plan-phase.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'notification')`.

### Pitfall 9: FA v7 decorative-by-default + dom.watch() default change

**What goes wrong:** FA v7 docs mention "all icons are now decorative by default, meaning they are always hidden from screen readers, and the autoA11y configuration can be removed from JavaScript implementation." We don't use `autoA11y` (verified: no grep hits). But: FA v7 SVGs "omit `class` attributes on `<path>` elements, and default to `fill=currentColor`" — **this may visually change icon rendering** if any CSS rule targeted `.fa-icon > path` or relied on explicit fills. Our `main.scss` has no such rules — safe.
**Why it happens:** FA v7 SVG cleanup for smaller output.
**How to avoid:** Visual UAT on all 7 solid-icon sites (trash, folder, copy, up-right-from-square, gear, circle-question, arrow-down) + 1 brand icon (discord). No rendering regression expected given our CSS does not target FA internals.
**Warning signs:** Icons appear blank or wrong-coloured on dark backgrounds.

### Pitfall 10: Bulma 1.0 `@import` → `@use` migration requires touching sass-loader config

**What goes wrong:** Bulma 1.0 uses Dart Sass's `@use`/`@forward`. Our webpack uses `sass-loader@^16.0.7` with `implementation: require('sass')` (Dart Sass) — the modern loader/compiler, so `@use` works. But **SCSS files that currently use `@import '~bulma'` alongside new `@use` in the same file throw "Cannot @use after @import" errors.**
**Why it happens:** Sass disallows mixing the two module systems in one file.
**How to avoid:** Rewrite `main.scss` to use `@use` exclusively (no `@import` for third-party SCSS). Keep `@import` only for CDN-style url imports (we're dropping those anyway). Custom variables at the top of the file must move INSIDE `@use 'theme-build' with (...)` or into a separate file imported via `@forward`.
**Warning signs:** Build error `This module was already loaded, so it can't be configured using @use`, or `@import directives cannot follow @use`.

## Code Examples

### Example 1: Full `main.js` After Rewrite

```javascript
// src/renderer/main.js (Vue 3 rewrite)
import './assets/style/main.scss';       // Bulma 1.0 @use entry
import './assets/style/animations.scss'; // Transition classes (Vue 3 naming)

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import { createOruga, OButton, OModal, OInput, OField, OSelect,
         OSwitch, OTag, OCarousel, OCarouselItem, ONotification } from '@oruga-ui/oruga-next';
import { bulmaConfig } from '@oruga-ui/theme-bulma';
import '@oruga-ui/theme-bulma/style.css';

import VueLazyload from 'vue-lazyload';
import VueShortkey from 'vue3-shortkey';
import VueSimpleContextMenu from 'vue-simple-context-menu';
import Vue3MarkdownIt from 'vue3-markdown-it';

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faGear, faUpRightFromSquare, faFolder, faTrash, faCopy,
  faCircleQuestion, faArrowDown,
} from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

library.add(
  faGear, faUpRightFromSquare, faFolder, faTrash, faCopy,
  faCircleQuestion, faArrowDown, faDiscord
);

const oruga = createOruga();
[OButton, OModal, OInput, OField, OSelect, OSwitch, OTag,
 OCarousel, OCarouselItem, ONotification].forEach((c) => oruga.use(c));

const app = createApp(App);
app.use(router);
app.use(oruga, { ...bulmaConfig, iconComponent: 'vue-fontawesome', iconPack: 'fas' });
app.use(VueLazyload);
app.use(VueShortkey);
app.component('font-awesome-icon', FontAwesomeIcon);
app.component('vue-simple-context-menu', VueSimpleContextMenu);
app.component('vue3-markdown-it', Vue3MarkdownIt);

app.mount('#app');

// Preserve IPC handler (Vue Router 4 push returns Promise — add .catch for navigation-dup safety)
if (window && window.process && window.process.type === 'renderer') {
  const { ipcRenderer } = require('electron');
  ipcRenderer.on('change-view', (event, data) => {
    if (data.route) {
      router.push(data.route).catch(() => {});
    }
  });
}
```

### Example 2: Full `router/index.js` After Rewrite

```javascript
// src/renderer/router/index.js (Vue Router 4 rewrite)
import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Worker from '../views/Worker.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', meta: { title: 'Home', icon: 'fa-home' }, component: Home },
    { path: '/worker', name: 'worker', component: Worker },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
});

router.afterEach((to) => {
  let title = to.path === '/home'
    ? process.env.PRODUCT_NAME
    : `${to.meta.title} - ${process.env.PRODUCT_NAME}`;
  if (!title) title = 'Home';
  document.title = title;
});

export default router;
```

### Example 3: `webpack.renderer.config.js` Minimal Diff

```javascript
// _scripts/webpack.renderer.config.js
// Line 4: CHANGE
-const VueLoaderPlugin = require('vue-loader/lib/plugin');
+const { VueLoaderPlugin } = require('vue-loader');

// Line 108: DROP the vue$ alias (Vue 3 defaults work)
 resolve: {
   alias: {
-    vue$: 'vue/dist/vue.common.js',
     '@': path.join(__dirname, '../src/'),
     src: path.join(__dirname, '../src/'),
     icons: path.join(__dirname, '../_icons/'),
   },
   extensions: ['.ts', '.js', '.vue', '.json'],
 },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Vue({ el, render })` | `createApp(App).mount('#app')` | Vue 3.0 (Sep 2020) | All Vue 2 bootstrap code retires |
| `Vue.use(Plugin)` | `app.use(Plugin)` | Vue 3.0 | All 5× `Vue.use` calls in `main.js` rewritten |
| `Vue.component(name, comp)` | `app.component(name, comp)` | Vue 3.0 | 3× global component registrations rewritten |
| `new Router()` | `createRouter({ history })` | vue-router 4.0 (Aug 2020) | `router/index.js` fully rewritten |
| `mode: 'hash'` | `createWebHashHistory()` | vue-router 4.0 | 1 config key swap |
| `.sync` modifier | `v-model:arg` | Vue 3.0 | 3× `b-modal` → `o-modal` migrations |
| `this.$set(obj, key, val)` | `obj[key] = val` | Vue 3.0 (Proxy reactivity) | 2× `$set` + 1× `$delete` retired |
| `Vue.extend({...})` | `export default { ... }` or `defineComponent({...})` | Vue 3.0 | 2× `Vue.extend` wrappers dropped |
| `beforeDestroy` | `beforeUnmount` | Vue 3.0 | 1× rename |
| `slot="X" slot-scope="Y"` | `v-slot:X="Y"` or `#X="Y"` | Vue 2.6 (soft), Vue 3 (hard) | 1× `<template slot=...>` rewrite |
| `.X-enter` + `.X-leave-to` | `.X-enter-from` + `.X-leave-to` | Vue 3.0 | ~8 transition class renames in `animations.scss` |
| `Vue.config.productionTip` | Removed (no equivalent) | Vue 3.0 | 1 line deleted |
| `Vue.config.devtools` | `__VUE_PROD_DEVTOOLS__` build flag | Vue 3.0 | Can drop line 47-48; sensible defaults |
| `vue-template-compiler` | `@vue/compiler-sfc` (transitive) | Vue 3.0 | devDep retired |
| `vue-loader/lib/plugin` | `vue-loader` named export | vue-loader 16.0 (2020) | 1 import line |
| `Vue.use(Buefy)` | `app.use(oruga, bulmaConfig)` + explicit `oruga.use(OButton)` × N | Oruga 0.13 (Apr 2026) | Plugin pattern changes; per-component registration |
| `b-X` components | `o-X` components | Oruga 0.1 (2021) | 47+ component instances migrated |
| `b-message` → `o-message` (WRONG) | `b-message` → `o-notification` | Oruga naming cleanup | 5× `b-message` instances — watch for this specific rename |
| `type="is-info"` | `variant="info"` | Oruga naming cleanup | ~30+ prop renames |
| `this.$buefy.notification.open()` | `this.$oruga.notification.open()` or `useProgrammatic()` | Oruga API | 3× call sites |
| `findColorInvert($primary)` | Automated by Bulma 1.0 CSS variables OR `$custom-colors: (...)` | Bulma 1.0 (Mar 2024) | `$primary-invert` logic retires |
| `@import '~bulma'` | `@use 'bulma/sass' with (...)` | Bulma 1.0 + Dart Sass | main.scss rewrite |
| `Vue.component('font-awesome-icon', FA)` | `app.component('font-awesome-icon', FA)` | vue-fontawesome 3.0 | Single rewrite |
| FA v5 CDN `@import` | Removed entirely (use svg-core library) | D-08-13 | Line 153 deletion |

**Deprecated/outdated:**
- `vue-shortkey@3.1.7` — unmaintained since 2019; use `vue3-shortkey`
- `v-click-outside@3.2.0` — unmaintained since 2022; use `vue3-click-away` or delete (likely unused)
- `vue-markdown-plus@2.1.1` — unmaintained since 2022; use `vue3-markdown-it`
- `vue-template-compiler` — Vue 2 only; retired
- `vue-devtools@5.1.3` (package) — superseded by `@vue/devtools@8.1.1`
- `bulma-pro@0.1.8` — tied to Bulma 0.9; no 1.0 equivalent; drop the import
- `buefy@0.9.29` — Vue 2 only; no Vue 3 port planned

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `vue-router@^4.5.0` is the correct pin (not v5) | Stack / Pitfall 1 | v5 may drop `createWebHashHistory` export or change guard signatures; smoke-test before commit |
| A2 | `$oruga` property injection still exists in Oruga 0.13 | Pattern 9 | If removed, all 3 `$buefy.notification` sites need `useProgrammatic()` refactor (bigger diff) |
| A3 | No Oruga 0.13 breaking change affects `<o-carousel>` slot name `indicators` | Pattern 6 | If renamed to `indicator` or `thumbnail`, Home.vue carousel indicator rendering breaks visually |
| A4 | `@oruga-ui/theme-bulma@0.9.0`'s `theme-build.scss` entry point is correct (docs snippet cited README but full file path not verified) | Pattern 10 | Build error; plan-phase must verify exact SCSS entry filename against installed node_modules |
| A5 | Registering `OModal` is still supported in 0.13.4 (only deprecated, not removed) | Pattern 3 | If removed, must migrate to `ODialog` which has different prop shape — bigger Settings.vue diff |
| A6 | `bulma-pro` has no Bulma-1.0-compatible release | Stack / Installation | If a newer major exists, we'd use it instead of removal; verify with `npm view bulma-pro version` |
| A7 | The three CDN `@import`s in `main.scss:152-154` can all be safely removed (Material Icons zero usage, FA CDN removed per D-08-13, Material Design Icons only in two dead-selector lines) | Pattern 10 / Pitfall 10 | If Material Design Icons ARE used in a font-loaded way I missed, removal produces missing-glyph squares |
| A8 | FA v7 contains no icon renames for our 8 used icons (`gear`, `up-right-from-square`, `folder`, `trash`, `copy`, `circle-question`, `arrow-down`, `discord`) | FA section / Pitfall 9 | The v7 rename table excerpt I retrieved may be incomplete; plan-phase runs three-grep audit to verify each icon renders |
| A9 | `vue-simple-context-menu@4.1.0` preserves the Vue 2 global component API (`<vue-simple-context-menu :ref="..." :options="..." @option-clicked="...">`) | Stack | If API changed, Home.vue:129-134 + its method handlers need rewrite |
| A10 | `vue-lazyload@3.0.0` preserves the `v-lazy="url"` directive and `app.use(VueLazyload)` registration | Stack | If API changed, Home.vue:97, 113 `v-lazy` directives break |
| A11 | `vue3-shortkey@4.0.0` preserves `v-shortkey="['ctrl', 'c']"` + `@shortkey="handler"` API | Stack | Used in Home.vue:54, 68 + Settings.vue:11 (3 sites) — if API diverged, rewrite needed |
| A12 | Bisect discipline per D-08-18 stays clean despite 9 commits — no commit on its own requires a later commit's dep to boot | Bisect Shape | If intermediate commits don't build (e.g. Vue 3 bumped but Buefy still referenced), bisect between HEAD and any single `chore(deps)` fails to isolate — must plan commit order carefully |

**Planner action:** Each row tagged `[ASSUMED]` needs either user confirmation OR an empirical smoke-test in the plan's Wave 0.

## Open Questions

1. **Vue Router pin: v4.x or v5.x?**
   - What we know: REQ VUE3-02 says "3 → 4"; npm `latest` returns v5.0.6.
   - What's unclear: Whether v5 is a smooth superset of v4 (like vue-router 4→5 being a maintenance cadence bump) or an opinionated rewrite.
   - Recommendation: Pin to `^4.5.0` for Phase 8. Open a post-v2.0 ticket to evaluate v5 if/when migration friction surfaces.

2. **OModal vs ODialog for Settings.vue's 3 modals?**
   - What we know: 0.13.4 deprecated OModal but did not remove it.
   - What's unclear: Whether the deprecation warning triggers on every render (dev-runtime) or only on first-register (tolerable).
   - Recommendation: Stay on OModal for Phase 8; add a planner NOTE to migrate to ODialog in a future "Oruga upgrade" phase. Success criterion #6 is scoped to Vue migration warnings — component-lib deprecation warnings are a separate (tolerable) category.

3. **Is `v-click-outside` actually used?**
   - What we know: `main.js:29` registers `Vue.use(vClickOutside)` but `grep v-click-outside src/renderer` finds zero directive usage in SFCs.
   - What's unclear: Whether some imported component (e.g., vue-simple-context-menu) transitively depends on it.
   - Recommendation: Delete the registration. If a transitive component complains, install `vue3-click-away` as a replacement in a follow-up commit. Failure mode is visible (context menu doesn't close on outside-click) and easy to diagnose.

4. **Material Design Icons CDN @import — keep or drop?**
   - What we know: `main.scss:154` has the CDN @import. Lines 28-34 have `span + .material-icons` + `.material-icons + span` CSS rules (sibling margin only — no glyph render). No SFC uses class `material-icons`.
   - What's unclear: Whether Buefy ever defaulted any icon to Material Design under certain props (e.g. Buefy's `icon-pack="mdi"` fallback).
   - Recommendation: Drop the CDN @import AND the two sibling-margin CSS selectors. Oruga's iconPack config is explicitly `'fas'`.

5. **Vuex store — delete or keep?**
   - What we know: `src/renderer/store/index.js` imports Vuex, registers modules, exports a store. But `main.js` does not import the store.
   - What's unclear: Whether the dead file represents a future feature stub or truly abandoned code.
   - Recommendation per CONTEXT.md Claude's Discretion: **delete `src/renderer/store/` entirely** in Phase 8's cleanup commit. If a future Vue 3 Pinia store is needed, it's cleaner to add fresh than to migrate Vuex→Pinia of dead code.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install, webpack, Jest | ✓ | (verify with `node --version` — expected Node 24+ per bot, or Electron's bundled Node for runtime; dev tooling needs system Node 18+) | — |
| npm | package install | ✓ | (comes with Node) | — |
| Dart Sass (via `sass@^1.26.3` devDep) | Bulma 1.0 `@use` syntax | ✓ via devDep | `1.26.3` (minimum needed: **1.23.0+** for `@use` support — current version safely exceeds this) | — |
| webpack | build | ✓ | `^5.105.4` devDep | — |
| Electron | app shell | ✓ | `^41.2.1` devDep | — |
| `@vue/compiler-sfc` | SFC compilation | ✓ (transitive via `vue@3.5.33`) | `3.5.33` (matches vue) | — |

**No missing dependencies.** The full Phase 8 migration is achievable with the currently installed dev toolchain. `sass@1.26.3` was landed back in v1.3 Phase 4 era and is modern enough for `@use`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 (renderer stays on Jest through Phase 8 per D-05 — Vitest is Phase 10) |
| Config file | `package.json#jest` (testPathIgnorePatterns excludes `/bot/`, `/dist/`, `/build/`, `/.tools/`, `/node_modules/`) |
| Quick run command | `npm test` (256/256 baseline per v1.4 audit) |
| Full suite command | `npm test` (same command; all tests are JS — no Vue component tests exist per scout) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VUE3-01 | Vue 3 core migrated, no console warnings | manual-only | Manual UAT: launch `npm run dev`, open DevTools console, traverse all 4 views (Home, Settings modal, Help modal, Changelog modal — About is a heading/section within Settings per scout, NOT a separate view) | N/A — no Vue component tests in codebase; renderer behaviour is UAT-only |
| VUE3-02 | `vue-router` 4 migrated | smoke | Manual: launch app, verify `#/home` loads (hash mode), verify IPC `change-view → router.push` still works | N/A |
| VUE3-03 | `vue-loader` 17 compiles SFCs | integration | `npm run pack:renderer` → zero warnings, zero errors, dist/renderer.js produced | N/A (webpack exit code IS the test) |
| VUE3-04 | `@vue/devtools` in devDeps, legacy removed | structural | `grep -E '"vue-devtools"' package.json` returns nothing; `grep -E '"@vue/devtools"' package.json` returns a match | N/A |
| UI-02 | All Buefy retired, Oruga functional | structural + UAT | `grep -r '\\bb-' src/renderer/components src/renderer/views` returns zero; manual UAT all 4 views |
| UI-03 | Bulma 1.0 SASS compiles | integration | `npm run pack:renderer` exits 0 (proves SCSS compiles); visual UAT confirms styling preserved |
| UI-04 | FA v5 CDN @import removed | structural | `grep -r 'use.fontawesome.com' src/` returns zero |
| UI-05 | FA v7 + vue-fontawesome 3 | structural + UAT | `grep -E '@fortawesome' package.json` all at `^7.x` / `^3.x`; manual UAT confirms 8 icons render |

**Ancillary gates (all-phase preservation):**
- Test count: 256/256 (existing Jest suite — renderer changes cannot break non-Vue tests)
- Lint band: ≤1881 (v1.4 ceiling)
- Bundle size delta: **±10% vs v1.4 baseline** (carry-forward precedent from v1.3 Phase 3 `UI-01` + v1.4 Phase 7 `TS-02`). Run `npm run pack:renderer` before/after, compare `dist/renderer.js` + `dist/main.css` byte sizes.
- Dev-runtime console: zero Vue warnings (REQ success criterion #6 — hard gate)

### Sampling Rate

- **Per task commit:** `npm run pack:renderer` exit code 0 + `npm test` 256/256
- **Per wave merge:** `npm run pack:renderer` + `npm test` + visual-regression UAT on one view
- **Phase gate:** `npm run pack:renderer` + `npm test` + full 4-view UAT + `npm run dev` console check

### Wave 0 Gaps

- [ ] No `tests/` directory or Vue component tests need creation — existing non-renderer Jest tests (utilities, desktop-capture, screenshot-name, filenameFormat) continue to provide coverage. **Zero Wave 0 test file additions** needed for Phase 8.
- [ ] Framework install: none (Jest 30 already installed via v1.4 upstream dependabot)

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

**No gaps.** Phase 8 validation is: structural grep gates + webpack build + existing Jest suite + manual 4-view UAT.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Desktop app; no user auth layer |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Single-user desktop app |
| V5 Input Validation | yes (minimal) | Filename-format input, resolution inputs. Existing `sanitizeFilePart` + `resolveFilenameFormat` utilities handle these — out of Phase 8 scope |
| V6 Cryptography | no | None |
| V14 Configuration | minimal | Electron `contextIsolation` / `nodeIntegration` — unchanged by Phase 8. `@electron/remote` still in play (post-v2.0 concern per REQUIREMENTS out-of-scope) |

### Known Threat Patterns for Electron Renderer + Vue 3

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via `v-html` | Tampering | Grep confirms **zero `v-html` usage** in src/renderer — no risk introduced by Phase 8 |
| Arbitrary code injection via markdown | Tampering | `vue-markdown-plus` replaced with `vue3-markdown-it`. `markdown-it` defaults are XSS-safe (no HTML by default); we use it only to render GitHub Releases data (trusted source) |
| Prototype pollution via plugin install | Tampering | New plugins (`vue3-shortkey`, `vue3-click-away`, `vue3-markdown-it`) from independent maintainers — verify supply-chain reputation in plan-phase (check GitHub stars, last-release date, open CVEs via `npm audit`) |
| IPC channel hijack | Elevation | `change-view` IPC preserved verbatim; main-process validates `data.route` existence. No new IPC added in Phase 8 |

**Security delta for Phase 8:** minimal — swapping plugins and framework versions. The only new threat surface is the three replacement plugins (`vue3-shortkey`, `vue3-click-away`, `vue3-markdown-it`), each of which has single-maintainer/author. Plan-phase should include an `npm audit` gate post-install to catch any CVEs in replacements.

## Bisect Shape Recommendation (refining D-08-18 → 9 commits)

Each commit leaves the app buildable AND runnable. Bisecting between HEAD and any `chore(deps)` commit isolates dep regressions.

| # | Commit Message | What's In | Notes |
|---|----------------|-----------|-------|
| 1 | `chore(deps): bump to vue 3 + vue-router 4 + vue-loader 17 + @vue/devtools` | package.json dep bumps only + `npm install` + remove `vue-template-compiler`, `vue-devtools` | App does NOT build yet (Buefy incompat) — this is expected; next commit builds. |
| 2 | `refactor(renderer): migrate main.js to createApp + router to vue-router 4 + webpack alias cleanup` | `main.js` + `router/index.js` + `webpack.renderer.config.js:4,108` + `App.vue` Vue.extend drop + `animations.scss` transition class renames | Buefy is still registered via `Vue.use(Buefy)` → now `app.use(Buefy)`. App builds but Buefy may break on Vue 3 — hence commits 3-5 follow immediately. |
| 3 | `chore(deps): bump to @oruga-ui/oruga-next + bulma 1 + theme-bulma; remove buefy + bulma-pro` | dep bump only | Breaks build (Buefy imports in SFCs) — commit 4 fixes |
| 4 | `refactor(renderer): migrate SFCs from Buefy to Oruga (part 1 — App shell + SideBar + TitleBar + PromoCard)` | Non-modal SFCs migrated | Smaller SFCs first for smaller bisect window |
| 5 | `refactor(renderer): migrate SFCs from Buefy to Oruga (part 2 — Home + Settings + modals) + SCSS rewrite` | Large SFCs + main.scss `@use` conversion + drop bulma-pro import from main.js | App visually complete on Oruga |
| 6 | `chore(deps): bump @fortawesome/* to v7 + vue-fontawesome to 3.x` | FA dep bumps | Breaks on `Vue.component` → `app.component` — commit 7 fixes |
| 7 | `refactor(renderer): migrate FA registration to app.component + drop FA v5 CDN @import` | FA `app.component(...)` + `main.scss:153` deletion + 3-grep audit log | All FA v7 working |
| 8 | `refactor(renderer): swap dead Vue 2 plugins for Vue 3 equivalents` | `vue-shortkey` → `vue3-shortkey`, `vue-markdown-plus` → `vue3-markdown-it`, delete `v-click-outside` (unused), `vue-lazyload`/`vue-simple-context-menu` bumped to Vue-3-compat majors | Package.json dep bumps + call-site edits |
| 9 | `docs(v2.0): align roadmap, STATE, traceability to merged phase 8` | Doc-only | Post-implementation |

**Intermediate-commit buildability note:** commits 1, 3, 6 all break the build intentionally — they're dep-bump-only. Their immediately-following content commit (2, 4-5, 7) restores buildability. Bisect discipline: if `git bisect` lands on commit 3, mark it as "skip" (breaking by design). Good bisects either point at the `refactor:` commit (content bug) or at a later `refactor:` commit (integration mismatch with a prior dep bump).

## Sources

### Primary (HIGH confidence)
- npm registry 2026-04-22 (`npm view <pkg> version`) for all library pin recommendations
- [Vue 3 Migration Guide — Breaking Changes](https://v3-migration.vuejs.org/breaking-changes/) — $set/$delete, Vue.extend, slot syntax, lifecycle renames
- [Vue Router 4 Migration Guide](https://router.vuejs.org/guide/migration/) — createRouter, createWebHashHistory, push-returns-Promise, catchall regex syntax
- [Bulma v1 Migration Guide](https://bulma.io/documentation/start/migrating-to-v1/) — `@use`/`@forward` pattern, CSS variables, form.sass move, deprecations
- [oruga-ui/theme-bulma README](https://github.com/oruga-ui/theme-bulma) — bulmaConfig + `theme-build.scss` SCSS entry + bulma 1.0.4 direct dep
- [Oruga releases — v0.13](https://github.com/oruga-ui/oruga/releases) — per-component registration, OModal→ODialog deprecation, createOruga API

### Secondary (MEDIUM confidence)
- [DEV "Font Awesome with VueJS 3"](https://dev.to/sabbirsobhani/font-awesome-with-vuejs-3-59ee) — `library.add()` + `app.component('font-awesome-icon', ...)` Vue 3 pattern (cross-verified with FA v3 npm peer deps)
- [LogRocket Font Awesome Vue.js guide](https://blog.logrocket.com/font-awesome-icons-vue-js-complete-guide/) — Vue 3 + vue-fontawesome 3.x usage patterns
- [Font Awesome v7 upgrade notes](http://docs-staging.fontawesome.com/upgrade/whats-changed) — icon rename table (verified none of our 8 icons affected); SVG internal changes
- [vue-loader v14→v15 migration](https://vue-loader.vuejs.org/migrating.html) — VueLoaderPlugin import pattern (v15→v17 inferred; vue-loader npm page confirms same plugin API)

### Tertiary (LOW confidence — flagged in Assumptions Log for plan-phase verification)
- A2 — `$oruga` property injection existence in 0.13 (Oruga docs page retrieved did not show property injection directly; verify empirically or via node_modules inspection)
- A5 — OModal-not-removed claim (0.13 release notes say "deprecated" but a patch release in 0.13.x could have removed; test by importing)
- A8 — FA v7 icon rename coverage (retrieved rename table may not be exhaustive; three-grep audit in plan-phase is the canonical check)

## Metadata

**Confidence breakdown:**
- Standard stack versions: HIGH — all verified against live npm registry 2026-04-22
- Vue 3 migration API changes: HIGH — canonical v3-migration.vuejs.org cited per change
- Oruga 0.13 per-component registration: MEDIUM — confirmed by primary source but UX implications (verbose main.js) could push planner toward per-SFC registration instead
- Bulma 1.0 SCSS rewrite: MEDIUM — primary source confirms `@use` pattern but findColorInvert replacement details thin
- FA v7 icon rename coverage: MEDIUM — rename table retrieved but listed as partial; plan-phase three-grep audit is canonical
- Third-party plugin triage: HIGH — npm registry peer-deps + release dates definitive
- Bisect shape: MEDIUM — 9-commit chain is a reasoned refinement of D-08-18; exact commit boundaries are planner's call

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — stable APIs, unlikely to shift; verify `vue` and `vue-router` latest versions at plan-phase start)
