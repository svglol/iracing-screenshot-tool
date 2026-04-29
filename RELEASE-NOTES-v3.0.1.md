# v3.0.1

A quick follow-up to v3.0.0 fixing two regressions around the **Crop Watermark** toggle.

## What's fixed

### Toggles now respond to clicking the label

In v3.0.0 the toggles in the sidebar and Settings looked clickable everywhere, but only the small switch graphic actually flipped them — clicking the text "Crop Watermark", "Disable Tooltips", "Reshade Compatibility Mode", etc. did nothing. That's fixed. Click anywhere on the row — switch or text — and it toggles.

If you turned **Crop Watermark** on in v3.0.0 and your screenshots still had the watermark, this is why. The setting was never actually being saved.

### ReShade screenshots now crop the watermark again

Even with the toggle working, ReShade-mode screenshots were saving at a slightly larger size with the watermark still visible. The crop step was being silently skipped on the ReShade path. Now ReShade screenshots come out at the resolution you picked, watermark removed — same as the non-ReShade flow.

## How to get it

- **Installer (recommended)** — `iRacing Screenshot Tool Setup 3.0.1.exe`
- **Portable (no install)** — `iRacing Screenshot Tool 3.0.1.exe`

Settings carry over from v3.0.0 — nothing to do beyond installing.

## 🙏 Thank you

To the user who flagged the toggle and the un-cropped ReShade output the same evening v3.0.0 shipped — those reports turned a silent regression into a one-day fix.
