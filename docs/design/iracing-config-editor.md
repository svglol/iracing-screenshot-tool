# iRacing Configuration Editor

Status: v1.1 (Monitor/Display + Graphics tabs) — 2026-08-15
Sibling of `graphics-profiles.md`; read that first for the shared ground rules
(iRacing folder resolution, the sim-rewrites-on-exit model, byte-exactness).

## 1. What it is

A routed page (`/config`, behind the app's first navigation rail) that edits
individual settings inside iRacing's `rendererDX11*.ini` files with typed
controls, modeled on irSidekick Profiles: a Monitor/Display tab with the
window-placement and fullscreen `[Display]` settings and a monitor-layout
visualization, and a Graphics tab
curating ~41 `[Graphics Options]` settings (quality, AA, post-processing,
performance, misc) with optional mirroring into `[Replay Graphics]`. Both tabs
lay their groups out in two auto-balanced columns; a field whose pending value
cannot be saved gets a highlighted row plus an inline hint stating the exact
constraint ("Enter a whole number between 640 and 30000."). A configuration
dropdown selects which renderer file to edit —
`rendererDX11Monitor.ini`, `Oculus`, `OpenVR`, `OpenXR`, or the suffix-less
legacy `rendererDX11.ini` ("Legacy"), whichever exist on disk. iRacing's UI
can also keep custom per-mode configs (`rendererDX11Monitor - Screenshots.ini`);
those are listed by their bare custom name, exactly as iRacing's own config
switcher shows them, sorted directly behind their base mode.

Explicitly **separate from Graphics Profiles**: profiles swap whole files as
opaque bytes; this page edits values in place. The two compose — an edit here
legitimately flips the profiles modal's active state to *"based on X, with N
settings changed"*. That is correct behavior, not a bug report.

## 2. The safety model

Everything follows from one constraint: these files belong to iRacing, which
holds them in memory and rewrites them on exit.

1. **Closed writable surface.** Only settings described in
   `utilities/iracing-settings-schema.ts` can be written, and the writer
   (`utilities/ini-document.ts`) can only REPLACE existing value spans — it
   cannot create keys, sections, or files. A missing curated key renders
   disabled ("Not present in this file") and refuses with `keyNotFound`.
2. **Byte exactness.** The writer parses in latin1 space (a lossless 1:1
   byte↔char mapping), so serializing reproduces the input byte-for-byte
   regardless of the file's real encoding (ANSI / UTF-8 / UTF-8+BOM), and a
   patch changes exactly the value bytes — comments, padding, inline
   `; trailers`, CRLF, and the BOM all survive. Golden tests pin this.
3. **Never while iRacing runs.** EVERY write is guarded (`iracingRunning`,
   from the same telemetry-readiness signal the profiles feature uses) —
   stricter than profiles, which only guard apply.
4. **Never blind.** A save carries the mtime the editor read; a mismatch
   refuses with `staleFile`. The page re-checks on window focus and on
   `iracing-disconnected` (the exact moment iRacing rewrites its inis): with
   no local edits the fresh file is adopted silently, with edits the user
   chooses via a Reload notice.
5. **Never without a backup.** Pre-save backup into
   `userData/iracing-config/.backups/` — this feature's OWN directory and
   MAX-10 rotation, deliberately not shared with graphics-profiles' backups so
   rapid setting tweaks cannot evict pre-apply safety nets. Write mechanics
   (atomic same-dir staging, ISO-stamped rotation) live in the shared
   `main/atomic-file.ts`, extracted from the profiles store unchanged.

## 3. Layering

```
utilities/ini-document.ts          pure; line-preserving parse + span patch
utilities/iracing-settings-schema.ts  pure data; descriptor per curated setting
utilities/iracing-paths.ts         + renderer-mode filename helpers
main/atomic-file.ts                shared writeAtomic/backup/prune
main/iracing-config-store.ts       fs + guard pipeline (list/read/save)
main/index.ts                      iracing-config:{modes,read,save,displays}
renderer/views/IracingConfig.vue   page: buffer, dirty/save, notices
renderer/components/iracing-config/{SettingField,FovCalculator,MonitorLayout}.vue
renderer/components/NavRail.vue    the app's navigation (48px rail; since
                                   2026-08-15 also Settings/Help pages + a
                                   Discord button — the old sidebar toolbar
                                   modals became rail pages)
renderer/components/ConfigurationPicker.vue
                                   title-bar chip (always top-right): which
                                   stored profile the live Monitor ini
                                   matches + the Graphics Profiles dialog;
                                   syncs with the editor via the
                                   'renderer-ini-changed' window event
                                   (renderer/ini-events.ts)
```

The edit buffer holds only ids whose value differs from disk; save sends that
diff, main validates it again (schema + rails), and success returns the fresh
mtime. Values read from disk are displayed as-is even when iRacing formatted
them in ways the write gate would reject (`600.000000` for an int) — validity
is only enforced on what the page is about to write.

## 4. Replay graphics pairing

The Graphics tab carries a persisted switch ("Also apply to replay graphics",
`iniEditorPairReplay`, default on). With it on, a save mirrors every edit
whose descriptor is flagged `pairedReplay` into `[Replay Graphics]` — **but
only when the file actually contains the key there**. The writer never
inserts, and real renderer inis routinely omit some replay twins, so an
absent twin silently skips its mirror rather than failing the save. The
`pairedReplay` flags were transcribed from a real file's `[Replay Graphics]`
key list; over-flagging is harmless (presence-guarded), under-flagging just
loses a mirror.

Note: v1.0 shipped both a FOV calculator and a curated `[MonitorSetup]`
section; both were removed the same day by user decision. `[MonitorSetup]`
(screen geometry, viewing distance, SMP, RenderViewPerMonitor) is now
uncurated — iRacing's own auto-configuration manages it, and the sidebar's
`checkIracingConfig` warning still covers the RenderViewPerMonitor screenshot
banding case app-wide. The Monitor tab's "Advanced display" group (deviceIdx,
displayRotateMode, pixelRatio, pixelRatioWindowed, ModeScaling, HDRFormat)
was likewise removed by user decision 2026-08-15 — expert-only knobs iRacing
manages itself; the two remaining groups auto-balance one per column.

