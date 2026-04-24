---
phase: 260424-sbm-gallery-ux-polish
plan: 01
subsystem: renderer/gallery
tags: [carousel, oruga, ux, css, buefy-migration]
key-files:
  modified:
    - src/renderer/views/Home.vue
decisions:
  - Kept `.carousel { height: …; display: flex; flex-direction: column; max-width: …; }` rule — not dead (Oruga 0.13 renders `.o-carousel` on root but the `.carousel` class may still be applied by Bulma theme; cost of keeping is zero, cost of removing without runtime check is risk)
  - Used `#carousel .o-carousel__*` prefixes throughout (option a from plan) — simpler than a second `<style scoped>` block with `:deep()` indirection; id is unique to Home.vue's single carousel instance
metrics:
  completed: 2026-04-24
  commit: 0b57b20
---

# Phase 260424-sbm Plan 01: Gallery UX Polish Summary

One-liner: Replaced four dead Buefy-era CSS selector blocks with their Oruga 0.13 BEM equivalents, wired mouse-wheel-to-horizontal-scroll via `.o-carousel__indicators`, and flex-centered the preview image inside `.o-carousel__item`.

## What Changed

### Group A — SBM-01: Mouse-wheel scroll binding fixed

**`bindCarouselScroll()` (lines ~547–568):**
- Old: `document.querySelector('.carousel-indicator')` — silently returned `null` under Oruga 0.13 (class doesn't exist); early-return fired; wheel listener never attached.
- New: `carousel?.querySelector('.o-carousel__indicators')` — scoped through `#carousel` element; cast to `HTMLElement` so `.scrollLeft` assignment is TS-clean.

**`screenshot-response` handler scroll-reset (line ~367):**
- Old: `document.querySelector('.carousel-indicator')` — same silent null.
- New: `document.querySelector('#carousel .o-carousel__indicators') as HTMLElement | null` — correct class, cast for TS.

### Group B — SBM-02: Preview image vertically centered

Added new CSS rule to `<style>` block (scoped via `#carousel` prefix):
```css
#carousel .o-carousel__item {
  display: flex;
  align-items: center;
  justify-content: center;
}
```
No template markup changed. `object-fit: contain` on the `<img>` already handled aspect-ratio; this rule centers the img element within the item's available space.

### Group C — SBM-03: Gallery strip visual separation + Oruga 0.13 ported rules

Added four new `#carousel`-prefixed rule groups replacing the four dead Buefy-era blocks:

| New rule | Replaces dead block |
|---|---|
| `#carousel .o-carousel__indicators` | `.carousel .carousel-indicator.has-custom { overflow-x: scroll; … }` |
| `#carousel .o-carousel__indicator-item` | `.indicator-item { flex: 0 0 calc(100vh / 6) !important; … }` + `.indicator-item { padding-right: 0.5rem; }` (two separate blocks, both removed) |
| `#carousel .o-carousel__indicator-item--active img` | `.is-active img { filter: drop-shadow(…) … }` |
| `#carousel .o-carousel__indicator-item img:hover` | `.indicator-item img:hover { opacity: 0.8; }` |

Key additions in `#carousel .o-carousel__indicators`:
- `overflow-x: auto` — enables horizontal scroll (inherits global scrollbar styling from `main.scss:106-127` for free)
- `background-color: rgba(0, 0, 0, 0.45)` — noticeably darker than preview area's `rgba(0,0,0,0.2)`
- `border-top: 1px solid rgba(255, 255, 255, 0.08)` + `box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4)` — visual separation line + shadow
- `flex-wrap: nowrap` — keeps thumbnails on a single row so horizontal scroll engages

## Dead Buefy Blocks: Disposition

| Dead block | Lines (pre-edit) | Action |
|---|---|---|
| `.indicator-item { flex: 0 0 calc(100vh / 6) !important; margin-left/right }` | 598–602 | **DELETED** — replaced by `#carousel .o-carousel__indicator-item` |
| `.carousel .carousel-indicator.has-custom { overflow-x: scroll; … }` | 631–636 | **DELETED** — replaced by `#carousel .o-carousel__indicators` |
| `.indicator-item { padding-right: 0.5rem; }` | 638–640 | **DELETED** — merged into `#carousel .o-carousel__indicator-item` |
| `.is-active img { filter: drop-shadow(…) }` | 642–645 | **DELETED** — replaced by `#carousel .o-carousel__indicator-item--active img` |
| `.indicator-item img:hover { opacity: 0.8; }` | 647–649 | **DELETED** — replaced by `#carousel .o-carousel__indicator-item img:hover` |
| `.carousel { height: …; display: flex; … }` | 651–656 | **KEPT** — not a Buefy-era class; `.carousel` may still be applied by Oruga/Bulma theme; safe to keep per plan's "default to KEEP" instruction |

All 4 flagged dead Buefy blocks removed (the `.indicator-item` block was split across two locations — both deleted; total 5 rule-sets removed, 4 logical dead-block groups).

## Verification

- `npm run pack` — exit 0 (85 modules transformed, 8.91s). Pre-existing SASS deprecation warnings from `node_modules/bulma` and `main.scss` (`darken()`, `global-builtin`, `if-function`) — unchanged from prior runs, out of scope.
- No files modified outside `src/renderer/views/Home.vue`.
- Git status: only `Home.vue` staged; `.tmp-inspect/**` deletions, `ChangelogModal.vue`, `PromoCard.vue`, `Settings.vue`, `SettingsModal.vue`, `SideBar.vue`, `shims-vue.d.ts`, `Worker.vue`, `iracing-config-checks.ts`, `logger.ts`, and untracked `bot/docs/community-guide.md` — all untouched.

## Deviations from Plan

None — plan executed exactly as written. All three ask groups implemented. The `.carousel { … }` rule kept per plan's "default to KEEP" instruction.

## Commit

`0b57b20` — `refactor(ui): update Home.vue carousel styling to Oruga 0.13 classes + wire wheel-scroll + center preview`

## Self-Check

- [x] `src/renderer/views/Home.vue` modified and committed
- [x] Commit `0b57b20` exists on master
- [x] `bindCarouselScroll` queries `.o-carousel__indicators` via carousel-scoped `querySelector`
- [x] `screenshot-response` scroll-reset updated to `#carousel .o-carousel__indicators`
- [x] `#carousel .o-carousel__item { display: flex; align-items: center; justify-content: center; }` present
- [x] `#carousel .o-carousel__indicators` rule present with darker bg, border-top, box-shadow, overflow-x: auto, flex-wrap: nowrap
- [x] `#carousel .o-carousel__indicator-item` rule present with flex sizing + transparent button chrome reset
- [x] Active/hover rules ported to Oruga 0.13 class names
- [x] All 4 dead Buefy-era CSS block groups removed (5 rule-sets total)
- [x] `npm run pack` exits 0
- [x] No modifications to any file outside `src/renderer/views/Home.vue`

## Self-Check: PASSED
