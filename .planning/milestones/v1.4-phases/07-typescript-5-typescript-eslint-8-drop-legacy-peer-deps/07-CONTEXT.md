# Phase 7: TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** `--auto` (gray areas auto-resolved with recommended defaults)

<domain>
## Phase Boundary

Upgrade TypeScript 3.8 → 5.7 and `@typescript-eslint/*` 2.25 → 8.x, triage the inference-driven error backlog (expected to be minimal — current `src/` has ZERO errors under strict mode; the 2567 baseline errors are all `node_modules/*.d.ts` parse failures that clear when TS can parse modern type syntax), and close the milestone by verifying `npm install` succeeds without `--legacy-peer-deps`.

Scope is limited to: `package.json` (deps + optional `type-check` script), `package-lock.json`, `tsconfig.json` (may need `moduleResolution` tweak for TS 5 defaults), `eslint.config.js` (wire typescript-eslint 8 flat-config plugin replacing `@typescript-eslint@2` FlatCompat entry), and any `@ts-expect-error` annotations in `src/utilities/*.js` if stricter TS 5 inference surfaces new errors.

**In scope:**
- Upgrade `typescript` `^3.8.3` → `^5.7.x` (latest stable 5.7 line)
- Upgrade `@typescript-eslint/parser` `^2.25.0` → `^8.x`
- Upgrade `@typescript-eslint/eslint-plugin` `^2.25.0` → `^8.x`
- Wire typescript-eslint 8 as a flat-config-native entry in `eslint.config.js` (drop the `@typescript-eslint@2` path through `fixupConfigRules`; v8 ships native flat config)
- Address any new TypeScript 5 errors in `src/utilities/*.js` (currently 0 errors under TS 3.8 in `src/`)
- Capture pre-migration `tsc --noEmit` baseline (0 src errors, 2567 node_modules errors) + per-rule eslint baseline under typescript-eslint@2 (~735 per Phase 6 post-migration)
- Run `npm install` (NO `--legacy-peer-deps`) as the LINT-03 acceptance gate — expected to succeed now that both peer conflicts (eslint-plugin-vue@6 cleared in Phase 6 D-01 Amendment; @typescript-eslint@2 cleared by TS-02 here) are gone
- Add explicit `"type-check": "tsc --noEmit"` script to `package.json` for DX + future CI wiring
- Update REQUIREMENTS §LINT-03 wording at phase close if Option 1 fallback was avoided; or keep Option 1 wording if any residual peer conflict forces `--legacy-peer-deps` retention

**Out of scope:**
- Converting any `.js` file to `.ts` (TS-01 wording says "compiles the codebase on TypeScript 5.7" — current `src/` is pure `.js` with JSDoc-optional inference via `allowJs`; no file extension changes in this phase)
- Adding stricter tsconfig flags beyond current `strict: true` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc. — scope creep; v2.0 candidate)
- Vue 3 migration (v2.0)
- Replacing `@babel/eslint-parser` with `@typescript-eslint/parser` as the `.js`/`.vue` primary parser (v2.0 — pairs with the Vue 3 + Vite bundler switch; keeping `@babel/eslint-parser` preserves the class-property + proposal-spread parsing path Phase 5 established)
- Upgrading `eslint-config-standard` 14 → 17+/neostandard (v2.0; typescript-eslint 8 can coexist with eslint-config-standard@14 via FlatCompat)
- Upgrading `eslint-plugin-import`/`node`/`promise`/`standard` legacy pins (v2.0; all stay via FlatCompat + `@eslint/compat` `fixupConfigRules` wrap from Phase 6)
- Upgrading `eslint-plugin-vue` beyond `^9.33.0` (v2.0 when Vue 3 lands)
- `bot/` workspace TypeScript (bot is pure ESM JS, not typechecked via this tsconfig)
- `jest` / test-runner version changes (deferred to v2.0 Vitest swap)
- `irsdk-node` type definitions update (pinned at `^4.4.0`; its `.d.ts` should parse fine under TS 5)
- `sharp` major version bump (already at `^0.34.5`)
- `.planning/` ignored patterns maintenance (current eslint.config.js ignores are correct)

</domain>

<decisions>
## Implementation Decisions

### TypeScript version pin

