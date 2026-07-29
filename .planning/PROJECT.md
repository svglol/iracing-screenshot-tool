# iRacing Screenshot Tool

**Description:** Electron + Vue 3 desktop app for taking high-resolution screenshots of iRacing, with a separate Discord bot for community bug reports and feature requests mirrored to GitHub Issues.
**Stack:** Electron 41 + Vue 3 + Oruga + Vite + Vitest + TypeScript + sharp + a native Rust Windows.Graphics.Capture addon reached via koffi FFI (desktop) · Node 24 + discord.js 14 + Fastify 5 + Octokit + better-sqlite3 (bot)
**Repository:** svglol/iracing-screenshot-tool

## What This Is

A two-part project:
- **Desktop app (`src/`)** — Electron 41 / Vue 3 / Oruga UI for capturing iRacing screenshots with configurable resolution, filename format, output format (JPEG/PNG/WebP), watermark cropping, and session-field tokens resolved from iRacing telemetry via `irsdk-node`. Capture runs through a native Rust Windows.Graphics.Capture addon (`native/wgc-capture.node`) by default and falls open to `getUserMedia`/`desktopCapturer` when WGC is unavailable; window resize and VRAM probing go through `koffi` FFI. Built with Vite; tests under Vitest (329 across 16 files); source tree is full TypeScript.
- **Discord bot (`bot/`)** — Separate always-on Node 24 service that relays community bug/feature reports between a public Discord channel and GitHub Issues (source of truth), with reaction-based upvoting, Maintainer-role triage commands, attachment re-hosting to an orphan branch, and reporter pings on status changes via HMAC-verified GitHub webhook over Cloudflare Tunnel.

## Core Value

**Make great-looking race screenshots effortless for sim racers**, and **gather community signal without friction** — reporters file bugs and vote on features from Discord without needing a GitHub account.

## Current State

- **v1.2 shipped** (2026-04-20) — PR #25 merged upstream. Phase 1 (filename format configurator) and Phase 2 (Discord bug & feature tracker bot) complete.
- **v1.3 shipped** (2026-04-21) — Phases 3-4. Font Awesome v5 → v6 upgrade + Prettier 3 codebase reformat landed on master as a five-commit chain. Tests 256/256 pass.
- **v1.4 shipped** (2026-04-22) — Phases 5-7. Tooling modernization: Babel package renames + ESLint 9 flat config + TypeScript 5.7 + typescript-eslint 8 + `--legacy-peer-deps` retired.
- **v2.0 shipped** (2026-04-22) — Phases 8-13. Vue 3 migration complete: Vue 2.7 → Vue 3 + Buefy → Oruga + webpack → Vite + Jest → Vitest + ESLint/Vue ecosystem cleanup (neostandard, flat-config-native) + `.js` → `.ts` across full `src/` tree + Electron DevTools cleanup. 6 phases, 19 plans, 29 content commits. Tests 256/256 under Vitest (~220ms, 3× faster). Installer 115.5 MB (−2.19% vs v1.4 baseline).

**Everything below shipped as quick tasks — no GSD milestone was opened after v2.0.** This is why STATE.md shows no active phase despite three months of releases.

