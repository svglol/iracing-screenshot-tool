# Roadmap: iRacing Screenshot Tool

## Milestones

- ✅ **v1.2 Feature Enhancements** — Phases 1-2 (shipped 2026-04-20 via PR #25) — [archive](./milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 UI Refresh** — Phases 3-4 (shipped 2026-04-21) — [archive](./milestones/v1.3-ROADMAP.md)
- 📋 **v1.4 Tooling Modernization** — planned (trigger: after v1.3 ships; TypeScript 5 + ESLint 9 flat config)
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

---

## Next Milestone Candidates

Seeded for future pickup (see `.planning/seeds/`):
- **v1.4 Tooling Modernization** — TypeScript 5 + ESLint 9 flat config (trigger: next; resolves `--legacy-peer-deps` load-bearing state + eslint-plugin-prettier full-wiring + typescript-eslint 8 migration)
- **v2.0 Vue 3 Migration** — Vue 3 + buefy replacement + Vite + Electron (trigger: after v1.4 or on Vue 2 CVE; includes Bulma 1.0, FA v7, remaining main.scss CDN cleanup, transitive prettier@2.8.8 via vue-loader)

Run `/gsd-new-milestone` to start the next milestone.
