# Milestones

## Milestone 1.2 — Feature Enhancements

**Shipped:** 2026-04-20
**App version at milestone close:** v2.1.0 (app versioning is independent of GSD milestone labels)
**Phases:** 2 | **Plans:** 10 | **Tasks:** 20

### Key accomplishments
1. **Configurable screenshot filenames** — token-based format string with live preview in Settings, survives restart via electron-store (Phase 1 via quick task `260403-evq`).
2. **Discord Bug & Feature Tracker Bot** — public Discord channel relays bug reports and feature requests to GitHub Issues; modals, attachment re-hosting to orphan branch, reaction upvoting, Maintainer-gated triage (Phase 2, 10 plans).
3. **HMAC-verified GitHub webhook** — bidirectional sync: GitHub state changes edit the original Discord message and DM-ping the reporter; replay-protected with 5-min `X-GitHub-Delivery` window.
4. **Production deployment kit** — Windows NSSM + Linux systemd service units, Cloudflare Tunnel for webhook exposure, 6 deployment guides.
5. **Test harness** — 294 bot tests across 30 suites (Jest 25 + babel-jest ESM bridge), zero regressions in the 256 existing root tests, `/bot/` properly isolated from the Electron build.

### Known deferred items at close
2 debug sessions + 5 quick-task close markers (see `.planning/STATE.md` § Deferred Items).

### Details
[v1.2 full roadmap](./milestones/v1.2-ROADMAP.md)

---

## Milestone 1.3 — UI Refresh

**Shipped:** 2026-04-21
**App version at milestone close:** v2.1.0 (unchanged — v1.3 is tooling + dep upgrade, no app-feature additions)
**Phases:** 2 | **Plans:** 5 | **Tasks:** 14

