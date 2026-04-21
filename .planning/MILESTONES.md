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

*Last milestone: v1.3 (2026-04-21)*
