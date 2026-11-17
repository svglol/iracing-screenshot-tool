# iRacing Screenshot Tool v3.6.1

Capture Grid now works in live sessions, and the gallery can open the
folders your grids are saved in.

## Fixes

### Capture Grid in a live session

In v3.6.0, a grid started while you were in a live session (a race, a test
session or an AI race you are still in) failed nearly every car with "the
car is not moving". Only the car the camera was on got shot.

In a live session, iRacing reports where every car is in the live race,
even while you watch the replay. So the tool could never see a car at the
moment on screen. It now keeps its own record of where every car is while
it runs, and the grid uses that record in a live session. Cars are lined up
as precisely as in a saved replay.

One limit: the tool only knows where cars were from the moment it started
running. If the replay is on a moment from before that, the Capture grid
panel says so. Move the replay to a later moment. Saved replays are not
affected and work as before.

### Grid shots no longer share thumbnails

Every grid names its shots the same way, for example `Daytona-GNG B-0.jpg`,
so different grids could show each other's thumbnails in the gallery. Each
folder now keeps its own thumbnails.

## New

### Folders in the gallery

Each grid is saved in its own folder, and the gallery can now open them.

- **Folders sit in the thumbnail strip** among your screenshots. Each shows
  its newest picture and its name, and is placed by the date of that
  picture. Click a folder to open it.
- **A folder bar** above the picture shows where you are. Click a folder
  name in it to jump back up, use the arrow to go up one folder, or open
  **Folders** for a list of the folders here.
- **Back to screenshot folder** takes you straight home.
- **Backspace goes back** to the folder you came from, with the picture you
  had selected there.
- **While a grid runs**, the gallery opens that grid's folder, so each shot
  shows up as it is taken.

## Changes

- The new text in this release is in English in every language for now.
  Translations will follow in a later release.

## Notes

- If you are on v3.4.0 or later, the tool offers this update itself. Click
  the update icon at the top of the window.
- Windows may say it "protected your PC" the first time you run the
  installer. Click More info, then Run anyway. The release isn't digitally
  signed yet. Signing is in progress.
- iRacing still needs to run in Windowed Borderless. In iRacing's Full
  Screen mode, captures still come out black.
- Neither iRacing nor this tool should run as administrator. Windows stops
  the two from working together when either one does.

## Get it

- Installer, which most people want: `iRacing-Screenshot-Tool-Setup-3.6.1.exe`
- Portable, runs without installing: `iRacing-Screenshot-Tool-3.6.1.exe`
