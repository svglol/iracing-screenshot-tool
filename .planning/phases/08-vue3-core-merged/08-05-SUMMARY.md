---
phase: 08-vue3-core-merged
plan: 05
subsystem: renderer-font-awesome
tags: [fontawesome, vue-fontawesome, icon-audit, cdn-cleanup, legacy-peer-deps-retire]
requires: [08-04]
provides:
  - "@fortawesome/fontawesome-svg-core + free-solid-svg-icons + free-brands-svg-icons pinned at ^7.2.0"
  - "@fortawesome/vue-fontawesome pinned at ^3.2.0 (Vue 3 compatible)"
  - "FA registration via app.component('font-awesome-icon', FontAwesomeIcon) — kebab-case canonical form per plan spec"
  - "Three-grep icon audit verified all 8 registered icons have ≥1 template usage site"
  - "A8 outcome: ZERO FA v6→v7 icon renames for our 8 icons (all exports confirmed present in v7 type definitions)"
  - "LINT-03 re-achieved — `npm install` without --legacy-peer-deps exits clean"
  - "REQ UI-04 closed (no use.fontawesome.com CDN references in src/)"
  - "REQ UI-05 closed (FA v7 + vue-fontawesome 3.x operational)"
affects:
  - "package.json"
  - "package-lock.json"
  - "src/renderer/main.js"
requirements: [UI-04, UI-05]
tech_stack:
  added:
    - "@fortawesome/fontawesome-svg-core@7.2.0"
    - "@fortawesome/free-brands-svg-icons@7.2.0"
    - "@fortawesome/free-solid-svg-icons@7.2.0"
    - "@fortawesome/vue-fontawesome@3.2.0"
  removed:
    - "@fortawesome/fontawesome-svg-core@6.7.2"
    - "@fortawesome/free-brands-svg-icons@6.7.2"
    - "@fortawesome/free-solid-svg-icons@6.7.2"
    - "@fortawesome/vue-fontawesome@2.0.10"
  patterns:
    - "app.component('font-awesome-icon', FontAwesomeIcon) — kebab-case registration (Vue 3 accepts either, plan spec mandates kebab-case)"
    - "library.add(...) module-level registration preserved from FA v6 — API-compatible across the v6→v7 boundary for library registration"
    - "Three-grep icon audit per v1.3 Phase 3 D-07 pattern: (1) template-usage grep, (2) dynamic-reference grep, (3) iconpack config scan"
key_files:
  created: []
  modified:
    - "package.json"
    - "package-lock.json"
    - "src/renderer/main.js"
decisions:
  - "A8 outcome — CLEAN: All 8 registered icons (faGear, faUpRightFromSquare, faFolder, faTrash, faCopy, faCircleQuestion, faArrowDown, faDiscord) still exported by FA v7.2.0 packages per node_modules/@fortawesome/free-solid-svg-icons/index.d.ts and free-brands-svg-icons/index.d.ts. No renames required. Research assumption A8 (partial rename-table coverage; empirical audit canonical) confirmed safe — zero template usage site edits needed."
  - "Updated main.js FontAwesomeIcon registration from PascalCase 'FontAwesomeIcon' to kebab-case 'font-awesome-icon' per plan verification spec (both work in Vue 3 — auto-conversion — but plan explicitly greps for kebab-case form)."
  - "No icon pruned — three-grep audit confirmed every currently-registered icon has ≥1 template usage site across src/renderer/. Oruga iconpack config ('fas') is declarative; no per-icon Oruga references to audit."
  - "--legacy-peer-deps retired at Plan 05 completion per LINT-03 gate preservation. `npm install` (no flag) now exits clean; Plan 03's Rule 3 bridge is resolved."
metrics:
  duration_minutes: 6
  tasks_completed: 3
  tasks_total: 3
  files_touched: 3
  completed_date: 2026-04-22
---

