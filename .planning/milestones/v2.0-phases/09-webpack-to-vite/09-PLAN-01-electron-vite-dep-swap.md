---
phase: 09-webpack-to-vite
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - electron.vite.config.mjs
autonomous: true
requirements: [BUNDLER-01]
tags: [bundler, vite, electron-vite, dep-swap, d-09-10-commit-1]
must_haves:
  truths:
    - "electron-vite@^5 + @vitejs/plugin-vue@^5 are installed in devDependencies"
    - "All 15 webpack-era devDependencies are removed from package.json"
    - "npm install exits 0 with zero ERESOLVE and without --legacy-peer-deps"
    - "electron.vite.config.mjs skeleton exists at project root and parses without syntax error"
    - "Build is intentionally broken at end of this plan (no functional configs or script rewiring yet — next plan)"
  artifacts:
    - path: "package.json"
      provides: "Vite-era devDependencies pinned; 15 webpack-era entries gone"
      contains: "electron-vite"
    - path: "package-lock.json"
      provides: "Locked transitive tree for electron-vite + @vitejs/plugin-vue"
    - path: "electron.vite.config.mjs"
      provides: "Placeholder-but-valid config so `electron-vite --help` works and later plans can fill it"
      min_lines: 10
  key_links:
    - from: "package.json devDependencies"
      to: "node_modules/electron-vite/"
      via: "npm install"
      pattern: "electron-vite"
    - from: "package.json devDependencies"
      to: "node_modules/@vitejs/plugin-vue/"
      via: "npm install"
      pattern: "@vitejs/plugin-vue"
---

<objective>
Land the dep swap as the first commit in the Phase 9 three-commit bisect chain (D-09-10 commit 1). Add `electron-vite@^5` + `@vitejs/plugin-vue@^5` to devDependencies and remove the 15 retired webpack-era devDependencies in a single `chore(deps)` commit. Drop in a minimal `electron.vite.config.mjs` skeleton so `electron-vite --help` resolves; the config is intentionally incomplete — Plan 09-03 flushes it out. Build is intentionally broken at end of this plan: `npm run dev` and `npm run pack:*` still reference webpack and will fail; that is by design per D-09-10 (`git bisect` between this commit and HEAD~1 isolates dep regressions). Verify A1/A2/A3 (electron-vite Electron-41 peer, plugin-vue vue-3.5 peer, ERESOLVE-clean install) empirically during this plan.

Purpose: Establish a clean dep state before any code churn. Retiring 15 packages + adding 2 is a substantial transitive-tree shift — isolating it in one commit means a later bisect across Phase 9 can cleanly attribute any regression to "dep swap" vs "config migration" vs "electron-builder integration".

