---
phase: 4
slug: prettier-3-reformat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `04-RESEARCH.md §Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 (main repo) — covers `src/main/*.test.js` + `src/utilities/*.test.js`. `bot/` has its own Jest but is excluded from this phase (`testPathIgnorePatterns`). |
| **Config file** | `package.json` `"jest"` block (main repo); `bot/package.json` (not in scope) |
| **Quick run command** | `npm test` (uses `--passWithNoTests`) |
| **Full suite command** | `npm run jest:coverage` |
| **Formatter check** | `npx prettier --check "{src,_scripts}/**/*.{js,ts,vue}"` (or `npm run prettier -- --check`) |
| **Linter check** | `npm run lint` |
| **Renderer build check** | `npm run pack:renderer` |
| **Integration smoke** | `npm run dev` + one manual screenshot round-trip (D-12) |
| **Estimated runtime** | ~30s lint + ~10s prettier-check + ~5s jest + ~60s pack:renderer → ~2min automated gate |

---

## Sampling Rate

- **After every task commit:** Run quick gate — `npm run lint` + `npm run prettier -- --check` + `npm test` (~45s combined)
- **After every plan wave:** Full sequence — `npm install --legacy-peer-deps` (if deps changed) → lint → prettier check → test → `npm run pack:renderer` (~3–5 minutes)
- **Before `/gsd-verify-work`:** Full suite green + D-12 manual smoke approved
- **Max feedback latency:** ~60 seconds for the fast gates (lint + prettier check + jest)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-00-01 | 00 (hand-fix) | 0 | TOOL-01 | — / — | N/A — formatter prep | static | `npx prettier --check "src/renderer/components/HelpModal.vue"` exits 0 after fix (no parser error) | ✅ W0 commit | ⬜ pending |
| 04-00-02 | 00 (baseline) | 0 | TOOL-01 | — / — | N/A — pre-flight measurement | static | `test -f .planning/phases/04-prettier-3-reformat/04-00-BASELINE.md && grep -cE "^- \*\*Pre-upgrade lint warning count:" .planning/phases/04-prettier-3-reformat/04-00-BASELINE.md` returns 1 | ✅ W0 commit | ⬜ pending |
| 04-01-01 | 01 (chore-deps) | 1 | TOOL-01 | — / — | N/A — devDep bump | static | `grep -cE '"prettier": "\^3\.' package.json` returns 1; `grep -cE '"eslint-config-prettier": "\^9\.' package.json` returns 1; `grep -cE '"eslint-plugin-prettier": "\^5\.' package.json` returns 1 | ✅ | ⬜ pending |
| 04-01-02 | 01 (chore-deps) | 1 | TOOL-01 | — / — | N/A — peer resolution | static | `npm ls prettier 2>/dev/null \| grep -cE "prettier@3\."` returns ≥ 1; `npm ls eslint-plugin-prettier 2>/dev/null \| grep -cE "eslint-plugin-prettier@5\."` returns ≥ 1 | ✅ | ⬜ pending |
| 04-01-03 | 01 (chore-deps) | 1 | TOOL-01 | — / — | N/A — no lint regression | static | `npm run lint` exits 0 AND warning count ≤ Wave-0 baseline captured in 04-00-BASELINE.md | ✅ | ⬜ pending |
| 04-01-04 | 01 (chore-deps) | 1 | TOOL-01 | — / — | N/A — test suite | unit | `npm test` exits 0 (`--passWithNoTests` acceptable) | ✅ | ⬜ pending |
| 04-02-01 | 02 (format) | 2 | TOOL-01 | — / — | N/A — formatter run | static | `npm run prettier` completes (reformats ~34 files); `git status` shows only `src/**` and `_scripts/**` modifications (no `bot/`, no root config files) | ✅ | ⬜ pending |
| 04-02-02 | 02 (format) | 2 | TOOL-01 | — / — | N/A — formatter check | static | `npm run prettier -- --check` exits 0 with output `All matched files use Prettier code style!` | ✅ | ⬜ pending |
| 04-02-03 | 02 (format) | 2 | TOOL-01 | — / — | N/A — no lint regression post-reformat | static | `npm run lint` exits 0 AND warning count ≤ Wave-0 baseline | ✅ | ⬜ pending |
| 04-02-04 | 02 (format) | 2 | TOOL-01 | — / — | N/A — test suite post-reformat | unit | `npm test` exits 0 | ✅ | ⬜ pending |
| 04-02-05 | 02 (format) | 2 | TOOL-01 | — / — | N/A — webpack renderer builds | integration | `npm run pack:renderer` exits 0; `dist/renderer.js` written; no new webpack warnings/errors attributable to reformatted source | ✅ | ⬜ pending |
| 04-02-06 | 02 (format) | 2 | TOOL-01 | — / — | N/A — commit discipline | static | `git log -1 --pretty=%s` matches `^format: prettier 3$`; HEAD~1 matches `^chore\(deps\): `; HEAD commit touches only `src/**/*.{js,ts,vue}` + `_scripts/**/*.{js,ts,vue}` paths | ✅ | ⬜ pending |
| 04-02-07 | 02 (format) | 2 | TOOL-01 | — / — | N/A — manual smoke (D-12) | manual | `npm run dev`; take 1 screenshot via hotkey or manual button; confirm gallery thumbnail appears; devtools console shows no new errors attributable to reformatted source | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **HelpModal.vue hand-fix** (04-00-PLAN if separate, OR a pre-reformat edit inside commit 2 with explicit call-out): remove the orphan `</p>` parser error so `npm run prettier -- --check` can ever exit 0. Commit recommendation per research: dedicated `fix(HelpModal): remove orphan p tags` commit before commit 1, making this a 3-commit phase shape (fix + chore(deps) + format).
- [ ] **Pre-reformat lint-warning baseline** — `.planning/phases/04-prettier-3-reformat/04-00-BASELINE.md` recording: (a) current `npm run lint` warning count; (b) per-file breakdown of any existing warnings; (c) `prettier --check` file-count (expected: 34 files flagged, 1 parser error pre-fix); (d) `dist/renderer.js` byte count post-`npm run pack:renderer` (optional, supports A2's "no runtime impact" framing).
- [ ] **Renderer bundle baseline (optional but recommended)** — `npm run pack:renderer && wc -c dist/renderer.js` for post-reformat sanity comparison. Mirrors Phase 3's SC4 pattern.
- [ ] **`dist/` regeneration sanity** — after commit 1's `npm install --legacy-peer-deps`, the `postinstall` script runs `electron-builder install-app-deps` + `electron-rebuild`; confirm no unexpected modifications to tracked files.

*No new test infrastructure is required. Existing Jest + `prettier --check` + `npm run lint` + `npm run pack:renderer` cover SC1/SC2/SC3.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Screenshot round-trip still works on reformatted renderer source | TOOL-01 / SC3b | Runtime behavior requires an active Electron session; no headless harness exists in the repo. D-12 explicitly chose automated-first + manual smoke. | `npm run dev`. When the app boots: take one screenshot via the normal hotkey OR the manual capture button. Confirm the thumbnail appears in the gallery. Open Electron devtools (Ctrl+Shift+I) → Console; filter `Error`/`Warn`; confirm no new entries attributable to reformatted source code (pre-existing `BrowserWindow.addDevToolsExtension` error from Phase 3 is carry-over, not caused by Prettier 3). |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (all auto tasks above are single-commit-grained; manual smoke is the final gate only)
- [ ] Wave 0 covers all MISSING references (HelpModal parser error + lint baseline)
- [ ] No watch-mode flags used in any automated command (all commands exit on completion)
- [ ] Feedback latency < 60 seconds for the fast gates (lint + prettier check + jest)
- [ ] `nyquist_compliant: true` set in frontmatter after planner passes all gates

**Approval:** pending
