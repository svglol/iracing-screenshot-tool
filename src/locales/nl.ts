// Dutch. Translated from en.ts — see that file's header before editing.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.

import type { Catalog } from './index';

const nl: Catalog = {
	notice: {
		danger: 'Problemen',
		warning: 'Goed om te weten',
		info: 'Opmerkingen',
	},

	promo: {
		greeting: 'Bedankt voor het gebruik van iRacing Screenshot Tool!',
		signature: 'Gemaakt en onderhouden door AR Media Solutions.',
	},

	changelog: {
		title: 'Wijzigingslogboek',
		untitledRelease: 'Versie',
	},

	gallery: {
		menu: {
			openExternally: 'Openen met andere app',
			openFolder: 'Map openen',
			copy: 'Kopiëren',
			delete: 'Verwijderen',
		},
		copiedToClipboard: '{name} gekopieerd naar het klembord',
	},

	sidebar: {
		resolution: 'Resolutie',
		width: 'Breedte',
		height: 'Hoogte',
		output: 'Uitvoer:',
		cropWatermark: 'Watermerk bijsnijden',
		keepAspectRatio: 'Beeldverhouding behouden',
		screenshot: 'Schermafbeelding',
		custom: 'Aangepast',
		vramStatus: '{adapter}{free} vrij van {total}',
		savedSuccessfully: '{name} succesvol opgeslagen',
		screenshotFailed: 'Schermafbeelding mislukt: {message}',
		errorLogPrefix: 'Logboek: ',
		notices: {
			exclusiveFullscreen:
				'iRacing draait in exclusief volledig scherm — schermafbeeldingen worden zwart. Zet in iRacing Display > Full Screen op OFF (Borderless of Windowed) om vastleggen mogelijk te maken.',
			vramRisk:
				'{resolution} heeft ongeveer {needed} extra VRAM nodig, maar er is slechts {free} vrij — iRacing raakt waarschijnlijk zonder geheugen en loopt vast.',
			vramCaution:
				'{resolution} laat weinig VRAM-marge over ({free} vrij) en kan vastlopen bij zware baan-/autocombinaties.',
			switchResolution: 'Overschakelen naar {resolution}',
			vramStatic:
				'Hoge resoluties kunnen iRacing laten vastlopen als je zonder VRAM komt te zitten. Bepaalde baan-/autocombinaties vragen meer VRAM.',
			reshade:
				'Nadat je in iRacing Screenshot Tool op de knop hebt gedrukt, moet je nog je ReShade-sneltoets voor schermafbeeldingen indrukken.',
			crop: 'Het bijsnijden van het watermerk zoomt de uiteindelijke afbeelding iets in. Gebieden dicht bij de schermranden vallen weg.',
			aspectRatio:
				'„Beeldverhouding behouden” past de hoogte van de schermafbeelding aan de verhouding van je monitor aan (bijvoorbeeld 21:9 ultrawide) in plaats van de standaard 16:9. De gekozen resolutie bepaalt de breedte.',
		},
	},

	settings: {
		title: 'Instellingen',
		version: 'Versie - {version}',
		changelog: 'Wijzigingslogboek',
		openLogsFolder: 'Logboekmap openen',
		checkForUpdates: 'Controleren op updates',
		updateCheckFailed: 'Controle op updates mislukt: {message}',

		language: 'Taal',
		languageDescription:
			'De taal die in de hele app wordt gebruikt. Bij de eerste start overgenomen uit Windows.',

		screenshotFolder: 'Map voor schermafbeeldingen',
		selectFolder: 'Map kiezen',
		screenshotKeybind: 'Sneltoets voor schermafbeelding',
		editBind: 'Sneltoets wijzigen',

		customFilenameFormat: 'Aangepaste bestandsnaamindeling',
		customFilenameFormatDescription:
			'Gebruik een eigen patroon in plaats van de standaard ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Klik op velden om ze aan de indeling toe te voegen. Typ scheidingstekens (-, _, enz.) rechtstreeks.',
		reset: 'Herstellen',
		preview: 'Voorbeeld:',

		outputFormat: 'Uitvoerformaat',
		formatJpeg: 'JPEG (maximale kwaliteit)',
		formatPng: 'PNG (verliesvrij)',
		formatWebp: 'WebP (kwaliteit 95%)',

		disableTooltips: 'Tips verbergen',
		disableTooltipsDescription: 'Laat me met rust, ik weet wat ik doe',

		cropTopLeft: 'Watermerk bij voorkeur linksboven bijsnijden',
		cropTopLeftDescription:
			'Snijdt alleen de rechteronderhoek bij (3%). Staat dit uit, dan wordt de schermafbeelding gelijkmatig aan alle kanten bijgesneden (6% in totaal), voor een gecentreerd resultaat.',

		manualWindowRestore: 'Venster handmatig herstellen',
		manualWindowRestoreDescription:
			'Vervangt het automatisch herstellen van het venster door een eigen positie en grootte. Handig voor gebruikers van een ultrawide of Nvidia Surround.',
		left: 'Links',
		top: 'Boven',
		width: 'Breedte',
		height: 'Hoogte',
		restoreNow: 'Nu herstellen',

		nativeCapture: 'High-fidelity vastlegging (WGC)',
		nativeCaptureDescription:
			'Legt echte, niet-gesubsampelde kleur vast via Windows.Graphics.Capture in plaats van via de standaardpijplijn (die kleur subsampelt). Valt automatisch terug als een opname mislukt.',
		nativeCaptureUnavailable:
			'Niet beschikbaar op dit systeem — high-fidelity vastlegging kan hier niet werken.',
		nativeCaptureUnverified:
			'Windows meldt dat dit wordt ondersteund, maar een testopname kwam niet terug. Opnames vallen automatisch terug als het blijft mislukken.',

		reshade: 'ReShade-compatibiliteitsmodus',
		reshadeDescription:
			'Bij gebruik van ReShade moet je eerst de sneltoets van iRacing Screenshot Tool gebruiken of op de knop drukken, en daarna je ReShade-sneltoets voor schermafbeeldingen zodra het iRacing-venster van formaat is veranderd.',
		reshadeIni: 'ReShade-INI',
		selectFile: 'Bestand kiezen',
	},

	longExposure: {
		title: 'Lange sluitertijd',
		shutter: 'Sluitertijd',
		playbackSpeed: 'Afspeelsnelheid',
		playbackAuto: 'Automatisch (op basis van doelaantal)',
		playbackRealTime: '1x (realtime)',
		targetSamples: 'Doelaantal samples',
		advanced: 'Geavanceerd',
		defaultsSummary: '{count} standaardwaarden',

		weighting: 'Weging',
		weightingBox: 'Box (gelijkmatig)',
		weightingLinear: 'Lineair (scherp aan het eind)',
		weightingEase: 'Ease (scherpere kop, lange staart)',

		interpolation: 'Beeldinterpolatie',
		interpolationOff: 'Uit',
		interpolation2: '2× (één tussenbeeld)',
		interpolation4: '4× (drie tussenbeelden)',
		interpolation8: '8× (zeven tussenbeelden)',

		passes: 'Doorgangen',
		passes1: '1 (één doorgang)',
		passes2: '2× — twee keer zo lang wachten',
		passes4: '4× — vier keer zo lang wachten',
		passes8: '8× — acht keer zo lang wachten',

		bracket: 'Sluitertijdenreeks',
		highlightRecovery: 'Hoge lichten herstellen (stops)',

		cancel: 'Annuleren',
		saved: 'Lange sluitertijd opgeslagen — {count} samples',
		failed: 'Lange sluitertijd mislukt',

		modified: {
			weighting_linear: 'lineair',
			weighting_ease: 'ease',
			interpolation: '{factor}× interpolatie',
			passes: {
				one: '{count} doorgang',
				other: '{count} doorgangen',
			},
			bracketed: 'reeks',
			recovery: '{stops} stops herstel',
		},

		progress: {
			working: 'Bezig…',
			seeking: 'Zoeken…{pass}',
			accumulating: 'Belichten… {count} samples{pass}',
			resolving: 'Ontwikkelen…',
			restoring: 'Replay herstellen…',
			pass: ' (doorgang {current} van {total})',
		},

		notices: {
			needsNativeCapture:
				'Lange sluitertijd vereist high-fidelity vastlegging (WGC), die momenteel uitstaat. Schakel deze in bij de instellingen om lange sluitertijd te gebruiken.',
			unavailableWithReason:
				'Lange sluitertijd is niet beschikbaar op deze machine: {reason}',
			unavailable: 'Lange sluitertijd is niet beschikbaar op deze machine.',
			interpolationCost:
				'Interpolatie verzint beelden tussen de echte om de streep gelijkmatiger te maken. Het kost GPU-tijd per beeld, dus vergelijk het aantal echte samples van de opgeslagen opname met dezelfde opname zonder interpolatie — daalt dat aantal, dan koopt zij verzonnen samples met echte.',
			passesAndInterpolation:
				'Doorgangen en interpolatie concurreren om hetzelfde budget per beeld. Staan beide aan, dan legt elke doorgang minder echte beelden vast — interpolatie uitzetten levert meestal een betere opname op bij dezelfde wachttijd.',
			passes:
				'Elke doorgang speelt hetzelfde moment opnieuw af en vangt beelden op die de andere misten, zodat de streep gelijkmatiger wordt in plaats van helderder. Vooral nuttig bij korte sluitertijden, waar één doorgang maar een handjevol samples oplevert.',
			interpolationUnsupported:
				'Beeldinterpolatie vereist een NVIDIA Turing-GPU of nieuwer{adapter}. Al het andere aan lange sluitertijd werkt gewoon.',
			interpolationAdapter: ' (deze opname draait op {adapter})',
			reshade:
				'Lange sluitertijd legt natively vast en gebruikt ReShade niet, dus ReShade-effecten verschijnen niet in het resultaat.',
		},
	},

	help: {
		title: 'Help',
		sections: 'Helponderdelen',
		tabGeneral: 'Algemeen',
		tabLongExposure: 'Lange sluitertijd',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'iRacing-instellingen',
			borderless: 'iRacing moet draaien in Windowed Borderless',
			vram: 'Minstens 8 GB VRAM wordt aanbevolen voor schermafbeeldingen van 8K of hoger',
			newerContent: 'Nieuwere banen en auto’s vragen meer VRAM',
			shrinkUi:
				'Verklein de interface zo ver mogelijk voordat je een schermafbeelding maakt als je het watermerk laat bijsnijden; „Control+PageDown” verkleint hem. Werkt dat niet, dan moet je mogelijk de UI-zoom in de iRacing-instellingen herstellen.',

			screenshotFolder: 'Map voor schermafbeeldingen',
			screenshotFolderBody:
				'Schermafbeeldingen worden standaard opgeslagen in „C:\\Users\\user\\Pictures\\Screenshots”; dit kan bij de instellingen worden gewijzigd.',

			screenshotHotkey: 'Sneltoets voor schermafbeelding',
			screenshotHotkeyBody:
				'Standaard maakt „Control + PrintScreen” een schermafbeelding met de huidige instellingen; dit kan bij de instellingen worden gewijzigd.',

			issues: 'Problemen',
			issuesBody: 'Heb je problemen, meld ze dan op de',
			discord: 'Discord',

			instructions: 'Instructies',
			step1: 'iRacing <b>moet</b> draaien in de modus Windowed Borderless',
			step2: 'Start iRacing en zet de camera op de plek waar je de schermafbeelding wilt maken',
			step3: 'Kies de gewenste resolutie (probeer lagere resoluties voordat je naar 8K gaat)',
			step4: 'Bepaal of je het iRacing-watermerk wilt bijsnijden; zo ja, verklein dan eerst de iRacing-interface met „Control + PageDown” tot de kleinste stand',
			step5: 'Druk op de knop voor schermafbeeldingen of gebruik de sneltoets „Control + PrintScreen” om de opnames te maken',
			step6: 'Afhankelijk van de gekozen resolutie kan dit enkele seconden duren; zodra je iRacing-venster weer zijn normale formaat heeft, is het klaar',
			step7: 'Je schermafbeelding wordt opgeslagen in „C:\\Users\\{User}\\Pictures\\Screenshots”',
		},

		longExposure: {
			whatItDoes: 'Wat het doet',
			whatItDoesBody:
				'Een lange sluitertijd mengt veel beelden uit een replay tot één afbeelding, net zoals het openlaten van een camerasluiter: wat stilstaat blijft scherp, wat beweegt trekt een streep. De tool bestuurt de replay zelf, legt elk beeld vast dat de sim toont en telt ze op de GPU bij elkaar op.',

			shutter: 'Sluitertijd',
			shutterBody:
				'Hoe lang de belichting duurt <i>in replaytijd</i>, van een fractie van één replaybeeld tot tien seconden. Deze instelling bepaalt hoe lang de strepen worden. Langere sluitertijden verzamelen ook meer beelden en hebben daardoor minder hulp nodig van al het onderstaande; de kortste standen beslaan één enkel replaybeeld en verzamelen maar een handjevol samples.',

			playback: 'Afspeelsnelheid',
			playbackBody:
				'De replay wordt vertraagd afgespeeld terwijl de belichting wordt vastgelegd, zodat de sim meer beelden per seconde replaytijd toont en de menging meer samples krijgt. 1/16 verzamelt ruwweg zestien keer zoveel beelden als realtime — en duurt zestien keer zo lang in werkelijke tijd. Dat is de voornaamste afweging in dit paneel: geduld tegen gelijkmatigheid.',
			playbackAutoBody:
				'„Automatisch (op basis van doelaantal)” kiest de snelheid voor je aan de hand van het <b>doelaantal samples</b>: de tool zoekt de snelste weergave die het gevraagde aantal nog haalt. Stel in plaats daarvan een vaste snelheid in als je de wachttijd liever begrenst.',

			weighting: 'Weging',
			weightingBody:
				'Hoeveel elk vastgelegd beeld bijdraagt aan het resultaat. <b>Box</b> weegt ze allemaal even zwaar en geeft een gelijkmatige streep. <b>Lineair</b> loopt op naar het einde van het venster, zodat het onderwerp het scherpst is waar het eindigde en langs zijn baan vervaagt. <b>Ease</b> is hetzelfde idee met een scherpere kop en een langere staart.',

			interpolation: 'Beeldinterpolatie',
			interpolationBody:
				'Verzint extra beelden tussen de echte met de optical-flow-engine van de GPU en vult zo de gaten in de streep op. Vereist een NVIDIA Turing-kaart of nieuwer en wordt volledig verborgen op hardware die dit niet aankan.',
			interpolationCostBody:
				'Het is niet gratis: het kost GPU-tijd bij elk vastgelegd beeld, en het budget is één iRacing-beeld. Kan het dat niet bijhouden, dan begint het <i>echte</i> beelden te missen om synthetische te fabriceren, wat per saldo verlies is — de streep wordt korter en grover. De kosten schalen met megapixels maal de factor, dus wat comfortabel is op 2560×1440 is niet haalbaar op 8K. Om dit te controleren maak je dezelfde opname twee keer, met en zonder, en vergelijk je het aantal echte samples; de app waarschuwt je achteraf ook als een opname tekortschoot.',

			passes: 'Doorgangen',
			passesBody:
				'Bezoekt hetzelfde moment meerdere keren en verzamelt alles in één afbeelding. Elke doorgang vangt beelden op die de andere toevallig misten, zodat de streep gelijkmatiger wordt — niet helderder, want het resultaat wordt genormaliseerd naar hoeveel licht er werkelijk op elke pixel viel.',
			passesTradeBody:
				'Doorgangen kopen hetzelfde als interpolatie, maar met een andere munt: werkelijke tijd in plaats van GPU-tijd. Acht doorgangen duren ruwweg acht keer zo lang, maar kunnen je nooit echte beelden kosten. Daarmee zijn ze de juiste hefboom bij hoge resoluties, waar interpolatie het niet bijhoudt, en bij korte sluitertijden, waar één doorgang heel weinig samples oplevert. Beide tegelijk gebruiken is meestal het slechtste van twee werelden — ze concurreren om hetzelfde budget per beeld.',

			bracket: 'Sluitertijdenreeks',
			bracketBody:
				'Levert één afbeelding per sluitertijdstand die gelijk is aan of korter dan de gekozen stand, uit één enkele opname. Een opname op 1/60 geeft je ook 1/125, 1/250, 1/500 en 1/1000 — hetzelfde moment met steeds kortere strepen — zodat je de look achteraf kunt kiezen in plaats van te gokken en opnieuw op te nemen.',
			bracketCostBody:
				'Het kost vrijwel geen extra tijd. Elke stand eindigt op hetzelfde beeld en verschilt alleen in hoe ver hij terugreikt, dus een kortere sluitertijd is simpelweg het staartje van de beelden die toch al voorbijkomen — ze worden allemaal uit één doorgang van de replay gevuld.',
			bracketMemoryBody:
				'Wat het wél kost, is geheugen. Elke stand heeft een eigen accumulator op volledige resolutie nodig, dus elf standen vragen elf keer het videogeheugen van één, wat op 8K meer is dan de meeste kaarten hebben. De opname controleert dit vooraf en weigert in plaats van iRacing te laten vastlopen; wordt een reeks geweigerd, verlaag dan de resolutie of kies een kortere sluitertijd — wat meteen ook een kortere ladder oplevert.',
			bracketNamingBody:
				'De stand die je koos wordt onder de gebruikelijke naam opgeslagen en is degene die in de galerij verschijnt; de andere staan ernaast, met hun sluitertijd in de bestandsnaam.',

			highlights: 'Hoge lichten herstellen',
			highlightsBody:
				'Versterkt bijna uitgeknipte hoge lichten voordat de beelden worden opgeteld en draait die versterking aan het eind weer terug. iRacing levert een beeld af waarop al tone mapping is toegepast, dus een koplamp en een witte muur komen met dezelfde waarde binnen; dat middelen maakt van een fel licht dat door een deel van de belichting trekt een grijze veeg in plaats van een heldere streep. Dit zet de niet-lineariteit terug waar een echte sensor haar heeft. Gemeten in stops; 0 staat uit en verandert helemaal niets.',

			whatItSaves: 'Wat het opslaat',
			whatItSavesBody:
				'Formaat, het bijsnijden van het watermerk en het bestandsformaat volgen dezelfde instellingen als een gewone schermafbeelding — de instellingen Resolutie en Watermerk bijsnijden hierboven, en het uitvoerformaat bij de instellingen. De regel „Uitvoer” boven aan de zijbalk laat precies zien wat je krijgt.',
			whatItSavesPngBody:
				'Kies je PNG, dan wordt een echte 16-bits master weggeschreven, wat de moeite waard is als je de opname later wilt graden, plus een 8-bits voorbeeld voor de galerij. Het is bij hoge resoluties ook veel trager om weg te schrijven — een 16-bits PNG van 33 megapixel duurt ongeveer tien seconden, terwijl hetzelfde beeld als JPEG minder dan één seconde kost.',

			troubleshooting: 'Als het resultaat niet klopt',
			troubleGhosts:
				'<b>Losse spookbeelden in plaats van een vloeiende streep</b> — te weinig samples. Gebruik een tragere afspeelsnelheid, meer doorgangen of een lagere resolutie.',
			troubleShutter:
				'<b>Weet je niet welke sluitertijd je wilde</b> — zet de sluitertijdenreeks aan en beslis achteraf, bij dezelfde wachttijd.',
			troubleHighlights:
				'<b>Uitgebeten of vlakke hoge lichten</b> — probeer 3 tot 5 stops herstel van hoge lichten.',
			troubleBlack:
				'<b>Een zwarte afbeelding</b> — iRacing draait in exclusief volledig scherm. Zet Display &gt; Full Screen op OFF.',
			troubleSidecar:
				'Elke opname legt de precies gebruikte instellingen vast, het aantal samples en hoe gelijkmatig ze vielen, als een .json-bestand in de logboekmap naast app.log. De laatste 20 opnames worden bewaard — een reeks telt als één — zodat de opname waarover je een vraag hebt er nog is terwijl je die vraag stelt.',
		},

		faq: {
			blackShot: 'De opname is zwart, maar de iRacing-interface is te zien',
			blackShotBody:
				'De opname zelf is gelukt: de interface is getekend, er is dus een echt beeld bij de tool aangekomen. Wat ontbreekt is de 3D-scène, omdat iRacing die zwart heeft gerenderd. Verschillende minder gebruikelijke camera’s doen dit — die van de wielophanging het vaakst. Ga naar een gewone camera (cockpit, achtervolging of een van de tv-camera’s) en neem hetzelfde moment opnieuw op.',
			blackShotFullscreenBody:
				'Is het beeld zwart <i>inclusief</i> de interface en gedraagt elke camera zich hetzelfde, dan is de oorzaak een andere: iRacing draait in exclusief volledig scherm, dat niets buiten de sim kan vastleggen. Zet Display &gt; Full Screen op OFF.',

			cameraReset: 'iRacing verzet mijn camera vlak voor de opname',
			cameraResetBody:
				'Dat is iRacings eigen automatische shotkeuze, niet deze tool. Zolang die aanstaat, kiest iRacing zelf camera’s en springt het op het moment dat de opname begint terug naar een standaardkadrering, dus krijg je niet het beeld dat je had opgezet.',
			cameraResetFixBody:
				'Zet die uit in het camerascherm van iRacing (Ctrl+F12), onder <b>Camera &gt; Config &gt; Preferences</b>: de schakelaar <b>Shot Selection</b> met het label <b>Automatic</b>. Staat die uit, dan blijft de camera precies waar je hem hebt gezet — bij gewone screenshots én bij lange sluitertijden.',
		},
	},

	update: {
		checking: 'Zoeken naar updates…',
		newVersion: 'Een nieuwe versie',
		availableBusy:
			'{version} is beschikbaar. Er loopt een opname — je kunt hem downloaden zodra die klaar is.',
		available: '{version} is beschikbaar. Klik om te downloaden.',
		downloading: '{version} wordt gedownload…',
		downloadingPercent: '{version} wordt gedownload — {percent}%',
		downloadedBusy:
			'{version} staat klaar. Er loopt een opname, dus hij wordt geïnstalleerd zodra je de app sluit.',
		downloaded:
			'{version} staat klaar. Klik om opnieuw te starten en te installeren.',
		failed: 'Controle op updates mislukt: {error}',
		unknownError: 'onbekende fout',
		neverChecked:
			'Er is nog niet op updates gecontroleerd (je gebruikt v{version}).',
		upToDate: 'Je gebruikt de nieuwste versie (v{version}).',

		alreadyDownloading: 'De update wordt al gedownload.',
		alreadyDownloaded: 'De update is al gedownload.',
		nothingToDownload: 'Er is geen update om te downloaden.',
		captureInProgress:
			'Er loopt een opname. Probeer het opnieuw zodra die klaar is.',
		nothingToInstall: 'Er staat geen update klaar om te installeren.',
		captureInProgressInstall:
			'Er loopt een opname. De update installeert zichzelf zodra je de app sluit.',
		devBuildOnly:
			'Controleren op updates werkt alleen in een geïnstalleerde versie.',

		installTitle: 'Update installeren',
		installMessage: 'Versie {version} installeren?',
		installFallbackVersion: 'update',
		installDetail:
			'De app sluit en opent opnieuw zodra de update is geïnstalleerd. Kies je „Later”, dan installeert hij zichzelf de volgende keer dat je de app sluit.',
		installConfirm: 'Opnieuw starten en installeren',
		installLater: 'Later',
	},

	filenameFields: {
		categories: {
			Track: 'Baan',
			Driver: 'Coureur',
			Session: 'Sessie',
			Meta: 'Meta',
		},
		track: 'Baan',
		trackFull: 'Baan volledig',
		trackCity: 'Stad',
		trackCountry: 'Land',
		trackType: 'Baantype',
		driver: 'Coureur',
		driverAbbrev: 'Coureur afgekort',
		driverInitials: 'Initialen',
		team: 'Team',
		carNumber: 'Startnr.',
		car: 'Auto',
		carFull: 'Auto volledig',
		carClass: 'Autoklasse',
		iRating: 'iRating',
		sessionType: 'Sessietype',
		sessionName: 'Sessienaam',
		lap: 'Ronde',
		date: 'Datum',
		time: 'Tijd',
		datetime: 'Datum+tijd',
		counter: 'Teller',
	},

	iracingConfig: {
		projections:
			'Schakel „Render Scene Using 3 Projections” uit in iRacing (tabblad Display > Monitor) om verticale banden in schermafbeeldingen te voorkomen',
	},

	graphicsProfiles: {
		title: 'Grafische profielen',
		description:
			'Bewaar iRacing-grafische configuraties en wissel ertussen — een drieschermsopstelling om te racen, een enkelscherm voor schermafbeeldingen.',
		iracingRunning:
			'Sluit iRacing voordat je wisselt. Bij het afsluiten schrijft het zijn grafische configuratie terug, waardoor de wijziging ongedaan wordt gemaakt.',
		activeHeading: 'Huidige configuratie',
		active: {
			clean: 'Komt overeen met je profiel {name}.',
			modified: {
				one: 'Gebaseerd op {name}, met sindsdien {count} instelling gewijzigd.',
				other: 'Gebaseerd op {name}, met sindsdien {count} instellingen gewijzigd.',
			},
			modifiedUnknownCount: 'Gebaseerd op {name}, sindsdien gewijzigd.',
			unknown: 'Komt met geen enkel opgeslagen profiel overeen.',
			missing: 'Er is geen iRacing-grafische configuratie gevonden.',
		},
		badge: {
			active: 'Actief',
			modified: 'Gewijzigd',
		},
		empty: {
			title: 'Nog geen profielen opgeslagen.',
			body: 'Sla je huidige iRacing-configuratie op als profiel of importeer een bestaand .ini-bestand.',
		},
		invalidProfile: 'Geen grafische configuratie',
		warnings: {
			autoCfgIncomplete: 'Wordt door iRacing gereset',
		},
		actions: {
			apply: 'Toepassen',
			overwrite: 'Bijwerken vanuit huidige',
			rename: 'Hernoemen',
			export: 'Exporteren',
			delete: 'Verwijderen',
			save: 'Opslaan',
			cancel: 'Annuleren',
			saveCurrent: 'Huidige opslaan als…',
			import: 'Importeren…',
			openFolder: 'Map openen',
		},
		prompt: {
			namePlaceholder: 'Profielnaam',
			deleteConfirm: '{name} verwijderen?',
		},
		feedback: {
			applied:
				'{name} toegepast. Start iRacing om het van kracht te laten worden.',
			saved: 'Opgeslagen als {name}.',
			overwritten: '{name} bijgewerkt vanuit de huidige configuratie.',
			renamed: 'Hernoemd naar {name}.',
			deleted: '{name} verwijderd.',
			imported: 'Geïmporteerd als {name}.',
			exported: '{name} geëxporteerd.',
		},
		errors: {
			empty: 'Voer een naam voor het profiel in.',
			illegalCharacters:
				'Een profielnaam mag geen van deze tekens bevatten: < > : " / \\ | ? *',
			reservedName:
				'Die naam is gereserveerd door Windows. Kies een andere.',
			trailingDotOrSpace:
				'Een profielnaam mag niet eindigen op een punt of een spatie.',
			tooLong: 'Die naam is te lang.',
			duplicate: 'Er bestaat al een profiel met die naam.',
			profileNotFound: 'Dat profiel kon niet meer worden gevonden.',
			profileExists: 'Er bestaat al een profiel met die naam.',
			duplicateContent:
				'Er bestaat al een profiel met precies deze instellingen: {name}.',
			noActiveConfig:
				'Er is geen iRacing-grafische configuratie gevonden om op te slaan.',
			invalidIni:
				'Dat bestand is geen iRacing-grafische configuratie en is daarom niet gebruikt.',
			iracingRunning:
				'Sluit eerst iRacing — het zou de wijziging bij het afsluiten overschrijven.',
			ioError:
				'Het bestand kon niet worden geschreven. Er is niets gewijzigd.',
		},
	},

	wgc: {
		cursorCaveat:
			'De muisaanwijzer kan in opnames verschijnen op deze versie van Windows. Windows 10 versie 2004 introduceerde de instelling die hem verbergt.',
		addonUnavailable:
			'Het onderdeel voor high-fidelity vastlegging kon op dit systeem niet worden geladen.',
		osUnsupported:
			'Windows.Graphics.Capture is niet beschikbaar op deze versie van Windows. Het vereist Windows 10 versie 1903 of nieuwer.',
		nativeCaptureOff: 'High-fidelity vastlegging (WGC) staat uit',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing draait in exclusief volledig scherm, dus de schermafbeelding zou zwart worden. Zet in iRacing Display > Full Screen op OFF (gebruik Borderless of Windowed) en probeer het opnieuw.',
		exclusiveFullscreenUnattributed:
			'Er draait een toepassing in exclusief volledig scherm, wat een zwarte opname oplevert. Draait iRacing in volledig scherm, zet dan Display > Full Screen op OFF (gebruik Borderless of Windowed) en probeer het opnieuw.',
		unknownError: 'Onbekende fout bij schermafbeelding',
		outputTooSmall: 'De opname is te klein ({width}x{height})',
		blackFrame:
			'Het vastgelegde beeld is zwart — mogelijk is de opnamebron mislukt (GPU-versnelde inhoud laat zich op sommige Windows-configuraties niet vastleggen)',
		noSource: 'Geen bureaubladopnamebron gevonden voor venster {windowId}',
		metadataTimeout:
			'Time-out bij het wachten op de videometadata van de opname',
		noVideoFrame: 'De opnamestream leverde geen videobeeld op',
		dimensionTimeout:
			'Time-out bij het wachten op vensterafmetingen {width}x{height}; er wordt doorgegaan met {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'Er loopt al een opname.',
		needsNativeCapture:
			'Lange sluitertijd vereist high-fidelity vastlegging (WGC). Schakel deze in bij de instellingen om hem te gebruiken.',
		unavailable: 'Lange sluitertijd is niet beschikbaar op deze machine.',
		noTelemetry:
			'Lange sluitertijd vereist replaytelemetrie van iRacing. Controleer of de sim draait en in een sessie zit.',
		windowNotFound: 'iRacing-venster niet gevonden.',
		cancelled: 'Opname geannuleerd.',
		seekTimeout:
			'De replay bereikte beeld {frame} niet op tijd. Mogelijk wordt hij nog geladen.',
		noPasses: 'Een opname moet minstens één doorgang uitvoeren.',
		playbackStalled:
			'De replay begon niet af te spelen. Controleer of iRacing niet door een ander programma is gepauzeerd.',
		exposureTimeout:
			'De belichting bereikte beeld {frame} niet binnen {seconds} s.',
		endedEarly:
			'De belichting eindigde voordat het gekozen moment was bereikt.',
		noFramesPresented: 'iRacing toonde geen beelden om vast te leggen.',
		subFrameNoSamples:
			'Deze sluitertijd is korter dan één replaybeeld, en iRacing heeft er geen beeld binnen gerenderd. Probeer een tragere afspeelsnelheid of de eerstvolgende langere sluitertijd.',
		noSamples:
			'Er zijn geen beelden verzameld. Mogelijk is iRacing tijdens de belichting gestopt met renderen.',
		blankCapture:
			'Alle vastgelegde beelden waren zwart, dus er is geen afbeelding om op te slaan. Controleer of iRacing in venster- of randloze modus draait in plaats van exclusief volledig scherm, en of er bij deze resolutie nog videogeheugen vrij is — een lagere opnameresolutie is het snelst te proberen.',
		frozenCapture:
			'iRacing toonde tijdens de belichting {samples} beelden, maar ze waren allemaal identiek, dus dit is een stilstaand beeld en geen lange belichting. iRacing renderde niets nieuws terwijl de replay liep.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'De GPU gaf geen afbeelding terug.',
		bracketShortfall:
			'De reeks vroeg om {asked} standen maar er kwamen er {returned} terug — de rest kon niet worden opgelost, of deze versie van het opnameonderdeel is ouder dan de reeksfunctie.',
	},

	validation: {
		windowBeforeStart:
			'De belichting heeft {frames} replaybeelden vóór het gekozen moment nodig, maar dat ligt slechts {anchor} beelden na het begin van de replay. Kies een later moment of een kortere sluitertijd.',
		pastEnd: 'Het gekozen moment ligt voorbij het einde van de replay.',
		sessionChanged:
			'De replay is naar een andere sessie gegaan sinds deze opname werd voorbereid. Kies het moment opnieuw.',
		singleSampleMultiPass:
			'Deze sluitertijd is zo kort dat er per doorgang maar ongeveer één beeld in valt, dus {passes} doorgangen verzamelen ruwweg {passes} samples. Een tragere afspeelsnelheid of een langere sluitertijd levert veel meer op.',
		singleSample:
			'Deze sluitertijd is zo kort dat er maar één beeld in valt, dus het resultaat heeft geen bewegingsonscherpte. Een tragere afspeelsnelheid of een langere sluitertijd levert samples op.',
		bracketVsInterpolation:
			'Een sluitertijdenreeks en {factor}x beeldinterpolatie kunnen niet allebei draaien, dus deze opname wordt zonder interpolatie gemaakt. Zet de reeks uit als de tussenbeelden je meer waard zijn dan de extra standen.',
		passesVsInterpolation:
			'Zowel meerdere doorgangen als {factor}x interpolatie staan aan. Ze concurreren: interpolatie vertraagt elke doorgang zodanig dat die echte beelden misloopt, waardoor dezelfde wachttijd minder echte samples oplevert dan doorgangen alleen. Interpolatie uitzetten geeft meestal de betere opname.',
		shortOfTarget:
			'Zelfs op snelheid 1/{divisor} haalt deze belichting ongeveer {samples} samples, minder dan de gevraagde {target}. Gebruik een langere sluitertijd voor meer.',
		longCaptureEscalate:
			'Deze opname speelt de replay af op snelheid 1/{divisor} gedurende ongeveer {duration} werkelijke tijd{passSuffix}, en kan na de start niet worden versneld. {advice}',
		longCaptureWarn:
			'Deze opname duurt ongeveer {duration} werkelijke tijd bij afspeelsnelheid 1/{divisor}{passSuffix}.',
		passSuffix: ', verdeeld over {passes} doorgangen op hetzelfde moment',
		adviceFewerPasses:
			'Minder doorgangen zijn eerder klaar, met minder samples.',
		adviceFasterPlayback:
			'Een hogere afspeelsnelheid is eerder klaar, met minder samples.',
		pastLogCap:
			'Naar verwachting verzamelt deze opname ongeveer {samples} samples over {passes} doorgangen, meer dan de {cap} die het diagnostische logboek bevat. De afbeelding blijft onaangetast — alleen de gelijkmatigheids- en gatcijfers beschrijven dan het eerste deel van de opname.',
		interpolationLossy:
			'Op dit formaat heeft {factor}x interpolatie deze machine eerder al echte samples gekost. Overweeg een lagere factor, een lagere resolutie of in plaats daarvan meer doorgangen.',
	},

	duration: {
		zero: '0 seconden',
		seconds: {
			one: '{count} seconde',
			other: '{count} seconden',
		},
		minutes: {
			one: '{count} minuut',
			other: '{count} minuten',
		},
		minutesSeconds: '{minutes} min {seconds} s',
	},
};

export default nl;
