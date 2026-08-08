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
		neverChecked:
			'Es wurde noch nicht nach Updates gesucht (du nutzt v{version}).',
		upToDate: 'Du nutzt die neueste Version (v{version}).',

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
};

export default de;