- **v3.0.0 → v3.0.5** (2026-04-29 → 2026-07-01) — UI/UX polish and capture fixes: gallery virtualization (dropped `o-carousel`), keep-aspect-ratio toggle with live target-resolution hint, HelpModal/ChangelogModal overflow fixes, settings light-switch toggles, direct-crop watermark perf (PR #58), capture without iRacing session info, screenshot-error toast rendered as a component rather than an HTML string.
- **v3.1.0** (2026-07-03) — Native WGC high-fidelity capture. Rust `Windows.Graphics.Capture` addon shipped default-ON (`nativeCapture: true`), hardware-validated 2026-07-02, falling open to `getUserMedia`. Also VRAM guardrail (OOM prediction + safe-preset switch), exclusive-fullscreen detection, koffi resize + DPI correctness.
- **v3.1.1** (2026-07-05) — Reliability, diagnostics & hardening via PR #62. The 13-WP remediation of the 2026-07-03 observability/code-quality audit: structured logger foundation, process/renderer crash nets, three permanent-wedge paths killed, capture abort/in-flight guards, filename-sanitizer hardening, VRAM adapter-matching, native-stack + WGC failure diagnostics, release-pipeline hardening, test infra. Tests 256 → **329**.

## Next Milestone

_None active — v3.1.1 shipped 2026-07-05. Run `/gsd-new-milestone` to scope the next milestone._

**Candidates, highest-value first:**
- **WP-K Stages 1–3** — the deliberately deferred remainder of the security hardening: `contextIsolation` flip (needs a preload `contextBridge` + ~10-renderer-file migration of in-process `fs`/`sharp`/`clipboard` work), CSP, code signing. Each needs live-Electron runtime verification that type-check/vitest cannot provide, hence separate PRs. **Standing consequence until Stage 1 lands: the renderer holds in-process filesystem access.**
- **`sharp` 0.34.5 → 0.35.3** — clears the inherited libvips CVEs (CVE-2026-33327/33328/35590/35591). Breaking, native, and load-bearing for the whole capture path, so it wants a real hardware capture to verify rather than a green suite.
- **Replace `markdown-it`** (was framed as bundle-size work: +85.6% contribution; renderer bundle now 3.13 MB) — now doubles as the *only* remedy for the `linkify-it`/`markdown-it` ReDoS advisories, which have **no published fix**. Swapping to `marked`/`micromark`, or lazy-loading it, resolves both concerns at once.
- Stricter tsconfig flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, re-enable `noImplicitAny` + `strictNullChecks` — 151 latent errors from v2.0 transitional relaxations)
- Bot workspace Vitest migration (kept separate from v2.0; ~294 tests)
- TS `any` cleanup (10 targeted casts in SFCs)
- Dev-mode `<script>` injection for vue-devtools connectivity (QoL restore). Consider instead whether `@vue/devtools` still earns its place — `installDevTools()` was deleted in Phase 13, and its nested `electron` copy contributes 17 high-severity advisories to every Dependabot scan.
- Electron 41 → 42+ bump (triggered by CVE or LTS cadence). **Not currently CVE-triggered:** 41.2.1 sits above the `<=39.8.4` vulnerable range.

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
- ✓ Vue 2.7 → Vue 3 — v2.0 (VUE3-01)
- ✓ `vue-router` 3 → 4 — v2.0 (VUE3-02)
- ✓ `vue-loader` 15 → 17 (then retired with webpack in Phase 9) — v2.0 (VUE3-03)
- ✓ `vue-devtools` → `@vue/devtools` — v2.0 (VUE3-04)
- ✓ Buefy → Oruga UI framework — v2.0 (UI-02)
- ✓ Bulma 0.9 → 1.0 — v2.0 (UI-03)
- ✓ FA v5.2.0 CDN `@import` removed from `main.scss` — v2.0 (UI-04)
- ✓ Font Awesome v6 → v7 + `vue-fontawesome` 2.x → 3.x — v2.0 (UI-05)
- ✓ webpack → Vite bundler (electron-vite wrapper) — v2.0 (BUNDLER-01)
- ✓ Jest → Vitest — v2.0 (BUNDLER-02)
- ✓ `.js` → `.ts` conversion across full `src/` tree — v2.0 (TS-03)
- ✓ `@typescript-eslint/parser` as primary lint parser for `.ts/.vue` — v2.0 (TS-04)
- ✓ `eslint-plugin-vue` 9 → 10+ — v2.0 (LINT-04)
- ✓ `vue-eslint-parser` 7 → 10+ — v2.0 (LINT-05)
- ✓ `eslint-config-standard` → `neostandard` — v2.0 (LINT-06)
- ✓ `@eslint/compat fixupConfigRules` shim removed — v2.0 (LINT-07)
- ✓ Legacy ESLint plugins retired (import@2, node@11, promise@4, standard@4) — v2.0 (LINT-08)
- ✓ Electron DevTools install error fixed + `prettier@2.8.8` transitive cleanup — v2.0 (FIX-01)

Post-v2.0 items shipped as quick tasks, so they carry no REQ-IDs — a traceability gap worth closing if any of this is ever re-audited:

