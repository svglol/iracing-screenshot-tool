# Documentation images

Referenced from `RELEASE-NOTES-*.md` and the design notes by **absolute**
`raw.githubusercontent.com` URLs pointing at `master`. Two consequences worth
knowing before moving anything here:

- A relative path does **not** work in a GitHub release body. Release notes are
  rendered detached from the repo, so only absolute URLs resolve.
- **SVG does not render in a release body either.** `raw.githubusercontent.com`
  serves `.svg` as `text/plain`, so the browser refuses to draw it. Anything that
  has to appear in release notes needs a PNG. SVG is fine inside `.md` files
  viewed on github.com.
- Because the URLs point at `master` rather than at a tag, replacing a file here
  updates every release body that references it, with no `gh release edit`. That
  is deliberate while placeholders are in place — but it also means editing one of
  these changes what an already-published release shows.

## weighting-curves.svg / .png

Sample weight against position in the exposure window, for the three weighting
curves. **Generated from the same constants as `weightAt()`** in
`src/utilities/long-exposure/exposure-math.ts` — `TAPER_FLOOR` (0.02) and
`EASE_EXPONENT` (2.5). If either constant changes, this picture is wrong and has
to be redrawn; it is not derived at build time.

The SVG is the source and the PNG is what the release notes point at.

## weighting-example-{box,linear,ease}.png

**PLACEHOLDERS.** These are captioned cards, not captures — nothing here came out
of the tool. Replace them with three real long exposures.

To shoot a set that is genuinely comparable, only Weighting may differ:

1. Park the replay on the moment and open the Long Exposure panel.
2. Leave **Bracket shutters off**, and leave shutter, playback speed, passes,
   highlight recovery and Resolution alone for all three shots.
3. Shoot three times, changing **only** Weighting: box, then linear, then ease.

Re-shooting the same moment is exact by construction — the anchor lives in the
recipe rather than being re-read from the live cursor, so the three captures
integrate over the same window and differ only in how the frames were weighted.
Cropping them identically afterwards helps; a subject moving across frame reads
the difference best.

Keep the filenames as they are and the release notes pick the new images up with
no further edit.
