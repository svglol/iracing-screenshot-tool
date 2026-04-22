# Phase 6: ESLint 9 Flat Config + Prettier Full Wiring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 06-eslint-9-flat-config-prettier-full-wiring
**Mode:** `--auto` (autonomous — gray areas auto-resolved with recommended defaults; no interactive user prompts)
**Areas discussed:** Flat config migration strategy, Rule parity, Prettier wiring policy, Ignores migration, Command invocation, Version pins, Baseline capture, Commit shape, npm install strategy, Scope-control carryover

---

## Flat Config Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| FlatCompat bridge | Use `@eslint/eslintrc` `FlatCompat` to load legacy `extends:` and `plugin:` rule sets unchanged — zero plugin major bumps | ✓ |
| Pure flat migration | Upgrade `eslint-plugin-vue` 6→9, `@typescript-eslint` 2→8, `eslint-config-standard` 14→17+/neostandard — all in Phase 6 | |
| Hybrid | Inline-migrate simple rules, FlatCompat for vendor configs | |

**Auto-selected:** FlatCompat bridge (recommended default)
**Rationale:** Minimum-surface migration; preserves SC2 rule parity; no plugin major bumps (those are Phase 7 or v2.0 scope per REQUIREMENTS). Captured as D-01 in CONTEXT.md.

---

## Rule Parity

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve verbatim | Carry all rules forward through FlatCompat extends + inline `rules:` block | ✓ |
| Audit-and-drop | Retire rules that fire heavily post-migration | |

**Auto-selected:** Preserve verbatim
**Rationale:** SC2 requires "every rule re-enabled or deliberately retired with an entry in the decision log" — preserving verbatim is minimum-risk. Captured as D-02 + D-11.

---

## Prettier Wiring — FMT-01 Full Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Wire at end, prettier/prettier as error | Standard `plugin:prettier/recommended` behavior | ✓ |
| Wire at end, prettier/prettier demoted to warn | Softer enforcement | |
| Keep v1.3 minimum-scope derogation | Don't wire the plugin (FMT-01 unfulfilled) | |

**Auto-selected:** Wire at end, prettier/prettier as error
**Rationale:** REQUIREMENTS §FMT-01 calls for "full integration" superseding v1.3 Phase 4 Pitfall 4 derogation. Demoting to warn would weaken the enforcement intent. Codebase already formatted end-to-end in v1.3 Phase 4 with byte-preserved `.prettierrc`; expected prettier/prettier delta is ≤20. Captured as D-03.

---

## Ignores Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate to `ignores: [...]` in flat config | Flat-native; required for ESLint 9 | ✓ |
| Keep `.eslintignore` | Not supported by flat config in ESLint 9 | |

**Auto-selected:** Migrate to `ignores: [...]`
**Rationale:** Mandatory — ESLint 9 flat config dropped `.eslintignore` support. Patterns (`bot/**`, `dist/**`) carry forward verbatim from Phase 5's `.eslintignore`. Captured as D-04.

---

## Command Invocation — `npm run lint`

| Option | Description | Selected |
|--------|-------------|----------|
| Remove `--ext`, add `files` globs in config | Required for ESLint 9 | ✓ |
| Keep `--ext` | Flag removed in ESLint 9; would error | |

**Auto-selected:** Remove `--ext`, add `files` globs in config
**Rationale:** Mandatory per ESLint 9 breaking changes. New script: `"lint": "eslint --fix ./"`. Captured as D-05.

---

## `--fix` Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `--fix` in script | Pre-existing DX; consistent with Phases 3-5 | ✓ |
| Remove `--fix` | Match pre-swap no-fix parity check tradition | |

**Auto-selected:** Keep `--fix`
**Rationale:** End-user script DX unchanged; parity check uses separate `--no-fix` invocation (D-09). Captured as D-06.

---

## Version Pins

| Option | Description | Selected |
|--------|-------------|----------|
| Caret pins (`^9.x`, `^10.x`, `^3.x`) | Consistent with Phase 3/4/5 pattern | ✓ |
| Exact pins | More rigid; harder to patch-upgrade | |

**Auto-selected:** Caret pins
**Rationale:** Consistent pattern across v1.3-v1.4. Captured as D-07.

---

## `eslint-plugin-prettier` Version

| Option | Description | Selected |
|--------|-------------|----------|
| Stay at 5.x (already installed) | Peer-compatible with ESLint 9 | ✓ |
| Upgrade or downgrade | No reason to touch | |

**Auto-selected:** Stay at 5.x (`^5.2.1` via Phase 4 footprint)
**Rationale:** Already installed; peer-range `eslint@>=8` satisfied by LINT-01. Zero-churn. Captured as D-08.

---

## Baseline Capture

| Option | Description | Selected |
|--------|-------------|----------|
| Capture `06-01-BASELINE.md` same shape as 05-01 | Count + per-rule + hotspots + provenance | ✓ |
| No baseline artifact | Rely on git log only | |

**Auto-selected:** Capture `06-01-BASELINE.md`
**Rationale:** SC2 parity check needs comparable pre/post data; D-04/D-07 pattern across phases. Captured as D-09.

---

## Parity Band

| Option | Description | Selected |
|--------|-------------|----------|
| ROADMAP SC2 ceiling (≤1881) + internal goal (≤722 + prettier delta) | Hard cap + soft target with delta accounting | ✓ |
| ROADMAP SC2 ceiling only | No internal target | |

