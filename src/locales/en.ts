// The SOURCE catalogue. Every other locale is a translation of this file, and
// i18n.test.ts fails the build if one of them drifts out of key-parity with it.
//
// Two rules for anyone editing this file:
//
//   1. Changing English text here is a translation-invalidating edit. The other
//      seventeen catalogues still hold the OLD wording and will keep showing it —
//      key-parity tests cannot see that a sentence changed meaning. Update them
//      too, or the change ships to English speakers only.
//
//   2. The English strings are byte-identical to the literals they replaced.
//      That is what let this land without rewriting the main-process tests, which
//      assert on the exact sentences validatePlan and decideWgcSupport produce.
//
// Placeholders are {braces}. An unknown one is left alone by the interpolator, so
// copy that talks ABOUT tokens — the filename-format help below — can contain
// {track} and {counter} literally without escaping.

export default {
	// Product name. Deliberately not translated anywhere it appears: it is the
	// name of the thing, and iRacing does not translate its own.
	notice: {
		// NoticeCard's heading for the multi-notice form, taken from the highest
		// severity present.
		danger: 'Problems',
		warning: 'Worth knowing',
		info: 'Notes',
	},

	promo: {
		greeting: 'Thanks for using iRacing Screenshot Tool!',
		signature: 'Built and maintained by AR Media Solutions.',
	},

	changelog: {
		title: 'Changelog',
		// Fallback when a GitHub release has neither a name nor a tag.
		untitledRelease: 'Release',
	},

	gallery: {
		menu: {
			openExternally: 'Open Externally',
			openFolder: 'Open Folder',
			copy: 'Copy',
			delete: 'Delete',
		},
		copiedToClipboard: '{name} copied to clipboard',
	},

	sidebar: {
		resolution: 'Resolution',
		width: 'Width',
		height: 'Height',
		// Carries its own colon so languages that space punctuation differently
		// (French writes "Sortie :") can place it.
		output: 'Output:',
		cropWatermark: 'Crop Watermark',
		keepAspectRatio: 'Keep Aspect Ratio',
		screenshot: 'Screenshot',
		custom: 'Custom',
		// "NVIDIA GeForce RTX 4090: 18.6 GB free of 22.5 GB"
		vramStatus: '{adapter}{free} free of {total}',
		savedSuccessfully: '{name} saved successfully',
		screenshotFailed: 'Screenshot failed: {message}',
		errorLogPrefix: 'Log: ',
		notices: {
			exclusiveFullscreen:
				'iRacing is in exclusive fullscreen — screenshots will capture black. In iRacing set Display > Full Screen to OFF (Borderless or Windowed) to enable capture.',
			vramRisk:
				'{resolution} needs about {needed} more VRAM but only {free} is free — iRacing will likely run out of memory and crash.',
			vramCaution:
				'{resolution} leaves little VRAM headroom ({free} free) and may crash on heavy track/car combinations.',
			switchResolution: 'Switch to {resolution}',
			vramStatic:
				'High resolutions may crash iRacing if you run out of VRAM. Certain track/car combinations will require more VRAM.',
			reshade:
				'After pressing the screenshot button in the iRacing Screenshot Tool, you will need to press the keybind for taking a screenshot for ReShade.',
			crop: 'Crop Watermark zooms the final picture in slightly. Regions near the borders of the screen will be cut off.',
			aspectRatio:
				"Keep Aspect Ratio adjusts the screenshot height to match your monitor's aspect ratio (e.g. 21:9 ultrawide) instead of the default 16:9. The selected resolution sets the width.",
		},
	},

	settings: {
		title: 'Settings',
		version: 'Version - {version}',
		changelog: 'Changelog',
		openLogsFolder: 'Open Logs Folder',
		checkForUpdates: 'Check for Updates',
		updateCheckFailed: 'Update check failed: {message}',

		language: 'Language',
		languageDescription:
			'The language used throughout the app. Detected from Windows the first time the app runs.',

		screenshotFolder: 'Screenshot Folder',
		selectFolder: 'Select Folder',
		screenshotKeybind: 'Screenshot Keybind',
		editBind: 'Edit Bind',

		customFilenameFormat: 'Custom Filename Format',
		customFilenameFormatDescription:
			'Use a custom pattern instead of the default ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Click fields to add them to the format. Type separators (-, _, etc.) directly.',
		reset: 'Reset',
		preview: 'Preview:',

		outputFormat: 'Output Format',
		formatJpeg: 'JPEG (max quality)',
		formatPng: 'PNG (lossless)',
		formatWebp: 'WebP (quality 95%)',

		disableTooltips: 'Disable Tooltips',
		disableTooltipsDescription: "Leave me alone, I know what I'm doing",

		cropTopLeft: 'Prefer top-left watermark crop',
		cropTopLeftDescription:
			'Crops only the bottom-right corner (3%). When off, the screenshot is cropped (6% total) equally from all sides for a centered result.',

		manualWindowRestore: 'Manual Window Restore',
		manualWindowRestoreDescription:
			'Override the automatic window restore with custom position and size. Useful for people using an Ultrawide or Nvidia Surround',
		left: 'Left',
		top: 'Top',
		width: 'Width',
		height: 'Height',
		restoreNow: 'Restore Now',

		nativeCapture: 'High-Fidelity Capture (WGC)',
		nativeCaptureDescription:
			'Capture true un-subsampled color via Windows.Graphics.Capture instead of the default pipeline (which subsamples color). Falls back automatically if a capture fails.',
		nativeCaptureUnavailable:
			'Unavailable on this system — high-fidelity capture cannot run here.',
		nativeCaptureUnverified:
			'Windows reports this is supported, but a test capture did not come back. Captures will fall back automatically if it keeps failing.',

		reshade: 'Reshade Compatibility Mode',
		reshadeDescription:
			'When using reshade you will have to first use your hotkey for the iRacing Screenshot Tool or press the button, then use your reshade screenshot hotkey once the iRacing window has resized',
		reshadeIni: 'Reshade INI',
		selectFile: 'Select File',
	},

	longExposure: {
		title: 'Long Exposure',
		shutter: 'Shutter',
		playbackSpeed: 'Playback speed',
		playbackAuto: 'Auto (from sample target)',
		playbackRealTime: '1x (real time)',
		targetSamples: 'Target samples',
		advanced: 'Advanced',
		// The folded Advanced row when nothing is away from its default.
		defaultsSummary: '{count} defaults',

		weighting: 'Weighting',
		weightingBox: 'Box (even)',
		weightingLinear: 'Linear (sharp at the end)',
		weightingEase: 'Ease (sharper head, long tail)',

		interpolation: 'Frame interpolation',
		interpolationOff: 'Off',
		interpolation2: '2× (one in-between)',
		interpolation4: '4× (three in-betweens)',
		interpolation8: '8× (seven in-betweens)',

		passes: 'Passes',
		passes1: '1 (single pass)',
		passes2: '2× — twice the wait',
		passes4: '4× — four times the wait',
		passes8: '8× — eight times the wait',

		bracket: 'Bracket shutters',
		highlightRecovery: 'Highlight recovery (stops)',

		cancel: 'Cancel',
		saved: 'Long exposure saved — {count} samples',
		failed: 'Long exposure failed',

		// Names for the settings the folded Advanced row calls out. These read as
		// fragments in a comma-separated list, not as sentences.
		modified: {
			// Short forms of the weighting names — the summary row is one line with
			// an ellipsis, so the full option labels do not fit.
			weighting_linear: 'linear',
			weighting_ease: 'ease',
			interpolation: '{factor}× interpolation',
			passes: {
				one: '{count} pass',
				other: '{count} passes',
			},
			bracketed: 'bracketed',
			recovery: '{stops} stop recovery',
		},

		progress: {
			working: 'Working…',
			seeking: 'Seeking…{pass}',
			accumulating: 'Exposing… {count} samples{pass}',
			resolving: 'Developing…',
			restoring: 'Restoring replay…',
			pass: ' (pass {current} of {total})',
		},

		notices: {
			needsNativeCapture:
				'Long exposure needs High-Fidelity Capture (WGC), which is currently off. Turn it on in Settings to enable long exposure.',
			unavailableWithReason:
				'Long exposure is unavailable on this machine: {reason}',
			unavailable: 'Long exposure is unavailable on this machine.',
			interpolationCost:
				"Interpolation invents frames between the real ones to smooth the streak. It costs GPU time per frame, so check the saved shot's real sample count against the same shot with it off — if that number drops, it is buying invented samples with real ones.",
			passesAndInterpolation:
				'Passes and interpolation compete for the same per-frame budget. With both on, each pass captures fewer real frames — turning interpolation off usually makes the better shot for the same wait.',
			passes:
				'Each pass replays the same moment and catches frames the others missed, so the streak gets smoother rather than brighter. Best on fast shutters, where a single pass collects only a handful of samples.',
			interpolationUnsupported:
				'Frame interpolation needs an NVIDIA Turing or newer GPU{adapter}. Everything else about long exposure works as normal.',
			interpolationAdapter: ' (this capture runs on {adapter})',
			reshade:
				'Long exposure captures natively and does not use ReShade, so ReShade effects will not appear in the result.',
		},
	},

	help: {
		title: 'Help',
		sections: 'Help sections',
		tabGeneral: 'General',
		tabLongExposure: 'Long Exposure',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'iRacing Settings',
			borderless: 'iRacing must be running in Windowed Borderless',
			vram: 'At least 8GB of VRAM is recommended for screenshots of 8k resolution or higher',
			newerContent: 'Newer tracks and cars will require more VRAM',
			shrinkUi:
				'Shrink the UI to the smallest it can go before taking a screenshot if using the Crop Watermark option, "Control+PageDown" will shrink it, if this doesnt work you may need to reset your UI Zoom in the iRacing settings',

			screenshotFolder: 'Screenshot Folder',
			screenshotFolderBody:
				'Screenshots will be saved by default to "C:\\Users\\user\\Pictures\\Screenshots" this can be changed in the settings',

			screenshotHotkey: 'Screenshot Hotkey',
			screenshotHotkeyBody:
				'By default "Control + PrintScreen" will take a screenshot with the current settings, this can be changed in the settings.',

			issues: 'Issues',
			issuesBody: 'If you have any issues please report them on the',
			discord: 'Discord',

			instructions: 'Instructions',
			step1: 'iRacing <b>must</b> be running in Windowed Borderless Mode',
			step2: 'Run iRacing and setup the camera in the position you want to take the screenshot',
			step3: 'Select your desired resolution (Try lower resolutions before going to 8K)',
			step4: "Select if you want to crop the iRacing watermark or not, if you want to crop it you will need to resize the iRacing UI with 'Control + PageDown' to the smallest size first",
			step5: "Press the screenshot button or use the Hotkey 'Control + PrintScreen' to take the screenshots",
			step6: 'Depending on the resolution selected this may take a few seconds, once your iRacing screen resizes to its normal size it is finished',
			step7: "Your screenshot will be saved to 'C:\\Users\\{User}\\Pictures\\Screenshots'",
		},

		longExposure: {
			whatItDoes: 'What it does',
			whatItDoesBody:
				'A long exposure blends many frames of a replay into one image, the way leaving a camera shutter open does: stationary things stay sharp, moving things streak. The tool drives the replay itself, captures every frame the sim presents, and adds them up on the GPU.',

			shutter: 'Shutter',
			shutterBody:
				'How long the exposure lasts <i>in replay time</i>, from a fraction of one replay frame up to ten seconds. This is the setting that decides how long the streaks are. Longer shutters also collect more frames, so they need less help from everything below; the fastest stops span a single replay frame and collect only a handful of samples.',

			playback: 'Playback speed',
			playbackBody:
				'The replay is played in slow motion while the exposure is captured, so the sim presents more frames per second of replay time and the blend gets more samples. 1/16 collects roughly sixteen times as many frames as real time — and takes sixteen times as long in wall clock. This is the main trade in the panel: patience for smoothness.',
			playbackAutoBody:
				'"Auto (from sample target)" picks the speed for you from <b>Target samples</b>: the tool solves for the fastest playback that still reaches the number you asked for. Set an explicit speed instead if you would rather cap the wait.',

			weighting: 'Weighting',
			weightingBody:
				'How much each captured frame contributes to the result. <b>Box</b> weights them all equally, giving an even streak. <b>Linear</b> ramps toward the end of the window, so the subject is sharpest where it finished and fades back along its path. <b>Ease</b> is the same idea with a sharper head and a longer tail.',

			interpolation: 'Frame interpolation',
			interpolationBody:
				"Invents extra frames between the real ones using the GPU's optical-flow engine, filling in the gaps along the streak. Requires an NVIDIA Turing or newer card and is hidden entirely on hardware that cannot do it.",
			interpolationCostBody:
				'It is not free: it costs GPU time on every captured frame, and the budget is one iRacing frame. If it cannot keep up it starts missing <i>real</i> frames in order to manufacture synthetic ones, which is a net loss — the streak comes out shorter and coarser. The cost scales with megapixels times the factor, so what is comfortable at 2560×1440 is not viable at 8K. To check it, shoot the same moment twice with it on and off and compare the real sample counts; the app also warns you afterwards if a shot fell short.',

			passes: 'Passes',
			passesBody:
				'Visits the same moment several times, accumulating into one image. Each pass catches frames the others happened to miss, so the streak gets smoother — not brighter, because the result is normalised by how much light actually landed on each pixel.',
			passesTradeBody:
				'Passes buy the same thing interpolation does, with a different currency: wall clock instead of GPU time. Eight passes take roughly eight times as long, but they can never cost you real frames. That makes them the right lever at high resolutions, where interpolation cannot keep up, and on fast shutters, where a single pass collects very few samples. Using both at once is usually the worst of the trade — they compete for the same per-frame budget.',

			bracket: 'Bracket shutters',
			bracketBody:
				'Emits one image per shutter stop at or faster than the one you chose, from a single capture. A shot at 1/60 also gives you 1/125, 1/250, 1/500 and 1/1000 — the same moment with progressively shorter streaks — so you can pick the look afterwards instead of guessing and re-shooting.',
			bracketCostBody:
				'It costs almost no extra time. Every stop ends on the same frame and differs only in how far back it reaches, so a faster shutter is simply the tail of the frames already going past — they are all filled from one pass of the replay.',
			bracketMemoryBody:
				'What it does cost is memory. Each stop needs its own full-resolution accumulator, so eleven stops need eleven times the video memory of one, which at 8K is more than most cards have. The capture checks this before it starts and refuses rather than crashing iRacing, so if a bracket is declined, lower the resolution or pick a faster shutter — which is also a shorter ladder.',
			bracketNamingBody:
				'The stop you chose is saved under the usual name and is the one that appears in the gallery; the others sit beside it with their shutter in the filename.',

			highlights: 'Highlight recovery',
			highlightsBody:
				'Boosts near-clipped highlights before the frames are added up, then undoes the boost at the end. iRacing hands over an image that has already been tonemapped, so a headlight and a white wall arrive at the same value; averaging that makes a bright light sweeping through part of the exposure read as a grey smudge rather than a bright trail. This puts the non-linearity back where a real sensor has it. Measured in stops; 0 is off and changes nothing at all.',

			whatItSaves: 'What it saves',
			whatItSavesBody:
				'Size, watermark cropping and file format all follow the same controls a normal screenshot uses — the Resolution and Crop Watermark settings above, and the output format in Settings. The Output line at the top of the sidebar shows exactly what you will get.',
			whatItSavesPngBody:
				'Choosing PNG writes a true 16-bit master, which is worth it if you intend to grade the shot afterwards, plus an 8-bit preview for the gallery. It is also much slower to write at high resolutions — a 33-megapixel 16-bit PNG takes around ten seconds where the same frame as JPEG takes under one.',

			troubleshooting: 'If the result looks wrong',
			troubleGhosts:
				'<b>Discrete ghosts instead of a smooth streak</b> — too few samples. Use a slower playback speed, more passes, or a lower resolution.',
			troubleShutter:
				'<b>Not sure which shutter you wanted</b> — turn on Bracket shutters and decide afterwards, for the same wait.',
			troubleHighlights:
				'<b>Blown-out or flat highlights</b> — try 3 to 5 stops of highlight recovery.',
			troubleBlack:
				'<b>A black image</b> — iRacing is in exclusive fullscreen. Set Display &gt; Full Screen to OFF.',
			troubleSidecar:
				'Every shot records the exact settings it used, the sample count and how evenly the samples landed, as a .json file in the log folder alongside app.log. The last 20 shots are kept — a bracket counts as one — so the shot you are asking about is still there while you are asking about it.',
		},

		faq: {
			blackShot: 'The shot is black, but the iRacing UI is visible in it',
			blackShotBody:
				'The capture itself worked: the overlay drew, so a real frame reached the tool. What is missing is the 3D scene, because iRacing rendered it black. Several of the less conventional cameras do this — the suspension camera is the one people hit most. Move to an ordinary camera (cockpit, chase, or any of the TV cameras) and shoot the same moment again.',
			blackShotFullscreenBody:
				'If the image is black <i>including</i> the UI, and every camera behaves the same way, the cause is a different one: iRacing is in exclusive fullscreen, which nothing outside the sim can capture. Set Display &gt; Full Screen to OFF.',

			cameraReset: 'iRacing moves my camera before it takes the shot',
			cameraResetBody:
				"That is iRacing's own automatic shot selection, not this tool. While it is on, iRacing keeps picking cameras for itself and will cut back to a default framing at the moment the capture starts, so what you get is not the shot you set up.",
			cameraResetFixBody:
				"Turn it off in iRacing's camera tool (Ctrl+F12), under <b>Camera &gt; Config &gt; Preferences</b>: the <b>Shot Selection</b> toggle labelled <b>Automatic</b>. With it off the camera stays exactly where you put it, for normal screenshots and long exposures alike.",
		},
	},

	update: {
		checking: 'Checking for updates…',
		// "A new version" when the updater has not told us which one yet.
		newVersion: 'A new version',
		availableBusy:
			'{version} is available. A capture is in progress — you can download it once that finishes.',
		available: '{version} is available. Click to download it.',
		downloading: 'Downloading {version}…',
		downloadingPercent: 'Downloading {version} — {percent}%',
		downloadedBusy:
			'{version} is ready. A capture is in progress, so it will install when you close the app.',
		downloaded: '{version} is ready. Click to restart and install it.',
		failed: 'Update check failed: {error}',
		unknownError: 'unknown error',
		neverChecked: "Updates have not been checked yet (you're on v{version}).",
		upToDate: "You're on the latest version (v{version}).",

		alreadyDownloading: 'The update is already downloading.',
		alreadyDownloaded: 'The update is already downloaded.',
		nothingToDownload: 'There is no update to download.',
		captureInProgress:
			'A capture is in progress. Try again once it finishes.',
		nothingToInstall: 'No update is ready to install.',
		captureInProgressInstall:
			'A capture is in progress. The update will install by itself when you close the app.',
		devBuildOnly: 'Update checks only run in an installed build.',

		installTitle: 'Install update',
		installMessage: 'Install version {version}?',
		installFallbackVersion: 'update',
		installDetail:
			'The app will close and reopen once the update is installed. If you choose Later, it will install by itself the next time you close the app.',
		installConfirm: 'Restart and install',
		installLater: 'Later',
	},

	filenameFields: {
		categories: {
			Track: 'Track',
			Driver: 'Driver',
			Session: 'Session',
			Meta: 'Meta',
		},
		track: 'Track',
		trackFull: 'Track Full',
		trackCity: 'City',
		trackCountry: 'Country',
		trackType: 'Track Type',
		driver: 'Driver',
		driverAbbrev: 'Driver Abbrev',
		driverInitials: 'Initials',
		team: 'Team',
		carNumber: 'Car #',
		car: 'Car',
		carFull: 'Car Full',
		carClass: 'Car Class',
		iRating: 'iRating',
		sessionType: 'Session Type',
		sessionName: 'Session Name',
		lap: 'Lap',
		date: 'Date',
		time: 'Time',
		datetime: 'Date+Time',
		counter: 'Counter',
	},

	iracingConfig: {
		projections:
			'Disable "Render Scene Using 3 Projections" in iRacing (Display > Monitor tab) to avoid vertical bands in screenshots',
	},

	graphicsProfiles: {
		title: 'Graphics Profiles',
		description:
			'Store iRacing graphics configurations and switch between them — a triple-screen setup for racing, a single-screen one for screenshots.',
		// The most important sentence here. iRacing keeps its graphics settings in
		// memory and writes them back over the file when it exits, so a swap made
		// while it is running is undone with no sign anything failed.
		iracingRunning:
			'Close iRacing before switching. It rewrites its graphics configuration when it exits, which would undo the change.',
		activeHeading: 'Current configuration',
		active: {
			clean: 'Matches your {name} profile.',
			// The count is what separates "I nudged one slider" from "this is a
			// different setup entirely".
			modified: {
				one: 'Based on {name}, with {count} setting changed since.',
				other: 'Based on {name}, with {count} settings changed since.',
			},
			modifiedUnknownCount: 'Based on {name}, with changes since.',
			unknown: 'Does not match any stored profile.',
			missing: 'No iRacing graphics configuration was found.',
		},
		badge: {
			active: 'Active',
			modified: 'Modified',
		},
		empty: {
			title: 'No profiles stored yet.',
			body: 'Save your current iRacing configuration as a profile, or import an existing .ini file.',
		},
		invalidProfile: 'Not a graphics config',
		warnings: {
			// iRacing re-runs its 3D auto-configuration at startup when it sees this
			// and overwrites the whole file, so the profile appears not to stick.
			autoCfgIncomplete: 'Will be reset by iRacing',
		},
		actions: {
			apply: 'Apply',
			overwrite: 'Update from current',
			rename: 'Rename',
			export: 'Export',
			delete: 'Delete',
			save: 'Save',
			cancel: 'Cancel',
			saveCurrent: 'Save current as…',
			import: 'Import…',
			openFolder: 'Open folder',
		},
		prompt: {
			namePlaceholder: 'Profile name',
			deleteConfirm: 'Delete {name}?',
		},
		feedback: {
			// The restart caveat is part of the success message: the swap only takes
			// effect at iRacing's next launch, and without saying so the user has
			// every reason to believe it silently failed.
			applied: '{name} applied. Start iRacing for it to take effect.',
			saved: 'Saved as {name}.',
			overwritten: '{name} updated from the current configuration.',
			renamed: 'Renamed to {name}.',
			deleted: '{name} deleted.',
			imported: 'Imported as {name}.',
			exported: '{name} exported.',
		},
		errors: {
			empty: 'Enter a name for the profile.',
			illegalCharacters:
				'A profile name cannot contain any of: < > : " / \\ | ? *',
			reservedName: 'That name is reserved by Windows. Choose another.',
			trailingDotOrSpace: 'A profile name cannot end with a dot or a space.',
			tooLong: 'That name is too long.',
			duplicate: 'A profile with that name already exists.',
			profileNotFound: 'That profile could no longer be found.',
			profileExists: 'A profile with that name already exists.',
			duplicateContent:
				'A profile with these exact settings already exists: {name}.',
			noActiveConfig: 'No iRacing graphics configuration was found to save.',
			invalidIni:
				'That file is not an iRacing graphics configuration, so it was not used.',
			iracingRunning:
				'Close iRacing first — it would overwrite the change when it exits.',
			ioError: 'The file could not be written. Nothing was changed.',
		},
	},

	wgc: {
		cursorCaveat:
			'The mouse cursor may appear in captures on this version of Windows. Windows 10 version 2004 added the control that hides it.',
		addonUnavailable:
			'The high-fidelity capture component could not be loaded on this system.',
		osUnsupported:
			'Windows.Graphics.Capture is not available on this version of Windows. It needs Windows 10 version 1903 or newer.',
		// A `reason`, not a sentence — it is shown as the tail of "Long exposure is
		// unavailable on this machine: …".
		nativeCaptureOff: 'High-Fidelity Capture (WGC) is turned off',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing is in exclusive fullscreen, so the screenshot would be black. In iRacing, set Display > Full Screen to OFF (use Borderless or Windowed) and try again.',
		exclusiveFullscreenUnattributed:
			'An application is running in exclusive fullscreen, which produces a black capture. If iRacing is in Full Screen, set Display > Full Screen to OFF (use Borderless or Windowed) and try again.',
		unknownError: 'Unknown screenshot error',
		outputTooSmall: 'Capture output is too small ({width}x{height})',
		blackFrame:
			'Captured frame is black — the capture source may have failed (GPU-accelerated content can fail to capture on some Windows setups)',
		noSource: 'No desktop capture source found for window {windowId}',
		metadataTimeout: 'Timed out waiting for capture video metadata',
		noVideoFrame: 'Capture stream did not produce a video frame',
		dimensionTimeout:
			'Timed out waiting for window dimensions {width}x{height}; proceeding with {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'A capture is already in progress.',
		needsNativeCapture:
			'Long exposure needs High-Fidelity Capture (WGC). Turn it on in Settings to use it.',
		unavailable: 'Long exposure is not available on this machine.',
		noTelemetry:
			'Long exposure needs replay telemetry from iRacing. Check that the sim is running and in a session.',
		windowNotFound: 'iRacing window not found.',
		cancelled: 'Capture cancelled.',
		seekTimeout:
			'The replay did not reach frame {frame} in time. It may still be loading.',
		noPasses: 'A capture must run at least one pass.',
		playbackStalled:
			'The replay did not start playing. Check that iRacing is not paused by another tool.',
		exposureTimeout:
			'The exposure did not reach frame {frame} within {seconds}s.',
		endedEarly: 'The exposure ended before reaching the selected moment.',
		// The v3.2.1 field report: zero WGC frames for the whole session.
		noFramesPresented: 'iRacing did not present any frames to capture.',
		subFrameNoSamples:
			'This shutter is shorter than one replay frame, and iRacing did not render a frame inside it. Try a slower playback speed, or the next slower shutter.',
		noSamples:
			'No frames were accumulated. iRacing may have stopped rendering during the exposure.',
		// Frames arrived and every one of them was black. High-fidelity capture reads
		// what Windows composites, so it sees black whenever Windows is not
		// compositing what iRacing draws — and iRacing failing to render at all looks
		// the same from here.
		blankCapture:
			'Every frame captured was black, so there is no image to save. Check that iRacing is in windowed or borderless mode rather than exclusive fullscreen, and that it still has video memory free at this resolution — a lower capture resolution is the quickest thing to try.',
		frozenCapture:
			'iRacing presented {samples} frames during the exposure but every one was identical, so this image is a still rather than a long exposure. iRacing rendered nothing new while the replay rolled.',
		// The native cause, appended when there is one.
		withNativeError: '{reason} ({error})',
		resolveFailed: 'The GPU did not return an image.',
		bracketShortfall:
			'Bracketing asked for {asked} stops but {returned} came back — the rest failed to resolve, or this build of the capture addon predates bracketing.',
	},

	validation: {
		windowBeforeStart:
			'The exposure needs {frames} replay frames before the selected moment, but it is only {anchor} frames into the replay. Pick a later moment or a faster shutter.',
		pastEnd: 'The selected moment is past the end of the replay.',
		sessionChanged:
			'The replay has moved to a different session since this shot was set up. Re-select the moment.',
		singleSampleMultiPass:
			'This shutter is short enough that only about one frame lands inside it per pass, so {passes} passes collect roughly {passes} samples. A slower playback speed or a slower shutter buys far more.',
		singleSample:
			'This shutter is short enough that only one frame will land inside it, so the result has no motion blur. A slower playback speed or a slower shutter buys samples.',
		bracketVsInterpolation:
			'Bracket shutters and {factor}x frame interpolation cannot both run, so this shot will be taken without interpolation. Turn bracketing off if the in-betweens matter more to you than the extra stops.',
		passesVsInterpolation:
			'Multi-pass and {factor}x interpolation are both on. They compete: interpolation slows each pass enough to cost it real frames, so the same wait buys fewer real samples than passes alone would. Turning interpolation off is usually the better shot.',
		shortOfTarget:
			'Even at 1/{divisor} speed this exposure reaches about {samples} samples, short of the {target} requested. Use a longer shutter for more.',
		longCaptureEscalate:
			'This capture runs the replay at 1/{divisor} speed for about {duration} of real time{passSuffix}, and cannot be hurried once started. {advice}',
		longCaptureWarn:
			'This capture will take about {duration} of real time at 1/{divisor} playback speed{passSuffix}.',
		passSuffix: ' across {passes} passes over the same moment',
		adviceFewerPasses: 'Fewer passes finish sooner with fewer samples.',
		adviceFasterPlayback:
			'A faster playback speed finishes sooner with fewer samples.',
		pastLogCap:
			'This capture is predicted to collect about {samples} samples across {passes} passes, past the {cap} the diagnostic log holds. The image is unaffected — only the evenness and gap figures will describe the first part of the capture.',
		interpolationLossy:
			'At this size, {factor}x interpolation has previously cost this machine real samples. Consider a lower factor, a lower Resolution, or more passes instead.',
	},

	duration: {
		zero: '0 seconds',
		seconds: {
			one: '{count} seconds',
			other: '{count} seconds',
		},
		minutes: {
			one: '{count} minutes',
			other: '{count} minutes',
		},
		minutesSeconds: '{minutes} min {seconds} s',
	},
};
