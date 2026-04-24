---
phase: 260424-sbm-gallery-ux-polish
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/renderer/views/Home.vue
autonomous: true
requirements:
  - SBM-01  # Fast-scroll affordance in the gallery indicator strip
  - SBM-02  # Vertically center the preview image inside its carousel item
  - SBM-03  # Visual separation between preview area and gallery strip

must_haves:
  truths:
    - "Mouse-wheel over the carousel area scrolls the gallery strip horizontally (wheel delta translates to scrollLeft on the indicator container)"
    - "The gallery strip is always visible and its horizontal scrollbar is styled to match the rest of the app"
    - "The preview image is vertically centered inside its carousel item, not top-anchored"
    - "The gallery strip has a darker background than the preview area and a visible separation (top border or subtle shadow)"
    - "Existing behavior preserved: clicking an indicator thumbnail still selects that image, selected thumbnail still shows the red drop-shadow, resize/context menu still work"
  artifacts:
    - path: "src/renderer/views/Home.vue"
      provides: "Corrected Oruga 0.13 class selectors + fixed mouse-wheel-to-horizontal-scroll wiring + centered preview + styled gallery strip"
      contains: "o-carousel__indicators"
  key_links:
    - from: "Home.vue `bindCarouselScroll`"
      to: "Oruga indicator container"
      via: "document.querySelector targeting `.o-carousel__indicators` (scoped through `#carousel`)"
      pattern: "o-carousel__indicators"
    - from: "Home.vue `<style>` block"
      to: "Oruga 0.13 carousel internals"
      via: "Oruga class names (`o-carousel__indicators`, `o-carousel__indicator-item`, `o-carousel__indicator-item--active`)"
      pattern: "o-carousel__indicator"
---

<objective>
Polish the Home.vue gallery UX per three user asks observed after the commit `0095043` carousel modernization:

1. Restore / properly wire the mouse-wheel → horizontal-scroll affordance on the gallery indicator strip (existing `bindCarouselScroll` targets the Buefy-era `.carousel-indicator` class which no longer exists under Oruga 0.13; selector must update to `.o-carousel__indicators`).
2. Vertically center the preview image inside its carousel item (currently top-anchors).
3. Give the gallery strip a clear visual separation from the preview area (darker bg, top border or shadow).

Purpose: The carousel modernization fixed the framework plumbing but surfaced UX regressions: mouse-wheel scroll of the thumb strip was silently dead, the preview image hugs the top of its column, and the thumb strip blends into the preview background. All three are cosmetic/interactive polish on a single component.

Output: A modified `src/renderer/views/Home.vue` with corrected Oruga 0.13 class selectors in both the mouse-wheel binding code and the component's `<style>` block, plus new styling rules for preview centering and gallery-strip separation.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@src/renderer/views/Home.vue
@src/renderer/assets/style/main.scss

<interfaces>
<!-- Key types + class names the executor needs. Extracted from Oruga 0.13 + the file itself. -->
<!-- Executor should use these directly — no codebase exploration needed. -->

### Oruga 0.13 carousel DOM structure (when `indicator-inside="false"` and using the singular `#indicator` slot)

```html
<div class="o-carousel"><!-- root -->
  <div class="o-carousel__wrapper">
    <div class="o-carousel__items">
      <div class="o-carousel__item" ...>…item body…</div>
      …
    </div>
  </div>
  <!-- outside wrapper because indicator-inside=false -->
  <div class="o-carousel__indicators" role="tablist">
    <button class="o-carousel__indicator-item" role="tab" ...>
      …singular `#indicator` slot content (our `<figure class="al image">`)…
    </button>
    …
  </div>
