# iRacing Screenshot Tool v3.5.0

A Long Exposure release. Dirt, smoke and exhaust flames are now there from
the very first moment of a long exposure, where before they could be missing
after you rewound the replay. The Advanced settings are easier to read at a
glance, and one setting that never paid its way is gone.

## New

- **Effects warm-up.** Rewinding a replay wipes dirt, smoke, exhaust flames
  and wheel-spin blur, so a long exposure could start looking frozen. The
  tool now plays a few seconds of the replay at normal speed before each
  exposure, so those effects are back when the shutter opens. It is set to
  3 seconds; change it under Advanced, from off to 5 seconds. Each second
  adds a second to every pass.
- **Easier Advanced settings.** Weighting and Passes are now rows of buttons
  you can read without opening anything, and each Weighting button shows the
  shape of its curve. Effects warm-up and Highlight recovery are sliders.
  Hover over a button to see what it does.

## Changes

- **Frame interpolation is gone.** This NVIDIA-only option made up extra
  frames between the real ones. In testing it was never better than Passes:
  it could not fill the whole exposure, and it could leave visible repeated
  copies along a streak. Use Passes instead; 2× or 4× is usually enough for
  a short shutter. If you had interpolation turned on, there is nothing to
  do. Your shots simply use real frames now.
- **Highlight recovery runs from 0 to 6, in whole stops.** Settings above 6
  only made tiny glints brighter, not the trails you want. If you had set
  more than 6, or a half stop, it is rounded to the nearest whole stop up to
  6 the first time you open the panel.

## Fixes

- **Duplicate Long Exposure warnings with tooltips turned off.** With
  "Disable Tooltips" on, every warning showed twice after a shot. Each shows
  once now.

## Notes

- If you are on v3.4.0 or v3.4.1, the tool offers this update itself. Click
  the update icon at the top of the window.
- Windows may say it "protected your PC" the first time you run the
  installer. Click More info, then Run anyway. The release isn't digitally
  signed yet. Signing is in progress.
- iRacing still needs to run in Windowed Borderless. In iRacing's Full
  Screen mode, captures still come out black.
- At very high Long Exposure resolutions such as 8K, iRacing draws so few
  frames that a fast shutter may catch only one per pass, and the result
  looks nearly frozen. Use a lower resolution, a slower shutter or more
  passes.

## Get it

- Installer, which most people want: `iRacing-Screenshot-Tool-Setup-3.5.0.exe`
- Portable, runs without installing: `iRacing-Screenshot-Tool-3.5.0.exe`
