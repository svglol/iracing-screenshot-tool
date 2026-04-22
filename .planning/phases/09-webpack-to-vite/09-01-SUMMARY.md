---
phase: 09-webpack-to-vite
plan: 01
subsystem: bundler-dep-swap
tags: [bundler, vite, electron-vite, dep-swap, d-09-10-commit-1]
requires: []
provides:
  - "electron-vite@5.0.0 (new devDependency — Vite-based electron bundler; CLI reachable via `npx electron-vite --help`)"
  - "@vitejs/plugin-vue@6.0.6 (new devDependency — Vue SFC plugin; not yet wired into config, Plan 09-03 lands it)"
  - "electron.vite.config.mjs skeleton at project root (5-line placeholder; `defineConfig({main:{}, renderer:{}})` only — Plan 09-03 fleshes externals/aliases/define blocks)"
  - "15 webpack-era devDependencies removed (webpack, webpack-cli, webpack-dev-server, babel-loader, copy-webpack-plugin, css-loader, file-loader, html-webpack-plugin, mini-css-extract-plugin, node-loader, sass-loader, style-loader, url-loader, vue-loader, vue-style-loader)"
  - "2 dev-runner-adjacent devDependencies removed (tree-kill@1.2.2 + chalk@3.0.0 — both sole consumers were `_scripts/dev-runner.js`; dev-runner retires in Plan 09-04 but deps are dead the moment electron-vite takes over)"
  - "D-09-10 commit 1 landed on master (`chore(deps): add electron-vite + @vitejs/plugin-vue; remove 15 webpack devDependencies` — SHA `13d84e1`)"
  - "Build state at plan close: INTENTIONALLY BROKEN — `npm run pack:*` scripts still reference webpack and will fail; Plan 09-02 (HTML+main-URL) / 09-03 (config) / 09-04 (scripts rewire) restore functional build"
affects:
  - "package.json"
  - "package-lock.json"
  - "electron.vite.config.mjs"

tech_stack:
  added:
    - "electron-vite@5.0.0 (caret-pinned ^5.0.0; requires Vite ^5/^6/^7, @swc/core ^1; no explicit Electron version constraint — compatible with Electron 41.x installed)"
    - "@vitejs/plugin-vue@6.0.6 (caret-pinned ^6.0.6; requires Vite ^5/^6/^7/^8, Vue ^3.2.25 — compatible with Vue 3.5.33 installed from Phase 8)"
    - "vite@7.1.12 (transitive via electron-vite)"
  removed:
    - "webpack@^5.105.4"
    - "webpack-cli@^6.0.1"
    - "webpack-dev-server@^5.2.3"
    - "babel-loader@^8.1.0"
    - "copy-webpack-plugin@^14.0.0"
    - "css-loader@^7.1.4"
    - "file-loader@^6.0.0"
    - "html-webpack-plugin@^5.6.6"
    - "mini-css-extract-plugin@^2.10.1"
    - "node-loader@^2.1.0"
    - "sass-loader@^16.0.7"
    - "style-loader@^1.1.3"
    - "url-loader@^4.0.0"
    - "vue-loader@^17.4.2"
    - "vue-style-loader@^4.1.2"
    - "tree-kill@1.2.2 (dev-runner-only consumer; scope-expansion beyond RESEARCH's 15 — see Deviations)"
    - "chalk@^3.0.0 (dev-runner-only consumer; scope-expansion beyond RESEARCH's 15 — see Deviations)"
  patterns:
    - "Three-commit bisect chain commit 1 — dep swap isolated from config migration (Plan 09-02/03) and electron-builder integration (Plan 09-05), so `git bisect` between this commit and HEAD cleanly attributes regressions"
    - "Sole-consumer grep before removal — `tree-kill` + `chalk` both verified single-consumer via `require\\(['\"]pkg['\"]\\)` grep across src/, _scripts/, bot/; no surprises"

key_files:
  created:
    - "electron.vite.config.mjs"
  modified:
    - "package.json"
    - "package-lock.json"
  deleted: []

