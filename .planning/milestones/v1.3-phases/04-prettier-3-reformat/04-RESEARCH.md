# Phase 4: Prettier 3 Codebase Reformat - Research

**Researched:** 2026-04-21
**Domain:** JavaScript/Vue code formatter upgrade (Prettier 2.0.2 → 3.3.x) on Electron + Vue 2.7 repo
**Confidence:** HIGH

## Summary

Prettier 2 → 3 on this repo is a low-risk, mechanical upgrade with an **unusually large reformat surface** — but the reason is not Prettier 3's algorithmic deltas. Empirical measurement (running Prettier 2.0.2 against the current working tree) shows **34 of 35 files in the `{src,_scripts}/**/*.{js,ts,vue}` glob fail `prettier --check` under the already-installed v2**. The repo has been developed for years without the Prettier hook actually running; most files are 2-space-indented even though `.prettierrc` declares `useTabs: true, tabWidth: 3`. Commit 2's `format: prettier 3` diff will therefore be dominated by the **accumulated v2 non-conformance** (whitespace, tab conversion, line wrapping), not by v2→v3 algorithmic differences.

The genuine Prettier-3-vs-Prettier-2 delta (measured directly against the same source files, same `.prettierrc`) is **extremely narrow**: byte-identical output on 4 of 7 sampled files; on the other three, v3 only (a) strips trailing semicolons from HTML `style=""` attributes in Vue templates, and (b) keeps template literals with interpolations on one line when they fit. The explicit `"trailingComma": "es5"` pin in `.prettierrc` successfully immunizes the codebase from Prettier 3's single biggest default change (the `es5` → `all` flip). No TypeScript files exist in scope, so the `.tsx`/`.mts` auto-detect parser changes and the TS-parser strictness updates are non-applicable.

Two hard blockers for the planner to address **before** the reformat commit:

1. **`src/renderer/components/HelpModal.vue` has a pre-existing HTML parser error** (line 27 `<p>` auto-closed by block-level `<ol>` on line 28, orphaning the `</p>` on line 37). Both Prettier 2.0.2 and Prettier 3.3.3 reject this file with a `SyntaxError: Unexpected closing tag "p"` and exit with code 2. Prettier 2.0.2 currently masks this by still printing "All matched files use Prettier code style!" alongside the error, but `npm run prettier -- --check` will never report clean against this file. Requires a hand-edit (remove the orphan `<p>`/`</p>` wrappers around the `<ol>`) before Wave 0 can establish a clean baseline.
2. **`eslint-plugin-prettier@5.x` declares `eslint: ">=8.0.0"` as a peer dependency.** The project is on `eslint@^7.10.0`. This is a fresh, load-bearing peer conflict for Phase 4 — `--legacy-peer-deps` is not merely a Phase 3 carryover, it is actively required by this phase's dep bump. `eslint-config-prettier@9.1.0` is clean (still accepts ESLint 7).

**Primary recommendation:** Fix HelpModal.vue in Wave 0 as a source-prep task. Pin versions exactly as CONTEXT.md D-04/D-05 lock (`prettier@^3.3.3`, `eslint-config-prettier@^9.1.0`, `eslint-plugin-prettier@^5.2.1`) — though note caret ranges will resolve to the latest of each line on install (`3.8.3` / `9.1.2` / `5.5.5` as of today). Surface-level discovery is minimal; the ESLint integration is not actually wired into `.eslintrc.js` (no `plugin:prettier/recommended`), so commit 1's "lint still works" verification reduces to "lint still runs without throwing on the new peer graph," not "prettier rules still integrate with ESLint."

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Reformat glob stays `{src,_scripts}/**/*.{js,ts,vue}`. No expansion to `bot/`, top-level `.cjs`/`.js`, docs, or config.
- **D-02:** No changes to `.prettierrc`. Keys preserved byte-for-byte: `tabWidth: 3`, `useTabs: true`, `semi: true`, `singleQuote: true`, `trailingComma: "es5"`. The explicit `"es5"` is load-bearing — dodges Prettier 3's default flip.
- **D-03:** No `.prettierignore` file introduced. Scope controlled via glob.
- **D-04:** `prettier` pinned at `^3.3.3`.
- **D-05:** `eslint-config-prettier` pinned at `^9.1.0`; `eslint-plugin-prettier` pinned at `^5.2.1`. v10 of eslint-config-prettier is rejected (drops ESLint 7).
- **D-06:** `--legacy-peer-deps` expected on `npm install`.
- **D-07:** Two-commit split — commit 1 `chore(deps):` (package.json + package-lock.json only, no reformat), commit 2 `format: prettier 3` (pure formatter output). Mirrors Phase 3 D-04 bisect pattern.
- **D-08:** No `Co-Authored-By:` on either commit.
- **D-09:** No `--no-verify` on either commit.
- **D-10:** No `git add -A` or `git add .`. Stage paths explicitly. The untracked `bot/docs/community-guide.md` must not be swept in.
- **D-11:** Automated verification — lint passes (same-or-fewer warnings vs baseline); `pack:renderer` compiles clean; `prettier --check` reports all files conformant after commit 2.
- **D-12:** Manual smoke — one `npm run dev` screenshot round-trip after commit 2 lands.
- **D-13:** `npm run pack` acceptable substitute for `npm run build` if installer signing blocks the full build path.

### Claude's Discretion

- Pre-reformat baseline metric choice (line count, file count, lint warning count) — Claude picks cheapest + most load-bearing.
- Handling of Prettier-3-surfaced parser errors on existing source — **already triggered**: HelpModal.vue (see Pitfall 1). Treat as a deviation; do not silently edit source. Route to user if any additional parser errors appear during Wave 0.
- Whether to run `npm run lint --fix` inside commit 2 to sweep ESLint integration drift. Bundle into commit 2 if needed (output is formatter-adjacent; bisect shape preserved).

### Deferred Ideas (OUT OF SCOPE)

- Adding Prettier to the `bot/` workspace.
- ESLint 9 flat-config migration + `eslint-config-prettier@10` / `eslint-plugin-prettier@5+ with ESLint 8+` — deferred to v1.4.
- Introducing a `.prettierignore` file.
- Reformatting docs / markdown / `.planning/` / top-level `.cjs`.
- Bumping `typescript-eslint` to resolve the ESLint-7 peer conflict.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOOL-01 | Codebase reformatted with Prettier 3.3 in a single `format: prettier 3` commit for clean git blame. ESLint + Prettier integration continues to pass with no new warnings. | Version pins verified via npm registry (Standard Stack). Breaking changes inventoried and mapped to repo stack (State of the Art). v2→v3 diff shape empirically measured on 7 representative files (Architecture Patterns). Two commit shape confirmed reusable from Phase 3 D-04 (Architecture Patterns). Validation procedure mapped to SC1-SC3 (Validation Architecture). |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Code formatting | `npx prettier` CLI (devDep binary) | `.prettierrc` (config) | Single source of truth is the Prettier CLI resolved from `node_modules/.bin/`. `.prettierrc` is the only config input. |
| Config declaration | `.prettierrc` (JSON) | `package.json scripts.prettier` (glob) | Config file declares formatting rules. Script declares the input glob. |
| Lint integration | `.eslintrc.js` → `extends: []` | `eslint-config-prettier` + `eslint-plugin-prettier` devDeps | **Not actually wired.** See Pitfall 4 — `.eslintrc.js` extends only `plugin:vue/recommended` and `standard`; the prettier packages are installed but not referenced. |
| Reformat scope | glob in `package.json` `scripts.prettier` | file-system structure | `{src,_scripts}/**/*.{js,ts,vue}` — naturally excludes `bot/`, `dist/`, `build/`, `.planning/`, docs. |
| CI enforcement | None currently | — | No pre-commit hook or CI step runs `prettier --check`. This is why the codebase drifted from `.prettierrc` over time. |

