# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** (none — v1.3 shipped 2026-04-21; awaiting `/gsd-new-milestone` for v1.4)
**Last activity:** 2026-04-21 — v1.3 UI Refresh milestone CLOSED (audit PASS-WITH-TECH-DEBT, archived to `.planning/milestones/v1.3-*`, git tagged v1.3)

## Current Position

**No active phase.** v1.3 UI Refresh shipped on master as a five-commit chain:
- `e0e4923` format: prettier 3 (Phase 4 Wave 3)
- `1082d7d` chore(deps): bump Prettier to v3 + ESLint-Prettier plugins (Phase 4 Wave 2)
- `62f7abc` fix(HelpModal): remove orphan p tags (Phase 4 Wave 1)
- `b5ecc32` refactor(icons): migrate template usage sites to FA v6 names (Phase 3 Wave 2)
- `ae2627b` chore(deps): bump Font Awesome core + icons to v6, vue-fontawesome to 2.x (Phase 3 Wave 1)

Both milestone requirements satisfied: UI-01 (Phase 3) + TOOL-01 (Phase 4). Audit verdict PASS-WITH-TECH-DEBT — no critical blockers; all tech debt is pre-existing or intentionally deferred to v1.4 / v2.0.

Resume file: next milestone → `/gsd-new-milestone` (v1.4 Tooling Modernization: TypeScript 5 + ESLint 9 flat-config + full eslint-plugin-prettier wiring)

Branch: master

## Project Reference

See [.planning/PROJECT.md](./PROJECT.md) (updated 2026-04-21 after v1.3 UI Refresh milestone).

**Core value:** Make great-looking race screenshots effortless for sim racers, and gather community signal without friction.
**Current focus:** Planning next milestone (v1.4 Tooling Modernization candidate).

## Previous Milestones

- **v1.2 Feature Enhancements** (2026-04-20) — shipped via PR #25. Filename configurator + Discord Bug & Feature Tracker Bot (10 plans, 294 bot tests). See [milestones/v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md).
- **v1.3 UI Refresh** (2026-04-21) — shipped on master. Font Awesome v5 → v6 (Phase 3) + Prettier 3 codebase reformat (Phase 4). 2 phases, 5 plans, 14 tasks. See [milestones/v1.3-ROADMAP.md](./milestones/v1.3-ROADMAP.md) / [REQUIREMENTS](./milestones/v1.3-REQUIREMENTS.md) / [AUDIT](./milestones/v1.3-MILESTONE-AUDIT.md).

## Deferred Items

Items acknowledged and deferred at v1.3 close on 2026-04-21:

| Category | Item | Status |
|----------|------|--------|
| debug | capture-resolution-no-reshade | verifying |
| debug | gallery-delete-not-removing-file | awaiting_human_verify |
| quick_task | 260403-evq-implement-ui-format-configurator-for-pic | missing |
| quick_task | 260410-n97-change-crop-watermark-from-hardcoded-54- | missing |
| quick_task | 260410-v7a-add-prefer-top-left-watermark-crop-toggl | missing |
| quick_task | 260414-r9x-add-file-based-info-debug-logging-system | missing |
| quick_task | 260414-rvd-add-output-format-selector-jpeg-png-webp | missing |

All pre-existing from v1.2 era. None introduced by v1.3. Not blocking.

## Blockers/Concerns

None blocking. Technical debt for the next milestone:
- `--legacy-peer-deps` on npm install is now load-bearing for two peer conflicts (typescript-eslint@2 vs eslint@7 AND eslint-plugin-prettier@5 peer eslint>=8). Resolves with ESLint 9 flat-config migration (v1.4).
- `eslint-plugin-prettier` installed but not wired via `plugin:prettier/recommended` — only `eslint-config-prettier` is wired (Pitfall 4 minimum-scope from v1.3 Phase 4). Full rule integration deferred to v1.4.
- Pre-existing Electron 41 `electron.BrowserWindow.addDevToolsExtension is not a function` error at `src/main/index.js:116` — unchanged by v1.3; future main-process cleanup ticket.
- Pre-existing FA v5.2.0 CDN `@import` at `src/renderer/assets/style/main.scss:153` — zero runtime impact; defer to v2.0 Bulma/Buefy work or standalone `chore(style):` cleanup.
- Transitive `prettier@2.8.8` via `vue-loader`/`@vue/compiler-sfc` — resolves naturally with v2.0 Vue 3 migration.

## Decisions Log (accumulated — v1.3)

Full decision history from v1.3 execution archived alongside the milestone (see `.planning/milestones/v1.3-ROADMAP.md §Milestone Summary §Key Decisions`). Summary of the most load-bearing for downstream work:

- **D-04 / D-07 two/three-commit bisect shape** — proven pattern on master (Phase 3 two-commit pair + Phase 4 three-commit chain with neutral pre-condition). Reuse for any future dep-bump + content-change phase.
- **D-07 three-grep icon-pruning audit** — template + dynamic + Buefy icon-pack sanity check protocol. Reusable for any bundled icon/asset audit.
- **Pitfall 4 minimum-scope derogation** — when a latent `.prettierrc` vs ESLint stylistic-rule conflict surfaces mid-reformat, the 1-line `'prettier'` extends wiring is acceptable scope expansion (user-approved); full ESLint-9 flat-config integration stays deferred.
- **Orchestrator-as-fallback-finalizer** — when a checkpoint-gated executor stalls after `SendMessage` resume, the orchestrator can finalize with full data provenance using the plan's locked commit template. Pattern used twice in v1.3 (Phase 3 Plan 02 + Phase 4 Plan 03).
- **Path-correction note in baseline artifacts** — when a plan's path assumption diverges from actual output (e.g., `dist/renderer/*.js` vs `dist/renderer.js`), preserve the plan's verify-grep label verbatim but document the actual path so downstream waves measure the same file.
