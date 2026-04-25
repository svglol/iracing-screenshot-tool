---
phase: quick-260425-lzg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/renderer/views/Home.vue
autonomous: true
requirements:
  - LZG-PERF-01  # Opening a screenshot folder with 1700+ images does not kick off background sharp generation for all items
  - LZG-PERF-02  # Thumbnail generation runs only for items within a window (±THUMB_GEN_RADIUS) around the active selection, plus on initial load and on every selection change
  - LZG-PERF-03  # Entry mapping in loadGallery does NOT call fs.existsSync per item (synchronous I/O removed from the hot path)
  - LZG-PERF-04  # Thumbnail cache cleanup runs deferred (setTimeout) so it does not compete with the initial paint
  - LZG-PERF-05  # Cached thumbnails (where the .webp already exists on disk) still surface within the active window — `ensureThumbnail` returns early when the file exists, so no sharp work is repeated
must_haves:
  truths:
    - "Drop 1700 8K screenshots into the gallery folder, restart the app: the gallery is responsive within seconds, and the thumbnails for items inside the active window (±50) populate progressively while items outside the window stay as the placeholder."
    - "Navigate the carousel (click thumbs, arrow keys): the new active index triggers a window of thumb generation around it; previously-blank thumbs in that window populate. Items outside the (rolling) window stay blank — they don't generate until the user navigates near them."
    - "Take a NEW screenshot: the new item is unshifted at index 0; selected becomes 0; ensureWindowThumbnails(0, loadId) is called from the screenshot-response handler so the new item's thumb generates even though the selected watcher does not fire (selected was already 0 in the typical case)."
    - "Open DevTools while loading a 1700-item folder: the renderer process does NOT show 1700 sharp/file-system calls in flight. Only items within the active window get scheduled."
    - "Existing carousel features (preview render, click-to-select, centered sliding window from 260425-gw3, active highlight, lazy-loading via v-lazy) continue to work unchanged."
    - "`npm run pack` exits 0 with no new TypeScript or Vue compile errors."
  artifacts:
    - path: "src/renderer/views/Home.vue"
      provides: "Module-level constant `THUMB_GEN_RADIUS = 50`. New `ensureWindowThumbnails(centerIndex, loadId)` method that filters items in [centerIndex - radius, centerIndex + radius + 1], deduplicates against `this.generatingThumbs: Set<string>`, runs the existing 4-worker concurrency pattern, and writes `item.thumb = item.thumbDisplayPath` on success. The eager `void this.createMissingThumbnails(entries, loadId)` call is removed from loadGallery; the `createMissingThumbnails` method itself is removed (no longer referenced). The `selected` watcher gains a `void this.ensureWindowThumbnails(newIndex, this.galleryLoadId)` call. The screenshot-response handler replaces its inline `ensureThumbnail(filePath, thumbPath)` block with `void this.ensureWindowThumbnails(0, this.galleryLoadId)`. `cleanupThumbnailCache(entries)` is deferred via `setTimeout(..., 1500)`. `fs.existsSync(thumbFsPath)` is dropped from entry mapping — every item starts with `thumb: EMPTY_IMAGE`; `ensureThumbnail`'s own existsSync early-return preserves cached-thumb fast path."
      contains: "ensureWindowThumbnails"
  key_links:
    - from: "watch selected"
      to: "ensureWindowThumbnails(newIndex, this.galleryLoadId)"
      via: "augmented existing watcher"
      pattern: "ensureWindowThumbnails(newIndex"
    - from: "loadGallery success branch"
      to: "ensureWindowThumbnails(this.selected, loadId)"
      via: "explicit one-shot call after items are set"
      pattern: "ensureWindowThumbnails(this.selected"
    - from: "screenshot-response handler"
      to: "ensureWindowThumbnails(0, this.galleryLoadId)"
      via: "explicit call (selected may not transition value, watcher not guaranteed to fire)"
      pattern: "ensureWindowThumbnails(0"
---

<objective>
Make the gallery genuinely lazy. Today, `loadGallery` calls `void this.createMissingThumbnails(entries, loadId)` at the end — that schedules sharp resizes for every item without a cached `.webp` thumb, capped only at concurrency 4. With 1700 fresh 8K PNGs the eager pipeline grinds for ~20+ minutes after the gallery opens, monopolizing CPU/disk/memory while v-lazy lazily attaches img SRC for what's already in viewport — a misleading partial-laziness.

The user's complaint: "1700 8K pictures... taking ages to load. The gallery does not seem to be lazily loaded at all". Correct: `v-lazy` gates IMG SRC bytes-into-decode, but it does NOT gate the upstream sharp resize from 8K PNG to 1280×720 webp. That step is always eager. Plus `fs.existsSync(thumbFsPath)` in the entry mapping is 1700 sync FS calls on the main thread.