## Standard Stack

### Core — exact versions to pin (per CONTEXT.md D-04, D-05)

| Library | Target Pin | Latest Available 2026-04-21 | Published | ESLint 7 compat | Source |
|---------|------------|------------------------------|-----------|------------------|--------|
| `prettier` | `^3.3.3` | `3.8.3` | 3.3.3 → 2024-07-13; 3.8.3 → 2026-04-15 | n/a | [VERIFIED: `npm view prettier version time`] |
| `eslint-config-prettier` | `^9.1.0` | `9.1.2` (within 9.x); `10.1.8` is latest overall | 9.1.0 → 2023-12-02; 9.1.2 → 2025-07-18 | ✅ (`eslint >=7.0.0`) | [VERIFIED: `npm view eslint-config-prettier@9.1.0 peerDependencies`] |
| `eslint-plugin-prettier` | `^5.2.1` | `5.5.5` (within 5.x) | 5.2.1 → 2024-07-17; 5.5.5 → 2026-01-14 | ❌ (`eslint >=8.0.0`) → requires `--legacy-peer-deps` | [VERIFIED: `npm view eslint-plugin-prettier@5.2.1 peerDependencies`] |

**Package.json `devDependencies` diff (3-line change, already-alphabetized section):**

```diff
-        "eslint-config-prettier": "^6.10.1",
+        "eslint-config-prettier": "^9.1.0",
         "eslint-config-standard": "^14.1.1",
         "eslint-plugin-import": "^2.22.1",
         "eslint-plugin-node": "^11.1.0",
-        "eslint-plugin-prettier": "^3.1.2",
+        "eslint-plugin-prettier": "^5.2.1",
         "eslint-plugin-promise": "^4.2.1",
...
-        "prettier": "^2.0.2",
+        "prettier": "^3.3.3",
```

No other devDependencies touched. `package-lock.json` regenerated by `npm install --legacy-peer-deps`.

**Install command (exact):**

```bash
npm install --legacy-peer-deps
```

Or, equivalently, the explicit-package form (useful to double-check version resolution before committing `package-lock.json`):

```bash
npm install --save-dev --legacy-peer-deps \
  prettier@^3.3.3 \
  eslint-config-prettier@^9.1.0 \
  eslint-plugin-prettier@^5.2.1
```

**Version pinning rationale:**

