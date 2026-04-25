---
phase: quick-260425-gw3
status: complete
date: 2026-04-25
---

# Quick Task 260425-gw3: Gallery thumbnail strip — windowed, centered, larger

## What changed

Reshaped the bottom thumbnail strip in `Home.vue` so:
- Exactly **11 thumbs** fit the visible strip viewport (any thumbs beyond that overflow horizontally for the rest).
- Each thumb is **larger**: sized via `flex: 0 0 calc((100vw - 240px) / 11 - 0.5rem)` (subtracting the 240px sidebar and the per-thumb margin) with the `<img>` constrained by `aspect-ratio: 16/9` instead of the previous fixed 70px height.
- The active thumbnail **centers** in the visible strip area on every selection change (carousel navigation, thumbnail click, post-screenshot, post-loadGallery).
- The browser **clamps** at start/end edges automatically — indices in the first or last 5 of the gallery anchor to the strip start/end edge with the active thumb appearing in the left/right half rather than dead center.
- The active thumbnail **highlight** is more prominent: kept the red drop-shadow border, added `transform: scale(1.05)` and a smooth `transition` on `transform` + `filter`.
- **Lazy-loading** preserved via the existing `v-lazy` directive — IntersectionObserver only fires for in-viewport elements, so off-strip thumbs don't request image data even though their `<img>` element exists in DOM.

## Why this approach over conditionally rendering 11 indicators

Three options were considered:

1. **Condition the indicator slot's content with `v-if="isInWindow(index)"`**: leaves Oruga's `.o-carousel__indicator-item` wrapper in DOM as an empty box, requires a `:has()` CSS hack to also hide the wrapper, and breaks the `--active` class flow if the active index is outside the conditional render. Brittle.

2. **Replace `<o-carousel>`'s indicators with a custom thumbnail strip outside the carousel**: re-implements active highlight, click-to-select, and scroll behavior. Most invasive.

3. **Keep Oruga rendering all indicators, size them so 11 fit the viewport, programmatically scroll the active into center via `scrollIntoView`**: chosen.

Why (3) wins:
- `scrollIntoView({ inline: 'center' })` does the centering math AND edge clamping in a single browser-native call. No manual scrollLeft computation, no off-by-one bugs near the edges.
- Integrates with the existing `scroll-behavior: smooth` on `.o-carousel__indicators` for a free animated slide.
- The existing `v-lazy` directive already provides lazy-loading via IntersectionObserver — invisible thumbs don't load image data, satisfying the "lazy-loaded" requirement without any new state machinery.
- Zero new computed properties, zero changes to Oruga's indicator slot structure, no `:has()` CSS quirks.

The user-visible effect is identical to a "render only 11" approach but with simpler, less brittle code and animated slide transitions for free.

## Implementation

**CSS (`<style>` block at file end):**
- Replaced `flex: 0 0 calc(100vh / 6)` with `flex: 0 0 calc((100vw - 240px) / 11 - 0.5rem)` and added `min-width: 90px` as a safety floor.
- Added an `img` rule under the indicator-item: `width: 100%; height: auto; max-height: none !important; aspect-ratio: 16/9; object-fit: cover; transition: transform 0.2s ease, filter 0.2s ease`. The `max-height: none !important` overrides the inline `style="max-height: 70px; height: 70px"` on the indicator template's `<img>` (the inline still appears in template — letting CSS win avoids a template diff that would have to coordinate with this commit).
- Added `transform: scale(1.05)` to the `--active img` rule.

**JS:**
- New method `centerActiveThumb()`: `$nextTick` → `querySelector('.o-carousel__indicator-item--active')` → `scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })`.
- Augmented the existing `selected` watcher to call `centerActiveThumb()` after the existing currentURL update.
- Replaced the explicit `indicator.scrollLeft = 0` in the screenshot-response handler with a `centerActiveThumb()` call (selected is already 0 just above, and `inline: 'center'` clamps to start for index 0).
- Added `centerActiveThumb()` to the post-`loadGallery` branch so the initial render also centers the strip.

## Final diff

| File | + | - |
|------|---|---|
| `src/renderer/views/Home.vue` | +42 | -10 |

Single file. No template changes. The inline `style="max-height: 70px; height: 70px"` on the indicator `<img>` stays — overridden by the CSS rule via `!important` so we don't need a template-and-CSS coordination.

## Verification

- `npm run pack` → exit 0, no new SCSS deprecations, no TS/Vue compile errors.
- `git grep -nc 'centerActiveThumb' src/renderer/views/Home.vue` → 4 (1 method definition + 3 call sites: selected watcher, screenshot-response handler, loadGallery success branch).
- `git grep -nc 'aspect-ratio: 16 / 9' src/renderer/views/Home.vue` → 1.
- `git grep -nc '(100vw - 240px) / 11' src/renderer/views/Home.vue` → 1.
- `git grep -nc "inline: 'center'" src/renderer/views/Home.vue` → 2 (one in code, one in comment).
- `git grep -nc 'indicator.scrollLeft = 0' src/renderer/views/Home.vue` → 0 (replaced with centerActiveThumb).

Manual UI verification deferred to user — sliding/clamping/highlight are interactive and easier to validate in the dev app than from a CLI.

## Notes

- `scrollIntoView` is supported in all Chromium versions Electron has shipped with for years; `inline` and `block` options have been stable since Chromium ≥77.
- `aspect-ratio` CSS property is supported in Chromium ≥88 — well within Electron's range.
- The wheel-to-scrollLeft binding (`bindCarouselScroll`) is preserved — useful when the strip overflows on smaller viewports, where wheel-scrolling can pan independently of selected-driven centering.
- The `min-width: 90px` floor guards against very narrow viewports where `(100vw - 240px) / 11` could go below ~80px and become unreadable.