# Phase 8 Plan 05: Font Awesome v7 + vue-fontawesome 3 Summary

One-liner: Bumped @fortawesome/* to v7.2.0 and @fortawesome/vue-fontawesome to 3.2.0 via two-commit bisect pair; ran three-grep icon audit per v1.3 Phase 3 D-07 pattern (A8 CLEAN — zero v6→v7 renames for our 8 icons); migrated main.js FA registration to kebab-case `app.component('font-awesome-icon', FontAwesomeIcon)`; retired the Plan 03 `--legacy-peer-deps` bridge (LINT-03 re-achieved — `npm install` exits clean without the flag).

## Three-Grep Icon Audit

Per v1.3 Phase 3 D-07 three-grep methodology — each icon scanned for (1) template `<font-awesome-icon :icon="...">` usage, (2) dynamic icon-name reference in JS (method/computed), (3) Oruga iconpack config references.

| Icon (import) | Kebab name | Grep 1 (template) | Grep 2 (dynamic) | Grep 3 (iconpack) | Verdict | FA v7 status |
| ------------- | ---------- | ----------------- | ---------------- | ----------------- | ------- | ------------ |
| `faGear` | `gear` | 1 (Settings.vue:6) | 0 | 0 | KEEP | EXISTS (v7) |
| `faUpRightFromSquare` | `up-right-from-square` | 2 (Home.vue:77, PromoCard.vue:14) | 0 | 0 | KEEP | EXISTS (v7) |
| `faFolder` | `folder` | 1 (Home.vue:62) | 0* | 0 | KEEP | EXISTS (v7) |
| `faTrash` | `trash` | 1 (Home.vue:57) | 0 | 0 | KEEP | EXISTS (v7) |
| `faCopy` | `copy` | 1 (Home.vue:71) | 0* | 0 | KEEP | EXISTS (v7) |
| `faCircleQuestion` | `circle-question` | 1 (Settings.vue:14) | 0 | 0 | KEEP | EXISTS (v7) |
| `faArrowDown` | `arrow-down` | 1 (TitleBar.vue:22) | 0 | 0 | KEEP | EXISTS (v7) |
| `faDiscord` | `discord` | 1 (Settings.vue:20, brand pack `fab`) | 0* | 0 | KEEP | EXISTS (v7) |

\* "Dynamic" column shows 0 after filtering out non-icon string matches:
- `folder` appears as a variable name + `slug:'folder'` + `case 'folder':` strings in Home.vue/SettingsModal.vue — those are route/slug identifiers, not icon references.
- `copy` appears as `@click="copy"` handler name + `slug:'copy'` + `case 'copy':` strings — handler name, not icon ref.
- `discord` appears in `shell.openExternal('https://discord.gg/GX2kSgN')` URLs — unrelated string, not icon ref.

Every icon has at least one template usage site. **No icon pruned from `library.add(...)`.**

### A8 Empirical Rename Audit (FA v6 → v7)

All 8 registered icons remain exported from their respective v7 packages. Direct `grep export.*\bfaX\b node_modules/@fortawesome/free-{solid,brands}-svg-icons/index.d.ts`:

```
free-solid-svg-icons/index.d.ts:
  148: export const faUpRightFromSquare: IconDefinition;
  291: export const faTrash: IconDefinition;
  806: export const faFolder: IconDefinition;
  884: export const faGear: IconDefinition;
  890: export const faCircleQuestion: IconDefinition;
  1616: export const faCopy: IconDefinition;
  1821: export const faArrowDown: IconDefinition;

free-brands-svg-icons/index.d.ts:
  114: export const faDiscord: IconDefinition;
```

**A8 outcome: CLEAN.** Research assumption A8 (rename-table excerpt may be incomplete — empirical audit is canonical) confirmed safe. No FA v6 → v7 rename landed on any of our 8 icons. Zero template usage site edits needed; zero import renames needed.

## Installed Versions

```
$ npm ls @fortawesome/vue-fontawesome @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/free-brands-svg-icons
iracing-screenshot-tool@2.1.0
+-- @fortawesome/fontawesome-svg-core@7.2.0
+-- @fortawesome/free-brands-svg-icons@7.2.0
+-- @fortawesome/free-solid-svg-icons@7.2.0
`-- @fortawesome/vue-fontawesome@3.2.0
  `-- @fortawesome/fontawesome-svg-core@7.2.0 deduped
```

- `@fortawesome/fontawesome-svg-core@7.2.0` — top-level dep; deduped once through vue-fontawesome
- `@fortawesome/free-brands-svg-icons@7.2.0` — top-level dep, clean
- `@fortawesome/free-solid-svg-icons@7.2.0` — top-level dep, clean
- `@fortawesome/vue-fontawesome@3.2.0` — top-level dep; pulls in fontawesome-svg-core@7.2.0 (deduped at root — zero drift)

`npm view` registry version check confirmed latest available at Plan execution time:
- `@fortawesome/fontawesome-svg-core` → 7.2.0
- `@fortawesome/free-solid-svg-icons` → 7.2.0
- `@fortawesome/free-brands-svg-icons` → 7.2.0
- `@fortawesome/vue-fontawesome` → 3.2.0

All caret pins (`^7.2.0`, `^3.2.0`) satisfy the latest releases.

## LINT-03 Re-Achievement

Plan 03 deviation (Rule 3 — `--legacy-peer-deps` used as tactical bridge for FA v2's `vue:~2` peer) is now **retired**.

```
$ npm install
added 13 packages, changed 5 packages, and audited 1799 packages in 16s
12 vulnerabilities (6 low, 5 moderate, 1 high)
```

- Exit 0
- Zero ERESOLVE warnings
- No `--legacy-peer-deps` flag required
- `@fortawesome/vue-fontawesome@3.2.0` peer-deps on `vue: ">= 3.0.0"` (satisfied by our vue@3.5.33 pin); the old v2.0.10 `vue: ~2` constraint is gone

The v1.4 LINT-03 bar (`--legacy-peer-deps` retired across the codebase) is re-achieved. Plan 03's Deviation 1 is resolved at this plan's completion; STATE.md's temporary regression banner can be cleared.

## Build + Test Gates

```
$ npm run pack:renderer
...
renderer (webpack 5.106.2) compiled with 13 warnings in 16663 ms
# exit code: 0
```

Bundle sizes:
- `dist/renderer.js`: 2,340,447 bytes (≈2.34 MB) — vs Plan 04 baseline 2,321,249 bytes (+0.82% — well within the ±10% gate)
- `dist/renderer.css`: 918,207 bytes (unchanged from Plan 04)

The 13 warnings are pre-existing package-level deprecations (Bulma `if()` syntax, vue-simple-context-menu's Vue 2 default export pattern) carried forward from Plan 04. No new Vue 3 migration warnings introduced; REQ success criterion #6 (no Vue 2 → Vue 3 migration warnings from our code) preserved.

```
$ npm test
Tests: 256 passed, 256 total
```

256/256 (D-08-19 band holds).

## Commits

| Hash | Message |
| ---- | ------- |
| `338123c` | chore(deps): bump @fortawesome/* to v7 + vue-fontawesome to 3.x |
| `8bda4b2` | refactor(renderer): migrate FA registration + three-grep icon audit |

These are commits 7+8 of the D-08-18 9-commit chain per the plan's assigned slot.

**Bisect shape (D-04 / D-08-18 compliant):**
- `git bisect start 338123c 338123c^` isolates regressions caused purely by the dep swap (e.g., FA v7 runtime SVG rendering, FA v2 → v3 transitive-tree churn).
- `git bisect start 8bda4b2 338123c` isolates regressions caused by the main.js registration form change (kebab-case vs PascalCase — should be no-op in Vue 3 but captured in its own commit for bisectability).

Files per commit:
- `338123c`: `package.json`, `package-lock.json` (ONLY)
- `8bda4b2`: `src/renderer/main.js` (ONLY)

Neither commit touches `bot/**` or any pre-existing dirty file (verified via `git show --stat HEAD~1 HEAD`).

No Co-Authored-By lines (verified via `git log --format="%B" -n 2 | grep -c "Co-Authored"` returns 0).

## Deviations from Plan

None. Plan 05 executed exactly as specified.

### Scope handling (not deviations — scope boundary enforcement)

Pre-existing uncommitted edits in `bot/src/**` from before this plan started were explicitly NOT staged (verified via `git status --short` before each `git add`). `bot/docs/community-guide.md` (untracked) also left alone.

Neither commit crossed scope boundaries — `git show --stat` on each shows only in-scope files.

## Known Stubs

None. Plan 05 is a mechanical dep bump + registration form change — no placeholder data paths, no temporary workarounds introduced. The three third-party plugins (`vue-shortkey`, `v-click-outside`, `vue-simple-context-menu`) are still registered in main.js and their usages in SFCs are unchanged — Plan 06 handles their Vue 3 peer-dep compat.

## Threat Flags

None beyond those captured in Plan 05's own threat model:
- T-08-05-01 (Tampering — FA v7 icon rename → blank SVG): MITIGATED via A8 empirical audit. All 8 icons confirmed present in v7 type definitions. Plan 06 final UAT re-covers runtime visual regression surface.
- T-08-05-02 (DoS — vue-fontawesome 3 API breaks Vue 3 registration): MITIGATED. Plan 01 already established `app.component` pattern (vue-fontawesome 3's canonical form); main.js registration form changed to kebab-case explicit per plan verification spec. Build + test gates pass.
- T-08-05-03 (Tampering — FA v7 supply-chain compromise): MITIGATED. `@fortawesome` is Fonticons Inc. (known-maintained org); caret pinned at `^7.2.0`. `npm audit` reports 12 pre-existing vulnerabilities (6 low, 5 moderate, 1 high); no new HIGH/CRITICAL surfaced with the FA v7 bump — all 12 are transitive and carried forward from pre-Plan-05.
- T-08-05-04 (Information Disclosure — FA v7 decorative-by-default a11y): ACCEPTED. No screen-reader verification in scope for desktop Electron tool.

## Success Criteria

| Criterion | Status |
| --------- | ------ |
| package.json has @fortawesome/* at ^7.x and @fortawesome/vue-fontawesome at ^3.x | PASS |
| `npm install` clean (no ERESOLVE, no --legacy-peer-deps flag) | PASS |
| `src/renderer/main.js` imports from `@fortawesome/vue-fontawesome` (v3) and uses `app.component('font-awesome-icon', FontAwesomeIcon)` | PASS |
| Three-grep icon audit findings documented in summary (1 row per icon) | PASS |
| Any v6→v7 renamed icon updated (import + library.add + template usages) | N/A (A8 outcome CLEAN) |
| Any zero-usage icon pruned | N/A (all 8 have ≥1 template usage) |
| `grep -rc "use.fontawesome.com" src/` → 0 (UI-04 closed) | PASS |
| `npm run pack:renderer` exits 0 | PASS |
| `npm test` → 256/256 | PASS |
| Two commits per D-08-18 | PASS (`338123c` + `8bda4b2`) |
| Plan summary at `.planning/phases/08-vue3-core-merged/08-05-SUMMARY.md` | PASS (this file) |
| `node_modules/@fortawesome/vue-fontawesome/package.json` shows 3.x | PASS (3.2.0) |
| `node_modules/@fortawesome/fontawesome-svg-core/package.json` shows 7.x | PASS (7.2.0) |
| bot/** untouched | PASS |
| No Co-Authored-By lines | PASS |

## TDD Gate Compliance

N/A — Plan 05 is `type: execute` per frontmatter (no `tdd="true"` on any task). No RED/GREEN/REFACTOR gates required.

## Self-Check: PASSED

- `package.json` — FOUND, modified (contains `@fortawesome/fontawesome-svg-core: ^7.2.0`, `@fortawesome/free-brands-svg-icons: ^7.2.0`, `@fortawesome/free-solid-svg-icons: ^7.2.0`, `@fortawesome/vue-fontawesome: ^3.2.0`; no `^6.` pins on FA packages; no `^2.0.` pin on vue-fontawesome)
- `package-lock.json` — FOUND, modified (FA tree entries rewritten at 7.x/3.x)
- `src/renderer/main.js` — FOUND, modified (kebab-case `app.component('font-awesome-icon', FontAwesomeIcon)` registration)
- Commit `338123c` — FOUND on master via `git log --oneline`
- Commit `8bda4b2` — FOUND on master via `git log --oneline`
- No `bot/**` files in the commit range (verified via `git diff 338123c~1 HEAD --stat` — only 3 in-scope files)
- Zero file deletions in the commit range (verified via `git diff --diff-filter=D --name-only 338123c~1 HEAD` returned empty)

## Notes for Plan 06

- **FA stack now fully Vue-3-native** — `@fortawesome/vue-fontawesome@3.2.0` + FA v7.2.0 packages. No more vue@~2 peer constraints anywhere in the tree. `--legacy-peer-deps` retired.
- **Oruga `iconPack: 'fas'` config remains untested at runtime** — carried forward from Plan 04 Notes. First true FA-in-Oruga rendering test (e.g., o-button `icon-left`, o-notification icons) is Plan 06's final UAT. If Oruga icons don't render but our own `<font-awesome-icon>` tags do, the Oruga config key name may need to be `defaultIconPack` instead (A5 from RESEARCH).
- **Bundle size baseline update for Plan 06:** `dist/renderer.js` = 2,340,447 bytes (+0.82% vs Plan 04), `dist/renderer.css` = 918,207 bytes (unchanged). The ±10% gate for Plan 06 starts here.
- **Remaining Vue 2-only third-party plugins (Plan 06 scope):**
  - `vue-shortkey@3.1.7` — Vue 2-only
  - `v-click-outside@3.0.1` — Vue 2-only
  - `vue-simple-context-menu@3.1.10` — imports Vue default export (Vue 2 pattern); webpack already warns
  - `vue-markdown-plus@2.0.17` — requires Plan 06 swap to `vue3-markdown-it`
  - `vue-lazyload@1.3.3` — plan-06 peer-dep verify
- **13 pack:renderer warnings** — all package-level; 7 Bulma `if()` deprecations + vue-simple-context-menu default import + Bulma color function legacy. Plan 06's third-party plugin migration may eliminate the vue-simple-context-menu warning; Bulma bump deferred to later milestone.
- **CNE boundary — Plan 05 retired `--legacy-peer-deps`; Plan 06 MUST NOT re-regress it.** If third-party plugin swaps surface a new ERESOLVE, Rule 3 blocking fix is required (not `--legacy-peer-deps` revert).
- **`expand-arrows-alt` icon** — Plan 04 Notes flagged this as a potential FA v7 rename target at SettingsModal.vue:223. Three-grep audit in Plan 05 did NOT cover this icon because it's NOT in the 8 registered icons. Plan 06 should verify the icon either:
  - (a) Renders correctly (FA v7 still has it) — no action needed
  - (b) Renders blank (FA v7 renamed it) — Plan 06 rename + library.add addition required
  - The fact that SettingsModal.vue references `expand-arrows-alt` but main.js's `library.add(...)` does NOT register it means the icon currently fails FA's "registered icons only" rendering mode. This is pre-existing tech debt; Plan 06 smoke-test surface.
