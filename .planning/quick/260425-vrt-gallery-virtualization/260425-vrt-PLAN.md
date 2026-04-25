---
phase: quick-260425-vrt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/renderer/views/Home.vue
autonomous: true
requirements:
  - VRT-UI-01  # All screenshots in the source folder are reachable from the gallery (no hard cap)
  - VRT-UI-02  # Only ~11 carousel/strip child elements ever exist in the DOM at any time (window centered on active, clamped at start/end)
  - VRT-UI-03  # Active thumbnail in the strip is visibly highlighted via an explicit class binding (red border + glow + scale 1.05)
  - VRT-UI-04  # Wheel-scrolling on the strip steps the active selection (infinite-scroll feel)
  - VRT-UI-05  # Lazy thumbnail generation continues via the existing ensureWindowThumbnails machinery (radius 50 around active)
must_haves:
  truths:
    - "Open a folder with 1700 8K screenshots: items array contains all 1700 entries, but the DOM contains EXACTLY 1 main preview image + 11 strip thumbnails (regardless of source count)."
    - "Wheel up/down on the strip steps `selected` by ±1, clamped at [0, items.length - 1]. The visible window slides to keep the active centered (with edge clamping)."
    - "Click any thumbnail in the strip: that absolute index becomes selected, the window recomputes, the main preview swaps to that file."
    - "The active thumbnail carries an explicit `gallery-virtual__thumb--active` class. CSS targets that class directly with `border-color: #ec202a; box-shadow: 0 0 0 2px #ec202a, 0 4px 12px rgba(236,32,42,0.45); transform: scale(1.05);` — guaranteed visible regardless of Oruga internals."
    - "ensureWindowThumbnails continues to generate thumbnails in a ±50 window around active; the visible 11 always overlap with that window."
    - "`npm run pack` exits 0 with no Vue compile errors."
  artifacts:
    - path: "src/renderer/views/Home.vue"
      provides: "Removes `<o-carousel>` and the indicator slot template entirely. Adds a custom `<figure class='gallery-virtual__preview'>` for the active item plus `<div class='gallery-virtual__strip'>` containing 11 `<figure class='gallery-virtual__thumb'>` thumbs from a `visibleItems` computed. Active thumb gets `gallery-virtual__thumb--active` via explicit class binding `(windowStart + i) === selected`. Drops MAX_GALLERY_ITEMS, listGalleryEntries' return reshape, totalSourceCount, the truncation tag, `getViewerImageUrl`, `selectImage`, `centerActiveThumb`, `bindCarouselScroll`, `carouselScrollBound`. Adds `VISIBLE_WINDOW_SIZE = 11`, `visibleItems` and `windowStart` computeds, `selectIndex(absIdx)` and `onStripWheel(event)` methods. Replaces all `#carousel .o-carousel__*` CSS with `.gallery-virtual*` rules."
      contains: "gallery-virtual__thumb--active"
  key_links:
    - from: "visibleItems = items.slice(windowStart, windowStart + 11)"
      to: "v-for over visibleItems renders only 11 strip thumbs"
      via: "Vue reactivity: items / selected dependencies trigger window recomputation"
      pattern: "visibleItems"
    - from: ":class=\"{ 'gallery-virtual__thumb--active': (windowStart + i) === selected }\""
      to: "Active thumb gets the highlight class at the right element"
      via: "Explicit binding — no reliance on Oruga's --active class"
      pattern: "gallery-virtual__thumb--active"
---

<objective>
Two coupled fixes:

1. **Reachability + virtualization**: previous task `260425-cap` capped `items.length` at 11 to make the gallery render properly, but that prevents browsing screenshots beyond the most-recent 11. The user wants ALL screenshots reachable while still keeping the rendered set small ("infinite scroll feel"). Solution: drop the cap, add a `visibleItems` window computed (slice of size 11 around `selected`, clamped at edges), and have the v-for iterate `visibleItems` instead of `items`. Items in the array stay unbounded; DOM stays bounded.

