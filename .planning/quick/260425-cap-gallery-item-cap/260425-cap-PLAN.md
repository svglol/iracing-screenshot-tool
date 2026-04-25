---
phase: quick-260425-cap
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/renderer/views/Home.vue
autonomous: true
requirements:
  - CAP-PERF-01  # Gallery renders at most MAX_GALLERY_ITEMS (200) carousel-items + indicator-items, regardless of source folder size
  - CAP-PERF-02  # The cap applies to displayable items only — cached thumbs on disk are preserved for items beyond the cap, so cleanupThumbnailCache no longer relies on the items array
  - CAP-UX-03  # When source count > displayed count, a warning tag next to the filename surfaces "Showing N of M" so the user is not silently missing screenshots
must_haves:
  truths:
    - "Open a folder with 1700 8K screenshots: Home.vue's items array contains exactly 200 entries (the most-recent-by-mtime). The DOM contains ~200 carousel-items + ~200 indicator-items, NOT 1700+."
    - "The header strip shows a warning tag with text 'Showing 200 of 1700' next to the filename and resolution tags."
    - "Cached thumbs on disk for items 201..1700 are NOT deleted by cleanupThumbnailCache — the keep set is built from the full source dir's PNG list, not from the (capped) items array."
    - "Take a new screenshot when items.length === 200: items.unshift adds the new item, items.pop trims the oldest displayable, items.length stays 200, totalSourceCount increments."
    - "Delete a screenshot from the gallery: items.length goes down by 1, totalSourceCount goes down by 1."
    - "`npm run pack` exits 0."
  artifacts:
    - path: "src/renderer/views/Home.vue"
      provides: "Module-level constant `MAX_GALLERY_ITEMS = 200`. `listGalleryEntries` now returns `{ entries, totalCount }` — entries sliced to top-N by modified-desc, totalCount the unfiltered total. `data().totalSourceCount` tracks the unfiltered count. Template adds an `<o-tag variant='warning'>` next to filename/resolution when `totalSourceCount > items.length`. screenshot-response handler trims oldest with `items.pop()` if items exceeds the cap, increments totalSourceCount. removeItem decrements totalSourceCount. `cleanupThumbnailCache` is now arg-less; rebuilds the keep set by `fs.promises.readdir(dir)` filtered to .png — preserves cached thumbs for items beyond the cap. loadGallery destructures the new shape, sets totalSourceCount, calls `cleanupThumbnailCache()` with no args."
      contains: "MAX_GALLERY_ITEMS"
  key_links:
    - from: "MAX_GALLERY_ITEMS = 200"
      to: "Bounded DOM/component count for Oruga's <o-carousel>"
      via: "listGalleryEntries slice; carousel + indicator v-for over capped items"
      pattern: "MAX_GALLERY_ITEMS"
    - from: "cleanupThumbnailCache() (no args)"
      to: "Disk source-dir scan as the keep set"
      via: "fs.promises.readdir(dir) filtered to .png; getThumbnailPath maps each to its .webp cache path"
      pattern: "fs.promises.readdir(dir)"
---

<objective>
The user reports: "I can still see >1200 carousel items inside the gallery's HTML though. The gallery itself is not even showing".

