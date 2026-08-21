# iRacing Screenshot Tool
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/svglol/iracing-screenshot-tool)](https://github.com/svglol/iracing-screenshot-tool/releases) [![Build](https://img.shields.io/github/actions/workflow/status/svglol/iracing-screenshot-tool/ci.yml?branch=master)](https://github.com/svglol/iracing-screenshot-tool/actions/workflows/ci.yml) [![Downloads](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fsvglol%2Firacing-screenshot-tool%2Fmaster%2F.github%2Fbadges%2Fdownloads.json)](https://github.com/svglol/iracing-screenshot-tool/releases) [![Discord](https://img.shields.io/discord/626921718442754048.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/GX2kSgN)

![](https://raw.githubusercontent.com/svglol/iracing-screenshot-tool/master/static/screenshot.png?v=6)

# About
A tool created to take high resolution screenshots of iRacing without having to use Nvidia DSR.
Created using Electron and Vue.

# Features
* A wide range of resolutions to choose from, from HD up to 8K, including custom resolutions
* True-color native capture (Windows Graphics Capture), with automatic fallback on systems that don't support it
* Long Exposure photo mode - blend hundreds of replay frames into one image, with photographic shutter speeds from 1/1000s to 10s, shutter bracketing, GPU frame interpolation (NVIDIA Turing or newer), multi-pass accumulation and 16-bit PNG masters
* Auto Crop the iRacing watermark - user must resize iRacing UI to smallest size
* Global Screenshot Hotkey (Control+PrintScreen)
* Track and Driver Names included in filename, so you can keep track of screenshots easier
* Graphics Profiles - store iRacing graphics configurations and switch between them (e.g. a triple-screen setup for racing and a single-screen one for screenshots)
* VRAM safety check - warns about resolutions likely to crash iRacing before you take the shot
* JPEG, PNG and WebP output formats
* Available in 20 languages
* Automatic update checks - the app tells you when a new version is available and you decide when to download and install it

# Limitations
* iRacing must be run in Borderless Windowed mode
* iRacing may run out of VRAM at higher resolutions causing the game to crash (8GB VRAM should be enough for 8K resolution in most situations)

# Instructions
1. iRacing **must** be running in Windowed Borderless Mode
2. Run iRacing and setup the camera in the position you want to take the screenshot
3. Select your desired resolution (Try lower resolutions before going to 8K)
4. Select if you want to crop the iRacing watermark or not, if you want to crop it you will need to resize the iRacing UI with 'Control + PageDown' to the smallest size first
5. Press the screenshot button or use the Hotkey 'Control + PrintScreen' to take the screenshots
6. Depending on the resolution selected this may take a few seconds, once your iRacing screen resizes to its normal size it is finished
7. Your screenshot will be saved to 'C:\Users\{User}\Pictures\Screenshots' by default - the folder can be changed in Settings

# Download Statistics
<!-- download-stats:start -->

**Total downloads: 9,243** — installer and portable, across 28 releases

<sub>Excludes update checks — downloads of `latest.yml`, made by
installed copies looking for a new version — and differential-update
blockmaps, neither of which is a person downloading the app.
Updated 2026-08-17 · refresh with `npm run stats:downloads`.</sub>

<!-- download-stats:end -->

# Code signing policy
The Windows installer and the portable executable are digitally signed, so Windows shows a verified publisher instead of an unknown-publisher warning.

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

* **Committers and reviewers:** [project contributors](https://github.com/svglol/iracing-screenshot-tool/graphs/contributors)
* **Approvers:** [@svglol](https://github.com/svglol)

**Privacy policy:** this program does not transfer any information to other networked systems, with one exception — it contacts GitHub to check this repository's releases for a newer version and to show you what changed in it. An update is downloaded and installed only after you confirm it. No analytics, usage data or personal information is collected or sent.

# Support
Please go to our Discord server and report any issues you are having. [![Discord](https://img.shields.io/discord/626921718442754048.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/GX2kSgN)

# Feature Suggestions
If you have any suggestions feel free to suggest them on our discord.