</div>
```

Active indicator gets an additional modifier class: `o-carousel__indicator-item--active`.

### Existing Home.vue `bindCarouselScroll` (lines 547-568) — BROKEN because it queries the Buefy-era class name

```ts
bindCarouselScroll() {
  if (this.carouselScrollBound) return;

  const indicator = document.querySelector('.carousel-indicator'); // ← this class doesn't exist in Oruga 0.13
  const carousel = document.getElementById('carousel');
  if (!indicator || !carousel) return; // silently no-ops today

  carousel.addEventListener(
    'wheel',
    (event) => {
      const delta = Math.max(-1, Math.min(1, -(event.deltaY || 0)));
      indicator.scrollLeft += delta * 400;
    },
    { passive: true }
  );

  this.carouselScrollBound = true;
}
```

### Existing Home.vue `<style>` block dead rules (lines 598-602, 631-640)

```css
/* Buefy-era class names — not rendered by Oruga 0.13 */
.indicator-item { flex: 0 0 calc(100vh / 6) !important; … }
.carousel .carousel-indicator.has-custom { overflow-x: scroll !important; … background-color: rgba(0,0,0,0.2); … }
.is-active img { filter: drop-shadow(…red…) … }
.indicator-item img:hover { opacity: 0.8; }
```

### Already-present global scrollbar styling (main.scss lines 75-127) — free win

```scss
::-webkit-scrollbar         { width: 8px !important; height: 8px !important; }
::-webkit-scrollbar-track   { background-color: rgba(0, 0, 0, 0.5) !important; }
::-webkit-scrollbar-thumb:horizontal { background-color: $primary; border-radius: 10px; }
::-webkit-scrollbar-thumb:horizontal:hover { background-color: darken($primary, 10%); }
```

These already apply globally — the Oruga indicator strip will inherit them automatically once `overflow-x: auto` is set on `.o-carousel__indicators` in the Home.vue style block. No main.scss changes needed.

### Current preview-image markup (lines 92-107)

```html
<o-carousel-item v-for="(item, i) in items" :key="i">
  <figure class="al image" :draggable="false">
    <img
      v-lazy="getViewerImageUrl(items[i], i)"
      :draggable="false"
      style="
        max-height: calc(100vh - 41px - 24px - 95px);
        object-fit: contain;
        padding: 1rem;
      "
      @contextmenu.prevent.stop="handleClick($event, items[i])"
    />
  </figure>
</o-carousel-item>
```

`object-fit: contain` preserves aspect-ratio but the image DOM node still renders top-anchored because its parent `.o-carousel__item` is a block box by default in Oruga 0.13. Center via flex on the item (or on `figure.al.image`).

### Style block scoping note

The current `<style>` on Home.vue is **NOT** `scoped`. To keep new rules from leaking into any other `<o-carousel>` that v2.1 might add later, either:
(a) Keep the block unscoped but prefix every new rule with `#carousel ` (the id is already on the element at line 85), or
(b) Add a second `<style scoped>` block alongside the unscoped one. Oruga internal classes get `[data-v-…]` attribute selectors on scoped blocks, so deep-targeting needs `:deep(.o-carousel__indicators)` — Vue 3 SFC pattern.

**Prefer option (a)** (`#carousel .o-carousel__indicators`) — simpler, no `:deep` indirection, and the id is uniquely scoped to Home.vue's single carousel instance. This is load-bearing for the plan.

</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Oruga 0.13 selectors, wire wheel-to-horizontal-scroll, center preview, style gallery strip</name>
  <files>src/renderer/views/Home.vue</files>
  <action>
Single edit pass on `src/renderer/views/Home.vue`. Three logical groups of changes, all isolated to this file:

**Group A — Fix the mouse-wheel scroll binding (SBM-01)**

In `bindCarouselScroll` (currently lines 547-568), change the indicator query from `.carousel-indicator` to `.o-carousel__indicators`, scoped through the `#carousel` element so it's unambiguous:

```ts
bindCarouselScroll() {
  if (this.carouselScrollBound) return;

  const carousel = document.getElementById('carousel');
  const indicator = carousel?.querySelector('.o-carousel__indicators');
  if (!indicator || !carousel) return;

  carousel.addEventListener(
    'wheel',
    (event) => {
      const delta = Math.max(-1, Math.min(1, -(event.deltaY || 0)));
      (indicator as HTMLElement).scrollLeft += delta * 400;
    },
    { passive: true }
  );

  this.carouselScrollBound = true;
}
```

Also update the one-liner reset in the `screenshot-response` handler (line 367) from `document.querySelector('.carousel-indicator')` to `document.querySelector('#carousel .o-carousel__indicators')` and cast to HTMLElement before assigning `scrollLeft` (keep behavior — resets the scroll position to 0 when a new screenshot is taken).

Rationale: Oruga 0.13's indicator container uses the class `o-carousel__indicators` (plural, BEM-style with double-underscore), NOT the Buefy-era `carousel-indicator`. The existing selector silently returns `null`, the early-return fires, and the listener is never attached — which is why the ask exists in the first place. Scoping through `#carousel` makes the selector robust if any future component mounts a second carousel. Cast to `HTMLElement` because `querySelector` returns `Element | null` and `.scrollLeft` is an `HTMLElement` property — this keeps TS/vue-tsc happy under the phase-12 relaxed profile and makes the intent explicit.

**Group B — Vertically center the preview image (SBM-02)**

In the `<style>` block (currently unscoped, lines 573-665), ADD the following rule. Do not change the template markup:

