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

			tripleBands: 'There are vertical bands in my triple-screen shots',
			tripleBandsBody:
				'They are a side effect of two iRacing settings working together: multi-projection (the SMP setting) and bezel correction. On the monitors themselves the picture looks right — the correction exists to line the scene up across the physical frames — but in the captured image the corrected regions show up as vertical bands where one screen meets the next.',
			tripleBandsFixBody:
				"Either change fixes it: set the <b>bezel width</b> to <b>0 mm</b> in iRacing's graphics options, which takes effect immediately, or turn off <b>multi-projection (SMP)</b>, which takes effect after an iRacing restart.",
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
			unknown: 'Ei vastaavaa profiilia',
			missing: 'Ei kokoonpanoa',
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
		title: 'iRacingin kokoonpanoeditori',
		nav: {
			home: 'Kuvakaappaukset',
			config: 'iRacingin kokoonpano',
		},
		tabs: {
			monitor: 'Monitori / näyttö',
			graphics: 'Grafiikka',
		},
		mode: {
			label: 'Muokattava kokoonpano:',
			// Mode names come from iRacing's own filenames; Legacy is the bare
			// rendererDX11.ini only old-website launches still read.
			legacy: 'Legacy',
		},
		actions: {
			save: 'Tallenna muutokset',
			discard: 'Hylkää',
			reload: 'Lataa uudelleen',
			browse: 'Selaa…',
		},
		state: {
			dirty: {
				one: '{count} tallentamaton muutos',
				other: '{count} tallentamatonta muutosta',
			},
			saved: 'Muutokset tallennettiin tiedostoon {file}',
			simRunning:
				'iRacing on käynnissä. Se pitää nämä asetukset muistissa ja kirjoittaa tiedoston uudelleen sulkeutuessaan, joten nyt tehdyt muutokset menetettäisiin. Sulje iRacing, jotta voit muokata.',
			stale: 'Tiedosto on muuttunut levyllä sen lataamisen jälkeen — yleensä siksi, että iRacing kirjoitti sen uudelleen sulkeutuessaan. Lataa uudelleen, niin näet nykyiset arvot.',
			keyMissing: 'Ei tässä tiedostossa',
			noModes:
				'Kansiosta {folder} ei löytynyt renderöijän kokoonpanotiedostoja. Käynnistä iRacing kerran, niin ne luodaan, tai osoita työkalu iRacing-kansioosi.',
			loadFailed: 'Kokoonpanotiedostoa ei voitu lukea.',
			discardConfirm: 'Hylätäänkö {count} tallentamatonta muutosta?',
		},
		folder: {
			label: 'iRacing-kansio',
			autoDetected: 'Tunnistettu automaattisesti',
			reset: 'Käytä automaattista tunnistusta',
			help: 'Kansio, jossa iRacing säilyttää kokoonpanotiedostojaan. Jätä tyhjäksi, niin Documents\\iRacing-kansio tunnistetaan automaattisesti.',
		},
		errors: {
			iracingRunning:
				'Sulje ensin iRacing — se ylikirjoittaisi muutoksen sulkeutuessaan.',
			staleFile:
				'Tiedosto on muuttunut levyllä sen lataamisen jälkeen. Lataa uudelleen ja yritä uudestaan.',
			validationFailed: 'Jokin arvoista ei kelpaa. Mitään ei muutettu.',
			keyNotFound:
				'Tiedostosta puuttui asetus, joten mitään ei muutettu. Lataa uudelleen ja yritä uudestaan.',
			fileNotFound: 'Kokoonpanotiedostoa ei ole enää olemassa.',
			ioError: 'Tiedostoa ei voitu kirjoittaa. Mitään ei muutettu.',
		},
		groups: {
			window: 'Ikkunan sijoitus',
			fullscreen: 'Koko näyttö',
			quality: 'Laatu ja yksityiskohdat',
			aa: 'Reunanpehmennys ja terävöinti',
			post: 'Jälkikäsittely',
			perf: 'Suorituskyky',
			misc: 'Sekalaiset',
		},
		// Shared tier vocabulary for enum settings.
		levels: {
			off: 'Pois',
			low: 'Matala',
			medium: 'Keskitaso',
			high: 'Korkea',
			max: 'Maksimi',
			ultra: 'Ultra',
		},
		nvReflex: {
			off: 'Pois',
			on: 'Päällä',
			onBoost: 'Boost',
		},
		shadowDetail: {
			fewer: 'Vähemmän varjoja',
			maximum: 'Eniten varjoja',
		},
		aaMethod: {
			none: 'Ei mitään',
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
			soft: 'Pehmeä',
			neutral: 'Neutraali',
			sharp: 'Terävä',
			simple: 'Yksinkertainen',
		},
		dnsmFilter: {
			off: 'Pois',
			simple: 'Yksinkertainen',
			pcf4: 'PCF4',
			pcf4p: 'PCF4P',
			pcf8p: 'PCF8P',
			pcf16p: 'PCF16P',
		},
		dynamicShadowMaps: {
			off: 'Pois',
			mainView: 'Päänäkymässä',
			mainViewMirrors: 'Päänäkymässä ja peileissä',
		},
		hideObstructions: {
			none: 'Ei mitään',
			halo: 'Piilota halo',
			pillarRollcage: 'Piilota A-pilarit ja turvakehikko',
			everything: 'Piilota kaikki',
		},
		replayScope: {
			label: 'Käytä myös uusinnan grafiikka-asetuksiin',
		},
		// Inline hints under a field whose pending value cannot be saved. Only
		// numeric inputs can go invalid (switches and dropdowns cannot), and
		// every bounded numeric in the schema carries both bounds.
		invalid: {
			intRange: 'Anna kokonaisluku väliltä {min}–{max}.',
			int: 'Anna kokonaisluku.',
			floatRange: 'Anna luku väliltä {min}–{max}.',
			float: 'Anna luku.',
		},
		layout: {
			title: 'Näyttöjen asettelu',
			primary: 'Ensisijainen',
			windowTarget: 'iRacing-ikkuna',
			estimated:
				'Arvio — Windows ja iRacing numeroivat näytöt eri tavoin, joten korostus perustuu sijaintiin.',
		},
		settings: {
			display: {
				border: { label: 'Ikkunan reunus' },
				windowedXPos: { label: 'Ikkunan vasen reuna' },
				windowedYPos: { label: 'Ikkunan yläreuna' },
				windowedWidth: { label: 'Ikkunan leveys' },
				windowedHeight: { label: 'Ikkunan korkeus' },
				windowedMaximized: { label: 'Käynnistä suurennettuna' },
				windowedAlignment: {
					label: 'Ikkunan kohdistus',
					help: 'iRacing ei dokumentoi tätä arvoa. Älä muuta sitä, ellet tiedä haluamaasi kohdistusindeksiä.',
				},
				fullScreen: { label: 'Koko näyttö' },
				fullScreenWidth: { label: 'Koko näytön leveys' },
				fullScreenHeight: { label: 'Koko näytön korkeus' },
				fullScreenDepth: {
					label: 'Koko näytön värisyvyys',
					help: 'Bittiä pikseliä kohti. Käytännössä kaikissa nykyjärjestelmissä 32.',
				},
				RefreshRate: {
					label: 'Virkistystaajuus',
					help: '0 käyttää näytön oletusvirkistystaajuutta.',
				},
			},
			graphics: {
				ShaderQuality: { label: 'Varjostimien laatu' },
				ShadowDetail: { label: 'Varjojen yksityiskohdat' },
				DynamicShadowMaps: {
					label: 'Dynaamiset varjokartat',
					help: 'Varjokartat autoille ja muille liikkuville kohteille. Vain päivällä.',
				},
				DNSMFilter: {
					label: 'Varjokarttasuodatin',
					help: 'Suodatin, jota käytetään dynaamisiin yövarjokarttoihin.',
				},
				CarDetail: { label: 'Autojen yksityiskohdat' },
				PitObjectDetail: { label: 'Varikkokohteiden yksityiskohdat' },
				CrowdDetail: { label: 'Yleisön yksityiskohdat' },
				GrandstandDetail: { label: 'Katsomoiden yksityiskohdat' },
				ObjectDetail: { label: 'Kohteiden yksityiskohdat' },
				FoliageDetail: { label: 'Kasvillisuuden yksityiskohdat' },
				ParticleDetail: { label: 'Partikkelien yksityiskohdat' },
				ParticlesFullRes: { label: 'Partikkelit täydellä tarkkuudella' },
				MirrorDetail: { label: 'Enemmän yksityiskohtia peileissä' },
				MaxCockpitMirrors: { label: 'Ohjaamon peilien enimmäismäärä' },
				AntiAliasMethod: { label: 'Reunanpehmennysmenetelmä' },
				MSAASamples: { label: 'MSAA-näytteet' },
				MSAAUseFilter: { label: 'MSAA-suodatin' },
				Sharpening: { label: 'Terävöinti' },
				SharpeningAmount: {
					label: 'Terävöinnin määrä',
					help: 'Terävöintisuodattimen voimakkuus.',
				},
				FSRSharpness: {
					label: 'FSR-terävyys',
					help: 'Terävyys, jota käytetään, kun tarkkuusskaalaus suurentaa kuvaa FSR:llä.',
				},
				AutoExposure: {
					label: 'Automaattinen valotus',
					help: 'Toimii vain, kun HDR-renderöinti on käytössä.',
				},
				SSAO: { label: 'Ympäristön varjostus (SSAO)' },
				SSRLevel: {
					label: 'Ruututilan heijastukset',
					help: 'Matala renderöi heijastukset pienemmällä tarkkuudella, Korkea täydellä tarkkuudella.',
				},
				SSRRainOnly: {
					label: 'Heijastukset vain sateella',
					help: 'Rajaa ruututilan heijastukset märkiin rataolosuhteisiin — simulaattorin Low Rain- ja High Rain -asetukset.',
				},
				HeatHaze: { label: 'Lämpöväreily' },
				DepthOfField: { label: 'Syväterävyys' },
				MotionBlurStrength: { label: 'Liike-epäterävyyden voimakkuus' },
				Distortion: { label: 'Linssivääristymä' },
				EnableHDR: { label: 'HDR-renderöinti' },
				LimitFrameRate: { label: 'Rajoita ruudunpäivitysnopeutta' },
				DesiredFPSLimit: { label: 'Ruudunpäivitysnopeuden raja' },
				VerticalSync: { label: 'Pystytahdistus' },
				NvReflexMode: { label: 'NVIDIA Reflex' },
				MaxPreRenderedFrames: {
					label: 'Esirenderöityjen ruutujen enimmäismäärä',
					help: 'Kuinka monta ruutua GPU saa olla CPU:ta jäljessä. 1 on normaali; 0 poistaa jonon käytöstä usean GPU:n kokoonpanoissa.',
				},
				SysMemToUseMB: { label: 'Käytettävä järjestelmämuisti' },
				VidMemToUseMB: { label: 'Käytettävä näytönohjaimen muisti' },
				MaxCarsToDraw: { label: 'Piirrettävien autojen enimmäismäärä' },
				MaxCarsToDrawInMirrors: {
					label: 'Autojen enimmäismäärä peileissä',
				},
				VirtualMirrors: { label: 'Virtuaalipeilit' },
				UIScale: { label: 'UI-skaalaus' },
				EnableTireMarks: { label: 'Rengasjäljet' },
				HideCockpitObstructions: { label: 'Piilota ohjaamon esteet' },
				HeadlightLevel: { label: 'Ajovalojen laatu' },
			},
		},
	},
};

export default fi;
