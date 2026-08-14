// Swedish. Translated from en.ts — see that file's header before editing.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.

import type { Catalog } from './index';

const sv: Catalog = {
	notice: {
		danger: 'Problem',
		warning: 'Värt att veta',
		info: 'Noteringar',
	},

	promo: {
		greeting: 'Tack för att du använder iRacing Screenshot Tool!',
		signature: 'Byggt och underhållet av AR Media Solutions.',
	},

	changelog: {
		title: 'Ändringslogg',
		untitledRelease: 'Version',
	},

	gallery: {
		menu: {
			openExternally: 'Öppna i annat program',
			openFolder: 'Öppna mapp',
			copy: 'Kopiera',
			delete: 'Ta bort',
		},
		copiedToClipboard: '{name} kopierad till urklipp',
	},

	sidebar: {
		resolution: 'Upplösning',
		width: 'Bredd',
		height: 'Höjd',
		output: 'Utdata:',
		cropWatermark: 'Beskär vattenstämpel',
		keepAspectRatio: 'Behåll bildförhållande',
		screenshot: 'Skärmbild',
		custom: 'Anpassad',
		vramStatus: '{adapter}{free} ledigt av {total}',
		savedSuccessfully: '{name} sparades',
		screenshotFailed: 'Skärmbilden misslyckades: {message}',
		errorLogPrefix: 'Logg: ',
		notices: {
			exclusiveFullscreen:
				'iRacing körs i exklusivt helskärmsläge — skärmbilderna blir svarta. Ställ Display > Full Screen på OFF i iRacing (Borderless eller Windowed) för att göra inspelning möjlig.',
			vramRisk:
				'{resolution} behöver ungefär {needed} mer VRAM, men bara {free} är ledigt — iRacing kommer sannolikt att få slut på minne och krascha.',
			vramCaution:
				'{resolution} lämnar liten VRAM-marginal ({free} ledigt) och kan krascha vid krävande bana/bil-kombinationer.',
			switchResolution: 'Byt till {resolution}',
			vramStatic:
				'Höga upplösningar kan få iRacing att krascha om VRAM tar slut. Vissa bana/bil-kombinationer kräver mer VRAM.',
			reshade:
				'När du har tryckt på skärmbildsknappen i iRacing Screenshot Tool måste du även trycka på ReShades kortkommando för skärmbilder.',
			crop: 'Beskärning av vattenstämpeln zoomar in den färdiga bilden något. Områden nära skärmkanterna klipps bort.',
			aspectRatio:
				'”Behåll bildförhållande” anpassar skärmbildens höjd till din skärms bildförhållande (till exempel 21:9 ultrabred) i stället för standardvärdet 16:9. Den valda upplösningen bestämmer bredden.',
		},
	},

	settings: {
		title: 'Inställningar',
		version: 'Version - {version}',
		changelog: 'Ändringslogg',
		openLogsFolder: 'Öppna loggmappen',
		checkForUpdates: 'Sök efter uppdateringar',
		updateCheckFailed: 'Uppdateringskontrollen misslyckades: {message}',

		language: 'Språk',
		languageDescription:
			'Språket som används i hela appen. Hämtas från Windows första gången appen körs.',

		screenshotFolder: 'Mapp för skärmbilder',
		selectFolder: 'Välj mapp',
		screenshotKeybind: 'Kortkommando för skärmbild',
		editBind: 'Ändra kortkommando',

		customFilenameFormat: 'Eget filnamnsformat',
		customFilenameFormatDescription:
			'Använd ett eget mönster i stället för standardformatet ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Klicka på fälten för att lägga till dem i formatet. Skriv avgränsare (-, _ osv.) direkt.',
		reset: 'Återställ',
		preview: 'Förhandsgranskning:',

		outputFormat: 'Utdataformat',
		formatJpeg: 'JPEG (högsta kvalitet)',
		formatPng: 'PNG (förlustfri)',
		formatWebp: 'WebP (kvalitet 95 %)',

		disableTooltips: 'Dölj tips',
		disableTooltipsDescription: 'Låt mig vara, jag vet vad jag gör',

		cropTopLeft: 'Föredra beskärning av vattenstämpeln uppe till vänster',
		cropTopLeftDescription:
			'Beskär bara det nedre högra hörnet (3 %). När det är avstängt beskärs skärmbilden lika mycket från alla sidor (6 % totalt), vilket ger ett centrerat resultat.',

		manualWindowRestore: 'Manuell fönsteråterställning',
		manualWindowRestoreDescription:
			'Ersätter den automatiska fönsteråterställningen med egen position och storlek. Användbart för ultrabreda skärmar eller Nvidia Surround.',
		left: 'Vänster',
		top: 'Överkant',
		width: 'Bredd',
		height: 'Höjd',
		restoreNow: 'Återställ nu',

		nativeCapture: 'Högkvalitativ inspelning (WGC)',
		nativeCaptureDescription:
			'Fångar äkta färg utan delsampling via Windows.Graphics.Capture i stället för standardvägen (som delsamplar färgen). Faller automatiskt tillbaka om en inspelning misslyckas.',
		nativeCaptureUnavailable:
			'Inte tillgängligt på det här systemet — högkvalitativ inspelning kan inte köras här.',
		nativeCaptureUnverified:
			'Windows uppger att det stöds, men en testinspelning kom aldrig tillbaka. Inspelningar faller automatiskt tillbaka om det fortsätter att misslyckas.',

		reshade: 'ReShade-kompatibilitetsläge',
		reshadeDescription:
			'Med ReShade måste du först använda kortkommandot för iRacing Screenshot Tool eller trycka på knappen, och sedan använda ditt ReShade-kortkommando för skärmbilder när iRacing-fönstret har ändrat storlek.',
		reshadeIni: 'ReShade-INI',
		selectFile: 'Välj fil',
	},

	longExposure: {
		title: 'Långtidsexponering',
		shutter: 'Slutartid',
		playbackSpeed: 'Uppspelningshastighet',
		playbackAuto: 'Automatiskt (utifrån målantal sampel)',
		playbackRealTime: '1x (realtid)',
		targetSamples: 'Målantal sampel',
		advanced: 'Avancerat',
		defaultsSummary: '{count} standardvärden',

		weighting: 'Viktning',
		weightingBox: 'Box (jämn)',
		weightingLinear: 'Linjär (skarp i slutet)',
		weightingEase: 'Ease (skarpare början, lång svans)',

		interpolation: 'Bildinterpolering',
		interpolationOff: 'Av',
		interpolation2: '2× (en mellanbild)',
		interpolation4: '4× (tre mellanbilder)',
		interpolation8: '8× (sju mellanbilder)',

		passes: 'Pass',
		passes1: '1 (ett enda pass)',
		passes2: '2× — dubbelt så lång väntan',
		passes4: '4× — fyra gånger så lång väntan',
		passes8: '8× — åtta gånger så lång väntan',

		bracket: 'Slutartidsgaffling',
		highlightRecovery: 'Högdageråterhämtning (steg)',

		cancel: 'Avbryt',
		saved: 'Långtidsexponering sparad — {count} sampel',
		failed: 'Långtidsexponeringen misslyckades',

		modified: {
			weighting_linear: 'linjär',
			weighting_ease: 'ease',
			interpolation: '{factor}× interpolering',
			passes: {
				one: '{count} pass',
				other: '{count} pass',
			},
			bracketed: 'gafflad',
			recovery: '{stops} stegs återhämtning',
		},

		progress: {
			working: 'Arbetar…',
			seeking: 'Söker…{pass}',
			accumulating: 'Exponerar… {count} sampel{pass}',
			resolving: 'Framkallar…',
			restoring: 'Återställer replayen…',
			pass: ' (pass {current} av {total})',
		},

		notices: {
			needsNativeCapture:
				'Långtidsexponering kräver högkvalitativ inspelning (WGC), som just nu är avstängd. Slå på den i inställningarna för att kunna använda långtidsexponering.',
			unavailableWithReason:
				'Långtidsexponering är inte tillgänglig på den här datorn: {reason}',
			unavailable:
				'Långtidsexponering är inte tillgänglig på den här datorn.',
			interpolationCost:
				'Interpolering hittar på bildrutor mellan de verkliga för att jämna ut strecket. Det kostar GPU-tid per bildruta, så jämför antalet verkliga sampel i den sparade bilden med samma bild utan interpolering — om siffran sjunker köper den påhittade sampel med verkliga.',
			passesAndInterpolation:
				'Pass och interpolering konkurrerar om samma budget per bildruta. Med båda på fångar varje pass färre verkliga bildrutor — att stänga av interpoleringen ger oftast en bättre bild för samma väntan.',
			passes:
				'Varje pass spelar upp samma ögonblick igen och fångar bildrutor som de andra missade, så strecket blir jämnare snarare än ljusare. Fungerar bäst vid korta slutartider, där ett enda pass bara samlar en handfull sampel.',
			interpolationUnsupported:
				'Bildinterpolering kräver en NVIDIA Turing-GPU eller nyare{adapter}. Allt annat i långtidsexponeringen fungerar som vanligt.',
			interpolationAdapter: ' (den här inspelningen körs på {adapter})',
			reshade:
				'Långtidsexponering spelar in nativt och använder inte ReShade, så ReShade-effekter syns inte i resultatet.',
		},
	},

	help: {
		title: 'Hjälp',
		sections: 'Hjälpavsnitt',
		tabGeneral: 'Allmänt',
		tabLongExposure: 'Långtidsexponering',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'iRacing-inställningar',
			borderless: 'iRacing måste köras i Windowed Borderless',
			vram: 'Minst 8 GB VRAM rekommenderas för skärmbilder i 8K eller högre',
			newerContent: 'Nyare banor och bilar kräver mer VRAM',
			shrinkUi:
				'Krymp gränssnittet så mycket det går innan du tar en skärmbild om du använder beskärning av vattenstämpeln; ”Control+PageDown” krymper det. Fungerar det inte kan du behöva återställa gränssnittets zoom i iRacings inställningar.',

			screenshotFolder: 'Mapp för skärmbilder',
			screenshotFolderBody:
				'Skärmbilder sparas som standard i ”C:\\Users\\user\\Pictures\\Screenshots”; detta kan ändras i inställningarna.',

			screenshotHotkey: 'Kortkommando för skärmbild',
			screenshotHotkeyBody:
				'Som standard tar ”Control + PrintScreen” en skärmbild med aktuella inställningar; detta kan ändras i inställningarna.',

			issues: 'Problem',
			issuesBody: 'Har du problem, rapportera dem gärna på',
			discord: 'Discord',

			instructions: 'Instruktioner',
			step1: 'iRacing <b>måste</b> köras i läget Windowed Borderless',
			step2: 'Starta iRacing och placera kameran där du vill ta skärmbilden',
			step3: 'Välj önskad upplösning (prova lägre upplösningar innan du går upp till 8K)',
			step4: 'Bestäm om du vill beskära iRacings vattenstämpel; i så fall måste du först krympa iRacings gränssnitt till minsta storlek med ”Control + PageDown”',
			step5: 'Tryck på skärmbildsknappen eller använd kortkommandot ”Control + PrintScreen” för att ta bilderna',
			step6: 'Beroende på vald upplösning kan detta ta några sekunder; när iRacing-fönstret återfår sin normala storlek är det klart',
			step7: 'Din skärmbild sparas i ”C:\\Users\\{User}\\Pictures\\Screenshots”',
		},

		longExposure: {
			whatItDoes: 'Vad den gör',
			whatItDoesBody:
				'En långtidsexponering blandar många bildrutor från en replay till en enda bild, precis som när man låter en kameraslutare stå öppen: det som står stilla förblir skarpt, det som rör sig drar streck. Verktyget styr replayen själv, fångar varje bildruta som simulatorn visar och summerar dem på GPU:n.',

			shutter: 'Slutartid',
			shutterBody:
				'Hur länge exponeringen varar <i>i replaytid</i>, från en bråkdel av en replaybildruta upp till tio sekunder. Det är den här inställningen som avgör hur långa strecken blir. Längre slutartider samlar också fler bildrutor och behöver därför mindre hjälp av allt nedanför; de kortaste stegen täcker en enda replaybildruta och samlar bara en handfull sampel.',

			playback: 'Uppspelningshastighet',
			playbackBody:
				'Replayen spelas upp i slow motion medan exponeringen fångas, så att simulatorn visar fler bildrutor per sekund replaytid och blandningen får fler sampel. 1/16 samlar ungefär sexton gånger så många bildrutor som realtid — och tar sexton gånger så lång verklig tid. Det är den huvudsakliga avvägningen i panelen: tålamod mot mjukhet.',
			playbackAutoBody:
				'”Automatiskt (utifrån målantal sampel)” väljer hastigheten åt dig utifrån <b>målantal sampel</b>: verktyget räknar ut den snabbaste uppspelning som fortfarande når det antal du bett om. Ange en uttrycklig hastighet i stället om du hellre begränsar väntetiden.',

			weighting: 'Viktning',
			weightingBody:
				'Hur mycket varje fångad bildruta bidrar till resultatet. <b>Box</b> viktar dem alla lika och ger ett jämnt streck. <b>Linjär</b> ökar mot slutet av fönstret, så motivet är skarpast där det slutade och tonar bort längs sin bana. <b>Ease</b> är samma idé med skarpare början och längre svans.',

			interpolation: 'Bildinterpolering',
			interpolationBody:
				'Hittar på extra bildrutor mellan de verkliga med hjälp av GPU:ns optical flow-motor och fyller igen luckorna längs strecket. Kräver ett NVIDIA Turing-kort eller nyare och döljs helt på hårdvara som inte klarar det.',
			interpolationCostBody:
				'Det är inte gratis: det kostar GPU-tid på varje fångad bildruta, och budgeten är en iRacing-bildruta. Om den inte hinner med börjar den missa <i>verkliga</i> bildrutor för att tillverka syntetiska, vilket är en nettoförlust — strecket blir kortare och grövre. Kostnaden skalar med megapixlar gånger faktorn, så det som är bekvämt vid 2560×1440 är inte gångbart i 8K. För att kontrollera det: fotografera samma ögonblick två gånger, med och utan, och jämför antalet verkliga sampel; appen varnar dig också i efterhand om en bild blev för snål.',

			passes: 'Pass',
			passesBody:
				'Besöker samma ögonblick flera gånger och ackumulerar allt till en bild. Varje pass fångar bildrutor som de andra råkade missa, så strecket blir jämnare — inte ljusare, eftersom resultatet normaliseras efter hur mycket ljus som faktiskt landade på varje bildpunkt.',
			passesTradeBody:
				'Pass köper samma sak som interpolering, fast i en annan valuta: verklig tid i stället för GPU-tid. Åtta pass tar ungefär åtta gånger så lång tid, men de kan aldrig kosta dig verkliga bildrutor. Det gör dem till rätt verktyg vid höga upplösningar, där interpoleringen inte hinner med, och vid korta slutartider, där ett enda pass samlar väldigt få sampel. Att använda båda samtidigt är oftast det sämsta av två världar — de konkurrerar om samma budget per bildruta.',

			bracket: 'Slutartidsgaffling',
			bracketBody:
				'Ger en bild per slutartidssteg som är lika med eller kortare än det du valt, från en enda inspelning. En bild vid 1/60 ger dig även 1/125, 1/250, 1/500 och 1/1000 — samma ögonblick med successivt kortare streck — så att du kan välja uttryck i efterhand i stället för att gissa och ta om.',
			bracketCostBody:
				'Det kostar nästan ingen extra tid. Varje steg slutar på samma bildruta och skiljer sig bara i hur långt bakåt det når, så en kortare slutartid är helt enkelt slutet på de bildrutor som ändå passerar — de fylls alla från ett enda pass av replayen.',
			bracketMemoryBody:
				'Det som kostar är minne. Varje steg behöver en egen ackumulator i full upplösning, så elva steg behöver elva gånger så mycket grafikminne som ett, vilket i 8K är mer än de flesta kort har. Inspelningen kontrollerar detta innan den startar och avstår hellre än att krascha iRacing; om en gaffling nekas, sänk upplösningen eller välj en kortare slutartid — vilket också ger en kortare stege.',
			bracketNamingBody:
				'Steget du valde sparas under det vanliga namnet och är det som visas i galleriet; de övriga ligger bredvid med sin slutartid i filnamnet.',

			highlights: 'Högdageråterhämtning',
			highlightsBody:
				'Förstärker nästan urblåsta högdagrar innan bildrutorna summeras och tar sedan bort förstärkningen på slutet. iRacing lämnar ifrån sig en bild som redan tonmappats, så en strålkastare och en vit vägg kommer in med samma värde; att medelvärdesbilda det gör att ett starkt ljus som sveper genom en del av exponeringen läses som en grå fläck i stället för ett ljust spår. Detta lägger tillbaka olineariteten där en riktig sensor har den. Mäts i steg; 0 är av och ändrar ingenting alls.',

			whatItSaves: 'Vad den sparar',
			whatItSavesBody:
				'Storlek, beskärning av vattenstämpeln och filformat följer samma reglage som en vanlig skärmbild — inställningarna Upplösning och Beskär vattenstämpel ovan, samt utdataformatet i inställningarna. Raden ”Utdata” högst upp i sidopanelen visar exakt vad du får.',
			whatItSavesPngBody:
				'Väljer du PNG skrivs en äkta 16-bitars master, vilket är värt det om du tänker färgsätta bilden efteråt, plus en 8-bitars förhandsvisning till galleriet. Den är också mycket långsammare att skriva vid höga upplösningar — en 16-bitars PNG på 33 megapixel tar omkring tio sekunder, medan samma bildruta som JPEG tar under en sekund.',

			troubleshooting: 'Om resultatet ser fel ut',
			troubleGhosts:
				'<b>Enskilda spökbilder i stället för ett mjukt streck</b> — för få sampel. Använd en långsammare uppspelningshastighet, fler pass eller en lägre upplösning.',
			troubleShutter:
				'<b>Osäker på vilken slutartid du ville ha</b> — slå på slutartidsgaffling och bestäm i efterhand, för samma väntan.',
			troubleHighlights:
				'<b>Urblåsta eller platta högdagrar</b> — prova 3 till 5 steg av högdageråterhämtning.',
			troubleBlack:
				'<b>En svart bild</b> — iRacing körs i exklusivt helskärmsläge. Ställ Display &gt; Full Screen på OFF.',
			troubleSidecar:
				'Varje bild registrerar exakt vilka inställningar som användes, antalet sampel och hur jämnt de landade, som en .json-fil i loggmappen bredvid app.log. De 20 senaste bilderna sparas — en gaffling räknas som en — så den bild du frågar om finns kvar medan du frågar om den.',
		},

		faq: {
			blackShot: 'Bilden är svart, men iRacings gränssnitt syns på den',
			blackShotBody:
				'Själva tagningen fungerade: gränssnittet ritades, så en riktig bildruta nådde verktyget. Det som saknas är 3D-scenen, eftersom iRacing renderade den svart. Flera av de mindre vanliga kamerorna gör detta — fjädringskameran är den folk oftast råkar på. Byt till en vanlig kamera (cockpit, förföljande eller någon av tv-kamerorna) och ta samma ögonblick igen.',
			blackShotFullscreenBody:
				'Är bilden svart <i>inklusive</i> gränssnittet, och beter sig alla kameror likadant, är orsaken en annan: iRacing körs i exklusivt helskärmsläge, som inget utanför simulatorn kan fånga. Ställ Display &gt; Full Screen på OFF.',

			cameraReset: 'iRacing flyttar min kamera precis innan bilden tas',
			cameraResetBody:
				'Det är iRacings eget automatiska bildval, inte det här verktyget. Så länge det är på fortsätter iRacing att välja kameror själv och hoppar tillbaka till en standardbildvinkel i samma ögonblick som tagningen startar, så du får inte den bild du ställt i ordning.',
			cameraResetFixBody:
				'Stäng av det i iRacings kameraverktyg (Ctrl+F12), under <b>Camera &gt; Config &gt; Preferences</b>: reglaget <b>Shot Selection</b> märkt <b>Automatic</b>. Med det avstängt stannar kameran exakt där du satte den — både för vanliga skärmbilder och för långtidsexponeringar.',
		},
	},

	update: {
		checking: 'Söker efter uppdateringar…',
		newVersion: 'En ny version',
		availableBusy:
			'{version} finns tillgänglig. En inspelning pågår — du kan hämta den när den är klar.',
		available: '{version} finns tillgänglig. Klicka för att hämta den.',
		downloading: 'Hämtar {version}…',
		downloadingPercent: 'Hämtar {version} — {percent} %',
		downloadedBusy:
			'{version} är klar. En inspelning pågår, så den installeras när du stänger appen.',
		downloaded: '{version} är klar. Klicka för att starta om och installera.',
		failed: 'Uppdateringskontrollen misslyckades: {error}',
		unknownError: 'okänt fel',
		neverChecked: 'Inga uppdateringar har sökts ännu (du kör v{version}).',
		upToDate: 'Du kör den senaste versionen (v{version}).',

		alreadyDownloading: 'Uppdateringen hämtas redan.',
		alreadyDownloaded: 'Uppdateringen är redan hämtad.',
		nothingToDownload: 'Det finns ingen uppdatering att hämta.',
		captureInProgress: 'En inspelning pågår. Försök igen när den är klar.',
		nothingToInstall: 'Ingen uppdatering är redo att installeras.',
		captureInProgressInstall:
			'En inspelning pågår. Uppdateringen installeras av sig själv när du stänger appen.',
		devBuildOnly:
			'Uppdateringskontroller körs bara i en installerad version.',

		installTitle: 'Installera uppdatering',
		installMessage: 'Installera version {version}?',
		installFallbackVersion: 'uppdatering',
		installDetail:
			'Appen stängs och öppnas igen när uppdateringen har installerats. Väljer du ”Senare” installeras den av sig själv nästa gång du stänger appen.',
		installConfirm: 'Starta om och installera',
		installLater: 'Senare',
	},

	filenameFields: {
		categories: {
			Track: 'Bana',
			Driver: 'Förare',
			Session: 'Session',
			Meta: 'Meta',
		},
		track: 'Bana',
		trackFull: 'Bana fullständigt',
		trackCity: 'Stad',
		trackCountry: 'Land',
		trackType: 'Bantyp',
		driver: 'Förare',
		driverAbbrev: 'Förare förkortat',
		driverInitials: 'Initialer',
		team: 'Stall',
		carNumber: 'Bilnr',
		car: 'Bil',
		carFull: 'Bil fullständigt',
		carClass: 'Bilklass',
		iRating: 'iRating',
		sessionType: 'Sessionstyp',
		sessionName: 'Sessionsnamn',
		lap: 'Varv',
		date: 'Datum',
		time: 'Tid',
		datetime: 'Datum+tid',
		counter: 'Räknare',
	},

	iracingConfig: {
		projections:
			'Stäng av ”Render Scene Using 3 Projections” i iRacing (fliken Display > Monitor) för att undvika lodräta band i skärmbilderna',
	},

	graphicsProfiles: {
		title: 'Grafikprofiler',
		description:
			'Spara iRacing-grafikkonfigurationer och växla mellan dem — en för att köra, en för skärmbilder, en för videoinspelning. iRacing läser konfigurationen vid start och skriver tillbaka den när det avslutas, så ett byte som görs medan simulatorn kör görs ogjort: <b>byt konfiguration bara när simulatorn är stängd</b>.',
		iracingRunning:
			'Stäng iRacing innan du växlar. Vid avslut skriver det tillbaka sin grafikkonfiguration, vilket skulle upphäva ändringen.',
		activeHeading: 'Nuvarande konfiguration',
		active: {
			clean: 'Motsvarar din profil {name}.',
			modified: {
				one: 'Bygger på {name}, med {count} inställning ändrad sedan dess.',
				other: 'Bygger på {name}, med {count} inställningar ändrade sedan dess.',
			},
			modifiedUnknownCount: 'Bygger på {name}, ändrad sedan dess.',
			unknown: 'Motsvarar ingen sparad profil.',
			missing: 'Ingen iRacing-grafikkonfiguration hittades.',
		},
		badge: {
			active: 'Aktiv',
			modified: 'Ändrad',
		},
		empty: {
			title: 'Inga profiler sparade ännu.',
			body: 'Spara din nuvarande iRacing-konfiguration som en profil, eller importera en befintlig .ini-fil.',
		},
		invalidProfile: 'Inte en grafikkonfiguration',
		warnings: {
			autoCfgIncomplete: 'Återställs av iRacing',
		},
		actions: {
			load: 'Läs in',
			overwrite: 'Uppdatera från nuvarande',
			rename: 'Byt namn',
			export: 'Exportera',
			delete: 'Ta bort',
			save: 'Spara',
			cancel: 'Avbryt',
			saveCurrent: 'Spara nuvarande som…',
			import: 'Importera…',
			openFolder: 'Öppna mapp',
		},
		prompt: {
			namePlaceholder: 'Profilnamn',
			deleteConfirm: 'Ta bort {name}?',
		},
		feedback: {
			loaded: '{name} inläst. Starta iRacing för att det ska träda i kraft.',
			saved: 'Sparad som {name}.',
			overwritten: '{name} uppdaterad från den nuvarande konfigurationen.',
			renamed: 'Namnet ändrat till {name}.',
			deleted: '{name} borttagen.',
			imported: 'Importerad som {name}.',
			exported: '{name} exporterad.',
		},
		errors: {
			empty: 'Ange ett namn för profilen.',
			illegalCharacters:
				'Ett profilnamn får inte innehålla något av dessa tecken: < > : " / \\ | ? *',
			reservedName: 'Det namnet är reserverat av Windows. Välj ett annat.',
			trailingDotOrSpace:
				'Ett profilnamn får inte sluta med punkt eller mellanslag.',
			tooLong: 'Det namnet är för långt.',
			duplicate: 'Det finns redan en profil med det namnet.',
			profileNotFound: 'Den profilen gick inte längre att hitta.',
			profileExists: 'Det finns redan en profil med det namnet.',
			duplicateContent:
				'Det finns redan en profil med exakt dessa inställningar: {name}.',
			noActiveConfig:
				'Ingen iRacing-grafikkonfiguration hittades att spara.',
			invalidIni:
				'Den filen är inte en iRacing-grafikkonfiguration, så den användes inte.',
			iracingRunning:
				'Stäng iRacing först — det skulle skriva över ändringen vid avslut.',
			ioError: 'Filen kunde inte skrivas. Ingenting ändrades.',
		},
	},

	wgc: {
		cursorCaveat:
			'Muspekaren kan synas i inspelningar på den här versionen av Windows. Windows 10 version 2004 lade till inställningen som döljer den.',
		addonUnavailable:
			'Komponenten för högkvalitativ inspelning kunde inte läsas in på det här systemet.',
		osUnsupported:
			'Windows.Graphics.Capture är inte tillgängligt på den här versionen av Windows. Det kräver Windows 10 version 1903 eller nyare.',
		nativeCaptureOff: 'Högkvalitativ inspelning (WGC) är avstängd',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing körs i exklusivt helskärmsläge, så skärmbilden skulle bli svart. Ställ Display > Full Screen på OFF i iRacing (använd Borderless eller Windowed) och försök igen.',
		exclusiveFullscreenUnattributed:
			'Ett program körs i exklusivt helskärmsläge, vilket ger en svart inspelning. Om iRacing körs i helskärm, ställ Display > Full Screen på OFF (använd Borderless eller Windowed) och försök igen.',
		unknownError: 'Okänt skärmbildsfel',
		outputTooSmall: 'Inspelningen är för liten ({width}x{height})',
		blackFrame:
			'Den fångade bildrutan är svart — inspelningskällan kan ha misslyckats (GPU-accelererat innehåll går inte alltid att fånga på vissa Windows-uppsättningar)',
		noSource:
			'Ingen skrivbordsinspelningskälla hittades för fönster {windowId}',
		metadataTimeout:
			'Tidsgränsen nåddes i väntan på inspelningens videometadata',
		noVideoFrame: 'Inspelningsströmmen gav ingen videobildruta',
		dimensionTimeout:
			'Tidsgränsen nåddes i väntan på fönsterstorleken {width}x{height}; fortsätter med {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'En inspelning pågår redan.',
		needsNativeCapture:
			'Långtidsexponering kräver högkvalitativ inspelning (WGC). Slå på den i inställningarna för att använda den.',
		unavailable: 'Långtidsexponering är inte tillgänglig på den här datorn.',
		noTelemetry:
			'Långtidsexponering kräver replaytelemetri från iRacing. Kontrollera att simulatorn körs och befinner sig i en session.',
		windowNotFound: 'iRacing-fönstret hittades inte.',
		cancelled: 'Inspelningen avbröts.',
		seekTimeout:
			'Replayen nådde inte bildruta {frame} i tid. Den kanske fortfarande läses in.',
		noPasses: 'En inspelning måste köra minst ett pass.',
		playbackStalled:
			'Replayen började inte spelas. Kontrollera att iRacing inte har pausats av ett annat verktyg.',
		exposureTimeout:
			'Exponeringen nådde inte bildruta {frame} inom {seconds} s.',
		endedEarly: 'Exponeringen tog slut innan det valda ögonblicket nåddes.',
		noFramesPresented: 'iRacing visade inga bildrutor att fånga.',
		subFrameNoSamples:
			'Den här slutartiden är kortare än en replaybildruta, och iRacing renderade ingen bildruta inom den. Prova en långsammare uppspelningshastighet, eller nästa längre slutartid.',
		noSamples:
			'Inga bildrutor ackumulerades. iRacing kan ha slutat rendera under exponeringen.',
		blankCapture:
			'Alla infångade bildrutor var svarta, så det finns ingen bild att spara. Kontrollera att iRacing körs i fönster- eller kantlöst läge i stället för exklusivt helskärmsläge, och att det fortfarande finns ledigt grafikminne vid den här upplösningen — en lägre infångningsupplösning är det snabbaste att prova.',
		frozenCapture:
			'iRacing visade {samples} bildrutor under exponeringen, men alla var identiska, så den här bilden är en stillbild och inte en lång exponering. iRacing renderade inget nytt medan replayen rullade.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'GPU:n returnerade ingen bild.',
		bracketShortfall:
			'Gafflingen begärde {asked} steg men {returned} kom tillbaka — resten kunde inte lösas ut, eller så är den här versionen av inspelningskomponenten äldre än gafflingen.',
	},

	validation: {
		windowBeforeStart:
			'Exponeringen behöver {frames} replaybildrutor före det valda ögonblicket, men det ligger bara {anchor} bildrutor in i replayen. Välj ett senare ögonblick eller en kortare slutartid.',
		pastEnd: 'Det valda ögonblicket ligger efter replayens slut.',
		sessionChanged:
			'Replayen har bytt till en annan session sedan den här bilden ställdes in. Välj ögonblicket på nytt.',
		singleSampleMultiPass:
			'Den här slutartiden är så kort att bara ungefär en bildruta hamnar inom den per pass, så {passes} pass samlar ungefär {passes} sampel. En långsammare uppspelningshastighet eller en längre slutartid ger betydligt fler.',
		singleSample:
			'Den här slutartiden är så kort att bara en bildruta hamnar inom den, så resultatet får ingen rörelseoskärpa. En långsammare uppspelningshastighet eller en längre slutartid ger sampel.',
		bracketVsInterpolation:
			'Slutartidsgaffling och {factor}x bildinterpolering kan inte köras samtidigt, så den här bilden tas utan interpolering. Stäng av gafflingen om mellanbilderna betyder mer för dig än de extra stegen.',
		passesVsInterpolation:
			'Både flera pass och {factor}x interpolering är på. De konkurrerar: interpoleringen bromsar varje pass så mycket att det kostar verkliga bildrutor, så samma väntan köper färre verkliga sampel än enbart pass skulle göra. Att stänga av interpoleringen ger oftast den bättre bilden.',
		shortOfTarget:
			'Även vid hastigheten 1/{divisor} når den här exponeringen omkring {samples} sampel, färre än de {target} som begärdes. Använd en längre slutartid för fler.',
		longCaptureEscalate:
			'Den här inspelningen spelar upp replayen i hastigheten 1/{divisor} under ungefär {duration} verklig tid{passSuffix}, och går inte att skynda på när den väl startat. {advice}',
		longCaptureWarn:
			'Den här inspelningen tar ungefär {duration} verklig tid vid uppspelningshastigheten 1/{divisor}{passSuffix}.',
		passSuffix: ', fördelat över {passes} pass över samma ögonblick',
		adviceFewerPasses: 'Färre pass blir klara tidigare, med färre sampel.',
		adviceFasterPlayback:
			'En snabbare uppspelningshastighet blir klar tidigare, med färre sampel.',
		pastLogCap:
			'Den här inspelningen beräknas samla omkring {samples} sampel över {passes} pass, mer än de {cap} som diagnostikloggen rymmer. Bilden påverkas inte — bara jämnhets- och gluggsiffrorna kommer att beskriva inspelningens första del.',
		interpolationLossy:
			'I den här storleken har {factor}x interpolering tidigare kostat den här datorn verkliga sampel. Överväg en lägre faktor, en lägre upplösning eller fler pass i stället.',
	},

	duration: {
		zero: '0 sekunder',
		seconds: {
			one: '{count} sekund',
			other: '{count} sekunder',
		},
		minutes: {
			one: '{count} minut',
			other: '{count} minuter',
		},
		minutesSeconds: '{minutes} min {seconds} s',
	},
};

export default sv;
