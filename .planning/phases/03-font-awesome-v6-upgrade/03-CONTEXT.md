# Phase 3: Font Awesome v5 → v6 Upgrade - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade the Font Awesome stack from v5 (2020) to v6 (the Vue-2 ceiling) without regressing the rendering of any currently-displayed icon. Scope is limited to the `@fortawesome/*` packages and their call sites — no other UI dependencies, no Vue 3 work, no Bulma changes, no Buefy changes.

**In scope:**
- `@fortawesome/fontawesome-svg-core` 1.2.28 → 6.x
- `@fortawesome/free-solid-svg-icons` 5.13.0 → 6.x
- `@fortawesome/free-brands-svg-icons` 5.13.0 → 6.x
- `@fortawesome/vue-fontawesome` 0.1.9 → 2.x (paired upgrade — vue-fontawesome 0.1.x is pinned to FA core 1.x)
- `src/renderer/main.js` icon imports + registration (library.add, component registration)
- All `<font-awesome-icon :icon="['fas', '<name>']" />` call sites in `src/renderer/**/*.vue` where the name changed in v6

**Out of scope:**
- Vue 3 migration (v2.0 — blocks FA v7 + vue-fontawesome 3.x)
- FA v7 (requires vue-fontawesome 3.x → requires Vue 3)
- Bulma 0.9 → 1.0 (v2.0 — would break Buefy)
- Buefy (no Vue 3 version — replacement is v2.0)
- Buefy's `icon-left="..."` usage (Buefy defaults to MDI iconPack, not FA — not affected)
- `@fortawesome/free-regular-svg-icons` (not currently used; not adding)
- Prettier 3 reformat (Phase 4)

</domain>

<decisions>
## Implementation Decisions

### Icon name strategy

- **D-01:** **Adopt v6 icon names directly** across imports AND template `:icon="['fas', '...']"` call sites. No use of FA's `/shims` compat package. Rationale: only 5 of 11 registered icons were renamed, the template surface is ~9 call sites, and carrying shim packages forward creates tech debt that would need to be unwound before the eventual FA v7 / Vue 3 migration anyway.

- **D-02:** **Name migration map** (from `src/renderer/main.js`):
  | v5 JS import | v6 JS import | v5 kebab-case | v6 kebab-case |
  |--------------|--------------|---------------|---------------|
  | `faUserCog` | `faUserGear` | `user-cog` | `user-gear` |
  | `faInfoCircle` | `faCircleInfo` | `info-circle` | `circle-info` |
  | `faCog` | `faGear` | `cog` | `gear` |
  | `faExternalLinkAlt` | `faUpRightFromSquare` | `external-link-alt` | `up-right-from-square` |
  | `faQuestionCircle` | `faCircleQuestion` | `question-circle` | `circle-question` |
  | `faFolder` | `faFolder` | `folder` | `folder` |
  | `faTrash` | `faTrash` | `trash` | `trash` |
  | `faCamera` | `faCamera` | `camera` | `camera` |
  | `faCopy` | `faCopy` | `copy` | `copy` |
  | `faArrowDown` | `faArrowDown` | `arrow-down` | `arrow-down` |
  | `faDiscord` (brands) | `faDiscord` | `discord` | `discord` |

### Icon style scope

- **D-03:** **Keep free-solid + free-brands only.** Do NOT add `@fortawesome/free-regular-svg-icons`. The current UI uses only solid glyphs + one brand (Discord) and has no outlined-icon design pattern. Adding the package opens the door to inconsistency without a clear need.

### Commit granularity

- **D-04:** **Two atomic commits** for bisectability:
  1. `chore(deps): bump Font Awesome core + icons to v6, vue-fontawesome to 2.x` — `package.json`, `package-lock.json`, `src/renderer/main.js` imports and `library.add()` call updated to v6 names.
  2. `refactor(icons): migrate template usage sites to FA v6 names` — updates `:icon="['fas', '<name>']"` strings across the 3 component files that contain renamed icons (Home.vue, Settings.vue, PromoCard.vue).
  Rationale: commit 1 without commit 2 would render the 5 renamed icons as unknown/blank — but the unknown icons are all non-critical (trash/copy/etc. are renamed-keep-same; only Settings.vue `cog`/`question-circle`, PromoCard.vue `external-link-alt`, Home.vue `external-link-alt` would blank). Bisect on commit 2 narrows any template-only regression.

### Verification approach

