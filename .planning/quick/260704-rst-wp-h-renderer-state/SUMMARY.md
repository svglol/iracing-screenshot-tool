---
type: quick-summary
slug: rst-wp-h-renderer-state
status: complete
date: 2026-07-04
commit: 12a9140
source: obs/code-quality audit — WP-H
depends_on: none
findings_closed: [cq-renderer-settings-ui#1, cq-renderer-settings-ui#2, cq-renderer-settings-ui#3, cq-renderer-settings-ui#4, cq-renderer-capture-views#2]
---

# WP-H: Renderer state / persistence / dead code — COMPLETE

Four renderer-only defects; no `src/main` edits.

| Finding | Change |
|---------|--------|
| `cq-renderer-settings-ui#1` | SettingsModal.vue persisted the ultrawide/Surround restore geometry (`defaultScreen*`) only in a `beforeUnmount()` that **never fires** under the v-show Oruga modal (mounted for the app lifetime) → geometry silently lost on restart. Replaced with per-key watchers carrying the same range validation (**persist-only** — sending the IPC per keystroke would live-resize iRacing mid-typing via index.ts) + a `config.set` in `restoreNow()`; deleted the dead `beforeUnmount()`. |
| `cq-renderer-settings-ui#2` | SideBar.vue persisted six config keys via blocking `sendSync 'config:set'` inside `updated()`, which fires on **every** reactive change (VRAM poll, `takingScreenshot` latch, notifications) — a write storm on idle re-renders. Moved into per-key watchers guarded by `config.get()!==value` (also stops mounted()'s config→field copy and the reshade `onDidChange` round-trip from writing the value back). Kept the VRAM quantization guard; corrected its now-stale "fire updated()'s config writes" comments (3 sites). |
| `cq-renderer-settings-ui#3` | Removed SideBar's unused `props:['screenshot']` (the parent binds `@screenshot`, an **event**) and the dead `disabled()` computed (the template uses an inline `:disabled`). |
| `cq-renderer-settings-ui#4` | Removed the two `:destroy-on-hide="false"` bindings in Settings.vue (no such prop in Oruga 0.13 — silent no-ops encoding the same wrong "modal destroys content on hide" assumption behind the persistence bug). |
| `cq-renderer-capture-views#2` | Home.vue leaked a `screenshot-response` `ipcRenderer` listener + a `config.onDidChange('screenshotFolder')` subscription (registered in `mounted()`, no teardown). Hoisted the handler + captured the disposer into typed `data()` fields, added `beforeUnmount()` cleanup — so an HMR reload no longer stacks duplicate handlers (which would unshift N gallery items per capture). |

## Plan-check correction folded (SOUND_WITH_FIXES)
Home.vue's hoisted fields are declared in `data()` with explicit types
(`onScreenshotResponse: null as ((event: unknown, filePath: string) => void) | null`,
`configFolderDisposer: null as (() => void) | null`) — bare `this.x` assignments
fail vue-tsc **TS2339** under this repo's strict `this` typing. The compile gate
is `npm run type-check` (vue-tsc), NOT `npm run pack` (esbuild strips types and
would pass the broken variant).

## Verification
- `npm run type-check` → **clean** (exit 0).
- `npm test` → **339/339** (no component-test surface for .vue; regression only).
- **grep-verified** the two memory-flagged risks: the parent binds `@screenshot`
  (event) not `:screenshot`, so removing the prop can't warn; the template's
  `:disabled="!iracingOpen || takingScreenshot"` is inline, not the removed
  computed.
- Manual (QA/dev box, not run here): `npm run dev` + grep stderr for `[Vue warn]`
  (per project memory feedback_vue3_registration_audit); geometry persists across
  a full restart (cross-check `config.json`); no `config:set` IPC on idle
  re-renders; exactly one gallery unshift after an HMR reload of Home.vue.

## Coordination
Worker.vue has the **identical** listener-leak pattern (5 `ipcRenderer.on` in its
`mounted()`, incl. `screenshot-request` whose double-registration would run two
concurrent captures) — **out of scope here**; flagged for WP-D (which owns
Worker.vue) so the leak isn't left half-fixed.
