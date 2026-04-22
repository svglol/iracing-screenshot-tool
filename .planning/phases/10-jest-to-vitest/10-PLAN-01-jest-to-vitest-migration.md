---
phase: 10-jest-to-vitest
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - vitest.config.mjs
  - src/main/iracing-sdk-utils.test.js
  - src/utilities/iracing-config-checks.test.js
autonomous: true
requirements: [BUNDLER-02]
tags: [vitest, jest-migration, test-runner]

must_haves:
  truths:
    - "jest retired from root devDependencies; vitest installed"
    - "vitest.config.mjs exists at project root with correct include/exclude"
    - "package.json jest block deleted; scripts rewired to vitest"
    - "All 5 test files pass under vitest (256/256)"
    - "bot/ tests still run via bot/npm test unchanged"
    - "npm install clean with zero ERESOLVE, no --legacy-peer-deps"
    - "npm run build still produces installer"
  artifacts:
    - path: "vitest.config.mjs"
      provides: "Vitest config with globals/env/include/exclude"
      contains: "defineConfig"
    - path: "package.json"
      provides: "vitest devDep, jest removal, scripts rewire"
      contains: "\"vitest\":"
  key_links:
    - from: "package.json scripts.test"
      to: "vitest run --passWithNoTests"
      via: "scripts"
      pattern: "vitest run"
---

<objective>
Migrate root test runner from Jest 30 to Vitest. Five test files (256 tests) port over with mechanical `jest.* → vi.*` rewrites. `bot/` workspace keeps its Jest config unchanged. `npm run build` and `npm run dev` must still work end-to-end.

Two-commit bisect shape per D-10-10: commit 1 swaps deps; commit 2 rewires config + rewrites test files + updates scripts. Between the two, tests will be broken (config not yet in place) — that's intentional, Plan commit 2 restores green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/10-jest-to-vitest/10-CONTEXT.md

@package.json
@src/main/iracing-sdk-utils.test.js
@src/main/main-utils.test.js
@src/utilities/desktop-capture.test.js
@src/utilities/iracing-config-checks.test.js
@src/utilities/screenshot-name.test.js

