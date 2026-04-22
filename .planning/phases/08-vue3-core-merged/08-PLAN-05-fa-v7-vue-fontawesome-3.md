---
phase: 08-vue3-core-merged
plan: 05
type: execute
wave: 5
depends_on: [08-04]
files_modified:
  - package.json
  - package-lock.json
  - src/renderer/main.js
autonomous: true
requirements: [UI-04, UI-05]
tags: [fontawesome, vue-fontawesome, icon-audit]

must_haves:
  truths:
    - "@fortawesome/fontawesome-svg-core + free-solid-svg-icons + free-brands-svg-icons all at ^7.x"
    - "@fortawesome/vue-fontawesome at ^3.x"
    - "Zero references to use.fontawesome.com in src/"
    - "All 8 currently-registered icons (7 solid + 1 brand) still render in Plan 06 UAT"
    - "Three-grep icon audit per v1.3 Phase 3 D-07 completed; findings documented"
  artifacts:
    - path: "package.json"
      provides: "FA v7 + vue-fontawesome 3 pins"
      contains: "\"@fortawesome/vue-fontawesome\""
    - path: "src/renderer/main.js"
      provides: "FA library.add + app.component('font-awesome-icon', FontAwesomeIcon) using vue-fontawesome 3 API"
      contains: "@fortawesome/vue-fontawesome"
  key_links:
    - from: "src/renderer/main.js library.add(...)"
      to: "FA SVG core registry"
      via: "library.add imports from free-solid + free-brands v7 packages"
      pattern: "library\\.add\\("
    - from: "app.component('font-awesome-icon', FontAwesomeIcon)"
      to: "vue-fontawesome 3 Vue 3 integration"
      via: "named FontAwesomeIcon import from @fortawesome/vue-fontawesome"
      pattern: "app\\.component\\('font-awesome-icon'"
---