Output: One `chore(deps): add electron-vite + @vitejs/plugin-vue; remove 15 webpack devDependencies` commit (package.json + package-lock.json + electron.vite.config.mjs skeleton), plus a `docs(09-01): ...` commit for this plan's SUMMARY.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-webpack-to-vite/09-CONTEXT.md
@.planning/phases/09-webpack-to-vite/09-RESEARCH.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@package.json
@.planning/phases/08-vue3-core-merged/08-06-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify A1/A2/A3/A5 empirically before editing</name>
  <read_first>
    - package.json devDependencies block (lines 67-121) and dependencies block (lines 45-66)
    - 09-RESEARCH.md §Assumptions to Verify at Plan Time (table rows A1, A2, A3, A5)
  </read_first>
  <action>
    Run these commands and record output in the scratch notes (summary will reproduce verbatim):

    1. `node --version` — confirm Node ≥ 20.19 (electron-vite@^5 peer requirement)
    2. `npm view electron-vite version` — confirm a 5.x version is latest-stable (or record actual major)
    3. `npm view electron-vite peerDependencies` — confirm no explicit Electron-version constraint that excludes 41 (A1). If it lists a range, note whether 41 falls inside.
    4. `npm view @vitejs/plugin-vue version peerDependencies` — confirm vue@^3.5 compatible (A2)
    5. `grep -n '"sharp"' package.json` — confirm sharp is in `dependencies` (not devDependencies) so `externalizeDepsPlugin()` will pick it up (A5). Expected: line ~59, inside the `"dependencies"` block
    6. `grep -cE "icons['\"]" src/` via Grep tool (glob: src/**/*.{js,vue,scss}) — confirm zero matches for `icons/` alias usage (A6). Expected: 0 matches → the `icons` alias defined in `_scripts/webpack.renderer.config.js:113` is dead; RESEARCH.md canonical config includes it conditionally — DO NOT port it to `electron.vite.config.mjs`.
    7. `ls _icons/ 2>&1` — expected: "No such file or directory" on this project (empirical planner finding). Confirms the alias is dead regardless of grep result.

    If A1 or A2 surfaces an incompatibility (explicit peer exclusion), STOP and document in the plan SUMMARY's "Blocking Finding" section before proceeding — this plan cannot land. The fallback per D-09-01 is `vite-plugin-electron` (not this plan's scope; becomes a mini-revision). If A3 surfaces ERESOLVE in Task 3, that's a Task-3-blocker, not a Task-1-blocker.
  </action>
  <verify>
    <automated>
    # Node version must be ≥ 20.19
    node --version | awk -F. '{ gsub(/^v/,"",$1); if ($1+0 > 20 || ($1+0 == 20 && $2+0 >= 19) || $1+0 >= 22) print "OK"; else print "FAIL"; }' | grep -q OK
    # sharp is in dependencies (test by checking it's above the devDependencies line)
    awk '/"dependencies": \{/,/^    \},/' package.json | grep -q '"sharp"'
    </automated>
  </verify>
  <acceptance_criteria>
    - Node ≥ 20.19 confirmed
    - electron-vite + @vitejs/plugin-vue peer ranges record in scratch notes (will be pasted into SUMMARY)
    - sharp confirmed in dependencies
    - `icons/` alias usage confirmed zero (A6 conclusion: drop the alias in Plan 09-03)
    - `_icons/` directory confirmed absent
  </acceptance_criteria>
  <done>Empirical verification complete; scratch notes ready for SUMMARY's "Assumption Outcomes" table.</done>
</task>