<interfaces>
Vitest globals mode (mirrors Jest's implicit globals):
```javascript
// vitest.config.mjs
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{js,ts}'],
    exclude: ['node_modules/**', '.tools/**', 'dist/**', 'build/**', 'out/**', 'bot/**'],
  },
});
```

Jest → Vitest API mapping (applies to this codebase):
- `jest.mock(moduleName, factory)` → `vi.mock(moduleName, factory)`
- `jest.fn()` → `vi.fn()`
- `jest.spyOn(obj, 'method')` → `vi.spyOn(obj, 'method')`
- `jest.clearAllMocks()` → `vi.clearAllMocks()` (not used here but noted)
- `jest.resetModules()` → `vi.resetModules()` (not used here)
- With `globals: true`, `describe/test/it/expect/beforeEach/afterEach` unchanged
- `vi` is the global object in vitest (equivalent to jest's `jest` global)

For `jest.mock` factory mocks, the most common Vitest gotcha is hoisting: Vitest hoists `vi.mock` calls to the top of the file (same as Jest), so factory-mock patterns with `require(...)` at the top level continue to work. The single factory-mock in this project (`jest.mock('irsdk-node', () => ({ ... }))`) ports verbatim.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Dep swap — remove jest, add vitest + @vitest/coverage-v8</name>
  <read_first>
    - package.json (current: "jest": "^30.3.0" under devDependencies)
    - Empirically check for jest-* transitives: `npm ls jest 2>&1 | head -30`
  </read_first>
  <action>
    Resolve latest vitest version:
    ```bash
    npm view vitest version
    npm view vitest peerDependencies
    npm view @vitest/coverage-v8 version
    ```
    Confirm vitest supports Vite 7.x (currently installed). If the latest stable is constrained to Vite <7, use the highest vitest version that supports Vite 7.

    Edit `package.json`:
    - Remove `"jest": "^30.3.0"` from devDependencies
    - Add `"vitest": "^X.Y.Z"` (latest stable that supports Vite 7)
    - Add `"@vitest/coverage-v8": "^X.Y.Z"` matching vitest version
    - Do NOT touch `bot/package.json`

    Delete the `"jest": { "testPathIgnorePatterns": [...] }` block from package.json — Vitest's config file supersedes it.

    Run `npm install`. Verify:
    - Exit 0, no ERESOLVE, no `--legacy-peer-deps`
    - `node_modules/vitest/package.json` present
    - `node_modules/jest/` absent (or only in bot/node_modules which is separate)
    - `npm ls jest 2>&1` shows no root-level jest (bot/ may still list jest under bot/)
  </action>
  <verify>
    <automated>
      grep -c '"jest":' package.json  # returns 0 (scripts renamed to vitest; devDep removed; "jest" block removed)
      grep -c '"vitest":' package.json  # returns 1 (devDep present)
      grep -c '"@vitest/coverage-v8"' package.json  # returns 1
      test -d node_modules/vitest && echo OK
      test ! -d node_modules/jest && echo "jest removed" || echo "jest still present (may be transitive — check)"
    </automated>
  </verify>
  <acceptance_criteria>
    - package.json has vitest + @vitest/coverage-v8; no jest devDep
    - npm install exits 0 without --legacy-peer-deps
    - node_modules/vitest/ exists
    - No new HIGH/CRITICAL from `npm audit --audit-level=high`
  </acceptance_criteria>
  <done>
    Dep swap landed. Tests WILL fail at this commit (no vitest config yet; `npm test` still points at `jest`). Restored by Task 2+3+4.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create vitest.config.mjs</name>
  <read_first>
    - .planning/phases/10-jest-to-vitest/10-CONTEXT.md §D-10-02 through D-10-09
    - electron.vite.config.mjs (reference only — Vitest config is independent)
  </read_first>
  <action>
    Create `vitest.config.mjs` at project root with:

    ```javascript
    import { defineConfig } from 'vitest/config';

    export default defineConfig({
      test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.{js,ts}'],
        exclude: [
          'node_modules/**',
          '.tools/**',
          'dist/**',
          'build/**',
          'out/**',
          'bot/**',
        ],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'html', 'lcov'],
          exclude: [
            'node_modules/**',
            '.tools/**',
            'dist/**',
            'build/**',
            'out/**',
            'bot/**',
            '**/*.test.js',
            '**/*.config.*',
          ],
        },
      },
    });
    ```

    Verify by running `npx vitest run --no-color` (will fail on the jest.* calls in 2 test files — that's Task 3's fix, expected).
  </action>
  <verify>
    <automated>
      test -f vitest.config.mjs && echo OK
      grep -c "globals: true" vitest.config.mjs  # returns 1
      grep -c "environment: 'node'" vitest.config.mjs  # returns 1
      grep -c "'bot/\*\*'" vitest.config.mjs  # returns 1 (at minimum; may be in exclude array + coverage exclude)
    </automated>
  </verify>
  <acceptance_criteria>
    - vitest.config.mjs exists
    - Contains all 6 exclude entries + all include patterns
    - Coverage provider = 'v8'
  </acceptance_criteria>
  <done>
    Vitest config in place. Ready for test file rewrites.
  </done>
</task>

<task type="auto">
  <name>Task 3: Rewrite jest.* → vi.* in 2 test files</name>
  <read_first>
    - src/main/iracing-sdk-utils.test.js (1 jest.mock call at line ~5)
    - src/utilities/iracing-config-checks.test.js (7 jest.*/vi.* sites)
  </read_first>
  <action>
    For `src/main/iracing-sdk-utils.test.js`:
    - Replace `jest.mock(` with `vi.mock(` (global replace in file)
    - No other jest.* calls expected

    For `src/utilities/iracing-config-checks.test.js`:
    - Replace `jest.mock(` with `vi.mock(`
    - Replace `jest.fn(` with `vi.fn(`
    - Replace `jest.spyOn(` with `vi.spyOn(`
    - Replace any `jest.clearAllMocks(` with `vi.clearAllMocks(` (if present)
    - Replace any `jest.resetModules(` with `vi.resetModules(` (if present)
    - Replace any `jest.restoreAllMocks(` with `vi.restoreAllMocks(` (if present)

    DO NOT touch the other 3 test files — they contain zero jest.* calls.

    Run `npx vitest run` to verify all 5 files pass.
  </action>
  <verify>
    <automated>
      grep -c "jest\." src/main/iracing-sdk-utils.test.js  # returns 0
      grep -c "jest\." src/utilities/iracing-config-checks.test.js  # returns 0
      grep -c "vi\." src/main/iracing-sdk-utils.test.js  # returns ≥ 1
      grep -c "vi\." src/utilities/iracing-config-checks.test.js  # returns ≥ 7
      grep -l "jest\." src/main/main-utils.test.js src/utilities/desktop-capture.test.js src/utilities/screenshot-name.test.js 2>/dev/null | wc -l  # returns 0 (none of these should have jest refs)
      npx vitest run --no-color 2>&1 | tail -5  # expect "256 passed" or similar
    </automated>
  </verify>
  <acceptance_criteria>
    - Zero `jest.` references in src/**/*.test.js
    - `npx vitest run` exits 0 with 256/256 tests passing
    - Same behavior as Jest — no test logic changes
  </acceptance_criteria>
  <done>
    Test files use Vitest API. 256/256 green.
  </done>
</task>

<task type="auto">
  <name>Task 4: Rewire package.json scripts + split commit-2 staging</name>
  <read_first>
    - package.json (current jest/jest:coverage/jest:watch/test/test:watch scripts)
  </read_first>
  <action>
    In package.json `scripts`:

    **Remove:**
    - `"jest": "jest"`
    - `"jest:coverage": "jest --collect-coverage"`
    - `"jest:watch": "jest --watch"`

    **Replace test scripts:**
    - `"test": "jest --passWithNoTests"` → `"test": "vitest run --passWithNoTests"`
    - `"test:watch": "run-s rebuild:node jest:watch --passWithNoTests"` → `"test:watch": "run-s rebuild:node test:watch-vitest --passWithNoTests"` — wait, `test:watch` calls `jest:watch` which we're removing. Simplify:
      - New `"test:watch": "vitest --passWithNoTests"` (drop rebuild:node pre-hook; vitest's watcher doesn't need native-module rebuild unless a test mock-imports sharp/irsdk-node — verify via smoke test)

    **Add:**
    - `"test:coverage": "vitest run --coverage --passWithNoTests"` (replaces the deleted `jest:coverage` in a namespaced form)

    Run `npm test` to verify end-to-end (256/256 under Vitest).

    Also verify `npm run build` still produces an installer (sanity check — Vitest shouldn't affect build, but catch any transitive impact).
  </action>
  <verify>
    <automated>
      grep -c '"jest"' package.json  # returns 0 (script, devDep, config block all gone)
      grep -c '"jest:' package.json  # returns 0
      grep -c '"test": "vitest run' package.json  # returns 1
      grep -c '"test:coverage": "vitest run --coverage' package.json  # returns 1
      grep -c '"test:watch": "vitest' package.json  # returns 1
      npm test 2>&1 | tail -5  # expect "256 passed" or similar
    </automated>
  </verify>
  <acceptance_criteria>
    - Zero `"jest"` entries anywhere in package.json (script, devDep, config block)
    - All test scripts use vitest
    - `npm test` returns exit 0 with 256/256
    - `npm run build` still produces installer (smoke test)
  </acceptance_criteria>
  <done>
    Scripts rewired. `npm test` runs Vitest natively. `bot/` tests still run via bot/npm test.
  </done>
</task>

<task type="auto">
  <name>Task 5: Verify bot/ unchanged + commit the two-commit chain</name>
  <read_first>
    - bot/package.json (should be untouched)
  </read_first>
  <action>
    Verify bot/ tests still work:
    ```bash
    (cd bot && npm test 2>&1 | tail -10)
    ```
    Expected: bot tests pass (count should match prior baseline; ROADMAP says 294 but actual may differ — capture the number in plan summary).

    Commit 1 (deps only):
    ```bash
    git add package.json package-lock.json
    git commit -m "chore(deps): add vitest + coverage-v8; remove jest from root devDependencies"
    ```

    Commit 2 (config + tests + scripts):
    ```bash
    git add vitest.config.mjs src/main/iracing-sdk-utils.test.js src/utilities/iracing-config-checks.test.js package.json
    git commit -m "refactor(test): migrate 5 test files + scripts to Vitest"
    ```

    Note: the Task 1 devDep removal + Task 4 scripts rewire BOTH touch package.json. Since Commit 1 staged only the Task-1 version (devDeps + block removal), but by the time we commit, package.json ALSO has the Task-4 scripts rewire — we need to stage only the relevant diff for Commit 1.

    **Recommended staging approach:**
    - After Task 1 lands (devDeps gone, jest block gone), DON'T commit yet
    - After Task 4 lands (scripts rewired), stage in two passes:
      - `git add -p package.json` → in the interactive hunks, stage the devDependency + jest-block-removal hunks for Commit 1
      - Commit those + package-lock.json
      - Then stage the remaining scripts hunks for Commit 2
      - Commit them with config + test files

    If interactive staging is too fiddly, fall back to a single combined commit: `refactor(test): migrate root test runner from Jest to Vitest` covering everything — acceptable minimum-scope derogation of D-10-10 when the 2-commit split would be fragile. Document the deviation in the plan summary.

    After both commits land:
    ```bash
    npm test  # final verification: 256/256
    npm run lint  # verify ≤1881
    npm run build  # verify installer still produced (optional; skip if time-constrained)
    ```
  </action>
  <verify>
    <automated>
      git log --oneline -3 | head -3
      git log --oneline -3 | grep -cE "vitest|Vitest"  # ≥1
      (cd bot && npm test 2>&1 | grep -c "passed") # ≥1
      grep -c "jest" package.json  # returns 0 (fully purged)
      npm test 2>&1 | tail -3  # 256 passed
    </automated>
  </verify>
  <acceptance_criteria>
    - Two commits on master (or one if minimum-scope derogation documented)
    - `npm test` = 256/256
    - `bot/npm test` unchanged count (document in summary)
    - `npm run lint` ≤1881
    - Zero `jest` references in root package.json
  </acceptance_criteria>
  <done>
    Phase 10 complete. Jest retired; Vitest the root test runner.
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → local node_modules | Two new packages (vitest, @vitest/coverage-v8) + transitives |
| Test runner → module resolution | Vitest uses Vite's module resolution; may differ from Jest's CommonJS-first resolver for edge cases |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-10-01 | Tampering | vitest + @vitest/coverage-v8 supply chain | mitigate | Pin via `^` on latest stable. `npm audit` on install; review any new HIGH/CRITICAL findings. |
| T-10-02 | Denial of Service | Vitest module resolution differs from Jest — a test file that silently worked under Jest may fail under Vitest | accept | Task 3's verify step runs `npx vitest run` across all 5 files; any resolution failure surfaces immediately and is fixed before commit. |
| T-10-03 | Denial of Service | `vi.mock` hoisting semantics differ from Jest in corner cases | accept | The single factory-mock in this project is a straightforward module-level `jest.mock('irsdk-node', () => ({...}))` — Vitest's hoisting is the same for this pattern. If a subtle regression surfaces, `vi.hoisted()` helper restores explicit control. |
| T-10-04 | Integrity | bot/ test config accidentally modified | mitigate | Task 5 explicitly runs `(cd bot && npm test)` to confirm bot stays green; explicit `git add <path>` staging never touches `bot/**`. |

Block threshold: none — straightforward test-runner swap.

</threat_model>

<verification>

After all 5 tasks complete:

1. `grep -c "jest" package.json` → 0 (fully purged: no devDep, no script, no config block)
2. `grep -c "vitest" package.json` → ≥3 (devDep, @vitest/coverage-v8, scripts.test, scripts.test:watch, scripts.test:coverage)
3. `test -f vitest.config.mjs` → present
4. `npm install` → clean, no `--legacy-peer-deps`
5. `npm test` → 256/256 under Vitest
6. `(cd bot && npm test)` → bot tests still pass, count matches pre-Phase-10 baseline
7. `npm run lint` → ≤1881 problems
8. `npm run build` → installer still produced in `build/` (sanity check — not a hard gate if time-constrained)
9. Two commits (or one with documented derogation) landed with correct prefixes
10. bot/** dirty state (21 files pre-existing) unchanged

</verification>

<success_criteria>

Plan 10-01 complete when:
- [ ] jest retired from root devDependencies; vitest installed
- [ ] vitest.config.mjs at project root with correct include/exclude/coverage
- [ ] `"jest": { ... }` block removed from package.json
- [ ] 2 test files rewritten (jest.* → vi.*); 3 test files unchanged
- [ ] Scripts rewired: test, test:watch, test:coverage all use vitest
- [ ] `npm test` = 256/256
- [ ] `bot/npm test` unchanged count (documented in SUMMARY)
- [ ] Two commits (or one with derogation note) landed on master
- [ ] 10-01-SUMMARY.md at `.planning/phases/10-jest-to-vitest/10-01-SUMMARY.md` documenting:
  - vitest version pinned
  - Bot test count (baseline for future phases)
  - Any `vi.*` API differences that surfaced during rewrite
  - Any peer-dep warnings during install
  - Commit SHAs
- [ ] bot/** untouched; no Co-Authored-By; no --no-verify
- [ ] STATE.md + ROADMAP.md updated

</success_criteria>

<output>
After completion, create `.planning/phases/10-jest-to-vitest/10-01-SUMMARY.md` with:
- Vitest + @vitest/coverage-v8 pinned versions
- Bot test count (via `(cd bot && npm test)`) — establish baseline
- Two commit SHAs (or one, if minimum-scope derogation used — document rationale)
- Any `vi.*` call sites changed beyond the expected jest.*  → vi.* mechanical swap
- Confirmation that Phase 10 ROADMAP success criteria #1-5 all PASS
- Note: 4 REQ-IDs touched — BUNDLER-02 closes here
</output>
