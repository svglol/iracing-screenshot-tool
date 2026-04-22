# iRacing Screenshot Tool

**Description:** Electron + Vue 2 desktop app for taking high-resolution screenshots of iRacing, with a separate Discord bot for community bug reports and feature requests mirrored to GitHub Issues.
**Stack:** Electron 41 + Vue 2.7 + Buefy (desktop) · Node 24 + discord.js 14 + Fastify 5 + Octokit + better-sqlite3 (bot)
**Repository:** svglol/iracing-screenshot-tool

## What This Is

A two-part project:
- **Desktop app (`src/`)** — Electron 41 / Vue 2.7 / Buefy UI for capturing iRacing screenshots with configurable resolution, filename format, output format (JPEG/PNG/WebP), watermark cropping, and session-field tokens resolved from iRacing telemetry via `irsdk-node`.
- **Discord bot (`bot/`)** — Separate always-on Node 24 service that relays community bug/feature reports between a public Discord channel and GitHub Issues (source of truth), with reaction-based upvoting, Maintainer-role triage commands, attachment re-hosting to an orphan branch, and reporter pings on status changes via HMAC-verified GitHub webhook over Cloudflare Tunnel.

## Core Value

**Make great-looking race screenshots effortless for sim racers**, and **gather community signal without friction** — reporters file bugs and vote on features from Discord without needing a GitHub account.

## Current State