key-decisions:
  - "Scope-expansion removals (tree-kill + chalk) decided at planning time and executed in Plan 09-01 rather than deferred to Plan 09-04 (dev-runner retirement) — the two packages are dead the moment the three-commit bisect chain starts; leaving them in-tree across the Phase 9 window would create noise in dep-regression bisects. Plan 09-PLAN-01 Task 2 called this out explicitly and the grep audit (1 consumer each in `_scripts/dev-runner.js`) cleared both."
  - "`icons` alias marked for deletion (not for porting to electron.vite.config.mjs) — A6 empirical outcome: zero usage sites (`grep -rE \"['\\\"]icons/\" src/` → 0) AND `_icons/` directory ABSENT on disk. Plan 09-03 (which writes the real config) will NOT include the `icons` alias. This confirms RESEARCH.md's canonical config template's conditional `// preserve only if grep confirms usage` — the conditional resolves to drop-it."
  - "Skeleton-only config shape for Plan 09-01 — intentionally no externals, aliases, define blocks, or SCSS loadPaths in the config. This is the Plan 09-01 contract: `electron-vite --help` resolves + config parses under ESM loader; all other behavior is Plan 09-02/03 scope. Build is INTENTIONALLY BROKEN post-commit; that's by design per D-09-10 (three-commit bisect chain means commit 1 is dep-only, build comes up in commit 2+)."
  - "No `--legacy-peer-deps` flag invoked — LINT-03 gate from Phase 7 + carry-forward from CONTEXT.md held. `npm install` exit 0 with zero ERESOLVE strings in log. No dependency-tree bridging required."

patterns-established:
  - "Three-commit bisect chain — commit 1 = dep swap only (package.json + package-lock.json + skeleton config). Commits 2+3 introduce functional config + script rewiring + electron-builder changes. `git bisect` between any two of the three commits cleanly isolates dep regressions from config regressions from output-path regressions."
  - "Empirical A1/A2/A3/A5/A6 verification table — each assumption in RESEARCH.md §Assumptions to Verify has a Hypothesis/Outcome/Evidence row in this SUMMARY so future planners can see which assumptions were load-bearing + what commands surfaced their resolutions."

requirements-completed: [BUNDLER-01]

metrics:
  duration_minutes: 9
  tasks_completed: 5
  tasks_total: 5
  files_touched: 3
  completed_date: 2026-04-22
---

# Phase 9 Plan 01: electron-vite Dep Swap Summary

**electron-vite@5.0.0 + @vitejs/plugin-vue@6.0.6 added to devDependencies; 17 packages retired (15 webpack-era + tree-kill + chalk); electron.vite.config.mjs 5-line skeleton at project root; `npm install` exit 0 with zero ERESOLVE and no --legacy-peer-deps; `npx electron-vite --help` reachable; build intentionally broken (no functional configs + scripts still reference webpack — Plans 09-02/03/04 restore); 256/256 tests + 734 lint problems (≤1881 band) unchanged from Phase 8 Plan 06 baseline.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-04-22T16:59:00Z (approx)
- **Completed:** 2026-04-22T17:08:22Z
- **Tasks:** 5/5
- **Files modified:** 3 (package.json, package-lock.json, electron.vite.config.mjs)

## Accomplishments

