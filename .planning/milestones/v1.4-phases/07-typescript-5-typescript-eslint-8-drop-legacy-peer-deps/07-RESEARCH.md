# Phase 7: TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps — Research

**Researched:** 2026-04-22
**Domain:** TypeScript upgrade (3.8 → 5.7), typescript-eslint upgrade (2.25 → 8.x), peer-dependency resolution
**Confidence:** HIGH (all claims verified from npm registry, official docs, and source inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Pin `typescript` at `^5.7.x` (latest stable 5.7 line; caret means `~5.7.3` or exact `5.7.3` is safer — see Version Pin Pitfall below).
- **D-02:** Preserve `tsconfig.json` byte-for-byte except for `moduleResolution` if TS 5 requires adjustment. May need alias update from `"node"` to `"node10"`. Planner picks alias that yields zero additional errors.
- **D-03:** Do NOT add new strict flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.).
- **D-04:** Hybrid triage — fix trivial errors, `@ts-expect-error` with comment for non-trivial. Hard limit: ≤5 `@ts-expect-error` insertions; stop and route to user if exceeded.
- **D-05:** `07-01-BASELINE.md` mirrors Phase 5/6 artifact. Sections: tsc `--noEmit` pre-migration count + per-category, eslint pre-migration count (≈735), per-rule @typescript-eslint frequency, timestamp + HEAD SHA.
- **D-06:** Use typescript-eslint 8 native flat-config exports — NOT via FlatCompat.
- **D-07:** New eslint.config.js entry order: (1) ignores, (2) `fixupConfigRules(compat.extends('plugin:vue/recommended', 'standard'))` — drop `'prettier'` from this chain, (3) native languageOptions + rules, (4) `.vue` SFC override, (5) `...tseslint configs scoped to .ts`, (6) `prettierRecommended`.
- **D-08:** Scope typescript-eslint 8 rules to `files: ['**/*.ts']` only.
- **D-09:** `@typescript-eslint/parser` inside `.ts` files block; `@babel/eslint-parser` remains primary for `.js`/`.vue`.
- **D-10:** Audit rule renames from v2 → v8; current inline overrides are non-TS-specific so no action expected.
- **D-11:** LINT-03 achievable as originally scoped. ONE ERESOLVE confirmed (2026-04-22): `@typescript-eslint/eslint-plugin@2.34.0 peer eslint@"^5.0.0 || ^6.0.0"` vs `eslint@9.39.4`. Clears when TS-02 lands.
- **D-12:** LINT-03 gate commit is the FINAL commit. Must succeed with zero ERESOLVE before landing. STOP if it still fails.
- **D-13:** Update REQUIREMENTS §LINT-03 wording at milestone-audit if LINT-03 achieves original scope.
- **D-14:** Four-commit minimum: (1) `chore(deps): typescript 5 + typescript-eslint 8`, (2) `refactor(eslint): wire typescript-eslint 8 as native flat-config entries`, (3) `refactor(types)` or `chore(tsconfig)`, (4) final `chore(deps): drop --legacy-peer-deps`.
- **D-15:** No `Co-Authored-By:` footer, no `--no-verify`.
- **D-16:** Never `git add -A` or `git add .`. Explicit paths. Pre-existing dirty-tree paths STAY unstaged.
- **D-17:** Post-migration lint count band: ≤1881 ceiling; internal goal ≈735 ± typescript-eslint 8 delta.
- **D-18:** Post-migration tsc baseline: `src/` error count stays at 0; `node_modules/**` errors expected to drop to ~0.
- **D-19:** `npm test` MUST pass 256/256 at every commit.
- **D-20:** `npm run prettier -- --check` MUST pass 0 at every commit.
- **D-21:** `npm run pack:main` + `npm run pack:renderer` MUST compile clean at every commit.

### Claude's Discretion

- Exact version pins for `typescript` (`^5.7.x`, planner resolves) and `@typescript-eslint/*` (`^8.x`, planner resolves).
- `moduleResolution` alias under TS 5 — `"node"` vs `"node10"`. Planner tests at plan time.
- Whether to add a `type-check` npm script.
- Whether commit 2 (eslint config churn) can merge into commit 1 (NO per D-14).
- `eslint-config-standard@14` residual overlap with typescript-eslint 8 — standard entry stays first, typescript-eslint entries override.

### Deferred Ideas (OUT OF SCOPE)

- `.js` → `.ts` file conversion (v2.0)
- Stricter tsconfig flags (v2.0)
- `@typescript-eslint/parser` as primary for `.js`/`.vue` (v2.0)
- `eslint-config-standard` 14 → 17+/neostandard (v2.0)
- Legacy plugin upgrades: eslint-plugin-import@2, eslint-plugin-node@11, eslint-plugin-promise@4, eslint-plugin-standard@4 (v2.0)
- Jest 25 → Vitest (v2.0)
- `irsdk-node` type-definition updates, `sharp` major bump (separate tickets)
- `bot/` workspace TypeScript
- CI pipeline wiring for `type-check` script
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TS-01 | TypeScript compiler upgraded from 3.8 to 5.7 with inference-driven error backlog triaged | §Standard Stack confirms 5.7.3 pin; §TS 3.8→5.7 Breaking Changes enumerates what matters for `src/utilities/*.js` under `allowJs`+`strict`; §Architecture Patterns shows tsc --noEmit baseline capture and triage workflow |
| TS-02 | `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` upgraded from 2.25 to 8.x with rule renames migrated | §Standard Stack confirms 8.59.0 pin + peer compatibility; §typescript-eslint 8 Flat-Config Pattern documents exact CJS wiring; §Rule Renames v2→v8 lists all affected rules |
| LINT-03 | `--legacy-peer-deps` npm flag removed — no remaining peer conflicts after LINT-01 + TS-02 | §Peer Conflict Empirical Audit confirms ONE remaining ERESOLVE clears with TS-02; §Other Legacy Plugins confirms no other conflicts; §Lockfile Determinism addresses the two-regen question |
</phase_requirements>

---

## Summary

