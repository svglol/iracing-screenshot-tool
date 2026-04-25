---
phase: quick-260425-ltw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/renderer/components/SettingsModal.vue
autonomous: true
requirements:
  - LTW-UI-01  # Toggle visually positioned to the LEFT of its section label, vertically centered with the label block
  - LTW-UI-02  # Toggle track renders squarish (small border-radius), wider than the default Oruga rounded pill
  - LTW-UI-03  # Visible "ON" / "OFF" text labels inside the track that swap with the checked state (light-switch idiom)
  - LTW-UI-04  # Functionality unchanged — v-model bindings still drive config writes via the existing watch handlers
must_haves:
  truths:
    - "Open Settings: each of the 5 toggle rows (Custom Filename Format, Disable Tooltips, Prefer top-left watermark crop, Manual Window Restore, Reshade Compatibility Mode) shows the switch on the LEFT side of the row, with the label + description text to its RIGHT."
    - "Each switch track is rectangular with small (~4px) corner radius, NOT a fully-rounded pill."
    - "When a toggle is OFF: the text 'OFF' is visible in the right half of the track (the half not covered by the thumb). When ON: the text 'ON' is visible in the left half."
    - "Clicking the switch (or its label area) still flips state and triggers the existing `watch` handler that writes the new value to config — no functional regression."
    - "Disabled inputs (filepath rows) and other o-input controls are not visually affected."
    - "`npm run pack` (electron-vite build) exits 0 with no NEW warnings (existing silenced SCSS deprecations remain silenced)."
  artifacts:
    - path: "src/renderer/components/SettingsModal.vue"
      provides: "Five `<o-field>` toggle rows restructured: switch is the first flex child, label block is the second. `<o-switch>` carries `:rounded='false'`. Scoped CSS adds `.settings-toggle-row` flex layout and `:deep(.switch)` overrides to widen the track, square the corners, and inject OFF/ON pseudo-element labels that swap visibility via `:has(input:checked)`."
      contains: "settings-toggle-row"
  key_links:
    - from: "<o-switch :rounded='false'>"
      to: "Oruga theme-bulma rendered DOM"
      via: "Switch.vue defineClasses → theme-bulma config drops `is-rounded` class when rounded prop is false"
      pattern: ":rounded=\"false\""
    - from: ".settings-toggle-row .switch::before / ::after"
      to: "OFF/ON labels visible inside switch track"
      via: ":has(input:checked) selector on .switch element to swap pseudo-element opacity"
      pattern: ":has(input:checked)"
---

<objective>
Make the SettingsModal toggles render in a light-switch idiom:

1. **Position**: switch on the LEFT of the section label, vertically centered.
2. **Shape**: squarish (small border-radius), rectangular track wider than the default Oruga pill.
3. **Labels**: visible "OFF" / "ON" text inside the track. The thumb covers the inactive label so the user always reads the CURRENT state at a glance.

Constraint: 5 toggle blocks in `src/renderer/components/SettingsModal.vue`, plus scoped CSS additions. No JS/data changes. Bindings (`v-model`) and watch handlers stay intact.

Output: edits to SettingsModal.vue only.
</objective>

<context>
@src/renderer/components/SettingsModal.vue

<oruga_facts>
- `<o-switch>` from `@oruga-ui/oruga-next` with `theme-bulma` renders to:
  ```html
  <div data-oruga="switch" class="switch control [is-rounded] [has-{position}-label] [is-{size}] [is-{variant}]">
    <input type="checkbox" class="check" role="switch" v-model:checked>
    <label class="control-label">slot/label</label>
  </div>
  ```
  (Verified in `node_modules/@oruga-ui/theme-bulma/dist/theme.js` `switch:` config and `node_modules/@oruga-ui/theme-bulma/dist/scss/components/_switch.scss`.)
