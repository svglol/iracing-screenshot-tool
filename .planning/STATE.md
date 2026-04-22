# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** v1.4 Tooling Modernization
**Last activity:** 2026-04-22 — Phase 5 plan 01 shipped (commit `eef6a7a` chore(deps): rename babel packages)

## Current Position

Phase: Phase 5: Babel Package Renames
Plan: 1/2 complete — plan 05-02 (refactor(eslint): wire @babel/eslint-parser) pending
Status: In progress — commit 1 of D-09 two-commit bisect pair landed on master
Branch: master

Milestone kicked off via `/gsd-new-milestone` on 2026-04-21 after v1.3 UI Refresh shipped. REQUIREMENTS.md defined (9 active reqs across TS/LINT/FMT/BABEL categories). Roadmap completed 2026-04-21 — three phases (5, 6, 7) with full coverage of all 9 v1.4 requirements. Phase 5 planning completed 2026-04-22: research pinned `@babel/eslint-parser@^7.28.6`, verified Vue SFC delegation chain by source-reading, established lint-delta ±0–10 surface; plans land as D-09 two-commit shape (`chore(deps): rename babel packages` + `refactor(eslint): wire @babel/eslint-parser via parserOptions.parser`).

## Project Reference

See [.planning/PROJECT.md](./PROJECT.md) (updated 2026-04-21 — v1.4 milestone started).

**Core value:** Make great-looking race screenshots effortless for sim racers, and gather community signal without friction.
**Current focus:** v1.4 Tooling Modernization — TypeScript 5, ESLint 9 flat config, retire deprecated Babel packages, resolve v1.3 carryover tech debt.

## Previous Milestones

- **v1.2 Feature Enhancements** (2026-04-20) — shipped via PR #25. Filename configurator + Discord Bug & Feature Tracker Bot (10 plans, 294 bot tests). See [milestones/v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md).
- **v1.3 UI Refresh** (2026-04-21) — shipped on master. Font Awesome v5 → v6 (Phase 3) + Prettier 3 codebase reformat (Phase 4). 2 phases, 5 plans, 14 tasks. See [milestones/v1.3-ROADMAP.md](./milestones/v1.3-ROADMAP.md) / [REQUIREMENTS](./milestones/v1.3-REQUIREMENTS.md) / [AUDIT](./milestones/v1.3-MILESTONE-AUDIT.md).

## Deferred Items

Items carried over from v1.3 close on 2026-04-21:

| Category | Item | Status |
|----------|------|--------|
| debug | capture-resolution-no-reshade | verifying |
| debug | gallery-delete-not-removing-file | awaiting_human_verify |
| quick_task | 260403-evq-implement-ui-format-configurator-for-pic | missing |
| quick_task | 260410-n97-change-crop-watermark-from-hardcoded-54- | missing |
| quick_task | 260410-v7a-add-prefer-top-left-watermark-crop-toggl | missing |
| quick_task | 260414-r9x-add-file-based-info-debug-logging-system | missing |
| quick_task | 260414-rvd-add-output-format-selector-jpeg-png-webp | missing |

All pre-existing from v1.2 era. None blocking v1.4.

## Blockers/Concerns

Entering v1.4 with this technical debt (all targets of the milestone):
- `--legacy-peer-deps` on npm install is load-bearing for two peer conflicts (typescript-eslint@2 vs eslint@7 AND eslint-plugin-prettier@5 peer eslint>=8). **Resolves with v1.4 ESLint 9 + typescript-eslint 8 migration — verified by LINT-03 in Phase 7.**
- `eslint-plugin-prettier` installed but not wired via `plugin:prettier/recommended` — only `eslint-config-prettier` is wired (v1.3 Phase 4 Pitfall 4 minimum-scope derogation). **Full rule integration in v1.4 Phase 6 (FMT-01).**
- Pre-existing Electron 41 `electron.BrowserWindow.addDevToolsExtension is not a function` error at `src/main/index.js:116` — out of scope for v1.4 (main-process cleanup, not tooling).
- Pre-existing FA v5.2.0 CDN `@import` at `src/renderer/assets/style/main.scss:153` — deferred to v2.0 Bulma/Buefy work.
- Transitive `prettier@2.8.8` via `vue-loader`/`@vue/compiler-sfc` — resolves naturally with v2.0 Vue 3 migration.

## Accumulated Context

Load-bearing patterns/decisions from prior milestones that stay in force for v1.4:

- **D-04 / D-07 two/three-commit bisect shape** — proven pattern on master (v1.3 Phase 3 two-commit pair + Phase 4 three-commit chain with neutral pre-condition). Reuse for all three v1.4 phases: each phase should land as a `chore(deps):` commit plus content commit(s) so bisecting between HEAD and `chore(deps)` isolates dep-bump regressions from content changes.
- **Orchestrator-as-fallback-finalizer** — when a checkpoint-gated executor stalls after `SendMessage` resume, the orchestrator can finalize with full data provenance using the plan's locked commit template. Pattern used twice in v1.3.
- **Path-correction note in baseline artifacts** — when a plan's path assumption diverges from actual output, preserve the plan's verify-grep label verbatim but document the actual path so downstream waves measure the same file.
- **Minimum-scope derogation philosophy** — when a latent config conflict surfaces mid-phase, a tightly-scoped minimum fix is acceptable if it unblocks the phase goal; the full integration stays scheduled. (Used for `eslint-config-prettier` wiring in v1.3 Phase 4; v1.4 Phase 6 FMT-01 now picks up the full `plugin:prettier/recommended` integration.)
- **v1.3 lint baseline: 1881** — FMT-01 / LINT-02 parity checks measure against this number; drift beyond the baseline without justification is a regression signal.
- **Phase 5 pre-swap lint baseline: 1881 (errors 1878, warnings 3)** — captured 2026-04-22T07:36:23Z at pre-swap HEAD `5fd3c8d` into `.planning/phases/05-babel-package-renames/05-01-BASELINE.md` via `npx eslint --ext .js,.ts,.vue ./ --no-fix` (NOT `npm run lint` — would apply `--fix`). Dominant rule: `no-undef` (1818, Jest globals in `.test.js` files). This is the D-08 denominator for plan 05-02's post-swap delta assertion (`post_count ≤ 1881`).
- **Phase 5 plan 05-01 landed** — commit `eef6a7a` (chore(deps): rename babel packages). 3 staged paths (package.json, package-lock.json, 05-01-BASELINE.md). 84-line lockfile churn, all Babel-adjacent (Pitfall 8 threshold ~100 — passed clean). @babel/eslint-parser@7.28.6 installed; babel-runtime + babel-eslint + transitive core-js@2.6.11 + regenerator-runtime@0.11.1 retired. `npm test` 256/256. No Co-Authored-By, no --no-verify. Bot/docs/community-guide.md stayed untracked; pre-existing src/*.vue EOL/content modifications stayed unstaged.