- ✓ Native WGC high-fidelity capture, default-ON with automatic fall-open to `getUserMedia` — v3.1.0
- ✓ VRAM OOM prediction with warning + one-click safe-preset switch, adapter-matched on multi-GPU machines — v3.1.0 / v3.1.1
- ✓ Exclusive-fullscreen detection with guidance to switch to Borderless/Windowed — v3.1.0
- ✓ koffi-based window resize + high-DPI correctness — v3.1.0
- ✓ Structured leveled logging (warn/error ungated in packaged builds), JSON-lines with line-boundary-safe rotation and home-path redaction — v3.1.1
- ✓ Crash safety nets: `uncaughtException`/`unhandledRejection`/`child-process-gone`/`render-process-gone` all leave durable log lines — v3.1.1
- ✓ Three permanent-wedge paths eliminated (iRacing SDK poll self-heal, capture-latch watchdog, guarded error-report write) — v3.1.1
- ✓ Filename sanitizer hardened: control/NUL bytes, Windows reserved device names, Unicode-aware emptiness, global `{counter}` fill — v3.1.1
- ✓ `@electron/remote` removed entirely + window navigation locked down (`setWindowOpenHandler` deny + off-origin `will-navigate` guard) — v3.1.1 (WP-K Stage 0)

### Active

_No active requirements. v2.0 shipped all 18 of its requirements; everything since has gone through quick tasks. Run `/gsd-new-milestone` to define the next set._

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
- **Exclusive fullscreen is uncapturable, by both backends.** WGC is DWM-based and comes back black in iRacing's exclusive Full Screen exactly as `desktopCapturer` does — shipping the native addon did *not* relax this. Only hook injection (ReShade) works there. The app detects the condition and directs the user to Borderless/Windowed; treat any "fix this" impulse as out of scope.
- **The `getUserMedia` fallback path has a hard I420 4:2:0 fidelity ceiling.** Every frame is chroma-subsampled, so "lossless PNG" is not pixel-accurate on that path; true RGBA requires the native WGC grab. Corollary: if native ever falls back silently, the 1.5×-oversized-screenshot symptom (physical pixels at 150% display scaling) returns — the fingerprint is `streamW ≠ windowWidth` in the "Stream dim retry timeout" log line.
- **Window resize is the only external VRAM lever.** iRacing's OOM ceiling cannot be raised from outside the process, so robustness here means predict/refuse plus graceful recovery — never "survive a bigger capture". Related: "Could not start video source" is a per-GPU/VRAM capture-surface allocation failure, *not* a display-size limit (disproven — 8K over-display capture works on some machines via both backends), so it must not be fixed with a display clamp.

## Context