Phase 7 is the most surgical of the three v1.4 phases: three targeted package bumps (`typescript`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`), one new devDep (`typescript-eslint` umbrella for flat-config API access), a small `eslint.config.js` addition (one new entry block scoped to `.ts` files), and an optional `moduleResolution` alias update in `tsconfig.json`. The work lands in four commits.

The empirical peer-conflict audit (run 2026-04-22 against master HEAD) confirms exactly ONE ERESOLVE: `@typescript-eslint/eslint-plugin@2.34.0 peer eslint@"^5.0.0 || ^6.0.0"` vs `eslint@9.39.4`. Every other legacy plugin (`eslint-plugin-import@2.32.0`, `eslint-plugin-promise@4.2.1`, `eslint-plugin-node@11.1.0`, `eslint-config-standard@14.1.1`) satisfies `eslint@9` within their declared peer ranges. That single ERESOLVE clears the moment TS-02 bumps typescript-eslint to 8.x.

The TypeScript 3.8→5.7 upgrade has near-zero source impact. All 2567 current `tsc --noEmit` errors originate from `node_modules/` (TS 3.8 cannot parse modern `.d.ts` syntax in `@types/yargs`, `@types/node`, `undici-types`). The `src/utilities/` tree compiles clean at ZERO errors under TS 3.8 with `strict: true`, and the code patterns present (null-returning functions, no-access catch clauses, no enums, no TypeScript syntax) are not in the path of any TS 3.8→5.7 breaking change.

**Primary recommendation:** Use `typescript@5.7.3` (pinned with tilde `~5.7.3` to stay within the 5.7 minor) alongside `@typescript-eslint/eslint-plugin@^8.59.0` + `@typescript-eslint/parser@^8.59.0` + `typescript-eslint@^8.59.0` (new umbrella devDep). Wire the umbrella's `tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] })` output as a spread in `eslint.config.js` between the FlatCompat chain and `prettierRecommended`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TypeScript type-checking | Build tooling (CLI) | — | `tsc --noEmit` is a dev-time gate; no runtime component |
| ESLint typescript-eslint rules | Build tooling (linter) | — | Rules fire in lint pipeline; scoped to `.ts` files only per D-08 |
| Peer-dependency resolution | npm install | — | Package manager concern; no runtime component |
| `moduleResolution` config | Build tooling (tsc) | webpack bundler | Affects both type-checking and module import resolution paths |
| `@typescript-eslint/parser` | Lint (ESLint) | — | Parser only runs during `npm run lint`; no relation to webpack or Babel at runtime |

---

## Standard Stack

### Core (TS-01, TS-02, LINT-03)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `typescript` | `5.7.3` | TypeScript compiler for `tsc --noEmit` type-checking of `src/utilities/` | Latest stable 5.7 patch; per CONTEXT D-01; `~5.7.3` (tilde) enforces 5.7.x ceiling |
| `@typescript-eslint/eslint-plugin` | `^8.59.0` | ESLint rules for TypeScript files | Latest 8.x; flat-config native; peer-compatible with eslint@9 and typescript@5.7.3 |
| `@typescript-eslint/parser` | `^8.59.0` | ESLint parser for `.ts` files | Must match plugin version exactly (peer: `^8.59.0`) |
| `typescript-eslint` | `^8.59.0` | NEW umbrella package; provides `tseslint.configs.recommended` flat-config array | Bundles plugin+parser+utils; the documented way to access `tseslint.configs.recommended` in CJS flat config |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `prettier@^3.3.3` | current pin | Format enforcement | No change; Prettier 3 parses TS 5 without issue |
| `@babel/preset-typescript` | current `.babelrc` | Babel strips TS syntax in transpile path | No change; continues handling `.babelrc` for webpack |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `typescript-eslint` umbrella + separate `@typescript-eslint/*` | separate packages only | Without umbrella, accessing `tseslint.configs.recommended` requires `require('@typescript-eslint/eslint-plugin').configs['flat/recommended']` (raw plugin path, undocumented); umbrella is the official documented API |
| `typescript@~5.7.3` (tilde) | `typescript@^5.7.3` (caret) | Caret `^5.7.3` resolves to `>=5.7.3 <6.0.0` — installs 5.9.3 today; tilde `~5.7.3` resolves to `>=5.7.3 <5.8.0` — stays on 5.7.x as CONTEXT D-01 intends |
| `tseslint.configs.recommended` (no type-checking) | `tseslint.configs.recommendedTypeChecked` | Type-checked rules require `parserOptions.project` pointing at tsconfig + slow per-file TS API invocation; overkill for zero `.ts` files today |

**Version verification:** [VERIFIED: npm registry 2026-04-22]

```bash
npm view typescript@"5.7.x" version         # → 5.7.3 (latest patch)
npm view @typescript-eslint/eslint-plugin version  # → 8.59.0
npm view @typescript-eslint/parser version         # → 8.59.0
npm view typescript-eslint version                 # → 8.59.0
```

**Installation (commit 1 — still uses `--legacy-peer-deps` because this commit precedes the final lockfile regen):**

```bash
npm install --save-dev --legacy-peer-deps \
  "typescript@~5.7.3" \
  "@typescript-eslint/eslint-plugin@^8.59.0" \
  "@typescript-eslint/parser@^8.59.0" \
  "typescript-eslint@^8.59.0"
```

**Final install (commit 4 — LINT-03 gate, NO `--legacy-peer-deps`):**

```bash
npm install
```

---

## Architecture Patterns

### System Architecture Diagram

```
npm install (LINT-03 gate)
    |
    v
package.json dep versions
    |
    +--> typescript@~5.7.3 ------------> tsc --noEmit
    |         |                               |
    |         v                               v
    |    TypeScript compiler          src/utilities/*.js
    |    (type-checks .js via         (0 errors expected)
    |     allowJs + strict)
    |
    +--> @typescript-eslint/*@^8.59.0 -> eslint.config.js
              |                               |
              |     [files: '**/*.ts' only]   |
              v                               v
         tseslint.configs.recommended    zero .ts files today
         (rules: recommended set)        (rules never fire)
              |
              v
         @typescript-eslint/parser
         (parses .ts if added post-v1.4)
