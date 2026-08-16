# iRacing Screenshot Tool
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/svglol/iracing-screenshot-tool)](https://github.com/svglol/iracing-screenshot-tool/releases) [![Discord](https://img.shields.io/discord/626921718442754048.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/GX2kSgN)

![](https://raw.githubusercontent.com/svglol/iracing-screenshot-tool/master/static/screenshot.png?v=5&s=200?)

# About
A tool created to take high resolution screenshots of iRacing without having to use Nvidia DSR.
Created using Electron and Vue.

# Features
* A wide range of resolutions to choose from, including custom resolutions
* Auto Crop the iRacing watermark - user must resize iRacing UI to smallest size
* Global Screenshot Hotkey (Control+PrintScreen)
* Track and Driver Names included in filename, so you can keep track of screenshots easier
* Graphics Profiles - store iRacing graphics configurations and switch between them (e.g. a triple-screen setup for racing and a single-screen one for screenshots)

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
7. Your screenshot will be saved to 'C:\Users\{User}\Pictures\Screenshots'

# Download Statistics
<!-- download-stats:start -->

* **Installer downloads:** 8,691
* **Portable downloads:** 514
* **Update checks served:** 116,272
* **All release artifacts combined:** 127,370

<details>
<summary>Per-release breakdown (28 releases)</summary>

| Version | Released | Installer | Portable | Update checks | All assets |
| :------ | :------- | --------: | -------: | ------------: | ---------: |
| v3.3.0 | 2026-08-07 | 259 | 32 | 673 | 1,162 |
| v3.2.2 | 2026-08-05 | 29 | 4 | 2 | 35 |
| v3.2.1 | 2026-08-04 | 4 | 2 | 0 | 6 |
| v3.1.1 | 2026-07-05 | 96 | 61 | 0 | 157 |
| v3.1.0 | 2026-07-02 | 4 | 2 | 0 | 6 |
| v3.0.5 | 2026-07-01 | 50 | 45 | 0 | 95 |
| v3.0.4 | 2026-05-20 | 123 | 121 | 0 | 244 |
| v3.0.3 | 2026-05-05 | 116 | 80 | 0 | 196 |
| v3.0.2 | 2026-05-04 | 10 | 10 | 0 | 20 |
| v2.1.0 | 2026-04-14 | 228 | 0 | 0 | 228 |
| v2.0.8 | 2026-04-10 | 22 | 39 | 0 | 61 |
| v2.0.7 | 2026-04-03 | 31 | 42 | 0 | 73 |
| v2.0.6 | 2026-03-28 | 32 | 44 | 0 | 76 |
| v2.0.5 | 2026-03-27 | 29 | 32 | 158 | 224 |
| v1.1.3 | 2020-10-21 | 6,820 | 0 | 112,803 | 120,438 |
| v1.1.2 | 2020-10-20 | 114 | 0 | 34 | 247 |
| v1.1.1 | 2020-10-19 | 29 | 0 | 9 | 62 |
| v1.1.0 | 2020-09-30 | 137 | 0 | 320 | 600 |
| v1.0.9 | 2020-09-21 | 68 | 0 | 243 | 396 |
| v1.0.8 | 2020-09-13 | 48 | 0 | 130 | 242 |
| v1.0.7 | 2020-09-07 | 60 | 0 | 152 | 288 |
| v1.0.6 | 2020-08-31 | 45 | 0 | 91 | 195 |
| v1.0.5 | 2020-05-12 | 160 | 0 | 1,226 | 1,544 |
| v1.0.4 | 2020-04-29 | 70 | 0 | 258 | 395 |
| v1.0.3 | 2020-04-28 | 16 | 0 | 26 | 59 |
| v1.0.2 | 2020-04-27 | 50 | 0 | 85 | 174 |
| v1.0.1 | 2020-04-27 | 21 | 0 | 38 | 80 |
| v1.0.0 | 2020-04-24 | 20 | 0 | 24 | 67 |
| **Total** |  | **8,691** | **514** | **116,272** | **127,370** |

</details>

<sub>Update checks are downloads of `latest.yml`, fetched by installed
copies looking for a new version — not people downloading the app. The
all-assets total additionally includes differential-update blockmaps.
Updated 2026-08-16 · refresh with `npm run stats:downloads`.</sub>

<!-- download-stats:end -->

# Support
Please go to our Discord server and report any issues you are having. [![Discord](https://img.shields.io/discord/626921718442754048.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/GX2kSgN)

# Feature Suggestions
If you have any suggestions feel free to suggest them on our discord.
