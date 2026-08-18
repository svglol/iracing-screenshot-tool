// German. Translated from en.ts — see that file's header before editing.
//
// Product and technology names are left untranslated on purpose: iRacing,
// ReShade, Discord, Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and
// the file formats are what the user sees in iRacing's own settings and on their
// hardware, so translating them would break the link to the thing being named.

import type { Catalog } from './index';

const de: Catalog = {
	notice: {
		danger: 'Probleme',
		warning: 'Wissenswertes',
		info: 'Hinweise',
	},

	promo: {
		greeting: 'Danke, dass du das iRacing Screenshot Tool nutzt!',
		signature: 'Entwickelt und gepflegt von AR Media Solutions.',
	},

	changelog: {
		title: 'Änderungsprotokoll',
		untitledRelease: 'Version',
	},

	gallery: {
		menu: {
			openExternally: 'Extern öffnen',
			openFolder: 'Ordner öffnen',
			copy: 'Kopieren',
			delete: 'Löschen',
		},
		copiedToClipboard: '{name} in die Zwischenablage kopiert',
	},

	sidebar: {
		resolution: 'Auflösung',
		width: 'Breite',
		height: 'Höhe',
		output: 'Ausgabe:',
		cropWatermark: 'Wasserzeichen beschneiden',
		keepAspectRatio: 'Seitenverhältnis beibehalten',
		screenshot: 'Screenshot',
		custom: 'Benutzerdefiniert',
		vramStatus: '{adapter}{free} frei von {total}',
		savedSuccessfully: '{name} erfolgreich gespeichert',
		screenshotFailed: 'Screenshot fehlgeschlagen: {message}',
		errorLogPrefix: 'Protokoll: ',
		notices: {
			exclusiveFullscreen:
				'iRacing läuft im exklusiven Vollbild — Screenshots werden schwarz. Stelle in iRacing unter Display > Full Screen auf OFF (Borderless oder Windowed), um die Aufnahme zu ermöglichen.',
			vramRisk:
				'{resolution} benötigt etwa {needed} mehr VRAM, aber nur {free} sind frei — iRacing wird wahrscheinlich der Speicher ausgehen und abstürzen.',
			vramCaution:
				'{resolution} lässt wenig VRAM-Reserve ({free} frei) und kann bei aufwendigen Strecken-/Fahrzeugkombinationen abstürzen.',
			switchResolution: 'Auf {resolution} wechseln',
			vramStatic:
				'Hohe Auflösungen können iRacing zum Absturz bringen, wenn der VRAM ausgeht. Bestimmte Strecken-/Fahrzeugkombinationen benötigen mehr VRAM.',
			reshade:
				'Nachdem du im iRacing Screenshot Tool auf den Screenshot-Knopf gedrückt hast, musst du zusätzlich deine ReShade-Tastenkombination für Screenshots betätigen.',
			crop: 'Das Beschneiden des Wasserzeichens zoomt das fertige Bild leicht heran. Bereiche nahe den Bildrändern werden abgeschnitten.',
			aspectRatio:
				'„Seitenverhältnis beibehalten“ passt die Höhe des Screenshots an das Seitenverhältnis deines Monitors an (z. B. 21:9 Ultrawide) statt an die Vorgabe 16:9. Die gewählte Auflösung bestimmt die Breite.',
		},
	},

	settings: {
		title: 'Einstellungen',
		version: 'Version - {version}',
		changelog: 'Änderungsprotokoll',
		openLogsFolder: 'Protokollordner öffnen',
		checkForUpdates: 'Nach Updates suchen',
		updateCheckFailed: 'Update-Prüfung fehlgeschlagen: {message}',

		language: 'Sprache',
		languageDescription:
			'Die in der gesamten App verwendete Sprache. Beim ersten Start aus Windows übernommen.',

		screenshotFolder: 'Screenshot-Ordner',
		selectFolder: 'Ordner wählen',
		screenshotKeybind: 'Screenshot-Tastenkombination',
		editBind: 'Belegung ändern',

		customFilenameFormat: 'Eigenes Dateinamensformat',
		customFilenameFormatDescription:
			'Ein eigenes Muster statt der Vorgabe verwenden ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Klicke auf Felder, um sie dem Format hinzuzufügen. Trennzeichen (-, _ usw.) direkt eintippen.',
		reset: 'Zurücksetzen',
		preview: 'Vorschau:',

		outputFormat: 'Ausgabeformat',
		formatJpeg: 'JPEG (höchste Qualität)',
		formatPng: 'PNG (verlustfrei)',
		formatWebp: 'WebP (Qualität 95 %)',

		disableTooltips: 'Hinweise ausblenden',
		disableTooltipsDescription: 'Lass mich in Ruhe, ich weiß, was ich tue',

		cropTopLeft: 'Wasserzeichen bevorzugt oben links beschneiden',
		cropTopLeftDescription:
			'Beschneidet nur die untere rechte Ecke (3 %). Ist die Option aus, wird der Screenshot gleichmäßig von allen Seiten beschnitten (insgesamt 6 %), was ein zentriertes Ergebnis ergibt.',

		manualWindowRestore: 'Fenster manuell wiederherstellen',
		manualWindowRestoreDescription:
			'Überschreibt die automatische Fensterwiederherstellung mit eigener Position und Größe. Nützlich für Ultrawide oder Nvidia Surround.',
		left: 'Links',
		top: 'Oben',
		width: 'Breite',
		height: 'Höhe',
		restoreNow: 'Jetzt wiederherstellen',

		nativeCapture: 'High-Fidelity-Aufnahme (WGC)',
		nativeCaptureDescription:
			'Nimmt echte, nicht unterabgetastete Farben über Windows.Graphics.Capture auf statt über die Standard-Pipeline (die Farben unterabtastet). Fällt automatisch zurück, wenn eine Aufnahme fehlschlägt.',
		nativeCaptureUnavailable:
			'Auf diesem System nicht verfügbar — High-Fidelity-Aufnahme kann hier nicht laufen.',
		nativeCaptureUnverified:
			'Windows meldet Unterstützung, doch eine Testaufnahme kam nicht zurück. Aufnahmen fallen automatisch zurück, falls es weiterhin fehlschlägt.',

		reshade: 'ReShade-Kompatibilitätsmodus',
		reshadeDescription:
			'Bei Verwendung von ReShade musst du zuerst die Tastenkombination des iRacing Screenshot Tools nutzen oder den Knopf drücken und dann, sobald sich das iRacing-Fenster in der Größe geändert hat, deine ReShade-Screenshot-Tastenkombination betätigen.',
		reshadeIni: 'ReShade-INI',
		selectFile: 'Datei wählen',
	},

	longExposure: {
		title: 'Langzeitbelichtung',
		shutter: 'Verschlusszeit',
		playbackSpeed: 'Wiedergabegeschwindigkeit',
		playbackAuto: 'Automatisch (aus Zielanzahl)',
		playbackRealTime: '1x (Echtzeit)',
		targetSamples: 'Ziel-Abtastungen',
		advanced: 'Erweitert',
		defaultsSummary: '{count} Standardwerte',

		weighting: 'Gewichtung',
		weightingBox: 'Box (gleichmäßig)',
		weightingLinear: 'Linear (scharf am Ende)',
		weightingEase: 'Ease (schärferer Kopf, langer Schweif)',

		interpolation: 'Bildinterpolation',
		interpolationOff: 'Aus',
		interpolation2: '2× (ein Zwischenbild)',
		interpolation4: '4× (drei Zwischenbilder)',
		interpolation8: '8× (sieben Zwischenbilder)',

		passes: 'Durchgänge',
		passes1: '1 (ein Durchgang)',
		passes2: '2× — doppelte Wartezeit',
		passes4: '4× — vierfache Wartezeit',
		passes8: '8× — achtfache Wartezeit',

		bracket: 'Verschlusszeiten-Reihe',
		highlightRecovery: 'Lichterrettung (Blendenstufen)',

		cancel: 'Abbrechen',
		saved: 'Langzeitbelichtung gespeichert — {count} Abtastungen',
		failed: 'Langzeitbelichtung fehlgeschlagen',

		modified: {
			weighting_linear: 'linear',
			weighting_ease: 'ease',
			interpolation: '{factor}× Interpolation',
			passes: {
				one: '{count} Durchgang',
				other: '{count} Durchgänge',
			},
			bracketed: 'Reihe',
			recovery: '{stops} Stufen Lichterrettung',
		},

		progress: {
			working: 'Arbeitet…',
			seeking: 'Suche…{pass}',
			accumulating: 'Belichtet… {count} Abtastungen{pass}',
			resolving: 'Entwickelt…',
			restoring: 'Stellt Replay wieder her…',
			pass: ' (Durchgang {current} von {total})',
		},

		notices: {
			needsNativeCapture:
				'Langzeitbelichtung benötigt die High-Fidelity-Aufnahme (WGC), die derzeit aus ist. Schalte sie in den Einstellungen ein, um Langzeitbelichtung zu ermöglichen.',
			unavailableWithReason:
				'Langzeitbelichtung ist auf diesem Rechner nicht verfügbar: {reason}',
			unavailable:
				'Langzeitbelichtung ist auf diesem Rechner nicht verfügbar.',
			interpolationCost:
				'Interpolation erfindet Bilder zwischen den echten, um den Schweif zu glätten. Sie kostet GPU-Zeit pro Bild — vergleiche also die Zahl echter Abtastungen der gespeicherten Aufnahme mit derselben Aufnahme ohne Interpolation. Sinkt diese Zahl, erkauft sie erfundene Abtastungen mit echten.',
			passesAndInterpolation:
				'Durchgänge und Interpolation konkurrieren um dasselbe Budget pro Bild. Sind beide aktiv, nimmt jeder Durchgang weniger echte Bilder auf — die Interpolation auszuschalten ergibt bei gleicher Wartezeit meist die bessere Aufnahme.',
			passes:
				'Jeder Durchgang wiederholt denselben Moment und fängt Bilder ein, die die anderen verpasst haben; der Schweif wird dadurch gleichmäßiger, nicht heller. Am besten bei kurzen Verschlusszeiten, wo ein einzelner Durchgang nur wenige Abtastungen sammelt.',
			interpolationUnsupported:
				'Bildinterpolation benötigt eine NVIDIA-GPU ab Turing{adapter}. Alles andere an der Langzeitbelichtung funktioniert wie gewohnt.',
			interpolationAdapter: ' (diese Aufnahme läuft auf {adapter})',
			reshade:
				'Die Langzeitbelichtung nimmt nativ auf und nutzt ReShade nicht, daher erscheinen ReShade-Effekte nicht im Ergebnis.',
		},
	},

	help: {
		title: 'Hilfe',
		sections: 'Hilfeabschnitte',
		tabGeneral: 'Allgemein',
		tabLongExposure: 'Langzeitbelichtung',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'iRacing-Einstellungen',
			borderless: 'iRacing muss im Modus Windowed Borderless laufen',
			vram: 'Für Screenshots ab 8K-Auflösung werden mindestens 8 GB VRAM empfohlen',
			newerContent: 'Neuere Strecken und Fahrzeuge benötigen mehr VRAM',
			shrinkUi:
				'Verkleinere die Benutzeroberfläche vor dem Screenshot so weit wie möglich, wenn du die Option zum Beschneiden des Wasserzeichens nutzt. „Control+PageDown“ verkleinert sie; falls das nicht funktioniert, musst du eventuell den UI-Zoom in den iRacing-Einstellungen zurücksetzen.',

			screenshotFolder: 'Screenshot-Ordner',
			screenshotFolderBody:
				'Screenshots werden standardmäßig unter „C:\\Users\\user\\Pictures\\Screenshots“ gespeichert; das lässt sich in den Einstellungen ändern.',

			screenshotHotkey: 'Screenshot-Tastenkombination',
			screenshotHotkeyBody:
				'Standardmäßig erstellt „Control + PrintScreen“ einen Screenshot mit den aktuellen Einstellungen; das lässt sich in den Einstellungen ändern.',

			issues: 'Probleme',
			issuesBody: 'Falls du Probleme hast, melde sie bitte auf dem',
			discord: 'Discord',

			instructions: 'Anleitung',
			step1: 'iRacing <b>muss</b> im Modus Windowed Borderless laufen',
			step2: 'Starte iRacing und richte die Kamera so aus, wie du den Screenshot haben möchtest',
			step3: 'Wähle die gewünschte Auflösung (probiere niedrigere Auflösungen, bevor du auf 8K gehst)',
			step4: 'Entscheide, ob du das iRacing-Wasserzeichen beschneiden willst; falls ja, musst du zuvor die iRacing-Oberfläche mit „Control + PageDown“ auf die kleinste Größe bringen',
			step5: 'Drücke den Screenshot-Knopf oder nutze die Tastenkombination „Control + PrintScreen“, um die Screenshots aufzunehmen',
			step6: 'Je nach gewählter Auflösung kann das einige Sekunden dauern; sobald dein iRacing-Fenster wieder seine normale Größe hat, ist der Vorgang beendet',
			step7: 'Dein Screenshot wird unter „C:\\Users\\{User}\\Pictures\\Screenshots“ gespeichert',
		},

		longExposure: {
			whatItDoes: 'Was sie macht',
			whatItDoesBody:
				'Eine Langzeitbelichtung verschmilzt viele Bilder eines Replays zu einem einzigen Bild, so wie ein offen gelassener Kameraverschluss: Unbewegtes bleibt scharf, Bewegtes zieht Schlieren. Das Tool steuert das Replay selbst, nimmt jedes vom Simulator dargestellte Bild auf und addiert sie auf der GPU.',

			shutter: 'Verschlusszeit',
			shutterBody:
				'Wie lange die Belichtung <i>in Replay-Zeit</i> dauert, von einem Bruchteil eines Replay-Bildes bis zu zehn Sekunden. Diese Einstellung bestimmt die Länge der Schlieren. Längere Verschlusszeiten sammeln außerdem mehr Bilder und brauchen daher weniger Hilfe von allem Folgenden; die kürzesten Stufen umfassen ein einziges Replay-Bild und sammeln nur eine Handvoll Abtastungen.',

			playback: 'Wiedergabegeschwindigkeit',
			playbackBody:
				'Das Replay wird während der Belichtung in Zeitlupe abgespielt, sodass der Simulator mehr Bilder pro Sekunde Replay-Zeit darstellt und die Überlagerung mehr Abtastungen erhält. 1/16 sammelt etwa sechzehnmal so viele Bilder wie Echtzeit — und dauert sechzehnmal so lange in tatsächlicher Zeit. Das ist der zentrale Kompromiss dieses Bereichs: Geduld gegen Gleichmäßigkeit.',
			playbackAutoBody:
				'„Automatisch (aus Zielanzahl)“ wählt die Geschwindigkeit anhand der <b>Ziel-Abtastungen</b>: Das Tool ermittelt die schnellste Wiedergabe, die die gewünschte Anzahl noch erreicht. Gib stattdessen eine feste Geschwindigkeit an, wenn du die Wartezeit begrenzen willst.',

			weighting: 'Gewichtung',
			weightingBody:
				'Wie stark jedes aufgenommene Bild zum Ergebnis beiträgt. <b>Box</b> gewichtet alle gleich und ergibt eine gleichmäßige Schliere. <b>Linear</b> steigt zum Ende des Fensters an, sodass das Motiv dort am schärfsten ist, wo es endete, und entlang seines Weges verblasst. <b>Ease</b> ist dieselbe Idee mit schärferem Kopf und längerem Schweif.',

			interpolation: 'Bildinterpolation',
			interpolationBody:
				'Erfindet mithilfe der Optical-Flow-Einheit der GPU zusätzliche Bilder zwischen den echten und füllt so die Lücken entlang der Schliere. Erfordert eine NVIDIA-Karte ab Turing und wird auf Hardware, die das nicht kann, vollständig ausgeblendet.',
			interpolationCostBody:
				'Sie ist nicht umsonst: Sie kostet GPU-Zeit bei jedem aufgenommenen Bild, und das Budget ist ein iRacing-Bild. Kommt sie nicht mit, verpasst sie <i>echte</i> Bilder, um synthetische zu erzeugen — unterm Strich ein Verlust: Die Schliere wird kürzer und gröber. Die Kosten skalieren mit Megapixeln mal Faktor, was bei 2560×1440 bequem ist, ist bei 8K nicht tragfähig. Zum Prüfen nimmst du denselben Moment zweimal auf, einmal mit und einmal ohne, und vergleichst die echten Abtastzahlen; die App warnt dich hinterher auch, wenn eine Aufnahme zu kurz kam.',

			passes: 'Durchgänge',
			passesBody:
				'Besucht denselben Moment mehrfach und sammelt alles in einem Bild. Jeder Durchgang fängt Bilder ein, die die anderen zufällig verpasst haben, sodass die Schliere gleichmäßiger wird — nicht heller, denn das Ergebnis wird darauf normiert, wie viel Licht tatsächlich auf jedem Pixel gelandet ist.',
			passesTradeBody:
				'Durchgänge kaufen dasselbe wie Interpolation, nur in anderer Währung: tatsächliche Zeit statt GPU-Zeit. Acht Durchgänge dauern etwa achtmal so lange, können dich aber nie echte Bilder kosten. Damit sind sie der richtige Hebel bei hohen Auflösungen, wo die Interpolation nicht mitkommt, und bei kurzen Verschlusszeiten, wo ein einzelner Durchgang sehr wenige Abtastungen sammelt. Beides zugleich zu nutzen ist meist das Schlechteste aus beiden Welten — sie konkurrieren um dasselbe Budget pro Bild.',

			bracket: 'Verschlusszeiten-Reihe',
			bracketBody:
				'Liefert aus einer einzigen Aufnahme ein Bild je Verschlusszeitstufe, die gleich der gewählten oder kürzer ist. Eine Aufnahme bei 1/60 liefert dir auch 1/125, 1/250, 1/500 und 1/1000 — denselben Moment mit zunehmend kürzeren Schlieren — sodass du die Wirkung hinterher wählen kannst, statt zu raten und neu aufzunehmen.',
			bracketCostBody:
				'Es kostet fast keine zusätzliche Zeit. Jede Stufe endet auf demselben Bild und unterscheidet sich nur darin, wie weit sie zurückreicht; eine kürzere Verschlusszeit ist also schlicht das Ende der ohnehin vorbeiziehenden Bilder — sie werden alle aus einem Durchgang des Replays gefüllt.',
			bracketMemoryBody:
				'Was es sehr wohl kostet, ist Speicher. Jede Stufe braucht ihren eigenen Sammler in voller Auflösung, elf Stufen brauchen also den elffachen Videospeicher einer einzigen, was bei 8K mehr ist, als die meisten Karten haben. Die Aufnahme prüft das vorab und verweigert sich, statt iRacing zum Absturz zu bringen. Wird eine Reihe abgelehnt, senke die Auflösung oder wähle eine kürzere Verschlusszeit — was zugleich eine kürzere Leiter bedeutet.',
			bracketNamingBody:
				'Die von dir gewählte Stufe wird unter dem üblichen Namen gespeichert und erscheint in der Galerie; die übrigen liegen daneben und tragen ihre Verschlusszeit im Dateinamen.',

			highlights: 'Lichterrettung',
			highlightsBody:
				'Hebt beinahe ausgebrannte Lichter an, bevor die Bilder addiert werden, und nimmt die Anhebung am Ende wieder zurück. iRacing liefert ein bereits tonemapptes Bild, sodass ein Scheinwerfer und eine weiße Wand mit demselben Wert ankommen; mittelt man das, wird aus einem hellen Licht, das durch einen Teil der Belichtung wandert, ein grauer Schmierer statt einer hellen Spur. Dies bringt die Nichtlinearität dorthin zurück, wo ein echter Sensor sie hat. Gemessen in Blendenstufen; 0 ist aus und ändert überhaupt nichts.',

			whatItSaves: 'Was gespeichert wird',
			whatItSavesBody:
				'Größe, Beschneiden des Wasserzeichens und Dateiformat folgen denselben Bedienelementen wie ein normaler Screenshot — den Einstellungen Auflösung und Wasserzeichen beschneiden oben sowie dem Ausgabeformat in den Einstellungen. Die Zeile „Ausgabe“ am oberen Rand der Seitenleiste zeigt genau, was du bekommst.',
			whatItSavesPngBody:
				'Mit PNG wird ein echtes 16-Bit-Master geschrieben, was sich lohnt, wenn du die Aufnahme später gradieren willst, dazu eine 8-Bit-Vorschau für die Galerie. Bei hohen Auflösungen ist es auch deutlich langsamer zu schreiben — ein 16-Bit-PNG mit 33 Megapixeln braucht rund zehn Sekunden, dasselbe Bild als JPEG unter einer.',

			troubleshooting: 'Wenn das Ergebnis falsch aussieht',
			troubleGhosts:
				'<b>Einzelne Geisterbilder statt einer gleichmäßigen Schliere</b> — zu wenige Abtastungen. Nutze eine langsamere Wiedergabegeschwindigkeit, mehr Durchgänge oder eine niedrigere Auflösung.',
			troubleShutter:
				'<b>Unsicher, welche Verschlusszeit du wolltest</b> — schalte die Verschlusszeiten-Reihe ein und entscheide hinterher, bei gleicher Wartezeit.',
			troubleHighlights:
				'<b>Ausgebrannte oder flaue Lichter</b> — probiere 3 bis 5 Stufen Lichterrettung.',
			troubleBlack:
				'<b>Ein schwarzes Bild</b> — iRacing läuft im exklusiven Vollbild. Stelle Display &gt; Full Screen auf OFF.',
			troubleSidecar:
				'Jede Aufnahme protokolliert die genau verwendeten Einstellungen, die Zahl der Abtastungen und wie gleichmäßig sie verteilt waren, als .json-Datei im Protokollordner neben app.log. Die letzten 20 Aufnahmen werden aufbewahrt — eine Reihe zählt als eine — sodass die Aufnahme, nach der du fragst, noch da ist, während du fragst.',
		},

		faq: {
			blackShot:
				'Die Aufnahme ist schwarz, aber die iRacing-Oberfläche ist darauf zu sehen',
			blackShotBody:
				'Die Aufnahme selbst hat funktioniert: Die Oberfläche wurde gezeichnet, es ist also ein echtes Bild beim Tool angekommen. Was fehlt, ist die 3D-Szene, weil iRacing sie schwarz gerendert hat. Mehrere der weniger gebräuchlichen Kameras tun das — die Fahrwerkskamera trifft es am häufigsten. Wechsle zu einer gewöhnlichen Kamera (Cockpit, Verfolgerkamera oder eine der TV-Kameras) und nimm denselben Moment erneut auf.',
			blackShotFullscreenBody:
				'Ist das Bild <i>einschließlich</i> der Oberfläche schwarz und verhält sich jede Kamera gleich, liegt es an etwas anderem: iRacing läuft im exklusiven Vollbild, das sich von außerhalb des Simulators nicht aufnehmen lässt. Stelle Display &gt; Full Screen auf OFF.',

			cameraReset:
				'iRacing verstellt meine Kamera, bevor die Aufnahme entsteht',
			cameraResetBody:
				'Das ist iRacings eigene automatische Kameraauswahl, nicht dieses Tool. Solange sie aktiv ist, wählt iRacing die Kameras weiterhin selbst und springt im Moment des Auslösens auf eine Standardeinstellung zurück, sodass du nicht die Aufnahme bekommst, die du eingerichtet hast.',
			cameraResetFixBody:
				'Schalte sie im Kamerawerkzeug von iRacing (Strg+F12) unter <b>Camera &gt; Config &gt; Preferences</b> aus: der Schalter <b>Shot Selection</b> mit der Beschriftung <b>Automatic</b>. Ist er aus, bleibt die Kamera genau dort, wo du sie hingestellt hast — bei normalen Screenshots wie bei Langzeitbelichtungen.',

			tripleBands: 'There are vertical bands in my triple-screen shots',
			tripleBandsBody:
				'They are a side effect of two iRacing settings working together: multi-projection (the SMP setting) and bezel correction. On the monitors themselves the picture looks right — the correction exists to line the scene up across the physical frames — but in the captured image the corrected regions show up as vertical bands where one screen meets the next.',
			tripleBandsFixBody:
				"Either change fixes it: set the <b>bezel width</b> to <b>0 mm</b> in iRacing's graphics options, which takes effect immediately, or turn off <b>multi-projection (SMP)</b>, which takes effect after an iRacing restart.",
		},
	},

	update: {
		checking: 'Suche nach Updates…',
		newVersion: 'Eine neue Version',
		availableBusy:
			'{version} ist verfügbar. Eine Aufnahme läuft — du kannst sie herunterladen, sobald diese fertig ist.',
		available: '{version} ist verfügbar. Zum Herunterladen klicken.',
		downloading: '{version} wird heruntergeladen…',
		downloadingPercent: '{version} wird heruntergeladen — {percent} %',
		downloadedBusy:
			'{version} ist bereit. Eine Aufnahme läuft, daher wird sie installiert, wenn du die App schließt.',
		downloaded:
			'{version} ist bereit. Zum Neustarten und Installieren klicken.',
		failed: 'Update-Prüfung fehlgeschlagen: {error}',
		unknownError: 'unbekannter Fehler',
		neverChecked: 'Es wurde noch nicht nach Updates gesucht.',
		upToDate: 'Du nutzt die neueste Version.',

		alreadyDownloading: 'Das Update wird bereits heruntergeladen.',
		alreadyDownloaded: 'Das Update wurde bereits heruntergeladen.',
		nothingToDownload: 'Es gibt kein Update zum Herunterladen.',
		captureInProgress:
			'Eine Aufnahme läuft. Versuche es erneut, sobald sie fertig ist.',
		nothingToInstall: 'Es ist kein Update zur Installation bereit.',
		captureInProgressInstall:
			'Eine Aufnahme läuft. Das Update installiert sich von selbst, wenn du die App schließt.',
		devBuildOnly:
			'Update-Prüfungen laufen nur in einer installierten Version.',

		installTitle: 'Update installieren',
		installMessage: 'Version {version} installieren?',
		installFallbackVersion: 'Update',
		installDetail:
			'Die App wird geschlossen und nach der Installation des Updates wieder geöffnet. Wählst du „Später“, installiert es sich von selbst, wenn du die App das nächste Mal schließt.',
		installConfirm: 'Neu starten und installieren',
		installLater: 'Später',
	},

	filenameFields: {
		categories: {
			Track: 'Strecke',
			Driver: 'Fahrer',
			Session: 'Session',
			Meta: 'Meta',
		},
		track: 'Strecke',
		trackFull: 'Strecke vollständig',
		trackCity: 'Stadt',
		trackCountry: 'Land',
		trackType: 'Streckentyp',
		driver: 'Fahrer',
		driverAbbrev: 'Fahrer Kürzel',
		driverInitials: 'Initialen',
		team: 'Team',
		carNumber: 'Startnr.',
		car: 'Fahrzeug',
		carFull: 'Fahrzeug vollständig',
		carClass: 'Fahrzeugklasse',
		iRating: 'iRating',
		sessionType: 'Session-Typ',
		sessionName: 'Session-Name',
		lap: 'Runde',
		date: 'Datum',
		time: 'Uhrzeit',
		datetime: 'Datum+Uhrzeit',
		counter: 'Zähler',
	},

	iracingConfig: {
		projections:
			'Deaktiviere „Render Scene Using 3 Projections“ in iRacing (Display > Monitor), um vertikale Streifen in Screenshots zu vermeiden',
	},

	graphicsProfiles: {
		title: 'Grafikprofile',
		description:
			'Speichere iRacing-Grafikkonfigurationen und wechsle zwischen ihnen — eine fürs Fahren, eine für Screenshots, eine für Videoaufnahmen. iRacing lädt die Konfiguration beim Start und schreibt sie beim Beenden zurück; ein Wechsel bei laufender Sim wird also rückgängig gemacht: <b>Konfigurationen nur bei geschlossener Sim wechseln</b>.',
		iracingRunning:
			'Schließe iRacing vor dem Wechsel. Beim Beenden schreibt es seine Grafikkonfiguration zurück und würde die Änderung rückgängig machen.',
		activeHeading: 'Aktuelle Konfiguration',
		active: {
			clean: 'Entspricht deinem Profil {name}.',
			modified: {
				one: 'Basiert auf {name}, seitdem wurde {count} Einstellung geändert.',
				other: 'Basiert auf {name}, seitdem wurden {count} Einstellungen geändert.',
			},
			modifiedUnknownCount: 'Basiert auf {name}, wurde seitdem geändert.',
			unknown: 'Entspricht keinem gespeicherten Profil.',
			missing: 'Es wurde keine iRacing-Grafikkonfiguration gefunden.',
		},
		badge: {
			active: 'Aktiv',
			modified: 'Geändert',
		},
		picker: {
			unknown: 'Kein passendes Profil',
			missing: 'Keine Konfiguration',
		},
		empty: {
			title: 'Noch keine Profile gespeichert.',
			body: 'Speichere deine aktuelle iRacing-Konfiguration als Profil oder importiere eine vorhandene .ini-Datei.',
		},
		invalidProfile: 'Keine Grafikkonfiguration',
		warnings: {
			autoCfgIncomplete: 'Wird von iRacing zurückgesetzt',
		},
		actions: {
			load: 'Laden',
			overwrite: 'Aus aktueller aktualisieren',
			rename: 'Umbenennen',
			export: 'Exportieren',
			delete: 'Löschen',
			save: 'Speichern',
			cancel: 'Abbrechen',
			saveCurrent: 'Aktuelle speichern als…',
			import: 'Importieren…',
			openFolder: 'Ordner öffnen',
		},
		prompt: {
			namePlaceholder: 'Profilname',
			deleteConfirm: '{name} löschen?',
		},
		feedback: {
			loaded: '{name} geladen. Starte iRacing, damit es wirksam wird.',
			saved: 'Als {name} gespeichert.',
			overwritten: '{name} aus der aktuellen Konfiguration aktualisiert.',
			renamed: 'In {name} umbenannt.',
			deleted: '{name} gelöscht.',
			imported: 'Als {name} importiert.',
			exported: '{name} exportiert.',
		},
		errors: {
			empty: 'Gib einen Namen für das Profil ein.',
			illegalCharacters:
				'Ein Profilname darf keines dieser Zeichen enthalten: < > : " / \\ | ? *',
			reservedName:
				'Dieser Name ist von Windows reserviert. Wähle einen anderen.',
			trailingDotOrSpace:
				'Ein Profilname darf nicht mit einem Punkt oder Leerzeichen enden.',
			tooLong: 'Dieser Name ist zu lang.',
			duplicate: 'Ein Profil mit diesem Namen existiert bereits.',
			profileNotFound: 'Dieses Profil wurde nicht mehr gefunden.',
			profileExists: 'Ein Profil mit diesem Namen existiert bereits.',
			duplicateContent:
				'Ein Profil mit genau diesen Einstellungen existiert bereits: {name}.',
			noActiveConfig:
				'Es wurde keine iRacing-Grafikkonfiguration zum Speichern gefunden.',
			invalidIni:
				'Diese Datei ist keine iRacing-Grafikkonfiguration und wurde daher nicht verwendet.',
			iracingRunning:
				'Schließe zuerst iRacing — beim Beenden würde es die Änderung überschreiben.',
			ioError:
				'Die Datei konnte nicht geschrieben werden. Es wurde nichts geändert.',
		},
	},

	wgc: {
		cursorCaveat:
			'Der Mauszeiger kann bei dieser Windows-Version in Aufnahmen erscheinen. Windows 10 Version 2004 hat die Einstellung eingeführt, die ihn ausblendet.',
		addonUnavailable:
			'Die Komponente für die High-Fidelity-Aufnahme konnte auf diesem System nicht geladen werden.',
		osUnsupported:
			'Windows.Graphics.Capture ist auf dieser Windows-Version nicht verfügbar. Es benötigt Windows 10 Version 1903 oder neuer.',
		nativeCaptureOff: 'High-Fidelity-Aufnahme (WGC) ist ausgeschaltet',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing läuft im exklusiven Vollbild, daher wäre der Screenshot schwarz. Stelle in iRacing Display > Full Screen auf OFF (nutze Borderless oder Windowed) und versuche es erneut.',
		exclusiveFullscreenUnattributed:
			'Eine Anwendung läuft im exklusiven Vollbild, was zu einer schwarzen Aufnahme führt. Falls iRacing im Vollbild läuft, stelle Display > Full Screen auf OFF (nutze Borderless oder Windowed) und versuche es erneut.',
		unknownError: 'Unbekannter Screenshot-Fehler',
		outputTooSmall: 'Aufnahme ist zu klein ({width}x{height})',
		blackFrame:
			'Das aufgenommene Bild ist schwarz — die Aufnahmequelle könnte fehlgeschlagen sein (GPU-beschleunigte Inhalte lassen sich auf manchen Windows-Systemen nicht aufnehmen)',
		noSource: 'Keine Desktop-Aufnahmequelle für Fenster {windowId} gefunden',
		metadataTimeout:
			'Zeitüberschreitung beim Warten auf die Video-Metadaten der Aufnahme',
		noVideoFrame: 'Der Aufnahme-Stream lieferte kein Videobild',
		dimensionTimeout:
			'Zeitüberschreitung beim Warten auf die Fenstergröße {width}x{height}; es wird mit {actualWidth}x{actualHeight} fortgefahren',
	},

	longExposureCapture: {
		busy: 'Es läuft bereits eine Aufnahme.',
		needsNativeCapture:
			'Langzeitbelichtung benötigt die High-Fidelity-Aufnahme (WGC). Schalte sie in den Einstellungen ein, um sie zu nutzen.',
		unavailable: 'Langzeitbelichtung ist auf diesem Rechner nicht verfügbar.',
		noTelemetry:
			'Langzeitbelichtung benötigt Replay-Telemetrie von iRacing. Prüfe, ob der Simulator läuft und sich in einer Session befindet.',
		windowNotFound: 'iRacing-Fenster nicht gefunden.',
		cancelled: 'Aufnahme abgebrochen.',
		seekTimeout:
			'Das Replay hat Bild {frame} nicht rechtzeitig erreicht. Es lädt möglicherweise noch.',
		noPasses: 'Eine Aufnahme muss mindestens einen Durchgang ausführen.',
		playbackStalled:
			'Das Replay hat nicht mit der Wiedergabe begonnen. Prüfe, ob iRacing nicht von einem anderen Werkzeug pausiert wurde.',
		exposureTimeout:
			'Die Belichtung hat Bild {frame} nicht innerhalb von {seconds} s erreicht.',
		endedEarly:
			'Die Belichtung endete, bevor der gewählte Moment erreicht war.',
		noFramesPresented: 'iRacing hat keine Bilder zur Aufnahme geliefert.',
		subFrameNoSamples:
			'Diese Verschlusszeit ist kürzer als ein Replay-Bild, und iRacing hat darin kein Bild gerendert. Versuche eine langsamere Wiedergabegeschwindigkeit oder die nächstlängere Verschlusszeit.',
		noSamples:
			'Es wurden keine Bilder gesammelt. iRacing hat während der Belichtung möglicherweise aufgehört zu rendern.',
		blankCapture:
			'Alle aufgenommenen Bilder waren schwarz, es gibt also kein Bild zu speichern. Prüfen Sie, ob iRacing im Fenster- oder randlosen Modus statt im exklusiven Vollbild läuft und ob bei dieser Auflösung noch Grafikspeicher frei ist — eine niedrigere Aufnahmeauflösung ist am schnellsten ausprobiert.',
		frozenCapture:
			'iRacing hat während der Belichtung {samples} Bilder ausgegeben, die aber alle identisch waren — dieses Bild ist daher eine Einzelaufnahme und keine Langzeitbelichtung. iRacing hat während des Replays nichts Neues gerendert.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'Die GPU hat kein Bild zurückgegeben.',
		bracketShortfall:
			'Die Reihe hat {asked} Stufen angefordert, aber {returned} kamen zurück — die übrigen ließen sich nicht auflösen, oder diese Version der Aufnahmekomponente ist älter als die Reihenfunktion.',
	},

	validation: {
		windowBeforeStart:
			'Die Belichtung benötigt {frames} Replay-Bilder vor dem gewählten Moment, liegt aber nur {anchor} Bilder im Replay. Wähle einen späteren Moment oder eine kürzere Verschlusszeit.',
		pastEnd: 'Der gewählte Moment liegt hinter dem Ende des Replays.',
		sessionChanged:
			'Das Replay hat seit der Einrichtung dieser Aufnahme zu einer anderen Session gewechselt. Wähle den Moment erneut.',
		singleSampleMultiPass:
			'Diese Verschlusszeit ist so kurz, dass pro Durchgang nur etwa ein Bild hineinfällt; {passes} Durchgänge sammeln also rund {passes} Abtastungen. Eine langsamere Wiedergabegeschwindigkeit oder eine längere Verschlusszeit bringt weit mehr.',
		singleSample:
			'Diese Verschlusszeit ist so kurz, dass nur ein Bild hineinfällt; das Ergebnis hat daher keine Bewegungsunschärfe. Eine langsamere Wiedergabegeschwindigkeit oder eine längere Verschlusszeit bringt Abtastungen.',
		bracketVsInterpolation:
			'Verschlusszeiten-Reihe und {factor}x Bildinterpolation können nicht beide laufen, daher wird diese Aufnahme ohne Interpolation gemacht. Schalte die Reihe aus, wenn dir die Zwischenbilder wichtiger sind als die zusätzlichen Stufen.',
		passesVsInterpolation:
			'Mehrere Durchgänge und {factor}x Interpolation sind beide aktiv. Sie konkurrieren: Die Interpolation bremst jeden Durchgang so weit, dass er echte Bilder verliert, sodass dieselbe Wartezeit weniger echte Abtastungen bringt als Durchgänge allein. Die Interpolation auszuschalten ergibt meist die bessere Aufnahme.',
		shortOfTarget:
			'Selbst bei 1/{divisor} Geschwindigkeit erreicht diese Belichtung nur etwa {samples} Abtastungen, weniger als die geforderten {target}. Nutze eine längere Verschlusszeit für mehr.',
		longCaptureEscalate:
			'Diese Aufnahme spielt das Replay mit 1/{divisor} Geschwindigkeit für etwa {duration} tatsächlicher Zeit ab{passSuffix} und lässt sich nach dem Start nicht beschleunigen. {advice}',
		longCaptureWarn:
			'Diese Aufnahme dauert etwa {duration} tatsächlicher Zeit bei 1/{divisor} Wiedergabegeschwindigkeit{passSuffix}.',
		passSuffix: ', verteilt auf {passes} Durchgänge über denselben Moment',
		adviceFewerPasses:
			'Weniger Durchgänge sind schneller fertig, mit weniger Abtastungen.',
		adviceFasterPlayback:
			'Eine höhere Wiedergabegeschwindigkeit ist schneller fertig, mit weniger Abtastungen.',
		pastLogCap:
			'Diese Aufnahme wird voraussichtlich etwa {samples} Abtastungen über {passes} Durchgänge sammeln, mehr als die {cap}, die das Diagnoseprotokoll fasst. Das Bild ist davon unberührt — nur die Gleichmäßigkeits- und Lückenwerte beschreiben dann den ersten Teil der Aufnahme.',
		interpolationLossy:
			'In dieser Größe hat {factor}x Interpolation diesen Rechner schon einmal echte Abtastungen gekostet. Erwäge einen niedrigeren Faktor, eine niedrigere Auflösung oder stattdessen mehr Durchgänge.',
	},

	duration: {
		zero: '0 Sekunden',
		seconds: {
			one: '{count} Sekunde',
			other: '{count} Sekunden',
		},
		minutes: {
			one: '{count} Minute',
			other: '{count} Minuten',
		},
		minutesSeconds: '{minutes} Min. {seconds} s',
	},

	// The iRacing configuration editor page. Setting labels/helps are addressed
	// mechanically as settings.<sectionSlug>.<key>.label|.help — the schema in
	// utilities/iracing-settings-schema.ts derives the keys, and its test fails
	// if one is missing here.
	iniEditor: {
		title: 'iRacing-Konfigurationseditor',
		nav: {
			home: 'Screenshots',
			config: 'iRacing-Konfiguration',
		},
		tabs: {
			monitor: 'Monitor / Anzeige',
			graphics: 'Grafik',
		},
		mode: {
			label: 'Aktuell bearbeitete Konfiguration:',
			// Mode names come from iRacing's own filenames; Legacy is the bare
			// rendererDX11.ini only old-website launches still read.
			legacy: 'Legacy',
		},
		actions: {
			save: 'Änderungen speichern',
			discard: 'Verwerfen',
			reload: 'Neu laden',
			browse: 'Durchsuchen…',
		},
		state: {
			dirty: {
				one: '{count} ungespeicherte Änderung',
				other: '{count} ungespeicherte Änderungen',
			},
			saved: 'Änderungen in {file} gespeichert',
			simRunning:
				'iRacing läuft. Es hält diese Einstellungen im Speicher und schreibt die Datei beim Beenden neu, jetzt vorgenommene Änderungen gingen also verloren. Schließe iRacing, um sie zu bearbeiten.',
			stale: 'Diese Datei wurde seit dem Laden auf der Festplatte geändert — meist, weil iRacing sie beim Beenden neu schreibt. Lade neu, um die aktuellen Werte zu sehen.',
			keyMissing: 'In dieser Datei nicht vorhanden',
			noModes:
				'In {folder} wurden keine Renderer-Konfigurationsdateien gefunden. Starte iRacing einmal, um sie anzulegen, oder verweise das Werkzeug auf deinen iRacing-Ordner.',
			loadFailed: 'Die Konfigurationsdatei konnte nicht gelesen werden.',
			discardConfirm: '{count} ungespeicherte Änderungen verwerfen?',
		},
		folder: {
			label: 'iRacing-Ordner',
			autoDetected: 'Automatisch erkannt',
			reset: 'Automatische Erkennung verwenden',
			help: 'Wo iRacing seine Konfigurationsdateien ablegt. Leer lassen, um den Ordner Documents\\iRacing automatisch zu erkennen.',
		},
		errors: {
			iracingRunning:
				'Schließe zuerst iRacing — beim Beenden würde es die Änderung überschreiben.',
			staleFile:
				'Die Datei wurde seit dem Laden auf der Festplatte geändert. Lade neu und versuche es erneut.',
			validationFailed:
				'Einer der Werte ist ungültig. Es wurde nichts geändert.',
			keyNotFound:
				'Eine Einstellung fehlte in der Datei, daher wurde nichts geändert. Lade neu und versuche es erneut.',
			fileNotFound: 'Die Konfigurationsdatei existiert nicht mehr.',
			ioError:
				'Die Datei konnte nicht geschrieben werden. Es wurde nichts geändert.',
		},
		groups: {
			window: 'Fensterplatzierung',
			fullscreen: 'Vollbild',
			quality: 'Qualität & Detailgrad',
			aa: 'Kantenglättung & Schärfung',
			post: 'Nachbearbeitung',
			perf: 'Leistung',
			misc: 'Verschiedenes',
		},
		// Shared tier vocabulary for enum settings.
		levels: {
			off: 'Aus',
			low: 'Niedrig',
			medium: 'Mittel',
			high: 'Hoch',
			max: 'Maximal',
			ultra: 'Ultra',
		},
		nvReflex: {
			off: 'Aus',
			on: 'Ein',
			onBoost: 'Boost',
		},
		shadowDetail: {
			fewer: 'Weniger Schatten',
			maximum: 'Maximale Schatten',
		},
		aaMethod: {
			none: 'Keine',
			msaa: 'MSAA',
			fxaa: 'FXAA',
			smaa: 'SMAA',
		},
		msaaSamples: {
			x2: '2x',
			x4: '4x',
			x8: '8x',
		},
		msaaFilter: {
			soft: 'Weich',
			neutral: 'Neutral',
			sharp: 'Scharf',
			simple: 'Einfach',
		},
		dnsmFilter: {
			off: 'Aus',
			simple: 'Einfach',
			pcf4: 'PCF4',
			pcf4p: 'PCF4P',
			pcf8p: 'PCF8P',
			pcf16p: 'PCF16P',
		},
		dynamicShadowMaps: {
			off: 'Aus',
			mainView: 'In der Hauptansicht',
			mainViewMirrors: 'In Hauptansicht & Spiegeln',
		},
		hideObstructions: {
			none: 'Keine',
			halo: 'Halo ausblenden',
			pillarRollcage: 'A-Säulen und Überrollkäfig ausblenden',
			everything: 'Alles ausblenden',
		},
		replayScope: {
			label: 'Auch auf die Replay-Grafik anwenden',
		},
		// Inline hints under a field whose pending value cannot be saved. Only
		// numeric inputs can go invalid (switches and dropdowns cannot), and
		// every bounded numeric in the schema carries both bounds.
		invalid: {
			intRange: 'Gib eine ganze Zahl zwischen {min} und {max} ein.',
			int: 'Gib eine ganze Zahl ein.',
			floatRange: 'Gib eine Zahl zwischen {min} und {max} ein.',
			float: 'Gib eine Zahl ein.',
		},
		layout: {
			title: 'Monitoranordnung',
			primary: 'Primär',
			windowTarget: 'iRacing-Fenster',
			estimated:
				'Geschätzt — Windows und iRacing nummerieren Bildschirme unterschiedlich, daher wird die Hervorhebung anhand der Position zugeordnet.',
		},
		settings: {
			display: {
				border: { label: 'Fensterrahmen' },
				windowedXPos: { label: 'Fenster links' },
				windowedYPos: { label: 'Fenster oben' },
				windowedWidth: { label: 'Fensterbreite' },
				windowedHeight: { label: 'Fensterhöhe' },
				windowedMaximized: { label: 'Maximiert starten' },
				windowedAlignment: {
					label: 'Fensterausrichtung',
					help: 'iRacing dokumentiert diesen Wert nicht. Lass ihn unverändert, sofern du nicht weißt, welchen Ausrichtungsindex du brauchst.',
				},
				fullScreen: { label: 'Vollbild' },
				fullScreenWidth: { label: 'Vollbildbreite' },
				fullScreenHeight: { label: 'Vollbildhöhe' },
				fullScreenDepth: {
					label: 'Vollbild-Farbtiefe',
					help: 'Bits pro Pixel. Auf praktisch jedem modernen System 32.',
				},
				RefreshRate: {
					label: 'Bildwiederholrate',
					help: '0 verwendet die Standard-Bildwiederholrate des Bildschirms.',
				},
			},
			graphics: {
				ShaderQuality: { label: 'Shader-Qualität' },
				ShadowDetail: { label: 'Schattendetails' },
				DynamicShadowMaps: {
					label: 'Dynamische Schattenkarten',
					help: 'Schattenkarten für Fahrzeuge und andere bewegte Objekte. Nur bei Tag.',
				},
				DNSMFilter: {
					label: 'Schattenkarten-Filter',
					help: 'Der Filter für die dynamischen Nacht-Schattenkarten.',
				},
				CarDetail: { label: 'Fahrzeugdetails' },
				PitObjectDetail: { label: 'Details der Boxenobjekte' },
				CrowdDetail: { label: 'Zuschauerdetails' },
				GrandstandDetail: { label: 'Tribünendetails' },
				ObjectDetail: { label: 'Objektdetails' },
				FoliageDetail: { label: 'Vegetationsdetails' },
				ParticleDetail: { label: 'Partikeldetails' },
				ParticlesFullRes: { label: 'Partikel in voller Auflösung' },
				MirrorDetail: { label: 'Höhere Details in Spiegeln' },
				MaxCockpitMirrors: { label: 'Max. Cockpit-Spiegel' },
				AntiAliasMethod: { label: 'Kantenglättungsmethode' },
				MSAASamples: { label: 'MSAA-Samples' },
				MSAAUseFilter: { label: 'MSAA-Filter' },
				Sharpening: { label: 'Schärfung' },
				SharpeningAmount: {
					label: 'Stärke der Schärfung',
					help: 'Stärke des Schärfungsfilters.',
				},
				FSRSharpness: {
					label: 'FSR-Schärfe',
					help: 'Schärfe beim Hochskalieren durch die Auflösungsskalierung mit FSR.',
				},
				AutoExposure: {
					label: 'Automatische Belichtung',
					help: 'Funktioniert nur, solange HDR-Rendering aktiviert ist.',
				},
				SSAO: { label: 'Umgebungsverdeckung (SSAO)' },
				SSRLevel: {
					label: 'Screen-Space-Reflexionen',
					help: 'Niedrig rendert die Reflexionen in geringerer Auflösung, Hoch in voller Auflösung.',
				},
				SSRRainOnly: {
					label: 'Reflexionen nur bei Regen',
					help: 'Beschränkt Screen-Space-Reflexionen auf nasse Streckenbedingungen — die Optionen „Low Rain“ und „High Rain“ in der Sim.',
				},
				HeatHaze: { label: 'Hitzeflimmern' },
				DepthOfField: { label: 'Schärfentiefe' },
				MotionBlurStrength: { label: 'Stärke der Bewegungsunschärfe' },
				Distortion: { label: 'Linsenverzerrung' },
				EnableHDR: { label: 'HDR-Rendering' },
				LimitFrameRate: { label: 'Bildrate begrenzen' },
				DesiredFPSLimit: { label: 'Bildratenbegrenzung' },
				VerticalSync: { label: 'Vertikale Synchronisierung' },
				NvReflexMode: { label: 'NVIDIA Reflex' },
				MaxPreRenderedFrames: {
					label: 'Max. vorgerenderte Bilder',
					help: 'Wie viele Bilder die GPU hinter der CPU zurückliegen darf. 1 ist normal; 0 deaktiviert die Warteschlange für Systeme mit mehreren GPUs.',
				},
				SysMemToUseMB: { label: 'Zu nutzender Arbeitsspeicher' },
				VidMemToUseMB: { label: 'Zu nutzender Grafikspeicher' },
				MaxCarsToDraw: { label: 'Max. dargestellte Fahrzeuge' },
				MaxCarsToDrawInMirrors: { label: 'Max. Fahrzeuge in Spiegeln' },
				VirtualMirrors: { label: 'Virtuelle Spiegel' },
				UIScale: { label: 'UI-Skalierung' },
				EnableTireMarks: { label: 'Reifenspuren' },
				HideCockpitObstructions: {
					label: 'Sichtbehinderungen im Cockpit ausblenden',
				},
				HeadlightLevel: { label: 'Scheinwerferqualität' },
			},
		},
	},
};

export default de;
