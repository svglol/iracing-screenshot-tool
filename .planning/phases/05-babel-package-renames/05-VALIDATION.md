---
phase: 5
slug: babel-package-renames
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-22
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from `05-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 (root `package.json` `"jest"` block; `bot/` workspace out of scope per CONTEXT D-01-derived bot/ exclusion) |
| **Config file** | `package.json` `"jest"` block (root) |
| **Quick run command** | `npm test` (passes `--passWithNoTests`) |
| **Full suite command** | `npm run jest:coverage` |
| **Lint check (no auto-fix)** | `npx eslint --ext .js,.ts,.vue ./ --no-fix` |
| **Renderer build** | `npm run pack:renderer` |
| **Main build** | `npm run pack:main` |
| **Combined build** | `npm run pack` (parallel main + renderer) |
| **Estimated runtime** | ~30s lint + ~5s jest + ~60s pack:renderer + ~30s pack:main → ~2 min full automated gate |

---

## Sampling Rate

- **After every task commit:** Run `npx eslint --ext .js,.ts,.vue ./ --no-fix && npm test` (~35s combined). Commit-1 task lints under the legacy parser (parser swap is commit 2). Commit-2 task lints under `@babel/eslint-parser` for the first time.
- **After every plan wave:** Run `npm install --legacy-peer-deps && npm run lint && npm test && npm run pack` (~3 min). Phase has a single wave: both commits land in wave 1 per D-09.
- **Before `/gsd-verify-work`:** Full automated gate green + lint count ≤1881 confirmed via per-rule baseline diff vs. `05-01-BASELINE.md` + baseline artifact committed and citable from commit 2 body.
- **Max feedback latency:** ~35s per task commit; ~3 min per wave; ~3 min phase gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | BABEL-01, BABEL-02 | — | N/A (pre-swap baseline capture; no runtime effect) | static | `test -f .planning/phases/05-babel-package-renames/05-01-BASELINE.md && grep -cE "Pre-swap lint count" .planning/phases/05-babel-package-renames/05-01-BASELINE.md` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | BABEL-01, BABEL-02 | T-05-01-01 / T-05-01-02 | Registry-scoped package install (typosquatting mitigated by `@babel/*` scope reservation); lockfile SHA-512 integrity written by `npm install` | smoke | `! grep -q '"babel-runtime"' package.json && ! grep -q '"babel-eslint"' package.json && grep -cE '"@babel/eslint-parser":\s*"\^7\.28\.6"' package.json` | ✅ | ⬜ pending |
| 05-01-03 | 01 | 1 | BABEL-01, BABEL-02 | T-05-01-04 | Clean commit staging (explicit paths, `git add -f` for gitignored baseline; no Co-Authored-By footer) | static | `git log -1 --format="%s" HEAD \| grep -cE "^chore\(deps\): rename babel packages$"` returns 1; `git log -1 --format="%B" HEAD \| grep -ci "Co-Authored-By"` returns 0; `git show --name-only HEAD \| grep -c "bot/docs/community-guide.md"` returns 0 | ✅ | ⬜ pending |
| 05-02-01 | 02 | 1 | BABEL-02 | — | N/A (config-only edit; dev-time lint layer) | static | `grep -cE "parser:\s*'@babel/eslint-parser'" .eslintrc.js` returns 1; `! grep -E "^\s*parser:" .eslintrc.js \| grep -v "parserOptions\|^\s*//"` returns no matches (no top-level parser) | ✅ | ⬜ pending |
| 05-02-02 | 02 | 1 | BABEL-02 | T-05-02-01 | Delegation chain intact: vue-eslint-parser → parserOptions.parser → @babel/eslint-parser → .babelrc inheritance; no `.vue` `<template>` parse errors | smoke + unit | `npx eslint --ext .js,.ts,.vue ./ --no-fix 2>&1 \| grep -cE "(Parsing error\|Cannot find module)"` returns 0; `count=$(npx eslint --ext .js,.ts,.vue ./ --no-fix 2>&1 \| grep -cE '^\s+[0-9]+:[0-9]+\s+(warning\|error)'); [ "$count" -le 1881 ]`; `npm test 2>&1 \| grep -E "Tests:.*256 passed"` returns 1 line; `npm run pack 2>&1 \| grep -cE "(ERROR\|Module not found)"` returns 0 | ✅ | ⬜ pending |
| 05-02-03 | 02 | 1 | BABEL-02 | T-05-02-02 | Commit body cites post-swap delta + baseline artifact; no `--no-verify`, no Co-Authored-By | static | `git log -1 --format="%s" HEAD \| grep -cE "^refactor\(eslint\):"` returns 1; `git log -1 --format="%B" HEAD \| grep -ci "Co-Authored-By"` returns 0; `git log -1 --format="%B" HEAD \| grep -cE "05-01-BASELINE\.md"` returns ≥1; `git log -2 --format="%s" \| tr '\n' ' ' \| grep -cE "refactor\(eslint\).*chore\(deps\)"` returns 1 (two-commit D-09 shape) | ✅ | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `05-01-BASELINE.md` created in commit 1 (pre-swap lint count + per-rule top-20 frequency table + per-file ≥50-warning hotspot list + timestamp + commit SHA of pre-swap tree). Captured via `npx eslint --ext .js,.ts,.vue ./ --no-fix` (NOT `npm run lint` — that runs `--fix` as a side effect, see Pitfall 7 in research).
- [x] No new test files needed — Phase 5 is a config/dep swap; existing 256 jest tests are the regression net.
- [x] No new framework install needed — Jest, ESLint, Babel scoped packages already installed.
- [x] `.planning/` is gitignored — `git add -f` per D-11 handles the baseline artifact in commit 1.

*Existing test infrastructure covers all phase requirements; only `05-01-BASELINE.md` creation is a Wave-0 prerequisite.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| _None_ | _N/A_ | _All Phase 5 behaviors have automated verification — config swap with no UI surface, no runtime user-facing change._ | _N/A_ |

*All phase behaviors have automated verification — Phase 5 is a parser-and-package rename with no manual UAT step (unlike v1.3 Phase 3's 4-view icon UAT).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (Phase 5 has only 2 commits, each with automated gates)
- [ ] Wave 0 covers all MISSING references (`05-01-BASELINE.md` creation)
- [ ] No watch-mode flags (Jest runs in CI mode via `npm test`; ESLint runs single-shot via `--no-fix`)
- [ ] Feedback latency < 180s (full wave gate ~3 min)
- [ ] `nyquist_compliant: true` set in frontmatter (set after planner fills the Per-Task Verification Map)

**Approval:** pending
