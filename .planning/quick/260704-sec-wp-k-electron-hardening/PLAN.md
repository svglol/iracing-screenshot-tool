---
type: quick
slug: sec-wp-k-electron-hardening
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-K, plan-checked SOUND_WITH_FIXES (phased, high-risk)
depends_on: WP-A (log.warn for blocked-navigation lines)
findings_closed: [cq-electron-security#2, cq-electron-security#3]
findings_deferred: [cq-electron-security#1, cq-electron-security#4]
---

# WP-K: Electron security hardening (Stage 0 executed; Stages 1-3 deferred)

Both windows run the insecure trifecta (nodeIntegration:true / contextIsolation:false
/ webSecurity:false); @electron/remote is enabled; there is no nav-lock, CSP, or code
signing. WP-K is explicitly **phased** in the plan — Stage 0 is low-risk and
independently shippable; Stages 1-3 are high-risk.

## Executed — Stage 0 (provably safe under static gates)
1. **`cq-electron-security#2`** — remove @electron/remote. Grep confirms ZERO
   renderer `remote.*` usage; only three main-side calls existed (initialize + two
   enable). Dropped the import, `remoteMain.initialize()`, both `enable()` calls, the
   `package.json` dependency, and the `'@electron/remote'` entries in
   `electron.vite.config.mjs` externals (main + renderer).
2. **`cq-electron-security#3`** — `hardenWindow(win,label)` helper:
   `setWindowOpenHandler(deny)` + a `will-navigate` guard blocking any full-page
   navigation off the app's own origin (`isSameOriginAsApp`: dev-server origin when
   `ELECTRON_RENDERER_URL` set, else `file://`). Additive — the app opens external
   links via `shell.openExternal` (OS browser, not an in-app window) and routes with
   client-side vue-router (pushState, does not fire will-navigate). Installed on both
   windows where they previously called `remoteMain.enable()`. Blocks → `log.warn`.

## Deferred — Stages 1-3 (require live-runtime verification / a certificate)
These CANNOT be validated by this repo's gates (`vue-tsc` + `vitest` do not exercise
the renderer runtime — a missed `require` rewrite fails ONLY at runtime, the exact
hazard the Vue3-registration lesson documents). The plan's own risk notes mandate
them as separate, independently-testable PRs:
- **`cq-electron-security#1`** (contextIsolation:true / nodeIntegration:false /
  sandbox): needs a NEW `src/preload/index.ts` contextBridge + a per-file migration of
  ~10 renderer files (Home.vue, Worker.vue, SettingsModal, SideBar, Settings,
  ChangelogModal, TitleBar, PromoCard, HelpModal, main.ts, config.ts) that do
  in-process fs/sharp/image-size/clipboard work, plus a `preload` section in
  electron.vite.config.mjs. Stage 3 (sandbox:true) further relocates fs/sharp into
  main-process ipcMain.handle channels.
- **CSP** (`onHeadersReceived`): needs iterative DevTools tuning so it doesn't blank
  the Oruga/Bulma UI (unsafe-inline styles) or break Vite HMR (dev needs unsafe-eval +
  ws:).
- **`cq-electron-security#4`** (`signAndEditExecutable:true` + certificate): needs a
  code-signing cert (absent on this box) and a verifiable signed build; `package.json`
  build.win left at `signAndEditExecutable:false`.

## Verify
- Grep: zero `remoteMain`/`@electron/remote` references remain in `src/`.
- `npm run type-check` clean; `npx vitest run` 312/312.
- `npm run pack` (electron-vite build) green — main 35 modules, renderer built —
  confirms the externals + dependency removal doesn't break bundling. (The
  `preload config is missing` warning is pre-existing — the app has never had a
  preload; that is exactly the gap Stages 1-2 would fill.)

## Files
- `src/main/index.ts` (remote removal + hardenWindow), `electron.vite.config.mjs`
  (externals), `package.json` (dependency).

## Coordination
`src/main/index.ts` shared with WP-C/E/F — Stage 0's edits are the import block, the
module-load `initialize()` line, and the `createWindow` window-preferences region,
none of which collide with the WGC/diagnostics regions those WPs own. The deferred
Stages 1-2 would reshape the IPC surface many WPs touch, which is a second reason to
land them separately.
