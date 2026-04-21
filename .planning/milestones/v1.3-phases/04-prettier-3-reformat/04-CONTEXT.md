# Phase 4: Prettier 3 Codebase Reformat - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous)

<domain>
## Phase Boundary

Upgrade Prettier 2.0.2 → 3.3.x and reformat the codebase in the existing `{src,_scripts}/**/*.{js,ts,vue}` scope so the reformat is captured in a single `format: prettier 3` commit with clean git blame, without changing runtime behavior. Bump `eslint-config-prettier` and `eslint-plugin-prettier` to their Prettier-3-compatible lines in a paired `chore(deps):` commit so the two-commit D-04-style bisect shape isolates "Prettier 3 broke tooling" from "Prettier 3 reformatted my code." `npm run lint`, `npm run pack:renderer`, and a manual screenshot round-trip smoke test are the verification surface — no per-view UAT is needed (formatter reformat, not a user-facing change).

The `bot/` workspace is explicitly out of scope: it was deliberately set up without Prettier in Phase 2 (v1.2) and stays that way here. Expanding Prettier to `bot/` would exceed TOOL-01's scope and belongs in a separate future phase if ever desired.

</domain>

<decisions>
## Implementation Decisions

### Reformat Scope
- **D-01:** Keep the existing root `prettier` script glob: `{src,_scripts}/**/*.{js,ts,vue}`. This formats the Electron main process, the renderer (Vue 2.7 app), and the webpack/build scripts. Do NOT expand the glob to include `bot/`, top-level `*.cjs` / `*.js`, docs, or config files. Scope boundary is inherited from Phase 2 — the bot workspace was intentionally set up without Prettier.
- **D-02:** No changes to `.prettierrc` config keys. The existing settings (`"tabWidth": 3`, `"useTabs": true`, `"semi": true`, `"singleQuote": true`, `"trailingComma": "es5"`) are preserved byte-for-byte. The explicit `"trailingComma": "es5"` is load-bearing because Prettier 3's default changed from `"es5"` to `"all"`; the explicit pin preserves the existing comma shape across the reformat and keeps the diff surface minimized to the genuine Prettier-3 algorithmic changes (brace/quote/wrapping differences) rather than a category-wide trailing-comma sweep.
- **D-03:** No new `.prettierignore` file introduced in this phase. The glob already excludes `node_modules/`, `dist/`, `build/`, `.planning/`, and `bot/` by construction (they are not under `src/` or `_scripts/`). Adding an ignore file would be scope expansion; if a specific file needs to be skipped, use an inline `// prettier-ignore` comment where needed instead.

### Version Pins
- **D-04:** `prettier` pinned at `^3.3.3` (latest stable 3.3.x as of 2026-04-21; matches the ROADMAP "Prettier 3.3" callout). Caret range follows the same frozen-major pattern Phase 3 used for FA pins — permits security/patch backports but not 3.4/3.5 minor drift during this phase's lifetime.
- **D-05:** `eslint-config-prettier` pinned at `^9.1.0` and `eslint-plugin-prettier` pinned at `^5.2.1`. These are the Prettier-3-compatible lines that also retain compatibility with the project's current `eslint@^7.10.0` pin. `eslint-config-prettier@10` is rejected here because it drops ESLint 7 support, which would cascade into the v1.4 ESLint-9 flat-config migration — out of scope for this phase. Full ESLint 9 flat-config migration remains deferred to v1.4 per REQUIREMENTS.md.
- **D-06:** `--legacy-peer-deps` is the expected `npm install` invocation (carried forward from Phase 3). The pre-existing `@typescript-eslint/eslint-plugin@2.34.0` vs `eslint@^7.10.0` peer conflict is unrelated to this phase and blocks plain `npm install`. Do not treat a `--legacy-peer-deps` requirement as a Phase 4 defect.