```css
#carousel .o-carousel__item {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

Optionally also drop the inline `padding: 1rem` from the `<img style="…">` (line 100) — centering works either way, and the current padding is fine. KEEP the padding (no risk, preserves the existing visual breathing room around the image).

Rationale: `object-fit: contain` on the `<img>` only affects internal aspect-ratio fitting of the image bitmap inside its own bounding box — it doesn't center the img element inside its container. The `.o-carousel__item` is a block box by default in Oruga 0.13, so the `<img>`'s bounding box sits at top-left of the item. Making the item a flex container with `align-items/justify-content: center` vertically (and horizontally) centers the figure/img inside the available item space. Scoped to `#carousel` so it only affects this one component's carousel.

**Group C — Visual separation for gallery strip (SBM-03) + restore the broken Buefy-era rules**

In the `<style>` block, REPLACE the two dead Buefy-era selector groups (lines 598-602 `.indicator-item`, and lines 631-649 `.carousel .carousel-indicator.has-custom` / `.indicator-item` / `.is-active img` / `.indicator-item img:hover`) with the Oruga 0.13 equivalents:

```css
/* Gallery strip container — always-visible horizontal scrollbar inherits
   the global styled scrollbar rules from main.scss (thumb = $primary,
   track = rgba(0,0,0,0.5)). Darker background + top border visually
   separates it from the preview area above. */
#carousel .o-carousel__indicators {
  overflow-x: auto;
  overflow-y: hidden;
  background-color: rgba(0, 0, 0, 0.45);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4);
  scroll-behavior: smooth;
  flex-wrap: nowrap;
  margin-top: auto;
}

/* Individual indicator thumbnails — fixed-width tiles, no wrap, small gap. */
#carousel .o-carousel__indicator-item {
  flex: 0 0 calc(100vh / 6);
  margin-left: 0.25rem;
  margin-right: 0.25rem;
  padding-right: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
}

/* Active indicator — keep the existing red drop-shadow styling. */
#carousel .o-carousel__indicator-item--active img {
  filter: drop-shadow(0 -2px 0 #ec202a) drop-shadow(0 2px 0 #ec202a)
    drop-shadow(-2px 0 0 #ec202a) drop-shadow(2px 0 0 #ec202a);
}

/* Hover affordance on inactive thumbnails. */
#carousel .o-carousel__indicator-item img:hover {
  opacity: 0.8;
}
```

DELETE the now-obsolete rules:
- `.indicator-item { flex: 0 0 calc(100vh / 6) !important; … }` (lines 598-602)
- `.carousel .carousel-indicator.has-custom { … }` (lines 631-636)
- `.indicator-item { padding-right: 0.5rem; }` (lines 638-640)
- `.is-active img { filter: … }` (lines 642-645)
- `.indicator-item img:hover { opacity: 0.8; }` (lines 647-649)