- **D-05:** **Manual UAT across 4 views:** `src/renderer/views/Home.vue`, `src/renderer/components/Settings.vue`, `src/renderer/components/TitleBar.vue`, `src/renderer/components/PromoCard.vue`. For each view, confirm every `<font-awesome-icon>` glyph renders correctly.
- **D-06:** **Bundle-size check via webpack stats** — run `npm run pack:renderer` and compare the renderer chunk size before/after. Acceptance: ≤ 10% increase (ideally a decrease, since FA v6's tree-shaking is improved). No Playwright / visual-regression tooling.

### Investigate during planning

- **D-07:** **Audit unused icons during upgrade.** Grep found no template usage of `faUserCog`, `faInfoCircle`, or `faCamera` after excluding Buefy's MDI icon-left usage. The planner should decide whether to (a) preserve them in `library.add()` for safety in case they're referenced by strings we couldn't grep, or (b) prune them as part of the commit 1 cleanup. Prefer (b) if a thorough grep confirms no dynamic usage.

### Claude's Discretion

- Exact plan-to-commit mapping (one plan producing both commits, or two plans).
- Whether to include a lint pass in commit 2 or a separate commit.
- How to structure a lightweight pre-merge smoke test if the planner judges the visual-UAT-only approach insufficient (would need user sign-off before adding tooling).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope
- `.planning/PROJECT.md` — v1.3 goal, constraints, out-of-scope list (FA v7 / Vue 3 / Bulma deferrals)
- `.planning/REQUIREMENTS.md` — UI-01 acceptance criteria
- `.planning/ROADMAP.md` §"Phase 3: Font Awesome v5 → v6 Upgrade" — success criteria

### Dependency analysis + rationale
- `.planning/notes/dependency-analysis-2026-04.md` — original v1.3 dep audit
- `.planning/seeds/v1.3-ui-refresh.md` — v1.3 seed (pre-rescoping baseline)

### Code reference points
- `src/renderer/main.js` — FA imports, `library.add()`, `Vue.component('font-awesome-icon', ...)` registration (lines 10–49). The single source of FA bootstrap in the app.
- `src/renderer/assets/style/main.scss` — Bulma SCSS (not in scope; noted so planner doesn't touch it)

### External docs (agent should verify current version at plan time)
- Font Awesome v5 → v6 upgrade guide (fontawesome.com/docs/web/setup/upgrade/upgrade-from-v5) — rename list, API changes
- `@fortawesome/vue-fontawesome` v2 changelog — 0.1.x → 2.x API differences (component registration, prop shapes)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/renderer/main.js:49` — the single global `Vue.component('font-awesome-icon', FontAwesomeIcon)` registration. All template usage relies on this one registration. Upgrade is centralized here — no component-level FA imports exist.

### Established Patterns
- **Kebab-case icon name strings in templates:** `:icon="['fas', 'external-link-alt']"`. The `fas` / `fab` prefix is preserved across v5 → v6 (both support `fas`/`fab`), so only the second array element changes for renamed icons.
- **Tree-shaken icon imports:** `main.js` imports each icon individually from `@fortawesome/free-solid-svg-icons`, so adding/removing icons changes bundle size directly. The v6 upgrade preserves this pattern.
- **Buefy uses MDI iconPack by default**, not FA. Buefy's `icon-left="camera"` / `icon-left="expand-arrows-alt"` usages are NOT affected by this phase's FA upgrade.

### Integration Points
- `src/renderer/views/Home.vue` — 4 FA call sites: `trash` (line 40), `folder` (43), `copy` (51), `external-link-alt` (54, RENAMED → `up-right-from-square`).
- `src/renderer/components/Settings.vue` — 3 FA call sites: `cog` (8, RENAMED → `gear`), `question-circle` (15, RENAMED → `circle-question`), `discord` (19, brand, no rename).
- `src/renderer/components/PromoCard.vue` — 1 FA call site: `external-link-alt` (21, RENAMED → `up-right-from-square`).
- `src/renderer/components/TitleBar.vue` — 1 FA call site: `arrow-down` (17, no rename).

### Potentially unused icons
- `faUserCog`, `faInfoCircle`, `faCamera` are in `main.js`'s `library.add(...)` but have no `:icon=` template hits. Could be dynamic usage this grep missed, or dead code. Planner should grep more thoroughly (template strings, computed icon names) before pruning.

</code_context>

<specifics>
## Specific Ideas

- Commit messages should be conventional: `chore(deps): ...` and `refactor(icons): ...` to match the repo's existing prefixes (see recent history: `docs(phase-02)`, `chore(deps)`).
- Manual UAT walkthrough is how the user verified v1.2 features; same approach is expected for Phase 3.

</specifics>

<deferred>
## Deferred Ideas

- **FA v7 + `vue-fontawesome` 3.x upgrade** — blocked on Vue 3; belongs in v2.0 milestone.
- **Playwright/visual-regression tooling** — out of proportion to Phase 3. Could be considered as a v2.0 migration aid during the Buefy replacement; not needed now.
- **`@fortawesome/free-regular-svg-icons` package** — no current design pattern uses outlined icons. Revisit if/when a component author needs an outlined variant.

</deferred>

---

*Phase: 03-font-awesome-v6-upgrade*
*Context gathered: 2026-04-21*
