# Phase 3 — Pre-upgrade Renderer Bundle Baseline

**Captured:** 2026-04-21T13:27:06Z
**Commit (pre-upgrade HEAD):** 5e9b7c6
**Command:** `npm run pack:renderer`

## Path correction note

The plan assumed `dist/renderer/*.js` but webpack's renderer config (`_scripts/webpack.renderer.config.js` lines 19–22) writes `[name].js` into `../dist`, producing `dist/renderer.js` as a single chunk — NOT `dist/renderer/*.js`. The `dist/main.js` file in the same directory is the Electron main-process output from `pack:main` and is NOT part of the renderer bundle; it is excluded from this baseline. The canonical renderer-bundle file measured here is `dist/renderer.js`.

## Per-file sizes (bytes)

| File | Size (bytes) |
|------|--------------|
| dist/renderer.js | 1450730 |

## Totals

- **Sum of dist/renderer/*.js:** 1450730 bytes
- **Largest chunk:** dist/renderer.js @ 1450730 bytes

(The "Sum of dist/renderer/*.js" label is preserved verbatim from the plan's template so automated verify greps match. The actual path is `dist/renderer.js` per the Path correction note above. Plan 02's SC4 comparison should measure the same `dist/renderer.js` path.)

## SC4 tolerance

Acceptance in Plan 02: (post_sum - 1450730) / 1450730 ≤ 0.10 (≤10% increase).
Ideal outcome: decrease, since FA v6 tree-shaking is improved (RESEARCH.md State of the Art).
