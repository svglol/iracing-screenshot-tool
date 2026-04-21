# Phase 4 — Pre-reformat Baseline (post-HelpModal-fix, pre-Prettier-3-upgrade)

**Captured:** 2026-04-21
**Parent commit (pre-fix HEAD):** 757dbe9
**Devtool versions at capture:** prettier@2.0.2, eslint-config-prettier@6.10.1, eslint-plugin-prettier@3.1.2, eslint@7.x (from `devDependencies` in package.json at this HEAD)
**File count in glob:** 35
**Tooling state:** unchanged from pre-phase; no `npm install` performed yet.

## Baseline metrics

- **Pre-upgrade lint warning count:** 1929
  - Captured via: `npm run lint 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+(warning|error)'`
  - This count is the denominator for Wave 2 acceptance (D-11a: `npm run lint` post-dep-bump must report ≤ 1929) and Wave 3 acceptance (post-reformat must also report ≤ 1929).
  - Note: `npm run lint` runs `eslint --fix` as a side effect. The 1929 count is captured on the post-fix working tree (HelpModal Task 1 applied); any auto-fixes the linter applied to other files during the measurement run were reverted before Tasks 2/3 so this commit's diff scope stays at exactly 2 paths.

- **Pre-upgrade prettier --check failing-file count (Prettier 2.0.2):** 35
  - Captured via: `npx prettier --check "{src,_scripts}/**/*.{js,ts,vue}" 2>&1 | grep -cE '\.(js|ts|vue)$'`
  - Actual observed count differs from the research's projection of 33 (RESEARCH.md §Architecture Patterns line 173) — empirical measurement on this working tree at commit 757dbe9 shows all 35 files in the glob fail `prettier --check` under v2.0.2. The 2-file delta is most likely research-time measurement drift (source has evolved between research and execute).
  - Critically, Prettier no longer produces `SyntaxError: Unexpected closing tag "p"` on any file — HelpModal.vue now fails style conformance like the other 34, not parser parsing. This is the unblock signal for SC1.
  - Purely informational — after Wave 3's `npm run prettier` sweep, the post-reformat count must be 0 (SC1).

- **Pre-upgrade `dist/renderer.js` byte count:** 1477180 bytes
  - Captured via: `npm run pack:renderer && wc -c dist/renderer.js`
  - A2 reference for Wave 3's sanity check: post-reformat bundle should be near-identical (webpack ASTs through source, whitespace-insensitive). Large delta would indicate a runtime-affecting reformat artifact.
  - Sanity vs STATE.md's Phase 3 close value (1,477,189): 9-byte difference, well within ±0.1% tolerance. Bundle is effectively unchanged since Phase 3.

## Wave 2 acceptance denominators

- `npm run lint` post-`chore(deps)` must exit with ≤ 1929 warning+error lines (same exit code or better than baseline).

## Wave 3 acceptance denominators

- `npm run lint` post-`format: prettier 3` must produce ≤ 1929 warning+error lines.
- `npm run prettier -- --check` post-commit-2 must exit 0 with "All matched files use Prettier code style!".
- `wc -c dist/renderer.js` post-`npm run pack:renderer` should be within ±0.1% of 1477180 bytes (A2 sanity).

## HelpModal fix verification (applied in this same commit)

- `grep -cE '^        <p>$' src/renderer/components/HelpModal.vue` returns 0.
- `grep -cE '^        </p>$' src/renderer/components/HelpModal.vue` returns 0.
- `npx prettier --check src/renderer/components/HelpModal.vue 2>&1` no longer contains `SyntaxError`.
