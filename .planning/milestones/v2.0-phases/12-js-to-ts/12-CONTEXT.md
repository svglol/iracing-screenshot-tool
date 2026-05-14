# Phase 12: `.js` → `.ts` conversion in `src/` — Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Auto-generated (`--auto`)

<domain>
## Phase Boundary

Convert all source files under `src/main/`, `src/renderer/`, and `src/utilities/` from `.js` to `.ts`. Vue SFCs adopt `<script lang="ts">`. Expand `tsconfig.json` `include` from `["src/utilities"]` to `["src/**/*", "src/**/*.vue"]`. `@typescript-eslint/parser` becomes primary lint parser for `.ts`/`.vue`; `@babel/eslint-parser` retires (or scopes to `_scripts/` `.js` files if any remain).

**Inventory (empirical):**
- 18 `.js` files under `src/` (main 5 + renderer 2 + utilities 6 + tests 5)
- 10 `.vue` SFCs in `src/renderer/`
- Total: 28 files touched

**In scope:** file-extension renames; minimal type annotations on public API surface; `any` as transitional escape hatch (max 15 `@ts-expect-error` per ROADMAP); tsconfig expansion; ESLint parser swap.

**Out of scope:** strict type-safety everywhere (ROADMAP caps strict type work — use `any` for transitional pain); new features; refactoring logic; touching `_scripts/` `.js` files (those stay `.js` for now, optional scope-creep); `bot/**` workspace (separate); any `.test.js` changes beyond rename (tests keep existing behavior).

</domain>

<carryforward>
## Prior Decisions Carried Forward

- D-04/D-09-10/D-10-10/D-11-09 bisect discipline
- No Co-Authored-By; no `--no-verify`; explicit `git add <path>`
- `bot/**` pre-existing dirty + `src/**` pre-existing carry-forward (iracing-sdk-utils.test.js CRLF; main.js PascalCase rename) — do NOT stage
- LINT-03: `npm install` clean
- Lint band ≤1881
- TypeScript + typescript-eslint/parser dual-parser coexistence (v1.4 Phase 7 pattern) — preserved in `eslint.config.js` entry 5 (`tseslint.config({ files: ['**/*.ts'], ... })`); Phase 12 inverts the relationship — `@typescript-eslint/parser` becomes primary, `@babel/eslint-parser` for `_scripts/` only

</carryforward>

<decisions>
## Implementation Decisions

### D-12-01 — Transitional strictness: `strict: true` (current) + `any` allowed
**Rationale:** tsconfig already has `strict: true`. Phase 12 does NOT relax this. Instead, the bar is:
- Public APIs (exports) SHOULD have explicit types
- Internal functions MAY use `any` as escape hatch
- `@ts-expect-error` with TODO comment allowed, capped at 15 project-wide (ROADMAP)
- No new `@ts-ignore` (use `@ts-expect-error` — surfaces when fixed)

### D-12-02 — Conversion ordering: low-risk files first
**Rationale:** Order minimizes integration pain:
1. `src/utilities/` (6 files — pure functions, minimal deps)
2. `src/main/` (5 files — Electron main; coupled to Node APIs)
3. `src/renderer/` (2 files — main.js, router/index.js; coupled to Vue/Oruga)
4. `*.vue` SFCs (10 files — script blocks only)
5. `*.test.js` → `*.test.ts` (5 files — after their source modules are converted)

### D-12-03 — `eslint.config.js` parser swap
**Rationale:** After Phase 12 close:
- `.ts` + `.vue` → `@typescript-eslint/parser` (primary)
- `_scripts/` `.js` files (if any remain) → `@babel/eslint-parser` (secondary, scoped)
- If `_scripts/` doesn't have `.js` files (all in `_scripts/` already migrated or deleted via Phase 9), `@babel/eslint-parser` can be RETIRED

Check: `ls _scripts/*.js` — currently `build-dev.js`, `release.js`, `installer.nsh`. First two are JS, last is NSIS. So `@babel/eslint-parser` stays for those.

### D-12-04 — `tsconfig.json` expansion
Before: `"include": ["src/utilities"]` (only 6 files type-checked)
After: `"include": ["src/**/*", "src/**/*.vue"]` (all 28 files type-checked via `tsc --noEmit`)

### D-12-05 — Conversion method: `git mv` + manual type annotations
**Rationale:** Use `git mv foo.js foo.ts` so git tracks the rename (preserves blame history). Type annotations added in same commit. Fix `tsc --noEmit` errors on a per-file basis.

### D-12-06 — Commit shape: per-directory batches
**Rationale:** Each directory (utilities, main, renderer, vue, tests) gets its own content commit. 5-6 commits total:
1. `refactor(ts): convert src/utilities/*.js to .ts`
2. `refactor(ts): convert src/main/*.js to .ts`
3. `refactor(ts): convert src/renderer/*.js to .ts`
4. `refactor(ts): migrate 10 .vue SFCs to <script lang="ts">`
5. `refactor(ts): convert *.test.js to *.test.ts`
6. `refactor(lint): swap @typescript-eslint/parser as primary; tsconfig include expansion`