2. **Active highlight not visible**: user reports the existing `:deep(.o-carousel__indicator-item--active img)` rule with red drop-shadow + scale 1.05 doesn't visibly apply. Likely cause: with the cap=11 and the strip overflowing only when items > 11, the `--active` class targeting via `:deep()` from a parent scoped style doesn't propagate cleanly across Oruga's internal slot wrapping. Solution: replace `<o-carousel>` with a custom preview + strip; the active class becomes a Vue-explicit binding (`gallery-virtual__thumb--active`) on OUR element with non-`:deep` CSS rules — guaranteed to apply.

The cleanest path is to retire `<o-carousel>` entirely. We were already disabling its arrow keys, autoplay, and drag features (`:arrows="false" :autoplay="false" :dragable="false"`). The only Oruga features in use were the slide animation between carousel-items and the indicator slot iteration — both replaceable with a one-img preview + a 11-slot strip. Custom code gives full control over virtualization, lifecycle, and styling.

Output: edits to `src/renderer/views/Home.vue` only.
</objective>

<context>
@src/renderer/views/Home.vue

<existing_state>
- `<o-carousel id="carousel" v-model="selected">` with `<o-carousel-item v-for="(item, i) in items">` renders 1 carousel-item per item.
- `<template #indicator="props">` renders an indicator slot per item — Oruga creates a `.o-carousel__indicator-item` wrapper for each.
- After the 260425-cap fix, `items.length` is capped at MAX_GALLERY_ITEMS = 11. So 11 carousel-items + 11 indicator-items total. But the user can't reach the 12th-most-recent screenshot.
- `centerActiveThumb()` calls `scrollIntoView({ inline: 'center' })` on the active indicator — but with cap=11 the strip never overflows, so this is a no-op.
- `bindCarouselScroll()` wires wheel events to scrollLeft of the indicator container — also irrelevant when nothing overflows.
- Active highlight: `#carousel .o-carousel__indicator-item--active img { filter: drop-shadow(...); transform: scale(1.05); }` — but the user reports it's not visible.
</existing_state>

<replacement_design>
Custom Vue HTML, no Oruga carousel:

```vue
<div id="carousel" class="gallery-virtual">
  <figure
    class="gallery-virtual__preview"
    :draggable="false"
    @contextmenu.prevent.stop="activeItem && handleClick($event, activeItem)"
  >
    <img
      v-if="activeItem"
      :src="activeItem.file"
      :draggable="false"
    />
  </figure>

  <div class="gallery-virtual__strip" @wheel.prevent="onStripWheel">
    <figure
      v-for="(item, i) in visibleItems"
      :key="item.file"
      class="gallery-virtual__thumb"
      :class="{ 'gallery-virtual__thumb--active': (windowStart + i) === selected }"
      :draggable="false"
      @click="selectIndex(windowStart + i)"
      @contextmenu.prevent.stop="handleClick($event, item)"
    >
      <img v-lazy="getImageUrl(item)" :draggable="false" />
    </figure>
  </div>
</div>
```

Key wins vs `<o-carousel>`:
- Only one `<img>` mounted for the main preview (active). Was 1700 carousel-item slides with v-lazy on each.
- Strip renders exactly `visibleItems.length` (≤ 11) thumbs. Was 1700 indicator-items (DOM-only) at peak.
- Active highlight is OUR class on OUR element — direct CSS targeting, no `:deep()` indirection.

Trade-offs:
- Lose Oruga's slide-animation transition between items. For a screenshot gallery this is unimportant (often confusing — these aren't a sequence, they're a list of files).
- Lose Oruga's keyboard arrow-key handling (it never bound here anyway since `:arrows="false"`).
- Wheel-scroll behavior changes: was scrollLeft of overflowing strip; now steps `selected` by ±1. Better UX for infinite-scroll feel — strip slides as the user wheels, browser-clamped at edges.
</replacement_design>

<lazy_thumbnail_generation>
The `ensureWindowThumbnails(centerIndex, loadId)` machinery from 260425-lzg stays. It generates thumbnails for items in [centerIndex − 50, centerIndex + 50] and is called from the `selected` watcher, the screenshot-response handler, and the post-loadGallery branch.