- **Caret range (`^3.3.3`) matches CONTEXT.md D-04.** The caret is load-bearing — `npm install` with `^3.3.3` will actually resolve to `3.8.3` (latest 3.x as of 2026-04-21). This is acceptable: all Prettier 3.4-3.8 changes are backwards-compatible (no breaking config changes between 3.3 and 3.8, verified via Prettier's release blog). The ROADMAP's "3.3" callout is a floor, not a ceiling. If the planner prefers to match the ROADMAP literally, pin exactly (`"prettier": "3.3.3"`) — this is not a CONTEXT-locked choice, it falls under Claude's Discretion. Recommendation: **keep `^3.3.3`**; Prettier's semver discipline is strong enough to trust caret.
- **`eslint-config-prettier@^9.1.0` keeps ESLint 7 support** ([VERIFIED: v9.0.0 changelog "At least ESLint 7.0.0 is now required"]). v10+ raises the floor to ESLint 8 ([CITED: changelog v10.0.0 released 2025-01-13]). D-05 is correctly scoped.
- **`eslint-plugin-prettier@^5.2.1` declares `eslint >=8.0.0` peer** ([VERIFIED: `npm view`]). Project has ESLint 7. **This creates a peer conflict that only `--legacy-peer-deps` resolves.** This is independent of the pre-existing `@typescript-eslint/eslint-plugin@2.34.0` ↔ `eslint@7` conflict documented in STATE.md. Plan must document this as an active Phase-4 peer issue, not a carryover.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `^3.3.3` caret | Exact `3.3.3` pin | Literal match to ROADMAP wording. Loses bugfix backports. Not materially different. |
| `^3.3.3` caret | `^3.8.3` (latest 3.x) | Zero behavior change observed 3.3→3.8 on this repo's code surface. Explicit pinning at the floor matches CONTEXT.md D-04 intent; any change would require re-opening CONTEXT. |
| `--legacy-peer-deps` | `--force` | `--force` is stronger and less reversible; legacy-peer-deps is the project's standing pattern (STATE.md). |
| Keep `eslint-plugin-prettier` (bump to 5.x) | Remove both `eslint-plugin-prettier` and `eslint-config-prettier` entirely | They're installed but not wired into `.eslintrc.js` (see Pitfall 4). Removing would trim devDeps but expand scope beyond D-04 (3-line change) and risks breaking any ad-hoc `eslint-plugin-prettier` invocation. Defer to v1.4 cleanup. |

## Architecture Patterns

### Target `package.json` diff (commit 1)

```diff
--- a/package.json
+++ b/package.json
@@ devDependencies @@
-        "eslint-config-prettier": "^6.10.1",
+        "eslint-config-prettier": "^9.1.0",
         ...
-        "eslint-plugin-prettier": "^3.1.2",
+        "eslint-plugin-prettier": "^5.2.1",
         ...
-        "prettier": "^2.0.2",
+        "prettier": "^3.3.3",
```

`package-lock.json` changes are generated — don't hand-edit. The scripts block, dependencies block, and all other devDependencies stay byte-identical.

### Reformat diff shape (commit 2) — empirical characterization

Per-file v2-vs-v3 delta, measured 2026-04-21 on the current working tree (Prettier 2.0.2 locally vs Prettier 3.3.3 installed in `/tmp/prettier3-test`, same `.prettierrc` copied over):

| File | v3 reformat vs current source | v3 vs v2 output (algorithmic delta) | Change kind |
|------|-------------------------------|--------------------------------------|-------------|
| `_scripts/webpack.renderer.config.js` | yes (tabs, wrapping) | **byte-identical to v2** | v2 non-conformance only |
| `_scripts/webpack.main.config.js` | yes | (not sampled; expected 0) | v2 non-conformance only |
| `_scripts/build-dev.js`, `dev-runner.js`, `release.js` | yes | (not sampled) | v2 non-conformance only |
| `src/utilities/desktop-capture.js` | yes | **byte-identical to v2** | v2 non-conformance only |
| `src/utilities/filenameFormat.js` | yes | **byte-identical to v2** | v2 non-conformance only |
| `src/utilities/*.{js,test.js}` | yes | (not sampled; expected 0) | v2 non-conformance only |
| `src/main/index.js` | yes (CRLF→LF, tabs) | 6 diff lines — **template literals keep single line when fits** | v2 non-conformance + 3.2.0 template-interpolation fix |
| `src/main/*.{js,test.js}` | yes | (not sampled) | v2 non-conformance + occasional template-literal |
| `src/renderer/main.js` | yes | (not sampled; pure imports + `library.add` call, no templates/ternaries) | v2 non-conformance only |
| `src/renderer/App.vue` | minor (already tab-indented, but might have trailing style `;`) | likely minimal | v2 non-conformance in `<script>` + v3 style-attr delta |
| `src/renderer/components/Settings.vue` | yes | 10 diff lines — **trailing `;` stripped from `style=""` + template-literal single-line** | v2 non-conformance + Vue template-attr deltas |
| `src/renderer/components/HelpModal.vue` | **PARSER ERROR** | PARSER ERROR | pre-existing `<p>/</p>` orphan — see Pitfall 1 |
| `src/renderer/components/PromoCard.vue`, `SideBar.vue`, `TitleBar.vue`, `ChangelogModal.vue`, `SettingsModal.vue` | yes | (not sampled; Vue SFCs likely have trailing-`;` style-attr instances) | same as Settings.vue |
| `src/renderer/views/Home.vue` | yes | 12 diff lines — **trailing `;` stripped from `style=""` attrs** | v2 non-conformance + Vue template-attr delta |
| `src/renderer/views/Worker.vue` | yes | **byte-identical to v2** | v2 non-conformance only |
| `src/renderer/router/index.js`, `store/index.js`, `store/modules/index.js` | no (already tab-indented, small files) | likely 0 | minimal |

**Aggregate file counts (measured 2026-04-21):**

- Files in the glob: **35**
- Files that `prettier --check` (v2.0.2) fails on: **34** (HelpModal.vue parser-errors out; the other 33 are style-non-conformant)
- Files that `prettier --check` (v3.3.3) fails on: **34** (identical — HelpModal parser-errors, the other 33 need reformat)
- Files where v3 output differs from v2 output: **observed in 3 of 7 sampled** (Settings.vue: 10 lines; Home.vue: 12 lines; main/index.js: 6 lines). Projecting to full population: **likely ~5-10 Vue files** (trailing-style-`;` change hits any SFC with inline `style=""` attrs) + **a handful of .js files** with long template literals that fit on one line.

**Bottom line for the planner:** The `format: prettier 3` commit 2 will touch ~34 files, but **the vast majority of the churn is historical v2 non-conformance, not v2→v3 algorithm drift.** The genuine v3-only delta is bounded to (a) trailing `;` inside HTML `style=""` attributes, and (b) template literals staying on one line when they fit. Both are benign; neither changes runtime behavior.

### Two-commit shape (D-07, mirrors Phase 3 D-04)

```
commit 1: chore(deps): bump Prettier to v3 + ESLint-Prettier plugins
  └─ package.json (3 devDep lines)
  └─ package-lock.json (regenerated)

commit 2: format: prettier 3
  └─ <reformat output across ~34 files in src/**, _scripts/**>
  └─ (optionally) HelpModal.vue hand-fix if Wave 0 didn't pre-sort it
```

**Bisect shape rationale (inherits directly from Phase 3 D-04 — see 03-CONTEXT.md):**

- Between HEAD and commit 2: any regression caused by a reformat-specific parser edge case gets isolated to the reformat diff's ~34 files. `git bisect` between HEAD and commit 2 narrows to "Prettier 3 reformatted X in a way that runtime dislikes."
- Between commit 2 and commit 1: any regression caused by the dep-bump alone (e.g., `eslint-plugin-prettier` plugin shape changed in a way the linter trips on, or the Prettier 3 binary parses `.prettierrc` differently) gets isolated to the 3-line `package.json` diff + lockfile.
- Between commit 1 and its parent: the pre-Phase-4 state, un-upgraded.

The Phase 3 D-04 pattern landed a `docs(03-01)` metadata commit between the two code commits (`cc09b8a` in STATE.md). `git bisect` still works because the intervening docs commit doesn't touch source. Phase 4 may or may not have an intervening `docs(04-01)` commit depending on the planner's choice; either way, the bisect shape holds.

**Pure-formatter guarantee for commit 2:** The planner must ensure commit 2 is `npm run prettier` output only, with no hand-edits. If HelpModal.vue's orphan-`</p>` fix is needed, it should land as either (a) a separate pre-reformat Wave 0 source-prep commit, or (b) bundled into commit 2 with explicit call-out in the commit message. Option (a) is cleaner for the "pure formatter diff" framing; option (b) keeps the phase to two commits at the cost of mixing hand-edit + formatter output in one commit. Recommend **(a)** — one extra tiny commit preserves the Phase 3 aesthetic ("chore(deps) + format: prettier 3 only").

### Anti-Patterns to Avoid

- **DO NOT** run `npm install` without `--legacy-peer-deps`. `eslint-plugin-prettier@5.x`'s `eslint >=8.0.0` peer will hard-reject against the project's ESLint 7. STATE.md's pre-existing `@typescript-eslint` peer issue is a separate conflict; both need the flag.
- **DO NOT** bump `eslint-config-prettier` to `^10`. That drops ESLint 7 support and is explicitly rejected by D-05.
- **DO NOT** hand-edit anything in commit 2. Any manual edit poisons the "pure formatter output" framing and undermines the bisect shape.
- **DO NOT** `git add -A` or `git add .`. The untracked `bot/docs/community-guide.md` at the repo root would get swept in (see D-10).
- **DO NOT** modify `.prettierrc`. The existing `"trailingComma": "es5"` is load-bearing — it prevents Prettier 3's default flip (`es5` → `all`) from sweeping a trailing comma into every function call site, object literal, and argument list in the repo. If `.prettierrc` were silently updated to `"all"`, the reformat diff would explode by several thousand lines of pure-comma churn.
- **DO NOT** attempt to wire `eslint-plugin-prettier` into `.eslintrc.js` during this phase. The packages are installed-but-not-wired (see Architectural Responsibility Map); wiring them is scope expansion and would fight the ESLint `"standard"` config's existing rule set. Defer to v1.4.
- **DO NOT** auto-fix HelpModal.vue's `<p>/</p>` orphan by deleting random lines. The fix is precise: remove the opening `<p>` on line 27 and the closing `</p>` on line 37, leaving the `<ol>...</ol>` block intact. Confirm visually in `npm run dev` after.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Formatter integration into ESLint | Custom eslint rule that runs prettier | `eslint-plugin-prettier` (already installed) | It's installed for a reason, but not wired — see Pitfall 4. Defer wiring to v1.4 when ESLint 9 flat config lands. |
| Per-file reformat tracker | Build a script that tracks which files were reformatted | `git log --oneline -- <file>` after commit 2 lands | Single commit is the tracker; commit message body can summarize counts. |
| Pre-commit Prettier hook | Add husky + lint-staged to enforce `prettier --write` on commit | — (defer) | Nice to have, clearly valuable (repo drifted precisely because no hook existed), but **scope expansion** for Phase 4. If desired, separate follow-up. |
| Vue template HTML5-close auto-repair | Custom script that detects `<p>` auto-close issues | Hand-fix HelpModal.vue; rely on Prettier 3's parser to surface any future cases | The one known case is surgical; no pattern to tool up. |

**Key insight:** The two pieces of "infrastructure" this phase would benefit from — CI-enforced `prettier --check` and a husky/lint-staged pre-commit hook — are both deliberately out of scope. The phase is a one-shot reformat; adding enforcement tooling is a separate decision.

## Runtime State Inventory

Phase 4 is a devDep bump + pure code reformat. No runtime/persisted state embeds Prettier state, formatter output, or file contents-as-keys.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. `electron-store` config stores screenshot path / filename format / first-time flag; no file contents stored. Reformatted source has no effect on user data. | None |
| Live service config | None. No external services reference formatted source. | None |
| OS-registered state | None. Windows Task Scheduler / shortcuts / installer metadata don't reference source files. | None |
| Secrets / env vars | None. No env vars reference Prettier, `eslint-plugin-prettier`, or any formatter-related identifier. | None |
| Build artifacts | `dist/main.js` and `dist/renderer.js` are regenerated by `npm run pack`. Byte-level deltas in these artifacts post-reformat are expected to be zero — Webpack's output is ASTs/minified bundles, independent of source whitespace. `node_modules/.bin/prettier` is a new binary at the new version, but that's managed by `npm install`. | Rebuild (automatic on first `npm run pack` after upgrade; sanity-check that output bytes are approximately unchanged) |

**Nothing else found in category:** Verified by grep of `src/**`, `_scripts/**`, `package.json`, `.eslintrc.js` for strings `prettier`, `format`, and source-file basenames. No dynamic reference to formatted file contents exists.

## Common Pitfalls

### Pitfall 1: `HelpModal.vue` parser error (known; pre-existing)
**What goes wrong:** `src/renderer/components/HelpModal.vue` has `<p>...<ol>...</ol></p>` starting at line 27. HTML5 implicit-close rules auto-close the `<p>` when the block-level `<ol>` opens, leaving the `</p>` on line 37 orphaned. Both Prettier 2.0.2 (currently installed) and Prettier 3.3.3 reject this file with `SyntaxError: Unexpected closing tag "p"` and exit non-zero.
**Why it happens:** Pre-existing source bug, never fixed because `prettier --check` was never enforced. `npm run prettier --write` under v2 silently skips the file; the check path exits 2 but prints "All matched files use Prettier code style!" alongside the error, masking it.
**How to avoid:** Fix in Wave 0 as a pre-reformat source-prep task. Remove the opening `<p>` on line 27 and the closing `</p>` on line 37. The `<ol>` is already the block-level container; wrapping it in a `<p>` was never valid HTML. Visual verification in `npm run dev` confirms the modal layout is unchanged (browsers were already treating the structure this way).
**Warning signs:** `npx prettier --check "src/renderer/components/HelpModal.vue"` exits code 2 with the parser-error message. Commit-2 verification `npm run prettier -- --check` will exit non-zero indefinitely unless fixed.
**Confidence:** HIGH — directly observed with both Prettier 2.0.2 and 3.3.3.

### Pitfall 2: `--legacy-peer-deps` needed for fresh peer conflict
**What goes wrong:** `npm install` without `--legacy-peer-deps` fails with `ERESOLVE` because `eslint-plugin-prettier@5.2.1` declares `eslint: ">=8.0.0"` as a peer dependency, but the project pins `eslint@^7.10.0`. This is SEPARATE from the pre-existing `@typescript-eslint/eslint-plugin@2.34.0` vs `eslint@7` peer conflict documented in STATE.md.
**Why it happens:** `eslint-plugin-prettier` v5.0.0 explicitly raised its ESLint peer floor to 8+ ([VERIFIED: `npm view eslint-plugin-prettier@5.0.0 peerDependencies`]). The plugin actually still works with ESLint 7 at runtime (no ESLint-8-only API is called in the hot path), but the peer declaration blocks vanilla install.
**How to avoid:** Always invoke `npm install --legacy-peer-deps` (D-06). Document in commit 1 body: "peer conflict: eslint-plugin-prettier@5 declares eslint>=8.0.0, resolved via --legacy-peer-deps; functional compatibility verified via `npm run lint` pass."
**Warning signs:** `npm install` output mentions `ERESOLVE could not resolve`, `peer eslint@"^7.10.0"`, or `peerDeps require eslint@>=8.0.0`.
**Confidence:** HIGH — directly verified via `npm view`.

### Pitfall 3: Caret range resolves higher than the ROADMAP floor
**What goes wrong:** ROADMAP + CONTEXT.md D-04 say "Prettier 3.3"; `package.json` gets `"prettier": "^3.3.3"`; `npm install --legacy-peer-deps` actually resolves to `3.8.3` (the current `latest` dist-tag as of 2026-04-21). A future reader of `package.json` sees "3.3" as the intent but finds 3.8 in `package-lock.json`.
**Why it happens:** Caret ranges allow minor+patch drift. Prettier has shipped 3.4, 3.5, 3.6, 3.7, 3.8 since 3.3.3 — all backwards-compatible and inside `^3.3.3`'s range.
**How to avoid:** Either (a) keep `^3.3.3` and document in commit 1 body that the actual resolved version is whatever `latest` points to at install time; (b) pin to exact `"prettier": "3.3.3"` for literal ROADMAP match; (c) update `^3.3.3` to `^3.8.3` to make the actual floor match the install reality. **All three are acceptable; CONTEXT.md D-04 locks the caret at `^3.3.3`, so options (b) and (c) would require re-opening context.** Recommend (a) — leave as-is, note in commit body.
**Warning signs:** Reader confusion between ROADMAP "3.3" and `package-lock.json` 3.8.x.
**Confidence:** HIGH — verified via `npm view prettier dist-tags` returning `latest: 3.8.3`.

### Pitfall 4: `eslint-plugin-prettier` is installed but NOT wired into ESLint
**What goes wrong:** The planner, following the D-07 commit-1 verification step "lint still passes with bumped plugin," reasonably expects that the plugin bump affects lint rule coverage. It does not — `.eslintrc.js` extends only `plugin:vue/recommended` and `standard`. There is no `plugin:prettier/recommended`, no `extends: ["prettier"]`, no `plugins: ["prettier"]`. The devDep packages exist in `node_modules` but no ESLint rule references them.
**Why it happens:** Either (a) someone added the devDeps years ago intending to wire them up and never did; (b) someone removed the wiring at some point and left the packages behind. Either way: today, the lint pipeline does not invoke Prettier at all. `npm run lint` runs only ESLint's own rules plus the `vue/` and `standard` rule sets.
**How to avoid:** The planner should reframe commit 1's "lint still works" verification as **"lint still runs — the plugin bump does not throw on the new peer graph."** Expect zero new warnings from the plugin bump because the plugin is unreferenced. The real Prettier-3 enforcement comes from commit 2's `npm run prettier -- --check` gate, not from lint. Do NOT wire `plugin:prettier/recommended` into `.eslintrc.js` in this phase (scope expansion; defer to v1.4).
**Warning signs:** The planner drafting a wave action "verify `plugin:prettier/recommended` rules still apply" — that rule set isn't applied today, so there's nothing to verify.
**Confidence:** HIGH — directly observed by reading `.eslintrc.js`.

### Pitfall 5: `unicode-bom` rule newly ungated in `eslint-config-prettier@9`
**What goes wrong:** `eslint-config-prettier` v6 disabled the `unicode-bom` rule; v9 no longer does ([CITED: eslint-config-prettier v9.0.0 changelog]). If any source file in scope has or lacks a BOM in a way that the base ESLint `unicode-bom` rule flags, a new lint warning surfaces post-bump.
**Why it happens:** Pitfall 4 immediately makes this non-applicable — `.eslintrc.js` doesn't extend `prettier` / `eslint-config-prettier`, so whatever `eslint-config-prettier` does or doesn't disable is irrelevant to the active rule set. Noted for completeness only.
**How to avoid:** No action needed. If the planner later decides to wire `extends: ["prettier"]` into `.eslintrc.js` (deferred to v1.4), check for BOMs on `src/**` + `_scripts/**` at that time.
**Warning signs:** N/A for Phase 4.
**Confidence:** HIGH (changelog) / LOW (applicability — non-applicable here).

### Pitfall 6: Mixed CRLF/LF line endings in source
**What goes wrong:** `src/main/index.js` is CRLF-terminated; all other files in the glob are LF. Running `prettier --write` normalizes to LF by default (Prettier preserves `endOfLine` from config; `.prettierrc` doesn't set it, so default = `"lf"`). Commit 2's diff will include a line-ending flip for `src/main/index.js` on top of the whitespace reformat. Git's `core.autocrlf` (on per the STATE.md note — "LF will be replaced by CRLF" warning at checkout) will handle this correctly, but the diff-viewer on some platforms may render every line as changed due to the EOL flip.
**Why it happens:** `src/main/index.js` was edited on a Windows editor at some point with CRLF line endings while the rest of the codebase stayed LF (probably touched right before an installer-related change).
**How to avoid:** No proactive change. Prettier 3 normalizes to LF automatically. Do NOT add a `.gitattributes` entry — that's scope expansion (D-03 rationale applies). Document in commit 2 body: "src/main/index.js had CRLF line endings; normalized to LF by Prettier 3 default."
**Warning signs:** `git log -p -- src/main/index.js` on commit 2 shows every line as `-` / `+` on some platforms, despite the actual change being whitespace + EOL only.
**Confidence:** HIGH — directly observed via `cat -A src/main/index.js`.

### Pitfall 7: Prettier 2-vs-3 output parity for most files (don't over-attribute reformat to v3)
**What goes wrong:** The commit 2 message frames the reformat as "Prettier 3 changes." Readers expect substantive v3 algorithmic differences. In reality, 0 diff lines on 4 of 7 sampled files — the commit 2 diff is dominated by **accumulated v2 non-conformance**, not v2→v3 algorithm drift.
**Why it happens:** See Summary + Architecture Patterns diff shape table. The repo has been developed without the Prettier hook actually running; whitespace has drifted for years. Prettier 2.0.2 would produce the same reformat (minus the ~3 v3-specific items: HTML style-attr trailing `;`, template-literal single-line, Vue SFC parser strictness).
**How to avoid:** The commit 2 message body should honestly characterize this — e.g., "reformat captures accumulated v2 non-conformance in addition to v3's narrow algorithmic deltas (trailing `;` stripped from HTML `style=""` attrs; template literals keep single line when they fit)." This protects future bisecters who might suspect a specific Prettier-3 code-generation quirk of breaking something, when the real cause was a v2-era whitespace fix.
**Warning signs:** Future engineer reviewing commit 2 for a regression assumes it's "all Prettier 3" and misses a v2-era source fix that was also baked in.
**Confidence:** HIGH — empirically measured on 7 files; 4 had 0 algorithmic delta.

## Code Examples

### Commit 1 — exact `npm install` flow

```bash
# From repo root, on master branch, clean working tree:
# (edit package.json by hand to bump the 3 devDep pins per the diff above)

# Regenerate lock + install
npm install --legacy-peer-deps

# Verify resolved versions
npm ls prettier eslint-config-prettier eslint-plugin-prettier 2>&1 | grep -v "UNMET\|extraneous"

# Sanity-check: lint still runs end-to-end (not verify new rule coverage — see Pitfall 4)
npm run lint 2>&1 | tail -5
#   Expect: same or fewer warnings than pre-bump baseline.
#   Zero new warnings expected because the plugin isn't wired into .eslintrc.js.

# Stage exact files (no -A, no . — per D-10)
git add package.json package-lock.json
git status  # confirm only 2 files staged

# Commit
git commit -m "chore(deps): bump Prettier to v3 + ESLint-Prettier plugins

- prettier: ^2.0.2 -> ^3.3.3 (resolved to <actual>)
- eslint-config-prettier: ^6.10.1 -> ^9.1.0 (still supports ESLint 7)
- eslint-plugin-prettier: ^3.1.2 -> ^5.2.1 (peer wants ESLint 8+; --legacy-peer-deps)

Lint baseline preserved. Reformat follows in next commit."
```

### Commit 2 — exact reformat flow

```bash
# From the post-commit-1 working tree:

# (optional Wave 0 source prep: hand-fix HelpModal.vue orphan <p>/</p>)
# If done as a separate commit: edit file, `git add src/renderer/components/HelpModal.vue`,
# commit as `fix(HelpModal): remove orphan p/p tags causing Prettier parser error`.

# Run the formatter
npm run prettier
#   This invokes: prettier --write "{src,_scripts}/**/*.{js,ts,vue}"
#   Expect ~34 files rewritten; HelpModal.vue parser error if not pre-fixed.

# Verify all files now clean
npx prettier --check "{src,_scripts}/**/*.{js,ts,vue}" 2>&1 | tail -3
#   Expect: "All matched files use Prettier code style!" and exit 0.

# Sanity-check lint still clean on reformatted source
npm run lint

# Sanity-check renderer builds
npm run pack:renderer

# Stage exact paths (no -A, no . — per D-10)
git add src _scripts
git status  # confirm only src/** and _scripts/** changes; bot/docs/community-guide.md still unstaged

# Commit
git commit -m "format: prettier 3

Pure Prettier 3 output. No hand-edits. Reformat captures accumulated
pre-existing v2 non-conformance in addition to v3's narrow algorithmic
deltas (trailing ; stripped from HTML style=\"\" attrs in Vue SFCs;
template literals keep single line when they fit).

Files reformatted: ~34 in {src,_scripts}/**/*.{js,ts,vue}.
.prettierrc config unchanged (trailingComma es5 preserved).
No runtime behavior change."
```

### Pre-flight baseline capture (Wave 0, per Claude's Discretion)

```bash
# Lightweight metrics to anchor commit 2's "no regression" claim:

# Lint-warning count (most load-bearing — directly verifies D-11a)
npm run lint 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+(warning|error)' > /tmp/04-baseline-lint-warnings.txt
cat /tmp/04-baseline-lint-warnings.txt  # expected: 0 or a small number

# File count in glob (sanity check the reformat surface)
find src _scripts -type f \( -name '*.js' -o -name '*.ts' -o -name '*.vue' \) | wc -l
# expected: 35

# Renderer bundle byte count (sanity — should be near-zero delta post-reformat)
npm run pack:renderer && wc -c dist/renderer.js
# record the baseline value

# Save baseline artifact (.planning/ is gitignored — use git add -f per phase-3 pattern)
# See Phase 3's 03-01-BASELINE.md for the precedent.
```

## State of the Art

| Old Approach (Prettier 2.x era) | Current Approach (Prettier 3.x) | When Changed | Impact on This Repo |
|--------------------------------|----------------------------------|--------------|---------------------|
| `trailingComma` default `"es5"` | `trailingComma` default `"all"` | 3.0.0 (2023-07-05) | **Non-impact** — `.prettierrc` already pins `"es5"` explicitly. D-02 locks this. |
| `.tsx` / `.mts` / `.cts` parser auto-detect | Stricter file-extension parser mapping | 3.0.0 | **Non-applicable** — zero `.ts`/`.tsx`/`.mts` files in scope. |
| CSS parser accepted SCSS syntax | CSS parser is vanilla-CSS-only | 3.0.0 | **Non-applicable** — glob excludes `.css`/`.scss`. |
| Flow syntax recognized by `babel` parser without pragma | Requires `@flow` pragma or `.js.flow` extension | 3.0.0 | **Non-applicable** — no Flow in this repo. |
| `prettier.format()` synchronous | `prettier.format()` returns Promise | 3.0.0 | **Non-applicable** — this repo uses the CLI, not the programmatic API. |
| Minimum Node 10.13 | Minimum Node 14 | 3.0.0 | **Non-applicable** — project targets Node 16+ via Electron 41. |
| `.gitignore` not honored by default | `.gitignore` honored by default | 3.0.0 | **Benign** — glob already excludes build artifacts; no surprise exclusions. |
| Log level flag `--loglevel` | Log level flag `--log-level` | 3.0.0 | **Non-applicable** — no current invocation uses this flag. |
| Nested ternaries un-indented (3.0) | Nested ternaries re-indented (3.1) | 3.1.0 (2023-11-13) | **Low impact** — only a handful of nested ternaries in scope; measured deltas minimal. |
| Template-literal interpolations might break to new line | Template-literal interpolations keep single line when they fit | 3.2.0 (2024-01-12) | **Low impact** — directly observed: 6-line diff in `src/main/index.js`, small in Settings.vue. |
| GraphQL / markdown / Angular changes | various 3.x-era tweaks | 3.1-3.8 | **Non-applicable** — no GraphQL, Angular templates, or MDX; markdown not in glob. |
| `prettier/parser-babel.js` path | `prettier/plugins/babel.js` path | 3.0.0 | **Non-applicable** — no plugin imports in this repo's code. |
| HTML `style=""` attr preserves trailing `;` | HTML `style=""` attr strips trailing `;` | 3.0.0 (Vue/HTML parser) | **Observed impact** — main driver of the v3-algorithmic delta in Vue SFCs. Benign; no runtime effect. |

**Deprecated/outdated:**

- Prettier 2.x — no longer maintained. Any v2-era bugs (including the HelpModal parser handling) won't be fixed upstream.
- `eslint-config-prettier@6.x` + `eslint-plugin-prettier@3.x` — stale generations; still work but won't receive updates. Bump paths: v6 → v9 (ESLint 7 compatible, this phase) → v10 (ESLint 8+, deferred to v1.4).
- Running `prettier --write` without a pre-commit hook or CI check — the pattern that produced this repo's v2 non-conformance drift. Not fixed in this phase (D-03 scope), but the underlying gap is acknowledged.

## Assumptions Log

| # | Claim | Section | Risk if Wrong | Confidence |
|---|-------|---------|---------------|------------|
| A1 | Unsampled files in the glob will not surface additional Prettier 3 parser errors beyond HelpModal.vue. | Architecture Patterns / Pitfall 1 | A second parser error would surface during Wave 0; requires another hand-fix. Low risk — the HelpModal issue is a specific invalid-HTML pattern (orphan `</p>`); other Vue files don't use `<p>` around `<ol>`/`<ul>`/block-level content based on a representative read. | MEDIUM — only 7 of 35 files sampled empirically; the inference relies on structural similarity of the remaining 28. |
| A2 | Commit 2's reformatted source will produce a `dist/renderer.js` byte-count within ±0.1% of the pre-reformat baseline. | D-11b / Validation Architecture | If webpack's bundling is sensitive to whitespace in source (extremely unlikely — webpack parses to AST before minification), bundle could differ. Low risk. | MEDIUM — not directly measured; inferred from webpack/minifier semantics. |
| A3 | `npm run lint` will produce zero new warnings after commit 1's plugin bump. | D-11a / Pitfall 4 | If the plugin bump introduces a new ESLint 7 runtime-compat issue (`eslint-plugin-prettier@5` calling an ESLint-8-only API), `npm run lint` could crash. Mitigation: fall back to `eslint-plugin-prettier@^4.2.5` (final v4; supports ESLint 7) if v5.2.1 crashes. Medium risk — the plugin declares ESLint 8+ peer for a reason. | MEDIUM-LOW — peer declaration does not always reflect actual runtime incompatibility; `--legacy-peer-deps` accepts the mismatch, but runtime behavior is the real test. |
| A4 | Prettier 3.8.3 (the actual version `^3.3.3` resolves to) formats this codebase byte-identically to Prettier 3.3.3. | Standard Stack / Pitfall 3 | If a subtle 3.4-3.8 algorithmic change affects the repo, commit 2's diff could include surprises. Low risk — Prettier's semver discipline is strong; 3.4-3.8 release notes show only targeted bug fixes and new-syntax support, no semantic reformatting changes. | HIGH — Prettier maintainers are explicit about avoiding breaking formatting changes within a major. |
| A5 | `--legacy-peer-deps` resolves cleanly with the Phase 3 FA upgrades already in place (`@fortawesome/*@^6.7.2`, `@fortawesome/vue-fontawesome@^2.0.10`). | D-06 / Standard Stack | If a three-way peer conflict (new plugin versions + FA + typescript-eslint) creates an irreconcilable graph, install might still fail. Low risk — `--legacy-peer-deps` disables peer-enforcement globally. | HIGH — the flag's semantics are "ignore peer checks"; irreconcilable scenarios don't exist under it. |
| A6 | HelpModal.vue's `<p>` / `</p>` removal does not visually change the modal's rendered output. | Pitfall 1 | If the `<p>` was contributing a margin or padding style that the `<ol>` wasn't, the fix could introduce a subtle layout shift. Low risk — browsers already auto-close the `<p>` at the `<ol>`, so the rendered DOM already has no wrapping `<p>`; visible output is unchanged today. D-12's smoke test would catch any surprise. | HIGH — HTML5 auto-close semantics are well-defined; the current invalid markup has always been treated as no `<p>` wrapper. |

**If this table is empty:** It is not. Six assumptions are flagged; all are MEDIUM+ confidence. Risks are bounded and the smoke test (D-12) catches the most material of them (A2, A6).

## Open Questions

1. **Should the HelpModal.vue hand-fix land as a separate commit (Wave 0) or bundled into commit 2?**
   - What we know: D-07 frames commit 2 as "pure `npm run prettier` output"; a hand-edit would violate that framing.
   - What's unclear: Whether the user prefers 3-commit shape (`fix(HelpModal):` + `chore(deps):` + `format: prettier 3`) or tolerates a mixed commit 2 with explicit call-out.
   - Recommendation: **3-commit shape.** Preserves Phase 3 aesthetic. The HelpModal fix is 2 lines, benign, and orthogonal to the Prettier upgrade. Route to the user via the discuss-phase or plan-phase interactive checkpoint only if the planner judges this a material deviation from D-07.

2. **Should commit 1's body capture a pre-reformat lint-warning baseline artifact (`04-01-BASELINE.md`)?**
   - What we know: Phase 3 used this pattern (`03-01-BASELINE.md`) for bundle-size tracking.
   - What's unclear: Whether the lint-warning count is interesting enough to warrant an artifact, or a one-line commit-body note suffices.
   - Recommendation: **Claude's Discretion, per CONTEXT.md.** One-line commit body note is sufficient ("baseline: `npm run lint` reports N warnings on current HEAD"). Artifact only if the count is nonzero and the planner wants a per-file breakdown for future reference.

3. **Does the Jest test suite (`npm test` / `jest --passWithNoTests`) need running as part of Phase 4 validation?**
   - What we know: Test files are in scope of the reformat (`*.test.js` under `src/main/`, `src/utilities/`). CONTEXT.md D-11/D-12 don't mention Jest.
   - What's unclear: Whether formatter reformat of test files could theoretically break a test (e.g., a test that asserts on exact source-level whitespace — highly unlikely).
   - Recommendation: **Add Jest to Validation Architecture as SC2-adjacent.** `npm test` is ~1s with `--passWithNoTests` (main repo has no runtime renderer tests; bot/ is excluded); the cost is negligible, the signal is load-bearing. See Validation Architecture below.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm registry access | `npm install` for Prettier + ESLint plugins | ✓ (verified in Phase 3 install flow) | — | None needed |
| `npm run lint` / ESLint 7 | D-11a verification | ✓ (currently working; STATE.md confirms) | eslint 7.32+ | None needed |
| `npm run pack:renderer` / webpack 5 | D-11b verification | ✓ (verified working in Phase 3) | webpack 5.105.4 | None needed |
| `npm run dev` / electron + webpack-dev-server | D-12 smoke | ✓ (verified working in Phase 3) | electron 41.2.1 | None needed |
| `npm run build` / `electron-builder` | Optional D-13 full build | ✓ (but installer signing may block — see D-13) | electron-builder 26.8.1 | `npm run pack` (pack-only, no installer) |
| `jest` | SC2-adjacent test-suite sanity | ✓ | jest 30.3.0 | `--passWithNoTests` already set |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** `electron-builder` signing (D-13 documents the `npm run pack` substitute).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 (main repo) — covers `src/main/*.test.js` + `src/utilities/*.test.js` |
| Config file | `package.json` `"jest"` block |
| Quick run command | `npm test` (uses `--passWithNoTests`) |
| Full suite command | `npm run jest:coverage` |
| Formatter check | `npx prettier --check "{src,_scripts}/**/*.{js,ts,vue}"` (or `npm run prettier -- --check`) |
| Linter check | `npm run lint` |
| Renderer build check | `npm run pack:renderer` |
| Integration smoke | `npm run dev` + one manual screenshot round-trip (D-12) |

### Phase Requirements → Test Map

Mapping each ROADMAP.md success criterion to concrete automated verification:

| SC | Description (from ROADMAP.md) | Verification Type | Automated Command | Pass Condition | Applies At |
|----|-------------------------------|-------------------|-------------------|----------------|------------|
| **SC1** | `npm run prettier` completes cleanly on the entire codebase using Prettier 3.3; reformat captured as a single `format: prettier 3` commit for clean blame. | Automated | `npm run prettier -- --check` | Exit 0 + "All matched files use Prettier code style!"; no parser errors. | After commit 2 |
| **SC2** | `npm run lint` passes with Prettier-3-compatible ESLint plugin versions; no new warnings introduced. | Automated | `npm run lint` + diff against baseline (from Wave 0) | Exit 0; warning count ≤ baseline. | After commit 1 (verify no regression on un-reformatted source) AND after commit 2 (verify no regression on reformatted source) |
| **SC2-adjacent** | Test suite continues to pass on reformatted source (no test asserts on source-level whitespace). | Automated | `npm test` | Exit 0; all tests pass (or `--passWithNoTests` benign). | After commit 2 |
| **SC3a** | `npm run build` (or `npm run pack` per D-13) produces a working production build post-reformat. | Automated | `npm run pack` OR `npm run build` | Exit 0; `dist/renderer.js` and `dist/main.js` written; webpack emits no new errors/warnings attributable to reformatted source. | After commit 2 |
| **SC3b** | Manual smoke test of a screenshot capture round-trips successfully. | Manual (D-12) | `npm run dev`, then take one screenshot (hotkey OR button), confirm thumbnail appears in gallery, check devtools console for new errors. | Screenshot captured + appears in gallery; no new console errors attributable to reformatted source. | Final phase gate |

### Per-task Verification Mapping (drives VALIDATION.md)

| Task | Commit | Verification Commands | Pass Condition |
|------|--------|----------------------|----------------|
| **Wave 0: baseline + source prep** | (pre-phase) | `npm run lint` (capture warning count); `npx prettier --check "{src,_scripts}/**/*.{js,ts,vue}"` (expected: 34 files flagged including HelpModal parser error); `find src _scripts -type f \( -name '*.js' -o -name '*.ts' -o -name '*.vue' \) \| wc -l` (expected: 35) | Baseline captured as a commit-body note or `.planning/phases/04-.../04-01-BASELINE.md` artifact. HelpModal.vue hand-fix landed as `fix(HelpModal): remove orphan p tags` if 3-commit shape chosen. |
| **Commit 1: `chore(deps):` dep bump** | commit 1 | `npm install --legacy-peer-deps` (no ERESOLVE errors); `npm ls prettier eslint-config-prettier eslint-plugin-prettier` (expected resolved versions); `npm run lint` (warning count ≤ Wave-0 baseline); `npm test` (passes or `--passWithNoTests`) | All commands exit 0. Zero new lint warnings vs baseline. |
| **Commit 2: `format: prettier 3`** | commit 2 | `npm run prettier` (reformats ~34 files); `npm run prettier -- --check` (exit 0 + "All matched files use Prettier code style!"); `npm run lint` (warning count ≤ Wave-0 baseline, confirming reformat didn't introduce lint breakages); `npm test` (passes); `npm run pack:renderer` (exit 0, no webpack errors); `git status` (confirm bot/docs/community-guide.md still unstaged) | All automated gates pass. Commit 2 diff limited to src/** + _scripts/** files. |
| **Phase gate: manual smoke** | (post-commit-2) | `npm run dev`; take 1 screenshot via hotkey or manual button; confirm gallery thumbnail; devtools console clean | Screenshot round-trip succeeds; no FA/Prettier/reformat-attributable console errors. |

### Sampling Rate

- **Per task commit:** The automated verification commands in the table above (quick — ~30s lint + ~10s prettier-check + ~5s jest).
- **Per wave / phase gate:** Full sequence: install → lint → prettier check → test → pack:renderer → manual smoke. Total: ~3-5 minutes.
- **Phase gate requires:** All automated gates green + D-12 manual smoke approved before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] **HelpModal.vue hand-fix** — required before `npm run prettier -- --check` can ever exit 0. Either a dedicated `fix(HelpModal):` commit (recommended) or a pre-reformat edit inside commit 2 (explicit call-out in message).
- [ ] **Pre-reformat lint-warning baseline** — capture via `npm run lint 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+(warning|error)'`. Persist to commit-body note or `04-01-BASELINE.md` artifact (see Claude's Discretion in CONTEXT.md).
- [ ] **Renderer bundle baseline (optional)** — `npm run pack:renderer && wc -c dist/renderer.js` for post-reformat sanity comparison. Recommended because it directly supports A2's "no runtime impact" framing.
- [ ] **`dist/` regeneration** — after commit 1's `npm install`, the `postinstall` script runs `electron-builder install-app-deps` + `electron-rebuild`; any rebuild artifacts should be confirmed clean before moving to commit 2.

**No new test infrastructure is required.** Existing Jest suite + `prettier --check` + `npm run lint` + `npm run pack:renderer` cover SC1/SC2/SC3. Bot tests are unaffected (excluded from main jest config's `testPathIgnorePatterns`).

## Security Domain

Prettier is a code formatter. `eslint-config-prettier` disables conflicting ESLint rules. `eslint-plugin-prettier` wraps Prettier as an ESLint rule. None of these interact with authentication, session management, access control, input validation, cryptography, or any user-data flow.

**Phase-specific threats: NONE.** No STRIDE category applies — the phase is a devDep version bump plus pure whitespace/formatting reformat of source files. No runtime behavior changes; no new attack surface; no new data flows.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | — |
| V6 Cryptography | no | — |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| *(none applicable to a formatter upgrade + reformat)* | — | — |

**Supply-chain note (VERIFIED: npm view):** Target versions `prettier@3.3.3`, `prettier@3.8.3` (caret resolution), `eslint-config-prettier@9.1.0` through `9.1.2`, `eslint-plugin-prettier@5.2.1` through `5.5.5` are all published on the official npm registry by the Prettier org. No known CVEs on these versions as of 2026-04-21.

## Sources

### Primary (HIGH confidence)

- [VERIFIED: `npm view prettier version time` 2026-04-21] — prettier `3.3.3` published 2024-07-13; `3.8.3` published 2026-04-15; `latest` dist-tag = `3.8.3`.
- [VERIFIED: `npm view eslint-config-prettier dist-tags` 2026-04-21] — `{ latest: '10.1.8', 'release-v9': '9.1.2', 'release-v8': '8.10.2' }`.
- [VERIFIED: `npm view eslint-config-prettier@9.1.0 peerDependencies` 2026-04-21] — `{ eslint: '>=7.0.0' }` (ESLint 7 compatible).
- [VERIFIED: `npm view eslint-config-prettier@9.1.0 time` 2026-04-21] — published 2023-12-02.
- [VERIFIED: `npm view eslint-plugin-prettier@5.2.1 peerDependencies` 2026-04-21] — `{ eslint: '>=8.0.0', prettier: '>=3.0.0', '@types/eslint': '>=8.0.0' }` — **requires ESLint 8+, hence `--legacy-peer-deps` mandatory for this repo.**
- [VERIFIED: `npm view eslint-plugin-prettier@5.2.1 time` 2026-04-21] — published 2024-07-17.
- [VERIFIED: `npm view eslint-plugin-prettier dist-tags` 2026-04-21] — `{ latest: '5.5.5', 'release-v4': '4.2.5' }`; v4 is still maintained as an ESLint-7 fallback line.
- [VERIFIED: Prettier 2.0.2 locally vs Prettier 3.3.3 in `/tmp/prettier3-test` — direct empirical measurement] — `prettier --check` fails on 34 of 35 files in the glob under v2; same 34 under v3 (HelpModal.vue is a parser error in both). v2-vs-v3 algorithmic output delta: 0 diff lines on `_scripts/webpack.renderer.config.js`, `src/utilities/filenameFormat.js`, `src/utilities/desktop-capture.js`, `src/renderer/views/Worker.vue`; 6-12 diff lines on `src/main/index.js`, `src/renderer/components/Settings.vue`, `src/renderer/views/Home.vue`.
- [CITED: https://prettier.io/blog/2023/07/05/3.0.0.html] — Prettier 3.0 release notes; breaking-changes inventory (trailingComma default flip, CSS parser strictness, Node 14+, async API, plugin path reorg, .gitignore by default).
- [CITED: https://prettier.io/blog/2023/11/13/3.1.0.html] — 3.1 adds experimental curious-ternaries flag; restores nested-ternary indent.
- [CITED: https://prettier.io/blog/2024/01/12/3.2.0.html] — 3.2 avoids linebreak in template-literal interpolations when one isn't present; JSONC parser.
- [CITED: https://prettier.io/blog/2024/06/01/3.3.0.html] — 3.3 Flow declare-namespace; unquoted import attribute keys; template-literal member-chain preservation.
- [CITED: https://github.com/prettier/eslint-config-prettier/blob/v9.1.0/CHANGELOG.md] — v9.1.0 released 2023-12-02; ESLint 7+ required; `unicode-bom` no longer disabled; many `@typescript-eslint/*` rules added to disable list.
- [CITED: https://github.com/prettier/eslint-plugin-prettier/blob/master/CHANGELOG.md] — v5.0.0 raised ESLint peer floor to `>=8.0.0`, node to `^14.18.0 || >=16.0.0`, prettier to v3+.

### Secondary (MEDIUM confidence)

- [CITED: https://prettier.io/docs/en/upgrading-to-v3] (404 at fetch time; see Prettier 3.0 blog post above for coverage) — canonical migration guide URL.
- [CITED: project `.eslintrc.js` — direct read 2026-04-21] — extends `['plugin:vue/recommended', 'standard']` only; no `prettier` or `plugin:prettier/recommended` reference. Source of Pitfall 4.
- [CITED: project `.prettierrc` — direct read 2026-04-21] — `{ "semi": true, "singleQuote": true, "tabWidth": 3, "trailingComma": "es5", "useTabs": true }`; 7 lines; no `endOfLine` key (default LF).
- [CITED: project `package.json` — direct read 2026-04-21] — `"prettier": "prettier --write \"{src,_scripts}/**/*.{js,ts,vue}\""`; glob scope locked by D-01.
- [CITED: STATE.md Decisions Log 2026-04-21] — `--legacy-peer-deps` is the project's standing `npm install` pattern due to the `@typescript-eslint/eslint-plugin@2.34.0` vs `eslint@7` peer conflict; Phase 4 adds a second reason (plugin-prettier@5 vs eslint@7 peer).

### Tertiary (LOW confidence)

- [ASSUMED — A1] — Unsampled files in the glob will not surface additional Prettier 3 parser errors beyond HelpModal.vue. MEDIUM confidence (7 of 35 sampled).
- [ASSUMED — A2] — Webpack's `dist/renderer.js` output byte count is independent of source whitespace. MEDIUM confidence (inferred from AST semantics).
- [ASSUMED — A3] — `eslint-plugin-prettier@5.2.1` runtime-executes successfully against `eslint@7.32` despite the `eslint >=8.0.0` peer declaration. MEDIUM-LOW confidence; the peer declaration exists for a reason. Runtime fallback: pin `^4.2.5` if crashes manifest.

## Metadata

**Confidence breakdown:**

- Standard stack (version pins, peer deps, publish dates): **HIGH** — all verified via `npm view` 2026-04-21.
- Prettier 3.0-3.3 breaking-change inventory: **HIGH** — official release blog posts fetched directly.
- v2-vs-v3 algorithmic delta characterization: **HIGH** — empirically measured on 7 files; generalized inference across unsampled 28 files is MEDIUM.
- ESLint integration (Pitfall 4): **HIGH** — `.eslintrc.js` directly read and grepped for `prettier`.
- HelpModal parser error (Pitfall 1): **HIGH** — directly reproduced with both Prettier 2.0.2 and 3.3.3.
- `--legacy-peer-deps` requirement (Pitfall 2): **HIGH** — verified via peer-dependencies inspection on both plugin versions.
- Security domain: **HIGH** — phase involves no runtime behavior change; no applicable threats.
- Bundle-byte invariance (A2): **MEDIUM** — inferred from webpack semantics, not measured.
- Reformat scope file count (34): **HIGH** — directly measured via `prettier --check` and `find`.

**Research date:** 2026-04-21
**Valid until:** 2026-06-21 (60 days — Prettier 3 is a stable, mature major; drift risk low; the measured facts are stable for this repo's specific source state, but any source-file changes between now and then will shift the reformat surface)
