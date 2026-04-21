# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** — (v1.2 shipped 2026-04-20; awaiting `/gsd-new-milestone`)
**Last activity:** 2026-04-21 - Milestone v1.2 closed and archived — see `.planning/milestones/v1.2-ROADMAP.md`

## Project Reference

See: [.planning/PROJECT.md](./PROJECT.md) (updated 2026-04-21 after v1.2 milestone)

**Core value:** Make great-looking race screenshots effortless for sim racers, and gather community signal without friction.
**Current focus:** Planning next milestone (v1.3 or v2.0)

## Previous Milestones

- **v1.2 Feature Enhancements** (2026-04-20) — [archive](./milestones/v1.2-ROADMAP.md) · Filename configurator + Discord Bug & Feature Tracker Bot (10 plans, 294 tests, PR #25)

## Deferred Items

Items acknowledged and deferred at v1.2 close on 2026-04-21:

| Category | Item | Status |
|----------|------|--------|
| debug | capture-resolution-no-reshade | verifying |
| debug | gallery-delete-not-removing-file | awaiting_human_verify |
| quick_task | 260403-evq-implement-ui-format-configurator-for-pic | missing (close marker pending) |
| quick_task | 260410-n97-change-crop-watermark-from-hardcoded-54- | missing (close marker pending) |
| quick_task | 260410-v7a-add-prefer-top-left-watermark-crop-toggl | missing (close marker pending) |
| quick_task | 260414-r9x-add-file-based-info-debug-logging-system | missing (close marker pending) |
| quick_task | 260414-rvd-add-output-format-selector-jpeg-png-webp | missing (close marker pending) |

Quick tasks were delivered in v1.2 but their VERIFICATION.md files lack formal close markers — run `/gsd-cleanup` to add retroactively. Debug sessions carried into next milestone.

## Blockers/Concerns

PR #25 (feat/discord-bot → master) is open and awaits merge upstream on svglol/iracing-screenshot-tool. Local `master` is 42 commits ahead of `origin/master` until the PR merges.
