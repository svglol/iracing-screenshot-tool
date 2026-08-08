// Norwegian (Bokmål). Translated from en.ts — see that file's header before
// editing.
//
// Registered under the macrolanguage code `no` because that is what the picker
// lists, but Windows reports `nb` or `nn` — resolveLocale maps both onto this
// catalogue. See i18n.ts.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.

import type { Catalog } from './index';

const no: Catalog = {
	notice: {
		danger: 'Problemer',
		warning: 'Verdt å vite',
		info: 'Merknader',
	},

	promo: {
		greeting: 'Takk for at du bruker iRacing Screenshot Tool!',
		signature: 'Laget og vedlikeholdt av AR Media Solutions.',
	},

	changelog: {
		title: 'Endringslogg',
		untitledRelease: 'Versjon',
	},

	gallery: {
		menu: {
			openExternally: 'Åpne i et annet program',
			openFolder: 'Åpne mappe',
			copy: 'Kopier',
			delete: 'Slett',
		},
		copiedToClipboard: '{name} kopiert til utklippstavlen',
	},

	sidebar: {
		resolution: 'Oppløsning',
		width: 'Bredde',
		height: 'Høyde',
		output: 'Utdata:',
		cropWatermark: 'Beskjær vannmerke',
		keepAspectRatio: 'Behold sideforhold',
		screenshot: 'Skjermbilde',
		custom: 'Egendefinert',
		vramStatus: '{adapter}{free} ledig av {total}',
		savedSuccessfully: '{name} ble lagret',
		screenshotFailed: 'Skjermbildet mislyktes: {message}',
		errorLogPrefix: 'Logg: ',
		notices: {
			exclusiveFullscreen:
				'iRacing kjører i eksklusiv fullskjerm — skjermbildene blir svarte. Sett Display > Full Screen til OFF i iRacing (Borderless eller Windowed) for å gjøre opptak mulig.',
			vramRisk:
				'{resolution} trenger omtrent {needed} mer VRAM, men bare {free} er ledig — iRacing går sannsynligvis tom for minne og krasjer.',
			vramCaution:
				'{resolution} etterlater lite VRAM-margin ({free} ledig) og kan krasje ved krevende bane-/bilkombinasjoner.',
			switchResolution: 'Bytt til {resolution}',
			vramStatic:
				'Høye oppløsninger kan få iRacing til å krasje hvis VRAM tar slutt. Enkelte bane-/bilkombinasjoner krever mer VRAM.',
			reshade:
				'Etter at du har trykket på skjermbildeknappen i iRacing Screenshot Tool, må du også trykke på ReShades hurtigtast for skjermbilder.',
			crop: 'Beskjæring av vannmerket zoomer det ferdige bildet litt inn. Områder nær skjermkantene blir kuttet bort.',
			aspectRatio:
				'«Behold sideforhold» tilpasser høyden på skjermbildet til sideforholdet på skjermen din (for eksempel 21:9 ultrabred) i stedet for standard 16:9. Valgt oppløsning bestemmer bredden.',
		},
	},

	settings: {
		title: 'Innstillinger',
		version: 'Versjon - {version}',
		changelog: 'Endringslogg',
		openLogsFolder: 'Åpne loggmappen',
		checkForUpdates: 'Se etter oppdateringer',
		updateCheckFailed: 'Søket etter oppdateringer mislyktes: {message}',

		language: 'Språk',
		languageDescription:
			'Språket som brukes i hele appen. Hentes fra Windows første gang appen kjøres.',

		screenshotFolder: 'Mappe for skjermbilder',
		selectFolder: 'Velg mappe',
		screenshotKeybind: 'Hurtigtast for skjermbilde',
		editBind: 'Endre hurtigtast',

		customFilenameFormat: 'Egendefinert filnavnformat',
		customFilenameFormatDescription:
			'Bruk et eget mønster i stedet for standarden ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Klikk på feltene for å legge dem til i formatet. Skriv skilletegn (-, _ osv.) direkte.',
		reset: 'Tilbakestill',
		preview: 'Forhåndsvisning:',

		outputFormat: 'Utdataformat',
		formatJpeg: 'JPEG (høyeste kvalitet)',
		formatPng: 'PNG (tapsfri)',
		formatWebp: 'WebP (kvalitet 95 %)',

		disableTooltips: 'Skjul tips',
		disableTooltipsDescription: 'La meg være, jeg vet hva jeg gjør',

		cropTopLeft: 'Foretrekk beskjæring av vannmerket øverst til venstre',
		cropTopLeftDescription:
			'Beskjærer bare nedre høyre hjørne (3 %). Når den er av, beskjæres skjermbildet like mye fra alle sider (6 % totalt), noe som gir et sentrert resultat.',

		manualWindowRestore: 'Manuell gjenoppretting av vindu',
		manualWindowRestoreDescription:
			'Erstatter automatisk gjenoppretting av vinduet med egen posisjon og størrelse. Nyttig ved ultrabrede skjermer eller Nvidia Surround.',
		left: 'Venstre',
		top: 'Øverst',
		width: 'Bredde',
		height: 'Høyde',
		restoreNow: 'Gjenopprett nå',

		nativeCapture: 'Opptak i høy kvalitet (WGC)',
		nativeCaptureDescription:
			'Fanger ekte farge uten undersampling via Windows.Graphics.Capture i stedet for standardveien (som undersampler fargen). Faller automatisk tilbake hvis et opptak mislykkes.',
		nativeCaptureUnavailable:
			'Ikke tilgjengelig på dette systemet — opptak i høy kvalitet kan ikke kjøre her.',
		nativeCaptureUnverified:
			'Windows melder at det støttes, men et testopptak kom ikke tilbake. Opptak faller automatisk tilbake hvis det fortsetter å mislykkes.',

		reshade: 'ReShade-kompatibilitetsmodus',
		reshadeDescription:
			'Med ReShade må du først bruke hurtigtasten for iRacing Screenshot Tool eller trykke på knappen, og deretter bruke ReShade-hurtigtasten for skjermbilder når iRacing-vinduet har endret størrelse.',
		reshadeIni: 'ReShade-INI',
		selectFile: 'Velg fil',
	},

	longExposure: {
		title: 'Lang eksponering',
		shutter: 'Lukkertid',
		playbackSpeed: 'Avspillingshastighet',
		playbackAuto: 'Automatisk (fra måltall for prøver)',
		playbackRealTime: '1x (sanntid)',
		targetSamples: 'Måltall for prøver',
		advanced: 'Avansert',
		defaultsSummary: '{count} standardverdier',

		weighting: 'Vekting',
		weightingBox: 'Box (jevn)',
		weightingLinear: 'Lineær (skarp til slutt)',
		weightingEase: 'Ease (skarpere start, lang hale)',

		interpolation: 'Bildeinterpolering',
		interpolationOff: 'Av',
		interpolation2: '2× (ett mellombilde)',
		interpolation4: '4× (tre mellombilder)',
		interpolation8: '8× (sju mellombilder)',

		passes: 'Gjennomkjøringer',
		passes1: '1 (én gjennomkjøring)',
		passes2: '2× — dobbelt så lang ventetid',
		passes4: '4× — fire ganger så lang ventetid',
		passes8: '8× — åtte ganger så lang ventetid',

		bracket: 'Lukkertidsbracketing',
		highlightRecovery: 'Gjenoppretting av høylys (trinn)',

		cancel: 'Avbryt',
		saved: 'Lang eksponering lagret — {count} prøver',
		failed: 'Den lange eksponeringen mislyktes',

		modified: {
			weighting_linear: 'lineær',
			weighting_ease: 'ease',
			interpolation: '{factor}× interpolering',
			passes: {
				one: '{count} gjennomkjøring',
				other: '{count} gjennomkjøringer',
			},
			bracketed: 'bracketing',
			recovery: '{stops} trinns gjenoppretting',
		},

		progress: {
			working: 'Arbeider…',
			seeking: 'Søker…{pass}',
			accumulating: 'Eksponerer… {count} prøver{pass}',
			resolving: 'Fremkaller…',
			restoring: 'Gjenoppretter reprisen…',
			pass: ' (gjennomkjøring {current} av {total})',
		},

		notices: {
			needsNativeCapture:
				'Lang eksponering krever opptak i høy kvalitet (WGC), som nå er slått av. Slå det på i innstillingene for å kunne bruke lang eksponering.',
			unavailableWithReason:
				'Lang eksponering er ikke tilgjengelig på denne maskinen: {reason}',
			unavailable:
				'Lang eksponering er ikke tilgjengelig på denne maskinen.',
			interpolationCost:
				'Interpolering finner opp bilder mellom de virkelige for å jevne ut stripen. Det koster GPU-tid per bilde, så sammenlign antallet virkelige prøver i det lagrede bildet med det samme bildet uten interpolering — synker det tallet, kjøper den oppdiktede prøver med virkelige.',
			passesAndInterpolation:
				'Gjennomkjøringer og interpolering konkurrerer om det samme budsjettet per bilde. Med begge på fanger hver gjennomkjøring færre virkelige bilder — å slå av interpoleringen gir som regel et bedre bilde for den samme ventetiden.',
			passes:
				'Hver gjennomkjøring spiller av det samme øyeblikket på nytt og fanger bilder de andre gikk glipp av, slik at stripen blir jevnere heller enn lysere. Best ved korte lukkertider, der én enkelt gjennomkjøring bare samler en håndfull prøver.',
			interpolationUnsupported:
				'Bildeinterpolering krever en NVIDIA Turing-GPU eller nyere{adapter}. Alt annet ved lang eksponering fungerer som normalt.',
			interpolationAdapter: ' (dette opptaket kjører på {adapter})',
			reshade:
				'Lang eksponering tar opp nativt og bruker ikke ReShade, så ReShade-effekter vises ikke i resultatet.',
		},
	},

	help: {
		title: 'Hjelp',
		sections: 'Hjelpeseksjoner',
		tabGeneral: 'Generelt',
		tabLongExposure: 'Lang eksponering',

		general: {
			iracingSettings: 'iRacing-innstillinger',
			borderless: 'iRacing må kjøre i Windowed Borderless',
			vram: 'Minst 8 GB VRAM anbefales for skjermbilder i 8K eller høyere',
			newerContent: 'Nyere baner og biler krever mer VRAM',
			shrinkUi:
				'Krymp brukergrensesnittet så mye som mulig før du tar et skjermbilde hvis du bruker beskjæring av vannmerket; «Control+PageDown» krymper det. Fungerer det ikke, kan du måtte tilbakestille grensesnittets zoom i iRacings innstillinger.',

			screenshotFolder: 'Mappe for skjermbilder',
			screenshotFolderBody:
				'Skjermbilder lagres som standard i «C:\\Users\\user\\Pictures\\Screenshots»; dette kan endres i innstillingene.',

			screenshotHotkey: 'Hurtigtast for skjermbilde',
			screenshotHotkeyBody:
				'Som standard tar «Control + PrintScreen» et skjermbilde med gjeldende innstillinger; dette kan endres i innstillingene.',

			issues: 'Problemer',
			issuesBody: 'Har du problemer, meld dem gjerne på',
			discord: 'Discord',

			instructions: 'Veiledning',
			step1: 'iRacing <b>må</b> kjøre i modusen Windowed Borderless',
			step2: 'Start iRacing og plasser kameraet der du vil ta skjermbildet',
			step3: 'Velg ønsket oppløsning (prøv lavere oppløsninger før du går opp til 8K)',
			step4: 'Bestem om du vil beskjære iRacings vannmerke; i så fall må du først krympe iRacings grensesnitt til minste størrelse med «Control + PageDown»',
			step5: 'Trykk på skjermbildeknappen eller bruk hurtigtasten «Control + PrintScreen» for å ta bildene',
			step6: 'Avhengig av valgt oppløsning kan dette ta noen sekunder; når iRacing-vinduet er tilbake i normal størrelse, er det ferdig',
			step7: 'Skjermbildet lagres i «C:\\Users\\{User}\\Pictures\\Screenshots»',
		},

		longExposure: {
			whatItDoes: 'Hva den gjør',
			whatItDoesBody:
				'En lang eksponering blander mange bilder fra en reprise til ett bilde, på samme måte som når man lar et kameralukkeren stå åpen: det som står stille forblir skarpt, det som beveger seg trekker striper. Verktøyet styrer reprisen selv, fanger hvert bilde simulatoren viser, og legger dem sammen på GPU-en.',

			shutter: 'Lukkertid',
			shutterBody:
				'Hvor lenge eksponeringen varer <i>i reprisetid</i>, fra en brøkdel av ett reprisebilde opp til ti sekunder. Det er denne innstillingen som avgjør hvor lange stripene blir. Lengre lukkertider samler også flere bilder og trenger derfor mindre hjelp fra alt nedenfor; de raskeste trinnene dekker ett enkelt reprisebilde og samler bare en håndfull prøver.',

			playback: 'Avspillingshastighet',
			playbackBody:
				'Reprisen spilles av i sakte film mens eksponeringen fanges, slik at simulatoren viser flere bilder per sekund reprisetid og blandingen får flere prøver. 1/16 samler omtrent seksten ganger så mange bilder som sanntid — og tar seksten ganger så lang faktisk tid. Det er den viktigste avveiningen i panelet: tålmodighet mot mykhet.',
			playbackAutoBody:
				'«Automatisk (fra måltall for prøver)» velger hastigheten for deg ut fra <b>måltall for prøver</b>: verktøyet finner den raskeste avspillingen som fortsatt når antallet du ba om. Angi heller en fast hastighet hvis du vil begrense ventetiden.',

			weighting: 'Vekting',
			weightingBody:
				'Hvor mye hvert fanget bilde bidrar til resultatet. <b>Box</b> vekter dem alle likt og gir en jevn stripe. <b>Lineær</b> stiger mot slutten av vinduet, slik at motivet er skarpest der det sluttet og toner ut langs banen sin. <b>Ease</b> er den samme ideen med skarpere start og lengre hale.',

			interpolation: 'Bildeinterpolering',
			interpolationBody:
				'Finner opp ekstra bilder mellom de virkelige ved hjelp av GPU-ens optical flow-motor og fyller igjen hullene langs stripen. Krever et NVIDIA Turing-kort eller nyere og skjules helt på maskinvare som ikke klarer det.',
			interpolationCostBody:
				'Det er ikke gratis: det koster GPU-tid på hvert fanget bilde, og budsjettet er ett iRacing-bilde. Klarer den ikke å henge med, begynner den å gå glipp av <i>virkelige</i> bilder for å lage syntetiske, noe som er et netto tap — stripen blir kortere og grovere. Kostnaden skalerer med megapiksler ganger faktoren, så det som er behagelig ved 2560×1440 er ikke gjennomførbart i 8K. For å sjekke det: ta det samme øyeblikket to ganger, med og uten, og sammenlign antallet virkelige prøver; appen advarer deg også i etterkant hvis et bilde kom til kort.',

			passes: 'Gjennomkjøringer',
			passesBody:
				'Besøker det samme øyeblikket flere ganger og akkumulerer til ett bilde. Hver gjennomkjøring fanger bilder de andre tilfeldigvis gikk glipp av, så stripen blir jevnere — ikke lysere, fordi resultatet normaliseres etter hvor mye lys som faktisk landet på hver piksel.',
			passesTradeBody:
				'Gjennomkjøringer kjøper det samme som interpolering, men i en annen valuta: faktisk tid i stedet for GPU-tid. Åtte gjennomkjøringer tar omtrent åtte ganger så lang tid, men de kan aldri koste deg virkelige bilder. Det gjør dem til riktig grep ved høye oppløsninger, der interpoleringen ikke henger med, og ved korte lukkertider, der én gjennomkjøring samler svært få prøver. Å bruke begge samtidig er som regel det verste av to verdener — de konkurrerer om det samme budsjettet per bilde.',

			bracket: 'Lukkertidsbracketing',
			bracketBody:
				'Gir ett bilde per lukkertidstrinn som er likt eller raskere enn det du valgte, fra ett enkelt opptak. Et bilde ved 1/60 gir deg også 1/125, 1/250, 1/500 og 1/1000 — det samme øyeblikket med gradvis kortere striper — slik at du kan velge uttrykket i etterkant i stedet for å gjette og ta på nytt.',
			bracketCostBody:
				'Det koster nesten ingen ekstra tid. Hvert trinn slutter på det samme bildet og skiller seg bare i hvor langt tilbake det rekker, så en raskere lukkertid er ganske enkelt halen av bildene som uansett passerer — de fylles alle fra én gjennomkjøring av reprisen.',
			bracketMemoryBody:
				'Det som koster, er minne. Hvert trinn trenger sin egen akkumulator i full oppløsning, så elleve trinn trenger elleve ganger så mye grafikkminne som ett, noe som i 8K er mer enn de fleste kort har. Opptaket kontrollerer dette før det starter og avslår heller enn å krasje iRacing; blir en bracketing avslått, senk oppløsningen eller velg en raskere lukkertid — noe som også gir en kortere stige.',
			bracketNamingBody:
				'Trinnet du valgte lagres under det vanlige navnet og er det som vises i galleriet; de øvrige ligger ved siden av med sin lukkertid i filnavnet.',

			highlights: 'Gjenoppretting av høylys',
			highlightsBody:
				'Løfter høylys nær utbrenning før bildene legges sammen, og fjerner løftet til slutt. iRacing leverer et bilde som allerede er tonemappet, så en frontlykt og en hvit vegg kommer inn med samme verdi; å midle det gjør et sterkt lys som sveiper gjennom deler av eksponeringen til en grå flekk i stedet for et lyst spor. Dette legger ulineariteten tilbake der en ekte sensor har den. Måles i trinn; 0 er av og endrer ingenting i det hele tatt.',

			whatItSaves: 'Hva den lagrer',
			whatItSavesBody:
				'Størrelse, beskjæring av vannmerket og filformat følger de samme kontrollene som et vanlig skjermbilde — innstillingene Oppløsning og Beskjær vannmerke ovenfor, samt utdataformatet i innstillingene. Linjen «Utdata» øverst i sidepanelet viser nøyaktig hva du får.',
			whatItSavesPngBody:
				'Velger du PNG, skrives en ekte 16-bits master, noe som er verdt det hvis du skal fargekorrigere bildet etterpå, pluss en 8-bits forhåndsvisning til galleriet. Den er også mye tregere å skrive ved høye oppløsninger — en 16-bits PNG på 33 megapiksler tar rundt ti sekunder, mens det samme bildet som JPEG tar under ett.',

			troubleshooting: 'Hvis resultatet ser feil ut',
			troubleGhosts:
				'<b>Adskilte spøkelsesbilder i stedet for en jevn stripe</b> — for få prøver. Bruk en langsommere avspillingshastighet, flere gjennomkjøringer eller en lavere oppløsning.',
			troubleShutter:
				'<b>Usikker på hvilken lukkertid du ville ha</b> — slå på lukkertidsbracketing og bestem deg etterpå, for den samme ventetiden.',
			troubleHighlights:
				'<b>Utbrente eller flate høylys</b> — prøv 3 til 5 trinn med gjenoppretting av høylys.',
			troubleBlack:
				'<b>Et svart bilde</b> — iRacing kjører i eksklusiv fullskjerm. Sett Display &gt; Full Screen til OFF.',
			troubleSidecar:
				'Hvert bilde registrerer nøyaktig hvilke innstillinger det brukte, antallet prøver og hvor jevnt de landet, som en .json-fil i loggmappen ved siden av app.log. De 20 siste bildene beholdes — en bracketing teller som ett — så bildet du spør om, er fortsatt der mens du spør.',
		},
	},

	update: {
		checking: 'Ser etter oppdateringer…',
		newVersion: 'En ny versjon',
		availableBusy:
			'{version} er tilgjengelig. Et opptak pågår — du kan laste den ned når det er ferdig.',
		available: '{version} er tilgjengelig. Klikk for å laste den ned.',
		downloading: 'Laster ned {version}…',
		downloadingPercent: 'Laster ned {version} — {percent} %',
		downloadedBusy:
			'{version} er klar. Et opptak pågår, så den installeres når du lukker appen.',
		downloaded:
			'{version} er klar. Klikk for å starte på nytt og installere.',
		failed: 'Søket etter oppdateringer mislyktes: {error}',
		unknownError: 'ukjent feil',
		neverChecked:
			'Det er ennå ikke søkt etter oppdateringer (du kjører v{version}).',
		upToDate: 'Du kjører den nyeste versjonen (v{version}).',

		alreadyDownloading: 'Oppdateringen lastes allerede ned.',
		alreadyDownloaded: 'Oppdateringen er allerede lastet ned.',
		nothingToDownload: 'Det finnes ingen oppdatering å laste ned.',
		captureInProgress: 'Et opptak pågår. Prøv igjen når det er ferdig.',
		nothingToInstall: 'Ingen oppdatering er klar til å installeres.',
		captureInProgressInstall:
			'Et opptak pågår. Oppdateringen installerer seg selv når du lukker appen.',
		devBuildOnly:
			'Søk etter oppdateringer kjører bare i en installert versjon.',

		installTitle: 'Installer oppdatering',
		installMessage: 'Installere versjon {version}?',
		installFallbackVersion: 'oppdatering',
		installDetail:
			'Appen lukkes og åpnes igjen når oppdateringen er installert. Velger du «Senere», installeres den av seg selv neste gang du lukker appen.',
		installConfirm: 'Start på nytt og installer',
		installLater: 'Senere',
	},

	filenameFields: {
		categories: {
			Track: 'Bane',
			Driver: 'Fører',
			Session: 'Økt',
			Meta: 'Meta',
		},
		track: 'Bane',
		trackFull: 'Bane fullt navn',
		trackCity: 'By',
		trackCountry: 'Land',
		trackType: 'Banetype',
		driver: 'Fører',
		driverAbbrev: 'Fører forkortet',
		driverInitials: 'Initialer',
		team: 'Lag',
		carNumber: 'Bilnr.',
		car: 'Bil',
		carFull: 'Bil fullt navn',
		carClass: 'Bilklasse',
		iRating: 'iRating',
		sessionType: 'Økttype',
		sessionName: 'Øktnavn',
		lap: 'Runde',
		date: 'Dato',
		time: 'Klokkeslett',
		datetime: 'Dato+klokkeslett',
		counter: 'Teller',
	},

	iracingConfig: {
		projections:
			'Slå av «Render Scene Using 3 Projections» i iRacing (fanen Display > Monitor) for å unngå loddrette bånd i skjermbildene',
	},

	wgc: {
		cursorCaveat:
			'Musepekeren kan vises i opptak på denne versjonen av Windows. Windows 10 versjon 2004 la til innstillingen som skjuler den.',
		addonUnavailable:
			'Komponenten for opptak i høy kvalitet kunne ikke lastes inn på dette systemet.',
		osUnsupported:
			'Windows.Graphics.Capture er ikke tilgjengelig på denne versjonen av Windows. Den krever Windows 10 versjon 1903 eller nyere.',
		nativeCaptureOff: 'Opptak i høy kvalitet (WGC) er slått av',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing kjører i eksklusiv fullskjerm, så skjermbildet ville blitt svart. Sett Display > Full Screen til OFF i iRacing (bruk Borderless eller Windowed), og prøv igjen.',
		exclusiveFullscreenUnattributed:
			'Et program kjører i eksklusiv fullskjerm, noe som gir et svart opptak. Hvis iRacing kjører i fullskjerm, sett Display > Full Screen til OFF (bruk Borderless eller Windowed), og prøv igjen.',
		unknownError: 'Ukjent skjermbildefeil',
		outputTooSmall: 'Opptaket er for lite ({width}x{height})',
		blackFrame:
			'Det fangede bildet er svart — opptakskilden kan ha mislyktes (GPU-akselerert innhold lar seg ikke alltid fange på enkelte Windows-oppsett)',
		noSource: 'Ingen skrivebordsopptakskilde funnet for vinduet {windowId}',
		metadataTimeout: 'Tidsavbrudd under venting på opptakets videometadata',
		noVideoFrame: 'Opptaksstrømmen ga ingen videobilder',
		dimensionTimeout:
			'Tidsavbrudd under venting på vindusstørrelsen {width}x{height}; fortsetter med {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'Et opptak pågår allerede.',
		needsNativeCapture:
			'Lang eksponering krever opptak i høy kvalitet (WGC). Slå det på i innstillingene for å bruke det.',
		unavailable: 'Lang eksponering er ikke tilgjengelig på denne maskinen.',
		noTelemetry:
			'Lang eksponering krever reprisetelemetri fra iRacing. Kontroller at simulatoren kjører og er i en økt.',
		windowNotFound: 'Fant ikke iRacing-vinduet.',
		cancelled: 'Opptaket ble avbrutt.',
		seekTimeout:
			'Reprisen nådde ikke bilde {frame} i tide. Den laster kanskje fortsatt.',
		noPasses: 'Et opptak må kjøre minst én gjennomkjøring.',
		playbackStalled:
			'Reprisen startet ikke. Kontroller at iRacing ikke er satt på pause av et annet verktøy.',
		exposureTimeout:
			'Eksponeringen nådde ikke bilde {frame} innen {seconds} s.',
		endedEarly: 'Eksponeringen sluttet før det valgte øyeblikket ble nådd.',
		noFramesPresented: 'iRacing viste ingen bilder å fange.',
		subFrameNoSamples:
			'Denne lukkertiden er kortere enn ett reprisebilde, og iRacing gjengav ingen bilder innenfor den. Prøv en langsommere avspillingshastighet, eller den neste lengre lukkertiden.',
		noSamples:
			'Ingen bilder ble akkumulert. iRacing kan ha sluttet å gjengi under eksponeringen.',
		blankCapture:
			'Alle bildene som ble tatt opp var svarte, så det finnes ikke noe bilde å lagre. Kontroller at iRacing kjører i vindus- eller kantløs modus og ikke i eksklusiv fullskjerm, og at det fortsatt er ledig videominne ved denne oppløsningen — lavere opptaksoppløsning er det raskeste å prøve.',
		frozenCapture:
			'iRacing viste {samples} bilder under eksponeringen, men alle var like, så dette bildet er et stillbilde og ikke en lang eksponering. iRacing gjengav ingenting nytt mens reprisen gikk.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'GPU-en returnerte ingen bilde.',
		bracketShortfall:
			'Bracketingen ba om {asked} trinn, men {returned} kom tilbake — resten kunne ikke løses ut, eller denne versjonen av opptakskomponenten er eldre enn bracketing.',
	},

	validation: {
		windowBeforeStart:
			'Eksponeringen trenger {frames} reprisebilder før det valgte øyeblikket, men det ligger bare {anchor} bilder inn i reprisen. Velg et senere øyeblikk eller en raskere lukkertid.',
		pastEnd: 'Det valgte øyeblikket ligger etter slutten av reprisen.',
		sessionChanged:
			'Reprisen har byttet til en annen økt siden dette bildet ble satt opp. Velg øyeblikket på nytt.',
		singleSampleMultiPass:
			'Denne lukkertiden er så kort at bare omtrent ett bilde havner innenfor den per gjennomkjøring, så {passes} gjennomkjøringer samler omtrent {passes} prøver. En langsommere avspillingshastighet eller en lengre lukkertid gir langt flere.',
		singleSample:
			'Denne lukkertiden er så kort at bare ett bilde havner innenfor den, så resultatet får ingen bevegelsesuskarphet. En langsommere avspillingshastighet eller en lengre lukkertid gir prøver.',
		bracketVsInterpolation:
			'Lukkertidsbracketing og {factor}x bildeinterpolering kan ikke kjøre samtidig, så dette bildet tas uten interpolering. Slå av bracketingen hvis mellombildene betyr mer for deg enn de ekstra trinnene.',
		passesVsInterpolation:
			'Både flere gjennomkjøringer og {factor}x interpolering er på. De konkurrerer: interpoleringen bremser hver gjennomkjøring så mye at den koster virkelige bilder, slik at den samme ventetiden kjøper færre virkelige prøver enn gjennomkjøringer alene ville gjort. Å slå av interpoleringen gir som regel det beste bildet.',
		shortOfTarget:
			'Selv ved hastigheten 1/{divisor} når denne eksponeringen omtrent {samples} prøver, færre enn de {target} som ble bedt om. Bruk en lengre lukkertid for å få flere.',
		longCaptureEscalate:
			'Dette opptaket spiller av reprisen med hastigheten 1/{divisor} i omtrent {duration} faktisk tid{passSuffix}, og kan ikke fremskyndes når det først er startet. {advice}',
		longCaptureWarn:
			'Dette opptaket tar omtrent {duration} faktisk tid ved avspillingshastigheten 1/{divisor}{passSuffix}.',
		passSuffix:
			', fordelt over {passes} gjennomkjøringer av det samme øyeblikket',
		adviceFewerPasses:
			'Færre gjennomkjøringer blir ferdige tidligere, med færre prøver.',
		adviceFasterPlayback:
			'En raskere avspillingshastighet blir ferdig tidligere, med færre prøver.',
		pastLogCap:
			'Dette opptaket forventes å samle omtrent {samples} prøver over {passes} gjennomkjøringer, mer enn de {cap} diagnostikkloggen rommer. Bildet påvirkes ikke — bare tallene for jevnhet og hull vil beskrive den første delen av opptaket.',
		interpolationLossy:
			'I denne størrelsen har {factor}x interpolering tidligere kostet denne maskinen virkelige prøver. Vurder en lavere faktor, en lavere oppløsning eller flere gjennomkjøringer i stedet.',
	},

	duration: {
		zero: '0 sekunder',
		seconds: {
			one: '{count} sekund',
			other: '{count} sekunder',
		},
		minutes: {
			one: '{count} minutt',
			other: '{count} minutter',
		},
		minutesSeconds: '{minutes} min {seconds} s',
	},
};

export default no;
