# iRacing Screenshot Tool v3.4.0

The big one this time is Graphics Profiles. Keep one set of iRacing graphics
settings for racing and another for screenshots, and swap between them with
a click. The tool also speaks seven more languages, and screenshots finally
look right on HDR monitors.

Some problems that used to end in a confusing error now tell you what to do.
We also fixed a Long Exposure bug that could save a black picture and report
success. That one was nasty, because nothing told you it had happened.

## New

- **Graphics Profiles.** Save your iRacing graphics settings and switch
  between them with a click.
- **A new layout.** Settings and Help are full pages, reached from a bar on
  the left.
- **Seven more languages.** Twenty in total.
- **Carry on numbering.** `{counter+5}` in the filename format starts your
  files at 5 instead of 0.
- **Picture size and file size in the gallery.** They show under each
  screenshot's name.
- **A FAQ in Help.** It covers the three problems people most often mistake
  for bugs.

## Fixes

- **Running as administrator.** Windows blocks capture for it. The tool now
  says so and shows the fix, where before you got a vague error.
- **HDR monitors.** Screenshots no longer come out far too bright.
- **Wrong ReShade.ini setting.** You get a clear message about what is
  wrong, where before you got "ENOENT".
- **Black Long Exposure pictures.** The tool refuses to save them, where
  before it saved them and reported success.
- **Documents in OneDrive.** The tool now finds iRacing's settings there.
- **Duplicate Long Exposure warnings.** Each warning shows once.

## In detail

### Graphics Profiles

Racing wants frame rate. Screenshots want everything turned up. Profiles
save you from changing the settings by hand every time. You switch between
them from the top of the window.

The panel tells you whether your current settings match one of your
profiles. You will often see something like "Based on Screenshots, with 5
settings changed since". That's normal. iRacing saves its graphics settings
every time it closes, so moving a single slider in the sim is enough to
drift away from a profile.

If you try to save settings you already have, the tool tells you which
profile holds them. Before every switch, it backs up your current settings
and keeps the last ten backups. You can't switch while iRacing is running.
iRacing would overwrite your change when it closes, and you'd never know.

### The new layout

Settings and Help used to open as pop-ups. Now they are full pages, and a
bar down the left side lets you move between Screenshots, Settings, Help and
our Discord. F1 still opens Help. The top of the window shows which profile
your iRacing settings match, and a "Modified" badge appears once they
change.

### Languages

Arabic, Russian, Japanese, Korean, Traditional Chinese, Greek and Turkish
join the thirteen from v3.3.0. Names like iRacing and ReShade stay in
English, and so do iRacing's menu names, so the tool matches what you see in
the sim.

### Running as administrator

Windows blocks screen capture for programs running as administrator. Every
screenshot and long exposure failed with "Could not start video source",
which told you nothing useful. The setting is easy to switch on by accident,
often while troubleshooting something else.

The tool now checks whether Windows will let it capture. If Windows says no,
a warning appears above the Screenshot button and tells you how to fix it.
For administrator mode, close the tool, right-click
`iRacing Screenshot Tool.exe`, choose Properties and open the Compatibility
tab. Untick "Run this program as an administrator". Click "Change settings
for all users" and untick it there as well. Then start the tool normally.

If something else is blocking capture, like a privacy setting, a company
policy or security software, the warning says so. ReShade Compatibility Mode
keeps working either way.

### HDR monitors

With HDR turned on in Windows, bright areas blew out to white. The tool now
notices when iRacing is on an HDR monitor and converts the picture to normal
colors. Nothing changes on regular monitors. Thanks to @kylemcd, who found
this and fixed it.

### ReShade.ini messages

If ReShade Compatibility Mode pointed at the wrong file, you got "ENOENT" or
"unable to determine the screenshot folder". Neither told you what to do.
The tool now says what is wrong and how to fix it, for example that the file
is missing or that you picked a ReShade preset instead of ReShade.ini. The
message shows above the Screenshot button and next to the setting in
Settings. When you turn ReShade Compatibility Mode on and the saved location
doesn't work, the tool looks for ReShade.ini in your iRacing folder by
itself.

### Black or frozen Long Exposure pictures

Long Exposure could save a black or frozen picture and say it worked. This
happened most on a busy graphics card with little memory to spare. The tool
now spots a black result and refuses to save it. A frozen result is
still a real picture, so the tool saves it and warns you that it isn't the
exposure you set.

### Documents in OneDrive

If Windows keeps your Documents folder somewhere else, usually OneDrive, the
tool couldn't find iRacing's settings. Graphics Profiles and the warnings
about your iRacing settings had nothing to work with, and nothing told you.
The tool now finds the folder wherever Windows has put it.

## Notes

- Windows may say it "protected your PC" the first time you run the
  installer. Click More info, then Run anyway. You see this because the
  release isn't digitally signed yet, and none of our releases have been.
  Signing is in progress and should arrive in a later release.
- We updated the browser engine the app is built on, which brings in its
  latest security fixes.
- iRacing still needs to run in Windowed Borderless. In iRacing's Full
  Screen mode, captures still come out black.
- On Windows 10 versions older than 2004, the mouse pointer can show up in
  your captures. The tool warns you if your PC is affected.

## Get it

- Installer, which most people want: `iRacing-Screenshot-Tool-Setup-3.4.0.exe`
- Portable, runs without installing: `iRacing-Screenshot-Tool-3.4.0.exe`
