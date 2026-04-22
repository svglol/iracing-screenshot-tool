# Roadmap: iRacing Screenshot Tool

## Milestones

- ✅ **v1.2 Feature Enhancements** — Phases 1-2 (shipped 2026-04-20 via PR #25) — [archive](./milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 UI Refresh** — Phases 3-4 (shipped 2026-04-21) — [archive](./milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Tooling Modernization** — Phases 5-7 (shipped 2026-04-22) — [archive](./milestones/v1.4-ROADMAP.md) · [requirements](./milestones/v1.4-REQUIREMENTS.md) · [audit](./milestones/v1.4-MILESTONE-AUDIT.md)
- ✅ **v2.0 Vue 3 Migration** — Phases 8-13 (shipped 2026-04-22) — [archive](./milestones/v2.0-ROADMAP.md) · [requirements](./milestones/v2.0-REQUIREMENTS.md) · [audit](./v2.0-MILESTONE-AUDIT.md)

## Active Milestone

_None — v2.0 shipped 2026-04-22. Run `/gsd-new-milestone` to scope v2.1._

## Phases (historical)

<details>
<summary>✅ v1.2 Feature Enhancements (Phases 1-2) — SHIPPED 2026-04-20</summary>

- [x] Phase 1: Filename Format Configurator — delivered via quick task `260403-evq` (2026-04-03, 7/7 verified)
- [x] Phase 2: Discord Bug & Feature Tracker Bot — 10 plans, shipped via PR #25, 294 bot tests passing

</details>

<details>
<summary>✅ v1.3 UI Refresh (Phases 3-4) — SHIPPED 2026-04-21</summary>

- [x] Phase 3: Font Awesome v5 → v6 Upgrade (2 plans)
- [x] Phase 4: Prettier 3 Codebase Reformat (3 plans)

</details>

<details>
<summary>✅ v1.4 Tooling Modernization (Phases 5-7) — SHIPPED 2026-04-22</summary>

- [x] Phase 5: Babel Package Renames (2 plans)
- [x] Phase 6: ESLint 9 Flat Config + Prettier Full Wiring (2 plans)
- [x] Phase 7: TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps (4 plans)

</details>

<details>
<summary>✅ v2.0 Vue 3 Migration (Phases 8-13) — SHIPPED 2026-04-22</summary>

- [x] Phase 8: Vue 3 core + router + UI framework + Font Awesome (MERGED) — 6 plans
- [x] Phase 9: webpack → Vite bundler — 5 plans
- [x] Phase 10: Jest → Vitest — 1 plan
- [x] Phase 11: ESLint/Vue ecosystem cleanup — 1 plan
- [x] Phase 12: .js → .ts conversion in src/ — 5 plans (Plan 06 UAT skipped)
- [x] Phase 13: Electron main-process fixes + ship prep — 1 plan

Full details: [v2.0-ROADMAP.md](./milestones/v2.0-ROADMAP.md)

</details>

## Progress (historical)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Filename Format Configurator | v1.2 | 1/1 | Complete | 2026-04-03 |
| 2. Discord Bug & Feature Tracker Bot | v1.2 | 10/10 | Complete | 2026-04-20 |
| 3. Font Awesome v5 → v6 | v1.3 | 2/2 | Complete | 2026-04-21 |
| 4. Prettier 3 Codebase Reformat | v1.3 | 3/3 | Complete | 2026-04-21 |
| 5. Babel Package Renames | v1.4 | 2/2 | Complete | 2026-04-22 |
| 6. ESLint 9 Flat Config + Prettier Full Wiring | v1.4 | 2/2 | Complete | 2026-04-22 |
| 7. TypeScript 5 + typescript-eslint 8 + Drop legacy-peer-deps | v1.4 | 4/4 | Complete | 2026-04-22 |
| 8. Vue 3 core + router + UI + Font Awesome (MERGED) | v2.0 | 6/6 | Complete | 2026-04-22 |
| 9. webpack → Vite bundler | v2.0 | 5/5 | Complete | 2026-04-22 |
| 10. Jest → Vitest | v2.0 | 1/1 | Complete | 2026-04-22 |
| 11. ESLint/Vue ecosystem cleanup | v2.0 | 1/1 | Complete | 2026-04-22 |
| 12. .js → .ts conversion + typescript-eslint/parser primary | v2.0 | 5/6 (Plan 06 SKIPPED) | Complete | 2026-04-22 |
| 13. Electron main-process fixes + ship prep | v2.0 | 1/1 | Complete | 2026-04-22 |

---

## Next Milestone Candidates

Post-v2.0 considerations seeded for v2.1:
- **bot Vitest migration** — `bot/` workspace gets its own Jest → Vitest migration (kept separate from v2.0 per REQUIREMENTS scope)
- **Stricter tsconfig** — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, re-enable `noImplicitAny` + `strictNullChecks` (deferred from v2.0 to keep `.js → .ts` scope manageable); 151 latent errors to fix
- **TS `any` cleanup** — 10 targeted `any` casts in SFCs + some module-level `any` in main.ts; typing improvements
- **Renderer bundle size optimization** — markdown-it is the +85.6% bloat contributor; swap to `marked` + `micromark` or lazy-load in renderer
- **Electron major bump** — stays on Electron 41 through v2.0; future version-bump triggered by CVE or Electron LTS cadence
- **Dev-mode vue-devtools `<script>` injection** — QoL restore (retired in Phase 13 as deletion-not-rewrite)

Run `/gsd-new-milestone` to scope v2.1.
