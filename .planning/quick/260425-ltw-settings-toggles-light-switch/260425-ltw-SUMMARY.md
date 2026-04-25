---
phase: quick-260425-ltw
status: complete
date: 2026-04-25
---

# Quick Task 260425-ltw: Settings toggles — light-switch style, inline-left of label

## What changed

Restyled the 5 toggle rows in `SettingsModal.vue` to look and read like physical light switches:

1. **Position**: switch moved to the LEFT of its section label (was right via `margin-left: auto`).
2. **Shape**: squarish rectangular track (~58×26px, 4px corner radius) — applied via `:rounded="false"` on `<o-switch>` so theme-bulma drops the `is-rounded` class and the input falls through to the non-rounded `--bulma-radius` value, plus a scoped CSS override that pins the exact dimensions.
3. **Labels**: visible "OFF" / "ON" text overlaid on the track via the wrapper `.switch::before` (ON, left) and `.switch::after` (OFF, right). Visibility swaps using `:has(input.check:checked)`. The thumb covers the inactive label so the user always reads the CURRENT state at a glance.

The 5 toggles changed:
- Custom Filename Format
- Disable Tooltips
- Prefer top-left watermark crop
- Manual Window Restore
- Reshade Compatibility Mode

## Why these targets work

Verified Oruga 0.13 + theme-bulma DOM in `node_modules`:
- `theme.js` `switch:` config maps `rootClass: "switch control"`, `inputClass: "check"`, `roundedClass: "is-rounded"`, `checkedClass: "switch-checked"` (the latter not used here — `:has(input.check:checked)` is more reliable than relying on the framework-derived checked class).
- `theme-bulma/dist/scss/components/_switch.scss` shows the thumb is `input.check::before` with `transform: translate3d(100%, 0, 0)` on `:checked` — so the CSS-level shape and motion are baked in; we only override sizing/radius/colors and add the OFF/ON pseudo-elements on the wrapper.
- `:has()` is Chromium-105+; Electron's bundled Chromium supports it.

`<o-field class="settings-toggle-row">` becomes a flex row containing the switch first and a `.settings-toggle-row__text` block second. No template-level position prop on `<o-switch>` because flipping `position` to `left` would only change where Oruga puts the LABEL slot relative to the input — we use no slot here, so `position` would be a no-op; structuring our own wrapper is cleaner and explicit.

## Final diff

| File | + | - |
|------|---|---|
| `src/renderer/components/SettingsModal.vue` | +116 | -27 |

Single file. No `.scss` global edits, no node_modules churn, no functional changes (v-model bindings and watch handlers untouched — config writes still flow through the same paths).

## Verification

- `npm run pack` → exit 0, no new SCSS deprecations, no Vue compile errors.
- `git grep -nc settings-toggle-row src/renderer/components/SettingsModal.vue` → 12 (5 template uses + 7 CSS occurrences).
- `git grep -nc ':rounded="false"' src/renderer/components/SettingsModal.vue` → 5.
- `git grep -nc 'margin-left: auto' src/renderer/components/SettingsModal.vue` → 0 (legacy alignment style fully removed).
- `git grep -nc ':has(input.check:checked)' src/renderer/components/SettingsModal.vue` → 3 (thumb-checked: track-color swap, ON show, OFF hide).

Manual UI verification deferred to user — the rendered look is interactive and the user explicitly described the intended visual style.

## Notes

- No `!important` used. Scoped + `:deep()` specificity wins cleanly over Bulma's defaults in this surface.
- `--bulma-primary` is the existing red (`#ec202a`) the project uses for accents — checked-state track inherits the brand color.
- Mobile (≤900px) layout was not touched. The flex row should still render fine at narrow widths because the description text is the only flex item that grows; `min-width: 0` on the text block prevents overflow.
