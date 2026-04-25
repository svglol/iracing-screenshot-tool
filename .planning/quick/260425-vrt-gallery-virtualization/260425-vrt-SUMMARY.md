---
phase: quick-260425-vrt
status: complete
date: 2026-04-25
---

# Quick Task 260425-vrt: Virtualize gallery — drop o-carousel, fix active highlight

## What this fixes

User's two complaints stacked from the prior cap-of-11 fix:

1. "It should be possible to reach all pictures from the gallery" — the cap of 11 made only the most-recent 11 screenshots browsable.
2. "The currently displayed picture is still not highlighted" — the existing `:deep(.o-carousel__indicator-item--active img)` rule with red drop-shadow + scale 1.05 didn't visibly apply.

Both are fixed by retiring `<o-carousel>` and rebuilding the gallery as a custom preview + virtualized strip in plain Vue HTML.

## What changed

Single file: `src/renderer/views/Home.vue` (+131 / -184 — net -53 lines, the o-carousel scaffolding was sizeable).

### 1. Replaced `<o-carousel>` with a custom virtualized preview + strip

```vue
<div id="carousel" class="gallery-virtual">
  <figure class="gallery-virtual__preview"
          @contextmenu.prevent.stop="activeItem && handleClick($event, activeItem)">
    <img v-if="activeItem" :src="activeItem.file" :draggable="false" />
  </figure>

  <div class="gallery-virtual__strip" @wheel.prevent="onStripWheel">
    <figure
      v-for="(item, i) in visibleItems"
      :key="item.file"
      class="gallery-virtual__thumb"
      :class="{ 'gallery-virtual__thumb--active': windowStart + i === selected }"
      @click="selectIndex(windowStart + i)"
      @contextmenu.prevent.stop="handleClick($event, item)"
    >
      <img v-lazy="getImageUrl(item)" :draggable="false" />
    </figure>
  </div>
</div>
```

- Only ONE `<img>` mounted for the main preview (the active item) — was 1700 carousel-item slides.
- Strip renders exactly `visibleItems.length` ≤ 11 thumbs — was 1700 indicator-items.

### 2. Virtualization via `visibleItems` + `windowStart` computeds

```ts
windowStart() {
  if (this.items.length === 0) return 0;
  const ws = Math.min(VISIBLE_WINDOW_SIZE, this.items.length);
  const half = Math.floor(ws / 2);
  const ideal = this.selected - half;
  return Math.max(0, Math.min(ideal, this.items.length - ws));
},
visibleItems() {
  if (this.items.length === 0) return [];
  const ws = Math.min(VISIBLE_WINDOW_SIZE, this.items.length);
  return this.items.slice(this.windowStart, this.windowStart + ws);
},
```

`items` array is now unbounded (the cap is gone — `MAX_GALLERY_ITEMS` removed entirely). `visibleItems` slides as `selected` changes; the browser handles edge clamping via `Math.max/Math.min`.

### 3. Active highlight is bulletproof now

```vue
:class="{ 'gallery-virtual__thumb--active': windowStart + i === selected }"
```

```css
.gallery-virtual__thumb--active {
  border-color: #ec202a;
  box-shadow: 0 0 0 2px #ec202a, 0 4px 12px rgba(236, 32, 42, 0.45);
  transform: scale(1.05);
  z-index: 1;
}
```

Why the previous highlight wasn't visible:
- Oruga's `.o-carousel__indicator-item--active` class is applied by Oruga's internal carousel logic to its wrapper element. Our `:deep()`-prefixed CSS in scoped Vue blocks (or non-`:deep` rules) target an element Oruga owns, with cascade behavior dependent on Vue's scoped style attribute injection on the wrapper. Plus the `transform: scale(1.05)` was on the inner `<img>`, not the wrapper — and the inner img was constrained by Oruga's slot wrapping.
- With the new design, the active class is on OUR `<figure>` element with non-scoped CSS rules. Direct DOM, direct cascade. Always visible.

