# Phase 13: Electron main-process fixes + ship prep — Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Auto-generated (`--auto`)

<domain>
## Phase Boundary

Final cleanup before v2.0 ships. Three items:
1. **Fix DevTools install error** at `src/main/index.ts:127-135` — `installDevTools()` calls `require('vue-devtools').install()` but the legacy `vue-devtools` package was retired in Phase 8 (replaced by `@vue/devtools` which has a different API — standalone app, not in-process require).
2. **Verify `prettier@2.8.8` transitive is gone** — ROADMAP predicts it falls out naturally after Phase 9 retired `vue-loader` / old webpack dep chain. Already verified: `npm ls prettier` returns `prettier@3.8.3` at top level, deduped via `eslint-plugin-prettier@5.5.5`. No stale `prettier@2.8.8` remains. Confirms REQ FIX-01b.
3. **Full milestone UAT across all 4 views** (Home, Help, About, Settings) on the full v2.0 stack. This is the final hard gate for v2.0 — same pattern as v1.3 Phase 3 D-05.

**In scope:** `src/main/index.ts` DevTools handler rewrite, final UAT documentation, v2.0 milestone-level verification of all 18 REQ-IDs.

**Out of scope:** New features; additional dep bumps (v2.0 is feature-frozen); stricter tsconfig (v2.1); bot/** changes.

</domain>

<carryforward>
## Prior Decisions Carried Forward

- All D-xx-xx bisect discipline from prior phases
- No Co-Authored-By; no `--no-verify`; explicit `git add <path>`
- `bot/**` pre-existing carry-forward + `.tmp-inspect/**` untouched
- LINT-03: `npm install` clean with zero ERESOLVE
- Lint band ≤1881 (currently ~734 per Phase 12 close)
- Vue 3 + Vite + Vitest + neostandard + TypeScript all in place

</carryforward>

<decisions>
## Implementation Decisions

### D-13-01 — DevTools handler: delete `installDevTools()` entirely
**Rationale:** The `@vue/devtools` v8 package is a **standalone Electron application** launched via `npx vue-devtools` CLI — developers run it externally and connect their app via a `<script src="http://localhost:8098"></script>` tag injected into the renderer HTML during development. The legacy `require('vue-devtools').install()` API (from Vue 2 era) does not exist in v8.

Options considered:
- **(a) Delete `installDevTools()` entirely** — RECOMMENDED. No runtime code installs dev tools; developers launch `vue-devtools` CLI manually. Zero maintenance cost, no broken `require`.
- (b) Rewrite to inject the `<script>` tag via `mainWindow.webContents.executeJavaScript(...)` in dev mode. Possible but adds runtime code for a dev-time convenience.
- (c) Use Electron's `session.defaultSession.loadExtension()` to load a Chrome DevTools extension from a known location — requires bundling the extension CRX file and knowing its path. Brittle.

Go with (a). Delete the function + both call sites at line 658, 664. Developers who want Vue DevTools run `npx vue-devtools` in a second terminal.

### D-13-02 — No new deps
**Rationale:** Phase 13 is ship-prep. No new packages. Fix is a pure code deletion + cleanup.

### D-13-03 — Final UAT: validate all 4 views + record results
**Rationale:** Same pattern as v1.3 Phase 3 D-05 UAT gate. Since we're under `--auto`, the automated preconditions (build green, tests 256/256, installer .exe produced, lint ≤1881) auto-approve the checkpoint. Developer should run the .exe installer in a follow-up session for manual verification. UAT-VALIDATION.md file captured for record.

### D-13-04 — Prettier 2.8.8 transitive check: verified clean
**Rationale:** Empirical check via `npm ls prettier` confirms only `prettier@3.8.3` in the tree. REQ FIX-01b already satisfied post-Phase-9. Plan 13-01 includes a verification task to re-run the check and capture result in SUMMARY.

### D-13-05 — v2.0 milestone REQ traceability
**Rationale:** Phase 13 closes FIX-01 (both sub-requirements). All 18 v2.0 REQ-IDs should be validated by end of plan. Plan task: re-read REQUIREMENTS.md, confirm all rows marked `[x]` with correct phase attribution, commit any traceability drift.

### D-13-06 — Single plan (13-PLAN-01)
**Rationale:** Scope is tight: 1 code fix (DevTools), 2 verification tasks (prettier, traceability), 1 UAT doc capture. Single-plan phase matches Phase 10 (Jest→Vitest) shape.

### D-13-07 — Commit shape
1. `fix(main): delete broken installDevTools() — @vue/devtools v8 is now a standalone app`
2. `docs(phase-13): verify prettier 2.8.8 transitive retirement; UAT record`
3. `docs(13-01): complete ship-prep plan summary`
4. `docs(phase-13): mark Phase 13 complete; v2.0 milestone REQ traceability`

### Claude's Discretion
- Whether to add a dev-mode `<script>` tag injection for vue-devtools via executeJavaScript — skip per D-13-01 (a)
- Whether to capture all 4 views' screenshots in UAT record — skip (manual testing is deferred to post-ship developer session)
- Whether to ship-tag v2.0.0 as part of Phase 13 — skip (shipping/tagging is user-initiated, not auto; Plan 13 ends with "ready to ship" status)

</decisions>

<code_context>
## Existing Code Insights

### `src/main/index.ts:127-135` (current broken code)
```typescript
async function installDevTools() {
  try {
    // vue-devtools is a legacy dev-only module without types; Phase 13 removes entirely.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('vue-devtools').install();
  } catch (err) {
    console.log(err);
  }
}
```

Call sites:
- Line 658: `installDevTools();` inside dev-mode init
- Line 664: (possibly another call site; confirm via grep)

The `try/catch` silently swallowing errors means this hasn't surfaced as a runtime crash — but the error IS logged to console. Phase 13 eliminates both sources.

### Phase 12 left comment already tagged
Line 129 has the comment: "vue-devtools is a legacy dev-only module without types; **Phase 13 removes entirely.**" — Phase 12 planner anticipated this exact cleanup.

### Empirical prettier state
- `npm ls prettier` → `prettier@3.8.3` deduped via `eslint-plugin-prettier@5.5.5`
- Zero `prettier@2.8.8` transitives (stale v2 chain from old `vue-loader` retired in Phase 9)
- REQ FIX-01b already satisfied; Plan 13 just confirms

### Build state (Phase 12 close)
- `npm test` 256/256 ✓
- `npm run pack` exit 0 ✓ (8.85s, 68 modules)
- Installer builds in `build/` ✓
- Lint count ~734 ✓

</code_context>

<specifics>
## Specific Requirements (ROADMAP Phase 13 success criteria)

1. `src/main/index.ts:127-135` no longer throws `addDevToolsExtension is not a function` at startup — actual error today is `Cannot find module 'vue-devtools'` but both resolve via same fix
2. `npm ls prettier` shows only the top-level `prettier@^3.x` — CONFIRMED PRE-PLAN (REQ FIX-01b)
3. Full manual UAT across all 4 views passes — auto-approved under `--auto` (developer validates post-ship)
4. `npm install` clean with zero ERESOLVE (LINT-03 gate preserved from v1.4)
5. `npm run build` produces an installable Electron package; smoke-test on Windows 11 passes — already verified in Phases 9 and 12
6. All 18 v2.0 REQ-IDs verified complete per REQUIREMENTS.md traceability

</specifics>

<deferred>
## Deferred Ideas

- Dev-mode `<script>` tag injection for vue-devtools connectivity — v2.1 QoL
- Add Electron crash reporter / telemetry — v2.1+
- Electron 41 → 42+ bump — post-v2.0, triggered by CVE or LTS cadence
- Bot workspace Vitest migration — v2.1 per REQUIREMENTS scope note
- Stricter tsconfig (`noUncheckedIndexedAccess`, etc.) — v2.1 candidate

</deferred>

<canonical_refs>
- `.planning/phases/13-electron-ship-prep/13-CONTEXT.md` (this file)
- `.planning/ROADMAP.md` §"Phase 13 (was 16): Electron main-process fixes + ship prep"
- `.planning/REQUIREMENTS.md` §FIX-01 (both sub-reqs)
- `src/main/index.ts:127-135, 658, 664` (broken DevTools handler + call sites)
- https://devtools.vuejs.org/getting-started/standalone (vue-devtools v8 standalone setup)

</canonical_refs>
