---
phase: 12-js-to-ts
plan: 03
subsystem: typescript
tags: [typescript, git-mv, src-renderer, vue-router, shims, pascalcase-naturalized, any-transitional]

dependency-graph:
  requires:
    - "Plan 12-01 (src/utilities/*.ts + tsconfig types/skipLibCheck)"
    - "Plan 12-02 (src/main/*.ts — transitively loads Electron/Node types into the shared scope)"
    - "vue-router 4.x (bundled RouteRecordRaw types)"
    - "@vue/runtime-core types (DefineComponent for *.vue shim)"
  provides:
    - "src/renderer/main.ts (Vue 3 bootstrap — createApp + router + Oruga + FA + plugins + IPC change-view handler)"
    - "src/renderer/router/index.ts (vue-router 4: createWebHashHistory + 4 routes + afterEach title hook)"
    - "src/renderer/shims-vue.d.ts (module shims for *.vue, *.scss, *.css, plus 3 untyped Vue plugins)"
    - "PascalCase carry-forward naturalized — no outstanding src/renderer/main.js modifications anywhere"
    - "Zero .js files remain under src/renderer/ tree (only .ts, .d.ts, .vue, .scss, .html)"
  affects:
    - "Plan 12-04 (Vue SFCs) — shim file's DefineComponent<object, object, unknown> covers SFC imports; Plan 04 refines per-SFC types via <script lang=\"ts\">"
    - "Plan 12-05 (tsconfig expansion + parser swap) — include expansion to src/**/* is now safe; no latent errors in src/renderer/ .ts files"
    - "Phase 12 @ts-expect-error budget: 6 of 15 used (Plan 01: 3, Plan 02: 3, Plan 03: 0) — 9 slots remain for Plans 04-05"

tech-stack:
  added: []
  patterns:
    - "Module shim via `declare module '*.vue' { import type { DefineComponent } from 'vue'; const component: DefineComponent<object, object, unknown>; export default component; }`"
    - "Loose `declare module 'pkg-name';` shims for 3 untyped third-party Vue plugins (vue-simple-context-menu, vue3-shortkey, vue3-markdown-it) — treated as `any` at the plugin boundary per D-12-08"
    - "Oruga plugin registration via `(c as any)` cast — Oruga's `OrugaComponentPlugin` type doesn't align with Vue's `DefineComponent` overload (Oruga expects a plugin-shaped object with install method; raw Vue components don't fit). Per D-12-08, `any` at this transitional boundary"
    - "vue-router 4 public-API typing: `RouteRecordRaw[]` for routes array; `afterEach((to) => ...)` inherits `RouteLocationNormalized` implicitly; inline meta cast `(to.meta as { title?: string })` avoids module augmentation"
    - "Electron renderer-process nodeIntegration preserved: `window.process.type === 'renderer'` + `require('electron')` — TypeScript resolves both via transitive types (@types/node + electron's bundled .d.ts in the shared scope); zero @ts-expect-error needed"
    - "process.env.PRODUCT_NAME safety: fallback string literal (`|| 'iRacing Screenshot Tool'`) rather than non-null assertion — robust against build-config edge cases"

key-files:
  created:
    - ".planning/phases/12-js-to-ts/12-03-SUMMARY.md"
    - "src/renderer/shims-vue.d.ts (12 lines: Vue SFC shim + SCSS/CSS shims + 3 untyped-plugin shims)"
  renamed:
    - "src/renderer/main.js → main.ts (85% similarity — rename-detected; carry-forward consumed)"
    - "src/renderer/router/index.js → router/index.ts (37% similarity — D+A below 50% threshold; pre-rename history reachable via `git log --follow -- src/renderer/router/index.js`)"
  modified:
    - "src/renderer/index.html (script tag: ./main.js → ./main.ts)"