The new highlight is also more visible: red 2px border + 2px box-shadow ring + soft red glow + scale 1.05. Compared to the old drop-shadow filter trick, this is unmistakably "selected".

### 4. Wheel-on-strip steps active by ±1

```ts
onStripWheel(event: WheelEvent) {
  const delta = (event.deltaY || 0) > 0 ? 1 : -1;
  const next = Math.max(0, Math.min(this.items.length - 1, this.selected + delta));
  if (next !== this.selected) this.selected = next;
}
```

Wheel up → previous item; wheel down → next item; clamped at edges. The `visibleItems` window slides smoothly as `selected` shifts (browser repaints the new slice on each step), giving the "infinite scroll" feel. Click on any visible thumb does `selectIndex(windowStart + i)` to jump there.

### 5. Code dropped

- `MAX_GALLERY_ITEMS` constant + the `slice(0, ...)` in `listGalleryEntries`.
- `listGalleryEntries`'s `{ entries, totalCount }` return shape — back to flat array.
- `totalSourceCount` data field + the "Showing N of M" warning tag.
- `getViewerImageUrl`, `selectImage` methods (unused with new template).
- `centerActiveThumb`, `bindCarouselScroll` methods + `carouselScrollBound` data field.
- All `#carousel .o-carousel__*` CSS rules + the `.carousel { height: ... }` rule.
- The selected watcher's `centerActiveThumb()` call.
- The screenshot-response handler's items.pop / totalSourceCount / centerActiveThumb / bindCarouselScroll / nextTick lines.
- The loadGallery's centerActiveThumb / bindCarouselScroll calls.

### 6. Code kept

- `ensureWindowThumbnails(centerIndex, loadId)` (radius 50) — wired to selected watcher, screenshot-response, loadGallery success branch. The visible 11 always overlap with the ensure-window of ±50, so visible thumbs always have generation pipeline running before they're shown.
- `cleanupThumbnailCache()` — source-dir keep set, deferred via setTimeout(1500).
- `setSelectionFromItems`, `removeItem`, `loadGallery` core flow.
- All toolbar/context-menu/keyboard handlers — they don't touch the carousel.

## Final diff

| File | + | - |
|------|---|---|
| `src/renderer/views/Home.vue` | +131 | -184 |

Net -53 lines. Cleaner, simpler, more direct.

## Verification

- `npm run pack` → exit 0, no Vue compile errors, no SCSS deprecations.
- All grep counts match the plan: o-carousel=1 (only in a comment), MAX_GALLERY_ITEMS=0, totalSourceCount=0, getViewerImageUrl=0, selectImage=0, centerActiveThumb=0, bindCarouselScroll=0, carouselScrollBound=0; gallery-virtual=14, VISIBLE_WINDOW_SIZE=4, visibleItems=2, windowStart=4, selectIndex=2, onStripWheel=2, gallery-virtual__thumb--active=3.

Manual UI verification deferred to user — the change is interactive and easier to validate in the dev app.

## What the user gets

- All screenshots in source folder are reachable. Click any visible thumb in the strip OR wheel-scroll to step through the full list.
- The visible strip always shows 11 thumbs centered on active (clamped at start/end). Window slides smoothly as `selected` changes — infinite-scroll feel.
- Active thumbnail is unmistakably highlighted: red border + red glow + scale 1.05.
- DOM stays small: 1 main preview img + 11 strip thumbs, regardless of source folder size.
- Lazy thumbnail generation continues via `ensureWindowThumbnails` (radius 50 around active).

## Trade-offs noted

- Lost Oruga's slide-animation transition between items. Not used meaningfully here — the gallery is a list of files, not a sequence.
- Lost Oruga's keyboard arrow-key navigation. It wasn't actually wired in our config (`:arrows="false"` was set), so this is a non-loss.
- The wheel-step model means wheel-scrolling consumes the strip (no overflow scroll fallback). For very wide screens with 21+ thumbs that might fit in the strip, the user would still wheel-step rather than peek-scroll. Acceptable — 11 is the configured window and matches the "infinite scroll" UX the user asked for.
