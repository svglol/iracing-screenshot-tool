# Phase 4 — Post-reformat Verification (Wave 3)

**Captured:** 2026-04-21
**HEAD at capture (pre-commit):** `6035c71` (docs(04-02): complete Phase 4 Plan 02)
**Working tree state:** reformatted by `npm run prettier` (31 files), uncommitted

## SC1 — prettier --check clean

Command: `npm run prettier -- --check`
Exit: 0
Output: "All matched files use Prettier code style!"
Result: PASS

## SC2 — lint no-regression

| Metric | Baseline (04-01-BASELINE.md) | Post-reformat | Delta | Result |
|--------|------------------------------|---------------|-------|--------|
| lint warning+error count | 1929 | 2297 | **+368** | **FAIL (exceeds baseline)** |
| lint exit code | 0 | 0 | 0 | informational |

**Failure diagnosis (for orchestrator/user decision):**

The +368 delta is a **structural conflict** between `.prettierrc` and ESLint `standard` config, which was latent pre-reformat:

- `.prettierrc` declares `"useTabs": true, "tabWidth": 3` — Prettier emits tab-indented JS/TS files and tab-indented Vue `<script>` sections (Vue `<template>` HTML remains space-indented per Prettier's HTML/Vue-template override, not controlled by `useTabs`).
- ESLint `standard` config (via `eslint-config-standard`'s `eslintrc.json`) has `"no-tabs": "error"` and `"indent": "error"` enabled.
- `npm run lint` runs `eslint --fix`, which converts most tabs to spaces automatically. But **400 tabs remain** in positions where `--fix` cannot safely mutate (inside template literals, strings, certain JSX-like contexts), producing 400 unfixable `no-tabs` errors per-run.
- Pre-reformat, source files were space-indented (historical v2 non-conformance — the repo had been developed without Prettier ever actually running, see RESEARCH.md Summary + Pitfall 7). So **no-tabs had nothing to flag** and baseline lint = 1929.
- Post-reformat, Prettier has finally done its job and put tabs where `.prettierrc` always said they should go. The tabs now exist, and `standard`'s `no-tabs` rule fires on the ones `--fix` can't reach.
- Net structural pairing: `.prettierrc` says tabs, `standard` says no-tabs. They have been in conflict the entire time; only the empty-source ( = spaces everywhere) was hiding it.

**Per-category breakdown of the 2297 lint lines:**

| Rule | Count | Origin |
|------|-------|--------|
| `no-undef` | 1818 | Pre-existing (jest globals `describe`/`test`/`expect` in test files); baseline 1929 also includes these. |
| `no-tabs` | 400 | **NEW** (reformat-induced). Distributed across Vue SFCs and JS files: Home.vue (73), PromoCard.vue (60), SettingsModal.vue (49), TitleBar.vue (43), filenameFormat.js (29), desktop-capture.js (27), HelpModal.vue (27), SideBar.vue (25), others (66). |
| Parsing errors (ESLint parser) | 31 | Pre-existing — ESM/optional-chaining syntax in `bot/` files + `_scripts/release.js`. Baseline includes these. |
| `no-unused-expressions` | 19 | Pre-existing. |
| `no-mixed-spaces-and-tabs` | 16 | **NEW** (reformat-induced) — same root cause as no-tabs. |
| Other (no-void, vue/require-prop-types, etc.) | 13 | Mix of pre-existing and few new. |

**Net new errors attributable to reformat: ~416 (400 no-tabs + 16 mixed-spaces-and-tabs).**

## SC2-adjacent — test no-regression

Command: `npm test`
Exit: 0
Result: PASS — 5 test suites, 256 tests passed.

## SC3a — pack:renderer no-regression

| Metric | Baseline (04-01-BASELINE.md) | Post-reformat | Delta | Result |
|--------|------------------------------|---------------|-------|--------|
| dist/renderer.js bytes | 1,477,180 | 1,477,800 | **+620 bytes (+0.042%)** | **PASS** (within ±0.1% A2 tolerance) |
| pack:renderer exit | — | 0 | — | PASS |

`dist/renderer.js` written, webpack compiled in 9.6s with no new errors attributable to reformatted source.

## Reformat diff summary

- Files touched (src/** + _scripts/**): 31 (research forecast: ~33-34; 4 files were already prettier-conformant: `src/renderer/App.vue`, `src/renderer/router/index.js`, `src/renderer/store/index.js`, `src/renderer/store/modules/index.js` — matches RESEARCH.md §Architecture Patterns's "4 of 7 byte-identical" empirical sample at a population scale).
- Files outside the glob touched: 0 (D-01 scope invariant PRESERVED).
- Pitfall 6 (CRLF→LF normalization): OBSERVED — git flagged 31 files with "LF will be replaced by CRLF the next time Git touches it" warnings, matching the autocrlf-on-Windows pattern documented in RESEARCH.md Pitfall 6. Benign — git normalizes on staging.
- Pitfall 7 framing: CONFIRMED at scale — reformat diff is dominated by accumulated v2 non-conformance (tab conversion, line wrapping, whitespace cleanup). v3-specific algorithmic delta is narrow (Vue style="" trailing `;` stripped; template literal single-line preservation).
- `.prettierrc` byte-identical: CONFIRMED (`git diff -- .prettierrc` empty).
- `.eslintrc.js` byte-identical: CONFIRMED (`git diff -- .eslintrc.js` empty — Pitfall 4 invariant preserved).

## D-12 manual smoke — NOT RUN

Task 3 blocked on Task 2's SC2 failure. Orchestrator/user decision required before proceeding.

## Aggregate result

Automated gates: **BLOCKED** at SC2 lint regression.
- SC1 (prettier --check): PASS
- SC2 (lint ≤ baseline): **FAIL** (+368 vs baseline) — structural config conflict, see diagnosis
- SC2-adj (tests): PASS
- SC3a (pack:renderer + bundle): PASS

Manual smoke (SC3b): PENDING (blocked).

## Options for orchestrator/user decision

1. **Accept +368 as known structural regression, land anyway.** Document in Wave 3 SUMMARY and commit body that `.prettierrc useTabs: true` conflicts with `standard`'s `no-tabs: error` — a latent rule conflict uncovered by Prettier finally doing its job. Add to v1.4 scope: wire `eslint-config-prettier` into `.eslintrc.js` to disable the stylistic ESLint rules that Prettier should own. This is a one-time debt-recognition, not a functional regression — tests pass, pack:renderer clean, bundle delta within 0.042% of baseline.
2. **Wire `eslint-config-prettier` into `.eslintrc.js` now (minor scope expansion).** Add `'prettier'` to `extends` array in `.eslintrc.js`. Violates Pitfall 4 invariant (plugin unwired) but resolves the rule conflict cleanly. Re-run lint to measure; expected to drop well below 1929 baseline because it also disables other stylistic rules pre-existing in 1929.
3. **Change `.prettierrc` to `useTabs: false`.** Violates D-02 (byte-identical invariant). Would significantly expand reformat diff (re-tabbing every file again to spaces). Not recommended.
4. **Revert the whole reformat and reopen Phase 4 planning** to resolve the rule conflict first. Cost: Phase 4 re-scope. Not recommended — the reformat itself is correct.

**Recommended:** Option 1 or Option 2. Both preserve bisect shape (D-07) because neither requires touching commit 1 (chore(deps)). Option 1 is minimum-scope; Option 2 does the cleanup work now but slightly expands D-02/Pitfall 4 invariants.
