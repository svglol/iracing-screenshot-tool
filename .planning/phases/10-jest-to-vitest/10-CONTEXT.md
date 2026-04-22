# Phase 10: Jest 25 → Vitest — Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Auto-generated (`/gsd-discuss-phase 10 --auto`) — recommended defaults selected per gray area.

<domain>
## Phase Boundary

Migrate the root test runner from Jest to Vitest. All 5 test files (256 tests) port over. `jest` / `@types/jest` devDeps retire; `vitest` added. `vitest.config.mjs` (or reuse shared config in `electron.vite.config.mjs`) replaces the inline `"jest"` block in package.json. `test`/`test:watch`/`test:coverage` scripts rewire to `vitest` / `vitest --watch` / `vitest --coverage`. `bot/` workspace KEEPS its own Jest config (REQUIREMENTS.md explicitly scopes bot/ out of v2.0 Vitest work) — 294 bot tests continue running via `bot/npm test` unchanged.

**In scope:** 5 `.test.js` files under `src/` (iracing-sdk-utils, main-utils, desktop-capture, iracing-config-checks, screenshot-name); the `jest` config block in package.json; jest-era devDeps; test scripts; any `jest.mock`/`jest.fn`/`jest.spyOn` call sites.

**Out of scope:** `bot/**` Jest config + tests (separate workspace); adding new tests; changing test assertions/expectations; TS conversion (Phase 12).

</domain>

<carryforward>
## Prior Decisions Carried Forward

From v1.4 + Phase 8 + Phase 9:
- D-04/D-09-10 bisect discipline: dep swap + content changes in separate commits
- No `Co-Authored-By`, no `--no-verify`, explicit `git add <path>`
- `bot/**` pre-existing dirty files remain untouched — never stage or commit
- LINT-03 gate: `npm install` clean with zero ERESOLVE, no `--legacy-peer-deps`
- Lint band ≤1881 problems — attribute deltas to rule-set changes only
- No Vite config in `.ts` yet (Phase 12 territory) — Vitest config stays in `.mjs`