With the new virtualized strip (window=11), the visible thumbnail set is always a subset of the ensure-window (radius=50), so visible thumbs always have their generation pipeline running before they're shown. As the user wheels through the strip, the ensure-window slides with them.
</lazy_thumbnail_generation>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Drop cap + reshape; add VISIBLE_WINDOW_SIZE</name>
  <files>src/renderer/views/Home.vue</files>
  <behavior>
    `MAX_GALLERY_ITEMS` removed entirely. `VISIBLE_WINDOW_SIZE = 11` added. `listGalleryEntries` returns a flat array (no `{ entries, totalCount }` shape, no slice). `cleanupThumbnailCache`'s comment block updated to drop the cap mention.
  </behavior>
  <action>
    1. Replace the existing `MAX_GALLERY_ITEMS` const declaration + its comment block with:
       ```ts
       // Window of items rendered in the bottom thumbnail strip. The full items
       // array is unbounded — virtualization slices a window of this size around
       // the active selection so the DOM stays small while all items remain
       // reachable via wheel/click navigation.
       const VISIBLE_WINDOW_SIZE = 11;
       ```

    2. In `listGalleryEntries`, change the error path return from `{ entries: [], totalCount: 0 }` to `[]`. Change the success path from
       ```ts
       const sorted = entries.filter(...).sort(...);
       return { entries: sorted.slice(0, MAX_GALLERY_ITEMS), totalCount: sorted.length };
       ```
       to:
       ```ts
       return entries
         .filter(Boolean)
         .filter((entry) => entry.extension === '.png')
         .sort((a, b) => b.modified - a.modified);
       ```

    3. Update the comment in `cleanupThumbnailCache` to remove the MAX_GALLERY_ITEMS mention. New comment:
       ```ts
       // Build the keep set from ALL source PNGs in the screenshot folder.
       // The cache is decoupled from the visible window — thumbs for items that
       // happen to be outside the current strip window are still valid and
       // useful as the user navigates.
       ```
  </action>
  <verify>
    `git grep -nc 'MAX_GALLERY_ITEMS' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'VISIBLE_WINDOW_SIZE' src/renderer/views/Home.vue` ≥ 1.
    `git grep -nc 'totalCount' src/renderer/views/Home.vue` → 0 (returned shape no longer used).
  </verify>
  <done>
    Cap removed; window-size constant added; listGalleryEntries returns flat array.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Replace o-carousel template + drop truncation tag</name>
  <files>src/renderer/views/Home.vue</files>
  <behavior>
    The `<o-carousel id="carousel">` block (with carousel-items v-for and indicator slot) is replaced with a `<div id="carousel" class="gallery-virtual">` containing a `<figure class="gallery-virtual__preview">` for the active item and a `<div class="gallery-virtual__strip">` with the 11 visible thumbs. The "Showing N of M" warning tag is removed.
  </behavior>
  <action>
    1. In the header strip, remove the entire `<o-tag v-if="totalSourceCount > items.length" ...>...</o-tag>` block.

    2. Replace the entire `<o-carousel id="carousel" ...>...</o-carousel>` block (currently lines ~91-132) with the custom HTML from the replacement_design section above.
  </action>
  <verify>
    `git grep -nc '<o-carousel' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'gallery-virtual' src/renderer/views/Home.vue` ≥ 6 (template uses + CSS).
    `git grep -nc 'totalSourceCount' src/renderer/views/Home.vue` → 0 (template tag removed; data field removed in Task 3).
  </verify>
  <done>
    o-carousel + indicator slot gone; custom preview + strip in place; truncation tag gone.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: data() / computed / methods restructure</name>
  <files>src/renderer/views/Home.vue</files>
  <behavior>
    `data()` drops `carouselScrollBound` and `totalSourceCount`. New computeds: `activeItem`, `visibleItems`, `windowStart`. New methods: `selectIndex(absIdx)`, `onStripWheel(event)`. Removed methods: `getViewerImageUrl`, `selectImage`, `centerActiveThumb`, `bindCarouselScroll`. The `selected` watcher drops the `centerActiveThumb` call. screenshot-response handler drops items.pop / totalSourceCount lines and the centerActiveThumb / bindCarouselScroll calls. removeItem drops the totalSourceCount line. setSelectionFromItems unchanged. loadGallery changes: use flat array (drop destructure), drop totalSourceCount assignment, drop centerActiveThumb / bindCarouselScroll calls.
  </behavior>
  <action>
    1. In `data()` return: remove `carouselScrollBound: false,` and `totalSourceCount: 0,`.

    2. After `data()`, add a `computed:` block (or merge into existing if present):
       ```ts
       computed: {
         activeItem(): any | null {
           return this.items[this.selected] || null;
         },
         windowStart(): number {
           if (this.items.length === 0) return 0;
           const ws = Math.min(VISIBLE_WINDOW_SIZE, this.items.length);
           const half = Math.floor(ws / 2);
           const ideal = this.selected - half;
           return Math.max(0, Math.min(ideal, this.items.length - ws));
         },
         visibleItems(): any[] {
           if (this.items.length === 0) return [];
           const ws = Math.min(VISIBLE_WINDOW_SIZE, this.items.length);
           return this.items.slice(this.windowStart, this.windowStart + ws);
         },
       },
       ```

    3. In `selected(newIndex: number)` watcher, remove the `this.centerActiveThumb();` line.

    4. In the screenshot-response handler:
       - Remove the `if (this.items.length > MAX_GALLERY_ITEMS) { this.items.pop(); }` block + comment.
       - Remove `this.totalSourceCount += 1;`.
       - Remove `this.$nextTick(() => { this.bindCarouselScroll(); });` block.
       - Remove `this.centerActiveThumb();`.
       (Keep: items.unshift, copyImageToClipboard, this.selected = 0, this.currentURL = …, void this.ensureWindowThumbnails(0, this.galleryLoadId).)

    5. In `methods:`:
       - REMOVE `getViewerImageUrl(item, index) { ... }`.
       - REMOVE `selectImage(item) { ... }`.
       - REMOVE `centerActiveThumb() { ... }` and `bindCarouselScroll() { ... }`.
       - ADD:
         ```ts
         selectIndex(absIdx: number) {
           if (absIdx < 0 || absIdx >= this.items.length) return;
           this.selected = absIdx;
         },
         onStripWheel(event: WheelEvent) {
           const delta = (event.deltaY || 0) > 0 ? 1 : -1;
           const next = Math.max(
             0,
             Math.min(this.items.length - 1, this.selected + delta)
           );
           if (next !== this.selected) {
             this.selected = next;
           }
         },
         ```

    6. In `removeItem`: remove `this.totalSourceCount = Math.max(0, this.totalSourceCount - 1);`.

    7. In `loadGallery`:
       - Change `const { entries: rawEntries, totalCount } = await listGalleryEntries(); const entries = rawEntries.map(...)` to `const entries = (await listGalleryEntries()).map(...)`.
       - Remove `this.totalSourceCount = totalCount;`.
       - Remove `this.$nextTick(() => this.bindCarouselScroll());`.
       - Remove `this.centerActiveThumb();`.
       (Keep: ensureWindowThumbnails call, deferred cleanup.)
  </action>
  <verify>
    `git grep -nc 'getViewerImageUrl' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'selectImage' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'centerActiveThumb' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'bindCarouselScroll' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'carouselScrollBound' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'totalSourceCount' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'selectIndex' src/renderer/views/Home.vue` ≥ 2 (declaration + template usage).
    `git grep -nc 'onStripWheel' src/renderer/views/Home.vue` ≥ 2.
    `git grep -nc 'visibleItems' src/renderer/views/Home.vue` ≥ 2.
    `git grep -nc 'windowStart' src/renderer/views/Home.vue` ≥ 3.
  </verify>
  <done>
    Old methods removed; new computeds + methods added; watchers + lifecycle handlers cleaned up.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: CSS — replace o-carousel rules with .gallery-virtual</name>
  <files>src/renderer/views/Home.vue</files>
  <behavior>
    Drop all `#carousel .o-carousel__*` rules. Drop `.carousel { height: ... }`. Add `.gallery-virtual` (column flex container with the height calc), `.gallery-virtual__preview` (flex 1, centered img), `.gallery-virtual__strip` (row flex, dark bg, top border + glow from prior strip), `.gallery-virtual__thumb` (flex 1 1 0, transparent border + transition for highlight transitions, hover affordance), `.gallery-virtual__thumb img` (aspect-ratio 16/9), `.gallery-virtual__thumb--active` (red border + glow + scale 1.05).
  </behavior>
  <action>
    Replace the CSS block from `/* SBM-02: Vertically (and horizontally) center ... */` through `.carousel { height: ... }` (currently lines ~710-773) with:

    ```css
    .gallery-virtual {
      height: calc(100vh - 41px - 27px);
      display: flex;
      flex-direction: column;
      max-width: calc(100vw - 240px);
      overflow: hidden;
    }

    .gallery-virtual__preview {
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      overflow: hidden;
      margin: 0;
    }

    .gallery-virtual__preview img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .gallery-virtual__strip {
      flex: 0 0 auto;
      display: flex;
      flex-direction: row;
      gap: 0.25rem;
      padding: 0.4rem;
      background-color: rgba(0, 0, 0, 0.45);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4);
      margin-top: auto;
    }

    .gallery-virtual__thumb {
      flex: 1 1 0;
      min-width: 0;
      margin: 0;
      background: transparent;
      border: 2px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      overflow: hidden;
      transition: transform 0.18s ease, border-color 0.18s ease,
        box-shadow 0.18s ease;
    }

    .gallery-virtual__thumb img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      transition: filter 0.18s ease;
    }

    .gallery-virtual__thumb:hover img {
      opacity: 0.85;
    }

    .gallery-virtual__thumb--active {
      border-color: #ec202a;
      box-shadow: 0 0 0 2px #ec202a, 0 4px 12px rgba(236, 32, 42, 0.45);
      transform: scale(1.05);
      z-index: 1;
    }

    .gallery-virtual__thumb--active img {
      filter: brightness(1.08);
    }
    ```
  </action>
  <verify>
    `git grep -nc 'o-carousel__' src/renderer/views/Home.vue` → 0.
    `git grep -nc '.gallery-virtual' src/renderer/views/Home.vue` ≥ 6.
    `git grep -nc 'gallery-virtual__thumb--active' src/renderer/views/Home.vue` ≥ 2.
    <automated>npm run pack</automated>
    Expected: exit 0, no Vue compile errors, no SCSS deprecations.
  </verify>
  <done>
    o-carousel rules removed; gallery-virtual rules added; build clean.
  </done>
