---
phase: 3
slug: font-awesome-v6-upgrade
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 (main repo) — but no renderer-component tests exist; renderer validation is manual UAT + bundle-size diff per D-05/D-06 |
| **Config file** | `package.json` → `"jest"` block (existing) |
| **Quick run command** | `npm test` (respects `--passWithNoTests`) |
| **Full suite command** | `npm run jest:coverage` |
| **Visual verification** | Manual UAT per D-05 across 4 views — no automated visual regression |
| **Bundle measurement** | `npm run pack:renderer` — measure `dist/renderer/*.js` sizes pre/post upgrade |
| **Estimated runtime** | Jest ~15s (existing suite); Manual UAT ~5min; bundle measure ~30s |

---

## Sampling Rate

- **After every task commit:** Run `npm test` (should stay green — no behavioral change to tested code paths)
- **After Wave 1 (deps + main.js imports):** `npm run dev` launches without console FA errors (app may render blank icons at the 5 renamed sites — expected until Wave 2 lands)
- **After Wave 2 (template rename):** Full manual UAT across Home.vue / Settings.vue / TitleBar.vue / PromoCard.vue + devtools console check
- **Before `/gsd-verify-work`:** Full manual UAT green + bundle diff recorded + `npm run build` produces working installer
- **Max feedback latency:** Manual UAT dominates — target <10 min wall-clock from commit to sign-off

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-00-01 | 00 | 0 | UI-01 | — | N/A | pre-flight | `npm run pack:renderer && ls -la dist/renderer/*.js` (record baseline) | ✅ existing | ⬜ pending |
| 3-01-XX | 01 | 1 | UI-01 (SC1/SC2) | — | N/A | static | `grep -c "from '@fortawesome/" src/renderer/main.js` (expect unchanged count pre/post) | ✅ existing | ⬜ pending |
| 3-01-XX | 01 | 1 | UI-01 (SC1/SC2) | — | N/A | static | `npm ls @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/free-brands-svg-icons @fortawesome/vue-fontawesome` (all at target pins) | ✅ existing | ⬜ pending |
| 3-01-XX | 01 | 1 | UI-01 (SC3) | — | Dev console clean | manual | Launch `npm run dev`, open devtools, filter `fontawesome`/`Warn`/`Error` → zero hits | ✅ existing | ⬜ pending |
| 3-02-XX | 02 | 2 | UI-01 (SC1) | — | All renamed icons render | manual | Walk UAT checklist below; each renamed icon visible in UI | ✅ existing | ⬜ pending |
| 3-02-XX | 02 | 2 | UI-01 (SC4) | — | Bundle within tolerance | automated | `npm run pack:renderer` → `(new_size - baseline) / baseline ≤ 0.10` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are placeholders — the planner fills exact IDs when creating PLAN.md frontmatter. Map updates at plan time.*

---

## Wave 0 Requirements

- [ ] **Pre-flight bundle baseline:** Run `npm run pack:renderer` on current HEAD (before any dep bump). Record `dist/renderer/*.js` sizes in planning notes or commit-1 body. Required for SC4 measurement.
- [ ] **Git hygiene check:** `git status` clean before starting; Phase 3 plans commit atomically per D-04.

*No new test infrastructure is required. D-05/D-06 accept the manual UAT + bundle-measurement approach.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 11 registered icons render correctly in live app | UI-01 (SC1) | No renderer-component test suite exists; no visual regression tooling in scope (deferred to v2.0) | Launch `npm run dev`. Navigate to each view below and confirm every `<font-awesome-icon>` glyph is visible (not blank, not a fallback square): Home.vue (trash/folder/copy/up-right-from-square), Settings.vue (gear/circle-question/discord brand), TitleBar.vue (arrow-down), PromoCard.vue (up-right-from-square). Smoke-test capture-screenshot flow. |
| FA console silence | UI-01 (SC2, SC3) | vue-fontawesome warnings are runtime-only; must see them in devtools | During UAT, open Electron devtools (Ctrl+Shift+I). Filter console for `fontawesome` / `Vue warn` / `peerDep`. Zero hits required. |
| Production electron-builder install path works | UI-01 (SC3) | `npm run build` produces an installer; only way to catch prod-build-only FA resolution bugs | `npm run build` → install locally → launch installed app → repeat UAT + console check on the installed binary. |

*The manual UAT is the primary verification surface for this phase. D-05 explicitly chose this approach over tooling.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or are mapped to the Manual-Only table above
- [ ] Sampling continuity: bundle baseline captured BEFORE commit 1; UAT after commit 2
- [ ] Wave 0 covers all MISSING references (pre-flight bundle measurement)
- [ ] No watch-mode flags in plan task commands
- [ ] Feedback latency <10 min per UAT cycle
- [ ] `nyquist_compliant: true` set in frontmatter after planner maps all tasks to this matrix

**Approval:** pending