From codebase scout:
- 5 test files, 256 tests, 0 snapshots, ~0.6s runtime under Jest 30
- Jest API usage is minimal: only `jest.mock` (2 files: iracing-sdk-utils.test.js + iracing-config-checks.test.js), `jest.fn`, `jest.spyOn` — all have drop-in Vitest equivalents (`vi.mock` / `vi.fn` / `vi.spyOn`)
- All tests use CommonJS `require()` (not ESM import) — Vitest handles both natively via Vite
- No jest.setup.js / setupFilesAfterEach / globalSetup / globalTeardown — zero custom harness
- No snapshot files — no `--update-snapshot` migration concern
- Project has `electron.vite.config.mjs` from Phase 9 — Vitest can share it via `defineConfig` merging, but defer to the research phase to decide
- Test scripts use `jest --passWithNoTests` — Vitest has `--passWithNoTests` as well
- `jest` was bumped to ^30.3.0 somewhere in v1.4 (newer than the ROADMAP's stated "Jest 25"). Use the installed version's behavior as the baseline.

</carryforward>

<decisions>
## Implementation Decisions

### D-10-01 — Vitest version: latest stable compatible with Vite 7.x
**Rationale:** Project is on Vite 7.1.12 (from Phase 9). Vitest 2.x and 3.x both support Vite 7 — researcher pins the latest stable at plan time via `npm view vitest version`. Vitest ships with Vite-native config, so no additional Vite plugin juggling needed.

### D-10-02 — Vitest config: standalone `vitest.config.mjs` at project root
**Rationale:** Options considered:
  - **(a) Standalone `vitest.config.mjs`** — RECOMMENDED. Clean separation from electron-vite build config. Easy to delete if ever needed. Vitest resolves it by convention.
  - (b) Merge into `electron.vite.config.mjs` via a `test` property — would couple test config to electron-vite's sub-config shape, which doesn't have a native `test` slot. Not a clean fit.
  - (c) Inline under `vite.config.js` — not applicable (project uses electron.vite.config.mjs, not plain vite.config.js).
**Config shape:** 
  ```javascript
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      globals: true,           // so `describe`/`test`/`expect` work without explicit imports (matches Jest)
      environment: 'node',     // src/main + src/utilities tests — no DOM needed
      include: ['src/**/*.test.{js,ts}'],
      exclude: ['node_modules/**', 'dist/**', 'build/**', 'out/**', '.tools/**', 'bot/**'],
    },
  });
  ```

### D-10-03 — Config language: `.mjs` (match Phase 9 electron.vite.config.mjs)
**Rationale:** Consistency with Phase 9's `.mjs` decision. Phase 12 will migrate all config files to `.ts` in one sweep.

### D-10-04 — Test environment: `node` (global), DOM on-demand via comment directive
**Rationale:** All 5 current test files test pure Node modules (iracing-sdk-utils, main-utils, desktop-capture, iracing-config-checks, screenshot-name) — no DOM required. Default env stays `node`. If future Vue SFC tests land, use `// @vitest-environment happy-dom` or `jsdom` at the top of specific test files; don't pay the setup cost globally.

### D-10-05 — Globals mode ON (`globals: true`)
**Rationale:** Keeps all 5 existing tests working without adding `import { describe, test, expect, vi } from 'vitest'` headers to every file. Minimal diff; fastest path to green. If we ever want strict mode, flip globals off and add imports in a cleanup pass (post-v2.0 candidate).

### D-10-06 — `jest.*` → `vi.*` mechanical rewrite
**Rationale:** Two files use `jest.mock` / `jest.fn` / `jest.spyOn`. Vitest's `vi.*` API is API-compatible for these. Rewrite via global find-replace + spot-check. No semantic changes.

**Sites:**
- `src/main/iracing-sdk-utils.test.js:5` — `jest.mock('irsdk-node', () => ({ ... }))`
- `src/utilities/iracing-config-checks.test.js` — 7 occurrences per Grep count

### D-10-07 — Package.json cleanup: retire `jest`/`jest-*` devDeps; drop the `"jest": { ... }` block
**Rationale:** `jest` + any `jest-*` transitives remove. `testPathIgnorePatterns` (currently `/node_modules/`, `/.tools/`, `/dist/`, `/build/`, `/bot/`) ports to Vitest's `test.exclude` array. Rotation: all these + the Phase 9 `out/**` addition belong in the new `vitest.config.mjs`.

### D-10-08 — Scripts rewire
**Rationale:**
```json
{
  "test": "vitest run --passWithNoTests",
  "test:watch": "vitest --passWithNoTests",
  "test:coverage": "vitest run --coverage"
}
```
`jest` / `jest:coverage` / `jest:watch` scripts deleted outright (no back-compat shim — they're unused externally, per grep of CI/docs if any exist). `--passWithNoTests` preserved because it's still relevant when Vitest filters with a pattern that matches zero files.

### D-10-09 — Coverage provider: `v8` (built-in, no extra install)
**Rationale:** Vitest supports two coverage providers — `v8` (built into Node) and `istanbul` (requires `@vitest/coverage-istanbul`). Use `v8` — no new dep, faster, modern. If specific report formats (e.g., `lcov`) break downstream tooling, revisit.

### D-10-10 — Bisect shape: two commits
**Rationale:**
1. `chore(deps): add vitest; remove jest + jest-related devDependencies` — dep swap only
2. `refactor(test): migrate test config + jest.* → vi.* across 5 test files` — content changes (vitest.config.mjs + package.json jest block removal + test file rewrites + scripts rewire)

If commit 2 gets large (expected: ~50 lines of diff split across 6 files), consider splitting into 2a (config + scripts) and 2b (test file rewrites). Planner decides at plan time.

### Claude's Discretion
- Whether to add `test.reporters` (default reporter is fine for local dev; CI may want `default` + `junit` if CI ever exists — defer)
- Whether to pin a specific `happy-dom`/`jsdom` version now for future DOM tests — defer, no need yet
- Whether to enable Vitest `ui` mode as a script — skip; no user has asked for it

</decisions>

<code_context>
## Existing Code Insights

### Test file inventory
- `src/main/iracing-sdk-utils.test.js` — uses `jest.mock('irsdk-node', () => ({ CameraState: {...} }))` at the top
- `src/main/main-utils.test.js` — no jest.* calls; plain `describe`/`test`/`expect`
- `src/utilities/desktop-capture.test.js` — no jest.* calls
- `src/utilities/iracing-config-checks.test.js` — 7 `jest.mock`/`jest.fn`/`jest.spyOn` calls
- `src/utilities/screenshot-name.test.js` — no jest.* calls

### Jest-era devDeps to retire
- `jest` (currently `^30.3.0` — newer than ROADMAP's "Jest 25" — research baseline accordingly)
- Any `jest-*` transitive that resolves here (check `npm ls jest` for the full tree); candidates: `@types/jest` (NOT in current devDeps per earlier scan), `babel-jest` (unlikely after Phase 5 Babel renames)

### package.json `"jest"` config block
Full content:
```json
"jest": {
  "testPathIgnorePatterns": [
    "/node_modules/",
    "/.tools/",
    "/dist/",
    "/build/",
    "/bot/"
  ]
}
```
→ maps to `vitest.config.mjs` `test.exclude: ['node_modules/**', '.tools/**', 'dist/**', 'build/**', 'out/**', 'bot/**']` (note: add `out/**` from Phase 9, convert glob style).

### Bot workspace (out of scope)
`bot/package.json` has its own `"test": "jest"` script and `bot/jest.config.*`. Phase 10 NEVER touches `bot/`. Phase 10 verification must prove `bot/npm test` still runs 294/294 (or whatever its current count is) unchanged.

### Integration points
- `npm test` in this project is currently `jest --passWithNoTests`. After Phase 10: `vitest run --passWithNoTests`.
- CI: repo has no `.github/workflows/` (verify — if it exists, update there too). No GitHub Actions running these tests today.
- Any `.vscode/launch.json` debug configs referencing Jest — search for, update if present.

</code_context>

<specifics>
## Specific Requirements (ROADMAP Phase 10 success criteria)

1. `jest` + `babel-jest` removed from root `devDependencies` (`bot/` unchanged); `vitest` added at latest stable
2. `vitest.config.mjs` exists; excludes `bot/**`, `dist/**`, `build/**`, `.tools/**`, `out/**`
3. `npm run test` runs 256/256 under Vitest; assertion API compatible (Vitest provides Jest-compatible `expect` by default)
4. `bot/` tests still run separately via `bot/npm test` with its own Jest config unchanged (294/294)
5. `npm run lint` in v1.4 band; builds clean

Planner verification must include: run `npm test`, confirm 256/256; run `bot/npm test`, confirm bot test count unchanged; run `npm run lint`, confirm ≤1881; run `npm run build`, confirm installer still produced.

</specifics>

<deferred>
## Deferred Ideas

- Vitest UI mode (`vitest --ui`) — useful but unnecessary for phase goal
- `@vitest/coverage-istanbul` for non-v8 coverage reports — defer unless a specific report format breaks
- Migrating `bot/` Jest config to Vitest — explicitly out of scope (REQUIREMENTS.md + v2.1 candidate)
- Adding test.reporters for CI output — no CI exists today
- Test file globbing convention change (e.g., `*.spec.ts` instead of `*.test.js`) — defer to Phase 12 if TS conversion touches test files

</deferred>

<canonical_refs>
## Canonical References

- `.planning/phases/10-jest-to-vitest/10-CONTEXT.md` (this file)
- `.planning/ROADMAP.md` §"Phase 10 (was 12): Jest 25 → Vitest"
- `.planning/REQUIREMENTS.md` §BUNDLER-02
- `src/main/iracing-sdk-utils.test.js`, `src/main/main-utils.test.js`, `src/utilities/desktop-capture.test.js`, `src/utilities/iracing-config-checks.test.js`, `src/utilities/screenshot-name.test.js` (the 5 test files)
- `package.json` — `scripts`, `devDependencies`, `"jest"` block
- `electron.vite.config.mjs` (Phase 9 — reference only; Vitest gets its own config)
- https://vitest.dev/config/
- https://vitest.dev/guide/migration.html (Jest → Vitest migration guide)

</canonical_refs>