</task>

</tasks>

<verification>
1. `npm run pack` exits 0.
2. `git diff --stat` shows ONLY `src/renderer/views/Home.vue` modified.
3. `git grep -nc 'o-carousel\|MAX_GALLERY_ITEMS\|totalSourceCount\|getViewerImageUrl\|selectImage\|centerActiveThumb\|bindCarouselScroll\|carouselScrollBound' src/renderer/views/Home.vue` → 0.
4. `git grep -nc 'gallery-virtual\|VISIBLE_WINDOW_SIZE\|visibleItems\|windowStart\|selectIndex\|onStripWheel' src/renderer/views/Home.vue` ≥ 12.
</verification>

<success_criteria>
- All items in source folder reachable via wheel/click in the gallery (no cap).
- DOM contains exactly 1 main preview img + 11 strip thumbs at any time.
- Active thumb is visibly highlighted (red border + glow + scale).
- Wheel on strip steps active by ±1 with edge clamping.
- Build clean, single-file diff.
- Commit prefixed `feat(ui):`, no Co-Authored-By.
</success_criteria>

<output>
After completion, create `.planning/quick/260425-vrt-gallery-virtualization/260425-vrt-SUMMARY.md` capturing:
- Why o-carousel was retired (we used 2 of its features — slide and indicator-iteration — both replaceable; lacked the virtualization we needed).
- Why active highlight likely wasn't visible before (Oruga internals + scoped/non-scoped CSS interplay) and why explicit class binding fixes it.
- The wheel-as-step UX choice for the strip.
- Final diff shape and commit SHA.
</output>