**Codebase:**
- Electron app: `src/main/` (Node-side), `src/renderer/` (Vue 3 UI + Oruga + FA v7), `src/utilities/` (shared). Full TypeScript across `src/` tree; `.vue` SFCs use `<script lang="ts">`. Built with Vite via `electron-vite`; tests under Vitest (329 across 16 files, renderer-capable harness via happy-dom + `@vue/test-utils`).
- Native capture: `native/wgc-capture/` is the Rust crate (source tracked, `target/` ignored); the built `native/wgc-capture.node` **is committed** and must be rebuilt + re-committed whenever `lib.rs` changes (`cargo build --release`, copy the DLL over the `.node`). `asarUnpack` covers it plus the koffi binaries.
- Externalization matters for security triage: `electron.vite.config.mjs` externalizes all main-process deps plus `electron`/`electron-updater`/`irsdk-node`/`sharp`/`koffi`, while the renderer externalizes only `electron`/`sharp` — so everything else in the renderer is bundled, and electron-builder prunes devDependencies from the shipped `node_modules`.
- Bot: `bot/src/` ESM modules, `bot/docs/` deployment guides, own `package.json`. Still on Jest (separate from v2.0 Vitest migration; v2.1 candidate).
- `/bot/` excluded from electron-builder packaging (`!bot/**/*` in `build.files`) and from root Vitest (`bot/**` in `vitest.config.mjs` exclude).

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
| Phase 8 MERGE (original 8+9+10+13 → single Phase 8) | v2.0 Phase 8 | ✓ Good — codebase scout revealed Buefy + vue-fontawesome@2 + Vue Router 3 are all Vue-2-only; shipping Vue 3 core alone would break the app. Single honest landing preserved buildability |
| `electron-vite` as opinionated Vite wrapper (vs `vite-plugin-electron`) | v2.0 Phase 9 | ✓ Good — subsumed 369 LOC of custom `_scripts/dev-runner.js` orchestration; single `electron.vite.config.mjs` for main+renderer |
| `.mjs` config language (defer `.ts` to Phase 12) | v2.0 Phase 9 | ✓ Good — avoids bootstrap cycle with tsconfig shape changes; `.mjs` is trivial to convert in Phase 12 sweep |
| `neostandard` over `eslint-config-standard@17` | v2.0 Phase 11 | ✓ Good — `noStyle: true` defers all formatting to prettier; bundles plugin-import-x + plugin-n + plugin-promise so 4 legacy plugins retire in one swap |
| Per-directory `.js → .ts` batch commits (6-plan decomposition) | v2.0 Phase 12 | ✓ Good — each plan lands independently bisectable; utilities (low-risk) before main (coupled to Node APIs) before renderer (coupled to Vue); 18 .js + 10 .vue migrated with 1/15 @ts-expect-error budget used |
| Transitional TS relaxations (`noImplicitAny: false` + `strictNullChecks: false`) | v2.0 Phase 12 | ⚠ Transitional — 151 latent errors deferred to v2.1; avoids blocking v2.0 ship on strict-type-fixes scope creep |
| D-13-01 option (a): delete `installDevTools()` entirely | v2.0 Phase 13 | ✓ Good — `@vue/devtools` v8 is a standalone Electron app, not an in-process `require`. Deletion is simpler than rewriting to inject `<script>` tags at runtime |
| Autonomous-mode execution across 5 sequential phases | v2.0 Phases 9-13 | ✓ Good — `/gsd-autonomous` one-phase-at-a-time rhythm (discuss → plan → execute → verify → iterate) shipped entire v2.0 milestone in single session; bot/** scope isolation preserved throughout |
| Native Rust WGC addon shipped default-ON, falling open to `getUserMedia` | v3.1.0 | ✓ Good — hardware-validated 2026-07-02; default-ON is what actually delivers true-color capture to users, and the fall-open keeps unsupported machines working. Did **not** relax the exclusive-fullscreen ceiling |
| `koffi` FFI for window resize + VRAM probing (rather than a second native addon) | v3.1.0 | ✓ Good — no extra build step or rebuild burden; cost is that koffi failures are silent unless explicitly logged, which is what WP-E fixed |
| Decompose the obs/quality audit into 13 independently-gated work packages | v3.1.1 | ✓ Good — WP-A (logger) as keystone unblocked B/C/E/F/G; each WP landed with its own type-check + test gate, so a bad WP never blocked the rest. 13/13 complete |
| WP-K staged: ship the statically-verifiable subset, defer the rest | v3.1.1 | ✓ Right call — `contextIsolation`/CSP/signing cannot be proven by type-check or vitest, and the Vue3-registration lesson showed a missed require rewrite fails *only* at runtime. Deferring beat shipping unverifiable security changes |
| Plant an `electron` stub in Node's `require.cache` via `createRequire` instead of `vi.mock` | v3.1.1 | ✓ Good — `vi.mock('electron')` cannot intercept the native top-level `const x = require('electron')` in logger/config; this is the reusable pattern for those modules |
| Triage dependency advisories by *reachability in the packaged app*, not raw count | 2026-07-29 | ✓ Good — 61 Dependabot findings reduced to 10 shipped, and the one critical (`tar`) was genuinely reachable via the update-extract path. Prevents both panic and complacency |
| Consolidate release notes into one retrospective, deliberately non-semver file | 2026-07-29 | ✓ Good — `release.js` keys on `RELEASE-NOTES-v${newVersion}.md`, so a semver name would make a future release publish stale notes. Reasoning recorded in the commit body to stop a well-meaning rename |
| Remove `.planning/` from git tracking to honour the existing `.gitignore` | 2026-07-29 | ✓ Resolves a real trap — the dir was ignored while 167 files stayed tracked, so any *new* planning artifact was invisible to `git status`/`git add`. Cost: planning history is local-only from here, and collaborators lose the dir on next pull |

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

*Last updated: 2026-07-29 — refreshed for the v3.x line (v3.1.1 shipped 2026-07-05). Note: `.planning/` was untracked from git on this date, so future edits to this file live only in the working tree unless force-added.*
