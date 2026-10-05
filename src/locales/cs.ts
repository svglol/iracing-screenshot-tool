// Czech. Translated from en.ts — see that file's header before editing.
//
// NOTE ON PLURALS. Czech has four CLDR categories:
//   one   n = 1                → 1 průchod
//   few   n = 2..4             → 2 průchody
//   many  fractional counts    → 1,5 průchodu
//   other everything else (0, 5+) → 5 průchodů
// `other` is therefore the genitive plural, not a copy of `one` — getting this
// wrong renders "5 průchody", which is not Czech.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.

import type { Catalog } from './index';

const cs: Catalog = {
	notice: {
		danger: 'Problémy',
		warning: 'Dobré vědět',
		info: 'Poznámky',
	},

	promo: {
		greeting: 'Děkujeme, že používáte iRacing Screenshot Tool!',
		signature: 'Vytvořila a spravuje AR Media Solutions.',
	},

	changelog: {
		title: 'Seznam změn',
		untitledRelease: 'Verze',
	},

	gallery: {
		menu: {
			openExternally: 'Otevřít v jiné aplikaci',
			openFolder: 'Otevřít složku',
			copy: 'Kopírovat',
			delete: 'Odstranit',
		},
		copiedToClipboard: '{name} zkopírováno do schránky',
	},

	sidebar: {
		resolution: 'Rozlišení',
		width: 'Šířka',
		height: 'Výška',
		output: 'Výstup:',
		cropWatermark: 'Oříznout vodoznak',
		keepAspectRatio: 'Zachovat poměr stran',
		screenshot: 'Snímek obrazovky',
		custom: 'Vlastní',
		vramStatus: '{adapter}{free} volných z {total}',
		savedSuccessfully: '{name} úspěšně uloženo',
		screenshotFailed: 'Snímek se nezdařil: {message}',
		errorLogPrefix: 'Protokol: ',
		notices: {
			exclusiveFullscreen:
				'iRacing běží ve výhradním celoobrazovkovém režimu — snímky budou černé. V iRacingu nastavte Display > Full Screen na OFF (Borderless nebo Windowed), aby snímání fungovalo.',
			vramRisk:
				'{resolution} potřebuje přibližně {needed} paměti VRAM navíc, ale volných je jen {free} — iRacingu pravděpodobně dojde paměť a spadne.',
			vramCaution:
				'{resolution} nechává málo rezervy paměti VRAM ({free} volných) a u náročných kombinací trati a vozu může spadnout.',
			switchResolution: 'Přepnout na {resolution}',
			vramStatic:
				'Vysoká rozlišení mohou způsobit pád iRacingu, pokud dojde paměť VRAM. Některé kombinace trati a vozu vyžadují více VRAM.',
			reshade:
				'Po stisknutí tlačítka snímku v iRacing Screenshot Tool budete muset ještě stisknout klávesovou zkratku pro snímek v ReShade.',
			crop: 'Oříznutí vodoznaku výsledný obraz mírně přiblíží. Oblasti u okrajů obrazovky budou odříznuty.',
			aspectRatio:
				'„Zachovat poměr stran“ přizpůsobí výšku snímku poměru vašeho monitoru (například 21:9 ultraširoký) místo výchozích 16:9. Zvolené rozlišení určuje šířku.',
		},
	},

	settings: {
		title: 'Nastavení',
		version: 'Verze - {version}',
		changelog: 'Seznam změn',
		openLogsFolder: 'Otevřít složku protokolů',
		checkForUpdates: 'Zkontrolovat aktualizace',
		updateCheckFailed: 'Kontrola aktualizací se nezdařila: {message}',

		language: 'Jazyk',
		languageDescription:
			'Jazyk používaný v celé aplikaci. Při prvním spuštění se převezme z Windows.',

		screenshotFolder: 'Složka pro snímky',
		selectFolder: 'Vybrat složku',
		screenshotKeybind: 'Klávesová zkratka snímku',
		editBind: 'Upravit zkratku',

		customFilenameFormat: 'Vlastní formát názvu souboru',
		customFilenameFormatDescription:
			'Použít vlastní vzor místo výchozího ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Kliknutím na pole je přidáte do formátu. Oddělovače (-, _ apod.) pište přímo.',
		reset: 'Obnovit',
		preview: 'Náhled:',

		outputFormat: 'Výstupní formát',
		formatJpeg: 'JPEG (nejvyšší kvalita)',
		formatPng: 'PNG (bezztrátový)',
		formatWebp: 'WebP (kvalita 95 %)',

		disableTooltips: 'Skrýt tipy',
		disableTooltipsDescription: 'Nechte mě být, vím, co dělám',

		cropTopLeft: 'Upřednostnit oříznutí vodoznaku vlevo nahoře',
		cropTopLeftDescription:
			'Ořízne pouze pravý dolní roh (3 %). Když je volba vypnutá, snímek se ořízne rovnoměrně ze všech stran (celkem 6 %), takže výsledek zůstane vystředěný.',

		manualWindowRestore: 'Ruční obnovení okna',
		manualWindowRestoreDescription:
			'Nahradí automatické obnovení okna vlastní pozicí a velikostí. Užitečné pro ultraširoké monitory nebo Nvidia Surround.',
		left: 'Vlevo',
		top: 'Nahoře',
		width: 'Šířka',
		height: 'Výška',
		restoreNow: 'Obnovit nyní',

		nativeCapture: 'Snímání ve vysoké věrnosti (WGC)',
		nativeCaptureDescription:
			'Snímá skutečné barvy bez podvzorkování přes Windows.Graphics.Capture místo výchozí cesty (která barvy podvzorkuje). Při selhání snímání se automaticky vrátí k záložní metodě.',
		nativeCaptureUnavailable:
			'V tomto systému není dostupné — snímání ve vysoké věrnosti zde nemůže běžet.',
		nativeCaptureUnverified:
			'Windows hlásí podporu, ale zkušební snímek se nevrátil. Pokud selhávání potrvá, snímání se automaticky přepne na záložní metodu.',

		reshade: 'Režim kompatibility s ReShade',
		reshadeDescription:
			'Při použití ReShade musíte nejprve použít zkratku iRacing Screenshot Tool nebo stisknout tlačítko a poté, jakmile okno iRacingu změní velikost, použít svou zkratku snímku v ReShade.',
		reshadeIni: 'Soubor INI ReShade',
		selectFile: 'Vybrat soubor',
	},

	longExposure: {
		title: 'Dlouhá expozice',
		shutter: 'Závěrka',
		playbackSpeed: 'Rychlost přehrávání',
		playbackAuto: 'Automaticky (podle cílového počtu vzorků)',
		playbackRealTime: '1x (reálný čas)',
		targetSamples: 'Cílový počet vzorků',
		advanced: 'Pokročilé',
		defaultsSummary: 'výchozích hodnot: {count}',

		weighting: 'Vážení',
		weightingBox: 'Box (rovnoměrné)',
		weightingLinear: 'Lineární (ostré na konci)',
		weightingEase: 'Ease (ostřejší začátek, dlouhý ohon)',
		weightingBoxShort: 'Box',
		weightingLinearShort: 'Lineární',
		weightingEaseShort: 'Ease',

		passes: 'Průchody',
		passes1: '1 (jediný průchod)',
		passes2: '2× — dvojnásobné čekání',
		passes4: '4× — čtyřnásobné čekání',
		passes8: '8× — osminásobné čekání',

		warmUp: 'Zahřátí efektů',
		warmUpOff: 'Vypnuto',
		warmUp1: '1 s',
		warmUp3: '3 s (doporučeno)',
		warmUp5: '5 s — pro dlouho přetrvávající kouř',
		warmUpValue: '{seconds} s',

		bracket: 'Braketing závěrek',
		highlightRecovery: 'Obnova světel (EV)',
		highlightRecoveryOff: 'Vypnuto',

		cancel: 'Zrušit',
		saved: 'Dlouhá expozice uložena — vzorků: {count}',
		failed: 'Dlouhá expozice se nezdařila',

		modified: {
			weighting_linear: 'lineární',
			weighting_ease: 'ease',
			passes: {
				one: '{count} průchod',
				few: '{count} průchody',
				many: '{count} průchodu',
				other: '{count} průchodů',
			},
			bracketed: 'braketing',
			warmUp: '{seconds} s zahřátí',
			warmUpOff: 'bez zahřátí',
			recovery: 'obnova {stops} EV',
		},

		progress: {
			working: 'Pracuji…',
			warming: 'Zahřívám efekty…{pass}',
			seeking: 'Hledám…{pass}',
			accumulating: 'Exponuji… vzorků: {count}{pass}',
			resolving: 'Vyvolávám…',
			restoring: 'Obnovuji záznam…',
			pass: ' (průchod {current} z {total})',
		},

		notices: {
			needsNativeCapture:
				'Dlouhá expozice vyžaduje snímání ve vysoké věrnosti (WGC), které je nyní vypnuté. Zapněte je v nastavení, aby šla dlouhá expozice použít.',
			unavailableWithReason:
				'Dlouhá expozice není na tomto počítači dostupná: {reason}',
			unavailable: 'Dlouhá expozice není na tomto počítači dostupná.',
			passes:
				'Každý průchod znovu přehraje tentýž okamžik a zachytí snímky, které ostatní minuly, takže stopa je plynulejší, nikoli jasnější. Nejlépe se hodí u krátkých závěrek, kde jediný průchod nasbírá jen hrstku vzorků.',
			reshade:
				'Dlouhá expozice snímá nativně a nepoužívá ReShade, takže efekty ReShade se ve výsledku neobjeví.',
		},
	},

	help: {
		title: 'Nápověda',
		sections: 'Sekce nápovědy',
		tabGeneral: 'Obecné',
		tabLongExposure: 'Dlouhá expozice',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'Nastavení iRacingu',
			borderless: 'iRacing musí běžet v režimu Windowed Borderless',
			vram: 'Pro snímky v rozlišení 8K a vyšším se doporučuje alespoň 8 GB paměti VRAM',
			newerContent: 'Novější tratě a vozy vyžadují více paměti VRAM',
			shrinkUi:
				'Pokud používáte volbu oříznutí vodoznaku, zmenšete před pořízením snímku uživatelské rozhraní na minimum — zkratka „Control+PageDown“ ho zmenší. Pokud to nefunguje, možná bude nutné obnovit přiblížení rozhraní v nastavení iRacingu.',

			screenshotFolder: 'Složka pro snímky',
			screenshotFolderBody:
				'Snímky se ve výchozím nastavení ukládají do „C:\\Users\\user\\Pictures\\Screenshots“; to lze změnit v nastavení.',

			screenshotHotkey: 'Klávesová zkratka snímku',
			screenshotHotkeyBody:
				'Ve výchozím nastavení pořídí „Control + PrintScreen“ snímek s aktuálním nastavením; zkratku lze změnit v nastavení.',

			issues: 'Problémy',
			issuesBody: 'Pokud narazíte na potíže, nahlaste je prosím na',
			discord: 'Discordu',

			instructions: 'Postup',
			step1: 'iRacing <b>musí</b> běžet v režimu Windowed Borderless',
			step2: 'Spusťte iRacing a nastavte kameru do pozice, ze které chcete snímek pořídit',
			step3: 'Zvolte požadované rozlišení (než přejdete na 8K, vyzkoušejte nižší rozlišení)',
			step4: 'Rozhodněte se, zda chcete oříznout vodoznak iRacingu; pokud ano, zmenšete nejprve rozhraní iRacingu zkratkou „Control + PageDown“ na nejmenší velikost',
			step5: 'Stiskněte tlačítko snímku nebo použijte zkratku „Control + PrintScreen“',
			step6: 'Podle zvoleného rozlišení to může trvat několik sekund; jakmile se okno iRacingu vrátí do normální velikosti, je hotovo',
			step7: 'Váš snímek se uloží do „C:\\Users\\{User}\\Pictures\\Screenshots“',
		},

		longExposure: {
			whatItDoes: 'Co to dělá',
			whatItDoesBody:
				'Dlouhá expozice sloučí mnoho snímků záznamu do jednoho obrazu, stejně jako ponechaná otevřená závěrka fotoaparátu: nehybné věci zůstanou ostré, pohybující se se rozmažou do stop. Nástroj sám řídí záznam, zachytí každý snímek, který simulátor vykreslí, a sečte je na GPU.',

			shutter: 'Závěrka',
			shutterBody:
				'Jak dlouho expozice trvá <i>v čase záznamu</i>, od zlomku jednoho snímku záznamu až po deset sekund. Právě toto nastavení určuje délku stop. Delší závěrky zároveň nasbírají více snímků, takže potřebují méně pomoci od všeho ostatního níže; nejrychlejší hodnoty pokrývají jediný snímek záznamu a nasbírají jen hrstku vzorků.',

			playback: 'Rychlost přehrávání',
			playbackBody:
				'Během snímání expozice se záznam přehrává zpomaleně, takže simulátor vykreslí více snímků na sekundu času záznamu a sloučení získá více vzorků. 1/16 nasbírá zhruba šestnáctkrát více snímků než reálný čas — a trvá šestnáctkrát déle reálného času. To je hlavní kompromis tohoto panelu: trpělivost za hladkost.',
			playbackAutoBody:
				'„Automaticky (podle cílového počtu vzorků)“ zvolí rychlost za vás podle <b>cílového počtu vzorků</b>: nástroj najde nejrychlejší přehrávání, které ještě dosáhne požadovaného počtu. Pokud raději omezíte čekání, zadejte konkrétní rychlost.',

			weighting: 'Vážení',
			weightingBody:
				'Jak moc každý zachycený snímek přispívá k výsledku. <b>Box</b> je váží všechny stejně a dává rovnoměrnou stopu. <b>Lineární</b> stoupá ke konci okna, takže objekt je nejostřejší tam, kde skončil, a podél své dráhy slábne. <b>Ease</b> je totéž s ostřejším začátkem a delším ohonem.',

			passes: 'Průchody',
			passesBody:
				'Navštíví tentýž okamžik několikrát a sčítá vše do jednoho obrazu. Každý průchod zachytí snímky, které ostatní minuly, takže stopa je hladší — nikoli jasnější, protože výsledek se normalizuje podle množství světla, které na každý pixel skutečně dopadlo.',
			passesTradeBody:
				'Průchody směňují čas čekání za vzorky: osm průchodů trvá zhruba osmkrát déle a každý vzorek, který přidají, je skutečný snímek. Proto jsou správnou pákou u krátkých závěrek, kde jediný průchod nasbírá velmi málo vzorků, a při vysokých rozlišeních, kdy iRacing za jeden průchod vykreslí méně snímků.',

			bracket: 'Braketing závěrek',
			bracketBody:
				'Z jediného snímání vytvoří jeden obraz pro každou hodnotu závěrky stejnou nebo rychlejší, než jakou jste zvolili. Snímek při 1/60 vám dá i 1/125, 1/250, 1/500 a 1/1000 — tentýž okamžik s postupně kratšími stopami — takže si výsledek vyberete až potom, místo abyste hádali a snímek opakovali.',
			bracketCostBody:
				'Nestojí to téměř žádný čas navíc. Každá hodnota končí na tomtéž snímku a liší se jen tím, jak daleko sahá zpět, takže rychlejší závěrka je prostě konec snímků, které stejně procházejí — všechny se plní z jediného průchodu záznamu.',
			bracketMemoryBody:
				'Co to naopak stojí, je paměť. Každá hodnota potřebuje vlastní akumulátor v plném rozlišení, takže jedenáct hodnot potřebuje jedenáctkrát více grafické paměti než jedna, což je v 8K více, než má většina karet. Snímání to před spuštěním zkontroluje a raději odmítne, než aby shodilo iRacing; pokud je braketing odmítnut, snižte rozlišení nebo zvolte rychlejší závěrku — což zároveň zkrátí žebřík.',
			bracketNamingBody:
				'Hodnota, kterou jste zvolili, se uloží pod obvyklým názvem a je to ta, která se objeví v galerii; ostatní leží vedle ní a mají svou závěrku v názvu souboru.',

			warmUp: 'Zahřátí efektů',
			warmUpBody:
				'Vyvržená hlína, kouř z pneumatik, plameny z výfuku a rozmazání rotujících kol se v záznamu neukládají — iRacing je simuluje při přehrávání a zmizí pokaždé, když záznam skočí. Proto se před každým průchodem záznam přetočí o kousek dál a po tuto dobu se přehrává normální rychlostí, těsně před začátkem expozice se pak zpomalí, takže efekty už při jejím začátku existují. Stojí to zhruba tolik sekund na průchod. Zvyšte hodnotu, pokud kouř z pneumatik na začátku stopy stále řídne; vypněte ji, jen pokud chcete staré chování.',

			highlights: 'Obnova světel',
			highlightsBody:
				'Zesílí světla blízko přepalu ještě před sečtením snímků a na konci zesílení zase odstraní. iRacing předává obraz, na který už bylo použito mapování tónů, takže světlomet a bílá zeď dorazí se stejnou hodnotou; jejich zprůměrováním se z jasného světla procházejícího částí expozice stane šedá šmouha místo jasné stopy. Toto vrací nelinearitu tam, kde ji má skutečný snímač. Měří se v EV; 0 znamená vypnuto a nemění vůbec nic.',

			whatItSaves: 'Co ukládá',
			whatItSavesBody:
				'Velikost, oříznutí vodoznaku i formát souboru se řídí stejnými ovládacími prvky jako běžný snímek — nastavením Rozlišení a Oříznout vodoznak výše a výstupním formátem v nastavení. Řádek „Výstup“ v horní části postranního panelu ukazuje přesně to, co dostanete.',
			whatItSavesPngBody:
				'Volba PNG zapíše skutečný 16bitový master, což se vyplatí, pokud chcete snímek později barevně upravovat, plus 8bitový náhled pro galerii. Zápis je také mnohem pomalejší při vysokých rozlišeních — 16bitový PNG o 33 megapixelech trvá kolem deseti sekund, zatímco tentýž snímek v JPEG méně než jednu.',

			troubleshooting: 'Pokud výsledek vypadá špatně',
			troubleGhosts:
				'<b>Oddělené duchy místo plynulé stopy</b> — příliš málo vzorků. Použijte pomalejší rychlost přehrávání, více průchodů nebo nižší rozlišení.',
			troubleShutter:
				'<b>Nevíte, jakou závěrku jste chtěli</b> — zapněte braketing závěrek a rozhodněte se až potom, při stejném čekání.',
			troubleHighlights:
				'<b>Přepálená nebo plochá světla</b> — zkuste 3 až 5 EV obnovy světel.',
			troubleBlack:
				'<b>Černý obraz</b> — iRacing běží ve výhradním celoobrazovkovém režimu. Nastavte Display &gt; Full Screen na OFF.',
			troubleSidecar:
				'Každý snímek zaznamená přesně použité nastavení, počet vzorků a to, jak rovnoměrně byly rozloženy, do souboru .json ve složce protokolů vedle app.log. Uchovává se posledních 20 snímků — braketing se počítá jako jeden — takže snímek, na který se ptáte, tam ještě je, zatímco se na něj ptáte.',
		},

		faq: {
			blackShot: 'Snímek je černý, ale rozhraní iRacingu je na něm vidět',
			blackShotBody:
				'Samotné zachycení proběhlo v pořádku: rozhraní se vykreslilo, takže do nástroje dorazil skutečný snímek. Chybí 3D scéna, protože ji iRacing vykreslil černě. Dělá to několik méně obvyklých kamer — nejčastěji kamera zavěšení. Přepněte na běžnou kameru (kokpit, sledovací nebo některou z TV kamer) a zachyťte stejný okamžik znovu.',
			blackShotFullscreenBody:
				'Pokud je obraz černý <i>včetně</i> rozhraní a všechny kamery se chovají stejně, je příčina jiná: iRacing běží ve výhradním celoobrazovkovém režimu, který nic mimo simulátor nezachytí. Nastavte Display &gt; Full Screen na OFF.',

			cameraReset: 'iRacing mi před pořízením snímku přesune kameru',
			cameraResetBody:
				'To je vlastní automatický výběr záběrů iRacingu, ne tento nástroj. Dokud je zapnutý, iRacing si kamery vybírá sám a ve chvíli, kdy zachycení začne, se vrátí k výchozímu záběru, takže nedostanete snímek, který jste si připravili.',
			cameraResetFixBody:
				'Vypněte jej v nástroji kamer iRacingu (Ctrl+F12) v <b>Camera &gt; Config &gt; Preferences</b>: přepínač <b>Shot Selection</b> označený <b>Automatic</b>. Když je vypnutý, kamera zůstane přesně tam, kam jste ji dali — u běžných snímků obrazovky i u dlouhých expozic.',

			tripleBands: 'There are vertical bands in my triple-screen shots',
			tripleBandsBody:
				'They are a side effect of two iRacing settings working together: multi-projection (the SMP setting) and bezel correction. On the monitors themselves the picture looks right — the correction exists to line the scene up across the physical frames — but in the captured image the corrected regions show up as vertical bands where one screen meets the next.',
			tripleBandsFixBody:
				"Either change fixes it: set the <b>bezel width</b> to <b>0 mm</b> in iRacing's graphics options, which takes effect immediately, or turn off <b>multi-projection (SMP)</b>, which takes effect after an iRacing restart.",
		},
	},

	update: {
		checking: 'Kontroluji aktualizace…',
		newVersion: 'Nová verze',
		availableBusy:
			'{version} je k dispozici. Probíhá snímání — stáhnout ji půjde, jakmile skončí.',
		available: '{version} je k dispozici. Kliknutím ji stáhnete.',
		downloading: 'Stahuji {version}…',
		downloadingPercent: 'Stahuji {version} — {percent} %',
		downloadedBusy:
			'{version} je připravena. Probíhá snímání, takže se nainstaluje při zavření aplikace.',
		downloaded:
			'{version} je připravena. Kliknutím restartujete a nainstalujete.',
		failed: 'Kontrola aktualizací se nezdařila: {error}',
		unknownError: 'neznámá chyba',
		neverChecked: 'Aktualizace zatím nebyly kontrolovány.',
		upToDate: 'Máte nejnovější verzi.',

		alreadyDownloading: 'Aktualizace se již stahuje.',
		alreadyDownloaded: 'Aktualizace už byla stažena.',
		nothingToDownload: 'Není k dispozici žádná aktualizace ke stažení.',
		captureInProgress: 'Probíhá snímání. Zkuste to znovu, až skončí.',
		nothingToInstall: 'Žádná aktualizace není připravena k instalaci.',
		captureInProgressInstall:
			'Probíhá snímání. Aktualizace se nainstaluje sama, až aplikaci zavřete.',
		devBuildOnly: 'Kontrola aktualizací funguje jen v nainstalované verzi.',

		installTitle: 'Instalovat aktualizaci',
		installMessage: 'Nainstalovat verzi {version}?',
		installFallbackVersion: 'aktualizaci',
		installDetail:
			'Aplikace se po instalaci aktualizace zavře a znovu otevře. Pokud zvolíte „Později“, nainstaluje se sama při příštím zavření aplikace.',
		installConfirm: 'Restartovat a nainstalovat',
		installLater: 'Později',
	},

	filenameFields: {
		categories: {
			Track: 'Trať',
			Driver: 'Jezdec',
			Session: 'Relace',
			Meta: 'Meta',
		},
		track: 'Trať',
		trackFull: 'Trať (plný název)',
		trackCity: 'Město',
		trackCountry: 'Země',
		trackType: 'Typ trati',
		driver: 'Jezdec',
		driverAbbrev: 'Jezdec (zkratka)',
		driverInitials: 'Iniciály',
		team: 'Tým',
		carNumber: 'Č. vozu',
		car: 'Vůz',
		carFull: 'Vůz (plný název)',
		carClass: 'Třída vozu',
		iRating: 'iRating',
		sessionType: 'Typ relace',
		sessionName: 'Název relace',
		lap: 'Kolo',
		date: 'Datum',
		time: 'Čas',
		datetime: 'Datum+čas',
		counter: 'Počítadlo',
	},

	iracingConfig: {
		projections:
			'Vypněte „Render Scene Using 3 Projections“ v iRacingu (karta Display > Monitor), abyste na snímcích předešli svislým pruhům',
	},

	graphicsProfiles: {
		title: 'Grafické profily',
		iracingRunning:
			'Před přepnutím zavřete iRacing. Při ukončení přepíše svou konfiguraci grafiky, čímž by změnu vrátil zpět.',
		activeHeading: 'Aktuální konfigurace',
		active: {
			clean: 'Odpovídá profilu {name}.',
			modified: {
				one: 'Vychází z profilu {name}, od té doby se změnilo {count} nastavení.',
				few: 'Vychází z profilu {name}, od té doby se změnila {count} nastavení.',
				other: 'Vychází z profilu {name}, od té doby se změnilo {count} nastavení.',
			},
			modifiedUnknownCount:
				'Vychází z profilu {name}, od té doby byl změněn.',
			unknown: 'Neodpovídá žádnému uloženému profilu.',
			missing: 'Nebyla nalezena žádná konfigurace grafiky iRacingu.',
		},
		badge: {
			active: 'Aktivní',
			modified: 'Změněno',
		},
		picker: {
			unknown: 'Žádný odpovídající profil',
			missing: 'Žádná konfigurace',
		},
		empty: {
			title: 'Zatím nejsou uloženy žádné profily.',
			body: 'Uložte aktuální konfiguraci iRacingu jako profil nebo importujte existující soubor .ini.',
		},
		invalidProfile: 'Není konfigurace grafiky',
		warnings: {
			autoCfgIncomplete: 'iRacing jej resetuje',
		},
		actions: {
			load: 'Načíst',
			overwrite: 'Aktualizovat z aktuální',
			rename: 'Přejmenovat',
			export: 'Exportovat',
			delete: 'Smazat',
			save: 'Uložit',
			cancel: 'Zrušit',
			saveCurrent: 'Uložit aktuální jako…',
			import: 'Importovat…',
			openFolder: 'Otevřít složku',
		},
		prompt: {
			namePlaceholder: 'Název profilu',
			deleteConfirm: 'Smazat {name}?',
		},
		feedback: {
			loaded: 'Profil {name} byl načten. Aby se projevil, spusťte iRacing.',
			saved: 'Uloženo jako {name}.',
			overwritten: 'Profil {name} byl aktualizován z aktuální konfigurace.',
			renamed: 'Přejmenováno na {name}.',
			deleted: 'Profil {name} byl smazán.',
			imported: 'Importováno jako {name}.',
			exported: 'Profil {name} byl exportován.',
		},
		errors: {
			empty: 'Zadejte název profilu.',
			illegalCharacters:
				'Název profilu nesmí obsahovat žádný z těchto znaků: < > : " / \\ | ? *',
			reservedName: 'Tento název je ve Windows vyhrazen. Zvolte jiný.',
			trailingDotOrSpace: 'Název profilu nesmí končit tečkou ani mezerou.',
			tooLong: 'Tento název je příliš dlouhý.',
			duplicate: 'Profil s tímto názvem již existuje.',
			profileNotFound: 'Tento profil se již nepodařilo najít.',
			profileExists: 'Profil s tímto názvem již existuje.',
			duplicateContent:
				'Profil s přesně tímto nastavením již existuje: {name}.',
			noActiveConfig:
				'Nebyla nalezena žádná konfigurace grafiky iRacingu k uložení.',
			invalidIni:
				'Tento soubor není konfigurací grafiky iRacingu, proto nebyl použit.',
			iracingRunning:
				'Nejprve zavřete iRacing — při ukončení by změnu přepsal.',
			ioError: 'Soubor se nepodařilo zapsat. Nic nebylo změněno.',
		},
	},

	wgc: {
		cursorCaveat:
			'V této verzi Windows se může na snímcích objevit kurzor myši. Windows 10 verze 2004 přidaly nastavení, které jej skrývá.',
		addonUnavailable:
			'Komponentu pro snímání ve vysoké věrnosti se v tomto systému nepodařilo načíst.',
		osUnsupported:
			'Windows.Graphics.Capture není v této verzi Windows dostupné. Vyžaduje Windows 10 verze 1903 nebo novější.',
		nativeCaptureOff: 'Snímání ve vysoké věrnosti (WGC) je vypnuté',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing běží ve výhradním celoobrazovkovém režimu, takže snímek by byl černý. V iRacingu nastavte Display > Full Screen na OFF (použijte Borderless nebo Windowed) a zkuste to znovu.',
		exclusiveFullscreenUnattributed:
			'Nějaká aplikace běží ve výhradním celoobrazovkovém režimu, což vede k černému snímku. Pokud je iRacing v celoobrazovkovém režimu, nastavte Display > Full Screen na OFF (použijte Borderless nebo Windowed) a zkuste to znovu.',
		blockedElevated:
			'Windows blokuje snímání obrazovky, dokud iRacing Screenshot Tool běží jako správce. Zavřete nástroj, klikněte pravým tlačítkem na iRacing Screenshot Tool.exe > Vlastnosti > Kompatibilita, zrušte zaškrtnutí „Spustit tento program jako správce“ (zaškrtněte i „Změnit nastavení pro všechny uživatele“) a poté nástroj spusťte běžným způsobem.',
		blockedDenied:
			'Windows odmítá snímání obrazovky pro tuto aplikaci ({hresult}). Může to blokovat nastavení ochrany osobních údajů, firemní zásady nebo bezpečnostní software v tomto počítači. Režimu kompatibility s ReShade se to netýká.',
		reshadeIniMissing:
			'Konfigurace ReShade nebyla nalezena na {path}. V Nastavení vyberte svůj soubor ReShade.ini — nachází se ve složce, do které byl ReShade nainstalován, hned vedle iRacingSim64DX11.exe — nebo vypněte Režim kompatibility s ReShade.',
		reshadeIniUnreadable:
			'Konfiguraci ReShade na {path} se nepodařilo přečíst. Zkontrolujte, zda k ní máte oprávnění ke čtení, nebo v Nastavení vyberte jiný soubor ReShade.ini.',
		reshadeIniPreset:
			'{path} je předvolba (preset) ReShade, ne jeho vlastní konfigurace. Předvolby obsahují nastavení efektů a neobsahují složku pro snímky obrazovky. V Nastavení místo toho vyberte ReShade.ini — je ve stejné složce — nebo vypněte Režim kompatibility s ReShade.',
		reshadeIniNoSavePath:
			'ReShade nemá v {path} nastavenou složku pro snímky obrazovky. Otevřete překryvnou vrstvu ReShade v iRacingu, přejděte na kartu Nastavení a nastavte cestu pro snímky obrazovky, poté zkuste znovu.',
		reshadeIniNotConfig:
			'{path} není konfigurační soubor ReShade. V Nastavení vyberte svůj soubor ReShade.ini — nachází se ve složce, do které byl ReShade nainstalován, hned vedle iRacingSim64DX11.exe — nebo vypněte Režim kompatibility s ReShade.',
		unknownError: 'Neznámá chyba snímku obrazovky',
		outputTooSmall: 'Snímek je příliš malý ({width}x{height})',
		blackFrame:
			'Zachycený snímek je černý — zdroj snímání mohl selhat (na některých konfiguracích Windows se obsah akcelerovaný GPU nedaří zachytit)',
		noSource: 'Pro okno {windowId} nebyl nalezen žádný zdroj snímání plochy',
		metadataTimeout: 'Vypršel čas při čekání na metadata videa snímání',
		noVideoFrame: 'Snímací datový tok nevrátil žádný snímek videa',
		dimensionTimeout:
			'Vypršel čas při čekání na rozměry okna {width}x{height}; pokračuji s {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'Snímání již probíhá.',
		needsNativeCapture:
			'Dlouhá expozice vyžaduje snímání ve vysoké věrnosti (WGC). Zapněte je v nastavení, abyste ji mohli použít.',
		unavailable: 'Dlouhá expozice není na tomto počítači dostupná.',
		noTelemetry:
			'Dlouhá expozice vyžaduje telemetrii záznamu z iRacingu. Zkontrolujte, že simulátor běží a je v relaci.',
		windowNotFound: 'Okno iRacingu nebylo nalezeno.',
		cancelled: 'Snímání zrušeno.',
		seekTimeout:
			'Záznam nedosáhl snímku {frame} včas. Možná se ještě načítá.',
		warmUpFellBack:
			'Záznam se po zahřátí efektů nepodařilo včas zpomalit, proto byl tento snímek pořízen bez něj. Na začátku stopy může chybět kouř, hlína a rotace kol.',
		noPasses: 'Snímání musí provést alespoň jeden průchod.',
		playbackStalled:
			'Záznam se nerozeběhl. Zkontrolujte, že iRacing nebyl pozastaven jiným nástrojem.',
		exposureTimeout: 'Expozice nedosáhla snímku {frame} do {seconds} s.',
		endedEarly: 'Expozice skončila dříve, než dosáhla zvoleného okamžiku.',
		noFramesPresented: 'iRacing nevykreslil žádné snímky k zachycení.',
		subFrameNoSamples:
			'Tato závěrka je kratší než jeden snímek záznamu a iRacing v ní žádný snímek nevykreslil. Zkuste pomalejší rychlost přehrávání nebo nejbližší pomalejší závěrku.',
		noSamples:
			'Nebyly nasbírány žádné snímky. iRacing možná během expozice přestal vykreslovat.',
		blankCapture:
			'Každý zachycený snímek byl černý, takže není co uložit. Zkontrolujte, že iRacing běží v okně nebo v režimu bez okrajů, a ne ve výhradním celoobrazovkovém režimu, a že mu při tomto rozlišení zbývá volná videopaměť — nejrychleji to ověříte nižším rozlišením snímku.',
		frozenCapture:
			'iRacing během expozice zobrazil {samples} snímků, ale všechny byly stejné, takže tento obrázek je statický snímek, nikoli dlouhá expozice. iRacing během přehrávání záznamu nevykreslil nic nového.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'GPU nevrátila žádný obraz.',
		bracketShortfall:
			'Braketing si vyžádal {asked} hodnot, ale vrátilo se jich {returned} — zbytek se nepodařilo vyřešit, nebo je tato verze snímací komponenty starší než braketing.',
	},

	validation: {
		windowBeforeStart:
			'Expozice potřebuje {frames} snímků záznamu před zvoleným okamžikem, ten je však jen {anchor} snímků od začátku záznamu. Zvolte pozdější okamžik nebo rychlejší závěrku.',
		pastEnd: 'Zvolený okamžik leží za koncem záznamu.',
		sessionChanged:
			'Záznam od přípravy tohoto snímku přešel do jiné relace. Zvolte okamžik znovu.',
		singleSampleMultiPass:
			'Tato závěrka je tak krátká, že do ní na jeden průchod padne asi jediný snímek, takže {passes} průchodů nasbírá zhruba {passes} vzorků. Pomalejší rychlost přehrávání nebo pomalejší závěrka přinesou mnohem víc.',
		warmUpShortened:
			'Tento okamžik je blízko začátku záznamu, proto je zahřátí efektů zkráceno na {seconds} s. Na začátku stopy může chybět kouř, hlína a rotace kol.',
		singleSample:
			'Tato závěrka je tak krátká, že do ní padne jen jediný snímek, takže výsledek nebude mít žádné rozmazání pohybem. Pomalejší rychlost přehrávání nebo pomalejší závěrka přinesou vzorky.',
		shortOfTarget:
			'I při rychlosti 1/{divisor} dosáhne tato expozice zhruba {samples} vzorků, méně než požadovaných {target}. Pro více použijte pomalejší závěrku.',
		longCaptureEscalate:
			'Toto snímání přehrává záznam rychlostí 1/{divisor} po dobu přibližně {duration} reálného času{passSuffix} a po spuštění je nelze urychlit. {advice}',
		longCaptureWarn:
			'Toto snímání potrvá přibližně {duration} reálného času při rychlosti přehrávání 1/{divisor}{passSuffix}.',
		passSuffix: ', rozložených do {passes} průchodů přes tentýž okamžik',
		adviceFewerPasses: 'Méně průchodů skončí dříve, s méně vzorky.',
		adviceFasterPlayback:
			'Vyšší rychlost přehrávání skončí dříve, s méně vzorky.',
		pastLogCap:
			'Očekává se, že toto snímání nasbírá asi {samples} vzorků během {passes} průchodů, což je více než {cap}, které pojme diagnostický protokol. Obrazu se to nedotkne — jen údaje o rovnoměrnosti a mezerách popíšou první část snímání.',
	},

	duration: {
		zero: '0 sekund',
		seconds: {
			one: '{count} sekunda',
			few: '{count} sekundy',
			many: '{count} sekundy',
			other: '{count} sekund',
		},
		minutes: {
			one: '{count} minuta',
			few: '{count} minuty',
			many: '{count} minuty',
			other: '{count} minut',
		},
		minutesSeconds: '{minutes} min {seconds} s',
	},

	// The navigation rail’s tooltips.
	nav: {
		home: 'Snímky obrazovky',
	},
};

export default cs;
