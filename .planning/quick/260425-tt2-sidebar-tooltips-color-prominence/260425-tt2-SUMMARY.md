---
phase: quick-260425-tt2
status: complete
date: 2026-04-25
---

# Quick Task 260425-tt2: Sidebar tooltip notifications — restore color, tone down prominence

## What changed

Restored the "colored text on dark transparent panel" tooltip aesthetic in `SideBar.vue` after the v2.0 Buefy → Oruga / Bulma 0.9 → 1.0 migration regressed it.

**Four `<o-notification>` instances updated** (all in main view's left sidebar):
| variant | condition | text color restored |
|---------|-----------|---------------------|
| `warning` | `resolution ∈ {4k,5k,6k,7k,8k}` && `!disableTooltips` | `#ffdd57` (yellow) |
| `info` | `crop && !disableTooltips` | `rgb(50, 152, 220)` (blue) |
| `warning` | `v-for` over `configWarnings` (iRacing config check failures) | `#ffdd57` (yellow) |
| `danger` | `reshade && !disableTooltips` | `#ff6b6b` (red) |

For each:
1. Removed `<strong>...</strong>` wrapping the message body — was making text bold.
2. Removed inline `color: yellow;` from `style="..."` — was overriding every variant with the same hardcoded yellow.
3. Added `class="sidebar-tooltip"` to namespace the new CSS.

Replaced the `<style>` block:
- Dropped the dead `.message.is-warning .message-body` and `.message.is-info .message-body` rules — Buefy/Bulma 0.9 message-component selectors that no longer match anything since Oruga 0.13 + Bulma 1.0 renders `.notification > .media > .media-content`.
- Added `.sidebar-tooltip.notification` rules: `padding: 0.6rem 0.85rem`, `font-size: 0.78rem`, `line-height: 1.25`, `font-weight: 400` — roughly half of Bulma 1.0's default padding, smaller font, tighter line-height, normal weight.
- Added `.sidebar-tooltip.notification.is-{warning|info|danger} .media-content { color: ... }` — variant-appropriate text colors restored.
- Kept the unrelated `.control-label { font-weight: 700 }` rule (app-wide form-label rule).

## Why the old CSS was inert

Verified the rendered DOM in `node_modules/@oruga-ui/theme-bulma/dist/theme.js`:
```js
notification: {
  rootClass: "notification",
  wrapperClass: "media",
  contentClass: "media-content",
  positionClass: "is-",
  ...
}
```

So `<o-notification variant="warning">` renders to `<div class="notification is-warning"><div class="media"><div class="media-content">…</div></div></div>`. The legacy selectors `.message.is-warning .message-body` from the Buefy era never matched after the v2.0 migration — the `.message` ancestor doesn't exist in the new DOM. Result: every notification fell back to Bulma 1.0's default text color, which the inline `color: yellow !important`-equivalent inline style then overrode app-wide on every variant — hence the "lost color information" symptom.

## Why namespace via .sidebar-tooltip

The `<style>` block in SideBar.vue is unscoped (and has been historically — `.control-label` lives there as an app-wide form rule). A bare `.notification.is-warning .media-content { color: ... }` would also affect programmatic toast notifications fired from `useOruga().notification.open(...)` in the same file (screenshot saved success / screenshot failed error). Those toasts mount inside Oruga's `.notices` container at app root and use the same `.notification` classes. The `.sidebar-tooltip` class is only added to the four in-template instances, so toasts keep their default Bulma 1.0 appearance.

## Final diff

| File | + | - |
|------|---|---|
| `src/renderer/components/SideBar.vue` | +44 | -24 |

## Verification

- `npm run pack` → exit 0, no new SCSS deprecations.
- `git grep -nc 'class="sidebar-tooltip"' src/renderer/components/SideBar.vue` → 4.
- `git grep -nc 'color: yellow' src/renderer/components/SideBar.vue` → 0.
- `git grep -nc '<strong' src/renderer/components/SideBar.vue` → 0.
- `git grep -nc '\.message\.is-' src/renderer/components/SideBar.vue` → 1 (explanatory comment in CSS, no live rule).
- `git grep -nc 'sidebar-tooltip' src/renderer/components/SideBar.vue` → 11 (4 template + 7 CSS occurrences).

Manual UI verification deferred to user — the rendered look is interactive.

## Notes

- No `!important` in the new rules — `.sidebar-tooltip.notification` two-class specificity already beats Bulma 1.0's single-class `.notification.is-{variant}` defaults cleanly.
- The colors restored (`#ffdd57`, `rgb(50, 152, 220)`, `#ff6b6b`) match the v1.4 hex values where possible. Danger red was newly chosen — Bulma 1.0's dark-scheme red is too muted for the "you need to do something" cue this notification carries.
- The inline `style="background-color: rgba(0,0,0,0.3) !important; margin-top:..."` is preserved on each notification — the dark transparent background panel look is intentional and isn't part of this regression.
