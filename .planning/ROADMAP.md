# Roadmap: iRacing Screenshot Tool

## Milestones

- ✅ **v1.2 Feature Enhancements** — Phases 1-2 (shipped 2026-04-20 via PR #25) — [archive](./milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 UI Refresh** — Phases 3-4 (shipped 2026-04-21) — [archive](./milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Tooling Modernization** — Phases 5-7 (shipped 2026-04-22) — [archive](./milestones/v1.4-ROADMAP.md) · [requirements](./milestones/v1.4-REQUIREMENTS.md) · [audit](./milestones/v1.4-MILESTONE-AUDIT.md)
- 📋 **v2.0 Vue 3 Migration** — planned (trigger: after v1.4 or on Vue 2 CVE)

## Phases

<details>
<summary>✅ v1.2 Feature Enhancements (Phases 1-2) — SHIPPED 2026-04-20</summary>

- [x] Phase 1: Filename Format Configurator — delivered via quick task `260403-evq` (2026-04-03, 7/7 verified)
- [x] Phase 2: Discord Bug & Feature Tracker Bot — 10 plans, shipped via PR #25, 294 bot tests passing

</details>

<details>
<summary>✅ v1.3 UI Refresh (Phases 3-4) — SHIPPED 2026-04-21</summary>

- [x] Phase 3: Font Awesome v5 → v6 Upgrade (2 plans) — completed 2026-04-21 (commits `ae2627b` chore(deps) + `b5ecc32` refactor(icons); bundle +1.82%; UAT approved in dev + prod)
- [x] Phase 4: Prettier 3 Codebase Reformat (3 plans) — completed 2026-04-21 (commits `62f7abc` fix(HelpModal) + `1082d7d` chore(deps) + `e0e4923` format: prettier 3; lint -48 below baseline; 256/256 tests pass; bundle +0.042%; D-12 UAT approved)

</details>

<details>
<summary>✅ v1.4 Tooling Modernization (Phases 5-7) — SHIPPED 2026-04-22</summary>

- [x] Phase 5: Babel Package Renames (2 plans) — completed 2026-04-22 via four-commit chain (`eef6a7a` chore(deps) + `e52bbf9` chore(lint) scope narrow + `656aa8a` chore(lint) dist/ exclude + `74e112f` refactor(eslint) wire @babel/eslint-parser); retires `babel-runtime` + `babel-eslint`
- [x] Phase 6: ESLint 9 Flat Config + Prettier Full Wiring (2 plans) — completed 2026-04-22 via two-commit chain (`15b7042` chore(deps) + `96fe918` refactor(eslint)); ESLint 7→9, flat config migration, full `plugin:prettier/recommended` integration. **D-01 Amendment:** `eslint-plugin-vue` 6→9 escalated mid-phase due to ESLint 9 runtime incompatibility (removed `codePath.currentSegments` API)
- [x] Phase 7: TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps (4 plans) — completed 2026-04-22 via three-commit chain (`d873b50` chore(deps) + `b8f8e1c` refactor(eslint) wire tseslint 8 + `3050be7` chore(deps) drop --legacy-peer-deps MILESTONE-CLOSING); Path A1 no-op for TS 5 triage (`src/` compiled clean with zero errors)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Filename Format Configurator | v1.2 | 1/1 | Complete | 2026-04-03 |
| 2. Discord Bug & Feature Tracker Bot | v1.2 | 10/10 | Complete | 2026-04-20 |
| 3. Font Awesome v5 → v6 | v1.3 | 2/2 | Complete | 2026-04-21 |
| 4. Prettier 3 Codebase Reformat | v1.3 | 3/3 | Complete | 2026-04-21 |
| 5. Babel Package Renames | v1.4 | 2/2 | Complete | 2026-04-22 |
| 6. ESLint 9 Flat Config + Prettier Full Wiring | v1.4 | 2/2 | Complete | 2026-04-22 |
| 7. TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps | v1.4 | 4/4 | Complete | 2026-04-22 |

---

## Next Milestone Candidates

Seeded for future pickup (see `.planning/seeds/`):
- **v2.0 Vue 3 Migration** — Vue 3 + buefy replacement + Vite + Electron (trigger: after v1.4 or on Vue 2 CVE; includes Bulma 1.0, FA v7, remaining main.scss CDN cleanup, transitive prettier@2.8.8 via vue-loader, `eslint-plugin-vue` 9 → 10+, `vue-eslint-parser` 7 → 9, Jest 25 → Vitest, `eslint-config-standard` 14 → 17+/neostandard, replace `@eslint/compat fixupConfigRules` shims)

Run `/gsd-new-milestone` to start the next milestone.