Fix scope (single file, src/renderer/views/Home.vue):
1. Replace the eager bulk thumb-generation pipeline with a windowed-around-selected one. Generate thumbs only for items in [selected − 50, selected + 50]. As the user navigates the carousel (click a thumb, arrow keys, screenshot taken), the window shifts and new thumbs generate.
2. Drop the per-item `fs.existsSync` from entry mapping. `ensureThumbnail` (the worker function) already does its own existsSync skip-check, so cached thumbs still surface fast — they just route through `ensureWindowThumbnails` and return early instead of being decided up-front during sync mapping.
3. Defer `cleanupThumbnailCache(entries)` via `setTimeout(1500)` so it doesn't compete with the initial paint.

Out of scope (deliberate):
- Capping `this.items.length` to N most recent. Vue + Oruga happily render 1700 reactive items / DOM nodes — that's ~500ms-1s of DOM work amortized. The user's primary complaint was the post-load grinding (sharp + FS), not the initial paint. We can revisit virtualization if the DOM cost becomes the dominant complaint.
- IntersectionObserver per-thumbnail granularity. Window-around-selected with radius 50 covers typical user nav patterns (carousel arrow keys, clicking visible strip thumbs); if the user wheel-scrolls the strip past 50 thumbs without clicking, those past-the-window thumbs would still be blank. Acceptable trade-off for the simpler implementation; can be tightened later if reported.
- Cache cleanup correctness. With no cap, `keep` (built from `this.items`) still represents the full set of valid thumbs, so cleanup remains correct.

Output: edits to src/renderer/views/Home.vue only.
</objective>

<context>
@src/renderer/views/Home.vue

<existing_pipeline>
Today's flow on `loadGallery`:
1. `await listGalleryEntries()` → reads dir, stats every file (1700 parallel `fs.promises.stat` is fine).
2. `entries = ... .map(entry => { ...; const hasThumbnail = fs.existsSync(thumbFsPath); return { ..., thumb: hasThumbnail ? ... : EMPTY_IMAGE }; })` — **1700 sync existsSync calls on the main thread**.
3. `this.items = entries; this.setSelectionFromItems();` — triggers Vue reactivity + Oruga rendering for 1700 items.
4. `void cleanupThumbnailCache(entries);` — fires immediately, contends with paint.
5. `void this.createMissingThumbnails(entries, loadId);` — kicks off 4 workers grinding through ALL items with `thumb === EMPTY_IMAGE`. For 1700 freshly-added 8K PNGs that's ~1700 sharp resizes at ~1-3s each → ~20+ minutes of background grinding.

`ensureThumbnail` itself is fine — already short-circuits on cached thumbs:
```js
async function ensureThumbnail(sourceFile, thumbFile) {
  if (fs.existsSync(thumbFile)) {
    return;
  }
  await sharp(sourceFile).resize(1280, 720, { fit: 'contain', background: { ... } }).toFile(thumbFile);
}
```

`createMissingThumbnails` worker pattern (lines 486-510) is fine in itself — concurrency-4 with stale-load cancellation. We're keeping the worker pattern but driving it from a window selector instead of the full items array.

The screenshot-response handler currently has its own inline thumb generation:
```js
if (item.thumb === EMPTY_IMAGE) {
  void ensureThumbnail(filePath, thumbPath)
    .then(() => { item.thumb = item.thumbDisplayPath; })
    .catch(...);
}
```
Replace with the unified `ensureWindowThumbnails(0, ...)` call so we have one path.
</existing_pipeline>