### Key accomplishments
1. **Font Awesome v5.13 → v6.7.2 upgrade** — paired with `vue-fontawesome` 0.1.x → 2.x (the Vue-2 ceiling). D-07 icon pruning reduced `library.add` from 11 → 8 registered icons after a three-grep audit confirmed zero .vue template usage and zero dynamic constructions. Bundle delta +1.82% (well within ≤10% tolerance). UAT approved in dev + prod across 4 views / 9 call sites.
2. **Prettier 2.0.2 → 3.8.3 reformat** — entire `{src,_scripts}/**/*.{js,ts,vue}` glob reformatted in a single atomic `format: prettier 3` commit for clean git blame. `.prettierrc` preserved byte-for-byte (explicit `trailingComma: "es5"` dodged Prettier 3's default flip).
3. **ESLint-Prettier compat bumps** — `eslint-config-prettier` 6 → 9.1.2 and `eslint-plugin-prettier` 3 → 5.5.5 (ESLint-7-compatible Prettier-3 lines). Pitfall 4 derogation: wired `eslint-config-prettier` into `.eslintrc.js` (1-line minimum-scope fix) to resolve latent `useTabs: true` vs `no-tabs: error` clash that surfaced mid-reformat. Lint 1881 = **-48 below baseline** 1929.
4. **D-04 / D-07 bisect shape preserved on master** — both phases landed as atomic two/three-commit chains (chore(deps) + content commit, with Phase 4 prepending a fix(HelpModal) neutral pre-condition). Bisecting between HEAD and chore(deps) cleanly isolates dep-bump regressions from content-change regressions.
5. **Pre-existing HelpModal.vue parser error fixed** — orphan `<p>/</p>` in the HelpModal template rejected by both Prettier 2.0.2 and 3.3.3. Wave 1 of Phase 4 removed the 2-line orphan before any dep bump so `npm run prettier -- --check` could exit cleanly.

### Known deferred items at close
7 pre-existing carry-over items (2 debug sessions + 5 v1.2-era quick-task close markers) — see `.planning/STATE.md` § Deferred Items. None introduced by v1.3.

### Tech debt deferred to v1.4 / v2.0
- `--legacy-peer-deps` load-bearing (v1.4 ESLint 9 flat-config)
- `eslint-plugin-prettier` installed but not wired via `plugin:prettier/recommended` (v1.4)
- Transitive `prettier@2.8.8` via vue-loader (v2.0 Vue 3)
- FA v5.2.0 CDN `@import` in `src/renderer/assets/style/main.scss:153` (v2.0 Bulma/Buefy work)
- Electron 41 `addDevToolsExtension` main-process error (future main-process cleanup)

### Details
[v1.3 full roadmap](./milestones/v1.3-ROADMAP.md) · [v1.3 requirements](./milestones/v1.3-REQUIREMENTS.md) · [v1.3 audit](./milestones/v1.3-MILESTONE-AUDIT.md)

---

## Milestone 1.4 — Tooling Modernization

**Shipped:** 2026-04-22
**App version at milestone close:** v2.1.0 (unchanged — v1.4 is invisible tooling modernization, no app-feature additions)
**Phases:** 3 | **Plans:** 8 | **Tasks:** 25+ (9 commits on master)

### Key accomplishments
1. **Babel package rename retired** — `babel-runtime` 6.x dropped entirely (zero import sites → dead-weight removal per D-01 minimum-scope derogation); `babel-eslint` 10.x → `@babel/eslint-parser@^7.28.6` wired via `parserOptions.parser` preserving Vue SFC delegation (Phase 5, 4-commit chain).
2. **ESLint 7 → 9 flat config migration** — `.eslintrc.js` + `.eslintignore` deleted; new `eslint.config.js` at repo root with 5-entry array (standalone ignores + FlatCompat extends + native languageOptions + `.vue` STRING parser override + `plugin:prettier/recommended` last). `@eslint/compat fixupConfigRules` shim added for legacy plugins (`eslint-config-standard@14`, `eslint-plugin-node@11`, `eslint-plugin-promise@4`, `@typescript-eslint@2`). Post-migration lint: 735 findings ≤ 1881 baseline ceiling (Phase 6).
3. **Full `plugin:prettier/recommended` integration** — supersedes v1.3 Phase 4 Pitfall 4 minimum-scope derogation. `eslint-config-prettier` 9 → 10.1.8; `prettier/prettier: error` active; zero format drift (Phase 6 FMT-01/FMT-02).
4. **TypeScript 3.8 → 5.7.3** — tilde-pinned. `src/` compiled clean under strict mode with zero errors (Path A1 no-op — no `@ts-expect-error` annotations needed). 2567 pre-migration errors (all TS 3.8 `node_modules` parse failures) cleared naturally (Phase 7 TS-01).
5. **typescript-eslint 2 → 8.59.0** — `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, and new `typescript-eslint` umbrella package installed. Wired as native flat-config entry via `tseslint.config({files: ['**/*.ts'], extends: [tseslint.configs.recommended]})` helper (research Pitfall 1 — direct spread would globally clobber `@babel/eslint-parser`). Dual-parser coexistence verified (Phase 7 TS-02).
6. **`--legacy-peer-deps` flag RETIRED** — v1.3 carryover tech-debt closed. `npm install` (no flag) exits 0 with zero ERESOLVE. Both peer conflicts cleared: Phase 6 D-01 Amendment (`eslint-plugin-vue` 6→9 after v6 crashed on ESLint 9's removed `codePath.currentSegments` API) + Phase 7 TS-02. Final commit `3050be7` closes LINT-03 and the milestone (Phase 7).

### Known deferred items at close
7 pre-existing carry-over items (2 debug sessions + 5 v1.2-era quick-task close markers) — see `.planning/STATE.md` § Deferred Items. **None introduced by v1.4.**

### Architectural deviation (Phase 6 D-01 Amendment, user-approved)
`eslint-plugin-vue` ^6.2.2 → ^9.33.0 escalated mid-phase because v6 hard-crashed under ESLint 9 (removed `codePath.currentSegments` API — not just a peer-range warning). Research Pitfall 7 was inaccurate for this specific plugin. CONTEXT.md D-01 amended; cascade effect made LINT-03 achievable as originally scoped (Phase 6 D-15 Option 1 "persist --legacy-peer-deps past v1.4" became obsolete).

### Tech debt deferred to v2.0
- `eslint-plugin-vue` 9 → 10+ (matches Vue 3 major)
- `vue-eslint-parser` 7 → 9
- `eslint-config-standard` 14 → 17+/neostandard migration
- Legacy plugin pins (`eslint-plugin-import@2`, `eslint-plugin-node@11`, `eslint-plugin-promise@4`, `eslint-plugin-standard@4`) + `@eslint/compat fixupConfigRules` shim cleanup
- `@babel/eslint-parser` → `@typescript-eslint/parser` as primary for `.js/.vue`
- `.js` → `.ts` conversion in `src/`
- Jest 25 → Vitest (paired with Vite+Electron bundler switch)

### Details
[v1.4 full roadmap](./milestones/v1.4-ROADMAP.md) · [v1.4 requirements](./milestones/v1.4-REQUIREMENTS.md) · [v1.4 audit](./milestones/v1.4-MILESTONE-AUDIT.md)

---

*Last milestone: v1.4 (2026-04-22)*
