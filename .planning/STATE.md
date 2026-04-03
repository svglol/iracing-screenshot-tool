# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** 1.2 - Feature Enhancements
**Last activity:** 2026-04-03 - Completed quick task 260403-evq (filename format configurator)

### Current Phase
Phase 1: Filename Format Configurator - Complete

### Completed Quick Tasks
- **260403-evq** (2026-04-03): Implemented UI filename format configurator — user-configurable token-based screenshot filename format with live preview, replacing hardcoded track-driver-counter pattern.

### Decisions
- Token replacement uses split/join (literal, not regex) for field tokens; global regex for sanitization
- {counter} resolution deferred to Worker.vue for filesystem uniqueness checks
- Settings preview uses hardcoded example values (no live session dependency)

### Blockers/Concerns
None