### Commit Shape (D-04 bisect pattern carried forward from Phase 3)
- **D-07:** Two-commit split — commit 1 = `chore(deps): bump Prettier to v3 + ESLint-Prettier plugins` (package.json + package-lock.json only; NO reformat diff yet; verify `npm run lint` still passes against the pre-reformatted source to confirm the ESLint-Prettier integration still works), commit 2 = `format: prettier 3` (pure `npm run prettier` output on src/ + _scripts/ — clean blame, formatter-only diff, zero hand-edits). This mirrors Phase 3's D-04 pattern: bisect between HEAD and `chore(deps)` cleanly separates "plugin/version bump broke tooling" from "Prettier 3 reformat changed how a specific file parses." The ROADMAP SC1's literal wording ("single `format: prettier 3` commit") is interpreted to mean the REFORMAT is a single commit, with the dep bump as its upstream pair — same two-commit logic Phase 3 used under D-04 for FA.
- **D-08:** Neither commit gets a `Co-Authored-By:` footer (user memory `feedback_no_coauthor.md`).
- **D-09:** Neither commit uses `--no-verify`. Pre-commit hooks run normally.
- **D-10:** `git add` must NOT use `-A` or `.` — the untracked `bot/docs/community-guide.md` at the repo root must not be staged (same rule as Phase 3). Stage paths explicitly by name.

### Verification
- **D-11:** Automated-first verification gate: (a) `npm run lint` must pass with the same or fewer warnings than the pre-upgrade baseline (captured in plan 01, commit 1 of D-07); (b) `npm run pack:renderer` must compile cleanly with no new webpack warnings originating from parsed output; (c) `npm run prettier -- --check` on the formatted glob must report "All matched files use Prettier code style!" after commit 2.
- **D-12:** Manual smoke test — after commit 2 lands, run `npm run dev` and perform one round-trip screenshot capture flow (take a screenshot via the normal iRacing hotkey or the manual capture button, confirm the thumbnail appears in the gallery, confirm no new console errors originating from the reformatted code). No per-call-site UAT like Phase 3; a formatter reformat should produce zero user-facing behavior change.
- **D-13:** If `npm run build` (full electron-builder install path) is blocked by installer-signing issues unrelated to Prettier (noted as a possibility in Phase 3 UAT), `npm run pack` (pack-only, no installer signing) is an acceptable substitute — the goal is to probe webpack's parsing of the reformatted source, not installer integrity.