- **D-01:** **Pin `typescript` at `^5.7.x` (latest stable 5.7 line).** TS 5.7 ships the stable rewrite of `moduleResolution: "node"` semantics and is the current minor at 2026-04-22. `^5.7.x` caret keeps the project on 5.7 patches without jumping to 5.8+ (which isn't released yet; future bump is trivial). Exact minor resolved at plan time via `npm view typescript version`.
  - Rationale: REQUIREMENTS §TS-01 calls for "3.8 → 5.7." Caret is consistent with v1.3-v1.4 dep bump patterns.

### tsconfig.json preservation

- **D-02:** **Preserve current `tsconfig.json` byte-for-byte except for `moduleResolution` if TS 5 defaults require adjustment.** Current contents: `target: esnext`, `moduleResolution: node`, `allowJs: true`, `noEmit: true`, `strict: true`, `isolatedModules: true`, `esModuleInterop: true`, `resolveJsonModule: true`, `include: ['src/utilities']`. TypeScript 5 deprecated `moduleResolution: "node"` in favor of `"node10"` (the old behavior) or `"bundler"` / `"node16"`. Planner resolves which alias TS 5.7 accepts cleanly; planner chooses `"node10"` if explicit aliasing is required, otherwise preserves `"node"`.
  - Rationale: minimize config churn; `src/` compiles cleanly under current strict mode.
- **D-03:** **Do NOT add new strict flags.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` are all scope creep beyond "TS 3.8 → 5.7." REQUIREMENTS §TS-01 explicitly scopes to "inference-driven error backlog" under existing strictness — not expanding strictness.

### Error triage policy

- **D-04:** **Hybrid triage — fix trivial errors, `@ts-expect-error` with tracked follow-up comment for non-trivial.** Baseline: `src/` has ZERO errors under TS 3.8 with `strict: true` (2567 baseline errors are all in `node_modules/` — modern `.d.ts` syntax like `undici-types` that TS 3.8 can't parse). Expected TS 5 behavior: nearly all `node_modules` errors clear (TS 5 parses modern syntax); `src/` inference may surface a handful of new errors from stricter inference rules (e.g., `never` widening, `unknown` default, template-literal type narrowing). Any surfaced error gets:
  1. Trivial fix (add a cast, narrow a type guard, add a JSDoc `@ts-ignore` escape) — prefer this path
  2. `// @ts-expect-error: {specific issue}. TODO(post-v1.4): {what to investigate}` — only if fix requires broader refactor
  - **Hard limit:** if `@ts-expect-error` count would exceed 5, STOP and route to user (signals a larger refactor needed than v1.4 scope).
- **D-05:** **Baseline capture shape:** `07-01-BASELINE.md` mirrors Phase 5/6 artifact pattern. Contents: (a) `tsc --noEmit` pre-migration count + per-category breakdown (node_modules/**, src/**, _scripts/**), (b) `npx eslint --no-fix ./` pre-migration count (should match Phase 6 post-migration = 735), (c) pre-migration `@typescript-eslint/*` rule frequency, (d) timestamp + pre-migration HEAD SHA. Commit 2+ bodies cite the baseline for deltas.

### typescript-eslint 8 wiring

- **D-06:** **Use typescript-eslint 8's native flat-config exports — NOT via FlatCompat.** typescript-eslint 8 ships `tseslint.configs.recommended` as a flat-config-ready array. Replace Phase 6's legacy `@typescript-eslint@2` path (which was loaded via `eslint-config-standard@14`'s rule set and sat under `fixupConfigRules`) with a direct `tseslint.configs.recommended` spread in `eslint.config.js`. This removes one legacy-plugin coupling and positions the config for v2.0 cleanup.
  - Rationale: typescript-eslint 8 is designed for flat config; using FlatCompat here would be anti-pattern.
- **D-07:** **Place typescript-eslint entries AFTER FlatCompat legacy extends but BEFORE `prettierRecommended`.** Prettier/recommended must stay last (per Phase 6 D-03). New order in `eslint.config.js` array:
  1. Standalone ignores
  2. `fixupConfigRules(compat.extends('plugin:vue/recommended', 'standard'))` — note: drop `'prettier'` from the FlatCompat extends chain because prettierRecommended now handles format/lint conflicts natively
  3. Native languageOptions + rules block
  4. `.vue` SFC override (STRING parser, carries over from Phase 6)
  5. **NEW: `...tseslint.configs.recommended` spread** — typescript-eslint 8 native flat-config array
  6. `prettierRecommended` (last)
- **D-08:** **Scope typescript-eslint 8 rules to `.ts` files only.** Current codebase has zero `.ts` files. Applying typescript-eslint 8 rules to `.js` files would lint the `allowJs` tree under TS inference — overkill for v1.4 scope. Wire typescript-eslint entries with `files: ['**/*.ts']` so `.js` and `.vue` files continue through `@babel/eslint-parser` unchanged. If a `.ts` file is added post-v1.4, the rules activate automatically.
- **D-09:** **Parser for `.ts` files:** `@typescript-eslint/parser` inside the typescript-eslint `files: ['**/*.ts']` entry. `@babel/eslint-parser` remains the primary for `.js`/`.vue` `<script>` per Phase 5 + Phase 6 decisions. Dual-parser coexistence is idiomatic in typescript-eslint 8 flat config.
- **D-10:** **typescript-eslint 8 rule renames — audit and re-pin in `rules:` overrides if any current inline override was a renamed rule.** Current inline overrides are all non-TS-specific (`generator-star-spacing`, `semi`, `no-debugger`), so no action expected. Verified at plan time via typescript-eslint 8 changelog.

### LINT-03 acceptance gate — drop `--legacy-peer-deps`

- **D-11:** **LINT-03 is now achievable as originally scoped.** Phase 6's D-01 Amendment cleared the `eslint-plugin-vue@6 vs eslint@9` conflict. Phase 7 TS-02 clears the `@typescript-eslint@2 vs eslint@9` conflict. Empirical check at Phase 7 entry point (2026-04-22, run against master HEAD): `npm install --dry-run` produces exactly ONE ERESOLVE — `@typescript-eslint/eslint-plugin@2.34.0 peer eslint@^5||^6` vs `eslint@9.39.4`. That conflict resolves when TS-02 bumps typescript-eslint to 8. No other peer conflicts exist. **D-15 Option 1 "persists past v1.4" resolution (Phase 6 addendum) is now OBSOLETE** — Phase 7 should aim for the original LINT-03 wording.
- **D-12:** **LINT-03 gate commit is the FINAL commit of the phase.** After TS + typescript-eslint upgrades land and any tsc/lint errors clear, run `npm install` (NO `--legacy-peer-deps`) and verify the install succeeds with zero ERESOLVE errors. If it still fails, DO NOT proceed — STOP and triage the remaining conflict. The final commit stages `package-lock.json` regenerated WITHOUT the `--legacy-peer-deps` path (lockfile content may differ due to different resolution algorithm) and adds a prose acknowledgment in the commit body.
- **D-13:** **REQUIREMENTS §LINT-03 wording update at milestone-audit time.** If LINT-03 lands as originally scoped (no `--legacy-peer-deps`), note this in the audit. If any residual conflict forces retention, fall back to the Phase 6 D-15 Option 1 wording revision (defer removal to v2.0).

### Commit shape — D-04 pattern continuation

- **D-14:** **Three-commit minimum shape.** Phase 7 is more surgical than Phases 5-6; commits:
  1. `chore(deps): typescript 5 + typescript-eslint 8` — stages `package.json`, `package-lock.json` (regenerated with `--legacy-peer-deps` since typescript-eslint@2 still in effect at this HEAD), `07-01-BASELINE.md`
  2. `refactor(eslint): wire typescript-eslint 8 as native flat-config entries` — stages `eslint.config.js`
  3. `refactor(types): address typescript 5 inference errors` (OR `chore(tsconfig): preserve moduleResolution under TS 5`) — stages `tsconfig.json` if modified, any `src/utilities/*.js` files with `@ts-expect-error` annotations
  4. **Final commit:** `chore(deps): drop --legacy-peer-deps` — stages regenerated `package-lock.json` (clean install) + optional `package.json` script changes. This is the LINT-03 acceptance-gate commit and is the MILESTONE-closing commit for v1.4.
  - Rationale: four-commit chain isolates (a) dep bumps, (b) eslint config churn, (c) source code fixes, (d) final peer-conflict resolution. Bisect between any two lands at a single concern.
  - Rule-2 auto-fix optional: if TS 5 triage surfaces >3 file edits, planner may split commit 3 into commits 3a (type-check passing) + 3b (`@ts-expect-error` annotations) for additional bisect isolation.
- **D-15:** **No `Co-Authored-By:` footer, no `--no-verify`** (inherited from all prior phases).
- **D-16:** **`git add` NEVER uses `-A` or `.`** (inherited). Stage paths explicitly. Pre-existing dirty-tree paths STAY unstaged: `bot/docs/community-guide.md` (untracked), `bot/src/**/*.test.js`, `src/renderer/**/*.vue`, `.planning/PROJECT.md`.

### Parity check + verification

- **D-17:** **Post-migration lint count band:** acceptable range is ≤1881 (ROADMAP milestone ceiling retained). Internal goal: post_count ≈ 735 (Phase 6 level) ± typescript-eslint 8 native-rule delta (expected minimal since typescript-eslint rules only activate on `.ts` files per D-08 and there are none). Any delta attributed to: (a) typescript-eslint 8 changelog renames, (b) Vue v9 rule additions that fire after the typescript-eslint swap, (c) `eslint-config-standard@14` rule residuals after dropping the `'prettier'` FlatCompat entry (per D-07).
- **D-18:** **Post-migration tsc baseline:** expected `src/` error count stays at 0. `node_modules/**` errors should drop to 0 (TS 5 parses modern syntax). If any `src/` errors surface, apply D-04 hybrid policy.
- **D-19:** **`npm test` MUST pass 256/256** at every commit (carryover from all prior phases).
- **D-20:** **`npm run prettier -- --check` MUST pass 0 at every commit** (Phase 6 FMT-01 stays green).
- **D-21:** **`npm run pack:main` + `npm run pack:renderer` MUST compile clean** at every commit (Phase 5/6 carryover).

### Claude's Discretion

- **Exact version pins** for `typescript` (`^5.7.x`, planner resolves latest minor) and `@typescript-eslint/*` (`^8.x`, planner resolves latest minor compatible with ESLint 9 and `typescript@^5.7`).
- **`moduleResolution` alias under TS 5** — `"node"` may need to become `"node10"`. Planner tests at plan time via a throwaway `npx tsc --noEmit` after the upgrade and picks the alias that yields zero additional errors.
- **Whether to add a `type-check` npm script** — recommended (`"type-check": "tsc --noEmit"`), but planner may opt for `"tsc": "tsc --noEmit"` or skip entirely if it would churn `package.json` unnecessarily.
- **Whether commit 2 (eslint config churn) can be merged into commit 1 (dep bumps)** — NO (D-14). Keep separate for bisect.
- **How to handle Rule-2 auto-fix scope** — Phase 5/6 pattern applies if the migration surfaces unexpected scope shifts.
- **`eslint-config-standard@14` residual under typescript-eslint 8** — if standard's rule set conflicts with typescript-eslint 8 recommended (e.g., `no-use-before-define` is in both), the standard entry stays first and typescript-eslint 8 entries override in the array order. Document any intentional overlap in the plan's `<interfaces>` block.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and requirements

- `.planning/PROJECT.md` — v1.4 goal + Out-of-Scope list
- `.planning/REQUIREMENTS.md` §TS-01, §TS-02, §LINT-03 — acceptance criteria for this phase's three requirements
- `.planning/REQUIREMENTS.md` §"Success Criteria (Milestone-Level)" items 1 + 5 — `npm install` without `--legacy-peer-deps` + TS 5.7 compiles
- `.planning/ROADMAP.md` §"Phase 7" — Goal, Depends-on (Phase 6), 6 Success Criteria
- `.planning/STATE.md` §"Accumulated Context" — all prior patterns carry forward

### Prior-phase patterns directly reused here

- `.planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-CONTEXT.md` §D-01 Amendment — direct predecessor for Phase 7 D-06/D-09 (typescript-eslint 8 native flat-config pattern)
- `.planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-02-SUMMARY.md` — post-migration lint count 735 (Phase 7 D-17 denominator); four deviations accepted
- `.planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-01-BASELINE.md` — direct template for `07-01-BASELINE.md` artifact shape
- `.planning/phases/05-babel-package-renames/05-CONTEXT.md` §D-09, §D-11 — two-commit bisect shape; Phase 7 extends to four commits per D-14
- `.planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-CONTEXT.md` §D-15 Option 1 Resolution — NOW OBSOLETE per Phase 7 D-11 empirical check (2026-04-22); LINT-03 achievable as originally scoped

### Code reference points (files the plan will touch)

- `package.json` — lines 76–77 (`@typescript-eslint/eslint-plugin: ^2.25.0` → `^8.x`; `@typescript-eslint/parser: ^2.25.0` → `^8.x`), line 109 (`typescript: ^3.8.3` → `^5.7.x`). New optional entry: `scripts.type-check: tsc --noEmit`
- `package-lock.json` — regenerated twice: (a) with `--legacy-peer-deps` at commit 1 (dep bumps, typescript-eslint@2 still conflicts with eslint@9 transiently as commit 2 hasn't landed yet), (b) WITHOUT `--legacy-peer-deps` at final commit (D-11/D-12 gate). Planner may opt for single regeneration if lockfile content is invariant.
- `tsconfig.json` — current 19 lines with `moduleResolution: "node"`. May need alias update per D-02. Otherwise byte-preserved.
- `eslint.config.js` — current 102 lines (Phase 6 output). Planner: (a) drop `'prettier'` from `compat.extends` chain (plugin:prettier/recommended handles it now per D-07), (b) add native `tseslint.configs.recommended` entries scoped to `.ts` files per D-08, (c) wire `@typescript-eslint/parser` inside the `.ts` files block per D-09. Expected final count ~110 lines.
- `src/utilities/*.js` — 8 files (config.js, desktop-capture.js, filenameFormat.js, iracing-config-checks.js, logger.js, screenshot-name.js + 2 test files). Current TS 3.8 error count: 0. Any TS 5 errors get D-04 hybrid triage.

### External docs (researcher should verify at plan time)

- TypeScript 5.0 release notes: `https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html` — breaking changes + inference tightening between 3.8 and 5
- TypeScript 5.7 release notes: `https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/` — latest minor for D-01
- typescript-eslint 8 release notes: `https://typescript-eslint.io/blog/announcing-typescript-eslint-v8` — flat-config-native patterns, rule renames
- typescript-eslint flat-config docs: `https://typescript-eslint.io/getting-started#step-2-configuration` — `tseslint.configs.recommended` exact shape for `files: ['**/*.ts']` scope
- TypeScript `moduleResolution: node` deprecation: `https://www.typescriptlang.org/docs/handbook/module-resolution.html` — alias clarification for D-02
- `@typescript-eslint/parser` + `@babel/eslint-parser` coexistence in flat config: typescript-eslint docs §"Custom Parser" — pattern for dual-parser setup per D-09

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Phase 6's `eslint.config.js` skeleton** — entry order, FlatCompat + `@eslint/compat fixupConfigRules` wrap, `.vue` STRING parser override, `prettierRecommended` last. Phase 7 adds entries 5+ for typescript-eslint 8 without restructuring.
- **Phase 6's `06-01-BASELINE.md` structure** — direct template for `07-01-BASELINE.md` with additional section: `tsc --noEmit` baseline alongside the lint baseline.
- **`--legacy-peer-deps` dry-run check** — already performed at Phase 7 entry (D-11 empirical). Confirms exactly ONE residual conflict, clears with TS-02.

### Established Patterns

- **Caret pins on dep bumps** — Phase 3 FA, Phase 4 Prettier, Phase 5 `@babel/eslint-parser`, Phase 6 `eslint` + `eslint-config-prettier` + `eslint-plugin-vue` + `@eslint/compat`. Phase 7 D-01 (typescript) + typescript-eslint 8 entries follow suit.
- **`.planning/` gitignore + `git add -f` for in-phase artifacts** — applies to `07-01-BASELINE.md`.
- **No `Co-Authored-By:` footer, no `--no-verify`, explicit `git add <path>`** (D-15/D-16).
- **Phase 6 `eslint.config.js` output is the Phase 7 starting point** — not `.eslintrc.js` (long deleted).
- **Dual-parser pattern in flat config** — typescript-eslint 8 documents this as an idiomatic flow (`@typescript-eslint/parser` for `.ts` + custom parser for other file types). Phase 7 D-08/D-09 leverage it.

### Integration Points

- `package.json` `devDependencies` — 3 version bumps (typescript, @typescript-eslint/parser, @typescript-eslint/eslint-plugin). Optionally 1 new `scripts.type-check` entry.
- `package-lock.json` — regenerated 1-2 times per D-14 commit sequence.
- `tsconfig.json` — 0-1 line edit (`moduleResolution` alias, if needed).
- `eslint.config.js` — 2-3 entry additions (native tseslint spread + `.ts` parser override + possibly a rules override block), plus 1 entry edit (drop `'prettier'` from `compat.extends` chain per D-07).
- `src/utilities/*.js` — 0-5 edits expected (hybrid triage per D-04).
- `.babelrc` — **NOT edited** (Phase 5 D-05 inherit-semantics carryover).

### Out of Scope (deliberately)

- Converting `.js` → `.ts` — v2.0 candidate (pairs with Vue 3 TS surface expansion)
- Adding stricter tsconfig flags beyond `strict: true` (D-03)
- Replacing `@babel/eslint-parser` as the `.js`/`.vue` primary parser (v2.0)
- Vue 3 (v2.0)
- Jest → Vitest (v2.0)

</code_context>

<specifics>
## Specific Ideas

- **Mirror Phase 5/6's `0X-01-BASELINE.md` shape** byte-for-byte in `07-01-BASELINE.md`. Sections: TypeScript baseline (tsc count + per-category breakdown), ESLint baseline (count + top rules + hotspots), provenance (timestamp + HEAD SHA), post-migration prediction band.
- **Final commit message exact wording (per convention):** `chore(deps): drop --legacy-peer-deps` (D-12 gate commit). Body acknowledges this CLOSES LINT-03, cites Phase 6 D-01 Amendment as the first conflict clearance + TS-02 as the second + concludes v1.4 milestone.
- **Automated-first verification, per Phase 5/6 carryover:** `npm install` (no flag) succeeds → `npm run lint` count ≤1881 → `npm run prettier -- --check` exits 0 → `npm test` 256/256 → `npm run pack:renderer` + `npm run pack:main` compile → `npx tsc --noEmit` `src/` count = 0. No per-view manual UAT required.
- **If typescript-eslint 8 swap surfaces unexpected rule firings,** the planner may use the Phase 5 Option-A / Phase 6 Deviation 2 pattern: add a narrow `'off'` override in `eslint.config.js` with a TODO comment noting the rule was dropped in v1.4 scope and should be revisited in v2.0.

</specifics>

<deferred>
## Deferred Ideas

- **`.js` → `.ts` file conversion** — v2.0 candidate; v1.4 scope is "TS 5 compiles the existing `allowJs` tree"
- **Stricter tsconfig flags** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`) — v2.0
- **`@typescript-eslint/parser` as primary for `.js`/`.vue`** — v2.0 (pairs with Vue 3 + Vite)
- **`eslint-config-standard` 14 → 17+ or neostandard** — v2.0
- **Remaining legacy plugin upgrades** (`eslint-plugin-import`@2, `eslint-plugin-node`@11, `eslint-plugin-promise`@4, `eslint-plugin-standard`@4) — v2.0
- **Jest 25 → Vitest** — v2.0 (pairs with Vite+Electron bundler switch)
- **`irsdk-node` type-definition updates, `sharp` major** — not v1.4 scope; tracked separately
- **`bot/` workspace TypeScript** — bot is pure ESM JS; any TS adoption is a standalone ticket post-v1.4
- **Adding `"type-check"` script to CI pipeline** — script addition is in-scope per D-03 discretion; CI wiring is separate
- **Jest-env override for `.test.js` files** (Phase 5 baseline addendum 693 no-undef firings) — still deferred per Phase 6 CONTEXT; post-v1.4 ticket

</deferred>

---

*Phase: 07-typescript-5-typescript-eslint-8-drop-legacy-peer-deps*
*Context gathered: 2026-04-22*
*Mode: --auto (autonomous mode; gray-area decisions auto-resolved with recommended defaults; D-11 empirical check shows LINT-03 achievable as originally scoped)*