```

### Recommended Project Structure (no changes from Phase 6)

```
./
├── eslint.config.js     # Modified: add tseslint entries after FlatCompat chain
├── tsconfig.json        # Modified: moduleResolution "node" → "node10" (if needed)
├── package.json         # Modified: 3 version bumps + 1 new devDep + optional type-check script
├── package-lock.json    # Regenerated: twice (once with --legacy-peer-deps, once without)
└── src/utilities/       # 0-5 files may receive @ts-expect-error annotations (expected: 0)
```

### Pattern 1: typescript-eslint 8 CJS Flat-Config Wiring (D-06, D-08, D-09)

**What:** Add typescript-eslint 8 as a native flat-config entry scoped to `.ts` files only. Uses the `typescript-eslint` umbrella package for `tseslint.config()` helper which propagates the `files` constraint to every inner config in the extends array — including the `base` config that otherwise sets the parser globally.

**When to use:** Any project using ESLint flat config with TypeScript files coexisting alongside Babel-parsed `.js` files.

**Critical detail:** `tseslint.configs.recommended` is an array of three objects: `base` (NO `files:` prop — parser override applies globally), `eslint-recommended` (`files: ['**/*.ts',...]`), and the rules block (NO `files:` prop). If you spread it directly (`...tseslint.configs.recommended`), the `base` object's `languageOptions.parser = @typescript-eslint/parser` overrides `@babel/eslint-parser` for ALL files including `.js` and `.vue`. You MUST use `tseslint.config({ files: [...], extends: [...] })` to scope the `files` constraint into each inner config.

```javascript
// Source: https://unpkg.com/typescript-eslint@8.59.0/dist/config-helper.js (inspected 2026-04-22)
// Source: https://unpkg.com/@typescript-eslint/eslint-plugin@8.59.0/dist/configs/flat/base.js

'use strict';

