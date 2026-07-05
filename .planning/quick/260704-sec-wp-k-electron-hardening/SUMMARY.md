---
type: quick-summary
slug: sec-wp-k-electron-hardening
status: partial
date: 2026-07-04
commit: bb06ecb
source: obs/code-quality audit — WP-K (Stage 0)
depends_on: WP-A
findings_closed: [cq-electron-security#2, cq-electron-security#3]
findings_deferred: [cq-electron-security#1, cq-electron-security#4]
---

# WP-K: Electron security hardening — Stage 0 COMPLETE, Stages 1-3 DEFERRED

WP-K is the one work package the plan itself flags as **high-risk and phased**.
Stage 0 (the low-risk, statically-verifiable wins) is executed; the
contextIsolation migration, CSP, and code-signing are deferred by design — they
require live Electron-runtime verification this repo's gates cannot provide, and
the plan's own risk notes mandate them as separate independently-testable PRs.

| Finding | Change |
|---------|--------|
| `cq-electron-security#2` | Removed @electron/remote entirely — a known privilege-escalation surface. A repo-wide grep confirmed the renderer has ZERO `remote.*` usage; the only references were three main-side calls (`remoteMain.initialize()` + one `enable()` per window). Dropped the `import`, `initialize()`, both `enable()` calls, the `package.json` dependency (`^2.1.3`), and the `'@electron/remote'` entries from `electron.vite.config.mjs` externals (main + renderer). Zero behavioral cost. |
| `cq-electron-security#3` | Added `hardenWindow(win, label)` installing `setWindowOpenHandler(() => deny)` (blocks `window.open`/target=_blank spawning a BrowserWindow) and a `will-navigate` guard that `preventDefault()`s any full-page navigation whose origin differs from the app's own (`isSameOriginAsApp`: dev-server origin when `ELECTRON_RENDERER_URL` is set, else the packaged `file://`). It is additive because the app never legitimately does either — external links open in the OS browser via `shell.openExternal`, and in-app routing is client-side vue-router `history.pushState` (which does not fire `will-navigate`). Both windows are hardened at the point they formerly called `remoteMain.enable()`. Blocked attempts are recorded via `log.warn` (WP-A). |

## Deferred (with rationale)
| Finding | Why deferred |
|---------|--------------|
| `cq-electron-security#1` (contextIsolation:true / nodeIntegration:false / sandbox) | The renderer does real in-process Node work — fs gallery ops + sharp encode + image-size + clipboard in Home.vue/Worker.vue, fs in ChangelogModal/Settings/SideBar, and the shared `config.ts`. Flipping contextIsolation requires a NEW `src/preload/index.ts` contextBridge, a `preload` section in electron.vite.config.mjs, and a per-file migration of ~10 renderer files. A missed `require` rewrite fails ONLY at runtime (`require is not defined`), which `vue-tsc`/`vitest` cannot catch — the exact class of silent-runtime-breakage the Vue3-registration lesson documents. Must be a separate PR verified against a running app. |
| CSP header (`onHeadersReceived`) | An over-tight policy blanks the Oruga/Bulma UI (needs `style-src 'unsafe-inline'`) or breaks Vite HMR in dev (needs `'unsafe-eval'` + `ws:`). The plan says it "must be tuned with DevTools open" — unverifiable here. |
| `cq-electron-security#4` (code signing) | `signAndEditExecutable:true` + a certificate needs a code-signing cert (absent on this box) and a verifiable signed build. `package.json` build.win left at `signAndEditExecutable:false`. |

## Verification
- Grep: **zero** `remoteMain`/`@electron/remote` references remain in `src/`.
- `npm run type-check` → clean (no dangling remote type reference).
- `npx vitest run` → **312/312 across 13 files** (unchanged — main-process security
  wiring has no unit surface; the nav-lock is verified structurally + by type-check).
- `npm run pack` → electron-vite build **green** (main 35 modules → index.js;
  renderer 87 modules built), confirming the externals + dependency removal doesn't
  break bundling. The `preload config is missing` warning is **pre-existing** — the
  app has never shipped a preload, which is precisely the gap the deferred Stages 1-2
  would fill.

## Coordination
`src/main/index.ts` is shared with WP-C/E/F; Stage 0's edits (import block, the
module-load `initialize()` line, and the `createWindow` window-preferences region)
don't collide with the WGC/diagnostics regions those WPs own. The deferred Stages 1-2
would reshape the IPC surface many WPs touch — a second reason to land them apart.

## Progress
Done: A, B, C, G, L, H, D, I, J, E, F, **K(Stage 0)** (12/13; K partial). Remaining:
**WP-M** (renderer + electron-mock test infra + logger.integration.test.ts — LAST,
depends on A/F/C/D/H). Follow-up backlog (separate PRs): WP-K Stages 1-3
(contextIsolation preload migration), CSP, code-signing.