## 5. Known limits and deferred work

- **[Display] enums not yet promoted** (`windowedAlignment`,
  `fullScreenDepth` — the rest of this list left the schema with the Advanced
  display group): still plain numeric inputs with "undocumented" help text.
  Transcribed meanings from a live install 2026-08-15: windowedAlignment
  0=none/1=center/2=top-left; fullScreenDepth is a color depth, 32 or 64.
  (For the removed keys, should they ever return: ModeScaling
  0=unspecified/1=centered/2=stretched; HDRFormat 0=SDR/1=HDR10 or HDR16F
  depending on fullScreenDepth; displayRotateMode
  0=auto/1=landscape/2=landscape-inv/3=portrait/4=portrait-inv.)
- **deviceIdx ↔ Windows display mapping**: iRacing numbers DXGI outputs,
  Electron numbers Windows displays; there is no reliable crosswalk. The
  layout visual highlights the iRacing window by coordinate containment and
  says "estimated". Mixed-DPI arrangements approximate physical origins by
  per-display scaleFactor.
- **Duplicate keys**: the writer patches the LAST occurrence, matching
  `parseIni`'s read merge. iRacing's own reader is assumed last-wins;
  unverified (real files carry no duplicates).
- **Graphics tiers: RESOLVED 2026-08-15.** Every [Graphics Options] enum was
  transcribed from a live install's inline comment trailers and cross-checked
  against the in-sim settings screens; all ship as selects (the schema is the
  reference). Notable corrections found along the way: `ShadowDetail` is a
  0/1 fewer/maximum choice, `MirrorDetail` and `DynamicShadowMaps` are
  booleans, `MotionBlurStrength` is 0–4 off→ultra, `MSAAUseFilter` runs to 3
  (simple/legacy), `MSAASamples` is exactly {2,4,8}, `MaxPreRenderedFrames`
  is 0–4, `MaxCarsToDraw` 10–64, `MaxCarsToDrawInMirrors` 4–64,
  `SharpeningAmount` 10–300, `SysMemToUseMB` 1024–32768.
- **Per-field "replay value differs" indicator**: deferred; pairing is
  save-side only for now.
- **Localization**: the `iniEditor` namespace ships English-only by decision;
  the other 19 catalogues carry the English strings verbatim (key-set parity
  is type- and test-enforced, so the keys cannot exist in en.ts alone). A
  dedicated translation pass replaces them later.

## 6. Testing

- `ini-document.test.ts` — golden round-trip + patch byte-exactness (the
  load-bearing suite). Fixtures are latin1 Buffers built in code, never
  fixture files: a fixture that travels through tooling with encoding
  opinions cannot be trusted to keep its bytes.
- `iracing-config-store.test.ts` — real temp dirs: mode discovery, guard
  refusals (running / stale / validation / keyNotFound), byte-identical saves,
  backup rotation, no staging litter, and the replay-pairing matrix (mirrors
  when present, skips absent twins, off-switch untouched).
- `iracing-settings-schema.test.ts` — every descriptor's i18n keys resolve;
  structural invariants.
- Renderer: `NavRail.test.ts`, `SettingField.test.ts`,
  `IracingConfig.test.ts` (stubbed-IPC mounts per the GraphicsProfilesModal
  harness; the page test mounts the real child components).