<task type="auto">
  <name>Task 2: Edit package.json — remove 15 webpack devDeps, add 2 Vite devDeps</name>
  <read_first>
    - Current package.json devDependencies block (lines 67-121)
    - 09-RESEARCH.md §Devdependencies Diff (CANONICAL) — the exact list of 15 to remove and 2 to add
  </read_first>
  <action>
    Using the Edit tool on `package.json`, make these changes **in one edit pass** (do not run npm install yet):

    **Remove these 15 devDependencies** (entries to delete — exact key names):
      1. `babel-loader`
      2. `copy-webpack-plugin`
      3. `css-loader`
      4. `file-loader`
      5. `html-webpack-plugin`
      6. `mini-css-extract-plugin`
      7. `node-loader`
      8. `sass-loader`
      9. `style-loader`
      10. `tree-kill` (used only by `_scripts/dev-runner.js`; dev-runner retires in Plan 09-04 but the dep is dead the moment electron-vite takes over — remove now, don't let it linger)
      11. `url-loader`
      12. `vue-loader`
      13. `vue-style-loader`
      14. `webpack`
      15. `webpack-cli`
      16. `webpack-dev-server`

    NOTE: Count is 16 not 15 because `tree-kill` is an oversight in RESEARCH's "15 removed" list — verify by checking `_scripts/dev-runner.js` imports `tree-kill` (it does: line 7 `const kill = require('tree-kill')`) and no other consumer exists (Grep: `require\(.tree-kill.\)|from .tree-kill.` across src/, _scripts/, bot/ — expected: 1 match in dev-runner.js only). Document this delta in the SUMMARY. If Grep surfaces other consumers, KEEP `tree-kill` and note it as a partial-removal.

    **Also remove these two** (retained by mistake in RESEARCH's "remove" list verification):
      - `chalk` — ONLY consumer is `_scripts/dev-runner.js` (line 3); dies with dev-runner in Plan 09-04. BUT: verify no other consumers first via Grep `require\(.chalk.\)|from .chalk.` across src/, _scripts/, bot/. If consumers exist, KEEP chalk. Document outcome either way.

    **Add these 2 devDependencies** (under devDependencies, alphabetical insertion — both use caret `^` pinning):
      - `"electron-vite": "^<version from Task 1>"` — use the exact major.minor from `npm view electron-vite version` (expected ^5.x)
      - `"@vitejs/plugin-vue": "^<version from Task 1>"` — use the exact major.minor from `npm view @vitejs/plugin-vue version` (expected ^5.x)

    Preserve alphabetical sort of the devDependencies block. `@vitejs/plugin-vue` sorts before `@vue/devtools`. `electron-vite` sorts between `electron-debug` and `eslint`.

    DO NOT edit `scripts`, `main`, `build.files`, or anything else in this plan. Script rewiring is Plan 09-04; `main` + `build.files` is Plan 09-05.
  </action>
  <verify>
    <automated>
    # 15-16 webpack/loader deps gone
    for dep in babel-loader copy-webpack-plugin css-loader file-loader html-webpack-plugin mini-css-extract-plugin node-loader sass-loader style-loader url-loader vue-loader vue-style-loader webpack webpack-cli webpack-dev-server; do
      ! grep -q "\"$dep\":" package.json || { echo "FAIL: $dep still present"; exit 1; }
    done
    # 2 Vite deps present
    grep -q '"electron-vite":' package.json
    grep -q '"@vitejs/plugin-vue":' package.json
    # JSON parseable (no trailing-comma breakage)
    node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
    </automated>
  </verify>
  <acceptance_criteria>
    - Exactly the 15 (or 16 w/ tree-kill) named devDeps removed
    - `electron-vite` + `@vitejs/plugin-vue` present with caret ranges
    - JSON parses clean
    - Alphabetical order preserved in devDependencies block
  </acceptance_criteria>
  <done>package.json diff ready for commit; no `npm install` yet.</done>
</task>

<task type="auto">
  <name>Task 3: Run npm install + verify A3 (ERESOLVE-clean) + create electron.vite.config.mjs skeleton</name>
  <read_first>
    - 09-RESEARCH.md §Config File Pattern (CANONICAL) — but only the top-level `defineConfig({ main: {}, renderer: {} })` skeleton is needed here; DO NOT port the full externals/aliases/define blocks (those land in Plan 09-03 after HTML + main-URL are in place from Plan 09-02)
    - 09-CONTEXT.md §D-09-02 — confirms `.mjs` extension (not `.ts`)
  </read_first>
  <action>
    1. Run `npm install` — NO `--legacy-peer-deps` flag (per carried-forward LINT-03 gate). Observe the exit code and full stderr/stdout.

       **Expected outcomes:**
       - Exit 0
       - No `ERESOLVE` strings in stderr
       - `npm WARN deprecated ...` strings may appear for transitive packages; that's fine (pre-existing pattern)

       **If `npm install` surfaces ERESOLVE:** capture the full block into the SUMMARY's "Deviations" section. Do NOT auto-bridge with `--legacy-peer-deps` — per D-08-18 precedent, an ERESOLVE surfacing in Phase 9 is a signal that a peer-dep conflict exists that must be resolved before the plan proceeds. Options:
         (a) If conflict is `electron-vite` ↔ another dep → fall back to `vite-plugin-electron` (D-09-01 escape hatch) and re-do this plan with that package instead
         (b) If conflict is a residual transitive from the removed webpack-era deps → check if `npm dedupe` resolves (run it; re-run `npm install`)
         (c) If unresolvable → STOP the plan, document in SUMMARY, hand back to the user

    2. Run `npm ls electron-vite @vitejs/plugin-vue` — confirm both installed top-level at the versions specified in package.json. Record full output in SUMMARY.

    3. Run `npx electron-vite --help` — confirm the CLI is reachable. Expected output: a brief usage line listing subcommands `dev`, `build`, `preview`, `init`. Exit 0.

    4. Create `electron.vite.config.mjs` at project root with this exact skeleton (minimal valid — Plan 09-03 fleshes it out):

       ```javascript
       import { defineConfig } from 'electron-vite';

       export default defineConfig({
         main: {},
         renderer: {},
       });
       ```

       5 lines + 1 trailing newline. No `@vitejs/plugin-vue` import yet (Plan 09-03 adds). No `externalizeDepsPlugin`, no aliases, no define blocks, no css.preprocessorOptions. This is a **placeholder** so `electron-vite --help` and `electron-vite dev --config electron.vite.config.mjs` both resolve at CLI-parse time. Running `electron-vite build` against this config will fail (no entry points resolved) — that is expected and is the "build broken by design" state for Plan 09-01.

    5. Run `npx electron-vite --config electron.vite.config.mjs --help` to verify the config parses syntactically (not semantically — no entry points exist yet). Expected: usage output, exit 0. If exit non-zero and the error references "entry" or "input", that's fine — we haven't defined entries yet. If the error references "config" or "parse", the skeleton has a syntax error; fix before proceeding.
  </action>
  <verify>
    <automated>
    # Clean install, no ERESOLVE
    npm install 2>&1 | tee /tmp/npm-install-09-01.log
    ! grep -qi 'ERESOLVE' /tmp/npm-install-09-01.log
    # Vite deps in the tree
    npm ls electron-vite @vitejs/plugin-vue 2>&1 | grep -q 'electron-vite@'
    npm ls electron-vite @vitejs/plugin-vue 2>&1 | grep -q '@vitejs/plugin-vue@'
    # CLI resolves
    npx electron-vite --help 2>&1 | grep -qiE 'usage|dev|build'
    # Skeleton parses
    node --input-type=module -e "const c = await import('./electron.vite.config.mjs'); console.log(typeof c.default)" | grep -q 'object\|function'
    </automated>
  </verify>
  <acceptance_criteria>
    - `npm install` exit 0 with no ERESOLVE
    - `npm ls electron-vite @vitejs/plugin-vue` shows both at expected caret-pinned versions
    - `npx electron-vite --help` resolves (CLI reachable)
    - `electron.vite.config.mjs` file exists at project root
    - Config module imports clean under Node ESM loader
  </acceptance_criteria>
  <done>Vite dep tree clean + skeleton config in place; ready for commit.</done>
</task>

<task type="auto">
  <name>Task 4: Commit the dep swap (D-09-10 commit 1)</name>
  <read_first>
    - 09-CONTEXT.md §D-09-10 (three-commit chain) and carryforward (no Co-Authored-By, no --no-verify, explicit `git add <path>`, bot/** untouched)
    - 09-RESEARCH.md §Commit Plan commit 1 message text
  </read_first>
  <action>
    1. Confirm `bot/**` dirty files are untouched: `git status --short | grep -E '^ M bot|^\?\? bot'` — expected count ≥ 20 (pre-existing dirty state per Phase 8 precedent). Record count in SUMMARY. DO NOT stage these.

    2. Stage ONLY the in-scope files explicitly:
       ```
       git add package.json
       git add package-lock.json
       git add electron.vite.config.mjs
       ```

    3. Verify the staged diff contains only those three paths:
       ```
       git diff --cached --name-only
       ```
       Expected output (exactly 3 lines):
       ```
       electron.vite.config.mjs
       package-lock.json
       package.json
       ```
       If ANY additional path appears (especially anything under `bot/` or `src/`), STOP and unstage before proceeding.

    4. Commit with this exact message (no Co-Authored-By, no --no-verify):
       ```
       chore(deps): add electron-vite + @vitejs/plugin-vue; remove 15 webpack devDependencies
       ```
       (Use heredoc or a single `-m` — no multiline body needed; all context is in the SUMMARY.)

    5. Verify the commit landed clean:
       - `git log -1 --format=%s` → matches the message exactly
       - `git log -1 --format=%B | grep -c "Co-Authored"` → 0
       - `git show --stat HEAD` → exactly 3 files (package.json, package-lock.json, electron.vite.config.mjs)

    6. Run `npm test` — confirm 256/256 still passing. This is the LINT-03-adjacent gate from CONTEXT's carryforward; dep swap must not regress the test count. If any test fails that was passing before the dep swap, investigate before proceeding to the SUMMARY. Most likely cause would be a jest-config regression from removing one of the loaders (unlikely since Jest's babel transform is handled via `@babel/core` + `@babel/preset-env` which are NOT in the removal list).

    7. Run `npm run lint 2>&1 | tail -5` — confirm lint count within v1.4 band (≤1881 problems). Record exact count in SUMMARY. Expected: around 734 (matches Phase 8 Plan 06 baseline).
  </action>
  <verify>
    <automated>
    git log -1 --format=%s | grep -qE '^chore\(deps\): add electron-vite'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    git show --stat HEAD --format= | grep -E '^ package\.json|^ package-lock\.json|^ electron\.vite\.config\.mjs' | wc -l | grep -q '^3$'
    npm test 2>&1 | grep -qE '256 passed'
    </automated>
  </verify>
  <acceptance_criteria>
    - Exactly one new commit on master with the canonical message
    - Commit diff is exactly 3 files
    - No Co-Authored-By footer
    - `bot/**` dirty files still dirty + unstaged
    - `npm test` 256/256 green
    - `npm run lint` ≤ 1881 problems
  </acceptance_criteria>
  <done>D-09-10 commit 1 landed; dep tree clean; build intentionally broken; ready for Plan 09-02.</done>
</task>

<task type="auto">
  <name>Task 5: Write 09-01-SUMMARY.md and commit it</name>
  <read_first>
    - $HOME/.claude/get-shit-done/templates/summary.md
    - Scratch notes from Tasks 1-4 (A1/A2/A3/A5/A6 empirical outcomes, exact versions installed, install log summary, commit SHA)
  </read_first>
  <action>
    Create `.planning/phases/09-webpack-to-vite/09-01-SUMMARY.md` following the summary template. Required sections:

    - YAML frontmatter (phase/plan/subsystem/tags/requires/provides/affects/requirements/tech_stack/key_files/decisions/metrics)
      - `tech_stack.added`: exact versions of electron-vite + @vitejs/plugin-vue (from `npm ls` output in Task 3)
      - `tech_stack.removed`: 15 or 16 exact packages (depends on Task 2 tree-kill/chalk outcome) with the versions they were at before removal (pulled from the pre-edit package.json snapshot — use `git show HEAD~1:package.json | grep <pkg>` if needed)
    - **Empirical Assumption Outcomes** table with rows A1, A2, A3, A5, A6 — each with Hypothesis / Outcome / Evidence columns (match Phase 8 summaries' format — see 08-06-SUMMARY.md:68-76 for canonical shape)
    - **Installed Versions** section with the `npm ls electron-vite @vitejs/plugin-vue` output
    - **npm audit (--audit-level=high)** — count only; audit delta vs Phase 8 Plan 06 baseline (9 vulns: 6 low / 2 moderate / 1 high). If count changed, attribute to removed/added packages.
    - **Build + Test + Lint Gates** — note that `npm run pack:*` is intentionally broken post-commit (webpack removed but scripts still reference it); test + lint still green.
    - **Commit** section with the SHA and message of the dep-swap commit.
    - **Deviations from Plan** — document any `tree-kill`/`chalk` scope decisions (removed-vs-kept) + any ERESOLVE/fallback outcomes.
    - **Threat Model Dispositions** — at minimum restate T-09-01-01 (supply-chain tampering on electron-vite + @vitejs/plugin-vue) with the mitigation ("npm audit post-install + caret-pinned").
    - **Self-Check** — verify that the committed state matches (file existence + commit SHA + bot/** untouched).
    - **Notes for Plan 09-02** — highlight that `electron.vite.config.mjs` is a skeleton; Plan 09-02 does HTML+main-URL migration first, Plan 09-03 fleshes the config.

    After writing the SUMMARY, stage and commit it separately:
    ```
    git add .planning/phases/09-webpack-to-vite/09-01-SUMMARY.md
    git commit -m "docs(09-01): complete electron-vite dep swap plan"
    ```
    (No --no-verify, no Co-Authored-By.)
  </action>
  <verify>
    <automated>
    test -f .planning/phases/09-webpack-to-vite/09-01-SUMMARY.md
    git log -1 --format=%s | grep -qE '^docs\(09-01\):'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    </automated>
  </verify>
  <acceptance_criteria>
    - SUMMARY.md exists, contains all required sections
    - SUMMARY's commit SHA matches HEAD~1
    - `docs(09-01): ...` commit on master
    - No Co-Authored-By
  </acceptance_criteria>
  <done>Plan 09-01 closes; two commits on master (1 content, 1 docs); ready for Plan 09-02.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → devDependencies | New packages `electron-vite` + `@vitejs/plugin-vue` + their transitive tree enter the build-time trust surface. Supply-chain attack would be build-time code execution (maintainer-account compromise, malicious postinstall). |
| removed packages → stale node_modules | The 15 removed packages' node_modules directories leave via `npm install`; no residual code paths. |
| electron.vite.config.mjs → Node runtime | New top-level file loaded by the electron-vite CLI at build time. Since this plan's config is a skeleton, attack surface is minimal. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-01-01 | Tampering (Supply-chain) | `electron-vite` + `@vitejs/plugin-vue` + transitive tree | mitigate | Caret-pinned in package.json; `package-lock.json` captures full resolved tree; `npm audit --audit-level=high` run post-install and any new HIGH finding documented in SUMMARY; no `--legacy-peer-deps` (any ERESOLVE surfaces an intended conflict, not silently bridged) |
| T-09-01-02 | Denial of Service (CI/developer) | `npm install` ERESOLVE blocks development | mitigate | A3 empirically verified in Task 3; if surfaced, D-09-01 fallback (`vite-plugin-electron`) is the documented escape hatch — plan SUMMARY records the fallback invocation |
| T-09-01-03 | Information Disclosure (secrets in logs) | Build output / npm install logs | accept | No secrets traverse `npm install` or `electron-vite --help`; logs are local-only in this plan |
| T-09-01-04 | Elevation of Privilege | `electron-vite` postinstall scripts | mitigate | `npm install` with `ignore-scripts=false` (default) runs any postinstall; `electron-vite` has no known postinstall per research; transitive `esbuild` runs platform-binary install — standard Vite surface. `npm audit --audit-level=high` catches any NEW critical findings |

**Block threshold:** HIGH — any new HIGH-severity finding from `npm audit` on `electron-vite`/`@vitejs/plugin-vue` (not pre-existing devDep-chain ones carried forward from Phase 8) blocks this plan's commit until triaged.
</threat_model>

<verification>

Consolidated verification (run at end of Task 4, before Task 5 SUMMARY):

```bash
# Dep state
grep -cE '"(webpack|webpack-cli|webpack-dev-server|babel-loader|copy-webpack-plugin|css-loader|file-loader|html-webpack-plugin|mini-css-extract-plugin|node-loader|sass-loader|style-loader|url-loader|vue-loader|vue-style-loader)":' package.json
# Expected: 0

grep -cE '"(electron-vite|@vitejs/plugin-vue)":' package.json
# Expected: 2

# Install + CLI
npm ls electron-vite @vitejs/plugin-vue 2>&1 | grep -cE 'electron-vite@|@vitejs/plugin-vue@'
# Expected: ≥ 2

npx electron-vite --help 2>&1 | grep -cE 'usage|dev|build'
# Expected: ≥ 1

# Skeleton config
test -f electron.vite.config.mjs && wc -l electron.vite.config.mjs
# Expected: file exists, 5-10 lines

# Test + lint bands
npm test 2>&1 | grep -E '256 passed|Tests:'
# Expected: "256 passed, 256 total"

npm run lint 2>&1 | tail -3 | grep -oE '[0-9]+ problems' | head -1
# Expected: a number ≤ 1881

# Commit discipline
git log -2 --format='%s' | head -2
# Expected:
#   docs(09-01): complete electron-vite dep swap plan
#   chore(deps): add electron-vite + @vitejs/plugin-vue; remove 15 webpack devDependencies

git log -1 --format=%B HEAD~1 | grep -c 'Co-Authored'
# Expected: 0

# bot/** untouched
git status --short | grep -cE '^[ ]?M bot|^\?\? bot'
# Expected: ≥ 20 (pre-existing dirty state preserved)
```

</verification>

<success_criteria>

- [ ] Empirical A1/A2/A3/A5/A6 verification complete; outcomes captured
- [ ] 15 webpack-era devDependencies removed from package.json
- [ ] `electron-vite@^5` + `@vitejs/plugin-vue@^5` added to devDependencies
- [ ] `npm install` exits 0 with no ERESOLVE and no `--legacy-peer-deps`
- [ ] `electron.vite.config.mjs` skeleton exists and parses clean
- [ ] `npx electron-vite --help` resolves
- [ ] `npm test` 256/256 green
- [ ] `npm run lint` ≤ 1881 problems
- [ ] D-09-10 commit 1 (`chore(deps): ...`) landed on master with exactly 3 files
- [ ] No Co-Authored-By on the content commit
- [ ] `bot/**` pre-existing dirty files untouched + unstaged
- [ ] 09-01-SUMMARY.md created + committed as `docs(09-01): ...`
- [ ] Threat register T-09-01-01..04 dispositioned

</success_criteria>

<output>

After completion, create `.planning/phases/09-webpack-to-vite/09-01-SUMMARY.md` capturing:
- Empirical outcomes for assumptions A1, A2, A3, A5, A6
- Exact installed versions (`npm ls` output)
- `npm audit` delta vs Phase 8 Plan 06 baseline
- Commit SHA + full message
- Build state at plan close: INTENTIONALLY BROKEN (pack scripts reference webpack; Plan 09-02/09-03/09-04 restore functional build)
- Test + lint gate compliance (256/256, ≤ 1881)
- Notes for Plan 09-02 (HTML + main-URL migration is next; config stays skeleton until Plan 09-03)

Commit as `docs(09-01): complete electron-vite dep swap plan`.

</output>
