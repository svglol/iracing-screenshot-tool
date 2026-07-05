---
type: quick
slug: rst-wp-h-renderer-state
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-H, plan-checked SOUND_WITH_FIXES
depends_on: none
findings_closed: [cq-renderer-settings-ui#1, cq-renderer-settings-ui#2, cq-renderer-settings-ui#3, cq-renderer-settings-ui#4, cq-renderer-capture-views#2]
---

# WP-H: Renderer state / persistence / dead code

Four renderer-only defects. No `src/main` edits.

## Tasks
1. **`cq-renderer-settings-ui#1`** — SettingsModal.vue lost restore geometry
   (persisted only in a `beforeUnmount` that never fires under the v-show modal).
   → per-key watchers (validated, persist-only) + `config.set` in `restoreNow()`;
   deleted the dead `beforeUnmount`.
2. **`cq-renderer-settings-ui#2`** — SideBar.vue `updated()` re-ran six blocking
   `sendSync` config writes on every reactive change. → per-key watchers guarded
   by `config.get()!==value`; kept the VRAM quantization guard.
3. **`cq-renderer-settings-ui#3`** — removed SideBar's unused `props:['screenshot']`
   + dead `disabled()` computed.
4. **`cq-renderer-settings-ui#4`** — removed the two `:destroy-on-hide="false"`
   no-ops in Settings.vue.
5. **`cq-renderer-capture-views#2`** — Home.vue leaked a `screenshot-response`
   listener + `config.onDidChange` subscription. → hoist handler + disposer into
   typed `data()` fields, add `beforeUnmount()` cleanup.

## Plan-check corrections folded (SOUND_WITH_FIXES)
- Home.vue instance fields declared in `data()` with explicit types
  (`onScreenshotResponse`, `configFolderDisposer`) — bare `this.x` fails vue-tsc
  TS2339.
- Gate is `npm run type-check` (vue-tsc); `npm run pack` strips types.

## Verify
- `npm run type-check` clean.
- `npm test` (no .vue surface, regression only).
- grep-confirmed: parent binds `@screenshot` (event, not `:screenshot`);
  template `:disabled` is inline (not the removed computed).
- Manual (QA/dev box): `npm run dev` + grep stderr for `[Vue warn]`; geometry
  persists across restart; no `config:set` storm on idle; single gallery unshift
  after an HMR reload.

## Files
- `SettingsModal.vue`, `SideBar.vue`, `Settings.vue` (renderer/components),
  `Home.vue` (renderer/views).

## Coordination
- No `index.ts` edits. Worker.vue has the identical listener-leak pattern —
  **out of scope here**, flagged for the Worker.vue-owning WP (WP-D touches
  Worker.vue but for the capture state machine, not this leak).