const { FlatCompat } = require('@eslint/eslintrc');
const { fixupConfigRules } = require('@eslint/compat');
const globals = require('globals');
const babelParser = require('@babel/eslint-parser');
const vueParser = require('vue-eslint-parser');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const tseslint = require('typescript-eslint');   // NEW: umbrella package

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
	// 1. Global ignores (unchanged from Phase 6)
	{ ignores: ['bot/**', 'dist/**', 'node_modules/**', 'build/**',
	            '.planning/**', '.tools/**', '.tmp-inspect/**'] },

	// 2. FlatCompat legacy chain — DROP 'prettier' (D-07: prettierRecommended handles it)
	...fixupConfigRules(
		compat.extends('plugin:vue/recommended', 'standard')
		// 'prettier' dropped per D-07 — prettierRecommended entry handles disables natively
	),

	// 3. Native languageOptions + rules (unchanged from Phase 6)
	{
		files: ['**/*.{js,ts,vue}'],
		languageOptions: {
			globals: { ...globals.browser, ...globals.es2015, Atomics: 'readonly', SharedArrayBuffer: 'readonly' },
			parser: babelParser,
			parserOptions: { ecmaVersion: 2018, sourceType: 'module', requireConfigFile: true },
		},
		rules: {
			'generator-star-spacing': 'off',
			semi: ['error', 'always'],
			'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		},
	},

	// 4. Vue SFC parser override (unchanged from Phase 6 — Pitfall 6 carryover)
	{
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueParser,
			parserOptions: { parser: '@babel/eslint-parser', ecmaVersion: 2018, sourceType: 'module', requireConfigFile: true },
		},
	},

	// 5. NEW: typescript-eslint 8 native flat config — scoped to .ts files only (D-08, D-09)
	//    tseslint.config() propagates files: ['**/*.ts'] into every inner config,
	//    INCLUDING the base config (which sets languageOptions.parser). Without this
	//    files scoping the base config would override @babel/eslint-parser for ALL files.
	//    tseslint.config() is deprecated in favor of ESLint's defineConfig() but is
	//    CJS-compatible and works correctly for this use case.
	...tseslint.config({
		files: ['**/*.ts'],
		extends: [tseslint.configs.recommended],
		// No parserOptions.project — uses non-type-checked recommended (D-11 choice)
	}),

	// 6. Prettier (last — unchanged from Phase 6)
	prettierRecommended,
];
```

### Pattern 2: tsconfig.json `moduleResolution` under TS 5

**What:** TypeScript 5.0 renamed `moduleResolution: "node"` to `"node10"` for clarity, keeping `"node"` as a backward-compatibility alias. No deprecation warning is emitted; `"node"` and `"node10"` produce identical behavior.

**When to use:** The planner should test `npx tsc --noEmit` with the current `"node"` value first. If it compiles clean (expected: yes, per TS docs confirming alias), preserve `"node"`. If TS 5.7 emits a diagnostic for `"node"`, change to `"node10"`. No other `tsconfig.json` changes needed. [CITED: https://www.typescriptlang.org/docs/handbook/modules/reference.html#node10-formerly-known-as-node]

```json
{
  "compilerOptions": {
    "moduleResolution": "node10",  // or keep "node" if no diagnostic
    "target": "esnext",
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

### Anti-Patterns to Avoid

- **Spreading `tseslint.configs.recommended` directly without `files` scoping:** The `base` config inside the array has NO `files:` property, making it global. It sets `languageOptions.parser = @typescript-eslint/parser` for ALL files — breaking `@babel/eslint-parser` for `.js` and `.vue`. Always use `tseslint.config({ files: ['**/*.ts'], extends: [...] })` to propagate the file constraint.

- **Using caret `^5.7.3` for TypeScript version:** Caret resolves to `>=5.7.3 <6.0.0`, which today installs `5.9.3` (or higher). CONTEXT D-01 intends the 5.7.x minor line. Use tilde `~5.7.3` to enforce `>=5.7.3 <5.8.0`.

- **Installing `typescript-eslint` umbrella without bumping `@typescript-eslint/parser`:** The umbrella's plugin peer requires `@typescript-eslint/parser@^8.59.0` as a hard peer dep. Both must be bumped together.

- **Using `tseslint.configs.recommendedTypeChecked`** without `parserOptions.project`: Type-checked rules invoke the TypeScript compiler API per file at lint time — slow (seconds per file) and requires a tsconfig. Since the project has zero `.ts` files today and no tsconfig pointing at sources for type-checking, use `tseslint.configs.recommended` (no type info required).

- **Running `npm install` (no flag) as commit 1:** Commit 1 still has `@typescript-eslint@2` removed from `package.json` but the lockfile hasn't been regenerated with the new packages yet. The FIRST install after the version bump in `package.json` must still use `--legacy-peer-deps` because npm resolves the peer graph including ALL devDeps simultaneously — and `@typescript-eslint@2` is being REPLACED (not yet removed). After the bump, npm installs `@typescript-eslint@8` which satisfies `eslint@9`. The final lockfile regen (commit 4) without `--legacy-peer-deps` confirms LINT-03.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript flat-config scoping | Custom `files:` wrap logic for each inner config | `tseslint.config({ files: [...], extends: [...] })` | The helper correctly propagates `files` into nested configs including global-override `base` |
| TypeScript version peer checking | Manual semver range validation | `npm install` output (ERESOLVE = fail, success = valid) | npm resolves the full graph; spot-checking a few ranges misses transitive conflicts |
| `no-unused-vars` for .ts files | Keep standard's rule active for .ts | Let `tseslint.configs.recommended` turn off base + enable `@typescript-eslint/no-unused-vars` | Standard's `no-unused-vars` doesn't understand TypeScript type-only imports/exports |

**Key insight:** The `tseslint.config()` helper exists precisely because flat-config extends arrays don't propagate `files` constraints automatically. Doing this by hand (re-wrapping each entry in the `tseslint.configs.recommended` array) is fragile and breaks when the recommended config gains new entries.

---

## TS 3.8 → 5.7 Breaking Changes Assessment

This section answers which TS 4.x–5.x inference changes could surface new errors in `src/utilities/*.js` under `allowJs: true` + `strict: true`. Current state: ZERO `src/` errors under TS 3.8.

### Changes That Could Affect `src/utilities/`

| Change | TS Version | Impact on `src/utilities/` |
|--------|------------|---------------------------|
| `useUnknownInCatchVariables` default in `strict` mode | 4.4 | Catch variables become `unknown` type. The two files with `catch (error)` (`iracing-config-checks.js`, `logger.js`) never ACCESS `error` — caught and silently swallowed. **No new errors expected.** |
| Relational operators with `number \| string` union now error | 5.0 | No `>`, `<`, `<=`, `>=` used with mixed numeric/string unions in `src/`. **No impact.** |
| Enum overhaul (stricter literals) | 5.0 | No TypeScript enums anywhere in `src/utilities/`. (`config.js` has `enum: ['jpeg','png','webp']` as a JSON schema property, not a TS enum). **No impact.** |
| `never`-initialized variables detection | 5.7 | `logger.js` declares `let _logDir = null`, `let _isDebug = null`, `let _initialized = false` — all initialized. `screenshot-name.js` and others use `const` with immediate initialization. **No impact.** |
| Functions returning `null`/`undefined` more-implicit-any errors | 5.7 | Multiple functions return `null` or `undefined` (e.g., `desktop-capture.js`), but `allowJs: true` + `.js` files don't trigger `noImplicitAny` on return types the same way `.ts` files do. Expected: **No new errors.** |
| `lib.d.ts` changes (TypedArrays, ArrayBuffer hierarchy) | 5.9 | Not applicable — project pinned at `~5.7.3`, not 5.9. |
| `forceConsistentCasingInFileNames` defaults to `true` | 5.0 | All imports in `src/utilities/*.js` use lowercase paths. **No impact.** |

### Changes That Do NOT Apply

- Template literal type narrowing (TS 4.1+): utilities don't use template literal types
- `Function.prototype.bind` type changes: no `.bind()` calls in utilities
- `Array#indexOf` return type changes: none used in type-sensitive positions

**Prediction:** `src/utilities/` error count stays at ZERO after the upgrade. The 2567 `node_modules/` errors should clear substantially (modern `.d.ts` syntax in `@types/yargs`, `@types/node/http2.d.ts`, `undici-types` — all TS 3.8 parse failures).

**Source breakdown (current 2567 errors):** [VERIFIED: `npx tsc --noEmit` 2026-04-22]

| Source | Count |
|--------|-------|
| `node_modules/@types/yargs/index.d.ts` | 893 |
| `node_modules/@types/node/http2.d.ts` | 567 |
| `node_modules/@types/node/https.d.ts` | 474 |
| `node_modules/@types/node/http.d.ts` | 385 |
| `node_modules/@types/express-serve-static-core/index.d.ts` | 123 |
| `node_modules/@types/node/util.d.ts` | 40 |
| `node_modules/@types/babel__traverse/index.d.ts` | 40 |
| `node_modules/undici-types/**` | ~29 |
| other `node_modules/` | ~16 |
| `src/**` | **0** |

All errors are TS 3.8's inability to parse modern type syntax (conditional types, mapped types, template literals, `infer` patterns). TS 5.7 handles all of these.

---

## Peer Conflict Empirical Audit

### Current State (2026-04-22)

`npm install --dry-run` produces exactly ONE ERESOLVE: [VERIFIED: live run 2026-04-22]

```
npm error ERESOLVE could not resolve
npm error   peer eslint@"^5.0.0 || ^6.0.0" from @typescript-eslint/eslint-plugin@2.34.0
npm error Conflicting peer dependency: eslint@6.8.0
```

### After TS-02 Upgrade

All legacy plugins' peer ranges vs `eslint@9.39.4` — none cause ERESOLVE: [VERIFIED: npm registry]

| Package (installed version) | eslint peer range | Satisfies eslint@9.39.4 |
|----------------------------|-------------------|------------------------|
| `eslint-plugin-import@2.32.0` | `^2 \|\| ^3 \|\| ... \|\| ^8 \|\| ^9` | YES |
| `eslint-plugin-promise@4.2.1` | `>=5.16.0` | YES |
| `eslint-plugin-node@11.1.0` | `>=5.16.0` | YES |
| `eslint-plugin-standard@4.0.1` | `>=5.0.0` | YES |
| `eslint-config-standard@14.1.1` | `>=6.2.2` | YES |
| `@babel/eslint-parser@7.28.6` | `^7.5.0 \|\| ^8.0.0 \|\| ^9.0.0` | YES |
| `@typescript-eslint/eslint-plugin@8.59.0` | `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` | YES |
| `typescript-eslint@8.59.0` | `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` | YES |

Programmatic verification (lockfile scan for all packages with `eslint` peer dep):

```bash
node -e "
const l=require('./package-lock.json');
const semver=require('semver');
for (const [pkg, data] of Object.entries(l.packages||{})) {
  const p=data.peerDependencies||{};
  if (p.eslint && !semver.satisfies('9.39.4', p.eslint))
    console.log(pkg, ':', p.eslint);
}
"
# Output: only @typescript-eslint@2 entries — clears with TS-02
```

**Conclusion:** LINT-03 is achievable as originally scoped. Zero additional conflicts surface after the upgrade.

---

## Lockfile Determinism

**Question:** Does `npm install` WITHOUT `--legacy-peer-deps` produce a different lockfile than `npm install --legacy-peer-deps` when there are NO peer conflicts?

**Answer:** Potentially minor structural differences exist, but resolved package versions are identical. [ASSUMED — based on npm algorithm documentation]

Explanation: `--legacy-peer-deps` uses npm v6's peer-dependency hoisting algorithm. The modern algorithm includes peer deps in the dependency tree resolution graph. When no ERESOLVE exists, both algorithms resolve the same top-level package versions, but the nesting structure in `node_modules/` (and therefore in `package-lock.json`) may differ subtly for peer packages. For this project (all packages flat-hoisted), the practical difference is minimal.

**Implication for D-14:** The two-regen approach (commit 1: `--legacy-peer-deps`, commit 4: without) is correct. The commit 4 lockfile is the canonical LINT-03-clean lockfile and should be treated as authoritative, even if it differs byte-for-byte from the commit 1 lockfile.

---

## typescript-eslint 8 Rule Changes (v2 → v8)

Rules changed since `@typescript-eslint@2.x` that appear in the v8 `recommended` config. Since the project has zero `.ts` files (rules never fire per D-08 scope), this is informational for post-v1.4 `.ts` additions.

### Removed Rules (in v8 — replaced)

| Old Rule (v2) | Status in v8 | Replacement |
|---------------|-------------|-------------|
| `@typescript-eslint/ban-types` | REMOVED | `@typescript-eslint/no-restricted-types` + `no-empty-object-type` + `no-unsafe-function-type` + `no-wrapper-object-types` |
| `@typescript-eslint/no-throw-literal` | REMOVED | `@typescript-eslint/only-throw-error` |
| `@typescript-eslint/no-useless-template-literals` | RENAMED | `@typescript-eslint/no-unnecessary-template-expression` |
| `@typescript-eslint/no-loss-of-precision` | DEPRECATED (use base ESLint) | `no-loss-of-precision` (base rule) |
| Formatting/layout rules (indent, etc.) | REMOVED | `eslint.style` alternatives |

### Deprecated/Renamed Rules

| Old Name | New Name | Action |
|----------|----------|--------|
| `@typescript-eslint/prefer-ts-expect-error` | use `@typescript-eslint/ban-ts-comment` | Remove any explicit enable; recommended handles it |
| `@typescript-eslint/no-var-requires` | `@typescript-eslint/no-require-imports` | Current inline overrides don't reference either — no action |

### Behavior Changes

| Rule | Change |
|------|--------|
| `@typescript-eslint/no-unused-vars` | Catch-variable handling aligned with ESLint 9 defaults |
| `@typescript-eslint/prefer-nullish-coalescing` | `ignoreConditionalTests` default changed to `true` (less noisy) |

### Rules in v8 `recommended` That Fire on `.ts` Files (for reference)

```
@typescript-eslint/ban-ts-comment: error
@typescript-eslint/no-array-constructor: error  (base no-array-constructor: off)
@typescript-eslint/no-duplicate-enum-values: error
@typescript-eslint/no-empty-object-type: error
@typescript-eslint/no-explicit-any: error
@typescript-eslint/no-extra-non-null-assertion: error
@typescript-eslint/no-misused-new: error
@typescript-eslint/no-namespace: error
@typescript-eslint/no-non-null-asserted-optional-chain: error
@typescript-eslint/no-require-imports: error  ← would fire on const x = require() in .ts files
@typescript-eslint/no-this-alias: error
@typescript-eslint/no-unnecessary-type-constraint: error
@typescript-eslint/no-unsafe-declaration-merging: error
@typescript-eslint/no-unsafe-function-type: error
@typescript-eslint/no-unused-expressions: error  (base no-unused-expressions: off)
@typescript-eslint/no-unused-vars: error  (base no-unused-vars: off)
@typescript-eslint/no-wrapper-object-types: error
@typescript-eslint/prefer-as-const: error
@typescript-eslint/prefer-namespace-keyword: error
@typescript-eslint/triple-slash-reference: error
```

**Note on `no-require-imports`:** If `.ts` files are added post-v1.4 using CommonJS `require()`, this rule will error. The pattern is to use `import` syntax in `.ts` files — or add a `no-require-imports: 'off'` override for the specific files that need it.

[VERIFIED: https://unpkg.com/@typescript-eslint/eslint-plugin@8.59.0/dist/configs/flat/recommended.js]

---

## eslint-config-standard@14 + typescript-eslint 8 Coexistence

`eslint-config-standard@14` does NOT include any `@typescript-eslint/*` rules. [VERIFIED: `node_modules/eslint-config-standard/eslintrc.json` key `plugins: ['import','node','promise','standard']` — no typescript-eslint plugin]

The overlap is on base ESLint rules that typescript-eslint 8 extends or disables:

| Base Rule | standard@14 | tseslint recommended (for .ts) | Winner (last entry wins) |
|-----------|------------|-------------------------------|--------------------------|
| `no-unused-vars` | `error` (entry 2) | turned OFF by tseslint recommended (entry 5) | tseslint wins for `.ts` files — correct |
| `no-unused-expressions` | not set | turned OFF; `@typescript-eslint/no-unused-expressions: error` | tseslint wins for `.ts` files |
| `no-array-constructor` | not set | turned OFF; `@typescript-eslint/no-array-constructor: error` | tseslint wins for `.ts` files |
| `no-undef` | not in standard | turned OFF by `tseslint/eslint-recommended` for `.ts` files | TypeScript handles this; tseslint wins |
| `no-use-before-define` | `error` (entry 2) | NOT in tseslint recommended | standard remains active for `.ts` files (benign) |

The entry order (standard first at position 2, tseslint at position 5) correctly gives tseslint the final say for `.ts` files. For `.js` and `.vue` files, tseslint entries have `files: ['**/*.ts']` and don't apply.

**The D-07 `'prettier'` removal from FlatCompat chain:** `compat.extends('plugin:vue/recommended', 'standard')` drops `'prettier'` (which was in the Phase 6 chain). The `prettierRecommended` entry at position 6 handles the disables natively via `eslint-config-prettier@10` bundled inside it. This eliminates one legacy-compat coupling.

---

## Common Pitfalls

### Pitfall 1: `tseslint.configs.recommended` spreads parser override globally

**What goes wrong:** Spreading `...tseslint.configs.recommended` directly in the flat-config array causes the `base` config (entry 0 of the array) to set `languageOptions.parser = @typescript-eslint/parser` for ALL files. `@babel/eslint-parser` stops parsing `.js` and `.vue` files. Babel-specific syntax (class properties, decorators) triggers parse errors.

**Why it happens:** The `base` config has no `files:` property — it applies to every file unless wrapped.

**How to avoid:** Use `tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] })`. The helper propagates `files: ['**/*.ts']` to every inner config in `extends`, including `base`. [VERIFIED: config-helper.js source inspection]

**Warning signs:** `.vue` SFC `<template>` parse errors; `Parsing error: Unexpected token` on `.js` files after wiring typescript-eslint entries.

### Pitfall 2: TypeScript version pin drifts beyond 5.7.x

**What goes wrong:** `"typescript": "^5.7.3"` in package.json resolves to `5.9.3` today (latest 5.x). TypeScript 5.9 introduced a breaking `ArrayBuffer` hierarchy change that could cause `Buffer` assignment errors.

**Why it happens:** Caret `^` pins major only. `^5.7.3` = `>=5.7.3 <6.0.0`.

**How to avoid:** Use tilde `~5.7.3` which pins to `>=5.7.3 <5.8.0`. The CONTEXT explicitly says "5.7 line." [VERIFIED: npm registry version listing]

**Warning signs:** `npm install` resolves `typescript@5.9.x`; TypeScript 5.8/5.9 breaking changes surface unexpectedly.

### Pitfall 3: `typescript-eslint` umbrella not in devDeps

**What goes wrong:** `tseslint.configs.recommended` is only available via the `typescript-eslint` umbrella package. The separate `@typescript-eslint/eslint-plugin` package's `configs` property does expose `['flat/recommended']` via the raw-plugin path, but accessing it requires `require('@typescript-eslint/eslint-plugin').configs['flat/recommended']` — an undocumented internal API that may change between minor versions.

**Why it happens:** The project currently has `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` as separate devDeps (from v2 era). The umbrella `typescript-eslint` was not needed in v2 (legacy config format).

**How to avoid:** Add `typescript-eslint@^8.59.0` as a new devDep alongside the separate packages. The umbrella bundles the same plugin and parser, so there's no duplication of behavior — just an extra lockfile entry.

### Pitfall 4: `'prettier'` left in FlatCompat `compat.extends()` chain (D-07)

**What goes wrong:** The current `eslint.config.js` has `compat.extends('plugin:vue/recommended', 'standard', 'prettier')`. If left as-is after adding `prettierRecommended` as the last entry, `eslint-config-prettier` runs twice (once via FlatCompat, once via `prettierRecommended`). No runtime error, but it produces redundant disable entries and slightly inflates the config.

**How to avoid:** Change to `compat.extends('plugin:vue/recommended', 'standard')` — drop `'prettier'` from the chain per D-07.

### Pitfall 5: `no-require-imports` fires on `.js` files if scope is wrong

**What goes wrong:** If the `files: ['**/*.ts']` scope is accidentally omitted or widened, the `@typescript-eslint/no-require-imports` rule in `recommended` fires on every `require()` call in `src/utilities/*.js`. The utilities exclusively use CommonJS `require()` — this would generate hundreds of new lint findings.

**How to avoid:** Verify `files: ['**/*.ts']` is present in every config object produced by `tseslint.config({ files: ['**/*.ts'], ... })`. Run `npx eslint --no-fix ./` after wiring and confirm the count stays ≈735.

### Pitfall 6: Lockfile regen order (D-14)

**What goes wrong:** Running `npm install` (no flag) as part of commit 1 (dep bumps) before the typescript-eslint@8 packages are fully resolved can produce an ERESOLVE if npm's resolution order tries to satisfy `@typescript-eslint@2`'s peer range against the new packages.

**How to avoid:** Commit 1 ALWAYS uses `--legacy-peer-deps`. The install without the flag happens ONLY in commit 4 after ALL package changes are in `package.json`. The two-install sequence is: (1) `npm install --legacy-peer-deps` → commit 1; (4) `npm install` → commit 4.

### Pitfall 7: `moduleResolution: "node"` produces no error but may emit diagnostics

**What goes wrong:** TypeScript 5 documentation says `"node"` "should no longer be used" but the alias is preserved. The compiler does not error but may emit a diagnostic note in some tooling contexts.

**How to avoid:** The planner should test `npx tsc --noEmit` after the upgrade. If the output contains any `[Recommendation]` or diagnostic for `moduleResolution`, update to `"node10"`. If the output is clean (only the expected ~0 `src/` errors), preserve `"node"` per D-02.

---

## Code Examples

### Dual-Parser Flat Config (D-09)

The `.ts` parser block overrides `languageOptions` for `.ts` files only. The outer blocks (entries 3 and 4) continue to use `@babel/eslint-parser` for `.js` and `.vue` files. ESLint applies flat-config entries in order; the last matching `languageOptions.parser` wins.

```javascript
// Source: verified by tseslint.config() source + ESLint flat-config precedence docs

// Entry 3 (global .js/.ts/.vue): uses @babel/eslint-parser
{
    files: ['**/*.{js,ts,vue}'],
    languageOptions: { parser: babelParser, ... },
}

// Entry 4 (.vue SFC): overrides to vue-eslint-parser (delegates to babelParser via string)
{
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser, parserOptions: { parser: '@babel/eslint-parser', ... } },
}

// Entry 5 (.ts only): tseslint.config() output sets parser to @typescript-eslint/parser
// for .ts files. Because it comes AFTER entry 3, it correctly overrides for .ts.
...tseslint.config({
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
}),
```

When a `.ts` file is encountered: ESLint collects all matching configs in order, merges them, with later entries winning. Entry 3 sets `@babel/eslint-parser`, entry 5's `base` (now scoped to `.ts`) sets `@typescript-eslint/parser` — the latter wins. [ASSUMED — based on ESLint flat-config merge semantics; verify by linting a test `.ts` file]

### tsc `--noEmit` Baseline Capture Pattern (D-05)

```bash
# Count total errors
npx tsc --noEmit 2>&1 | grep -c "error TS"

# Count src/ errors only
npx tsc --noEmit 2>&1 | grep "^src/" | wc -l

# Count node_modules/ errors by source
npx tsc --noEmit 2>&1 | grep "^node_modules/" | grep -o "^[^(]*" | sort | uniq -c | sort -rn | head -15

# Expected output: 0 src/ errors, ~2567 node_modules/ errors (all from TS 3.8 parse failures)
```

### `npm install` ERESOLVE Audit (D-11 gate)

```bash
# Pre-upgrade: confirm exactly ONE ERESOLVE
npm install --dry-run 2>&1 | grep -E "ERESOLVE|peer eslint"

# Post-upgrade: should print ZERO conflicts
npm install --dry-run 2>&1 | grep "ERESOLVE"  # empty = LINT-03 achievable
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@typescript-eslint@2` via `eslint-config-standard@14` (legacy config) | `typescript-eslint@8` native flat-config entry | v8 released 2024-07 | Native flat-config; no FlatCompat wrapping for TS rules |
| `tsutils@3` as TS AST utility | `ts-api-utils@2` | typescript-eslint v6 | Cleaner dependency tree; no more `tsutils` peer-dep on TypeScript |
| `moduleResolution: "node"` | `moduleResolution: "node10"` (alias) or keep `"node"` | TS 5.0 rename | Backward-compatible alias; no behavior change |
| Two separate packages only (`eslint-plugin` + `parser`) | Plus `typescript-eslint` umbrella | typescript-eslint v7 | Umbrella provides `tseslint.configs.*` flat-config API |

**Deprecated/outdated:**
- `@typescript-eslint/ban-types`: Removed in v8. Split into four targeted rules. If any inline override in `eslint.config.js` referenced it, remove it.
- `@typescript-eslint/no-throw-literal`: Removed in v8. Replaced by `@typescript-eslint/only-throw-error`. Current `eslint.config.js` has no inline override for either.
- `tsutils`: Removed from `@typescript-eslint` dependency tree in v6+. Will be cleaned from lockfile when v2 → v8 upgrade lands.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npm install` without `--legacy-peer-deps` produces the same package VERSIONS as with it (only structure may differ) when no conflicts exist | Lockfile Determinism | Low — if versions differ, commit 4 lockfile regen would catch it; worst case: minor lockfile churn, not a correctness issue |
| A2 | TS 5.7 does NOT emit a deprecation diagnostic for `moduleResolution: "node"` | Pitfall 7 | Low — if it does, update `"node"` → `"node10"` (1 char change); compile behavior is identical |
| A3 | `src/utilities/*.js` produces ZERO errors under TS 5.7 (current: 0 under TS 3.8) | TS Breaking Changes section | Medium — if TS 5.x inference changes surface new errors (e.g., never-initialized false positive), D-04 hybrid triage applies; expected to resolve trivially |
| A4 | `tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] })` correctly scopes all inner configs to `.ts` files only | Code Examples section | High — if not, base config parser override breaks `.js`/`.vue` parsing. Mitigation: Pitfall 1 canary — check lint count after wiring; a count spike + `.vue` parse errors would surface this immediately |
| A5 | Dual-parser precedence: entry 3 (`@babel/eslint-parser` for `**/*.{js,ts,vue}`) is correctly overridden for `.ts` by entry 5 (`@typescript-eslint/parser` for `**/*.ts`) per ESLint flat-config last-entry-wins merge | Dual-Parser section | Medium — if ESLint merges differently, `.ts` parsing would fail. Mitigation: smoke-test with an empty `test.ts` file post-wiring |

---

## Open Questions

1. **Does `moduleResolution: "node"` emit any diagnostic in TS 5.7?**
   - What we know: Documentation says it's a backward-compat alias for `"node10"`, same behavior.
   - What's unclear: Whether TS 5.7 emits a `[Recommendation]` hint or similar in compiler output.
   - Recommendation: Test with `npx tsc --noEmit` after the upgrade and check for non-error output. If any hint appears, update to `"node10"`.

2. **Should the `type-check` script be added to `package.json`?**
   - What we know: CONTEXT D-03 (Claude's Discretion) allows but doesn't require it.
   - What's unclear: Whether CI or a future contributor would benefit.
   - Recommendation: Add `"type-check": "tsc --noEmit"` — minimal churn, clear DX value, consistent with v2.0 CI wiring goal.

3. **Can commit 1 be the single `npm install --legacy-peer-deps` that removes `@typescript-eslint@2` AND installs `@typescript-eslint@8` + `typescript@~5.7.3`?**
   - What we know: Yes — as long as `package.json` has the version bumps before running install, npm will resolve to the new versions.
   - Recommendation: Confirm by dry-running `npm install --legacy-peer-deps --dry-run` after editing `package.json`. Should show no ERESOLVE at this point because `@typescript-eslint@8` satisfies `eslint@9`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript 5.7.3 (`engines: >=14.17`) | YES | v24.12.0 | — |
| npm | Package install + lockfile regen | YES | 11.12.1 | — |
| TypeScript (current, TS-01 source) | `npx tsc --noEmit` baseline capture | YES | 3.8.3 (will be upgraded) | — |
| `typescript-eslint@8.59.0` (NEW) | `tseslint.configs.recommended` API | NOT YET | — | Must be installed as part of commit 1 |
| `@typescript-eslint/eslint-plugin@8.59.0` | TS-02 | NOT YET (currently 2.34.0) | — | Must be upgraded |
| `@typescript-eslint/parser@8.59.0` | TS-02 | NOT YET (currently 2.25.0) | — | Must be upgraded |

**Missing dependencies with no fallback:**
- `typescript@~5.7.3`, `@typescript-eslint/*@8.59.0`, `typescript-eslint@8.59.0` — all installed as part of commit 1.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest@30.3.0 |
| Config file | `package.json` §jest |
| Quick run command | `npx jest --passWithNoTests --testPathPattern=src/utilities` |
| Full suite command | `npm test` (→ `jest --passWithNoTests`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TS-01 | `tsc --noEmit` exits 0 with `src/` error count = 0 | smoke | `npx tsc --noEmit 2>&1 \| grep "^src/" \| wc -l` (expect 0) | N/A (command only) |
| TS-02 | `npx eslint --no-fix ./` exits with count ≤ 1881 and no parse errors | integration | `npx eslint --no-fix ./` | Existing (`eslint.config.js`) |
| LINT-03 | `npm install` (no flag) exits 0, zero ERESOLVE | smoke | `npm install --dry-run 2>&1 \| grep ERESOLVE` (expect empty) | N/A (command only) |
| D-19 | 256/256 tests pass | unit | `npm test` | YES (existing test suite) |
| D-20 | `prettier --check` exits 0 | integration | `npm run prettier -- --check` | N/A (command only) |
| D-21 | Builds compile clean | integration | `npm run pack:renderer && npm run pack:main` | N/A (command only) |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit 2>&1 | grep "^src/" | wc -l` + `npm test` (256/256) + `npm run prettier -- --check`
- **Per wave merge:** Full suite — all 6 checks in the table above
- **Phase gate:** All 6 checks green before `/gsd-verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. Phase 7 is a tooling upgrade; no new test files needed.

---

## Security Domain

This phase is dev-tooling only (compiler and linter upgrades). No application code, no new network surfaces, no authentication or data-handling changes. ASVS categories V2–V6 do not apply.

The `typescript-eslint@8.59.0` umbrella package dependency graph is CommonJS, published by the typescript-eslint team. No security-relevant surface is introduced.

---

## Sources

### Primary (HIGH confidence)

- `npm view typescript version` / npm registry — TypeScript 5.7.3 latest in 5.7 line [VERIFIED: 2026-04-22]
- `npm view @typescript-eslint/eslint-plugin peerDependencies` (all v8.x) — peer ranges per version [VERIFIED: 2026-04-22]
- `npm view typescript-eslint@8.59.0 peerDependencies` — eslint@9 + typescript@5.7 satisfaction [VERIFIED: 2026-04-22]
- `https://unpkg.com/typescript-eslint@8.59.0/dist/index.js` — exports shape, configs.recommended is a getters object [VERIFIED: 2026-04-22]
- `https://unpkg.com/typescript-eslint@8.59.0/dist/config-helper.js` — tseslint.config() files propagation logic [VERIFIED: 2026-04-22]
- `https://unpkg.com/@typescript-eslint/eslint-plugin@8.59.0/dist/configs/flat/recommended.js` — exact rules in recommended [VERIFIED: 2026-04-22]
- `https://unpkg.com/@typescript-eslint/eslint-plugin@8.59.0/dist/configs/flat/base.js` — base config has NO files property [VERIFIED: 2026-04-22]
- `https://unpkg.com/@typescript-eslint/eslint-plugin@8.59.0/dist/configs/eslint-recommended-raw.js` — eslint-recommended HAS files: `['**/*.ts',...]` [VERIFIED: 2026-04-22]
- Live `npx tsc --noEmit` run — 2567 errors, all node_modules/, zero src/ [VERIFIED: 2026-04-22]
- Live `npm install --dry-run` — ONE ERESOLVE from @typescript-eslint@2 vs eslint@9 [VERIFIED: 2026-04-22]
- Lockfile scan for eslint peer conflicts — only @typescript-eslint@2 entries fail eslint@9 [VERIFIED: 2026-04-22]
- `node_modules/eslint-config-standard/eslintrc.json` — no @typescript-eslint rules in standard@14 [VERIFIED: 2026-04-22]
- `eslint.config.js` Phase 6 output — 102-line CJS flat config structure [VERIFIED: read 2026-04-22]

### Secondary (MEDIUM confidence)

- [https://www.typescriptlang.org/docs/handbook/modules/reference.html](https://www.typescriptlang.org/docs/handbook/modules/reference.html) — `moduleResolution: "node"` is alias for `"node10"`, backward compat preserved [CITED]
- [https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/) — never-initialized variables detection; no breaking changes for allowJs+strict .js files [CITED]
- [https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/) — TS 5.0 breaking changes (relational operators, enum overhaul) [CITED]
- [https://typescript-eslint.io/blog/announcing-typescript-eslint-v8](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8) — rule renames: ban-types removed, no-throw-literal → only-throw-error, no-useless-template-literals → no-unnecessary-template-expression [CITED]

### Tertiary (LOW confidence)

- npm lockfile determinism with `--legacy-peer-deps` flag: based on npm algorithm documentation and community discussion; not empirically tested for this specific project [ASSUMED: A1]

---

## Metadata

**Confidence breakdown:**
- Standard stack (versions + peer ranges): HIGH — all verified from npm registry 2026-04-22
- typescript-eslint flat-config wiring pattern: HIGH — verified from dist source inspection
- TS 3.8→5.7 breaking change impact on src/utilities/: HIGH — all catch/return patterns inspected; breaking changes mapped against actual code
- Peer conflict analysis: HIGH — live npm dry-run + lockfile programmatic scan
- Lockfile determinism: LOW (A1) — based on npm documentation, not empirically tested

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (npm registry versions stable; typescript-eslint minor releases may add newer 8.x patch but ^8.59.0 resolves forward)