key-decisions:
  - "D-12-05 preserved: `git mv` used for both renames; main.ts detected as R085, router/index.ts dropped to 37% (D+A) due to annotation restructure (routes array hoisted out of createRouter call for RouteRecordRaw[] typing)"
  - "D-12-06 preserved: single content commit (9a9082b) for the entire src/renderer batch"
  - "D-12-08 preserved: `(c as any)` at Oruga's plugin boundary; 3 loose `declare module 'pkg';` shims for untyped Vue plugins — transitional, not dogmatic"
  - "D-12-08 extended: both predicted @ts-expect-error slots retired after discovering TypeScript already resolves window.process + require('electron') under the transitive-scope-wide type resolution. Plan-predicted 2 slots → 0 used. Net -2 from plan budget."
  - "Plan prediction stale: the plan assumed `window.process` + `require('electron')` would need @ts-expect-error directives in the renderer scope. Reality: once Plan 12-02 pulled Electron types into the shared scope (via src/main/*.ts imports), those types stay resolvable for .ts files under any include glob that also walks src/main/. The renderer-check temp tsconfig (which includes both src/main/ and src/renderer/) compiles cleanly with zero directives."
  - "PascalCase carry-forward naturalized: pre-existing working-tree modification on src/renderer/main.js (`app.component('font-awesome-icon', FontAwesomeIcon)` → `app.component('FontAwesomeIcon', FontAwesomeIcon)` + `app.component('vue3-markdown-it', Vue3MarkdownIt)` → `app.component('Vue3MarkdownIt', Vue3MarkdownIt)`) flowed through `git mv` into the same commit as the .ts conversion. Single commit captures both changes per D-12-06. STATE.md's 'src/**/ PascalCase rename carry-forward' item is now resolved."

requirements-completed:
  - "TS-03"

metrics:
  duration-seconds: 0
  completed-date: 2026-04-22
---

# Phase 12 Plan 03: `src/renderer/*.js` → `.ts` Conversion Summary

**2 renderer-process files (main.js + router/index.js) converted to TypeScript via `git mv` + minimal public-surface type annotations. Pre-existing PascalCase-rename carry-forward on main.js naturalized as part of the rename. 1 new shim file introduced for `.vue`/`.scss`/`.css` imports + 3 untyped Vue plugins. 0 of 2 budgeted `@ts-expect-error` used — both predicted slots retired by TypeScript's shared-scope type resolution. tsc 0 errors, Vitest 256/256, pack exit 0.**

## Performance

- **Started:** 2026-04-22T22:01Z
- **Completed:** 2026-04-22T22:06:26Z (commit timestamp)
- **Tasks:** 4/4
- **Files in commit:** 5 (2 renames + 1 new shim + 1 script-tag edit + 1 file mode/delete for router/index.js in the D+A pair)

## Accomplishments

