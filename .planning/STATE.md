# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** 1.2 - Feature Enhancements
**Last activity:** 2026-04-20 - Completed Plan 02-01 (Discord bot repo scaffolding: /bot/ subtree, Node 24 pinned deps, electron-builder + root-Jest exclusions)

### Current Phase
Phase 2: Discord Bug & Feature Tracker Bot - In Progress (Plan 1 of 10 complete)

### Completed Quick Tasks
- **260403-evq** (2026-04-03): Implemented UI filename format configurator — user-configurable token-based screenshot filename format with live preview, replacing hardcoded track-driver-counter pattern.

### Roadmap Evolution
- Phase 2 added: Implement a Discord bot for this project to report and track bugs and request features

### Decisions
- Token replacement uses split/join (literal, not regex) for field tokens; global regex for sanitization
- {counter} resolution deferred to Worker.vue for filesystem uniqueness checks
- Settings preview uses hardcoded example values (no live session dependency)
- Phase 2 bot lives in /bot/ subtree with its own package.json (ESM, Node 24+), NOT an npm workspace
- Phase 2 bot deps pinned exact (no ^/~) per RESEARCH.md §Standard Stack verified 2026-04-19 on npm registry
- Root electron-builder `build.files` adds defensive `"!bot/**/*"` negation even though allowlist already excludes /bot/ (belt-and-suspenders)
- Root `jest.testPathIgnorePatterns` includes `/bot/` so root CommonJS Jest skips bot ESM tests (bot tests run via `cd bot && npm test`)

### Performance Metrics

| Phase | Plan | Duration | Tasks | Files | Completed |
|-------|------|----------|-------|-------|-----------|
| 02 | 01 | 12 min | 2 | 7 | 2026-04-20 |

### Blockers/Concerns
None

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260403-evq | Implement UI format configurator for picture naming with session field chips and custom text | 2026-04-03 | See git log | Verified | [260403-evq-implement-ui-format-configurator-for-pic](./quick/260403-evq-implement-ui-format-configurator-for-pic/) |
| 260410-n97 | Change crop watermark from hardcoded 54/30px to relative 3% of dimensions | 2026-04-10 | 0a9d8f5 | | [260410-n97-change-crop-watermark-from-hardcoded-54-](./quick/260410-n97-change-crop-watermark-from-hardcoded-54-/) |
| 260410-v7a | Add prefer top-left watermark crop toggle with alternative 6% all-sides crop | 2026-04-10 | 13251e5 | | [260410-v7a-add-prefer-top-left-watermark-crop-toggl](./quick/260410-v7a-add-prefer-top-left-watermark-crop-toggl/) |
| 260414-r9x | Add file-based INFO/DEBUG logging system across the capture pipeline | 2026-04-14 | 3cb1b09 | | [260414-r9x-add-file-based-info-debug-logging-system](./quick/260414-r9x-add-file-based-info-debug-logging-system/) |
| 260414-rvd | Add output format selector (JPEG/PNG/WebP) with config persistence and format-aware capture pipeline | 2026-04-14 | 22d1cd5 | | [260414-rvd-add-output-format-selector-jpeg-png-webp](./quick/260414-rvd-add-output-format-selector-jpeg-png-webp/) |