Diagnosis: the previous fix (260425-lzg) addressed the post-load sharp grinding, but Oruga's `<o-carousel>` has no built-in virtualization — it renders one carousel-item AND one indicator-item per `items` entry. With 1700 items that's 3400+ Vue child components mounting concurrently. The renderer chokes during initial mount, the layout breaks, and the visible viewport never paints (DOM contains the elements, but the carousel's slide track is in a half-mounted state).

Fix: cap `items.length` to MAX_GALLERY_ITEMS = 200 most recent. This bounds the rendered set to ~400 child components which Oruga handles fine. Show a warning tag next to the filename when the source count exceeds the cap so the user is not silently missing screenshots. Preserve cached thumbs on disk for items beyond the cap by changing `cleanupThumbnailCache` to use the source dir as the keep set (rather than the capped items array — which would otherwise delete valid cached thumbs).

Trade-off: items beyond the cap aren't browsable from the gallery in this session. Future work could add a paginate-on-scroll affordance or a Settings toggle for `MAX_GALLERY_ITEMS`. Out of scope here — the priority is making the gallery work at all for large folders.

Output: edits to `src/renderer/views/Home.vue` only.
</objective>

<context>
@src/renderer/views/Home.vue

<existing_carousel>
Template (unchanged in this task except for the warning tag):
```vue
<o-carousel id="carousel" v-model="selected" :indicator-inside="false" ...>
  <o-carousel-item v-for="(item, i) in items" :key="i">
    <figure class="al image">
      <img v-lazy="getViewerImageUrl(items[i], i)" ... />
    </figure>
  </o-carousel-item>
  <template #indicator="props">
    <figure class="al image">
      <img v-lazy="getImageUrl(items[props.index])" ... />
    </figure>
  </template>
</o-carousel>
```

Both the v-for over `items` AND the indicator slot iterate `items`. Cap items, both sides scale together.
</existing_carousel>

<cleanup_correctness_concern>
The current `cleanupThumbnailCache(entries)` builds its keep set from `entries.map(entry => entry.thumbFsPath)`. With the cap in effect, `entries` only has the top 200 items. If we kept the existing signature, cleanup would unlink cached thumbs for items 201..N — wasteful (sharp would have to re-resize them next time the user accessed them somehow).

The fix is to scan the source dir directly for the keep set, decoupling cleanup from the gallery cap:

```js
async function cleanupThumbnailCache() {
  const dirFiles = await fs.promises.readdir(dir);
  const keep = new Set(
    dirFiles
      .filter((f) => path.extname(f).toLowerCase() === '.png')
      .map((f) => normalizeComparePath(getThumbnailPath(path.join(dir, f))))
  );
  // ...iterate cache files, unlink any whose path isn't in keep
}
```

This is also more correct conceptually: cached thumbs should outlive their gallery-displayability, since "in the cap" is a UI-level concern, not a "this thumb is still valid" concern.
</cleanup_correctness_concern>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add cap + reshape listGalleryEntries return + totalSourceCount data</name>
  <files>src/renderer/views/Home.vue</files>
  <behavior>
    Module-level constant `MAX_GALLERY_ITEMS = 200`. `listGalleryEntries` returns `{ entries, totalCount }` instead of a bare array — entries sliced to top N by modified-desc, totalCount is the unfiltered total. `data().totalSourceCount: 0` tracks the unfiltered count.
  </behavior>
  <action>
    1. Add module constant near `THUMB_GEN_RADIUS`:

       ```ts
       const MAX_GALLERY_ITEMS = 200;
       ```

    2. Change `listGalleryEntries` return shape to `{ entries, totalCount }`. The error path returns `{ entries: [], totalCount: 0 }`. The success path slices `sorted.slice(0, MAX_GALLERY_ITEMS)` for entries and uses `sorted.length` for totalCount.

    3. Add `totalSourceCount: 0` to `data()` return.

    4. In `loadGallery`, destructure the new shape: `const { entries: rawEntries, totalCount } = await listGalleryEntries();` and use `rawEntries` as the iteration source for the existing entry mapping. After `this.items = entries;`, add `this.totalSourceCount = totalCount;`.
  </action>
  <verify>
    `git grep -nc 'MAX_GALLERY_ITEMS' src/renderer/views/Home.vue` ≥ 4 (declaration + slice + screenshot-handler trim guard + maybe doc).
    `git grep -nc 'totalSourceCount' src/renderer/views/Home.vue` ≥ 4 (data + loadGallery + screenshot inc + removeItem dec; possibly more for template).
  </verify>
  <done>
    Cap constant exists; listGalleryEntries returns shaped object; loadGallery consumes shape; totalSourceCount tracked in data.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Refactor cleanupThumbnailCache to use source-dir keep set</name>
  <files>src/renderer/views/Home.vue</files>
  <behavior>
    `cleanupThumbnailCache` is now arg-less. It rebuilds the keep set by reading the source dir (`fs.promises.readdir(dir)`) filtered to .png and mapped through `getThumbnailPath` + `normalizeComparePath`. Cached thumbs whose source PNG no longer exists are unlinked; everything else preserved. The loadGallery setTimeout call is updated to invoke with no args.
  </behavior>
  <action>
    1. Replace `cleanupThumbnailCache(entries)` with `cleanupThumbnailCache()`. Body uses `fs.promises.readdir(dir)` for the keep set source instead of the entries array.

    2. Update the loadGallery setTimeout call:
       ```ts
       void cleanupThumbnailCache();
       ```
       (no args)
  </action>
  <verify>
    `git grep -nc 'cleanupThumbnailCache(entries)' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'cleanupThumbnailCache()' src/renderer/views/Home.vue` → 2 (declaration + call site).
    <automated>npm run pack</automated>
    Expected: exit 0.
  </verify>
  <done>
    cleanupThumbnailCache is arg-less and uses source-dir keep set; loadGallery call updated.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Template warning tag + screenshot-response cap maintenance + removeItem decrement</name>
  <files>src/renderer/views/Home.vue</files>
  <behavior>
    The header strip next to filename/resolution shows an `<o-tag variant="warning">` with text "Showing N of M" when `totalSourceCount > items.length`. The screenshot-response handler trims `items.pop()` if items exceed the cap after unshift, and increments `totalSourceCount`. `removeItem` decrements `totalSourceCount` after a successful unlink + splice.
  </behavior>
  <action>
    1. In the header strip after the existing `<o-tag variant="info">{{ resolution }}</o-tag>`, add:
       ```vue
       <o-tag
         v-if="totalSourceCount > items.length"
         variant="warning"
         style="margin-left: 0.5rem"
       >
         Showing {{ items.length }} of {{ totalSourceCount }}
       </o-tag>
       ```

    2. In the screenshot-response handler, after `this.items.unshift(item);`:
       ```ts
       if (this.items.length > MAX_GALLERY_ITEMS) {
         this.items.pop();
       }
       this.totalSourceCount += 1;
       ```

    3. In `removeItem`, after `this.items.splice(index, 1);`:
       ```ts
       this.totalSourceCount = Math.max(0, this.totalSourceCount - 1);
       ```
  </action>
  <verify>
    `git grep -nc 'Showing {{ items.length }} of' src/renderer/views/Home.vue` → 1.
    `git grep -nc 'this.items.pop()' src/renderer/views/Home.vue` → 1.
    `git grep -nc 'totalSourceCount += 1' src/renderer/views/Home.vue` → 1.
    `git grep -nc 'totalSourceCount - 1' src/renderer/views/Home.vue` → 1.
  </verify>
  <done>
    Warning tag in template; screenshot handler trims + increments; removeItem decrements; build clean.
  </done>
</task>

</tasks>

<verification>
1. `npm run pack` exits 0.
2. `git diff --stat` shows ONLY `src/renderer/views/Home.vue` modified.
3. `git grep -nc 'MAX_GALLERY_ITEMS' src/renderer/views/Home.vue` ≥ 4.
4. `git grep -nc 'totalSourceCount' src/renderer/views/Home.vue` ≥ 4.
5. `git grep -nc 'cleanupThumbnailCache(entries)' src/renderer/views/Home.vue` → 0.
</verification>

<success_criteria>
- Gallery DOM contains at most ~400 carousel/indicator child components (200 each).
- Warning tag visible next to filename when source folder has more items than the cap.
- Cached thumbs on disk for items beyond the cap NOT deleted by cleanup.
- Build clean, single-file diff.
- Commit prefixed `perf(ui):`, no Co-Authored-By.
</success_criteria>

<output>
After completion, create `.planning/quick/260425-cap-gallery-item-cap/260425-cap-SUMMARY.md` capturing:
- Why a cap was needed despite 260425-lzg's lazy thumb gen (Oruga's <o-carousel> has no built-in virtualization).
- Why 200 was chosen as the value (covers ~typical week of screenshots, comfortably bounds Vue/Oruga mount cost).
- Why cleanupThumbnailCache had to refactor (cap-based keep set would otherwise delete valid thumbs for items beyond the cap).
- Final diff shape and commit SHA.
- Trade-off: items beyond the cap not browsable in current session; user must reload after deletes/moves to see older screenshots.
</output>