- Both `.js` files in `src/renderer/` (`main.js`, `router/index.js`) renamed to `.ts` via `git mv`, committed as a single D-12-06 per-directory batch (commit `9a9082b`).
- `src/renderer/main.ts`:
  - `oruga.use(c as any)` cast added to satisfy `OrugaComponentPlugin` overload (D-12-08 `any` allowed at Oruga's transitional boundary; ESLint disable comment inline).
  - IPC handler typed: `ipcRenderer.on('change-view', (event: unknown, data: { route?: string }) => { ... })`.
  - PascalCase carry-forward naturalized (2 `app.component(...)` calls now use PascalCase names).
- `src/renderer/router/index.ts`:
  - `routes: RouteRecordRaw[]` extracted as typed module-level const (structural change accepted — reason for rename-similarity drop to 37%).
  - `router.afterEach((to) => ...)` — `to` inferred as `RouteLocationNormalized` by vue-router 4.
  - `process.env.PRODUCT_NAME` fallback: `|| 'iRacing Screenshot Tool'` replaces raw template substitution (strict-null-check compliance).
  - `to.meta.title` accessed via `(to.meta as { title?: string }).title ?? 'Home'` inline cast (vue-router's default `meta: Record<string, unknown>` would otherwise block).
- `src/renderer/shims-vue.d.ts` created (new file):
  - `declare module '*.vue' { ... DefineComponent<object, object, unknown> ... }` — covers all SFC imports from `.ts` files.
  - `declare module '*.scss'` + `declare module '*.css'` — handles style-side-effect imports in main.ts.
  - 3 loose shims for untyped Vue plugins: `vue-simple-context-menu`, `vue3-shortkey`, `vue3-markdown-it`. None ships `.d.ts`; none has `@types/*` on npm. Loose shim is the D-12-08-sanctioned minimum.
- `src/renderer/index.html` script tag updated: `./main.js` → `./main.ts`. Vite's esbuild pipeline handles the transform automatically; pack output confirmed.
- `npx tsc --noEmit -p tsconfig.renderer-check.json` (temp config — scope includes `src/utilities` + `src/main` + `src/renderer`) → **0 errors** across all files.
- Temp tsconfig DELETED before commit (Plan 05 handles permanent tsconfig expansion).
- `npm test` → 256/256 passed under Vitest 4.1.5 (~237 ms). No renderer tests exist; suite unaffected.
- `npm run pack` → exit 0, 68 modules transformed, 9.88 s. `out/renderer/index.html` + `out/renderer/assets/index-*.js` + CSS produced.

## Commit SHA

| # | SHA     | Type     | Message                                           |
|---|---------|----------|---------------------------------------------------|
| 1 | 9a9082b | refactor | refactor(ts): convert src/renderer/*.js to .ts    |
| 2 | _this_  | docs     | docs(12-03): complete Plan 12-03 summary          |

## `@ts-expect-error` Breakdown (0/2 budget used)

| File              | Line | Reason                                                              |
|-------------------|------|---------------------------------------------------------------------|
| _none_            | —    | Both predicted slots retired (see below)                            |

**Plan-predicted slots retired:**

- `main.ts: window.process.type === 'renderer'` — plan reserved 1 slot for "nodeIntegration injection not in lib.dom.d.ts". Reality: under the shared-scope type resolution that includes `src/main/` (where `import from 'electron'` pulls in Electron's `.d.ts`), `@types/node`'s `NodeJS.Process` and Electron's merged type already provide `process.type: string | undefined`. `window.process` is resolvable. tsc emitted "Unused @ts-expect-error" → directive removed. Net -1 from budget.
- `main.ts: require('electron')` — plan reserved 1 slot for "CommonJS require inside ES module". Reality: `@types/node` declares `require: NodeRequire` as a global; Electron's bundled `.d.ts` provides the module shape. tsc resolves `require('electron')` to Electron's exports without complaint. Net -1 from budget.

**Net:** 0 of 2 slots used. Phase 12 running total: **6 of 15** (Plan 01: 3, Plan 02: 3, Plan 03: 0).

**For Plans 04-05:** 9 `@ts-expect-error` slots remain in budget. Plan 04 (Vue SFCs) likely wants most of these — Oruga's component-ref typing and template-ref edge cases are common sources.

## `any` Usage Patterns (carry-forward for Plan 04)

- **Oruga plugin cast (`main.ts:66`):** `oruga.use(c as any)` — per D-12-08. Oruga's `OrugaComponentPlugin` interface and Vue's `DefineComponent<...>` shape don't align. The raw Vue components (OButton, OModal, etc.) pass structural validation at runtime but not TypeScript's structural check. ESLint disable comment is inline; don't refactor.
- **Untyped-plugin shims (`shims-vue.d.ts`):** 3 `declare module 'pkg';` lines (vue-simple-context-menu, vue3-shortkey, vue3-markdown-it) — these become implicit `any` default exports. Per D-12-08. Plan 04 doesn't introspect any of these; shims are sufficient.
- **No `any` in `router/index.ts`:** full vue-router 4 typing works without escape hatches.

## Shim File Necessity

`src/renderer/shims-vue.d.ts` IS strictly necessary. Without it:
- `.vue` imports fail with TS2307 ("Cannot find module './App.vue'") — vanilla tsc has no Vue SFC transformer.
- `.scss` imports fail with TS2307 — Vite handles these at build time; tsc does not.
- 3 Vue plugins fail with TS7016 ("Could not find a declaration file for module 'vue-simple-context-menu'") — no upstream types published.

Vite continues to resolve these through its dedicated plugins (`@vitejs/plugin-vue`, Sass loader, etc.) — the shim is purely a TypeScript typing concern.

**For Plan 05:** when tsconfig `include` expands to `src/**/*`, this shim file stays. It provides the type-surface contract that .ts files need regardless of bundler pipeline.

## PascalCase Carry-Forward Naturalization

Pre-existing modification on `src/renderer/main.js` (STATE.md: "src/renderer/main.js PascalCase rename carry-forward — deferred to Phase 12"):

```diff
-app.component('font-awesome-icon', FontAwesomeIcon);
+app.component('FontAwesomeIcon', FontAwesomeIcon);
-app.component('vue3-markdown-it', Vue3MarkdownIt);
+app.component('Vue3MarkdownIt', Vue3MarkdownIt);
```

`git mv src/renderer/main.js src/renderer/main.ts` carried these modifications forward into the staging area along with the rename operation. Task 4's single commit (9a9082b) captures both the rename AND the PascalCase modification. `git status` post-commit confirms: no outstanding `src/renderer/main.js` or `src/renderer/main.ts` changes — the carry-forward is fully consumed.

**STATE.md cleanup for Plan 05:** the "src/** PascalCase rename carry-forward" Blockers/Concerns entry should be marked resolved. The same commit consumed the Phase 12 portion.

## Rename-Similarity Edge Case (router/index.ts)

Similar situation to Plan 12-02's `iracing-sdk-utils.js` (also dropped below 50%):

- `src/renderer/main.js → main.ts`: **85% similarity** — rename-detected cleanly.
- `src/renderer/router/index.js → router/index.ts`: **37% similarity** (below 50% default threshold) — shows as `D + A` in `git diff --cached --name-status`.

**Cause:** The routes array moved out of the `createRouter({ routes: [...] })` call into a standalone `const routes: RouteRecordRaw[] = [...]` + `createRouter({ routes })`. Combined with the `process.env.PRODUCT_NAME` fallback, meta cast, and type import — enough bytes shifted that git's rename-detection heuristic missed the threshold.

**Impact:**
- `git log --follow src/renderer/router/index.ts` from HEAD: 1 entry (this commit only) — the default follow doesn't walk across non-detected renames.
- `git log --follow -- src/renderer/router/index.js` (explicit pre-rename path): **5 entries** walking back to pre-Phase-12 Vue-CLI-migration (4564ac3) + earlier. History is preserved; only the automatic walk ergonomics changed.

**For Plan 04 executors:** Vue SFCs converting `<script>` → `<script lang="ts">` should hit fewer similarity drops than this plan did (the in-template markup dominates byte count for most SFCs). If an SFC's script section is unusually long, watch for similar D+A pairs.

**For git log consumers:** use explicit `git log --follow -- <old-path>` when tracing history across renames that fell below detection threshold. Git's rename-detection is a runtime heuristic, not a permanent metadata field.

## Decisions Made

All minimum-scope, driven by tsc-error-driven Rule 3 blocking fixes:

1. **Oruga plugin cast: `oruga.use(c as any)`** — per D-12-08 `any` at transitional boundary. Alternatives (narrow Oruga's overload via module augmentation, or wrap each component in a plugin adapter) would be architectural changes. `any` + ESLint disable is the D-12-08 minimum.

2. **3 untyped-plugin shims in `shims-vue.d.ts`** — `declare module 'vue-simple-context-menu';` + 2 more. These packages ship neither `.d.ts` nor `@types/*`. Shim is the idiomatic TypeScript approach. Don't install `@types/*` that doesn't exist, don't fork the packages.

3. **Both predicted @ts-expect-error slots retired** — TypeScript's shared-scope resolution (inherited from Plan 12-02's Electron-in-scope config) makes `window.process.type` and `require('electron')` resolvable without directives. tsc surfaced this as TS2578 "Unused '@ts-expect-error'" — remove the directive per standard TS hygiene.

4. **Routes array hoisted for RouteRecordRaw[] typing** — the simplest place to attach the type is on a standalone const. Inline `createRouter({ routes: [...] as RouteRecordRaw[] })` would also work but introduces an `as` cast. Hoisting is cleaner. Accepted consequence: rename-similarity drop.

5. **Inline meta cast `(to.meta as { title?: string })`** — vue-router 4's default `RouteMeta` is `Record<string | number | symbol, unknown>`. Two alternatives rejected:
   - Module-augmented `RouteMeta` with `title?: string` — over-engineering for a 1-site usage.
   - Declaring a typed routes variable (e.g., `declare const routes: readonly RouteRecordRaw[] & { meta: { title?: string } }[]`) — doesn't compose with `RouteRecordRaw`.
   Inline cast is minimum-scope.

6. **`process.env.PRODUCT_NAME` fallback over non-null assertion** — `|| 'iRacing Screenshot Tool'` is safer: if the build config ever forgets to define PRODUCT_NAME (e.g., a tool running without electron-vite's define plugin), the title is still sensible. Non-null assertion (`!`) would produce `'undefined'` in that case.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Missing shims for 3 untyped Vue plugins**
- **Found during:** Task 2 (first `npx tsc --noEmit -p tsconfig.renderer-check.json` run)
- **Issue:** tsc TS7016 on 3 imports: `vue-simple-context-menu`, `vue3-shortkey`, `vue3-markdown-it`. None ships `.d.ts` in the package; no `@types/*` published on npm. Plan mentioned `*.vue`/`*.scss`/`*.css` shims but not individual plugins.
- **Fix:** Added 3 `declare module '<pkg>';` lines to `shims-vue.d.ts`. Each becomes an implicit `any` default-export shape.
- **Files modified:** `src/renderer/shims-vue.d.ts`
- **Verification:** tsc exit 0 after shim addition.
- **Committed in:** 9a9082b (same plan commit)

**2. [Rule 3 — Blocking] Oruga `OrugaComponentPlugin` overload mismatch**
- **Found during:** Task 2 (first tsc run)
- **Issue:** `oruga.use(c)` — `c` infers to `OButton | OModal | ... | OCarouselItem` (raw Vue components). Oruga's `use(plugin: OrugaComponentPlugin): Oruga` overload expects a plugin-shaped object. TypeScript rejects the overload (TS2769).
- **Fix:** Changed to `oruga.use(c as any)` with inline `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment. Per D-12-08 ("Oruga component refs: `any` allowed").
- **Files modified:** `src/renderer/main.ts`
- **Verification:** tsc exit 0; runtime unchanged (cast is compile-time only).
- **Committed in:** 9a9082b

**3. [Rule 3 — Blocking] Unused `@ts-expect-error` directives**
- **Found during:** Task 2 (tsc run after shim + Oruga fixes)
- **Issue:** Both of the plan-reserved `@ts-expect-error` directives (on `window.process.type === 'renderer'` and on `require('electron')`) were flagged TS2578 "Unused". TypeScript already resolves both via the shared-scope type resolution (Electron `.d.ts` is in scope through `src/main/` imports; `@types/node` provides global `require`).
- **Fix:** Removed both directives.
- **Files modified:** `src/renderer/main.ts`
- **Verification:** tsc exit 0; net -2 from plan's @ts-expect-error budget.
- **Committed in:** 9a9082b

---

**Total deviations:** 3 auto-fixed, all Rule 3 (blocking). Zero scope creep — every fix addressed a tsc breakage. No Rule 4 architectural changes.

**Impact on plan:** @ts-expect-error usage is 0 instead of predicted ≤2 — net savings of 2 slots returned to Phase 12 budget. One shim file grew from "5 lines, 3 module shapes" to "12 lines, 6 module shapes" to accommodate the 3 untyped plugins — absorbed in-scope within the same commit.

## Issues Encountered

- **Plan's @ts-expect-error predictions stale (same as Plan 02):** same pattern as Plan 12-02 — plan reserved directive slots that didn't materialize. 4 of Phase 12's planned directive sites retired in Plans 02+03 combined (Plan 02 retired 2, Plan 03 retired 2). This is a positive trend — TypeScript's shared-scope resolution is stronger than the plans assumed.
- **Router rename similarity drop:** documented above. `git log --follow` with explicit `.js` path still works; no history lost.
- **Sass deprecation warnings in `npm run pack`:** pre-existing (seen in Plan 02 summary too), NOT introduced by this plan. Out of scope per Rule 3 scope boundary.
- **CRLF line-ending warnings on all 4 staged files:** Windows autocrlf normalization. Non-issue — git stores LF in-repo, working-tree gets CRLF on checkout. Plan 12-02 saw the same on its test files.

## User Setup Required

None — plan had zero external-service interactions.

## Next Phase Readiness

- **Plan 12-04 (Vue SFCs — 10 files) ready:**
  - The `*.vue` shim in `shims-vue.d.ts` gives Plan 04 a starting type surface for SFC imports.
  - `main.ts` imports from `App.vue` already pass through the shim without issue.
  - Plan 04 will swap `<script>` → `<script lang="ts">` on each SFC; the shim remains as a fallback for any SFC that isn't type-checked by vue-tsc or the Vite plugin.
  - `@ts-expect-error` budget for Plan 04: up to 9 slots remain (15 total - 6 used).
- **Plan 12-05 (tsconfig expansion + parser swap) ready:**
  - `include` expansion to `src/**/*` is safe — no latent errors in any of the 13 .ts files under src/.
  - The shim file under `src/renderer/shims-vue.d.ts` will be picked up by the expanded glob automatically.
  - Lint outcome: this plan's changes are additive (new shim file, type annotations, 1 ESLint disable). Expected lint delta is small; well under ≤1881 ceiling.
- **Phase 12 `@ts-expect-error` budget remaining:** 9 of 15 (used 6 across Plans 01+02+03). Plan 04 has generous headroom.

## Self-Check: PASSED

**Files verified:**
- FOUND: `.planning/phases/12-js-to-ts/12-03-SUMMARY.md` (this file)
- FOUND: `src/renderer/main.ts` (85% rename similarity)
- FOUND: `src/renderer/router/index.ts` (37% similarity — D+A below default threshold; documented)
- FOUND: `src/renderer/shims-vue.d.ts` (12 lines)
- FOUND: `src/renderer/index.html` (script tag references `./main.ts`)
- FOUND: 0 `.js` files remaining in `src/renderer/` tree

**Commits verified:**
- FOUND: `9a9082b` — refactor(ts): convert src/renderer/*.js to .ts

**Gates verified:**
- PASS: `npx tsc --noEmit -p tsconfig.renderer-check.json` → 0 errors (temp config, then deleted)
- PASS: `npm test` → 256/256 under Vitest 4.1.5 (~237 ms)
- PASS: `npm run pack` → exit 0, 68 modules transformed, 9.88 s
- PASS: `@ts-expect-error` count in src/renderer/*.ts = 0 (budget ≤2; phase running total 6 of 15)
- PASS: `@ts-ignore` count = 0
- PASS: `git log --follow src/renderer/main.ts` → 5+ entries (deep blame preserved)
- PASS: `git log --follow -- src/renderer/router/index.js` → 5 entries (pre-rename history reachable via explicit old-path)
- PASS: No `Co-Authored-By` footer on commit
- PASS: No `--no-verify` used
- PASS: `tsconfig.renderer-check.json` DELETED (not committed)
- PASS: No bot/** or .tmp-inspect/** leakage in commit
- PASS: PascalCase carry-forward fully consumed (no outstanding `src/renderer/main.*` modifications)

---

*Phase: 12-js-to-ts*
*Completed: 2026-04-22*
