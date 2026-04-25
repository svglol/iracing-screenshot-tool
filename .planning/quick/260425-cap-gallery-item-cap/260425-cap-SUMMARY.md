---
phase: quick-260425-cap
status: complete
date: 2026-04-25
---

# Quick Task 260425-cap: Cap gallery items to 200 most recent

## What this fixes

User report after 260425-lzg landed: "I can still see >1200 carousel items inside the gallery's HTML though. The gallery itself is not even showing".

260425-lzg addressed the post-load CPU/disk grinding (sharp resizing all 1700 8K PNGs eagerly), but did not address Oruga `<o-carousel>`'s lack of virtualization — every entry in `items` becomes one carousel-item AND one indicator-item Vue component. With 1700 entries that's 3400+ child components mounting concurrently. The renderer chokes mid-mount, the carousel's slide track ends up in a half-mounted state, and the visible viewport never paints. The DOM contains the elements (the user saw them in DevTools) but the layout is broken.

## What changed

Single file: `src/renderer/views/Home.vue` (+50 / -6).

### 1. `MAX_GALLERY_ITEMS = 200` cap

Module-level constant. `listGalleryEntries` now returns `{ entries, totalCount }` instead of a bare array — entries sliced to top N by modified-desc, totalCount the unfiltered total. `data().totalSourceCount: 0` tracks the unfiltered count for the UI notice.

### 2. Warning tag in the header strip

Added an `<o-tag variant="warning">` next to the existing filename + resolution tags:
```vue
<o-tag
  v-if="totalSourceCount > items.length"
  variant="warning"
  style="margin-left: 0.5rem"
>
  Showing {{ items.length }} of {{ totalSourceCount }}
</o-tag>
```
So the user is not silently missing screenshots — they see "Showing 200 of 1700" right next to the filename of the current preview.

### 3. screenshot-response cap maintenance

When a new screenshot is captured and unshifted into the items array, the handler now trims the oldest with `items.pop()` if items exceeded the cap, and increments `totalSourceCount`. The cached thumb on disk for the popped (oldest displayed) item is preserved — `cleanupThumbnailCache` now uses the source dir as the keep set, not the items array.

### 4. removeItem decrements totalSourceCount

When the user deletes a screenshot from the gallery (delete shortcut or context menu), `totalSourceCount` decrements alongside the `items.splice`.

### 5. cleanupThumbnailCache refactor

Changed `cleanupThumbnailCache(entries)` to `cleanupThumbnailCache()` (no args). Rebuilds the keep set by reading the source dir directly:
```js
const dirFiles = await fs.promises.readdir(dir);
const keep = new Set(
  dirFiles
    .filter((f) => path.extname(f).toLowerCase() === '.png')
    .map((f) => normalizeComparePath(getThumbnailPath(path.join(dir, f))))
);
```
Reasoning: with the gallery cap in effect, the items array no longer represents "all valid thumbs to preserve". Cleanup must use the source dir directly so cached thumbs for items 201..N stay on disk. They become useful again the moment the user deletes/moves enough recent screenshots that older ones rotate into the top 200, OR if a future task adds pagination/load-more.

## Why 200?

- Bounded Vue/Oruga mount cost: ~400 child components total (carousel-items + indicator-items) is comfortable to mount in well under a second.
- Covers a typical week of screenshots even for active users (~30 shots/day × 7 days = 210, close enough; heavy users can request a higher cap).
- Round number; easy to reason about.

If perf with 200 still feels heavy, drop to 150 or 100 — the constant is one line.

## Why a cap instead of virtualization?

Considered:
- **Window-around-active virtualization**: render ~21 items in a moving window centered on `selected`. Implementation is fiddly because Oruga's carousel uses absolute indices for v-model, requiring a relative-index translation layer (computed setter), and the window-shift causes Oruga's slide animation to glitch when crossing the window boundary (the relative selected index doesn't move during the shift, so the carousel doesn't animate even though the user clicked "next"). Solving the animation glitch likely requires replacing Oruga's carousel with a custom implementation.
- **TransitionGroup + v-show**: Keep all items in DOM but display: none for those outside a window. Doesn't help — Oruga still mounts the components and the layout work happens regardless of visibility.
- **Replacing `<o-carousel>` entirely with a custom preview + thumb-strip pair**: most invasive, abandons all the existing carousel features (v-model, indicator-inside, click-to-select, etc.) for a perf win that the cap also delivers.

The cap is the simplest fix that makes the gallery work. Virtualization remains the right architectural answer if/when the user wants unbounded gallery access — flagged for follow-up.

## Trade-off

Items beyond the most recent 200 are not browsable from the gallery in the current session. To see them the user can:
- Delete recent screenshots (the next loadGallery picks up the next-most-recent fillers).
- Move/rename folders to filter what's "in" the gallery folder.

Future work could add a paginate-on-scroll affordance ("Load older 200") or expose `MAX_GALLERY_ITEMS` as a Settings toggle. The current fix prioritizes "gallery actually works" over "gallery shows everything".

## Verification

- `npm run pack` → exit 0.
- `git grep -nc 'MAX_GALLERY_ITEMS' src/renderer/views/Home.vue` → 5 (decl + comment + slice + screenshot-handler trim guard + cap doc).
- `git grep -nc 'totalSourceCount' src/renderer/views/Home.vue` → 6 (data + loadGallery assign + screenshot inc + removeItem dec + template v-if + template text).
- `git grep -nc 'cleanupThumbnailCache(entries)' src/renderer/views/Home.vue` → 0 (signature changed).
- `git grep -nc 'cleanupThumbnailCache()' src/renderer/views/Home.vue` → 2 (declaration + call).

Manual UI verification deferred to user — the user already had a 1700-image folder set up to test against; reopening the dev app should surface a working gallery with the "Showing 200 of 1700" warning tag.

## Combined effect with 260425-lzg

Stacked, the two perf tasks now provide:
- Bounded Vue/Oruga mount cost (cap, 260425-cap)
- Lazy thumbnail generation in a window around active (radius 50, 260425-lzg)
- Sync FS calls removed from the hot path (260425-lzg)
- Deferred cache cleanup with source-dir keep set (260425-lzg + 260425-cap)

Net for a 1700-item folder:
- First paint: fast (200 reactive items + first window of thumbs).
- Steady state: ~50 thumbs generate around active when user navigates; the rest stay placeholder.
- Cached thumbs for ALL 1700 source PNGs are preserved across loads (only orphan thumbs get cleaned up).