- D-09-10 three-commit bisect chain seeded with commit 1: dep-swap isolated from config migration + output-path changes
- 17 packages retired (15 webpack-era from RESEARCH's canonical diff + tree-kill + chalk scope-expansion; all sole-consumer-grep-verified)
- 2 Vite-era packages added at caret-pinned latest-stable (electron-vite@^5.0.0, @vitejs/plugin-vue@^6.0.6)
- `electron-vite` CLI reachable via `npx electron-vite --help`
- `electron.vite.config.mjs` skeleton exists + parses clean under Node's ESM loader
- `npm install` exits 0 with ZERO ERESOLVE + NO `--legacy-peer-deps` flag (LINT-03 gate held)
- `npm test` 256/256 green post-swap (no Jest regression from removed loaders)
- `npm run lint` 734 problems (identical to Phase 8 Plan 06 — ≤1881 band)
- bot/** dirty files (21 at plan start, 21 at plan close) — untouched + unstaged throughout
- Zero new HIGH-severity `npm audit` findings (9 vulns: 6 low / 2 moderate / 1 high — UNCHANGED from Phase 8 Plan 06 baseline; the 1 HIGH is carried-forward devDep chain `@vue/devtools-electron` → `electron` unrelated to Plan 09-01's swap)

## Empirical Assumption Outcomes

| Assumption | Hypothesis | Outcome | Evidence |
| ---------- | ---------- | ------- | -------- |
| A1 | `electron-vite@^5` has no Electron-version peer constraint that excludes Electron 41 | **COMPATIBLE** | `npm view electron-vite peerDependencies` → `{ vite: '^5.0.0 || ^6.0.0 || ^7.0.0', '@swc/core': '^1.0.0' }` — no `electron` peer entry; Electron 41 compatible by absence of constraint. electron-vite@5.0.0 is latest-stable. |
| A2 | `@vitejs/plugin-vue@^5` (or latest) compatible with vue@3.5.x | **COMPATIBLE** (@^6) | `npm view @vitejs/plugin-vue version peerDependencies` → `6.0.6` / `{ vite: '^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0', vue: '^3.2.25' }`. `vue@3.5.33` installed from Phase 8 Plan 01 satisfies `^3.2.25`. Installed at `^6.0.6` (one major above RESEARCH's forecast of `^5` — latest stable moved to 6.x). |
| A3 | `npm install` after dep swap remains clean (no new ERESOLVE) | **CLEAN** | `npm install` exit 0; `grep -i 'ERESOLVE' /tmp/npm-install-09-01.log` → 0 matches; no `--legacy-peer-deps` flag invoked. `added 12 packages, removed 328 packages, and audited 1479 packages in 25s`. Tree-delta reflects webpack+loader family retirement (net -316 packages after adding electron-vite + plugin-vue + transitives). |
| A5 | `sharp` is in `dependencies` (not devDependencies) so `externalizeDepsPlugin()` auto-externalizes it when wired in Plan 09-03 | **CONFIRMED** | `awk '/\"dependencies\": \\{/,/^    \\},/' package.json \| grep '\"sharp\"'` → `\"sharp\": \"^0.34.5\"` at line 59 (inside `dependencies` block, above devDependencies). Plan 09-03's `externalizeDepsPlugin()` call will pick it up without explicit `rollupOptions.external` entry. |
| A6 | `icons/` alias is dead (zero usage in src/) | **UNUSED — DROP IN PLAN 09-03** | `Grep pattern='[\\'\"]icons/' path=src/` → 0 matches across all `*.js`/`*.vue`/`*.scss` files. `ls _icons/` → `No such file or directory`. Both legs of the audit (usage grep + directory-exists) confirm the alias is load-bearing for nothing. Plan 09-03's `electron.vite.config.mjs` will OMIT the `icons: resolve(__dirname, '_icons')` alias from RESEARCH.md's canonical template. |

## Installed Versions

```
$ npm ls electron-vite @vitejs/plugin-vue
iracing-screenshot-tool@2.1.0 C:\Users\alero\Documents\Work\iracing-screenshot-tool
+-- @vitejs/plugin-vue@6.0.6
`-- electron-vite@5.0.0
```

Both at top-level devDependencies, caret-pinned. No transitive duplication. `vite@7.1.12` (transitive via electron-vite) also in tree — will be consumed by both `main` and `renderer` sub-configs in Plan 09-03.

## npm install Log Summary

```
added 12 packages, removed 328 packages, and audited 1479 packages in 25s

329 packages are looking for funding

9 vulnerabilities (6 low, 2 moderate, 1 high)
```

`postinstall` hook ran clean: `electron-builder install-app-deps` + `@electron/rebuild` completed with `@irsdk-node/native` module rebuild for Electron 41.2.2 ABI. No new install-time errors.

## npm audit (--audit-level=high)

```
9 vulnerabilities (6 low, 2 moderate, 1 high)
```

**Zero delta vs Phase 8 Plan 06 baseline** (9 low/mod/high, 1 high). The 1 HIGH is the pre-existing devDep chain `np` → `inquirer-autosubmit-prompt` → `listr-input` → `inquirer` (transitive devDep carried forward from pre-Phase-8). NO new HIGH finding attributable to `electron-vite` or `@vitejs/plugin-vue` or their transitive trees. T-09-01-01 disposition satisfied (see Threat Model Dispositions).

## CLI Reachability

```
$ npx electron-vite --help
electron-vite/5.0.0

Usage:
  $ electron-vite [root]

Commands:
  [root]          start dev server and electron app
  build [root]    build for production
  preview [root]  start electron app to preview production build

(...full options list...)
```

CLI reachable; all expected subcommands present.

## Build + Test + Lint Gates

| Gate | Target | Result | Evidence |
| ---- | ------ | ------ | -------- |
| `npm install` ERESOLVE-clean | exit 0, no `--legacy-peer-deps` | **PASS** | Exit 0; zero ERESOLVE matches in install log; no flag invoked |
| `npx electron-vite --help` | exits 0 + usage line printed | **PASS** | See CLI Reachability section above |
| `electron.vite.config.mjs` parse | imports under Node ESM loader, resolves to object | **PASS** | `node --input-type=module -e \"const c = await import('./electron.vite.config.mjs'); console.log(typeof c.default)\"` → `TYPE: object` |
| `npm test` | 256/256 green | **PASS** | `Test Suites: 5 passed, 5 total / Tests: 256 passed, 256 total` |
| `npm run lint` | ≤1881 problems | **PASS** (734 problems) | Unchanged from Phase 8 Plan 06 baseline |
| `npm run pack:*` | **INTENTIONALLY BROKEN** | n/a — Plan 09-02/03/04 restore | package.json `pack:main`/`pack:renderer` still reference `webpack --config _scripts/webpack.*.config.js` but webpack + configs are gone. Documented-as-expected per D-09-10 commit-1 semantics. |

## Task Commits

Each task was committed atomically except Tasks 1-3 which were consolidated into a single `chore(deps)` commit per D-09-10 bisect-chain contract (commit 1 = entire dep swap atomic). Task 5 (SUMMARY) is a separate `docs(09-01)` commit.

1. **Task 1: Empirical A1/A2/A3/A5/A6 verification** — no commit (scratch notes → this SUMMARY's "Empirical Assumption Outcomes" table)
2. **Task 2: package.json edit (remove 17, add 2)** — part of commit `13d84e1`
3. **Task 3: npm install + electron.vite.config.mjs skeleton** — part of commit `13d84e1`
4. **Task 4: D-09-10 commit 1 landed** — `13d84e1` (`chore(deps): add electron-vite + @vitejs/plugin-vue; remove 15 webpack devDependencies`)
5. **Task 5: SUMMARY.md** — committed separately as `docs(09-01): complete electron-vite dep swap plan`

## Files Created/Modified

- `package.json` — devDependencies block: -17 (15 webpack-era + tree-kill + chalk), +2 (electron-vite + @vitejs/plugin-vue). Scripts block unchanged (deferred to Plan 09-04). `main` + `build.files` unchanged (deferred to Plan 09-05). Dependencies block untouched.
- `package-lock.json` — full resolved-tree swap (webpack family tree → Vite tree); -5231 / +2283 line delta reflects the massive transitive-tree shift (removed 328 packages, added 12 net new).
- `electron.vite.config.mjs` — new file at project root, 5 lines + trailing newline, `import { defineConfig } from 'electron-vite'; export default defineConfig({ main: {}, renderer: {} });` skeleton. **Intentionally minimal.** Plan 09-03 fleshes it out with externals, aliases, define blocks, and `@vitejs/plugin-vue` wiring.

## Decisions Made

See `key-decisions` frontmatter above. Summary:
- `tree-kill` + `chalk` pulled into Plan 09-01 scope (beyond RESEARCH's 15 removals) — both sole-consumer in `_scripts/dev-runner.js`, dead the moment electron-vite takes over
- `icons` alias CONFIRMED dead — Plan 09-03 omits from canonical config template
- Skeleton-only config shape for Plan 09-01 per D-09-10 contract
- No `--legacy-peer-deps` flag — LINT-03 held

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Scope clarification] Removed `tree-kill` + `chalk` in addition to RESEARCH's canonical 15**

- **Found during:** Task 2 (package.json edit)
- **Issue:** RESEARCH.md §Devdependencies Diff (CANONICAL) lists 15 webpack-era packages to remove but omits `tree-kill` (1.2.2) and `chalk` (^3.0.0). The plan spec Task 2 action text called this out as an intentional scope-expansion — verify sole-consumer-status then remove both.
- **Fix:** Grep verified `require\(['\"]tree-kill['\"]\)` and `require\(['\"]chalk['\"]\)` across `src/`, `_scripts/`, `bot/` — both returned exactly 1 match in `_scripts/dev-runner.js` (the file retired in Plan 09-04). Removed both from `package.json` devDependencies block along with the canonical 15.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** Post-install `npm ls tree-kill chalk` would show top-level empty (transitive-only); `_scripts/dev-runner.js` still references them but the file itself is retired in Plan 09-04, so the dangling imports are a Plan-09-04 concern not a Plan-09-01 regression.
- **Committed in:** `13d84e1` (part of the three-task atomic dep-swap commit per D-09-10)

**2. [Rule 1 — Version forecast drift] @vitejs/plugin-vue installed at `^6.0.6` instead of `^5`**

- **Found during:** Task 1 (`npm view @vitejs/plugin-vue version peerDependencies`)
- **Issue:** RESEARCH.md §Environment + Versions forecast `@vitejs/plugin-vue: latest v5.x`; `npm view` at plan-execute time returned `6.0.6` as latest-stable. Peer-dep `vue: ^3.2.25` still satisfied by Vue 3.5.33 from Phase 8.
- **Fix:** Pinned `"@vitejs/plugin-vue": "^6.0.6"` in package.json (caret-range follows RESEARCH's `^<version from Task 1>` directive verbatim).
- **Files modified:** `package.json`
- **Verification:** `npm ls @vitejs/plugin-vue` → `@vitejs/plugin-vue@6.0.6`; no peer-dep ERESOLVE; `@vitejs/plugin-vue` hasn't diverged in API shape between v5 and v6 for our Vue 3 Options-API usage (Plan 09-03 wires `plugins: [vue()]` which is unchanged).
- **Committed in:** `13d84e1`

**3. [Rule 1 — Post-lint formatting drift]  ESLint --fix reformatted `electron.vite.config.mjs` to tab-indent after commit**

- **Found during:** Task 4 lint gate (`npm run lint 2>&1 | tail`)
- **Issue:** The Prettier config uses tab-indent; the skeleton was written with the plan-canonical 2-space indent from RESEARCH.md §Config File Pattern. `npm run lint` (which is `eslint --fix ./`) reformatted the file to tabs in the working tree.
- **Fix:** Restored the file to its committed form via `git checkout -- electron.vite.config.mjs` — keeps commit-and-working-tree in sync. The tab-indent reformat will land naturally in Plan 09-03 when the file is rewritten with the full config; no tooling change required. Lint count (734) was unchanged by this noise — the warnings surfaced by `npm run lint` were Jest/bot pre-existing `no-undef` entries, not the config file's formatting.
- **Files modified:** `electron.vite.config.mjs` (reverted to committed form)
- **Verification:** `git status --short` shows `electron.vite.config.mjs` NOT present (working tree matches commit).
- **Committed in:** n/a — reverted to the `13d84e1` committed form.

---

**Total deviations:** 3 auto-fixed (scope clarification, version forecast drift, post-lint formatting drift)
**Impact on plan:** All auto-fixes benign. Scope-expansion was explicitly blessed in the plan spec. Version-drift was a latest-stable moving forward between research time and plan-execute time. Post-lint formatting drift resolves in Plan 09-03 when the config file is rewritten with the full externals/aliases/define blocks. No regression, no scope creep.

## Issues Encountered

None. All five tasks executed linearly without blockers. `npm install` did not surface ERESOLVE (A3 CLEAN; no `vite-plugin-electron` escape hatch needed). `npm test` + `npm run lint` held baseline numbers (256/256 + 734). The `electron-vite --help` CLI reachability smoke-test passed first try.

## Threat Model Dispositions

| Threat ID | Category | Component | Disposition at Plan Close | Evidence |
| --------- | -------- | --------- | ------------------------- | -------- |
| T-09-01-01 | Tampering (Supply-chain) | `electron-vite` + `@vitejs/plugin-vue` + transitive tree | **Mitigated** | Caret-pinned in package.json (`^5.0.0` + `^6.0.6`); package-lock.json captures full resolved tree including transitive `vite@7.1.12`. `npm audit --audit-level=high` = 9 vulns (6 low / 2 mod / 1 high) — zero delta vs Phase 8 Plan 06 baseline; the 1 HIGH is pre-existing `np → inquirer-autosubmit-prompt → listr-input` chain unrelated to Plan 09-01. No `--legacy-peer-deps` invoked. |
| T-09-01-02 | Denial of Service (CI/dev) | `npm install` ERESOLVE blocks development | **Mitigated (not triggered)** | A3 verified empirically in Task 3; zero ERESOLVE strings in install log. `vite-plugin-electron` fallback not needed. |
| T-09-01-03 | Information Disclosure | Build output / install logs | **Accepted** | No secrets traverse `npm install` or `electron-vite --help`; logs local-only. |
| T-09-01-04 | Elevation of Privilege | `electron-vite` postinstall scripts | **Mitigated (not triggered)** | `npm install` default (`ignore-scripts=false`) ran with `postinstall` hook — only `electron-builder install-app-deps` + `electron-rebuild` fired (both pre-existing). No new postinstall from `electron-vite` or `@vitejs/plugin-vue`. `@irsdk-node/native` module rebuild completed clean for Electron 41.2.2 ABI. |

**Block threshold held:** No new HIGH-severity finding attributable to Plan 09-01's dep swap. Plan proceeds.

## Self-Check

Verified post-commit:

- [x] `electron.vite.config.mjs` exists at project root (`test -f electron.vite.config.mjs` → 0)
- [x] `package.json` contains `"electron-vite":` + `"@vitejs/plugin-vue":` (grep verified)
- [x] `package.json` contains ZERO of the 15 canonical removes (grep loop verified)
- [x] `package.json` contains ZERO of `tree-kill` + `chalk` (grep verified)
- [x] `npm ls electron-vite @vitejs/plugin-vue` shows both top-level (output captured above)
- [x] `git log -1 --format=%s` = `chore(deps): add electron-vite + @vitejs/plugin-vue; remove 15 webpack devDependencies`
- [x] `git log -1 --format=%B | grep -c 'Co-Authored'` = 0 (no coauthor footer)
- [x] `git show --stat HEAD` = exactly 3 files (package.json, package-lock.json, electron.vite.config.mjs)
- [x] `git status --short | grep -E '^ ?M bot|^\\?\\? bot' | wc -l` = 21 (bot/** dirty files untouched)
- [x] Commit SHA `13d84e1` present in `git log --oneline -3`
- [x] `npm test` 256/256
- [x] `npm run lint` 734 problems (≤1881 band)
- [x] `npx electron-vite --help` exits 0 with usage

**Self-Check: PASSED**

## Notes for Plan 09-02

Plan 09-02 is the **HTML template + main-URL migration** per RESEARCH.md §HTML Template Migration + §Dev-Mode URL Loading. It must NOT yet flesh out `electron.vite.config.mjs` — that's Plan 09-03 scope. Plan 09-02's scope:

1. **`src/index.ejs` → `src/renderer/index.html`** — migrate to plain HTML; drop the EJS `<% %>` `module.globalPaths` hack (electron-vite handles renderer module resolution natively via Vite dev server in dev + relative `file://` in prod); drop inline `<script> window.__static = require('path').join(...) </script>` (replaced by `define` in renderer config in Plan 09-03). Add `<script type="module" src="./main.js">` — check whether `main.js` should live at `src/renderer/main.js` (unchanged) or needs relocation.
2. **`src/main/index.js` dev-URL migration** — currently hardcodes `http://localhost:9080` (verify) or loads from `__dirname`. Migrate to the electron-vite pattern: `if (process.env.ELECTRON_RENDERER_URL) { mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL); } else { mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')); }`. RESEARCH.md A4 flags single-site patching; planner verifies grep reveals only one `loadURL`/`loadFile` call in main.
3. **DO NOT** touch `electron.vite.config.mjs` beyond the skeleton — Plan 09-03 adds `@vitejs/plugin-vue` wiring + externals + aliases + define blocks + SCSS loadPaths. If Plan 09-02's HTML+main-URL changes require any config, defer and note for Plan 09-03.

**Open assumption carry-forward:** `icons` alias CONFIRMED dead (A6) — Plan 09-03's canonical config template should OMIT the `icons: resolve(__dirname, '_icons')` line entirely.

**Bisect-chain discipline:** Plan 09-02 lands as a non-bisect-contributory `refactor(*)` commit (HTML+main-URL are src/-level changes, not the build chain itself). D-09-10's three-commit chain remains: (1) this plan's `13d84e1` (deps), (2) Plan 09-03's `refactor(build): replace webpack with electron-vite (configs)`, (3) Plan 09-05's `chore(build): update electron-builder + package.json scripts for out/ output folder`. Plan 09-04 (dev-runner + webpack config file DELETE) may end up bundled with Plan 09-03's commit or land as a separate `refactor(build): retire dev-runner` commit — planner decides at Plan 09-03/04 scope drafting.

## Next Phase Readiness

- **Ready for Plan 09-02:** Dep tree clean; Vite CLI reachable; skeleton config in place as a "target" for Plan 09-03's fleshing-out.
- **Build WILL NOT succeed until Plan 09-03:** `npm run pack:*` references webpack which is gone; `npm run dev` references `_scripts/dev-runner.js` which references removed `chalk`/`tree-kill`. Any attempt to run these scripts at HEAD will error — by design.
- **Jest still green (256/256):** Phase 10 Vitest migration is downstream; Phase 9 does not disturb Jest.
- **Lint still 734 (≤1881):** Phase 9 Plan 01 did not add/remove any ESLint plugin or config; lint-delta is zero.

---
*Phase: 09-webpack-to-vite*
*Plan: 01*
*Commit: 13d84e1 (content) + <pending docs(09-01)> (this SUMMARY)*
*Completed: 2026-04-22*
