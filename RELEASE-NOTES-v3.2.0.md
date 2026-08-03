# iRacing Screenshot Tool — v3.2.0

Long exposure photography, from your replays.

## What's new

- **Long Exposure photo mode.** Blend hundreds of replay frames into one image, the way leaving a camera shutter open does: the car streaks, the world stays sharp. Scrub a replay to the moment you want, press **Long Exposure**, and the tool drives the replay itself and accumulates every frame the sim presents on the GPU. Find it in the sidebar under the Screenshot button.
- **Shutter, from 1/1000 to 10 seconds.** The familiar photographic ladder decides how long the streaks are. Shutters faster than a single replay frame work too — the exposure opens partway through a frame rather than being rounded up to one.
- **Playback speed.** The replay runs in slow motion while the exposure is captured, so the sim presents more frames and the blend gets more samples. Pick a speed, or set a target sample count and let the tool solve for the fastest playback that reaches it.
- **Bracket shutters.** One capture, one image per shutter stop at or faster than the one you chose — a shot at 1/60 also gives you 1/125, 1/250, 1/500 and 1/1000. Costs almost no extra time, because every stop ends on the same frame and a faster shutter is simply the tail of the frames already going past. It does cost video memory, so it is checked before the capture starts and declined rather than crashing iRacing.
- **Frame interpolation.** On NVIDIA Turing or newer, the GPU's optical-flow engine invents frames between the real ones to close the gaps in a streak. Hidden entirely on hardware that cannot do it, and the tool tells you afterwards if it could not keep up.
- **Passes.** Visit the same moment several times and accumulate into one image, catching frames the other passes missed. Smoother, not brighter. The right lever at high resolutions, where interpolation cannot keep up.
- **Highlight recovery.** Boosts near-clipped highlights before the frames are added up, so a headlight sweeping through part of the exposure reads as a bright trail instead of a grey smudge.
- **16-bit masters.** Choosing PNG writes a true 16-bit file with an 8-bit preview alongside it — real headroom if you intend to grade the shot.
- **A Long Exposure guide in Help.** The Help window now has tabs, with a page explaining what every parameter does and when to reach for passes instead of interpolation.

## Fixes & improvements

- Long exposures now honour **Crop Watermark** and the **Resolution** setting, both of which they previously ignored — a long exposure at 8K really is 8K, with the watermark cropped off exactly as a screenshot has it.
- **Focus comes back to the app** when a capture finishes, instead of leaving you looking at iRacing after a shot that ended minutes ago.
- The **Long Exposure button stays reachable** with the panel collapsed, along with Cancel and the progress readout.
- **Warnings are readable.** Sidebar and long-exposure messages are now one card instead of a stack of up to six, and the text has real contrast against its background — some warnings were previously near-invisible.
- The **Output** line at the top of the sidebar now names the file format alongside the dimensions.
- **8K masters no longer freeze the app.** A 33-megapixel 16-bit PNG used to lock the window for about a minute while it was written; it now streams off the main thread and takes about ten seconds. Choosing JPEG makes the same frame take under one.
- **Gradient banding fixed** in previews and 8-bit output, which showed up as visible steps in skies.
- The **sidebar scrolls** instead of clipping its controls off-screen on short windows.
- Each shot's exact settings, sample count and sample evenness are recorded as a `.json` file in the log folder, keeping the last 20 captures — so a shot that looks wrong can be explained rather than guessed at.
- Patched dependency advisories reported by `npm audit`.

## Notes

- Long exposure needs a **replay** — a live session has no window of past frames to integrate over.
- It captures natively and does **not** use ReShade, so ReShade effects will not appear in the result.
- Like all captures, it needs iRacing in **Windowed Borderless**; exclusive Full Screen comes back black.

## Get it

- **Installer** — `iRacing Screenshot Tool Setup 3.2.0.exe`
- **Portable** — `iRacing Screenshot Tool 3.2.0.exe`
