# iRacing Screenshot Tool — v3.2.1

Long exposure photography, from your replays.

## What's new

- **Long Exposure photo mode.** Blend hundreds of replay frames into one image, the way leaving a camera shutter open does: the car streaks, the world stays sharp. Scrub a replay to the moment you want, press **Long Exposure**, and the tool drives the replay itself and accumulates every frame the sim presents on the GPU. Find it in the sidebar under the Screenshot button.
- **Shutter, from 1/1000 to 10 seconds.** The familiar photographic ladder decides how long the streaks are. Shutters faster than a single replay frame work too — the exposure opens partway through a frame rather than being rounded up to one.
- **Playback speed.** The replay runs in slow motion while the exposure is captured, so the sim presents more frames and the blend gets more samples. Pick a speed, or set a target sample count and let the tool solve for the fastest playback that reaches it.
- **Weighting — how the streak is shaped.** The exposure is *trailing*: the frame you parked on is the last one in it, and the window reaches backwards from there. **Box** weights every frame equally, for an even streak like a shutter simply held open. **Linear** ramps up towards that final frame, so the subject is sharpest where it ended and fades back along the path it took. **Ease** is the same idea with a sharper head and a longer, softer tail. Neither taper fades quite to nothing, so a streak trails off instead of stopping at a hard edge.

![How much each captured frame counts, for the box, linear and ease weighting curves](https://raw.githubusercontent.com/svglol/iracing-screenshot-tool/master/docs/images/weighting-curves.png)

Linear reaches half weight halfway through the window; ease not until three quarters of the way through. That is the difference between the two, as a number rather than an adjective.

| | | |
|:--:|:--:|:--:|
| ![Box weighting example](https://raw.githubusercontent.com/svglol/iracing-screenshot-tool/master/docs/images/weighting-example-box.png) | ![Linear weighting example](https://raw.githubusercontent.com/svglol/iracing-screenshot-tool/master/docs/images/weighting-example-linear.png) | ![Ease weighting example](https://raw.githubusercontent.com/svglol/iracing-screenshot-tool/master/docs/images/weighting-example-ease.png) |
| **Box** | **Linear** | **Ease** |
- **Bracket shutters.** One capture, one image per shutter stop at or faster than the one you chose — a shot at 1/60 also gives you 1/125, 1/250, 1/500 and 1/1000. Costs almost no extra time, because every stop ends on the same frame and a faster shutter is simply the tail of the frames already going past. It does cost video memory, so it is checked before the capture starts and declined rather than crashing iRacing.
- **Frame interpolation.** On NVIDIA Turing or newer, the GPU's optical-flow engine invents frames between the real ones to close the gaps in a streak. Hidden entirely on hardware that cannot do it, and the tool tells you afterwards if it could not keep up.
- **Passes.** Visit the same moment several times and accumulate into one image, catching frames the other passes missed. Smoother, not brighter. The right lever at high resolutions, where interpolation cannot keep up.
- **Highlight recovery.** Boosts near-clipped highlights before the frames are added up, so a headlight sweeping through part of the exposure reads as a bright trail instead of a grey smudge.
- **16-bit masters.** Choosing PNG writes a true 16-bit file with an 8-bit preview alongside it — real headroom if you intend to grade the shot. Long exposures obey the **Resolution** and **Crop Watermark** settings, so one at 8K really is 8K with the watermark trimmed off, exactly as a screenshot has it.
- **Every shot explains itself.** Each long exposure records its exact settings, sample count and sample evenness as a `.json` file in the log folder, keeping the last 20 captures — so a shot that looks wrong can be explained rather than guessed at.
- **A Long Exposure guide in Help.** The Help window now has tabs, with a page explaining what every parameter does and when to reach for passes instead of interpolation.

## Fixes & improvements

- The **sidebar scrolls** instead of putting controls out of reach on short windows. The page itself does not scroll, so anything past the bottom edge was previously unreachable rather than merely cut off.
- **Sidebar warnings are a single card** instead of a stack of separate banners, and severity is now carried by an icon and a coloured rule rather than by colour alone.
- The **Output** line at the top of the sidebar now names the file format alongside the dimensions.
- Patched dependency advisories reported by `npm audit`.

## Notes

- **Bracket shutters and frame interpolation cannot both run.** Turning bracketing on takes the shot without interpolation, and the panel says so before you press the button.
- It captures natively and does **not** use ReShade, so ReShade effects will not appear in the result.
- Like all captures, it needs iRacing in **Windowed Borderless**; exclusive Full Screen comes back black.

## Get it

- **Installer** — `iRacing Screenshot Tool Setup 3.2.1.exe`
- **Portable** — `iRacing Screenshot Tool 3.2.1.exe`