### Claude's Discretion
- Pre-reformat baseline metric choice (line count, file count, lint warning count) — Claude picks whatever is cheapest to capture and most load-bearing for post-reformat comparison. Baseline captured in commit 1's phase artifact.
- Handling of any parser errors surfaced by Prettier 3 on existing `src/` / `_scripts/` files (Prettier 3's TypeScript/JS parser is stricter about a handful of edge cases). Treat parser errors as a deviation: surface them, do not silently edit the source to appease the parser. If found, route to user decision before proceeding.
- Whether to run `npm run lint --fix` inside commit 2 to sweep any ESLint-Prettier integration drift (e.g., an auto-fixable rule whose output differs under eslint-plugin-prettier 5). If needed, bundle into commit 2's `format: prettier 3` commit since the output is formatter-adjacent and the bisect shape is preserved.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-local
- `.planning/ROADMAP.md` §Phase 4 — Goal, success criteria, depends-on Phase 3 rationale.
- `.planning/REQUIREMENTS.md` §TOOL-01 — Full requirement definition + "may need minor bumps to their v3-compatible lines" callout for the ESLint-Prettier plugins.
- `.planning/PROJECT.md` — Core value + evolution rules (minimal-change principle applies here).
- `.planning/STATE.md` — Current project state + Phase 3 carryover notes (npm install flag, build-signing caveat).
- `.planning/phases/03-font-awesome-v6-upgrade/03-CONTEXT.md` §D-04 — Two-commit bisect shape pattern reused here.
- `.prettierrc` — Existing formatting config; keys preserved byte-for-byte across this phase (D-02).

### External (for researcher)
- Prettier 3.0.0 release notes: https://prettier.io/blog/2023/07/05/3.0.0.html — breaking changes inventory (trailing-comma default flip; `.tsx` auto-detection; Markdown/YAML parsing changes; single-quote in JSX handling).
- Prettier 3 migration guide: https://prettier.io/docs/en/upgrading-to-v3 — per-option migration notes.
- `eslint-config-prettier` v9 changelog: https://github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md — Prettier-3 compat notes + ESLint peer range.
- `eslint-plugin-prettier` v5 changelog: https://github.com/prettier/eslint-plugin-prettier/blob/master/CHANGELOG.md — Prettier-3 compat + ESLint peer range.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Root `package.json` has an existing `"prettier": "prettier --write \"{src,_scripts}/**/*.{js,ts,vue}\""` script — no script changes needed. The script contract stays constant across the upgrade; only the resolved Prettier binary changes major version.
- `.prettierrc` at repo root — explicit config already commits to `"trailingComma": "es5"`, which dodges Prettier 3's single biggest default change (the `es5` → `all` flip) and preserves the existing trailing-comma shape across all three file types (.js, .ts, .vue).
- Phase 3's D-04 two-commit bisect pattern — directly transferable to Phase 4's dep-bump-plus-reformat shape. Reuse the same `chore(deps):` + content-commit structure.
- Phase 3's SC4 baseline-then-diff pattern (03-01-BASELINE.md → 03-02-BUNDLE-DIFF.md) — transferable to a pre-reformat lint-warning count baseline, useful as evidence in commit 2's body that "lint warning count did not regress."

### Established Patterns
- Atomic scoped conventional commits (`chore(deps):`, `refactor(icons):`, `format:`). Commit subject pattern is consistent and used by dependabot + hand commits + Phase 3.
- `--legacy-peer-deps` on `npm install` is the project's standing workaround for the typescript-eslint vs eslint 7 peer conflict. Do not try to fix that conflict in this phase — it is deferred to v1.4.
- `.planning/` is gitignored — any in-phase artifacts (baselines, diffs, summaries) need `git add -f` to commit (same as Phase 3's 03-01-BASELINE.md and 03-02-BUNDLE-DIFF.md).
- Line endings: repo uses `core.autocrlf` via git's `LF will be replaced by CRLF` warning — Prettier writes LF, git normalizes on checkout. Do NOT add a `.gitattributes` change in this phase.
- No Co-Authored-By lines in commits (user memory `feedback_no_coauthor.md`).

### Integration Points
- `package.json` `devDependencies` — three lines to touch: `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier`. Alphabetical ordering within the section is already correct for the first two; the `prettier` key is already in `devDependencies`, not `dependencies`.
- `package.json` `scripts.prettier` — no change.
- `package-lock.json` — regenerated by `npm install --legacy-peer-deps`.
- `src/**/*.{js,ts,vue}` and `_scripts/**/*.js` — the files Prettier 3 will reformat. Electron main (`src/main/`), renderer (`src/renderer/`), and webpack configs (`_scripts/webpack.*.config.js`) are all in scope.
- `.eslintrc` or equivalent — depends on `eslint-config-prettier` via `extends`. The config key and extends pattern stay the same; only the package version changes. No eslint config edits expected unless `npm run lint` surfaces a new warning under the bumped `eslint-plugin-prettier`.

### Out of Scope (deliberately)
- `bot/*` — no Prettier setup, stays that way (D-01).
- `docs/*`, `*.md`, `.planning/*` — not matched by the glob; not reformatted.
- `package.json` itself — glob does not match the root; stays as-is (npm maintains its own formatting).

</code_context>

<specifics>
## Specific Ideas

- Mirror Phase 3's D-04 two-commit pattern byte-for-byte (in spirit): commit 1 = `chore(deps):` with pin table + install-note body, commit 2 = `format: prettier 3` with rename-less, pure-formatter diff. This preserves the bisect pattern the user approved for Phase 3 (see 03-CONTEXT.md §D-04 and the Phase 3 commit pair `ae2627b` + `b5ecc32`).
- Pre-reformat lint-warning baseline captured as `04-01-BASELINE.md` with the current `npm run lint` warning count + per-file breakdown of any existing warnings. Post-reformat commit 2's body cites this baseline as "no new warnings introduced" evidence.
- No visual UAT across the Vue renderer views — the reformat is purely whitespace/comma/quote-level and should not change runtime behavior. A single `npm run dev` screenshot round-trip is sufficient.

</specifics>

<deferred>
## Deferred Ideas

- Adding Prettier to the `bot/` workspace — belongs in a separate phase (or deferred to v1.4's tooling sweep) if ever decided.
- Migrating to ESLint 9 flat config + `eslint-config-prettier@10` / `eslint-plugin-prettier@10`-compatible versions — deferred to v1.4 per REQUIREMENTS.md §Future Requirements.
- Introducing a `.prettierignore` file for fine-grained exclusions — defer until a concrete need arises (D-03).
- Reformatting docs / markdown / `.planning/` via a docs-specific Prettier run — not part of TOOL-01; deferred indefinitely.
- Bumping `typescript-eslint` to resolve the ESLint 7 peer conflict — blocked on the ESLint 9 migration; deferred to v1.4.

</deferred>

---

*Phase: 04-prettier-3-reformat*
*Context gathered: 2026-04-21*