- `:rounded="false"` drops the `is-rounded` class — the `.check` input then uses `radius` (Bulma `--bulma-radius`, ~4-6px) instead of `radius-rounded` (50%).
- The thumb is rendered as `input.check::before` via CSS — translated from 0% to 100% via `transform: translate3d(100%, 0, 0)` when `:checked`. Position is controlled by `transform-origin: left`.
- `:has()` is supported in Chromium 105+; Electron's bundled Chromium is well past that.

Toggle locations in current SettingsModal.vue (line numbers approximate, verify in file):
1. Line ~64-67 — Custom Filename Format
2. Line ~150-153 — Disable Tooltips
3. Line ~167 — Prefer top-left watermark crop
4. Line ~181-184 — Manual Window Restore
5. Line ~239 — Reshade Compatibility Mode

Each currently follows this pattern:
```vue
<o-field>
  <div>
    <span class="label" style="margin-bottom: 0px">Title</span>
    <span class="description">Description text</span>
  </div>
  <o-switch v-model="x" style="margin-left: auto" />
</o-field>
```
The `margin-left: auto` pushes the switch to the right of a flex container.
</oruga_facts>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Restructure toggle markup — switch first, label block second</name>
  <files>src/renderer/components/SettingsModal.vue</files>
  <behavior>
    For all 5 toggle rows: switch is rendered before the label/description, both inside a `<o-field class="settings-toggle-row">` wrapper. The `style="margin-left: auto"` inline style is removed (no longer needed — switch is now naturally first). The switch carries `:rounded="false"` so the track uses the squarish radius variable instead of the rounded pill.
  </behavior>
  <action>
    For each of the 5 toggle blocks, change:

    ```vue
    <o-field>
      <div>
        <span class="label" style="margin-bottom: 0px">Title</span>
        <span class="description">Description text</span>
      </div>
      <o-switch v-model="x" style="margin-left: auto" />
    </o-field>
    ```

    to:

    ```vue
    <o-field class="settings-toggle-row">
      <o-switch v-model="x" :rounded="false" class="settings-light-switch" />
      <div class="settings-toggle-row__text">
        <span class="label" style="margin-bottom: 0px">Title</span>
        <span class="description">Description text</span>
      </div>
    </o-field>
    ```

    Apply to all 5 toggles:
    - `customFilenameFormat`
    - `disableTooltips`
    - `cropTopLeft`
    - `manualWindowRestore`
    - `reshade`

    Do NOT change v-model bindings, the surrounding markup (hr, conditional `<div v-if="manualWindowRestore">` panel, etc.), or any `<o-field>` that does NOT contain a switch (filepath rows, output format select, number inputs, filenameFormat input).
  </action>
  <verify>
    Grep result: `git grep -n 'settings-toggle-row\b' src/renderer/components/SettingsModal.vue` returns 5 matches on `<o-field>` lines.
    Grep result: `git grep -n ':rounded="false"' src/renderer/components/SettingsModal.vue` returns 5 matches on `<o-switch>` lines.
    Grep result: `git grep -n 'margin-left: auto' src/renderer/components/SettingsModal.vue` returns 0 matches (all removed).
  </verify>
  <done>
    All 5 toggle rows restructured with switch first; `:rounded="false"` on every switch; legacy `margin-left: auto` inline styles removed.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add scoped CSS for light-switch styling</name>
  <files>src/renderer/components/SettingsModal.vue</files>
  <behavior>
    Scoped CSS makes:
    - `.settings-toggle-row` a flex row with vertical centering and a comfortable gap between switch and label block.
    - The Oruga `.switch` track wider (~58px) and squarish (~4px corners), with the thumb sized appropriately.
    - "OFF" and "ON" pseudo-element text labels overlaid on the track, swapping visibility with the checked state via `:has(input:checked)`. The thumb covers the inactive label.
    - Active (checked) state uses the existing Bulma primary-tinted switch background; inactive uses a neutral grey.
  </behavior>
  <action>
    In the existing `<style scoped>` block in SettingsModal.vue, append these rules after the existing `.settings-grid` rule and before the `@media (max-width: 900px)` block:

    ```scss
    .settings-toggle-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .settings-toggle-row__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    /* Light-switch styling for the in-row toggles only.
       Targets Oruga theme-bulma's rendered DOM (.switch wrapper, input.check track,
       input.check::before thumb). :deep() because <o-switch> is a child component. */
    :deep(.settings-light-switch.switch) {
      position: relative;
      flex-shrink: 0;
    }

    :deep(.settings-light-switch .check) {
      width: 58px;
      height: 26px;
      padding: 3px;
      border-radius: 4px;
      background: hsl(0, 0%, 28%);
    }

    :deep(.settings-light-switch .check:before) {
      width: 24px;
      height: 20px;
      border-radius: 3px;
      background: hsl(0, 0%, 88%);
    }

    /* OFF / ON labels overlaid on the track. The thumb covers the inactive label. */
    :deep(.settings-light-switch.switch::before),
    :deep(.settings-light-switch.switch::after) {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      pointer-events: none;
      transition: opacity 0.18s ease;
      z-index: 1;
    }

    /* OFF: visible by default (right side of the track, where the thumb isn't sitting). */
    :deep(.settings-light-switch.switch::after) {
      content: 'OFF';
      right: 8px;
      color: hsl(0, 0%, 75%);
      opacity: 1;
    }

    /* ON: hidden by default (covered by the thumb on the left when off). */
    :deep(.settings-light-switch.switch::before) {
      content: 'ON';
      left: 8px;
      color: hsl(0, 0%, 98%);
      opacity: 0;
    }

    /* Checked state: thumb has slid right; expose ON, hide OFF. */
    :deep(.settings-light-switch.switch:has(input.check:checked)) .check {
      background: var(--bulma-primary, #ec202a);
    }

    :deep(.settings-light-switch.switch:has(input.check:checked))::before {
      opacity: 1;
    }

    :deep(.settings-light-switch.switch:has(input.check:checked))::after {
      opacity: 0;
    }
    ```

    Do NOT modify any other rule. Do NOT use `!important` (the cascade order — scoped + `:deep` selector specificity — wins over Bulma's default rules; if a property fails to apply during verification, investigate the cascade rather than reaching for `!important`).
  </action>
  <verify>
    <automated>npm run pack</automated>
    Expected: exit 0; no new SCSS deprecation warnings; no Vue compile errors.
  </verify>
  <done>
    Scoped CSS rules added; build succeeds.
  </done>
</task>

</tasks>

<verification>
1. `npm run pack` exits 0.
2. `git diff --stat` shows ONLY `src/renderer/components/SettingsModal.vue` modified.
3. `git grep -nc 'settings-toggle-row' src/renderer/components/SettingsModal.vue` returns 5 (template uses) + however many in CSS (counted as occurrences).
4. `git grep -n ':has(input.check:checked)' src/renderer/components/SettingsModal.vue` returns at least 3 matches (the three :has rules).
5. `git grep -n 'margin-left: auto' src/renderer/components/SettingsModal.vue` returns 0 matches.
</verification>

<success_criteria>
- All 5 toggles render with switch on the LEFT of the label.
- All 5 switches are squarish (small radius, rectangular track).
- OFF/ON labels are visible inside the track and swap with state.
- v-model bindings still write to config via existing watch handlers.
- `npm run pack` exits 0 with no new warnings.
- Commit prefixed `fix(ui):` or `feat(ui):`, no Co-Authored-By line.
</success_criteria>

<output>
After completion, create `.planning/quick/260425-ltw-settings-toggles-light-switch/260425-ltw-SUMMARY.md` capturing:
- The 5 toggles changed (list).
- Oruga rendered DOM facts that informed the CSS targets.
- Final diff shape (single file, +N/-M).
- Commit SHA with `fix(ui):` prefix, no coauthor.
</output>
