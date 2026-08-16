// Finnish. Translated from en.ts — see that file's header before editing.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.
//
// Finnish takes the partitive singular after a number greater than one
// ("2 näytettä", not "2 näytteet"), so the `other` forms below are partitive
// singulars rather than nominative plurals.

import type { Catalog } from './index';

const fi: Catalog = {
	notice: {
		danger: 'Ongelmat',
		warning: 'Hyvä tietää',
		info: 'Huomautukset',
	},

	promo: {
		greeting: 'Kiitos, että käytät iRacing Screenshot Toolia!',
		signature: 'Rakentanut ja ylläpitää AR Media Solutions.',
	},

	changelog: {
		title: 'Muutosloki',
		untitledRelease: 'Versio',
	},

	gallery: {
		menu: {
			openExternally: 'Avaa toisessa sovelluksessa',
			openFolder: 'Avaa kansio',
			copy: 'Kopioi',
			delete: 'Poista',
		},
		copiedToClipboard: '{name} kopioitu leikepöydälle',
	},

	sidebar: {
		resolution: 'Tarkkuus',
		width: 'Leveys',
		height: 'Korkeus',
		output: 'Tuloste:',
		cropWatermark: 'Rajaa vesileima',
		keepAspectRatio: 'Säilytä kuvasuhde',
		screenshot: 'Kuvakaappaus',
		custom: 'Mukautettu',
		vramStatus: '{adapter}{free} vapaana / {total}',
		savedSuccessfully: '{name} tallennettiin',
		screenshotFailed: 'Kuvakaappaus epäonnistui: {message}',
		errorLogPrefix: 'Loki: ',
		notices: {
			exclusiveFullscreen:
				'iRacing on yksinomaisessa koko näytön tilassa — kuvakaappauksista tulee mustia. Aseta iRacingissa Display > Full Screen tilaan OFF (Borderless tai Windowed), jotta kaappaus onnistuu.',
			vramRisk:
				'{resolution} vaatii noin {needed} lisää VRAM-muistia, mutta vapaana on vain {free} — iRacingilta loppuu todennäköisesti muisti ja se kaatuu.',
			vramCaution:
				'{resolution} jättää vain vähän VRAM-varaa ({free} vapaana) ja voi kaatua raskailla rata- ja autoyhdistelmillä.',
			switchResolution: 'Vaihda tarkkuuteen {resolution}',
			vramStatic:
				'Suuret tarkkuudet voivat kaataa iRacingin, jos VRAM loppuu. Tietyt rata- ja autoyhdistelmät vaativat enemmän VRAM-muistia.',
			reshade:
				'Kun olet painanut kuvakaappauspainiketta iRacing Screenshot Toolissa, sinun on vielä painettava ReShaden kuvakaappauspikanäppäintä.',
			crop: 'Vesileiman rajaus zoomaa lopullista kuvaa hieman sisäänpäin. Näytön reunojen lähellä olevat alueet leikkautuvat pois.',
			aspectRatio:
				'”Säilytä kuvasuhde” sovittaa kuvakaappauksen korkeuden näyttösi kuvasuhteeseen (esimerkiksi 21:9 ultralaaja) oletusarvoisen 16:9:n sijaan. Valittu tarkkuus määrää leveyden.',
		},
	},

	settings: {
		title: 'Asetukset',
		version: 'Versio - {version}',
		changelog: 'Muutosloki',
		openLogsFolder: 'Avaa lokikansio',
		checkForUpdates: 'Tarkista päivitykset',
		updateCheckFailed: 'Päivitysten tarkistus epäonnistui: {message}',

		language: 'Kieli',
		languageDescription:
			'Koko sovelluksessa käytettävä kieli. Tunnistetaan Windowsista sovelluksen ensimmäisellä käynnistyskerralla.',

		screenshotFolder: 'Kuvakaappauskansio',
		selectFolder: 'Valitse kansio',
		screenshotKeybind: 'Kuvakaappauksen pikanäppäin',
		editBind: 'Muokkaa pikanäppäintä',

		customFilenameFormat: 'Mukautettu tiedostonimimuoto',
		customFilenameFormatDescription:
			'Käytä omaa mallia oletusmuodon sijaan ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Lisää kenttiä muotoon napsauttamalla niitä. Kirjoita erottimet (-, _ jne.) suoraan.',
		reset: 'Palauta',
		preview: 'Esikatselu:',

		outputFormat: 'Tulostemuoto',
		formatJpeg: 'JPEG (paras laatu)',
		formatPng: 'PNG (häviötön)',
		formatWebp: 'WebP (laatu 95 %)',

		disableTooltips: 'Piilota vinkit',
		disableTooltipsDescription: 'Anna minun olla, tiedän mitä teen',

		cropTopLeft: 'Suosi vesileiman rajausta vasemmasta yläkulmasta',
		cropTopLeftDescription:
			'Rajaa vain oikean alakulman (3 %). Kun asetus on pois päältä, kuvakaappaus rajataan tasaisesti kaikilta sivuilta (yhteensä 6 %), jolloin tulos on keskitetty.',

		manualWindowRestore: 'Ikkunan manuaalinen palautus',
		manualWindowRestoreDescription:
			'Korvaa automaattisen ikkunan palautuksen omalla sijainnilla ja koolla. Hyödyllinen ultralaajoilla näytöillä tai Nvidia Surroundissa.',
		left: 'Vasen',
		top: 'Ylä',
		width: 'Leveys',
		height: 'Korkeus',
		restoreNow: 'Palauta nyt',

		nativeCapture: 'Korkealaatuinen kaappaus (WGC)',
		nativeCaptureDescription:
			'Kaappaa aidon, alinäytteistämättömän värin Windows.Graphics.Capturen kautta oletusreitin sijaan (joka alinäytteistää värin). Palaa automaattisesti varareitille, jos kaappaus epäonnistuu.',
		nativeCaptureUnavailable:
			'Ei käytettävissä tässä järjestelmässä — korkealaatuinen kaappaus ei voi toimia täällä.',
		nativeCaptureUnverified:
			'Windows ilmoittaa tuen olevan olemassa, mutta testikaappaus ei palannut. Kaappaukset siirtyvät automaattisesti varareitille, jos vika toistuu.',

		reshade: 'ReShade-yhteensopivuustila',
		reshadeDescription:
			'ReShadea käytettäessä sinun on ensin käytettävä iRacing Screenshot Toolin pikanäppäintä tai painettava painiketta, ja sen jälkeen — kun iRacing-ikkunan koko on muuttunut — käytettävä ReShaden kuvakaappauspikanäppäintä.',
		reshadeIni: 'ReShaden INI-tiedosto',
		selectFile: 'Valitse tiedosto',
	},

	longExposure: {
		title: 'Pitkä valotus',
		shutter: 'Suljinaika',
		playbackSpeed: 'Toistonopeus',
		playbackAuto: 'Automaattinen (näytetavoitteen mukaan)',
		playbackRealTime: '1x (reaaliaika)',
		targetSamples: 'Näytetavoite',
		advanced: 'Lisäasetukset',
		defaultsSummary: '{count} oletusarvoa',

		weighting: 'Painotus',
		weightingBox: 'Box (tasainen)',
		weightingLinear: 'Lineaarinen (terävä lopussa)',
		weightingEase: 'Ease (terävämpi alku, pitkä häntä)',

		interpolation: 'Ruutuinterpolointi',
		interpolationOff: 'Pois',
		interpolation2: '2× (yksi väliruutu)',
		interpolation4: '4× (kolme väliruutua)',
		interpolation8: '8× (seitsemän väliruutua)',

		passes: 'Ajokerrat',
		passes1: '1 (yksi ajokerta)',
		passes2: '2× — kaksinkertainen odotus',
		passes4: '4× — nelinkertainen odotus',
		passes8: '8× — kahdeksankertainen odotus',

		bracket: 'Suljinaikahaarukointi',
		highlightRecovery: 'Huippuvalojen palautus (aukkoa)',

		cancel: 'Peruuta',
		saved: 'Pitkä valotus tallennettu — {count} näytettä',
		failed: 'Pitkä valotus epäonnistui',

		modified: {
			weighting_linear: 'lineaarinen',
			weighting_ease: 'ease',
			interpolation: '{factor}× interpolointi',
			passes: {
				one: '{count} ajokerta',
				other: '{count} ajokertaa',
			},
			bracketed: 'haarukointi',
			recovery: '{stops} aukon palautus',
		},

		progress: {
			working: 'Työstetään…',
			seeking: 'Haetaan…{pass}',
			accumulating: 'Valotetaan… {count} näytettä{pass}',
			resolving: 'Kehitetään…',
			restoring: 'Palautetaan uusintaa…',
			pass: ' (ajokerta {current}/{total})',
		},

		notices: {
			needsNativeCapture:
				'Pitkä valotus vaatii korkealaatuisen kaappauksen (WGC), joka on nyt pois päältä. Ota se käyttöön asetuksista, jotta voit käyttää pitkää valotusta.',
			unavailableWithReason:
				'Pitkä valotus ei ole käytettävissä tällä koneella: {reason}',
			unavailable: 'Pitkä valotus ei ole käytettävissä tällä koneella.',
			interpolationCost:
				'Interpolointi keksii ruutuja oikeiden väliin tasoittaakseen juovaa. Se kuluttaa GPU-aikaa jokaista ruutua kohden, joten vertaa tallennetun otoksen oikeiden näytteiden määrää samaan otokseen ilman interpolointia — jos luku laskee, se ostaa keksittyjä näytteitä oikeilla.',
			passesAndInterpolation:
				'Ajokerrat ja interpolointi kilpailevat samasta ruutukohtaisesta budjetista. Kun molemmat ovat päällä, jokainen ajokerta kaappaa vähemmän oikeita ruutuja — interpoloinnin poistaminen tuottaa yleensä paremman otoksen samalla odotusajalla.',
			passes:
				'Jokainen ajokerta toistaa saman hetken uudelleen ja nappaa ruutuja, jotka muut jäivät vaille, joten juova tasoittuu eikä kirkastu. Toimii parhaiten lyhyillä suljinajoilla, joilla yksi ajokerta kerää vain kourallisen näytteitä.',
			interpolationUnsupported:
				'Ruutuinterpolointi vaatii NVIDIA Turing -näytönohjaimen tai uudemman{adapter}. Kaikki muu pitkässä valotuksessa toimii normaalisti.',
			interpolationAdapter: ' (tämä kaappaus ajetaan laitteella {adapter})',
			reshade:
				'Pitkä valotus kaappaa natiivisti eikä käytä ReShadea, joten ReShade-tehosteet eivät näy lopputuloksessa.',
		},
	},

	help: {
		title: 'Ohje',
		sections: 'Ohjeen osiot',
		tabGeneral: 'Yleistä',
		tabLongExposure: 'Pitkä valotus',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'iRacingin asetukset',
			borderless: 'iRacingin on oltava Windowed Borderless -tilassa',
			vram: 'Vähintään 8 Gt VRAM-muistia suositellaan 8K:n tai suurempien kuvakaappausten ottamiseen',
			newerContent: 'Uudemmat radat ja autot vaativat enemmän VRAM-muistia',
			shrinkUi:
				'Pienennä käyttöliittymä mahdollisimman pieneksi ennen kuvakaappausta, jos käytät vesileiman rajausta; ”Control+PageDown” pienentää sitä. Jos se ei toimi, saatat joutua palauttamaan käyttöliittymän zoomauksen iRacingin asetuksista.',

			screenshotFolder: 'Kuvakaappauskansio',
			screenshotFolderBody:
				'Kuvakaappaukset tallennetaan oletuksena kansioon ”C:\\Users\\user\\Pictures\\Screenshots”; tämän voi vaihtaa asetuksista.',

			screenshotHotkey: 'Kuvakaappauksen pikanäppäin',
			screenshotHotkeyBody:
				'Oletuksena ”Control + PrintScreen” ottaa kuvakaappauksen nykyisillä asetuksilla; tämän voi vaihtaa asetuksista.',

			issues: 'Ongelmat',
			issuesBody: 'Jos kohtaat ongelmia, ilmoita niistä',
			discord: 'Discordissa',

			instructions: 'Ohjeet',
			step1: 'iRacingin <b>on</b> oltava Windowed Borderless -tilassa',
			step2: 'Käynnistä iRacing ja aseta kamera siihen kohtaan, josta haluat ottaa kuvakaappauksen',
			step3: 'Valitse haluamasi tarkkuus (kokeile pienempiä tarkkuuksia ennen 8K:hon siirtymistä)',
			step4: 'Päätä, haluatko rajata iRacingin vesileiman pois; jos haluat, pienennä ensin iRacingin käyttöliittymä pienimpään kokoon näppäimillä ”Control + PageDown”',
			step5: 'Paina kuvakaappauspainiketta tai käytä pikanäppäintä ”Control + PrintScreen”',
			step6: 'Valitusta tarkkuudesta riippuen tämä voi kestää muutaman sekunnin; kun iRacing-ikkuna palaa normaaliin kokoonsa, työ on valmis',
			step7: 'Kuvakaappauksesi tallennetaan kansioon ”C:\\Users\\{User}\\Pictures\\Screenshots”',
		},

		longExposure: {
			whatItDoes: 'Mitä se tekee',
			whatItDoesBody:
				'Pitkä valotus sulauttaa monta uusinnan ruutua yhdeksi kuvaksi, aivan kuten kameran suljin auki jättäminen: paikallaan olevat asiat pysyvät terävinä, liikkuvat piirtävät juovia. Työkalu ohjaa uusintaa itse, kaappaa jokaisen simulaattorin näyttämän ruudun ja laskee ne yhteen näytönohjaimella.',

			shutter: 'Suljinaika',
			shutterBody:
				'Kuinka kauan valotus kestää <i>uusinnan ajassa</i>, yhden uusintaruudun murto-osasta kymmeneen sekuntiin. Tämä asetus ratkaisee juovien pituuden. Pidemmät suljinajat keräävät myös enemmän ruutuja, joten ne tarvitsevat vähemmän apua kaikelta alla olevalta; nopeimmat portaat kattavat yhden ainoan uusintaruudun ja keräävät vain kourallisen näytteitä.',

			playback: 'Toistonopeus',
			playbackBody:
				'Uusintaa toistetaan hidastettuna valotuksen aikana, jolloin simulaattori näyttää enemmän ruutuja uusinta-aikasekuntia kohden ja sekoitus saa enemmän näytteitä. 1/16 kerää noin kuusitoista kertaa enemmän ruutuja kuin reaaliaika — ja kestää kuusitoista kertaa kauemmin todellista aikaa. Tämä on paneelin keskeisin vaihtokauppa: kärsivällisyyttä pehmeyttä vastaan.',
			playbackAutoBody:
				'”Automaattinen (näytetavoitteen mukaan)” valitsee nopeuden puolestasi <b>näytetavoitteen</b> perusteella: työkalu ratkaisee nopeimman toiston, joka yhä saavuttaa pyytämäsi määrän. Aseta sen sijaan kiinteä nopeus, jos haluat rajoittaa odotusaikaa.',

			weighting: 'Painotus',
			weightingBody:
				'Kuinka paljon kukin kaapattu ruutu vaikuttaa lopputulokseen. <b>Box</b> painottaa kaikkia yhtä paljon ja tuottaa tasaisen juovan. <b>Lineaarinen</b> nousee ikkunan loppua kohti, joten kohde on terävin siellä, mihin se päätyi, ja haalistuu polkuaan pitkin. <b>Ease</b> on sama ajatus terävämmällä alulla ja pidemmällä hännällä.',

			interpolation: 'Ruutuinterpolointi',
			interpolationBody:
				'Keksii ylimääräisiä ruutuja oikeiden väliin näytönohjaimen optisen virtauksen moottorilla ja täyttää juovan aukot. Vaatii NVIDIA Turing -kortin tai uudemman, ja se piilotetaan kokonaan laitteistolla, joka ei siihen pysty.',
			interpolationCostBody:
				'Se ei ole ilmaista: se kuluttaa GPU-aikaa jokaisella kaapatulla ruudulla, ja budjettina on yksi iRacingin ruutu. Jos se ei pysy mukana, se alkaa menettää <i>oikeita</i> ruutuja valmistaakseen synteettisiä, mikä on nettotappio — juovasta tulee lyhyempi ja karkeampi. Kustannus skaalautuu megapikselien ja kertoimen tulona, joten se mikä on mukavaa tarkkuudella 2560×1440 ei ole toteuttamiskelpoista 8K:ssa. Tarkista asia kuvaamalla sama hetki kahdesti, interpoloinnin kanssa ja ilman, ja vertaa oikeiden näytteiden määriä; sovellus myös varoittaa jälkikäteen, jos otos jäi vajaaksi.',

			passes: 'Ajokerrat',
			passesBody:
				'Käy saman hetken läpi useita kertoja ja kerää kaiken yhteen kuvaan. Jokainen ajokerta nappaa ruutuja, jotka muilta sattuivat jäämään väliin, joten juova tasoittuu — ei kirkastu, koska tulos normalisoidaan sen mukaan, kuinka paljon valoa kullekin kuvapisteelle todella osui.',
			passesTradeBody:
				'Ajokerrat ostavat saman asian kuin interpolointi, mutta eri valuutalla: todellista aikaa GPU-ajan sijaan. Kahdeksan ajokertaa kestää noin kahdeksan kertaa kauemmin, mutta ne eivät voi koskaan maksaa sinulle oikeita ruutuja. Siksi ne ovat oikea keino suurilla tarkkuuksilla, joilla interpolointi ei pysy mukana, ja lyhyillä suljinajoilla, joilla yksi ajokerta kerää hyvin vähän näytteitä. Molempien käyttäminen yhtä aikaa on yleensä huonoin vaihtoehto — ne kilpailevat samasta ruutukohtaisesta budjetista.',

			bracket: 'Suljinaikahaarukointi',
			bracketBody:
				'Tuottaa yhdestä kaappauksesta yhden kuvan jokaista suljinaikaporrasta kohden, joka on valitsemasi tai sitä nopeampi. Otos suljinajalla 1/60 antaa sinulle myös 1/125, 1/250, 1/500 ja 1/1000 — saman hetken asteittain lyhyemmillä juovilla — joten voit valita ilmeen jälkikäteen sen sijaan, että arvaisit ja kuvaisit uudelleen.',
			bracketCostBody:
				'Se ei maksa juuri lainkaan lisäaikaa. Jokainen porras päättyy samaan ruutuun ja eroaa vain siinä, kuinka kauas taaksepäin se yltää, joten nopeampi suljinaika on yksinkertaisesti jo ohi kulkevien ruutujen häntä — ne kaikki täytetään yhdellä uusinnan ajokerralla.',
			bracketMemoryBody:
				'Muistia se sen sijaan kuluttaa. Jokainen porras tarvitsee oman täysitarkkuisen kerääjänsä, joten yksitoista porrasta vaatii yksitoista kertaa yhden näyttömuistin, mikä 8K:ssa on enemmän kuin useimmilla korteilla on. Kaappaus tarkistaa tämän ennen aloitusta ja kieltäytyy mieluummin kuin kaataa iRacingin; jos haarukointi hylätään, laske tarkkuutta tai valitse nopeampi suljinaika — mikä lyhentää samalla porrasta.',
			bracketNamingBody:
				'Valitsemasi porras tallennetaan tavanomaisella nimellä ja se näkyy galleriassa; muut ovat sen vieressä, ja niiden suljinaika on tiedostonimessä.',

			highlights: 'Huippuvalojen palautus',
			highlightsBody:
				'Korostaa lähes puhki palaneita huippuvaloja ennen ruutujen yhteenlaskua ja purkaa korostuksen lopuksi. iRacing luovuttaa kuvan, jolle on jo tehty sävykartoitus, joten ajovalo ja valkoinen seinä saapuvat samalla arvolla; niiden keskiarvoistaminen tekee osan valotuksesta läpi pyyhkäisevästä kirkkaasta valosta harmaan tahran kirkkaan jäljen sijaan. Tämä palauttaa epälineaarisuuden sinne, missä se oikeassa kennossa on. Mitataan aukkoina; 0 tarkoittaa pois päältä eikä muuta yhtään mitään.',

			whatItSaves: 'Mitä se tallentaa',
			whatItSavesBody:
				'Koko, vesileiman rajaus ja tiedostomuoto noudattavat samoja säätimiä kuin tavallinen kuvakaappaus — yllä olevia Tarkkuus- ja Rajaa vesileima -asetuksia sekä asetuksissa määritettyä tulostemuotoa. Sivupalkin yläreunan ”Tuloste”-rivi näyttää tarkalleen, mitä saat.',
			whatItSavesPngBody:
				'PNG:n valinta kirjoittaa aidon 16-bittisen masterin, mikä kannattaa, jos aiot värimääritellä otoksen jälkikäteen, sekä 8-bittisen esikatselun galleriaa varten. Sen kirjoittaminen on myös paljon hitaampaa suurilla tarkkuuksilla — 33 megapikselin 16-bittinen PNG vie noin kymmenen sekuntia, kun sama ruutu JPEG-muodossa vie alle sekunnin.',

			troubleshooting: 'Jos tulos näyttää väärältä',
			troubleGhosts:
				'<b>Erillisiä haamukuvia tasaisen juovan sijaan</b> — liian vähän näytteitä. Käytä hitaampaa toistonopeutta, useampia ajokertoja tai pienempää tarkkuutta.',
			troubleShutter:
				'<b>Et ole varma, minkä suljinajan halusit</b> — ota suljinaikahaarukointi käyttöön ja päätä jälkikäteen, samalla odotusajalla.',
			troubleHighlights:
				'<b>Puhki palaneet tai latteat huippuvalot</b> — kokeile 3–5 aukkoa huippuvalojen palautusta.',
			troubleBlack:
				'<b>Musta kuva</b> — iRacing on yksinomaisessa koko näytön tilassa. Aseta Display &gt; Full Screen tilaan OFF.',
			troubleSidecar:
				'Jokainen otos kirjaa käyttämänsä tarkat asetukset, näytteiden määrän ja sen, miten tasaisesti ne osuivat, .json-tiedostoon lokikansioon app.log-tiedoston viereen. Viimeiset 20 otosta säilytetään — haarukointi lasketaan yhdeksi — joten otos, josta kysyt, on yhä tallessa silloin kun kysyt siitä.',
		},

		faq: {
			blackShot: 'Otos on musta, mutta iRacingin käyttöliittymä näkyy siinä',
			blackShotBody:
				'Itse kaappaus onnistui: käyttöliittymä piirtyi, joten työkalulle saapui aito ruutu. Puuttumaan jää 3D-näkymä, koska iRacing piirsi sen mustana. Useat epätavallisemmista kameroista tekevät näin — jousituskamera on niistä yleisin. Vaihda tavalliseen kameraan (ohjaamo, seuranta tai jokin tv-kameroista) ja ota sama hetki uudelleen.',
			blackShotFullscreenBody:
				'Jos kuva on musta <i>käyttöliittymää myöten</i> ja kaikki kamerat käyttäytyvät samoin, syy on toinen: iRacing on yksinomaisessa koko näytön tilassa, jota mikään simulaattorin ulkopuolinen ei voi kaapata. Aseta Display &gt; Full Screen tilaan OFF.',

			cameraReset: 'iRacing siirtää kameraani juuri ennen otosta',
			cameraResetBody:
				'Kyse on iRacingin omasta automaattisesta kuvavalinnasta, ei tästä työkalusta. Niin kauan kuin se on päällä, iRacing valitsee kamerat itse ja palaa oletusrajaukseen juuri sillä hetkellä, kun kaappaus alkaa, joten et saa sitä otosta, jonka asettelit.',
			cameraResetFixBody:
				'Kytke se pois iRacingin kameratyökalussa (Ctrl+F12) kohdassa <b>Camera &gt; Config &gt; Preferences</b>: kytkin <b>Shot Selection</b>, jonka nimenä on <b>Automatic</b>. Kun se on pois päältä, kamera pysyy täsmälleen siinä mihin sen asetit — sekä tavallisissa kuvakaappauksissa että pitkissä valotuksissa.',
		},
	},

	update: {
		checking: 'Tarkistetaan päivityksiä…',
		newVersion: 'Uusi versio',
		availableBusy:
			'{version} on saatavilla. Kaappaus on käynnissä — voit ladata sen, kun kaappaus valmistuu.',
		available: '{version} on saatavilla. Lataa se napsauttamalla.',
		downloading: 'Ladataan versiota {version}…',
		downloadingPercent: 'Ladataan versiota {version} — {percent} %',
		downloadedBusy:
			'{version} on valmis. Kaappaus on käynnissä, joten se asennetaan, kun suljet sovelluksen.',
		downloaded:
			'{version} on valmis. Napsauta käynnistääksesi uudelleen ja asentaaksesi.',
		failed: 'Päivitysten tarkistus epäonnistui: {error}',
		unknownError: 'tuntematon virhe',
		neverChecked: 'Päivityksiä ei ole vielä tarkistettu.',
		upToDate: 'Käytössäsi on uusin versio.',

		alreadyDownloading: 'Päivitystä ladataan jo.',
		alreadyDownloaded: 'Päivitys on jo ladattu.',
		nothingToDownload: 'Ladattavaa päivitystä ei ole.',
		captureInProgress:
			'Kaappaus on käynnissä. Yritä uudelleen, kun se on valmis.',
		nothingToInstall: 'Mikään päivitys ei ole valmiina asennettavaksi.',
		captureInProgressInstall:
			'Kaappaus on käynnissä. Päivitys asentuu itsestään, kun suljet sovelluksen.',
		devBuildOnly: 'Päivitysten tarkistus toimii vain asennetussa versiossa.',

		installTitle: 'Asenna päivitys',
		installMessage: 'Asennetaanko versio {version}?',
		installFallbackVersion: 'päivitys',
		installDetail:
			'Sovellus sulkeutuu ja avautuu uudelleen, kun päivitys on asennettu. Jos valitset ”Myöhemmin”, se asentuu itsestään, kun seuraavan kerran suljet sovelluksen.',
		installConfirm: 'Käynnistä uudelleen ja asenna',
		installLater: 'Myöhemmin',
	},

	filenameFields: {
		categories: {
			Track: 'Rata',
			Driver: 'Kuljettaja',
			Session: 'Sessio',
			Meta: 'Meta',
		},
		track: 'Rata',
		trackFull: 'Rata koko nimi',
		trackCity: 'Kaupunki',
		trackCountry: 'Maa',
		trackType: 'Radan tyyppi',
		driver: 'Kuljettaja',
		driverAbbrev: 'Kuljettaja lyhennettynä',
		driverInitials: 'Nimikirjaimet',
		team: 'Talli',
		carNumber: 'Auton nro',
		car: 'Auto',
		carFull: 'Auto koko nimi',
		carClass: 'Autoluokka',
		iRating: 'iRating',
		sessionType: 'Session tyyppi',
		sessionName: 'Session nimi',
		lap: 'Kierros',
		date: 'Päivämäärä',
		time: 'Kellonaika',
		datetime: 'Päivämäärä+kellonaika',
		counter: 'Laskuri',
	},

	iracingConfig: {
		projections:
			'Poista ”Render Scene Using 3 Projections” käytöstä iRacingissa (Display > Monitor -välilehti), jotta kuvakaappauksiin ei tule pystyraitoja',
	},

	graphicsProfiles: {
		title: 'Grafiikkaprofiilit',
		description:
			'Tallenna iRacingin grafiikka-asetuksia ja vaihda niiden välillä — yksi ajamiseen, yksi kuvakaappauksiin, yksi videon tallennukseen. iRacing lukee kokoonpanon käynnistyessään ja kirjoittaa sen takaisin sulkeutuessaan, joten simulaattorin ollessa käynnissä tehty vaihto kumoutuu: <b>vaihda kokoonpanoa vain, kun simulaattori on suljettu</b>.',
		iracingRunning:
			'Sulje iRacing ennen vaihtoa. Se kirjoittaa grafiikka-asetuksensa takaisin sulkeutuessaan, mikä kumoaisi muutoksen.',
		activeHeading: 'Nykyinen kokoonpano',
		active: {
			clean: 'Vastaa profiiliasi {name}.',
			modified: {
				one: 'Perustuu profiiliin {name}, sen jälkeen {count} asetus on muuttunut.',
				other: 'Perustuu profiiliin {name}, sen jälkeen {count} asetusta on muuttunut.',
			},
			modifiedUnknownCount:
				'Perustuu profiiliin {name}, sitä on muutettu sen jälkeen.',
			unknown: 'Ei vastaa mitään tallennettua profiilia.',
			missing: 'iRacingin grafiikka-asetuksia ei löytynyt.',
		},
		badge: {
			active: 'Aktiivinen',
			modified: 'Muokattu',
		},
		picker: {
			unknown: 'No matching profile',
			missing: 'No configuration',
		},
		empty: {
			title: 'Profiileja ei ole vielä tallennettu.',
			body: 'Tallenna nykyinen iRacing-kokoonpanosi profiiliksi tai tuo olemassa oleva .ini-tiedosto.',
		},
		invalidProfile: 'Ei grafiikka-asetustiedosto',
		warnings: {
			autoCfgIncomplete: 'iRacing nollaa tämän',
		},
		actions: {
			load: 'Lataa',
			overwrite: 'Päivitä nykyisestä',
			rename: 'Nimeä uudelleen',
			export: 'Vie',
			delete: 'Poista',
			save: 'Tallenna',
			cancel: 'Peruuta',
			saveCurrent: 'Tallenna nykyinen nimellä…',
			import: 'Tuo…',
			openFolder: 'Avaa kansio',
		},
		prompt: {
			namePlaceholder: 'Profiilin nimi',
			deleteConfirm: 'Poistetaanko {name}?',
		},
		feedback: {
			loaded: '{name} ladattiin. Käynnistä iRacing, jotta se tulee voimaan.',
			saved: 'Tallennettu nimellä {name}.',
			overwritten: '{name} päivitettiin nykyisestä kokoonpanosta.',
			renamed: 'Uusi nimi: {name}.',
			deleted: '{name} poistettiin.',
			imported: 'Tuotu nimellä {name}.',
			exported: '{name} vietiin.',
		},
		errors: {
			empty: 'Anna profiilille nimi.',
			illegalCharacters:
				'Profiilin nimi ei saa sisältää näitä merkkejä: < > : " / \\ | ? *',
			reservedName: 'Nimi on Windowsin varaama. Valitse toinen.',
			trailingDotOrSpace:
				'Profiilin nimi ei saa päättyä pisteeseen tai välilyöntiin.',
			tooLong: 'Nimi on liian pitkä.',
			duplicate: 'Samanniminen profiili on jo olemassa.',
			profileNotFound: 'Profiilia ei enää löytynyt.',
			profileExists: 'Samanniminen profiili on jo olemassa.',
			duplicateContent:
				'Profiili, jossa on täsmälleen samat asetukset, on jo olemassa: {name}.',
			noActiveConfig:
				'Tallennettavaa iRacingin grafiikka-asetustiedostoa ei löytynyt.',
			invalidIni:
				'Tiedosto ei ole iRacingin grafiikka-asetustiedosto, joten sitä ei käytetty.',
			iracingRunning:
				'Sulje ensin iRacing — se ylikirjoittaisi muutoksen sulkeutuessaan.',
			ioError: 'Tiedostoa ei voitu kirjoittaa. Mitään ei muutettu.',
		},
	},

	wgc: {
		cursorCaveat:
			'Hiiren osoitin voi näkyä kaappauksissa tässä Windowsin versiossa. Windows 10 versio 2004 lisäsi asetuksen, joka piilottaa sen.',
		addonUnavailable:
			'Korkealaatuisen kaappauksen komponenttia ei voitu ladata tässä järjestelmässä.',
		osUnsupported:
			'Windows.Graphics.Capture ei ole käytettävissä tässä Windowsin versiossa. Se vaatii Windows 10 version 1903 tai uudemman.',
		nativeCaptureOff: 'Korkealaatuinen kaappaus (WGC) on pois päältä',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing on yksinomaisessa koko näytön tilassa, joten kuvakaappauksesta tulisi musta. Aseta iRacingissa Display > Full Screen tilaan OFF (käytä Borderless- tai Windowed-tilaa) ja yritä uudelleen.',
		exclusiveFullscreenUnattributed:
			'Jokin sovellus on yksinomaisessa koko näytön tilassa, mistä seuraa musta kaappaus. Jos iRacing on koko näytön tilassa, aseta Display > Full Screen tilaan OFF (käytä Borderless- tai Windowed-tilaa) ja yritä uudelleen.',
		unknownError: 'Tuntematon kuvakaappausvirhe',
		outputTooSmall: 'Kaappaus on liian pieni ({width}x{height})',
		blackFrame:
			'Kaapattu ruutu on musta — kaappauslähde saattoi epäonnistua (GPU-kiihdytettyä sisältöä ei aina saa kaapattua joissakin Windows-kokoonpanoissa)',
		noSource: 'Ikkunalle {windowId} ei löytynyt työpöytäkaappauslähdettä',
		metadataTimeout: 'Aikakatkaisu odotettaessa kaappauksen videometatietoja',
		noVideoFrame: 'Kaappausvirta ei tuottanut yhtään videoruutua',
		dimensionTimeout:
			'Aikakatkaisu odotettaessa ikkunan mittoja {width}x{height}; jatketaan mitoilla {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'Kaappaus on jo käynnissä.',
		needsNativeCapture:
			'Pitkä valotus vaatii korkealaatuisen kaappauksen (WGC). Ota se käyttöön asetuksista.',
		unavailable: 'Pitkä valotus ei ole käytettävissä tällä koneella.',
		noTelemetry:
			'Pitkä valotus vaatii uusintatelemetrian iRacingista. Tarkista, että simulaattori on käynnissä ja sessiossa.',
		windowNotFound: 'iRacing-ikkunaa ei löytynyt.',
		cancelled: 'Kaappaus peruutettiin.',
		seekTimeout:
			'Uusinta ei ehtinyt ruutuun {frame} ajoissa. Se saattaa vielä latautua.',
		noPasses: 'Kaappauksen on suoritettava vähintään yksi ajokerta.',
		playbackStalled:
			'Uusinta ei lähtenyt käyntiin. Tarkista, ettei jokin toinen työkalu ole pysäyttänyt iRacingia.',
		exposureTimeout:
			'Valotus ei ehtinyt ruutuun {frame} {seconds} sekunnissa.',
		endedEarly: 'Valotus päättyi ennen kuin valittu hetki saavutettiin.',
		noFramesPresented: 'iRacing ei näyttänyt yhtään kaapattavaa ruutua.',
		subFrameNoSamples:
			'Tämä suljinaika on lyhyempi kuin yksi uusintaruutu, eikä iRacing piirtänyt sen sisällä yhtään ruutua. Kokeile hitaampaa toistonopeutta tai seuraavaksi pidempää suljinaikaa.',
		noSamples:
			'Yhtään ruutua ei kertynyt. iRacing on saattanut lopettaa piirtämisen valotuksen aikana.',
		blankCapture:
			'Kaikki kaapatut ruudut olivat mustia, joten tallennettavaa kuvaa ei ole. Tarkista, että iRacing on ikkuna- tai reunattomassa tilassa eikä yksinomaisessa koko näytön tilassa ja että sillä on tällä tarkkuudella vielä vapaata näytönohjaimen muistia — pienempi kaappaustarkkuus on nopein kokeilla.',
		frozenCapture:
			'iRacing näytti valotuksen aikana {samples} ruutua, mutta kaikki olivat samanlaisia, joten tämä kuva on pysäytyskuva eikä pitkä valotus. iRacing ei piirtänyt mitään uutta uusinnan pyöriessä.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'Näytönohjain ei palauttanut kuvaa.',
		bracketShortfall:
			'Haarukointi pyysi {asked} porrasta, mutta {returned} palasi — loput eivät ratkenneet, tai tämä kaappauskomponentin versio on haarukointia vanhempi.',
	},

	validation: {
		windowBeforeStart:
			'Valotus tarvitsee {frames} uusintaruutua ennen valittua hetkeä, mutta se on vain {anchor} ruudun päässä uusinnan alusta. Valitse myöhempi hetki tai nopeampi suljinaika.',
		pastEnd: 'Valittu hetki on uusinnan lopun jälkeen.',
		sessionChanged:
			'Uusinta on siirtynyt toiseen sessioon sen jälkeen, kun tämä otos määritettiin. Valitse hetki uudelleen.',
		singleSampleMultiPass:
			'Tämä suljinaika on niin lyhyt, että sen sisään osuu vain noin yksi ruutu ajokertaa kohden, joten {passes} ajokertaa kerää suunnilleen {passes} näytettä. Hitaampi toistonopeus tai pidempi suljinaika tuottaa huomattavasti enemmän.',
		singleSample:
			'Tämä suljinaika on niin lyhyt, että sen sisään osuu vain yksi ruutu, joten tuloksessa ei ole liike-epäterävyyttä. Hitaampi toistonopeus tai pidempi suljinaika tuottaa näytteitä.',
		bracketVsInterpolation:
			'Suljinaikahaarukointi ja {factor}x ruutuinterpolointi eivät voi toimia yhtä aikaa, joten tämä otos otetaan ilman interpolointia. Poista haarukointi käytöstä, jos väliruudut merkitsevät sinulle enemmän kuin lisäportaat.',
		passesVsInterpolation:
			'Sekä useat ajokerrat että {factor}x interpolointi ovat päällä. Ne kilpailevat keskenään: interpolointi hidastaa jokaista ajokertaa niin paljon, että se menettää oikeita ruutuja, joten sama odotusaika ostaa vähemmän oikeita näytteitä kuin pelkät ajokerrat. Interpoloinnin poistaminen tuottaa yleensä paremman otoksen.',
		shortOfTarget:
			'Jopa nopeudella 1/{divisor} tämä valotus yltää noin {samples} näytteeseen, mikä jää pyydetystä {target}:sta. Käytä pidempää suljinaikaa saadaksesi enemmän.',
		longCaptureEscalate:
			'Tämä kaappaus toistaa uusintaa nopeudella 1/{divisor} noin {duration} todellista aikaa{passSuffix}, eikä sitä voi kiirehtiä käynnistämisen jälkeen. {advice}',
		longCaptureWarn:
			'Tämä kaappaus kestää noin {duration} todellista aikaa toistonopeudella 1/{divisor}{passSuffix}.',
		passSuffix: ', jaettuna {passes} ajokerralle saman hetken yli',
		adviceFewerPasses:
			'Harvemmat ajokerrat valmistuvat nopeammin, mutta vähemmillä näytteillä.',
		adviceFasterPlayback:
			'Nopeampi toistonopeus valmistuu nopeammin, mutta vähemmillä näytteillä.',
		pastLogCap:
			'Tämän kaappauksen ennustetaan keräävän noin {samples} näytettä {passes} ajokerran aikana, enemmän kuin diagnostiikkalokiin mahtuvat {cap}. Kuvaan tämä ei vaikuta — vain tasaisuus- ja aukkoluvut kuvaavat kaappauksen alkuosaa.',
		interpolationLossy:
			'Tässä koossa {factor}x interpolointi on aiemmin maksanut tälle koneelle oikeita näytteitä. Harkitse pienempää kerrointa, pienempää tarkkuutta tai useampia ajokertoja.',
	},

	duration: {
		zero: '0 sekuntia',
		seconds: {
			one: '{count} sekunti',
			other: '{count} sekuntia',
		},
		minutes: {
			one: '{count} minuutti',
			other: '{count} minuuttia',
		},
		minutesSeconds: '{minutes} min {seconds} s',
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

export default fi;
