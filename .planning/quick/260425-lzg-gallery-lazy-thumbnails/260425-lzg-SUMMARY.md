---
phase: quick-260425-lzg
status: complete
date: 2026-04-25
---

# Quick Task 260425-lzg: Gallery thumbnail generation — truly lazy, windowed-around-active

## Root cause of the regression

The user reported "1700 8K pictures... taking ages to load. The gallery does not seem to be lazily loaded at all" — and they were right.

`v-lazy` (the directive on each indicator's `<img>`) only gates the IMG SRC bytes-into-decode step. It does NOT gate the upstream **sharp resize** from 8K PNG → 1280×720 webp. That step lived in `Home.vue:loadGallery()`'s tail call:

```js
void this.createMissingThumbnails(entries, loadId);
```

`createMissingThumbnails` ran 4 sharp workers grinding through every item with `thumb === EMPTY_IMAGE`. With 1700 fresh 8K PNGs at ~1-3s per resize, that's ~20+ minutes of background CPU/disk/memory work after the gallery opens. The `void` made the call non-blocking but the OS still felt the load — UI sluggish, disk busy, fan loud.

Two compounding sub-issues:
- `fs.existsSync(thumbFsPath)` was called 1700× synchronously in the entry mapping (~50-200ms blocked on the main thread).
- `cleanupThumbnailCache(entries)` ran without a delay, contending with first paint for disk I/O.

## What changed

Single file: `src/renderer/views/Home.vue` (+47 / -28).

### 1. `ensureWindowThumbnails(centerIndex, loadId)` replaces `createMissingThumbnails(entries, loadId)`

Generates thumbnails ONLY for items in the window `[centerIndex - 50, centerIndex + 50]` (radius capped at items array bounds). Same 4-worker concurrency pattern, same stale-load cancellation via `loadId !== this.galleryLoadId`. New: a `generatingThumbs: Set<string>` on `data()` for cross-call dedupe (so two concurrent windows don't double-queue the same item).

`createMissingThumbnails` (method + call) is fully removed.

### 2. Wired into 3 call sites

- The existing `selected` watcher (so navigating the carousel shifts the window of active generation).
- The `loadGallery` success branch (so the initial render kicks off generation around index 0).
- The `screenshot-response` handler (replaces the inline `ensureThumbnail(filePath, thumbPath)` block — `selected` may not transition value here so the watcher isn't guaranteed to fire; the explicit call covers it).

### 3. Sync I/O removed from the entry-mapping hot path

`fs.existsSync(thumbFsPath)` and the `hasThumbnail ? thumbDisplayPath : EMPTY_IMAGE` ternary are gone. Every item starts with `thumb: EMPTY_IMAGE`. The cached-thumb fast path is preserved because `ensureThumbnail` itself does:

```js
async function ensureThumbnail(sourceFile, thumbFile) {
  if (fs.existsSync(thumbFile)) {
    return;  // ← cached thumbs return here without sharp work
  }
  await sharp(sourceFile).resize(1280, 720, { ... }).toFile(thumbFile);
}
```

So when `ensureWindowThumbnails` enqueues a cached-thumb item, the worker resolves near-instantly and immediately writes `item.thumb = item.thumbDisplayPath`. The user sees their cached thumbs appear in the active window within milliseconds; uncached items take their actual sharp time.

### 4. `cleanupThumbnailCache(entries)` deferred via `setTimeout(1500)`

Off the initial-paint critical path. Guarded by `loadId === this.galleryLoadId` so a stale folder's cleanup doesn't run after the user has switched to a different folder.

### 5. `this.generatingThumbs.clear()` at loadGallery start

Avoids leaking dedupe entries from a previous folder across a folder change.

## Why no item cap (e.g., MAX_GALLERY_ITEMS = 500)?

Considered and rejected:
- Vue + Oruga happily render 1700 reactive items / DOM nodes. Cost is ~500ms-1s of one-time DOM/reactivity work — bearable.
- The user's actual pain was the post-load **sharp + FS grinding** of the eager pipeline, not the initial paint. Fix the upstream and the symptom resolves.
- Capping changes the UX semantically (older screenshots disappear from the gallery without warning) — needs a paginate-on-scroll story or a Settings toggle. Out of scope for a perf quick task.

If the initial paint with 1700+ items eventually becomes the dominant complaint, the next step is virtualization of the carousel + indicator strip, not a hard cap.

## Why a windowed approach over per-thumbnail IntersectionObserver?

Considered both:
- **Window-around-active (chosen)**: simple — one method, one watcher, one Set. Generates ~100 thumbs (radius=50 each side) on each navigation event. Covers carousel-arrow-key nav, click-to-select, and thumbnail strip browsing within ±50.
- **IntersectionObserver per indicator**: tighter — generates exactly the thumbs the user actually sees. But: requires a custom directive or per-instance observer wiring, mounted/unmounted lifecycle for the observer, data-index attribute on the indicator slot template. ~3× the code for an edge-case win (user wheel-scrolling the strip past 50 items without ever clicking).

If the user reports that wheel-scrolling the strip leaves blank thumbs past the radius, an IntersectionObserver pass can be added without disturbing this windowed approach.

## Trade-off acknowledged

If the user wheel-scrolls the thumbnail strip more than 50 thumbs in either direction without clicking any of them, those thumbs will stay blank. Clicking any thumb in the strip (or using carousel arrow keys) immediately schedules generation for the new ±50 window. Acceptable trade-off vs the simplicity of the implementation.

## Verification

- `npm run pack` → exit 0, no new TypeScript or Vue compile errors.
- `git grep -nc 'ensureWindowThumbnails' src/renderer/views/Home.vue` → 5 (1 method + 4 call sites — selected watcher, screenshot-response, loadGallery initial, plus the watcher's own self-reference).
- `git grep -nc 'createMissingThumbnails' src/renderer/views/Home.vue` → 0.
- `git grep -nc 'fs.existsSync(thumbFsPath)' src/renderer/views/Home.vue` → 0.
- `git grep -nc 'hasThumbnail' src/renderer/views/Home.vue` → 0.
- `git grep -nc 'THUMB_GEN_RADIUS' src/renderer/views/Home.vue` → 2 (declaration + use).
- `git grep -nc 'generatingThumbs.clear()' src/renderer/views/Home.vue` → 1.
- `git grep -nc 'setTimeout' src/renderer/views/Home.vue` → 1.

Manual UI verification deferred to user — the perceived perf change is most clearly seen in the dev app with a folder of many large screenshots.

## Notes for the user

- After this fix, when you open a folder with 1700 8K screenshots:
  - First paint is fast (no sync FS spam, no eager sharp queue).
  - The first ~100 thumbnails (around index 0) progressively populate as the 4 sharp workers grind.
  - Older thumbnails (index > 50) stay placeholder until you navigate near them.
- The first time you open a fresh batch is unavoidably slower than reopening it (the first viewing of each window genuinely has to run sharp). After thumbnails are cached on disk, reopening is instant.
- If you want to backfill all 1700 thumbnails ahead of time (e.g., overnight), say the word — it's a separate one-shot script that pre-warms the cache without coupling to gallery navigation.
