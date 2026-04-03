---
quick-task: 260403-evq
plan: 01
subsystem: screenshot-filename
tags: [ui, config, electron, vue, filename-format]
dependency_graph:
  requires: []
  provides: [configurable-filename-format, filename-format-ui]
  affects: [src/utilities/filenameFormat.js, src/utilities/config.js, src/renderer/components/SettingsModal.vue, src/renderer/views/Worker.vue]
tech_stack:
  added: [filenameFormat.js utility module]
  patterns: [token-based format string, electron-store schema extension, Vue computed/watcher pattern]
key_files:
  created:
    - src/utilities/filenameFormat.js
  modified:
    - src/utilities/config.js
    - src/renderer/components/SettingsModal.vue
    - src/renderer/views/Worker.vue
decisions:
  - Used split/join for token replacement (literal, non-regex) per plan spec; global regex sanitization per plan checker warning
  - {counter} left unresolved in resolveFilenameFormat so Worker handles filesystem uniqueness
  - filenamePreview uses hardcoded example values (not live session data) since Settings can be opened without an active session
metrics:
  duration: "~3 minutes"
  completed: 2026-04-03
  tasks_completed: 3
  files_created: 1
  files_modified: 3
---

# Quick Task 260403-evq: Filename Format Configurator Summary

**One-liner:** User-configurable screenshot filename format via token-based field selector with live preview, replacing the hardcoded `trackName-driverName-count` pattern.

## What Was Built

### Task 1 - filenameFormat utility + config schema (commit acb0dd7)

Created `src/utilities/filenameFormat.js` with:
- **21 field definitions** across 4 categories (Track: 5, Driver: 9, Session: 3, Meta: 4)
- `FILENAME_FIELDS` array — each entry has `token`, `label`, `category`, and a `resolve(sessionInfo, telemetry)` function
- `DEFAULT_FORMAT = '{track}-{driver}-{counter}'` — matches the previous hardcoded behavior exactly
- `resolveFilenameFormat(formatString, sessionInfo, telemetry)` — resolves all tokens except `{counter}` (left for Worker), then sanitizes Windows-unsafe characters via global regex `replace(/[\\/:*?"<>|]/g, '_')`
- `findDriver(sessionInfo, telemetry)` helper — looks up the `CamCarIdx` driver from `DriverInfo.Drivers`

Added `filenameFormat` to `src/utilities/config.js` schema after `screenshotKeybind`:
```javascript
filenameFormat: {
  type: 'string',
  default: '{track}-{driver}-{counter}'
}
```

### Task 2 - SettingsModal UI (commit e8ee9f3)

Added a "Filename Format" section to `SettingsModal.vue` between the Keybind and Disable Tooltips sections:
- Editable text input bound to `filenameFormat` data property
- Reset button restoring `DEFAULT_FORMAT`
- Live preview computed (`filenamePreview`) using hardcoded example values, appending `.png`
- `fieldsByCategory` computed grouping all 21 fields by category
- Clickable `b-tag` chips (one per field) that call `insertField(token)` to append the token to the format string
- `filenameFormat` watcher persists to config on change (same pattern as other settings)

### Task 3 - Worker.vue integration (commit 23151aa)

Replaced the hardcoded `getFileNameString()` function:
- Reads `filenameFormat` from config (with fallback to default)
- Calls `resolveFilenameFormat` to expand all tokens except `{counter}`
- If format contains `{counter}`: increments from 0 until a unique filename is found (identical to previous behavior)
- If format omits `{counter}`: attempts resolved name, appends `-1`, `-2`, etc. only on collision

## Deviations from Plan

**1. [Rule N/A - Context Adaptation] electron-store not available in test environment**

The plan's verify command for Task 1 tested `config.get('filenameFormat')` via Node.js directly. Since `electron-store` requires the Electron runtime, this part of the verify command failed with `MODULE_NOT_FOUND`. The config.js file change was verified by direct file inspection instead. The functional behavior is correct — the schema entry is present with the correct default value.

No other deviations. Plan executed as written.

## Known Stubs

None. All tokens resolve to real data from sessionInfo/telemetry. The preview uses hardcoded examples (intentional — see decisions), not stubs that affect functionality.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/utilities/filenameFormat.js | FOUND |
| src/utilities/config.js | FOUND |
| src/renderer/components/SettingsModal.vue | FOUND |
| src/renderer/views/Worker.vue | FOUND |
| commit acb0dd7 (Task 1) | FOUND |
| commit e8ee9f3 (Task 2) | FOUND |
| commit 23151aa (Task 3) | FOUND |
