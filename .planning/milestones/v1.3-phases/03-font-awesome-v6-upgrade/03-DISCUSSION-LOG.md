# Phase 3: Font Awesome v5 → v6 Upgrade - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 03-font-awesome-v6-upgrade
**Areas discussed:** Phase scope (rescoping), Icon rename handling, Icon style scope, Upgrade commit granularity, Visual verification approach

---

## Phase Scope (rescoping — not a gray area, but a blocking constraint surfaced during codebase scout)

Before gray-area discussion could begin, the codebase scout surfaced two Vue-2 ceilings that made the original v1.3 scope unreachable:

1. FA v7 requires `@fortawesome/vue-fontawesome@3.x` which requires Vue 3.
2. Bulma 1.0 switched to CSS-variable theming; Buefy 0.9.29 is tied to Bulma 0.9's SASS API and has no Vue 3 version.

The user was asked to choose between:

| Option | Description | Selected |
|--------|-------------|----------|
| Retarget: FA v5 → v6 only, defer Bulma 1.0 to v2.0 | Honest Vue-2 scope. UI-02 moves to v2.0 with Buefy replacement. | ✓ |
| Keep Bulma 1.0 scope, spike Buefy risk first | Time-box a spike before committing. | |
| CSS-only Bulma 1.0 (no SASS customization) | Drop custom $primary/findColorInvert layer; use 1.0 CSS vars only. | |
| Leave it up to Claude | Claude picks. | |

**User's choice:** Retarget: FA v5 → v6 only, defer Bulma 1.0 to v2.0
**Notes:** Drove the rescoping commit `e09563c` which dropped UI-02 to v2.0 and retargeted UI-01 to FA v6.

---

## Area Selection

User selected all 4 proposed gray areas:
- Icon rename handling
- Icon style scope
- Upgrade commit granularity
- Visual verification approach

---

## Icon rename handling

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt v6 names directly (Recommended) | Update main.js imports AND every `:icon="['fas','...']"` usage to v6 kebab-case. ~15-20 call sites. Clean, forward-compatible. | ✓ |
| Use FA's v5 compat shims | `/shims` package keeps v5 names working. Zero component-file changes but leaves v5 legacy. | |
| Hybrid: v6 names in main.js, shims for templates | Middle ground. | |

**User's choice:** Adopt v6 names directly
**Notes:** 5 of 11 registered icons were renamed in v6 — user-cog, info-circle, cog, external-link-alt, question-circle. Direct adoption avoids shim tech debt that would need to be unwound before v2.0 / FA v7 anyway.

---

## Icon style scope

| Option | Description | Selected |
|--------|-------------|----------|
| Stay with solid + brands only (Recommended) | Current UI uses only solid glyphs + Discord brand. Keeps scope tight. | ✓ |
| Add free-regular package proactively | Adds `@fortawesome/free-regular-svg-icons` for future component authors. ~0 bundle cost if no icons imported. | |

**User's choice:** Stay with solid + brands only
**Notes:** No outlined-icon design pattern exists in the UI. Adding `free-regular` opens the door to inconsistency without a clear need.

---

## Upgrade commit granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Split into 2 commits (Recommended) | Commit 1: package bumps + main.js rename. Commit 2: component-file `:icon` renames. Bisect-friendly. | ✓ |
| Single bundled commit | All changes in one commit. Simplest PR, loses bisect granularity. | |
| 3 commits (bumps / API migration / renames) | Extra granularity — separate vue-fontawesome 0.1→2 API migration from core bumps. Overkill. | |

**User's choice:** Split into 2 commits
**Notes:** Bisect-friendly. If a regression appears, commit 2 (template-only renames) is the lowest-risk revert target.

---

## Visual verification approach

| Option | Description | Selected |
|--------|-------------|----------|
| Manual UAT across 4 views (Recommended) | Walk Home.vue, Settings.vue, TitleBar.vue, PromoCard.vue; confirm each of 11 icon sites. Bundle size via webpack stats. | ✓ |
| Manual UAT + lightweight DOM smoke test | Adds a jest-environment-jsdom test mounting key components and asserting FontAwesomeIcon renders expected names. CI-catchable. | |
| Add Playwright visual-regression | Adds playwright + visual-regression. Overkill for 11 icons but preps for v2.0. | |

**User's choice:** Manual UAT across 4 views
**Notes:** Proportionate to Phase 3's small surface area. No new tooling infrastructure.

---

## Claude's Discretion

- Exact mapping of plan(s) to commits (one plan producing both commits, or two plans).
- Whether to include an ESLint pass in commit 2 or as a separate commit.
- How to structure a lightweight pre-merge smoke test if the planner judges manual UAT alone insufficient (requires user sign-off before adding tooling).

## Deferred Ideas

- **FA v7 + vue-fontawesome 3.x upgrade** — blocked on Vue 3; belongs in v2.0.
- **Playwright / visual-regression tooling** — potential v2.0 aid during Buefy replacement; not now.
- **`@fortawesome/free-regular-svg-icons` package** — revisit if/when an outlined-icon design pattern emerges.
- **Pruning unused icons** (faUserCog, faInfoCircle, faCamera appear to have no template usage) — planner to decide whether to prune or preserve during Phase 3.