<vue_options_api_set_caveat>
Storing `generatingThumbs: new Set<string>()` in `data()` makes the Set a Vue reactive proxy. That's fine for a Set with up to ~100 entries at a time — reactivity overhead is negligible — and avoids the mess of declaring a non-reactive instance property in Options API + TypeScript. We're not iterating the Set in templates (it's only consulted from the worker via `.has()` and mutated via `.add()` / `.delete()`), so the proxy doesn't trigger any spurious re-renders.
</vue_options_api_set_caveat>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add ensureWindowThumbnails + drop eager createMissingThumbnails call</name>
  <files>src/renderer/views/Home.vue</files>
  <behavior>
    A new method `ensureWindowThumbnails(centerIndex, loadId)` exists. It filters items in the radius-50 window around `centerIndex`, dedupes against `this.generatingThumbs: Set<string>`, runs the existing 4-worker concurrency pattern, mutates `item.thumb = item.thumbDisplayPath` on success, and removes from the set in `finally`. Stale-load cancellation (`if (loadId !== this.galleryLoadId) return;`) preserved.

    The eager `void this.createMissingThumbnails(entries, loadId)` call is removed from loadGallery. The `createMissingThumbnails` method itself is removed (no longer referenced — keeping unused code is technical debt).

    Wired into:
    - the `selected` watcher (so navigating the carousel shifts the window)
    - the screenshot-response handler (so a new screenshot's thumb generates even when selected was already 0 and the watcher does not fire)
    - the loadGallery success branch (so the initial render kicks off generation for items around index 0)
  </behavior>
  <action>
    1. Add a module-level constant near the existing `THUMBNAIL_CONCURRENCY = 4`:

       ```ts
       const THUMB_GEN_RADIUS = 50;
       ```

    2. Add `generatingThumbs: new Set<string>()` to the `data()` return.

    3. REMOVE the existing `createMissingThumbnails` method (lines ~486-514). REMOVE the `void this.createMissingThumbnails(entries, loadId);` call at the end of `loadGallery` (line 544).

    4. Add a new `ensureWindowThumbnails` method to the methods block. Place it RIGHT BEFORE `loadGallery` so the call site reads top-down:

       ```ts
       async ensureWindowThumbnails(centerIndex: number, loadId: number) {
         if (this.items.length === 0) return;
         const radius = THUMB_GEN_RADIUS;
         const start = Math.max(0, centerIndex - radius);
         const end = Math.min(this.items.length, centerIndex + radius + 1);

         const queue: any[] = [];
         for (let i = start; i < end; i++) {
           const item = this.items[i];
           if (!item || item.thumb !== EMPTY_IMAGE) continue;
           if (this.generatingThumbs.has(item.thumbFsPath)) continue;
           this.generatingThumbs.add(item.thumbFsPath);
           queue.push(item);
         }

         if (queue.length === 0) return;

         const workerCount = Math.min(THUMBNAIL_CONCURRENCY, queue.length);
         const workers = Array.from({ length: workerCount }, async () => {
           while (queue.length > 0) {
             const item = queue.shift();
             if (!item) return;
             try {
               await ensureThumbnail(item.sourcePath, item.thumbFsPath);
               if (loadId !== this.galleryLoadId) return;
               item.thumb = item.thumbDisplayPath;
             } catch (error) {
               console.log(error);
             } finally {
               this.generatingThumbs.delete(item.thumbFsPath);
             }
           }
         });

         await Promise.all(workers);
       },
       ```

    5. Augment the existing `selected` watcher to call `ensureWindowThumbnails`. After the existing `this.centerActiveThumb();` line, add:

       ```ts
       void this.ensureWindowThumbnails(newIndex, this.galleryLoadId);
       ```

    6. In `loadGallery`'s success branch, after `this.centerActiveThumb();`, add:

       ```ts
       void this.ensureWindowThumbnails(this.selected, loadId);
       ```

    7. Replace the screenshot-response inline thumb generation block. Find:
       ```ts
       if (item.thumb === EMPTY_IMAGE) {
         void ensureThumbnail(filePath, thumbPath)
           .then(() => { item.thumb = item.thumbDisplayPath; })
           .catch((error) => { console.log(error); });
       }
       ```
       Replace with:
       ```ts
       void this.ensureWindowThumbnails(0, this.galleryLoadId);
       ```
       (selected was set to 0 immediately above; the new item is at index 0; ensureWindowThumbnails will pick it up via the `thumb !== EMPTY_IMAGE` filter and dedupe Set)
  </action>
  <verify>
    `git grep -nc 'ensureWindowThumbnails' src/renderer/views/Home.vue` → 4 (1 method definition + 3 call sites).
    `git grep -nc 'createMissingThumbnails' src/renderer/views/Home.vue` → 0 (method + call removed).
    `git grep -nc 'THUMB_GEN_RADIUS' src/renderer/views/Home.vue` → 2 (const declaration + use in method).
  </verify>
  <done>
    ensureWindowThumbnails method exists; selected watcher, screenshot-response handler, loadGallery branch each call it; createMissingThumbnails method + call are gone.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Drop sync existsSync from entry mapping; defer cleanup; clear set on reload</name>
  <files>src/renderer/views/Home.vue</files>
  <behavior>
    The entry mapping in `loadGallery` no longer calls `fs.existsSync(thumbFsPath)` per item. Every item starts with `thumb: EMPTY_IMAGE`; `ensureThumbnail`'s own existsSync skip-check preserves the cached-thumb fast path (cached items resolve via `ensureWindowThumbnails` instantly without sharp work).

    `cleanupThumbnailCache(entries)` is deferred via setTimeout(1500) so the disk-readdir + bulk-unlink doesn't compete with the initial paint.

    `this.generatingThumbs.clear()` is called at the start of `loadGallery` so stale entries from a previous folder don't dedupe new items.
  </behavior>
  <action>
    1. In `loadGallery`, after `this.galleryLoadId = loadId; this.items = []; this.setSelectionFromItems();`, add:

       ```ts
       this.generatingThumbs.clear();
       ```

    2. In the entry mapping, replace:

       ```ts
       const entries = (await listGalleryEntries()).map((entry) => {
         const thumbFsPath = getThumbnailPath(entry.fullPath);
         const thumbDisplayPath = toDisplayPath(thumbFsPath);
         const hasThumbnail = fs.existsSync(thumbFsPath);

         return {
           file: toDisplayPath(entry.fullPath),
           thumb: hasThumbnail ? thumbDisplayPath : EMPTY_IMAGE,
           thumbDisplayPath,
           thumbFsPath,
           sourcePath: entry.fullPath,
         };
       });
       ```

       with:

       ```ts
       const entries = (await listGalleryEntries()).map((entry) => {
         const thumbFsPath = getThumbnailPath(entry.fullPath);
         return {
           file: toDisplayPath(entry.fullPath),
           // Always start blank; ensureWindowThumbnails fills in cached or
           // freshly-resized thumbs for items in the active window. For
           // already-cached items, ensureThumbnail returns early without
           // doing sharp work, so cached thumbs surface near-instantly once
           // the window includes them.
           thumb: EMPTY_IMAGE,
           thumbDisplayPath: toDisplayPath(thumbFsPath),
           thumbFsPath,
           sourcePath: entry.fullPath,
         };
       });
       ```

    3. Replace `void cleanupThumbnailCache(entries);` with:

       ```ts
       setTimeout(() => {
         if (loadId === this.galleryLoadId) {
           void cleanupThumbnailCache(entries);
         }
       }, 1500);
       ```

       (loadId guard prevents a stale folder's cleanup from running after the user has switched folders.)
  </action>
  <verify>
    `git grep -nc 'fs.existsSync(thumbFsPath)' src/renderer/views/Home.vue` → 0.
    `git grep -nc 'this.generatingThumbs.clear()' src/renderer/views/Home.vue` → 1.
    `git grep -nc 'setTimeout' src/renderer/views/Home.vue` ≥ 1.
    `git grep -nc 'hasThumbnail' src/renderer/views/Home.vue` → 0 (variable name removed along with the existsSync line).
    <automated>npm run pack</automated>
    Expected: exit 0, no new TypeScript or Vue compile errors.
  </verify>
  <done>
    Sync existsSync gone from entry mapping; cleanup deferred; generatingThumbs cleared on load; build clean.
  </done>
</task>

</tasks>

<verification>
1. `npm run pack` exits 0.
2. `git diff --stat` shows ONLY `src/renderer/views/Home.vue` modified.
3. `git grep -nc 'ensureWindowThumbnails' src/renderer/views/Home.vue` ≥ 4.
4. `git grep -nc 'createMissingThumbnails' src/renderer/views/Home.vue` → 0.
5. `git grep -nc 'fs.existsSync(thumbFsPath)' src/renderer/views/Home.vue` → 0.
6. `git grep -nc 'this.generatingThumbs' src/renderer/views/Home.vue` ≥ 4 (clear + has + add + delete; possibly more).
</verification>

<success_criteria>
- Opening a 1700-image folder is responsive within seconds; the renderer is NOT busy with 1700 sharp ops in flight.
- Items in the window around the active selection get thumbs generated on demand; items outside the window stay placeholder until the user navigates near them.
- Screenshot capture still produces a thumbnail for the new item.
- Folder change cleans up properly (generatingThumbs cleared, stale loadId cancellation works).
- Build clean, single-file diff.
- Commit prefixed `perf(ui):`, no Co-Authored-By.
</success_criteria>

<output>
After completion, create `.planning/quick/260425-lzg-gallery-lazy-thumbnails/260425-lzg-SUMMARY.md` capturing:
- Why v-lazy alone doesn't address the regression (lazy-loads bytes from disk to img.src, doesn't gate the upstream sharp resize from 8K PNG to webp).
- The window radius choice (50) and the trade-off vs IntersectionObserver per-thumbnail.
- Why no item cap was added (Vue + Oruga handle 1700 reactive items in ~500ms-1s of DOM work; the user's pain was the post-load sharp grinding, not initial paint).
- Final diff shape and commit SHA.
</output>
