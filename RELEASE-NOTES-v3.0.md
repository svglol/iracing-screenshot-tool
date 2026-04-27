# v3.0.0 — The Modernization Release

This is a major release. Almost the entire stack underneath the app has been rebuilt — frontend, build system, type system, test runner — alongside two big new features (a virtualized gallery and a Discord community bot) and a long-standing capture-resolution bug finally chased to ground.

## ✨ Highlights

### Reliable screenshot resolution on every machine
Non-ReShade captures could intermittently save at the monitor's native resolution instead of the resolution you selected — most reproducible on slower / loaded machines. The capture pipeline now verifies stream dimensions against the resized iRacing window before writing the file, retrying for up to 8 seconds if the OS hasn't finished re-rendering yet, with ±2px tolerance for the encoder's even-dimension rounding. Silent wrong-resolution captures should be gone.

### Brand-new gallery
The thumbnail strip below the main image was rebuilt from scratch:
- **Virtualized rendering** — only thumbs near the active one mount, so scrolling stays smooth no matter how many screenshots you have
- **Windowed strip with a larger centered preview** — easier to see what you're looking at
- **Lazy thumbnail generation** — thumbs are built on demand around the active item rather than for every image at once
- Visual polish: tighter spacing, padding inside thumbs, more breathing room around the active highlight

### Discord community bot
A new Discord bot lets you file bugs and feature requests, browse and vote on existing ones, and have GitHub issue state changes posted back to Discord — all without ever opening GitHub. See [`bot/docs/community-guide.md`](bot/docs/community-guide.md) for the full walkthrough.

## 🛠️ Under the hood (the "massive redesign")

For users running the app, this section is invisible — but it's why most of the 224 commits exist, and it makes future development dramatically faster.

### Vue 3 migration
Migrated every single-file component and the renderer entrypoint from Vue 2 to Vue 3:
- `createApp`, vue-router 4 API, `useOruga()` composables
- Vue 2 idioms removed: `$set` / `$delete`, `beforeDestroy`, `slot-scope`, legacy `<transition>`
- Buefy / Bulma → Oruga UI + Bulma 1.0 with the modern `@use` SCSS pattern
- Per-component Oruga registration (with a follow-up audit because raw-component `app.use()` calls silently no-op without `[Vue warn]`)

### Build system replaced
Webpack → **electron-vite** end-to-end:
- New `electron.vite.config.mjs` covering main, preload, and renderer environments
- EJS template retired in favour of Vite's `index.html`
- Dev runner / webpack configs deleted
- npm scripts rewired: `dev`, `pack`, `build`, `build:dev`, `build:installer`

### TypeScript everywhere
- `src/main/*.js` → `.ts`
- `src/renderer/*.js` → `.ts`
- `src/utilities/*.js` → `.ts`
- 10 `.vue` SFCs migrated to `<script lang="ts">`
- `vue-tsc --noEmit` passes with 0 errors

### Tooling
- ESLint flat config, with `typescript-eslint` v8 wired natively (separate parser scoping for `_scripts/` vs renderer/main)
- Prettier integrated through ESLint
- Vitest replaces the old test setup — 256 tests passing

## 🐛 Other fixes
- Vite/Electron renderer-bundle resolution: converted the surviving CommonJS `require(...)` paths to ES `import` so Vite can statically bundle them (avoids `Cannot find module` at runtime)
- `@vue/devtools` v8 is now a standalone app — removed the broken in-process `installDevTools()` call
- SideBar emits `screenshot` instead of colliding with the native `click` event
- Oruga component plugins explicitly registered so `<o-*>` globals resolve
- `$oruga.notification.open` → `useOruga().notification.open`
- HelpModal: removed orphan `<p>` tags
- Settings: disabled-input contrast restored, addon layout fixed, toggles styled as light-switch
- SideBar tooltips: variant colors restored, prominence toned down
- Modals: blurred + slightly opaque backdrop for full-screen modals

## ⬆️ Upgrading
This is a clean upgrade — settings and screenshots are stored in the same locations as v2.x. First launch may regenerate gallery thumbnails on demand (lazy generation kicks in only as you browse).

## 🙏 Thanks
To everyone who reported the wrong-resolution screenshots in the field — the diagnostic logs you sent back made the fix possible.

---

*Full commit log: `git log v2.1.0..v3.0.0`*
