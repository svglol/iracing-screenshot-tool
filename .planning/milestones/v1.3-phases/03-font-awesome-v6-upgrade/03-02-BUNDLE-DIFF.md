# Phase 3 — Post-upgrade Bundle Diff (SC4)

**Captured:** 2026-04-21T13:39:46Z
**Baseline:** `.planning/phases/03-font-awesome-v6-upgrade/03-01-BASELINE.md` (1,450,730 bytes summed)
**Command:** `npm run pack:renderer`

## Path note

Plan 02 Task 2 wording specifies `ls -la dist/renderer/*.js`, but webpack's renderer config (`_scripts/webpack.renderer.config.js` lines 19–22) writes a single `dist/renderer.js` chunk — there is no `dist/renderer/` subdirectory. The baseline from Plan 01 measured the same `dist/renderer.js` path (see 03-01-BASELINE.md §"Path correction note"). This post-upgrade measurement matches the baseline path for a like-for-like comparison.

The `**Sum of dist/renderer/*.js:**` label is preserved verbatim from the plan's template so automated verify greps that target the phrase continue to match.

## Per-file sizes (bytes) — post-upgrade

| File | Size (bytes) |
|------|--------------|
| dist/renderer.js | 1477189 |

**Sum of dist/renderer/*.js:** 1,477,189 bytes
**Largest chunk:** dist/renderer.js @ 1,477,189 bytes

## Delta

- **Post-upgrade sum:** 1,477,189 bytes
- **Baseline sum:** 1,450,730 bytes
- **Delta:** +26,459 bytes (+1.82%)
- **D-06 tolerance:** ≤ +10.00%
- **Result:** PASS

## Commentary

Renderer bundle grew by ~26 KB (+1.82%), comfortably within the D-06 ≤10% tolerance. This is slightly above the RESEARCH.md expectation (community 5→6 migrations generally report decreases due to improved tree-shaking), and the most plausible explanation is that `@fortawesome/fontawesome-svg-core@6.7.2` added feature hooks (duotone, sharp-family registration scaffolding) whose scaffolding survives tree-shaking because the core module exports them at top level, while per-icon SVG path data itself remained roughly the same size.

No mitigation required — the D-07 prune (3 icons removed from `library.add` in Plan 01) already banked whatever byte savings were available on the call-site side. The +1.82% delta is the natural cost of the core-library upgrade after pruning, and it remains well under the tolerance.