### D-12-07 — Vitest config extension change
**Rationale:** `vitest.config.mjs` `test.include: ['src/**/*.test.{js,ts}']` already accepts both. No change needed until tests are renamed.

### D-12-08 — Type annotations: pragmatic, not dogmatic
**Rationale:**
- Imported modules with no types available: `// @ts-expect-error — <lib> has no types`
- Electron IPC handlers: type the channel name + args minimally
- Vue SFC `<script lang="ts">`: default to implicit Options API inference; add `defineComponent` import only where needed
- Oruga component refs: `any` allowed (Oruga has partial TS support)
- Don't install additional `@types/*` packages unless a build-blocking type error surfaces

### D-12-09 — Test file handling
**Rationale:** Rename `*.test.js` → `*.test.ts`; update imports if relative paths change; Vitest transparently supports both. Tests MUST continue to pass 256/256 with zero logic changes.

### Claude's Discretion
- Whether specific `any` sites should be typed more precisely — case-by-case
- Whether to install `@types/node` (likely yes — electron main uses Node builtins)
- Whether the `@ts-expect-error` budget of 15 is plenty or needs expansion — planner decides mid-execution
- Whether to delete `@babel/eslint-parser` entirely after Phase 12 — planner confirms via `_scripts/` grep

</decisions>

<code_context>
## Existing Code Insights

### File inventory (empirical)

**src/main/ (5 source + 2 test):**
- index.js (Electron main entrypoint, window creation, IPC)
- iracing-sdk-utils.js + .test.js (irsdk-node helpers)
- iracing-sdk.js (irsdk wrapper)
- main-utils.js + .test.js (shared main-process utils)
- window-utils.js (window management)

**src/renderer/ (2 .js + 10 .vue):**
- main.js (Vue bootstrap)
- router/index.js (vue-router 4 routes)
- App.vue, ChangelogModal.vue, HelpModal.vue, PromoCard.vue, Settings.vue, SettingsModal.vue, SideBar.vue, TitleBar.vue
- views/Home.vue, views/Worker.vue

**src/utilities/ (3 source + 3 test):**
- config.js
- desktop-capture.js + .test.js
- filenameFormat.js
- iracing-config-checks.js + .test.js
- logger.js
- screenshot-name.js + .test.js

### Current tsconfig.json
```json
{
  "compilerOptions": {
    "target": "esnext",
    "moduleResolution": "node",
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src/utilities"]
}
```

- `allowJs: true` + `strict: true` already in place — Phase 12 just widens `include`
- Already typechecks utilities/ via Babel's TS transform (Phase 5)

### ESLint config
Current entry 5 (from Phase 11 rewrite):
```javascript
...tseslint.config({
  files: ['**/*.ts'],
  extends: [tseslint.configs.recommended],
}),
```

Phase 12 inverts:
- `**/*.ts` + `**/*.vue` → `@typescript-eslint/parser` as primary
- `_scripts/**/*.js` → `@babel/eslint-parser` scoped
- Root project `.js` files (eslint.config.js itself, etc.) → `@babel/eslint-parser`

</code_context>

<specifics>
## Specific Requirements (ROADMAP Phase 12)

1. All files in `src/main/`, `src/renderer/`, `src/utilities/` are `.ts` (or `.vue` with `<script lang="ts">`)
2. `tsconfig.json` `include` expanded to `["src/**/*", "src/**/*.vue"]`
3. `npx tsc --noEmit` returns zero errors for `src/` (hard limit); ≤15 `@ts-expect-error` instances total
4. `eslint.config.js` uses `@typescript-eslint/parser` as primary for `.ts/.vue`; `@babel/eslint-parser` scoped to `_scripts/` `.js` or retired
5. `npm test` 256/256; lint ≤1881; builds clean

</specifics>

<deferred>
## Deferred Ideas

- `_scripts/*.js` → `.ts` conversion (optional; defer to v2.1)
- `bot/**` `.js` → `.ts` (explicitly out of v2.0)
- Stricter tsconfig flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`) — v2.1 candidates per ROADMAP "Next Milestone Candidates"
- Type definitions for Oruga UI components — upstream PR territory

</deferred>

<canonical_refs>
- `.planning/phases/12-js-to-ts/12-CONTEXT.md` (this file)
- `.planning/ROADMAP.md` §"Phase 12 (was 15): .js → .ts conversion + typescript-eslint/parser primary"
- `.planning/REQUIREMENTS.md` §TS-03, TS-04
- `tsconfig.json`, `eslint.config.js`, `package.json` `scripts.type-check`
- All 28 source files (18 `.js` + 10 `.vue`)

</canonical_refs>