**Auto-selected:** Both — ROADMAP SC2 ceiling as hard cap + internal goal of ≤722 + prettier delta (≤20 expected)
**Rationale:** Honors REQUIREMENTS §"Success Criteria" item 2 while tracking meaningful drift against Phase 5's post-swap 722 count. Any non-prettier-attributable delta is a migration bug. Captured as D-10.

---

## Commit Shape

| Option | Description | Selected |
|--------|-------------|----------|
| D-04 two-commit shape (chore(deps) + refactor(eslint)) | Consistent with Phases 3-5 | ✓ |
| Three commits (separate baseline commit) | More granular but redundant | |
| Single commit | Loses bisect isolation | |

**Auto-selected:** D-04 two-commit shape
**Rationale:** Pattern proven three times on master. Bisect between HEAD and `chore(deps):` isolates npm-install breakage from config-migration behavior. Option for 3rd/4th commit remains available if scope-control surfaces (Phase 5 Option-A precedent). Captured as D-12.

---

## `.eslintrc.js` Deletion Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Delete in content commit (commit 2) | Clean migration; git rm | ✓ |
| Archive as `.eslintrc.js.legacy` | Harder to audit | |

**Auto-selected:** Delete in content commit
**Rationale:** SC1 requires "legacy `.eslintrc.js` deleted or archived, no `eslintrc`-format files referenced by tooling." Clean deletion is minimum-surface. Captured as D-12 + D-14.

---

## npm Install Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `--legacy-peer-deps` flag | Required due to legacy plugin peer conflicts | ✓ |
| Remove `--legacy-peer-deps` | Would ERESOLVE on @typescript-eslint@2 and eslint-plugin-vue@6 | |

**Auto-selected:** Keep `--legacy-peer-deps`
**Rationale:** REQUIREMENTS §LINT-03 schedules removal in Phase 7. **CRITICAL D-15 contradiction flagged:** LINT-03 specifies clearance after LINT-01+TS-02+FMT-02 (all v1.4), but `eslint-plugin-vue@6` stays legacy (v2.0) and will still peer-conflict on ESLint 9. Routed to user as pre-plan decision. Captured as D-15.

---

## Scope-Control Carryover

| Option | Description | Selected |
|--------|-------------|----------|
| `bot/` stays excluded (Phase 5 carryover) | Inherits via `ignores: ['bot/**']` | ✓ |
| Re-include `bot/` for v1.4 | Expands scope beyond REQUIREMENTS | |

**Auto-selected:** `bot/` stays excluded
**Rationale:** Phase 5 D-01 scope rule + PROJECT.md §Out-of-Scope. Captured as D-17.

| Option | Description | Selected |
|--------|-------------|----------|
| `dist/` stays excluded (generated webpack output) | Inherits via `ignores: ['dist/**']` | ✓ |
| Re-include `dist/` | Auto-generated output lint noise | |

**Auto-selected:** `dist/` stays excluded
**Rationale:** Phase 5 Rule-2 auto-fix + `.gitignore` line 19. Captured as D-18.

---

## Claude's Discretion

Planner has flexibility on:
- Exact version pins for `eslint`, `eslint-config-prettier`, `@eslint/eslintrc`, `globals` (caret-resolved at plan time with peer-range cross-checks)
- Exact FlatCompat usage shape (single merged `compat.extends()` entry vs. three separate entries)
- Whether `06-01-BASELINE.md` captures both historical `./`-scope and active `files`-glob-scope counts
- Timing of `npm run lint` script edit (commit 1 vs commit 2 — depends on whether ESLint 9 refuses the legacy `--ext` flag pre-migration)
- Handling of the "broken-window" interval between commit 1 and commit 2 (commit body acknowledgment)

## Deferred Ideas

- Jest globals for `.test.js` files (drops ~693 `no-undef` firings) — post-v1.4 ticket
- `eslint-plugin-standard@4` removal (deprecated; no-op) — v2.0 candidate
- `eslint-config-standard` 14 → 17+/neostandard — v2.0 (pairs with eslint-plugin-vue upgrade)
- `eslint-plugin-vue` 6 → 9 + `vue-eslint-parser` 7 → 9 — v2.0 (must match Vue major)
- TypeScript 3.8 → 5.7 + `@typescript-eslint/*` 2 → 8 — Phase 7
- Prettier expansion to `bot/` — deferred (inherited from v1.3 Phase 4)
- v1.4 REQUIREMENTS §SC2 re-wording decision — audit-time call

## Pre-Plan User Routing (D-15)

**Critical contradiction in REQUIREMENTS §LINT-03 surfaced:** Phase 6 introduces ESLint 9 which breaks `eslint-plugin-vue@6` peer range. Phase 7 upgrades typescript-eslint (clearing one conflict) but does NOT upgrade `eslint-plugin-vue` per §"Future Requirements" (v2.0). This means `--legacy-peer-deps` may STILL be required after v1.4 ships, contradicting LINT-03's "no remaining peer conflicts" clause.

Planner MUST route to user at RESEARCH or PLAN phase with these options:
1. Accept `--legacy-peer-deps` persists past v1.4 (LINT-03 → v2.0; REQUIREMENTS updated at phase completion)
2. Upgrade `eslint-plugin-vue` 6 → 9 in Phase 6 (scope expansion into v2.0 territory)
3. Find intermediate `eslint-plugin-vue` line (7.x/8.x?) with ESLint 9 peer support but Vue 2 compatibility

This decision is NOT auto-resolved.