- **v1.2 shipped** (2026-04-20) — PR #25 merged upstream. Phase 1 (filename format configurator) and Phase 2 (Discord bug & feature tracker bot) complete.
- **v1.3 shipped** (2026-04-21) — Phases 3-4. Font Awesome v5 → v6 upgrade + Prettier 3 codebase reformat landed on master as a five-commit chain. Tests 256/256 pass. Bundle +1.82% (FA) and +0.042% (Prettier).
- **v1.4 shipped** (2026-04-22) — Phases 5-7. Tooling modernization complete: Babel package renames + ESLint 9 flat config + full prettier wiring + TypeScript 5.7 + typescript-eslint 8 + `--legacy-peer-deps` retired. Tests 256/256 pass. Lint count 735 (well under v1.3 baseline 1881). `npm install` clean (zero ERESOLVE).
- **Dependabot (upstream, since PR #25 merge):** `jimp` 0.10 → 1.6.1, `jest` 25 → 30.3.0 (main + bot), `np` 6 → 11.2.0, `got` bumped. These shipped via PRs #26–#43 consolidations.

## Next Milestone: v2.0 Vue 3 Migration (planned)

**Trigger:** after v1.4 lands on master (now) or on Vue 2 CVE — whichever comes first.

**Target scope:**
- Vue 2.7 → Vue 3 (template syntax, composition API, reactivity changes)
- Buefy → replacement UI framework (candidates: Oruga, PrimeVue, Vuetify)
- Bulma 0.9 → 1.0 (paired with Buefy replacement — Buefy 0.9.29 is tied to Bulma 0.9 SASS)
- Webpack → Vite bundler + Electron
- Font Awesome v6 → v7 (requires vue-fontawesome 3.x + Vue 3)
- `@fortawesome/vue-fontawesome` 2.x → 3.x
- `vue-router` 3 → 4
- `vue-loader` 15 → 17
- `vue-devtools` → `@vue/devtools`
- `eslint-plugin-vue` 9 → 10+ (matches Vue 3 major)
- `vue-eslint-parser` 7 → 9
- Jest 25 → Vitest (pairs naturally with Vite+Electron bundler switch)
- `eslint-config-standard` 14 → 17+ or `neostandard` migration
- Legacy plugin cleanup (`eslint-plugin-import@2`, `eslint-plugin-node@11`, `eslint-plugin-promise@4`, `eslint-plugin-standard@4`) + remove `@eslint/compat fixupConfigRules` shim
- `@babel/eslint-parser` → `@typescript-eslint/parser` as primary for `.js/.vue`
- `.js` → `.ts` file conversion in `src/` (allowed by TS 5.7 + typescript-eslint 8 landing in v1.4)
- Remaining FA v5.2.0 CDN `@import` in `src/renderer/assets/style/main.scss:153`
- Electron main-process `addDevToolsExtension` error fix
- Transitive `prettier@2.8.8` via `vue-loader`/`@vue/compiler-sfc` (resolves naturally with Vue 3)

**Explicitly deferred to v2.0+:** stricter tsconfig flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Jest globals override for test files.

## Requirements

### Validated
- ✓ User-configurable screenshot filename format with session-field tokens — v1.2
- ✓ Output format selector (JPEG / PNG / WebP) — v1.2
- ✓ Relative watermark crop (3% of dimensions instead of hardcoded px) — v1.2
- ✓ File-based INFO/DEBUG logging across capture pipeline — v1.2
- ✓ Discord bot for community bug reports & feature requests mirrored to GitHub Issues — v1.2
- ✓ Reaction-based feature upvoting with debounced `votes:N` label mirror — v1.2
- ✓ Maintainer-gated triage commands (/close, /label, /assign-status, /mark-duplicate) — v1.2
- ✓ Reporter pings on GitHub state change via HMAC-verified webhook — v1.2
- ✓ Font Awesome upgraded from v5 to v6 with `vue-fontawesome` 0.1 → 2 — v1.3 (UI-01)
- ✓ Codebase formatted with Prettier 3 conventions — v1.3 (TOOL-01)
- ✓ Retired deprecated `babel-runtime` 6.x — v1.4 (BABEL-01)
- ✓ `babel-eslint` 10.x → `@babel/eslint-parser@^7.28.6` wired via parserOptions.parser — v1.4 (BABEL-02)
- ✓ ESLint 7.10 → 9.39.4 — v1.4 (LINT-01)
- ✓ Flat config migration `.eslintrc.js` → `eslint.config.js` with rule parity — v1.4 (LINT-02)
- ✓ `plugin:prettier/recommended` full integration (supersedes v1.3 Phase 4 Pitfall 4 derogation) — v1.4 (FMT-01)
- ✓ `eslint-config-prettier` 9 → 10.1.8 — v1.4 (FMT-02)
- ✓ TypeScript 3.8 → 5.7.3 — v1.4 (TS-01)
- ✓ `@typescript-eslint/*` 2.25 → 8.59.0 via `tseslint.config()` helper — v1.4 (TS-02)
- ✓ `--legacy-peer-deps` flag retired — v1.4 (LINT-03)

### Active

_No active requirements — v1.4 shipped all 9 requirements as originally scoped. Run `/gsd-new-milestone` to define v2.0 requirements._

### Out of Scope
- In-app "Report a bug" button from the Electron app itself — privacy + scope implications, defer to future milestone
- Auto-duplicate detection via embeddings — over-engineered for current queue size
- Automatic crash/telemetry reporting — privacy scope to be defined first
- Release announcements on Discord via electron-updater — nice-to-have, not tracker-related
- Mac/Linux build of the Electron app — iRacing is Windows-only
- **Font Awesome v7 in v1.3** — requires `vue-fontawesome` 3.x which requires Vue 3; v6 is the Vue-2 ceiling. FA7 deferred to v2.0.
- **Bulma 1.0 in v1.3** — Buefy 0.9.29 is tied to Bulma 0.9's SASS API; Bulma 1.0 would likely break Buefy styling. Moved to v2.0 alongside Buefy replacement.
- `@fortawesome/vue-fontawesome` 0.1 → 3 — requires Vue 3, deferred to v2.0 (v1.3 takes it to 2.x only).
- Vue 2 → Vue 3 migration — scope too large; dedicated v2.0 milestone
- Jest 25 → 30, Jimp 0.10 → 1.6 — already handled by upstream dependabot
- Vue-ecosystem ESLint plugins in v1.4 — `eslint-plugin-vue` 6 → 9 and `vue-eslint-parser` 7 → 9 must match Vue major, deferred to v2.0
- Jest → Vitest in v1.4 — pairs naturally with Vite+Electron bundler switch, deferred to v2.0

## Constraints

- **Windows-only Electron target** (iRacing requirement) — bot code is cross-platform but desktop app is Win-only
- **Node 24+ for bot** — pinned via `.nvmrc`, uses native ESM and modern features
- **Fine-grained GitHub PAT** — scoped to this one repo; manual rotation documented in `bot/README.md`

## Context

**Codebase:**
- Electron app: `src/main/` (Node-side), `src/renderer/` (Vue 2 UI), `src/utilities/` (shared, TS-checked)
- Bot: `bot/src/` ESM modules, `bot/docs/` deployment guides, own `package.json`
- `/bot/` excluded from electron-builder packaging (`!bot/**/*` in `build.files`) and from root Jest (`/bot/` in `testPathIgnorePatterns`)

**Tech decisions recorded in v1.2:** 80+ architectural/implementation decisions from Phase 2 captured in the shipped PR #25.

## Key Decisions

| Decision | Milestone | Outcome |
|----------|-----------|---------|
| Split/join for filename token replacement (not regex) | v1.2 | ✓ Good — simpler, no escaping surprises |
| `/bot/` as a separate top-level dir with own `package.json` | v1.2 | ✓ Good — clean isolation from Electron build |
| GitHub Issues as single source of truth (not custom DB) | v1.2 | ✓ Good — leveraged existing infra, no external service |
| Orphan branch `bug-attachments` for Discord CDN re-hosting | v1.2 | ✓ Good — main branch stays clean, raw.githubusercontent.com URLs survive |
| Fine-grained PAT over GitHub App | v1.2 | ✓ Good for single-maintainer scale; ⚠️ Revisit if multi-maintainer |
| Cloudflare Tunnel over port-forward | v1.2 | ✓ Good — Windows-native, no TLS cert management |
| Reaction debounce via setTimeout Map + deterministic test hook | v1.2 | ✓ Good — avoided Jest 25 fake-timer fragility |
| HMAC verification with `timingSafeEqual` + length guard | v1.2 | ✓ Good — guards the length-mismatch throw footgun |
| D-04 two-commit bisect shape (`chore(deps):` + content commit) | v1.3 Phase 3 | ✓ Good — reused as D-07 in Phase 4; bisect between HEAD and chore(deps) isolates dep regressions from content regressions |
| D-07 icon library pruning via three-grep audit (template + dynamic + Buefy iconpack) | v1.3 Phase 3 | ✓ Good — confirmed 3 icons unused; `library.add` dropped 11 → 8 |
| Explicit `^2` pin on `vue-fontawesome` (NOT bare `latest`) | v1.3 Phase 3 | ✓ Good — dodged Pitfall 1 (npm `latest` resolves to v3 which requires Vue 3) |
| `--legacy-peer-deps` on npm install | v1.3 | ✓ Retired in v1.4 — both conflicts cleared (eslint-plugin-vue 6→9 via Phase 6 D-01 Amendment + @typescript-eslint 2→8 via Phase 7 TS-02) |
| Preserve `.prettierrc` byte-for-byte through Prettier 3 upgrade | v1.3 Phase 4 | ✓ Good — explicit `trailingComma: "es5"` dodged Prettier 3's default flip; reformat diff narrow to intentional algorithmic changes |
| Wire `eslint-config-prettier` into `.eslintrc.js` one milestone early (Pitfall 4 derogation) | v1.3 Phase 4 | ✓ Superseded by v1.4 FMT-01 full `plugin:prettier/recommended` integration |
| `babel-runtime` drop (not rename) per D-01 minimum-scope derogation | v1.4 Phase 5 | ✓ Good — zero import sites made rename to `@babel/runtime` dead weight; absence satisfies BABEL-01 |
| `@babel/eslint-parser` wired via `parserOptions.parser` (NOT top-level) | v1.4 Phase 5 | ✓ Good — preserves Vue SFC delegation through vue-eslint-parser@7 |
| `.eslintignore` → `ignores:` as v1.4 lint-scope-control mechanism | v1.4 Phase 5/6 | ✓ Good — bot/ + dist/ exclusion preserved across flat-config migration |
| FlatCompat bridge for legacy plugins (instead of upgrading them) | v1.4 Phase 6 D-01 | ✓ Good — minimum-surface migration; legacy plugins stay pinned for v2.0 cleanup |
| `eslint-plugin-vue` 6→9 amendment (user-approved Option A) | v1.4 Phase 6 D-01 Amendment | ✓ Necessary — v6 crashed under ESLint 9 via removed `codePath.currentSegments`; v9 preserves Vue 2 rule set + unlocks LINT-03 resolution |
| `@eslint/compat fixupConfigRules` shim for legacy plugin context APIs | v1.4 Phase 6 | ✓ Good — tactical bridge until v2.0 plugin upgrades |
| `tseslint.config({files: ['**/*.ts'], extends: [...]})` helper (NOT direct spread) | v1.4 Phase 7 | ✓ Critical — direct spread would globally override `@babel/eslint-parser` because base config lacks `files:` scope |
| TILDE pin `~5.7.3` on TypeScript (NOT caret) | v1.4 Phase 7 | ✓ Good — caret would resolve to 5.9.x; tilde locks to 5.7 patches only per research Pitfall 2 |
| Path A1 no-op for TS 5 triage | v1.4 Phase 7 | ✓ Good — `src/` compiled clean under strict mode with zero new errors; all 2567 baseline tsc errors were TS-3.8 `node_modules` parse failures |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-04-22 — v1.4 Tooling Modernization shipped.*
