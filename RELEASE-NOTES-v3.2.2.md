# iRacing Screenshot Tool — v3.2.2

A patch release: Windows 10 fixes, and updates that actually arrive.

## Fixes

- **Long Exposure works on Windows 10 again.** It asked Windows for two capture options that only exist on Windows 11, and Windows 10 refused the entire capture rather than just those options — so every long exposure ended with _"iRacing did not present any frames to capture."_ The tool now asks only for what your version of Windows actually supports. Regular screenshots were never affected: they quietly fell back to the older capture path, which is why this only ever surfaced in Long Exposure.
- **Automatic updates now work.** Every release so far was published without the file the updater looks for, so the tool never found a newer version and never told you one existed. Fixed from this release onward — you shouldn't have to check back here manually again.
- **High-Fidelity Capture tells you up front if your machine can't run it.** Turning it on now checks your Windows version and takes a trial capture, instead of letting a failed screenshot be the discovery.
- **Long Exposure now honours the High-Fidelity Capture switch.** It always needed that capture path but ignored the setting, so switching it off changed nothing and the failure only appeared minutes into a capture. The panel now points at the switch when it's off.
- **A failed Long Exposure explains itself.** When no frames arrive, the underlying reason is now shown and written to the log instead of being discarded.

## Notes

- On **Windows 10 before version 2004**, the mouse cursor can show up in captures — hiding it is a newer Windows feature. The tool warns you when that applies to your machine.
- The Windows 10 path is covered by tests, but no capture has been run on Windows 10 hardware. If something still looks wrong there, please open an issue.
- Unchanged: captures need iRacing in **Windowed Borderless**. Exclusive Full Screen still comes back black.

## Get it

- **Installer** — `iRacing Screenshot Tool Setup 3.2.2.exe`
- **Portable** — `iRacing Screenshot Tool 3.2.2.exe`