LEAVE the `.carousel { height: …; display: flex; flex-direction: column; max-width: …; }` rule at lines 651-656 alone — `.carousel` is a class we apply elsewhere (none right now, but the rule's max-width + flex-column on the Oruga root would still apply if Oruga ever renders `.carousel` as an alias). Actually: check once — if the rule is dead too (no matching node rendered by Oruga 0.13), delete it. If in doubt, KEEP it (cheap to leave; removing it needs a runtime check). Executor's call — default to KEEP.

Rationale:
- `overflow-x: auto` on `.o-carousel__indicators` makes the horizontal scrollbar appear when content overflows, and global scrollbar styling from main.scss automatically kicks in (height 8px, thumb = `$primary` red, track = translucent black) — free win per user's ask.
- `background-color: rgba(0, 0, 0, 0.45)` is noticeably darker than the preview area's near-transparent tint (lines 26-27 on the toolbar strip use `rgba(0, 0, 0, 0.2)`) — gives the gallery clear visual weight as a separate strip.
- `border-top: 1px solid rgba(255, 255, 255, 0.08)` + `box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4)` add a subtle inset/shadow pair — the strip feels "stuck to the bottom" of the preview area instead of floating.
- `flex-wrap: nowrap` + `flex: 0 0 calc(100vh / 6)` on the items keeps thumbnails on a single row (so horizontal scroll actually engages with many screenshots).
- `background: transparent; border: none;` on `.o-carousel__indicator-item` strips any default `<button>` chrome Oruga may render (role=tab is typically a button element).
- Active/hover rules are the verbatim port of the Buefy-era rules — no visual regression for the red selection highlight that Phase 8 researched and D-08-X3 established for the migration.

**Safety:** The existing `<style>` block is NOT `<style scoped>`. Keep it unscoped. All new rules MUST be prefixed with `#carousel ` so they only apply to this component's carousel. This satisfies the user's "scope to Home.vue's carousel" constraint.
  </action>
  <verify>
    <automated>npm run pack</automated>
  </verify>
  <done>
- `npm run pack` exits 0 (Vite-based renderer build passes).
- `bindCarouselScroll` uses `#carousel .o-carousel__indicators` selector (via carousel-scoped query) and the wheel listener attaches (verified by the early-return no longer firing when the gallery has items — the executor can trace via adding one `console.log('[carousel] wheel bound')` at the end of the if-block and removing it once confirmed in dev).
- `<style>` block contains three new Oruga-0.13-namespaced rule groups: `.o-carousel__item` flex centering, `.o-carousel__indicators` darker bg + border-top + shadow + overflow-x, `.o-carousel__indicator-item` sizing + active/hover variants.
- Dead Buefy-era rules (`.carousel-indicator.has-custom`, `.indicator-item`, `.is-active img`, `.indicator-item img:hover`) removed.
- No changes to any file outside `src/renderer/views/Home.vue`.
  </done>
</task>

</tasks>

<verification>
Sole automated gate: `npm run pack` exit 0 (this exercises the Vite renderer build, which will surface any SCSS syntax errors, TS errors in the Options API body, or template compile errors).

User-side runtime verification (not part of the automated gate — user is reloading the dev build themselves per the scope note):
1. Launch dev build, wait for gallery to populate.
2. Mouse-wheel over the preview/gallery area → gallery strip scrolls horizontally.
3. Preview image sits vertically centered (not flush to top) in its column.
4. Gallery strip visibly darker than the preview, with a top-edge border / subtle shadow making it feel like a separate panel.
5. Horizontal scrollbar appears on the strip when >~6-8 screenshots are present, styled in red (thumb) + translucent black (track) matching the rest of the app.
6. Clicking an indicator still selects that image (no regression on the existing `selectImage` + `selected` watch sync added in `0095043`).
</verification>

<success_criteria>
- [ ] Home.vue `bindCarouselScroll` queries `.o-carousel__indicators` (via carousel-scoped `querySelector`), not `.carousel-indicator`
- [ ] Screenshot-response handler's scroll-reset query also updated to the Oruga 0.13 class name
- [ ] `#carousel .o-carousel__item { display: flex; align-items: center; justify-content: center; }` present in Home.vue `<style>`
- [ ] `#carousel .o-carousel__indicators` rule present with darker `background-color`, `border-top`, `box-shadow`, `overflow-x: auto`, `flex-wrap: nowrap`
- [ ] `#carousel .o-carousel__indicator-item` rule present with `flex: 0 0 calc(100vh / 6)` + transparent button chrome reset
- [ ] Active-indicator red drop-shadow + hover opacity rules ported to `--active` modifier + `.o-carousel__indicator-item img:hover`
- [ ] All four dead Buefy-era CSS blocks removed
- [ ] `npm run pack` exits 0
- [ ] No modifications to files other than `src/renderer/views/Home.vue`
- [ ] Git status clean on all other previously-unstaged files (session carry-forward preserved: `.tmp-inspect/**` deletions, `ChangelogModal.vue`, `PromoCard.vue`, `Settings.vue`, `SettingsModal.vue`, `SideBar.vue`, `shims-vue.d.ts`, `Worker.vue`, `iracing-config-checks.ts`, `logger.ts`, untracked `bot/docs/community-guide.md` — none touched by this plan)
</success_criteria>

<commit>
Single commit when the task is done:

```
refactor(ui): update Home.vue carousel styling to Oruga 0.13 classes + wire wheel-scroll + center preview
```

Body (optional — include if executor wants a short why):
```
Commit 0095043 modernized the carousel props but left Home.vue's <style>
block and bindCarouselScroll() targeting the Buefy-era `.carousel-indicator`
/ `.indicator-item` class names which Oruga 0.13 does not render. As a
result mouse-wheel-to-horizontal-scroll was silently dead, the preview image
hugged the top of its column, and the gallery strip had no visual separation
from the preview area. This replaces the dead rules with their Oruga 0.13
equivalents (`o-carousel__indicators`, `o-carousel__indicator-item`,
`o-carousel__indicator-item--active`), flex-centers `.o-carousel__item` so
preview images sit vertically centered, and darkens the gallery strip bg
plus adds a top-edge border and shadow for clear visual separation.

Global scrollbar styling (main.scss:106-127) applies automatically once
overflow-x:auto is set on the indicator container — no main.scss edits.
```

NO `Co-Authored-By:` line per user preference.

Explicit `git add src/renderer/views/Home.vue` (file-scoped add — do NOT `git add -A` or `git add .` since the working tree carries 10 unrelated unstaged paths per `gitStatus` that are intentionally held back).
</commit>

<output>
After completion, create `.planning/quick/260424-sbm-gallery-ux-polish-fast-scroll-vertically/260424-sbm-SUMMARY.md` with:
- What changed (bulleted diff of the 3 groups)
- What was verified (`npm run pack` result + any visual observations the user relays)
- Any deviations from plan (e.g., if `.carousel {…}` at lines 651-656 was also deleted)
- Commit SHA
</output>
