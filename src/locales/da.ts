// Danish. Translated from en.ts — see that file's header before editing.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.

import type { Catalog } from './index';

const da: Catalog = {
	notice: {
		danger: 'Problemer',
		warning: 'Værd at vide',
		info: 'Bemærkninger',
	},

	promo: {
		greeting: 'Tak fordi du bruger iRacing Screenshot Tool!',
		signature: 'Bygget og vedligeholdt af AR Media Solutions.',
	},

	changelog: {
		title: 'Ændringslog',
		untitledRelease: 'Version',
	},

	gallery: {
		menu: {
			openExternally: 'Åbn i et andet program',
			openFolder: 'Åbn mappe',
			copy: 'Kopiér',
			delete: 'Slet',
		},
		copiedToClipboard: '{name} kopieret til udklipsholderen',
	},

	sidebar: {
		resolution: 'Opløsning',
		width: 'Bredde',
		height: 'Højde',
		output: 'Output:',
		cropWatermark: 'Beskær vandmærke',
		keepAspectRatio: 'Bevar billedformat',
		screenshot: 'Skærmbillede',
		custom: 'Brugerdefineret',
		vramStatus: '{adapter}{free} ledig af {total}',
		savedSuccessfully: '{name} blev gemt',
		screenshotFailed: 'Skærmbilledet mislykkedes: {message}',
		errorLogPrefix: 'Log: ',
		notices: {
			exclusiveFullscreen:
				'iRacing kører i eksklusiv fuldskærm — skærmbillederne bliver sorte. Sæt Display > Full Screen til OFF i iRacing (Borderless eller Windowed) for at gøre optagelse mulig.',
			vramRisk:
				'{resolution} kræver cirka {needed} mere VRAM, men kun {free} er ledig — iRacing løber sandsynligvis tør for hukommelse og går ned.',
			vramCaution:
				'{resolution} efterlader kun lidt VRAM-margen ({free} ledig) og kan gå ned ved krævende bane-/bilkombinationer.',
			switchResolution: 'Skift til {resolution}',
			vramStatic:
				'Høje opløsninger kan få iRacing til at gå ned, hvis VRAM slipper op. Visse bane-/bilkombinationer kræver mere VRAM.',
			reshade:
				'Når du har trykket på skærmbilledeknappen i iRacing Screenshot Tool, skal du også trykke på ReShades tastaturgenvej til skærmbilleder.',
			crop: 'Beskæring af vandmærket zoomer det færdige billede en anelse ind. Områder tæt på skærmkanterne bliver skåret væk.',
			aspectRatio:
				'„Bevar billedformat“ tilpasser skærmbilledets højde til din skærms billedformat (for eksempel 21:9 ultrabred) i stedet for standardformatet 16:9. Den valgte opløsning bestemmer bredden.',
		},
	},

	settings: {
		title: 'Indstillinger',
		version: 'Version - {version}',
		changelog: 'Ændringslog',
		openLogsFolder: 'Åbn logmappen',
		checkForUpdates: 'Søg efter opdateringer',
		updateCheckFailed: 'Søgningen efter opdateringer mislykkedes: {message}',

		language: 'Sprog',
		languageDescription:
			'Det sprog, der bruges i hele appen. Hentes fra Windows, første gang appen køres.',

		screenshotFolder: 'Mappe til skærmbilleder',
		selectFolder: 'Vælg mappe',
		screenshotKeybind: 'Tastaturgenvej til skærmbillede',
		editBind: 'Redigér genvej',

		customFilenameFormat: 'Brugerdefineret filnavnsformat',
		customFilenameFormatDescription:
			'Brug et selvvalgt mønster i stedet for standarden ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Klik på felterne for at føje dem til formatet. Skriv skilletegn (-, _ osv.) direkte.',
		reset: 'Nulstil',
		preview: 'Forhåndsvisning:',

		outputFormat: 'Outputformat',
		formatJpeg: 'JPEG (højeste kvalitet)',
		formatPng: 'PNG (tabsfri)',
		formatWebp: 'WebP (kvalitet 95 %)',

		disableTooltips: 'Skjul tips',
		disableTooltipsDescription: 'Lad mig være, jeg ved, hvad jeg gør',

		cropTopLeft: 'Foretræk beskæring af vandmærket øverst til venstre',
		cropTopLeftDescription:
			'Beskærer kun det nederste højre hjørne (3 %). Når den er slået fra, beskæres skærmbilledet lige meget fra alle sider (6 % i alt), hvilket giver et centreret resultat.',

		manualWindowRestore: 'Manuel gendannelse af vindue',
		manualWindowRestoreDescription:
			'Erstatter den automatiske gendannelse af vinduet med en selvvalgt position og størrelse. Nyttigt ved ultrabrede skærme eller Nvidia Surround.',
		left: 'Venstre',
		top: 'Øverst',
		width: 'Bredde',
		height: 'Højde',
		restoreNow: 'Gendan nu',

		nativeCapture: 'Optagelse i høj kvalitet (WGC)',
		nativeCaptureDescription:
			'Optager ægte farve uden undersampling via Windows.Graphics.Capture i stedet for standardvejen (som undersampler farven). Falder automatisk tilbage, hvis en optagelse mislykkes.',
		nativeCaptureUnavailable:
			'Ikke tilgængelig på dette system — optagelse i høj kvalitet kan ikke køre her.',
		nativeCaptureUnverified:
			'Windows melder, at det understøttes, men en testoptagelse kom ikke tilbage. Optagelser falder automatisk tilbage, hvis det bliver ved med at mislykkes.',

		reshade: 'ReShade-kompatibilitetstilstand',
		reshadeDescription:
			'Med ReShade skal du først bruge genvejen til iRacing Screenshot Tool eller trykke på knappen og derefter, når iRacing-vinduet har ændret størrelse, bruge din ReShade-genvej til skærmbilleder.',
		reshadeIni: 'ReShade-INI',
		selectFile: 'Vælg fil',
	},

	longExposure: {
		title: 'Lang eksponering',
		shutter: 'Lukkertid',
		playbackSpeed: 'Afspilningshastighed',
		playbackAuto: 'Automatisk (ud fra måltal for prøver)',
		playbackRealTime: '1x (realtid)',
		targetSamples: 'Måltal for prøver',
		advanced: 'Avanceret',
		defaultsSummary: '{count} standardværdier',

		weighting: 'Vægtning',
		weightingBox: 'Box (jævn)',
		weightingLinear: 'Lineær (skarp til sidst)',
		weightingEase: 'Ease (skarpere start, lang hale)',

		interpolation: 'Billedinterpolation',
		interpolationOff: 'Fra',
		interpolation2: '2× (ét mellembillede)',
		interpolation4: '4× (tre mellembilleder)',
		interpolation8: '8× (syv mellembilleder)',

		passes: 'Gennemløb',
		passes1: '1 (ét gennemløb)',
		passes2: '2× — dobbelt så lang ventetid',
		passes4: '4× — fire gange så lang ventetid',
		passes8: '8× — otte gange så lang ventetid',

		bracket: 'Lukkertidsbracketing',
		highlightRecovery: 'Genskabelse af højlys (trin)',

		cancel: 'Annullér',
		saved: 'Lang eksponering gemt — {count} prøver',
		failed: 'Den lange eksponering mislykkedes',

		modified: {
			weighting_linear: 'lineær',
			weighting_ease: 'ease',
			interpolation: '{factor}× interpolation',
			passes: {
				one: '{count} gennemløb',
				other: '{count} gennemløb',
			},
			bracketed: 'bracketing',
			recovery: '{stops} trins genskabelse',
		},

		progress: {
			working: 'Arbejder…',
			seeking: 'Søger…{pass}',
			accumulating: 'Eksponerer… {count} prøver{pass}',
			resolving: 'Fremkalder…',
			restoring: 'Gendanner replayet…',
			pass: ' (gennemløb {current} af {total})',
		},

		notices: {
			needsNativeCapture:
				'Lang eksponering kræver optagelse i høj kvalitet (WGC), som lige nu er slået fra. Slå den til i indstillingerne for at kunne bruge lang eksponering.',
			unavailableWithReason:
				'Lang eksponering er ikke tilgængelig på denne maskine: {reason}',
			unavailable: 'Lang eksponering er ikke tilgængelig på denne maskine.',
			interpolationCost:
				'Interpolation opfinder billeder mellem de virkelige for at gøre stribeneglattere. Det koster GPU-tid pr. billede, så sammenlign antallet af virkelige prøver i det gemte billede med det samme billede uden interpolation — falder det tal, køber den opfundne prøver med virkelige.',
			passesAndInterpolation:
				'Gennemløb og interpolation konkurrerer om det samme budget pr. billede. Med begge slået til fanger hvert gennemløb færre virkelige billeder — at slå interpolationen fra giver som regel et bedre resultat for den samme ventetid.',
			passes:
				'Hvert gennemløb afspiller det samme øjeblik igen og fanger billeder, som de andre missede, så striben bliver jævnere frem for lysere. Bedst ved korte lukkertider, hvor et enkelt gennemløb kun samler en håndfuld prøver.',
			interpolationUnsupported:
				'Billedinterpolation kræver en NVIDIA Turing-GPU eller nyere{adapter}. Alt andet ved lang eksponering fungerer som normalt.',
			interpolationAdapter: ' (denne optagelse kører på {adapter})',
			reshade:
				'Lang eksponering optager nativt og bruger ikke ReShade, så ReShade-effekter vil ikke fremgå af resultatet.',
		},
	},

	help: {
		title: 'Hjælp',
		sections: 'Hjælpeafsnit',
		tabGeneral: 'Generelt',
		tabLongExposure: 'Lang eksponering',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'iRacing-indstillinger',
			borderless: 'iRacing skal køre i Windowed Borderless',
			vram: 'Mindst 8 GB VRAM anbefales til skærmbilleder i 8K eller derover',
			newerContent: 'Nyere baner og biler kræver mere VRAM',
			shrinkUi:
				'Formindsk brugerfladen så meget som muligt, før du tager et skærmbillede, hvis du bruger beskæring af vandmærket; „Control+PageDown“ formindsker den. Virker det ikke, kan du være nødt til at nulstille brugerfladens zoom i iRacings indstillinger.',

			screenshotFolder: 'Mappe til skærmbilleder',
			screenshotFolderBody:
				'Skærmbilleder gemmes som standard i „C:\\Users\\user\\Pictures\\Screenshots“; dette kan ændres i indstillingerne.',

			screenshotHotkey: 'Tastaturgenvej til skærmbillede',
			screenshotHotkeyBody:
				'Som standard tager „Control + PrintScreen“ et skærmbillede med de aktuelle indstillinger; dette kan ændres i indstillingerne.',

			issues: 'Problemer',
			issuesBody: 'Har du problemer, så rapportér dem gerne på',
			discord: 'Discord',

			instructions: 'Vejledning',
			step1: 'iRacing <b>skal</b> køre i tilstanden Windowed Borderless',
			step2: 'Start iRacing, og placér kameraet, hvor du vil tage skærmbilledet',
			step3: 'Vælg den ønskede opløsning (prøv lavere opløsninger, før du går op til 8K)',
			step4: 'Beslut, om du vil beskære iRacings vandmærke; i så fald skal du først formindske iRacings brugerflade til mindste størrelse med „Control + PageDown“',
			step5: 'Tryk på skærmbilledeknappen, eller brug genvejen „Control + PrintScreen“ for at tage billederne',
			step6: 'Afhængigt af den valgte opløsning kan det tage nogle sekunder; når iRacing-vinduet igen har normal størrelse, er det færdigt',
			step7: 'Dit skærmbillede gemmes i „C:\\Users\\{User}\\Pictures\\Screenshots“',
		},

		longExposure: {
			whatItDoes: 'Hvad den gør',
			whatItDoesBody:
				'En lang eksponering blander mange billeder fra et replay til ét billede, ligesom når man lader en kameralukker stå åben: det, der står stille, forbliver skarpt, og det, der bevæger sig, trækker striber. Værktøjet styrer selv replayet, optager hvert billede, som simulatoren viser, og lægger dem sammen på GPU’en.',

			shutter: 'Lukkertid',
			shutterBody:
				'Hvor længe eksponeringen varer <i>i replaytid</i>, fra en brøkdel af ét replaybillede op til ti sekunder. Det er denne indstilling, der afgør, hvor lange striberne bliver. Længere lukkertider samler også flere billeder og har derfor mindre brug for alt nedenfor; de hurtigste trin dækker ét enkelt replaybillede og samler kun en håndfuld prøver.',

			playback: 'Afspilningshastighed',
			playbackBody:
				'Replayet afspilles i slowmotion, mens eksponeringen optages, så simulatoren viser flere billeder pr. sekund replaytid, og blandingen får flere prøver. 1/16 samler cirka seksten gange så mange billeder som realtid — og tager seksten gange så lang faktisk tid. Det er den vigtigste afvejning i panelet: tålmodighed mod blødhed.',
			playbackAutoBody:
				'„Automatisk (ud fra måltal for prøver)“ vælger hastigheden for dig ud fra <b>måltal for prøver</b>: værktøjet finder den hurtigste afspilning, der stadig når det ønskede antal. Angiv i stedet en fast hastighed, hvis du hellere vil begrænse ventetiden.',

			weighting: 'Vægtning',
			weightingBody:
				'Hvor meget hvert optaget billede bidrager til resultatet. <b>Box</b> vægter dem alle lige og giver en jævn stribe. <b>Lineær</b> stiger mod slutningen af vinduet, så motivet er skarpest der, hvor det sluttede, og toner ud langs sin bane. <b>Ease</b> er den samme idé med en skarpere start og en længere hale.',

			interpolation: 'Billedinterpolation',
			interpolationBody:
				'Opfinder ekstra billeder mellem de virkelige ved hjælp af GPU’ens optical flow-motor og udfylder hullerne langs striben. Kræver et NVIDIA Turing-kort eller nyere og skjules helt på hardware, der ikke kan klare det.',
			interpolationCostBody:
				'Det er ikke gratis: det koster GPU-tid på hvert optaget billede, og budgettet er ét iRacing-billede. Kan den ikke følge med, begynder den at misse <i>virkelige</i> billeder for at fremstille syntetiske, hvilket er et nettotab — striben bliver kortere og grovere. Omkostningen skalerer med megapixel gange faktoren, så det, der er behageligt ved 2560×1440, er ikke realistisk i 8K. For at tjekke det: tag det samme øjeblik to gange, med og uden, og sammenlign antallet af virkelige prøver; appen advarer dig også bagefter, hvis et billede kom til kort.',

			passes: 'Gennemløb',
			passesBody:
				'Besøger det samme øjeblik flere gange og akkumulerer til ét billede. Hvert gennemløb fanger billeder, som de andre tilfældigvis missede, så striben bliver jævnere — ikke lysere, for resultatet normaliseres efter, hvor meget lys der faktisk landede på hver pixel.',
			passesTradeBody:
				'Gennemløb køber det samme som interpolation, men i en anden valuta: faktisk tid i stedet for GPU-tid. Otte gennemløb tager cirka otte gange så lang tid, men de kan aldrig koste dig virkelige billeder. Det gør dem til det rigtige greb ved høje opløsninger, hvor interpolationen ikke kan følge med, og ved korte lukkertider, hvor et enkelt gennemløb samler meget få prøver. At bruge begge dele på én gang er som regel det værste af to verdener — de konkurrerer om det samme budget pr. billede.',

			bracket: 'Lukkertidsbracketing',
			bracketBody:
				'Leverer ét billede pr. lukkertidstrin, der er lig med eller hurtigere end det, du valgte, ud fra én enkelt optagelse. Et billede ved 1/60 giver dig også 1/125, 1/250, 1/500 og 1/1000 — det samme øjeblik med gradvis kortere striber — så du kan vælge udtrykket bagefter i stedet for at gætte og tage om.',
			bracketCostBody:
				'Det koster stort set ingen ekstra tid. Hvert trin slutter på det samme billede og adskiller sig kun ved, hvor langt tilbage det rækker, så en hurtigere lukkertid er ganske enkelt halen af de billeder, der alligevel passerer — de fyldes alle fra ét gennemløb af replayet.',
			bracketMemoryBody:
				'Det, det koster, er hukommelse. Hvert trin har brug for sin egen akkumulator i fuld opløsning, så elleve trin kræver elleve gange så meget grafikhukommelse som ét, hvilket i 8K er mere, end de fleste kort har. Optagelsen kontrollerer dette, før den går i gang, og afviser hellere end at få iRacing til at gå ned; bliver en bracketing afvist, så sænk opløsningen eller vælg en hurtigere lukkertid — hvilket også giver en kortere stige.',
			bracketNamingBody:
				'Det trin, du valgte, gemmes under det sædvanlige navn og er det, der vises i galleriet; de øvrige ligger ved siden af med deres lukkertid i filnavnet.',

			highlights: 'Genskabelse af højlys',
			highlightsBody:
				'Løfter højlys tæt på udbrænding, før billederne lægges sammen, og fjerner løftet igen til sidst. iRacing afleverer et billede, der allerede er tonemappet, så en forlygte og en hvid væg ankommer med samme værdi; at midle det gør et kraftigt lys, der bevæger sig gennem en del af eksponeringen, til en grå udtværing i stedet for et lyst spor. Dette lægger ulineariteten tilbage der, hvor en rigtig sensor har den. Måles i trin; 0 er slået fra og ændrer overhovedet ingenting.',

			whatItSaves: 'Hvad den gemmer',
			whatItSavesBody:
				'Størrelse, beskæring af vandmærket og filformat følger de samme indstillinger som et almindeligt skærmbillede — indstillingerne Opløsning og Beskær vandmærke ovenfor samt outputformatet i indstillingerne. Linjen „Output“ øverst i sidepanelet viser præcis, hvad du får.',
			whatItSavesPngBody:
				'Vælger du PNG, skrives en ægte 16-bit master, hvilket er det værd, hvis du vil farvekorrigere billedet bagefter, plus en 8-bit forhåndsvisning til galleriet. Den er også meget langsommere at skrive ved høje opløsninger — en 16-bit PNG på 33 megapixel tager omkring ti sekunder, mens det samme billede som JPEG tager under ét.',

			troubleshooting: 'Hvis resultatet ser forkert ud',
			troubleGhosts:
				'<b>Adskilte spøgelsesbilleder i stedet for en jævn stribe</b> — for få prøver. Brug en langsommere afspilningshastighed, flere gennemløb eller en lavere opløsning.',
			troubleShutter:
				'<b>Usikker på, hvilken lukkertid du ville have</b> — slå lukkertidsbracketing til, og bestem dig bagefter, for den samme ventetid.',
			troubleHighlights:
				'<b>Udbrændte eller flade højlys</b> — prøv 3 til 5 trins genskabelse af højlys.',
			troubleBlack:
				'<b>Et sort billede</b> — iRacing kører i eksklusiv fuldskærm. Sæt Display &gt; Full Screen til OFF.',
			troubleSidecar:
				'Hvert billede registrerer de præcise indstillinger, det brugte, antallet af prøver og hvor jævnt de landede, som en .json-fil i logmappen ved siden af app.log. De seneste 20 billeder gemmes — en bracketing tæller som ét — så det billede, du spørger om, stadig er der, mens du spørger.',
		},

		faq: {
			blackShot: 'Billedet er sort, men iRacings brugerflade kan ses på det',
			blackShotBody:
				'Selve optagelsen virkede: brugerfladen blev tegnet, så et rigtigt billede nåede frem til værktøjet. Det, der mangler, er 3D-scenen, fordi iRacing gengav den sort. Flere af de mindre almindelige kameraer gør det — ophængskameraet er det, folk oftest rammer. Skift til et almindeligt kamera (cockpit, forfølgelse eller et af tv-kameraerne), og tag det samme øjeblik igen.',
			blackShotFullscreenBody:
				'Er billedet sort <i>inklusive</i> brugerfladen, og opfører alle kameraer sig ens, er årsagen en anden: iRacing kører i eksklusiv fuldskærm, som intet uden for simulatoren kan optage. Sæt Display &gt; Full Screen til OFF.',

			cameraReset: 'iRacing flytter mit kamera, lige før billedet tages',
			cameraResetBody:
				'Det er iRacings egen automatiske billedvalg, ikke dette værktøj. Så længe det er slået til, bliver iRacing ved med selv at vælge kameraer og skifter tilbage til en standardindstilling i det øjeblik, optagelsen starter, så du ikke får det billede, du havde sat op.',
			cameraResetFixBody:
				'Slå det fra i iRacings kameraværktøj (Ctrl+F12) under <b>Camera &gt; Config &gt; Preferences</b>: kontakten <b>Shot Selection</b> med teksten <b>Automatic</b>. Når den er slået fra, bliver kameraet præcis, hvor du satte det — både til almindelige skærmbilleder og til lange eksponeringer.',
		},
	},

	update: {
		checking: 'Søger efter opdateringer…',
		newVersion: 'En ny version',
		availableBusy:
			'{version} er tilgængelig. Der er en optagelse i gang — du kan hente den, når den er færdig.',
		available: '{version} er tilgængelig. Klik for at hente den.',
		downloading: 'Henter {version}…',
		downloadingPercent: 'Henter {version} — {percent} %',
		downloadedBusy:
			'{version} er klar. Der er en optagelse i gang, så den installeres, når du lukker appen.',
		downloaded: '{version} er klar. Klik for at genstarte og installere.',
		failed: 'Søgningen efter opdateringer mislykkedes: {error}',
		unknownError: 'ukendt fejl',
		neverChecked: 'Der er endnu ikke søgt efter opdateringer.',
		upToDate: 'Du kører den nyeste version.',

		alreadyDownloading: 'Opdateringen hentes allerede.',
		alreadyDownloaded: 'Opdateringen er allerede hentet.',
		nothingToDownload: 'Der er ingen opdatering at hente.',
		captureInProgress:
			'Der er en optagelse i gang. Prøv igen, når den er færdig.',
		nothingToInstall: 'Der er ingen opdatering klar til installation.',
		captureInProgressInstall:
			'Der er en optagelse i gang. Opdateringen installerer sig selv, når du lukker appen.',
		devBuildOnly:
			'Søgning efter opdateringer kører kun i en installeret version.',

		installTitle: 'Installér opdatering',
		installMessage: 'Installér version {version}?',
		installFallbackVersion: 'opdatering',
		installDetail:
			'Appen lukker og åbner igen, når opdateringen er installeret. Vælger du „Senere“, installeres den af sig selv, næste gang du lukker appen.',
		installConfirm: 'Genstart og installér',
		installLater: 'Senere',
	},

	filenameFields: {
		categories: {
			Track: 'Bane',
			Driver: 'Kører',
			Session: 'Session',
			Meta: 'Meta',
		},
		track: 'Bane',
		trackFull: 'Bane fuldt navn',
		trackCity: 'By',
		trackCountry: 'Land',
		trackType: 'Banetype',
		driver: 'Kører',
		driverAbbrev: 'Kører forkortet',
		driverInitials: 'Initialer',
		team: 'Hold',
		carNumber: 'Bilnr.',
		car: 'Bil',
		carFull: 'Bil fuldt navn',
		carClass: 'Bilklasse',
		iRating: 'iRating',
		sessionType: 'Sessionstype',
		sessionName: 'Sessionsnavn',
		lap: 'Omgang',
		date: 'Dato',
		time: 'Klokkeslæt',
		datetime: 'Dato+klokkeslæt',
		counter: 'Tæller',
	},

	iracingConfig: {
		projections:
			'Slå „Render Scene Using 3 Projections“ fra i iRacing (fanen Display > Monitor) for at undgå lodrette bånd i skærmbillederne',
	},

	graphicsProfiles: {
		title: 'Grafikprofiler',
		description:
			'Gem iRacing-grafikkonfigurationer og skift mellem dem — én til ræs, én til skærmbilleder, én til videooptagelse. iRacing indlæser konfigurationen ved start og skriver den tilbage ved lukning, så et skift foretaget, mens simulatoren kører, bliver fortrudt: <b>skift kun konfiguration, mens simulatoren er lukket</b>.',
		iracingRunning:
			'Luk iRacing, før du skifter. Det skriver sin grafikkonfiguration tilbage, når det afsluttes, hvilket ville fortryde ændringen.',
		activeHeading: 'Nuværende konfiguration',
		active: {
			clean: 'Svarer til din {name}-profil.',
			modified: {
				one: 'Bygger på {name}, med {count} indstilling ændret siden.',
				other: 'Bygger på {name}, med {count} indstillinger ændret siden.',
			},
			modifiedUnknownCount: 'Bygger på {name}, med ændringer siden.',
			unknown: 'Svarer ikke til nogen gemt profil.',
			missing: 'Der blev ikke fundet nogen iRacing-grafikkonfiguration.',
		},
		badge: {
			active: 'Aktiv',
			modified: 'Ændret',
		},
		picker: {
			unknown: 'No matching profile',
			missing: 'No configuration',
		},
		empty: {
			title: 'Ingen profiler gemt endnu.',
			body: 'Gem din nuværende iRacing-konfiguration som en profil, eller importér en eksisterende .ini-fil.',
		},
		invalidProfile: 'Ikke en grafikkonfiguration',
		warnings: {
			autoCfgIncomplete: 'Nulstilles af iRacing',
		},
		actions: {
			load: 'Indlæs',
			overwrite: 'Opdatér fra nuværende',
			rename: 'Omdøb',
			export: 'Eksportér',
			delete: 'Slet',
			save: 'Gem',
			cancel: 'Annullér',
			saveCurrent: 'Gem nuværende som…',
			import: 'Importér…',
			openFolder: 'Åbn mappe',
		},
		prompt: {
			namePlaceholder: 'Profilnavn',
			deleteConfirm: 'Slet {name}?',
		},
		feedback: {
			loaded: '{name} indlæst. Start iRacing for at det træder i kraft.',
			saved: 'Gemt som {name}.',
			overwritten: '{name} opdateret ud fra den nuværende konfiguration.',
			renamed: 'Omdøbt til {name}.',
			deleted: '{name} slettet.',
			imported: 'Importeret som {name}.',
			exported: '{name} eksporteret.',
		},
		errors: {
			empty: 'Indtast et navn til profilen.',
			illegalCharacters:
				'Et profilnavn må ikke indeholde nogen af disse: < > : " / \\ | ? *',
			reservedName: 'Det navn er reserveret af Windows. Vælg et andet.',
			trailingDotOrSpace:
				'Et profilnavn må ikke slutte med punktum eller mellemrum.',
			tooLong: 'Det navn er for langt.',
			duplicate: 'Der findes allerede en profil med det navn.',
			profileNotFound: 'Den profil kunne ikke længere findes.',
			profileExists: 'Der findes allerede en profil med det navn.',
			duplicateContent:
				'Der findes allerede en profil med præcis disse indstillinger: {name}.',
			noActiveConfig:
				'Der blev ikke fundet nogen iRacing-grafikkonfiguration at gemme.',
			invalidIni:
				'Den fil er ikke en iRacing-grafikkonfiguration, så den blev ikke brugt.',
			iracingRunning:
				'Luk iRacing først — det ville overskrive ændringen, når det afsluttes.',
			ioError: 'Filen kunne ikke skrives. Intet blev ændret.',
		},
	},

	wgc: {
		cursorCaveat:
			'Musemarkøren kan optræde i optagelser på denne version af Windows. Windows 10 version 2004 tilføjede indstillingen, der skjuler den.',
		addonUnavailable:
			'Komponenten til optagelse i høj kvalitet kunne ikke indlæses på dette system.',
		osUnsupported:
			'Windows.Graphics.Capture er ikke tilgængelig på denne version af Windows. Den kræver Windows 10 version 1903 eller nyere.',
		nativeCaptureOff: 'Optagelse i høj kvalitet (WGC) er slået fra',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing kører i eksklusiv fuldskærm, så skærmbilledet ville blive sort. Sæt Display > Full Screen til OFF i iRacing (brug Borderless eller Windowed), og prøv igen.',
		exclusiveFullscreenUnattributed:
			'Et program kører i eksklusiv fuldskærm, hvilket giver en sort optagelse. Kører iRacing i fuldskærm, så sæt Display > Full Screen til OFF (brug Borderless eller Windowed), og prøv igen.',
		unknownError: 'Ukendt skærmbilledefejl',
		outputTooSmall: 'Optagelsen er for lille ({width}x{height})',
		blackFrame:
			'Det optagne billede er sort — optagelseskilden kan være mislykket (GPU-accelereret indhold kan ikke altid optages på visse Windows-opsætninger)',
		noSource:
			'Ingen skrivebordsoptagelseskilde fundet til vinduet {windowId}',
		metadataTimeout:
			'Tidsfristen udløb, mens der blev ventet på optagelsens videometadata',
		noVideoFrame: 'Optagelsesstrømmen leverede ingen videobilleder',
		dimensionTimeout:
			'Tidsfristen udløb, mens der blev ventet på vinduesstørrelsen {width}x{height}; fortsætter med {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'Der er allerede en optagelse i gang.',
		needsNativeCapture:
			'Lang eksponering kræver optagelse i høj kvalitet (WGC). Slå den til i indstillingerne for at bruge den.',
		unavailable: 'Lang eksponering er ikke tilgængelig på denne maskine.',
		noTelemetry:
			'Lang eksponering kræver replaytelemetri fra iRacing. Kontrollér, at simulatoren kører og er i en session.',
		windowNotFound: 'iRacing-vinduet blev ikke fundet.',
		cancelled: 'Optagelsen blev annulleret.',
		seekTimeout:
			'Replayet nåede ikke billede {frame} i tide. Det er måske stadig ved at indlæse.',
		noPasses: 'En optagelse skal køre mindst ét gennemløb.',
		playbackStalled:
			'Replayet gik ikke i gang. Kontrollér, at iRacing ikke er sat på pause af et andet værktøj.',
		exposureTimeout:
			'Eksponeringen nåede ikke billede {frame} inden for {seconds} s.',
		endedEarly: 'Eksponeringen sluttede, før det valgte øjeblik blev nået.',
		noFramesPresented: 'iRacing viste ingen billeder at optage.',
		subFrameNoSamples:
			'Denne lukkertid er kortere end ét replaybillede, og iRacing renderede ikke noget billede inden for den. Prøv en langsommere afspilningshastighed eller den næste længere lukkertid.',
		noSamples:
			'Der blev ikke akkumuleret nogen billeder. iRacing er måske holdt op med at rendere under eksponeringen.',
		blankCapture:
			'Alle optagne billeder var sorte, så der er intet billede at gemme. Kontrollér, at iRacing kører i vindue eller kantløs tilstand og ikke i eksklusiv fuldskærm, og at der stadig er ledig videohukommelse ved denne opløsning — en lavere optagelsesopløsning er det hurtigste at prøve.',
		frozenCapture:
			'iRacing viste {samples} billeder under eksponeringen, men de var alle ens, så dette er et stillbillede og ikke en lang eksponering. iRacing renderede intet nyt, mens replayet kørte.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'GPU’en returnerede intet billede.',
		bracketShortfall:
			'Bracketingen bad om {asked} trin, men {returned} kom tilbage — resten kunne ikke opløses, eller denne version af optagelseskomponenten er ældre end bracketing.',
	},

	validation: {
		windowBeforeStart:
			'Eksponeringen kræver {frames} replaybilleder før det valgte øjeblik, men det ligger kun {anchor} billeder inde i replayet. Vælg et senere øjeblik eller en hurtigere lukkertid.',
		pastEnd: 'Det valgte øjeblik ligger efter replayets slutning.',
		sessionChanged:
			'Replayet er skiftet til en anden session, siden dette billede blev sat op. Vælg øjeblikket igen.',
		singleSampleMultiPass:
			'Denne lukkertid er så kort, at der kun lander cirka ét billede inden for den pr. gennemløb, så {passes} gennemløb samler omtrent {passes} prøver. En langsommere afspilningshastighed eller en længere lukkertid giver langt flere.',
		singleSample:
			'Denne lukkertid er så kort, at der kun lander ét billede inden for den, så resultatet får ingen bevægelsesuskarphed. En langsommere afspilningshastighed eller en længere lukkertid giver prøver.',
		bracketVsInterpolation:
			'Lukkertidsbracketing og {factor}x billedinterpolation kan ikke køre samtidig, så dette billede tages uden interpolation. Slå bracketingen fra, hvis mellembillederne betyder mere for dig end de ekstra trin.',
		passesVsInterpolation:
			'Både flere gennemløb og {factor}x interpolation er slået til. De konkurrerer: interpolationen bremser hvert gennemløb så meget, at det koster virkelige billeder, så den samme ventetid køber færre virkelige prøver, end gennemløb alene ville. At slå interpolationen fra giver som regel det bedre billede.',
		shortOfTarget:
			'Selv ved hastigheden 1/{divisor} når denne eksponering omkring {samples} prøver, færre end de {target}, der blev bedt om. Brug en længere lukkertid for at få flere.',
		longCaptureEscalate:
			'Denne optagelse afspiller replayet ved hastigheden 1/{divisor} i cirka {duration} faktisk tid{passSuffix} og kan ikke fremskyndes, når den først er startet. {advice}',
		longCaptureWarn:
			'Denne optagelse tager cirka {duration} faktisk tid ved afspilningshastigheden 1/{divisor}{passSuffix}.',
		passSuffix: ', fordelt over {passes} gennemløb af det samme øjeblik',
		adviceFewerPasses:
			'Færre gennemløb bliver færdige før, med færre prøver.',
		adviceFasterPlayback:
			'En hurtigere afspilningshastighed bliver færdig før, med færre prøver.',
		pastLogCap:
			'Denne optagelse forventes at samle cirka {samples} prøver over {passes} gennemløb, mere end de {cap}, diagnostikloggen kan rumme. Billedet påvirkes ikke — kun tallene for jævnhed og huller vil beskrive den første del af optagelsen.',
		interpolationLossy:
			'I denne størrelse har {factor}x interpolation tidligere kostet denne maskine virkelige prøver. Overvej en lavere faktor, en lavere opløsning eller flere gennemløb i stedet.',
	},

	duration: {
		zero: '0 sekunder',
		seconds: {
			one: '{count} sekund',
			other: '{count} sekunder',
		},
		minutes: {
			one: '{count} minut',
			other: '{count} minutter',
		},
		minutesSeconds: '{minutes} min. {seconds} s',
	},

	// The iRacing configuration editor page. Setting labels/helps are addressed
	// mechanically as settings.<sectionSlug>.<key>.label|.help — the schema in
	// utilities/iracing-settings-schema.ts derives the keys, and its test fails
	// if one is missing here.
	iniEditor: {
		title: 'iRacing Configuration Editor',
		nav: {
			home: 'Screenshots',
			config: 'iRacing configuration',
		},
		tabs: {
			monitor: 'Monitor / Display',
			graphics: 'Graphics',
		},
		mode: {
			label: 'Currently editing configuration:',
			// Mode names come from iRacing's own filenames; Legacy is the bare
			// rendererDX11.ini only old-website launches still read.
			legacy: 'Legacy',
		},
		actions: {
			save: 'Save changes',
			discard: 'Discard',
			reload: 'Reload',
			browse: 'Browse…',
		},
		state: {
			dirty: {
				one: '{count} unsaved change',
				other: '{count} unsaved changes',
			},
			saved: 'Changes saved to {file}',
			simRunning:
				'iRacing is running. It keeps these settings in memory and rewrites the file when it exits, so edits made now would be lost. Close iRacing to edit.',
			stale: 'This file changed on disk since it was loaded — usually iRacing rewriting it on exit. Reload to see the current values.',
			keyMissing: 'Not present in this file',
			noModes:
				'No renderer configuration files were found in {folder}. Launch iRacing once to create them, or point the tool at your iRacing folder.',
			loadFailed: 'The configuration file could not be read.',
			discardConfirm: 'Discard {count} unsaved changes?',
		},
		folder: {
			label: 'iRacing folder',
			autoDetected: 'Auto-detected',
			reset: 'Use auto-detection',
			help: 'Where iRacing keeps its configuration files. Leave empty to detect the Documents\\iRacing folder automatically.',
		},
		errors: {
			iracingRunning:
				'Close iRacing first — it would overwrite the change when it exits.',
			staleFile:
				'The file changed on disk since it was loaded. Reload and try again.',
			validationFailed:
				'One of the values is not valid. Nothing was changed.',
			keyNotFound:
				'A setting was missing from the file, so nothing was changed. Reload and try again.',
			fileNotFound: 'The configuration file no longer exists.',
			ioError: 'The file could not be written. Nothing was changed.',
		},
		groups: {
			window: 'Window placement',
			fullscreen: 'Full screen',
			quality: 'Quality & detail',
			aa: 'Anti-aliasing & sharpening',
			post: 'Post-processing',
			perf: 'Performance',
			misc: 'Miscellaneous',
		},
		// Shared tier vocabulary for enum settings.
		levels: {
			off: 'Off',
			low: 'Low',
			medium: 'Medium',
			high: 'High',
			max: 'Max',
			ultra: 'Ultra',
		},
		nvReflex: {
			off: 'Off',
			on: 'On',
			onBoost: 'Boost',
		},
		shadowDetail: {
			fewer: 'Fewer shadows',
			maximum: 'Maximum shadows',
		},
		aaMethod: {
			none: 'None',
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
			soft: 'Soft',
			neutral: 'Neutral',
			sharp: 'Sharp',
			simple: 'Simple',
		},
		dnsmFilter: {
			off: 'Off',
			simple: 'Simple',
			pcf4: 'PCF4',
			pcf4p: 'PCF4P',
			pcf8p: 'PCF8P',
			pcf16p: 'PCF16P',
		},
		dynamicShadowMaps: {
			off: 'Off',
			mainView: 'In Main View',
			mainViewMirrors: 'In Main View & Mirrors',
		},
		hideObstructions: {
			none: 'None',
			halo: 'Hide the halo',
			pillarRollcage: 'Hide A-pillars and rollcage',
			everything: 'Hide everything',
		},
		replayScope: {
			label: 'Also apply to replay graphics',
		},
		// Inline hints under a field whose pending value cannot be saved. Only
		// numeric inputs can go invalid (switches and dropdowns cannot), and
		// every bounded numeric in the schema carries both bounds.
		invalid: {
			intRange: 'Enter a whole number between {min} and {max}.',
			int: 'Enter a whole number.',
			floatRange: 'Enter a number between {min} and {max}.',
			float: 'Enter a number.',
		},
		layout: {
			title: 'Monitor layout',
			primary: 'Primary',
			windowTarget: 'iRacing window',
			estimated:
				'Estimated — Windows and iRacing number displays differently, so the highlight is matched by position.',
		},
		settings: {
			display: {
				border: { label: 'Window border' },
				windowedXPos: { label: 'Window left' },
				windowedYPos: { label: 'Window top' },
				windowedWidth: { label: 'Window width' },
				windowedHeight: { label: 'Window height' },
				windowedMaximized: { label: 'Start maximized' },
				windowedAlignment: {
					label: 'Window alignment',
					help: 'iRacing does not document this value. Leave unchanged unless you know the alignment index you want.',
				},
				fullScreen: { label: 'Full screen' },
				fullScreenWidth: { label: 'Full-screen width' },
				fullScreenHeight: { label: 'Full-screen height' },
				fullScreenDepth: {
					label: 'Full-screen color depth',
					help: 'Bits per pixel. 32 on effectively every modern system.',
				},
				RefreshRate: {
					label: 'Refresh rate',
					help: '0 uses the display’s default refresh rate.',
				},
			},
			graphics: {
				ShaderQuality: { label: 'Shader quality' },
				ShadowDetail: { label: 'Shadow detail' },
				DynamicShadowMaps: {
					label: 'Dynamic shadow maps',
					help: 'Shadow maps for cars and other moving objects. Day only.',
				},
				DNSMFilter: {
					label: 'Shadowmap filter',
					help: 'The filter used for the dynamic night shadow maps.',
				},
				CarDetail: { label: 'Car detail' },
				PitObjectDetail: { label: 'Pit object detail' },
				CrowdDetail: { label: 'Crowd detail' },
				GrandstandDetail: { label: 'Grandstand detail' },
				ObjectDetail: { label: 'Object detail' },
				FoliageDetail: { label: 'Foliage detail' },
				ParticleDetail: { label: 'Particle detail' },
				ParticlesFullRes: { label: 'Full-resolution particles' },
				MirrorDetail: { label: 'Higher detail in mirrors' },
				MaxCockpitMirrors: { label: 'Max cockpit mirrors' },
				AntiAliasMethod: { label: 'Anti-aliasing method' },
				MSAASamples: { label: 'MSAA samples' },
				MSAAUseFilter: { label: 'MSAA filter' },
				Sharpening: { label: 'Sharpening' },
				SharpeningAmount: {
					label: 'Sharpening amount',
					help: 'Strength of the sharpening filter.',
				},
				FSRSharpness: {
					label: 'FSR sharpness',
					help: 'Sharpness used when resolution scaling upscales with FSR.',
				},
				AutoExposure: {
					label: 'Auto exposure',
					help: 'Only functions while HDR rendering is enabled.',
				},
				SSAO: { label: 'Ambient occlusion (SSAO)' },
				SSRLevel: {
					label: 'Screen-space reflections',
					help: 'Low renders the reflections at a lower resolution, High at full resolution.',
				},
				SSRRainOnly: {
					label: 'Reflections only during rain',
					help: 'Limits screen-space reflections to wet track conditions — the Low Rain and High Rain options in the sim.',
				},
				HeatHaze: { label: 'Heat haze' },
				DepthOfField: { label: 'Depth of field' },
				MotionBlurStrength: { label: 'Motion blur strength' },
				Distortion: { label: 'Lens distortion' },
				EnableHDR: { label: 'HDR rendering' },
				LimitFrameRate: { label: 'Limit frame rate' },
				DesiredFPSLimit: { label: 'Frame rate limit' },
				VerticalSync: { label: 'Vertical sync' },
				NvReflexMode: { label: 'NVIDIA Reflex' },
				MaxPreRenderedFrames: {
					label: 'Max pre-rendered frames',
					help: 'How many frames the GPU may trail behind the CPU. 1 is normal; 0 disables the queue for multi-GPU setups.',
				},
				SysMemToUseMB: { label: 'System memory to use' },
				VidMemToUseMB: { label: 'Video memory to use' },
				MaxCarsToDraw: { label: 'Max cars to draw' },
				MaxCarsToDrawInMirrors: { label: 'Max cars in mirrors' },
				VirtualMirrors: { label: 'Virtual mirrors' },
				UIScale: { label: 'UI scale' },
				EnableTireMarks: { label: 'Tire marks' },
				HideCockpitObstructions: { label: 'Hide cockpit obstructions' },
				HeadlightLevel: { label: 'Headlight quality' },
			},
		},
	},
};

export default da;