<objective>
Bump Font Awesome to v7 and `@fortawesome/vue-fontawesome` to v3 (the Vue-3-native bridge). Run the three-grep icon audit per v1.3 Phase 3 D-07 to verify none of the 8 registered icons were renamed in the v6→v7 transition (per RESEARCH.md Assumption A8 — the rename table excerpt was partial; empirical verification required). Drop the FA v5.2.0 CDN `@import` from `src/renderer/assets/style/main.scss` (already dropped in Plan 03 when main.scss was rewritten — this plan verifies it's still gone).

The 8 registered icons are: `faGear`, `faUpRightFromSquare`, `faFolder`, `faTrash`, `faCopy`, `faCircleQuestion`, `faArrowDown`, `faDiscord`. The three-grep audit checks each icon appears in (1) a template `<font-awesome-icon :icon="...">` match, OR (2) a dynamically-computed icon name in a method/computed, OR (3) an Oruga iconpack config match. If any icon has zero usage sites, prune it from `library.add(...)`.

Purpose: Close REQ UI-04 (FA CDN removed) + REQ UI-05 (FA v7 + vue-fontawesome 3). Inherit v1.3 Phase 3 D-07 pruning discipline.
Output: Two commits (commit 7+8 of the 9-commit chain per D-08-18):
- `chore(deps): bump @fortawesome/* to v7 + vue-fontawesome to 3.x`
- `refactor(renderer): migrate FA registration to app.component + three-grep icon audit`
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/08-vue3-core-merged/08-CONTEXT.md
@.planning/phases/08-vue3-core-merged/08-RESEARCH.md
@.planning/phases/08-vue3-core-merged/08-04-SUMMARY.md
@.planning/milestones/v1.3-phases/03-font-awesome-upgrade/ (prior D-07 icon audit precedent)

@package.json
@src/renderer/main.js

<interfaces>
<!-- FA v7 + vue-fontawesome 3 API -->

library + icon registration (from @fortawesome/fontawesome-svg-core@7.x):
```javascript
import { library } from '@fortawesome/fontawesome-svg-core';
import { faGear, /* ... */ } from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';

// library.add() is module-level — same semantics as FA v6
library.add(faGear, faDiscord, /* ... */);
```

FontAwesomeIcon component (from @fortawesome/vue-fontawesome@3.x):
```javascript
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
// Vue 3 registration:
app.component('font-awesome-icon', FontAwesomeIcon);
// vue-fontawesome 3.x dropped Vue 2 compat; Vue 3 only.
```

Template usage (unchanged between v2 and v3 of vue-fontawesome):
```html
<font-awesome-icon :icon="['fas', 'gear']" />
<font-awesome-icon icon="discord" />
<!-- Array vs string forms both work; array form is explicit-pack -->
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump FA packages to v7 + vue-fontawesome to 3.x</name>
  <read_first>
    - package.json (current FA pins on lines 47-50: svg-core 6.7.2, free-brands 6.7.2, free-solid 6.7.2, vue-fontawesome 2.0.10)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Standard Stack §Font Awesome (pinned versions)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §Pitfall 9 (FA v7 decorative-by-default + SVG cleanup)
  </read_first>
  <action>
    Edit `package.json` dependencies block. All four FA-related entries bump together:

    - `"@fortawesome/fontawesome-svg-core": "^6.7.2"` → `"@fortawesome/fontawesome-svg-core": "^7.2.0"`
    - `"@fortawesome/free-brands-svg-icons": "^6.7.2"` → `"@fortawesome/free-brands-svg-icons": "^7.2.0"`
    - `"@fortawesome/free-solid-svg-icons": "^6.7.2"` → `"@fortawesome/free-solid-svg-icons": "^7.2.0"`
    - `"@fortawesome/vue-fontawesome": "^2.0.10"` → `"@fortawesome/vue-fontawesome": "^3.2.0"`

    Run `npm install`. Expect zero ERESOLVE — vue-fontawesome@3 peer-deps on Vue 3 which we already pinned in Plan 01; FA v7 packages have no Vue-version peer constraints.

    If ERESOLVE surfaces: capture verbatim in summary. Most likely offender: a stray transitive reference. Do NOT use `--legacy-peer-deps`.

    Do NOT modify any other package. This task is dep-bump-only — content changes land in Task 2.
  </action>
  <verify>
    <automated>
      grep -Pc '"@fortawesome/fontawesome-svg-core":\s*"\^7\.' package.json  # returns 1
      grep -Pc '"@fortawesome/free-brands-svg-icons":\s*"\^7\.' package.json  # returns 1
      grep -Pc '"@fortawesome/free-solid-svg-icons":\s*"\^7\.' package.json  # returns 1
      grep -Pc '"@fortawesome/vue-fontawesome":\s*"\^3\.' package.json  # returns 1
      grep -c '"\^6\.' package.json  # returns 0 for any FA package (may match non-FA; scan output)
      npm ls @fortawesome/vue-fontawesome  # shows 3.x
      npm ls @fortawesome/fontawesome-svg-core  # shows 7.x
      # Build will fail intentionally — vue-fontawesome 3 drops Vue.component API; main.js uses app.component already (Plan 01), so this may build cleanly actually. Test:
      npm run pack:renderer 2>&1 | tail -20
      # If exit 0, great. If fails — expected to be resolved by Task 2's explicit library/import audit.
    </automated>
  </verify>
  <acceptance_criteria>
    - All 4 FA pins at v7/v3 as listed above
    - `npm install` exits 0 without `--legacy-peer-deps`
    - `node_modules/@fortawesome/vue-fontawesome/package.json` shows `"version": "3.x.x"` (x≥2)
    - `node_modules/@fortawesome/fontawesome-svg-core/package.json` shows `"version": "7.x.x"` (x≥2)
    - `npm run pack:renderer` may succeed directly (Plan 01 already switched to `app.component` pattern for FontAwesomeIcon); if it fails, Task 2 addresses the fix
  </acceptance_criteria>
  <done>
    FA v7 + vue-fontawesome 3 dep bump landed. Ready for Task 2's icon audit + content migration commit.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Three-grep icon audit + drop FA v5 CDN check + finalize main.js FA registration</name>
  <read_first>
    - src/renderer/main.js (current FA import block + library.add + app.component)
    - src/renderer/assets/style/main.scss (should already have zero FA CDN references after Plan 03 — verify)
    - .planning/milestones/v1.3-phases/03-font-awesome-upgrade/ (prior D-07 audit pattern — three-grep methodology)
    - .planning/phases/08-vue3-core-merged/08-RESEARCH.md §D-08-16 + §Assumption A8
    - .planning/phases/08-vue3-core-merged/08-CONTEXT.md §D-08-13 (CDN already dropped in Plan 03)
  </read_first>
  <behavior>
    - Behavior 1: Three-grep audit of all 8 icons — verify each is used in templates, dynamic computed/method, or Oruga iconpack config
    - Behavior 2: Any icon with zero usage sites is pruned from `library.add(...)` in main.js
    - Behavior 3: FA v7 icon renames (if any surface for our 8 icons) are applied to both the import statement and the usage sites
    - Behavior 4: `grep -r "use.fontawesome.com" src/` returns zero (verify Plan 03 cleanup still holds)
    - Behavior 5: `FontAwesomeIcon` component registered via `app.component('font-awesome-icon', FontAwesomeIcon)` — already done in Plan 01; verify still correct after v3 bump
    - Behavior 6: `npm run pack:renderer` exits 0 with FA v7 + vue-fontawesome 3
  </behavior>
  <action>
    **Step 1 — Three-grep audit per icon.** For each of the 8 icons currently in `library.add(...)`, run three greps. Check for each:

    | Icon (camelCase import) | Kebab-case name (used in templates) |
    |------------------------|-------------------------------------|
    | faGear | gear |
    | faUpRightFromSquare | up-right-from-square |
    | faFolder | folder |
    | faTrash | trash |
    | faCopy | copy |
    | faCircleQuestion | circle-question |
    | faArrowDown | arrow-down |
    | faDiscord | discord |

    For each icon, run these three greps:

    ```bash
    ICON_KEBAB="gear"  # substitute per icon
    # Grep 1: static template usage
    grep -rE "icon=\"${ICON_KEBAB}\"|icon=\\['(fa[bs]|fas|fab)'\s*,\s*'${ICON_KEBAB}'\\]|icon=\\[\"(fa[bs]|fas|fab)\",\s*\"${ICON_KEBAB}\"\\]" src/renderer/

    # Grep 2: dynamic icon reference (icon name in a JS string literal in a method/computed)
    grep -rE "['\"]${ICON_KEBAB}['\"]" src/renderer/ --include="*.vue" --include="*.js"

    # Grep 3: Oruga iconpack config — the main.js iconPack: 'fas' means Oruga may auto-use FA solid for its own internal icons (close buttons, carousel arrows, dropdown chevrons, notification close, etc.). Grep main.js for any icon-name string:
    grep -E "['\"][a-z-]+['\"]" src/renderer/main.js
    ```

    For each icon, classify:
    - ≥1 usage site → KEEP in `library.add(...)`
    - 0 usage sites → PRUNE from `library.add(...)` + remove its `import { faX }` line

    Record findings in a table in the plan summary (one row per icon, with the 3 greps' hit counts).

    **Step 2 — FA v7 rename audit** (Assumption A8 — the rename table excerpt was partial).

    For each icon that survived Step 1, verify it's still present in the v7 package. Check by:

    ```bash
    # For each surviving faX icon, confirm the module export exists in v7:
    grep -E "export.*\bfaGear\b" node_modules/@fortawesome/free-solid-svg-icons/index.d.ts 2>/dev/null | head -3
    # Repeat for: faUpRightFromSquare, faFolder, faTrash, faCopy, faCircleQuestion, faArrowDown
    # For brand:
    grep -E "export.*\bfaDiscord\b" node_modules/@fortawesome/free-brands-svg-icons/index.d.ts 2>/dev/null | head -3
    ```

    - If the import name STILL EXISTS in v7 (expected for all 8): no rename needed.
    - If any import name NO LONGER EXISTS: it was renamed in v7. Find the replacement by:
      - Searching the FA v7 rename table at https://docs.fontawesome.com/upgrade/whats-changed
      - OR inspecting `node_modules/@fortawesome/free-solid-svg-icons/` for a similarly-named export
      - Update BOTH the `import { faX }` statement AND the `library.add(faX, ...)` argument AND all template `icon="kebab-case"` usage sites

    Record each icon's status (EXISTS / RENAMED TO <newname>) in plan summary.

    **Step 3 — Verify CDN stays dropped.**

    ```bash
    grep -r "use.fontawesome.com" src/
    grep -r "fontawesome.com" src/
    ```

    Expected: zero matches (Plan 03 removed the CDN `@import` in main.scss when rewriting to Bulma 1.0 `@use`).

    If any match surfaces: the file was edited elsewhere; remove the stray reference. This is the REQ UI-04 acceptance gate.

    **Step 4 — main.js finalization.**

    After Steps 1+2, open `src/renderer/main.js`:

    - Confirm the FA import block near the top still compiles against v7 packages. Example (pseudocode — adjust per audit):

      ```javascript
      import { library } from '@fortawesome/fontawesome-svg-core';
      import {
      	faGear,           // keep if Step 1 found ≥1 usage
      	faUpRightFromSquare,
      	faFolder,
      	faTrash,
      	faCopy,
      	faCircleQuestion,
      	faArrowDown,
      } from '@fortawesome/free-solid-svg-icons';
      import { faDiscord } from '@fortawesome/free-brands-svg-icons';
      import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

      library.add(
      	faGear,
      	faUpRightFromSquare,
      	faFolder,
      	faTrash,
      	faCopy,
      	faCircleQuestion,
      	faArrowDown,
      	faDiscord
      );
      ```

    - Any icon pruned in Step 1 → remove from BOTH the `import { ... }` AND the `library.add(...)` arg list
    - Any icon renamed in Step 2 → update the `import { oldName }` to `import { newName }` AND update `library.add(...)`

    - Confirm `app.component('font-awesome-icon', FontAwesomeIcon);` line is present (should be — it was added in Plan 01 Task 2).

    - Run `npm run pack:renderer`. Expected: exit 0.
    - Run `npm test`. Expected: 256/256.

    **Note:** Icon template usages in SFCs (Home.vue, SideBar.vue, TitleBar.vue, etc.) stay byte-identical UNLESS an icon got renamed by FA v7 (Step 2). If all 8 names survive v7 (the researcher's expectation per Assumption A8), no SFC edits needed.
  </action>
  <verify>
    <automated>
      # Verify REQ UI-04: no CDN references
      grep -rc "use.fontawesome.com" src/  # returns 0

      # Verify vue-fontawesome 3 registration
      grep -c "@fortawesome/vue-fontawesome" src/renderer/main.js  # returns 1
      grep -c "FontAwesomeIcon" src/renderer/main.js  # returns ≥2 (import + app.component)
      grep -c "app.component('font-awesome-icon'" src/renderer/main.js  # returns 1

      # Verify library.add still called
      grep -c "library.add(" src/renderer/main.js  # returns 1

      # Verify each surviving icon has a template usage site (per Step 1 audit)
      # (Shell one-liner — adjust icon list if any got pruned)
      for ICON in gear up-right-from-square folder trash copy circle-question arrow-down discord; do
      	COUNT=$(grep -rE "icon=[\"'](fa[bs]|fas|fab)?[\"']?\s*[,]?\s*[\"']?${ICON}" src/renderer/ | wc -l)
      	echo "${ICON}: ${COUNT}"
      done
      # Every icon's count should be ≥1 (else it should have been pruned from library.add)

      # Build gate
      npm run pack:renderer  # exits 0
      npm test  # 256/256
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -rc "use.fontawesome.com" src/` returns 0 (REQ UI-04 satisfied)
    - Three-grep audit complete for all 8 icons; findings table in plan summary
    - Any zero-usage icon pruned from both `import { ... }` and `library.add(...)` in main.js
    - Any v6→v7 renamed icon updated in both import AND library.add AND all template usage sites
    - `npm run pack:renderer` exits 0
    - `npm test` → 256/256
    - Lint count ≤1881
    - `node_modules/@fortawesome/vue-fontawesome/package.json` shows 3.x
  </acceptance_criteria>
  <done>
    FA v7 + vue-fontawesome 3 operational; three-grep audit complete; pruned icons (if any) removed; CDN still absent; build + tests pass.
  </done>
</task>

<task type="auto">
  <name>Task 3: Commit the two-commit FA bisect pair</name>
  <read_first>
    - .planning/phases/08-vue3-core-merged/08-CONTEXT.md §D-08-18 (bisect shape)
  </read_first>
  <action>
    Commits 7+8 of the 9-commit chain per D-08-18.

    Commit 7 (deps only):
    ```bash
    git add package.json package-lock.json
    git commit -m "chore(deps): bump @fortawesome/* to v7 + vue-fontawesome to 3.x"
    ```

    Commit 8 (content — main.js icon audit edits):
    ```bash
    git add src/renderer/main.js
    git commit -m "refactor(renderer): migrate FA registration + three-grep icon audit"
    ```

    If the three-grep audit caused SFC edits (only if an icon was renamed by v7), stage those too in commit 8:
    ```bash
    git add src/renderer/main.js <any renamed-icon SFC files>
    git commit -m "refactor(renderer): migrate FA registration + three-grep icon audit"
    ```

    If Step 3 of Task 2 detected a stray `use.fontawesome.com` reference somewhere (unexpected — Plan 03 should have removed it), stage that fix too with a clear message in plan summary.

    No Co-Authored-By. No --no-verify.
  </action>
  <verify>
    <automated>
      git log --oneline -n 2 | head -1 | grep -c "three-grep icon audit"  # returns 1
      git log --oneline -n 2 | tail -1 | grep -c "@fortawesome.*v7"  # returns 1
    </automated>
  </verify>
  <acceptance_criteria>
    - Two commits in order: `chore(deps)` then `refactor(renderer)`
    - package.json + package-lock.json in commit 1 only
    - main.js (+ any renamed-icon SFCs) in commit 2
    - No Co-Authored-By
  </acceptance_criteria>
  <done>
    Commits 7+8 of the 9-commit chain landed. Ready for Plan 06 (third-party plugin swaps + final UAT).
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → local node_modules | Four FA package bumps; vue-fontawesome major version jump (2.x → 3.x) |
| SFC template icon usage → FA v7 library | Icon name strings ("gear", "discord") must match FA v7 exports; rename would render blank SVG |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-05-01 | Tampering | FA v7 renamed an icon our codebase uses → blank SVG at render | mitigate | Task 2 Step 2 verifies each surviving icon export still exists in v7 package by grepping node_modules type definitions. Plan 06 final UAT catches any blank-SVG regression. |
| T-08-05-02 | Denial of Service | vue-fontawesome 3 API breaks our Vue 3 registration | accept | Plan 01 already switched to `app.component('font-awesome-icon', FontAwesomeIcon)` pattern (vue-fontawesome 3's canonical Vue 3 integration). Task 1 dep bump lands on top; Task 2 verifies build still succeeds. |
| T-08-05-03 | Tampering | FA v7 supply-chain compromise | mitigate | @fortawesome is a known-maintained org (Fonticons Inc.); pin via caret to ^7.2.0. `npm audit` runs on install; HIGH/CRITICAL blocks. |
| T-08-05-04 | Information Disclosure | Blank SVG decorative-by-default renders empty to screen readers | accept | Pitfall 9: FA v7 defaults to decorative (screen readers skip). We don't use `autoA11y`. No A11y regression expected; no screen-reader verification in scope for desktop Electron tool. |

Block threshold: none (all mitigated or accepted).

</threat_model>

<verification>

After all 3 tasks complete:

1. `grep -rc "use.fontawesome.com" src/` → 0 (UI-04 closed)
2. `npm ls @fortawesome/vue-fontawesome` → 3.x present
3. `npm ls @fortawesome/fontawesome-svg-core` → 7.x present
4. `grep -c "app.component('font-awesome-icon'" src/renderer/main.js` → 1
5. Three-grep audit findings captured in summary
6. `npm run pack:renderer` → exits 0
7. `npm test` → 256/256
8. Two commits landed (deps + content)

Runtime UAT deferred to Plan 06's final checkpoint — icons' actual rendering verified there.

</verification>

<success_criteria>

Plan 05 complete when:
- [ ] package.json has @fortawesome/* at ^7.x and @fortawesome/vue-fontawesome at ^3.x
- [ ] `npm install` clean
- [ ] `src/renderer/main.js` imports from `@fortawesome/vue-fontawesome` (v3) and uses `app.component('font-awesome-icon', FontAwesomeIcon)`
- [ ] Three-grep icon audit findings documented in summary (1 row per icon)
- [ ] Any v6→v7 renamed icon updated (import + library.add + template usages)
- [ ] Any zero-usage icon pruned
- [ ] `grep -rc "use.fontawesome.com" src/` → 0 (UI-04 closed)
- [ ] `npm run pack:renderer` exits 0
- [ ] `npm test` → 256/256
- [ ] Two commits per D-08-18
- [ ] Plan summary at `.planning/phases/08-vue3-core-merged/08-05-SUMMARY.md`

</success_criteria>

<output>
After completion, create `.planning/phases/08-vue3-core-merged/08-05-SUMMARY.md` documenting:
- Three-grep audit table (icon | template-usage | dynamic-usage | iconpack-usage | verdict: KEEP/PRUNE/RENAMED)
- Any v7 icon renames applied (old name → new name)
- A8 outcome (FA v7 icon rename coverage — clean, or X icons renamed)
- `npm view` verified pinned versions (svg-core, free-solid, free-brands, vue-fontawesome)
- `dist/renderer.js` bundle size (running total of ±10% gate)
- Commit SHAs for commits 7+8
</output>
