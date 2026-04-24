---
phase: 260424-krx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # Files that MAY be modified if regressions are found. If the audit finds
  # zero regressions (the expected outcome per pre-plan grep), this plan
  # touches ZERO source files and only produces SUMMARY.md.
  - src/renderer/**  # potentially
  - src/utilities/**  # potentially (renderer-shared only; main-only files untouched)
autonomous: true
requirements:
  - QUICK-UI-REGRESSION-AUDIT
must_haves:
  truths:
    - "Every `require()` call under src/renderer/** and src/utilities/** has been inspected and classified."
    - "Every ES `import` from a Node built-in (fs/path/os/child_process/crypto/util/stream/events/http/https/url/zlib/net/tls/buffer) under renderer-reachable code has been inspected."
    - "Any real regression (Anti-pattern A or B as defined below) has been fixed to match the convention established in 0411a5b and 34c899e."
    - "`npm run pack` (electron-vite build) exits 0 end-to-end with no runtime/type errors."
    - "SUMMARY.md records the greps that were run, the hits that were classified, and the verdict (fixed-N / zero-regressions)."
  artifacts:
    - path: ".planning/quick/260424-krx-fix-the-latest-ui-regressions/260424-krx-SUMMARY.md"
      provides: "Audit record: greps run, hits found, classification (regression vs intentional), fix list (if any), pack-build verdict."
      contains: "npm run pack exit 0"
  key_links:
    - from: "src/renderer/**"
      to: "electron.vite.config.mjs"
      via: "renderer.rollupOptions.external"
      pattern: "external: \\[.*'sharp'"
    - from: "src/utilities/iracing-config-checks.ts"
      to: "Vite renderer target"
      via: "typed require() for Node built-ins"
      pattern: "typeof import\\('(fs|path|os)'\\) = require"
---

<objective>
Audit `src/renderer/**` and `src/utilities/**` for any remaining Vue 3 + Vite
import-pattern regressions and fix them, following the conventions established
in commits `0411a5b` (config.ts) and `34c899e` (renderer + utilities).

Purpose: Close out v2.0 UI-regression work. Two follow-up commits have already
landed; this plan is the belt-and-braces sweep to confirm nothing else is hiding
and that the shipped v2.0 build is import-pattern-clean.

Output:
- If regressions exist → fixes committed per the established conventions
  (ES `import` for non-Node modules; typed `require()` for Node built-ins).
- If zero regressions exist → SUMMARY.md documents the audit (greps run, hits
  classified, `npm run pack` verdict). Per scope: that is a valid outcome.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Reference implementations of the two conventions this plan enforces.
# Executors should mirror these exact forms when fixing regressions.
@src/utilities/config.ts
@src/utilities/iracing-config-checks.ts
@src/utilities/logger.ts

# Vite build config — confirms which packages are externalized so executors
# can correctly classify require('sharp') / require('image-size') etc. as
# intentional (externalized Node-only deps), not regressions.
@electron.vite.config.mjs

# Shim file for non-TS asset imports (adds *.png if new asset-import regressions
# are found and fixed). Already contains *.png from 34c899e.
@src/renderer/shims-vue.d.ts

<background>
## Two anti-patterns to hunt

**Anti-pattern A — non-Node module via `require()` in renderer code (REGRESSION):**
- `require('../path/to/local-ts-or-vue-or-asset')` — Vite cannot statically
  analyze string-literal requires and won't bundle them; must be ES `import`.
- `require('package.json')` or `require('*.png/*.svg/*.json')` — same.
- Destructured form: `const { x } = require('../utilities/foo')`.
- Fix form: `import foo from '../utilities/foo'` or `import { x } from '../utilities/foo'`.

**Anti-pattern B — Node built-in via ES `import` in renderer-reachable code (REGRESSION):**
- `import * as path from 'path'`, `import { join } from 'path'`, etc.
- Vite's renderer target rewrites bare-name Node-builtin imports to
  `__vite-browser-external` shim that lacks the real APIs. Runtime error:
  "join is not a function" / "statSync is not a function".
- Fix form: `const path: typeof import('path') = require('path');` (typed CJS
  require — Electron's Node integration resolves bare-name require at runtime).
- Built-ins in scope: fs, path, os, child_process, crypto, util, stream,
  events, http, https, url, zlib, net, tls, buffer.

## Intentional patterns that look like anti-patterns but are NOT (DO NOT FIX)

1. **`require('electron')`** in renderer code — conventional. Electron's
   renderer Node integration serves this natively; Vite does not re-bundle it
   (externalized in electron.vite.config.mjs:44). Leave as-is.

2. **`require('fs')` / `require('path')`** in renderer code — this is exactly
   Anti-pattern B's FIX form (typed-require-Node-builtin), not the
   regression. Only flag the ES-import variant.

3. **`require('sharp')`, `require('image-size')`, `require('electron-store')`,
   `require('electron-updater')`, `require('irsdk-node')`** — externalized Node
   modules, see `electron.vite.config.mjs` lines 13-19 (main) and 44 (renderer).
   Vite does not bundle these; Node's runtime resolver loads them. Leave as-is.

4. **`iracing-config-checks.ts` + `.test.ts` `require('fs')`** — comment above
   the line explains: `vi.spyOn(fs, ...)` requires both sides to share the same
   module instance, which ESM namespace imports (sealed) cannot provide. Leave
   as-is. Same rationale applies anywhere `vi.spyOn` targets a Node built-in.

5. **`src/main/**` is out of scope.** Node built-ins may use either form there
   freely. This plan does NOT touch `src/main/**`.

6. **Tests** under `src/**/*.test.ts` may legitimately ES-import Node built-ins
   (Vitest runs in Node, not Vite's renderer target). Only flag actual
   **renderer-code** ES-imports of built-ins. When in doubt, test files are
   in-scope for read (to understand spy patterns) but NOT for fixes unless
   they break `npm run pack`.

7. **`_scripts/`, `bot/`, `tests/`, `.tmp-inspect/`** — out of scope.

## Renderer-reachable files in src/utilities/

These utilities are imported by `src/renderer/**` and therefore run under Vite's
renderer target. Audit them with the renderer rules above:

- src/utilities/config.ts (reference — already correct)
- src/utilities/iracing-config-checks.ts (reference — already correct)
- src/utilities/logger.ts (reference — already correct)
- src/utilities/desktop-capture.ts
- src/utilities/screenshot-name.ts
- src/utilities/filenameFormat.ts
- Any other `src/utilities/*.ts` that the renderer tree imports.

Main-only utilities (imported ONLY by src/main/**): out of scope.

## Pre-plan grep hypothesis (from planner's own audit)

The planner already ran the two anti-pattern greps and classified every hit:

- Anti-pattern A hits in `src/renderer/**` + `src/utilities/**`: all hits are
  `require('electron')`, `require('fs')`, `require('path')`, `require('os')`,
  `require('sharp')`, `require('image-size')`, `require('electron-store')` —
  all fall in one of the "intentional" categories above. Zero actual regressions.
- Anti-pattern B hits in `src/renderer/**` + `src/utilities/**`: **zero.**

**Expected outcome: zero regressions; plan lands as an audit record.**
Executor MUST still run the greps independently and verify — the planner's
hypothesis is NOT authoritative; `npm run pack` exit 0 is.
</background>

<interfaces>
Reference fix forms (from the landed commits, for executor to mirror if new
regressions are found):

From src/utilities/iracing-config-checks.ts (Anti-pattern B fix form):
```ts
// Use typed `require(...)` for Node built-ins so Vite's renderer target does
// not rewrite them to the __vite-browser-external shim.
const fs: typeof import('fs') = require('fs');
const path: typeof import('path') = require('path');
const os: typeof import('os') = require('os');
```

From src/renderer/components/SettingsModal.vue (Anti-pattern A fix form — package.json):
```ts
import { version, repository } from '../../../package.json';
```

From src/renderer/components/PromoCard.vue (Anti-pattern A fix form — asset):
```ts
import armsLogo from '../../../static/arms_logo.png';
```
(Also requires `declare module '*.png';` in shims-vue.d.ts — already present.)

From src/renderer/views/Worker.vue (Anti-pattern A fix form — local utility):
```ts
import { buildScreenshotName } from '../../utilities/screenshot-name';
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Audit, classify, fix (if any), verify via npm run pack</name>
  <files>
    # Read-only sweep targets:
    src/renderer/**
    src/utilities/**
    # Potentially modified if regressions found (executor records actual file
    # list in the commit). Expected modified file count: 0 per pre-plan grep.
    # If modifications happen:
    src/renderer/shims-vue.d.ts   # only if new asset type needs declaring
  </files>

  <action>
Execute the audit in four phases. Each phase is mechanical; do not improvise.

**Phase 1 — Run the two anti-pattern greps (record raw output in SUMMARY)**

Using the Grep tool with output_mode=content and -n=true, run:

1. Anti-pattern A scan (`require()` hits):
   ```
   pattern: require\(
   path: src/renderer
   ```
   Then repeat for `path: src/utilities`.

2. Anti-pattern B scan (ES imports of Node built-ins):
   ```
   pattern: ^import .* from ['"](fs|path|os|child_process|crypto|util|stream|events|http|https|url|zlib|net|tls|buffer)['"]
   path: src/renderer
   ```
   Then repeat for `path: src/utilities`.

Save raw output verbatim for inclusion in SUMMARY.md.

**Phase 2 — Classify each hit**

For every Anti-pattern A hit, mark as one of:
- `REGRESSION` — local file, asset, package.json, or pure-JS npm module that
  Vite should bundle. Needs fix.
- `INTENTIONAL: electron` — `require('electron')` or `require('@electron/remote')`.
- `INTENTIONAL: node-builtin` — `require('fs'|'path'|'os'|...)` (this is the
  Anti-pattern B FIX form, not a regression).
- `INTENTIONAL: externalized` — module listed in
  `electron.vite.config.mjs` renderer `external: [...]` array OR explicitly
  Node-native (sharp, image-size, electron-store, electron-updater, irsdk-node).
  Confirm by reading `electron.vite.config.mjs` lines 39-46 (renderer block).
- `INTENTIONAL: vi.spyOn-target` — comment above require() justifies it as a
  spyable namespace; see `src/utilities/iracing-config-checks.ts:1-4` comment.
- `OUT-OF-SCOPE` — file is under src/main/, _scripts/, bot/, tests/, .tmp-inspect/.

For every Anti-pattern B hit, mark as one of:
- `REGRESSION` — renderer-reachable file (anything in src/renderer/ or a
  src/utilities/ file imported by the renderer tree). Needs fix.
- `INTENTIONAL: test-file` — path matches `src/**/*.test.ts` (Vitest runs in
  Node).
- `OUT-OF-SCOPE` — src/main/, _scripts/, bot/.

Classification table goes into SUMMARY.md.

**Phase 3 — Fix any REGRESSION hits**

If Phase 2 produced zero REGRESSION rows, skip to Phase 4.

For each Anti-pattern A REGRESSION, use Edit to replace:
- `const x = require('./path')` → `import x from './path'`
- `const { a, b } = require('../path')` → `import { a, b } from '../path'`
- `require('package.json')` → `import { field } from '../../../package.json'`
  (or however many `../` are needed to reach the repo root)
- `require('./img.png')` → `import img from './img.png'` AND ensure
  `src/renderer/shims-vue.d.ts` has `declare module '*.png';` (and add
  `*.svg`/`*.jpg`/etc. if a new asset type appears)

For each Anti-pattern B REGRESSION (ES-imported Node built-in in
renderer-reachable file), use Edit to replace:
- `import * as path from 'path'` → `const path: typeof import('path') = require('path');`
- `import { join } from 'path'` → `const path: typeof import('path') = require('path');`
  then update call-sites from `join(...)` to `path.join(...)` (or refactor to
  the destructured form with typed require — whichever mirrors surrounding
  code). Add a one-line comment referencing the existing convention in
  `utilities/iracing-config-checks.ts:1-4` if the file does not already carry
  such a comment.

If any fix exposes a TypeScript strictness error (e.g. unused import,
implicit-any, String cast like 34c899e's `String(count)` for
`fileName.replace()`), fix it in the same commit — this is allowed scope
(see constraints).

**Phase 4 — Canonical verification**

Run `npm run pack` (electron-vite build). This is the ground-truth Vite-bundle
gate. Must exit 0 with zero runtime/type errors.

If it fails:
- Read the full error output.
- Diagnose (most likely: an Anti-pattern B fix introduced a new type error, or
  an Anti-pattern A fix missed a call-site rename).
- Fix and re-run `npm run pack`.
- Loop until exit 0.

If Phase 3 produced zero fixes AND Phase 4 is green on the first run, the
plan's outcome is "audit: zero regressions found; v2.0 import patterns are
clean." That is a valid result per the scope.

**Phase 5 — Commit**

If any source files were modified:
- `git add` each modified source file explicitly (NOT `git add -A` or `.`).
- Commit message format (follow the conventions in 0411a5b / 34c899e):
  ```
  fix(vite): <one-line summary of the specific regression class(es) fixed>

  <optional body with fix-list>
  ```
  If zero fixes were made, do NOT create a fix commit; the SUMMARY commit
  (made by the execute workflow's summary step) is the only commit.

Do NOT stage bot/**, .tmp-inspect/**, or any file listed in the pre-existing
"working tree dirty" items from STATE.md (ChangelogModal.vue / PromoCard.vue /
Settings.vue / SettingsModal.vue / SideBar.vue / shims-vue.d.ts /
Worker.vue / iracing-config-checks.ts / logger.ts may already be modified from
the immediately-prior 34c899e commit — re-read git status BEFORE editing to
confirm current HEAD state; those commits should already be committed since
HEAD reports `34c899e` as last commit). Never use `--no-verify`.

No Co-Authored-By footer in commit message (per user MEMORY).
  </action>

  <verify>
<automated>npm run pack</automated>
  </verify>

  <done>
- Phases 1-2 ran and produced a classification table (in SUMMARY.md).
- All REGRESSION hits (if any) were fixed in-place following the reference
  conventions; zero new TypeScript errors introduced.
- `npm run pack` exits 0 end-to-end (78+ modules transformed; `out/` populated).
- If fixes were made: one `fix(vite): ...` commit exists on master with only
  source files changed (no bot/ or .tmp-inspect/ leakage).
- If no fixes were made: no source commit; SUMMARY commit still lands via the
  execute workflow.
- Classification table in SUMMARY.md shows, for each hit:
  `file:line | form (require/import) | module | classification | action`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Vite build → runtime | Vite's static analysis decides what gets bundled vs shimmed vs externalized; mismatches between author intent and Vite's rewrite policy manifest as runtime errors (MODULE_NOT_FOUND, "x is not a function"). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-krx-01 | Tampering | electron.vite.config.mjs externals list | accept | Read-only reference in this plan; executor classifies hits against it but does not modify it. If a module needs to move from bundled-to-externalized, that is a separate bundler-config plan, not this audit. |
| T-krx-02 | Denial-of-Service | npm run pack pipeline | mitigate | `npm run pack` is the canonical gate. Any fix that breaks it must be reverted or corrected in the same task before commit; no partial landings. |
| T-krx-03 | Information-Disclosure | git staging | mitigate | Executor stages modified files by explicit path (not `git add -A`). Avoids committing `bot/docs/community-guide.md` (untracked) or `.tmp-inspect/**` (pre-existing deletions in working tree) per STATE.md scope gate. |
| T-krx-04 | Tampering | require() classification logic | mitigate | Classification is mechanical (cross-reference hit against explicit INTENTIONAL list). Executor must justify each INTENTIONAL classification in SUMMARY.md so a reviewer can audit; no silent passes. |
</threat_model>

<verification>
Overall phase checks (executed by Task 1 Phase 4):

1. `npm run pack` exits 0 (canonical Vite-bundle gate).

2. Both anti-pattern greps were run and their raw output is recorded in
   SUMMARY.md (proves the audit actually happened, not just hypothesized).

3. Classification table in SUMMARY.md accounts for every hit from the greps —
   no unclassified rows.

4. If fixes were made: `git diff HEAD~1 HEAD --name-only` returns only files
   under `src/renderer/**` or `src/utilities/**` (scope gate); zero bot/ or
   .tmp-inspect/ leakage.

5. If zero fixes were made: `git log -1 --format=%s` on master still points to
   `34c899e` (or whatever HEAD was at plan start); SUMMARY.md explicitly states
   "zero regressions found" and lists the greps-run count + hits-classified count.
</verification>

<success_criteria>
Measurable completion:

- [ ] Both anti-pattern greps ran; raw results recorded.
- [ ] Every hit classified as REGRESSION / INTENTIONAL-<category> / OUT-OF-SCOPE.
- [ ] All REGRESSION hits (if any) fixed per reference conventions from
      commits 0411a5b and 34c899e.
- [ ] `npm run pack` exits 0 (Vite-bundle canonical gate).
- [ ] If fixes were made: exactly one `fix(vite): ...` commit on master,
      scope-clean (no bot/ or .tmp-inspect/ leakage), no Co-Authored-By.
- [ ] SUMMARY.md documents greps, classification table, fix-list (or "zero
      regressions" verdict), and pack-build exit code.
</success_criteria>

<output>
After completion, create
`.planning/quick/260424-krx-fix-the-latest-ui-regressions/260424-krx-SUMMARY.md`.

Required SUMMARY sections:
1. **Audit scope** — which grep patterns were run, against which paths.
2. **Raw grep output** — verbatim hits from both scans.
3. **Classification table** — every hit with file:line, form, module, category, action.
4. **Fixes applied** — one-line summary per fix (or "none").
5. **Verification** — `npm run pack` exit code + modules-transformed count +
   any surprises (type errors fixed, shim additions, etc.).
6. **Verdict** — either "N regressions fixed" or "zero regressions — v2.0
   import patterns clean per independent re-audit."
</output>
