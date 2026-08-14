// Italian. Translated from en.ts — see that file's header before editing.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.

import type { Catalog } from './index';

const it: Catalog = {
	notice: {
		danger: 'Problemi',
		warning: 'Da sapere',
		info: 'Note',
	},

	promo: {
		greeting: 'Grazie per usare iRacing Screenshot Tool!',
		signature: 'Creato e mantenuto da AR Media Solutions.',
	},

	changelog: {
		title: 'Registro delle modifiche',
		untitledRelease: 'Versione',
	},

	gallery: {
		menu: {
			openExternally: 'Apri con un’altra applicazione',
			openFolder: 'Apri cartella',
			copy: 'Copia',
			delete: 'Elimina',
		},
		copiedToClipboard: '{name} copiato negli appunti',
	},

	sidebar: {
		resolution: 'Risoluzione',
		width: 'Larghezza',
		height: 'Altezza',
		output: 'Output:',
		cropWatermark: 'Ritaglia filigrana',
		keepAspectRatio: 'Mantieni proporzioni',
		screenshot: 'Screenshot',
		custom: 'Personalizzata',
		vramStatus: '{adapter}{free} liberi su {total}',
		savedSuccessfully: '{name} salvato correttamente',
		screenshotFailed: 'Screenshot non riuscito: {message}',
		errorLogPrefix: 'Registro: ',
		notices: {
			exclusiveFullscreen:
				'iRacing è a schermo intero esclusivo — gli screenshot risulteranno neri. In iRacing imposta Display > Full Screen su OFF (Borderless o Windowed) per abilitare la cattura.',
			vramRisk:
				'{resolution} richiede circa {needed} di VRAM in più, ma sono liberi solo {free} — è probabile che iRacing esaurisca la memoria e si chiuda.',
			vramCaution:
				'{resolution} lascia poco margine di VRAM ({free} liberi) e può bloccarsi con combinazioni impegnative di pista e vettura.',
			switchResolution: 'Passa a {resolution}',
			vramStatic:
				'Le risoluzioni elevate possono far crashare iRacing se la VRAM si esaurisce. Alcune combinazioni di pista e vettura richiedono più VRAM.',
			reshade:
				'Dopo aver premuto il pulsante di screenshot in iRacing Screenshot Tool, dovrai premere la scorciatoia di ReShade per acquisire lo screenshot.',
			crop: 'Il ritaglio della filigrana ingrandisce leggermente l’immagine finale. Le zone vicine ai bordi dello schermo verranno tagliate.',
			aspectRatio:
				'«Mantieni proporzioni» adatta l’altezza dello screenshot alle proporzioni del tuo monitor (per esempio 21:9 ultrawide) invece del 16:9 predefinito. La risoluzione scelta determina la larghezza.',
		},
	},

	settings: {
		title: 'Impostazioni',
		version: 'Versione - {version}',
		changelog: 'Registro delle modifiche',
		openLogsFolder: 'Apri cartella dei registri',
		checkForUpdates: 'Controlla aggiornamenti',
		updateCheckFailed: 'Controllo aggiornamenti non riuscito: {message}',

		language: 'Lingua',
		languageDescription:
			'La lingua usata in tutta l’applicazione. Rilevata da Windows al primo avvio.',

		screenshotFolder: 'Cartella degli screenshot',
		selectFolder: 'Scegli cartella',
		screenshotKeybind: 'Scorciatoia screenshot',
		editBind: 'Modifica scorciatoia',

		customFilenameFormat: 'Formato nome file personalizzato',
		customFilenameFormatDescription:
			'Usa uno schema personalizzato invece di quello predefinito ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Fai clic sui campi per aggiungerli al formato. Digita direttamente i separatori (-, _, ecc.).',
		reset: 'Ripristina',
		preview: 'Anteprima:',

		outputFormat: 'Formato di output',
		formatJpeg: 'JPEG (qualità massima)',
		formatPng: 'PNG (senza perdita)',
		formatWebp: 'WebP (qualità 95%)',

		disableTooltips: 'Nascondi i suggerimenti',
		disableTooltipsDescription: 'Lasciami in pace, so quello che faccio',

		cropTopLeft: 'Preferisci il ritaglio della filigrana in alto a sinistra',
		cropTopLeftDescription:
			'Ritaglia solo l’angolo in basso a destra (3%). Se disattivato, lo screenshot viene ritagliato in modo uniforme su tutti i lati (6% in totale) per un risultato centrato.',

		manualWindowRestore: 'Ripristino manuale della finestra',
		manualWindowRestoreDescription:
			'Sostituisce il ripristino automatico della finestra con posizione e dimensioni personalizzate. Utile per chi usa un ultrawide o Nvidia Surround.',
		left: 'Sinistra',
		top: 'Alto',
		width: 'Larghezza',
		height: 'Altezza',
		restoreNow: 'Ripristina ora',

		nativeCapture: 'Cattura ad alta fedeltà (WGC)',
		nativeCaptureDescription:
			'Cattura il colore reale senza sottocampionamento tramite Windows.Graphics.Capture invece della pipeline predefinita (che sottocampiona il colore). Ricorre automaticamente al metodo alternativo se una cattura fallisce.',
		nativeCaptureUnavailable:
			'Non disponibile su questo sistema — la cattura ad alta fedeltà non può funzionare qui.',
		nativeCaptureUnverified:
			'Windows segnala che è supportata, ma una cattura di prova non è tornata. Le catture ricorreranno automaticamente al metodo alternativo se il problema persiste.',

		reshade: 'Modalità compatibilità ReShade',
		reshadeDescription:
			'Usando ReShade dovrai prima usare la scorciatoia di iRacing Screenshot Tool o premere il pulsante, poi usare la scorciatoia di screenshot di ReShade una volta che la finestra di iRacing è stata ridimensionata.',
		reshadeIni: 'INI di ReShade',
		selectFile: 'Scegli file',
	},

	longExposure: {
		title: 'Lunga esposizione',
		shutter: 'Tempo di posa',
		playbackSpeed: 'Velocità di riproduzione',
		playbackAuto: 'Automatica (dall’obiettivo di campioni)',
		playbackRealTime: '1x (tempo reale)',
		targetSamples: 'Obiettivo di campioni',
		advanced: 'Avanzate',
		defaultsSummary: '{count} valori predefiniti',

		weighting: 'Ponderazione',
		weightingBox: 'Box (uniforme)',
		weightingLinear: 'Lineare (nitida alla fine)',
		weightingEase: 'Ease (testa più nitida, coda lunga)',

		interpolation: 'Interpolazione dei fotogrammi',
		interpolationOff: 'Disattivata',
		interpolation2: '2× (un fotogramma intermedio)',
		interpolation4: '4× (tre fotogrammi intermedi)',
		interpolation8: '8× (sette fotogrammi intermedi)',

		passes: 'Passaggi',
		passes1: '1 (passaggio singolo)',
		passes2: '2× — attesa doppia',
		passes4: '4× — attesa quadrupla',
		passes8: '8× — attesa ottupla',

		bracket: 'Bracketing dei tempi',
		highlightRecovery: 'Recupero delle alte luci (stop)',

		cancel: 'Annulla',
		saved: 'Lunga esposizione salvata — {count} campioni',
		failed: 'Lunga esposizione non riuscita',

		modified: {
			weighting_linear: 'lineare',
			weighting_ease: 'ease',
			interpolation: 'interpolazione {factor}×',
			passes: {
				one: '{count} passaggio',
				other: '{count} passaggi',
			},
			bracketed: 'bracketing',
			recovery: 'recupero di {stops} stop',
		},

		progress: {
			working: 'Elaborazione…',
			seeking: 'Ricerca…{pass}',
			accumulating: 'Esposizione… {count} campioni{pass}',
			resolving: 'Sviluppo…',
			restoring: 'Ripristino del replay…',
			pass: ' (passaggio {current} di {total})',
		},

		notices: {
			needsNativeCapture:
				'La lunga esposizione richiede la cattura ad alta fedeltà (WGC), attualmente disattivata. Attivala nelle impostazioni per usarla.',
			unavailableWithReason:
				'La lunga esposizione non è disponibile su questa macchina: {reason}',
			unavailable:
				'La lunga esposizione non è disponibile su questa macchina.',
			interpolationCost:
				'L’interpolazione inventa fotogrammi tra quelli reali per rendere più fluida la scia. Costa tempo GPU per fotogramma, quindi confronta il numero di campioni reali dello scatto salvato con lo stesso scatto senza interpolazione: se quel numero cala, sta acquistando campioni inventati con campioni reali.',
			passesAndInterpolation:
				'Passaggi e interpolazione competono per lo stesso budget per fotogramma. Con entrambi attivi ogni passaggio cattura meno fotogrammi reali — disattivare l’interpolazione di solito dà uno scatto migliore a parità di attesa.',
			passes:
				'Ogni passaggio ripete lo stesso istante e recupera fotogrammi che gli altri hanno perso, così la scia diventa più uniforme anziché più luminosa. Ideale con tempi di posa rapidi, dove un singolo passaggio raccoglie pochissimi campioni.',
			interpolationUnsupported:
				'L’interpolazione dei fotogrammi richiede una GPU NVIDIA Turing o più recente{adapter}. Tutto il resto della lunga esposizione funziona normalmente.',
			interpolationAdapter: ' (questa cattura viene eseguita su {adapter})',
			reshade:
				'La lunga esposizione cattura in modo nativo e non usa ReShade, quindi gli effetti ReShade non compariranno nel risultato.',
		},
	},

	help: {
		title: 'Guida',
		sections: 'Sezioni della guida',
		tabGeneral: 'Generale',
		tabLongExposure: 'Lunga esposizione',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'Impostazioni di iRacing',
			borderless: 'iRacing deve essere in esecuzione in Windowed Borderless',
			vram: 'Per screenshot in 8K o superiori si consigliano almeno 8 GB di VRAM',
			newerContent: 'Piste e vetture più recenti richiedono più VRAM',
			shrinkUi:
				'Riduci l’interfaccia al minimo prima di scattare se usi l’opzione di ritaglio della filigrana: «Control+PageDown» la rimpicciolisce. Se non funziona, potresti dover reimpostare lo zoom dell’interfaccia nelle impostazioni di iRacing.',

			screenshotFolder: 'Cartella degli screenshot',
			screenshotFolderBody:
				'Gli screenshot vengono salvati per impostazione predefinita in «C:\\Users\\user\\Pictures\\Screenshots»; il percorso si può cambiare nelle impostazioni.',

			screenshotHotkey: 'Scorciatoia screenshot',
			screenshotHotkeyBody:
				'Per impostazione predefinita «Control + PrintScreen» scatta uno screenshot con le impostazioni correnti; la scorciatoia si può cambiare nelle impostazioni.',

			issues: 'Problemi',
			issuesBody: 'Se riscontri problemi, segnalali sul',
			discord: 'Discord',

			instructions: 'Istruzioni',
			step1: 'iRacing <b>deve</b> essere in esecuzione in modalità Windowed Borderless',
			step2: 'Avvia iRacing e posiziona la telecamera dove vuoi scattare',
			step3: 'Scegli la risoluzione desiderata (prova risoluzioni più basse prima di passare all’8K)',
			step4: 'Decidi se ritagliare la filigrana di iRacing; in tal caso dovrai prima ridurre l’interfaccia di iRacing alla dimensione minima con «Control + PageDown»',
			step5: 'Premi il pulsante di screenshot o usa la scorciatoia «Control + PrintScreen» per scattare',
			step6: 'A seconda della risoluzione scelta possono volerci alcuni secondi; quando la finestra di iRacing torna alle dimensioni normali, l’operazione è conclusa',
			step7: 'Lo screenshot verrà salvato in «C:\\Users\\{User}\\Pictures\\Screenshots»',
		},

		longExposure: {
			whatItDoes: 'Che cosa fa',
			whatItDoesBody:
				'Una lunga esposizione fonde molti fotogrammi di un replay in una sola immagine, come fa un otturatore lasciato aperto: ciò che è fermo resta nitido, ciò che si muove lascia una scia. Lo strumento pilota il replay stesso, cattura ogni fotogramma presentato dal simulatore e li somma sulla GPU.',

			shutter: 'Tempo di posa',
			shutterBody:
				'Quanto dura l’esposizione <i>in tempo di replay</i>, da una frazione di un fotogramma di replay fino a dieci secondi. È questa impostazione a decidere la lunghezza delle scie. I tempi più lunghi raccolgono anche più fotogrammi, quindi hanno meno bisogno di tutto ciò che segue; gli scatti più rapidi coprono un solo fotogramma di replay e raccolgono appena una manciata di campioni.',

			playback: 'Velocità di riproduzione',
			playbackBody:
				'Il replay viene riprodotto al rallentatore mentre l’esposizione viene catturata, così il simulatore presenta più fotogrammi per secondo di tempo di replay e la fusione ottiene più campioni. 1/16 raccoglie circa sedici volte i fotogrammi del tempo reale — e richiede sedici volte il tempo effettivo. È il compromesso principale di questo pannello: pazienza in cambio di morbidezza.',
			playbackAutoBody:
				'«Automatica (dall’obiettivo di campioni)» sceglie la velocità al posto tuo partendo dall’<b>obiettivo di campioni</b>: lo strumento calcola la riproduzione più rapida che raggiunge ancora il numero richiesto. Imposta invece una velocità esplicita se preferisci limitare l’attesa.',

			weighting: 'Ponderazione',
			weightingBody:
				'Quanto ogni fotogramma catturato contribuisce al risultato. <b>Box</b> li pesa tutti allo stesso modo e dà una scia uniforme. <b>Lineare</b> cresce verso la fine della finestra, così il soggetto è più nitido dove ha terminato e sfuma lungo il suo percorso. <b>Ease</b> è la stessa idea con una testa più nitida e una coda più lunga.',

			interpolation: 'Interpolazione dei fotogrammi',
			interpolationBody:
				'Inventa fotogrammi aggiuntivi tra quelli reali usando il motore di flusso ottico della GPU, colmando i vuoti lungo la scia. Richiede una scheda NVIDIA Turing o più recente ed è completamente nascosta sull’hardware che non può farlo.',
			interpolationCostBody:
				'Non è gratis: costa tempo GPU su ogni fotogramma catturato, e il budget è un fotogramma di iRacing. Se non tiene il passo comincia a perdere fotogrammi <i>reali</i> per fabbricarne di sintetici, il che è una perdita netta: la scia risulta più corta e più grossolana. Il costo cresce con i megapixel moltiplicati per il fattore, quindi ciò che è comodo a 2560×1440 non è praticabile in 8K. Per verificarlo, scatta due volte lo stesso istante, con e senza, e confronta il numero di campioni reali; l’app ti avvisa anche a posteriori se uno scatto è rimasto corto.',

			passes: 'Passaggi',
			passesBody:
				'Visita più volte lo stesso istante, accumulando in un’unica immagine. Ogni passaggio recupera fotogrammi che gli altri hanno mancato, così la scia diventa più uniforme — non più luminosa, perché il risultato è normalizzato in base alla luce realmente arrivata su ciascun pixel.',
			passesTradeBody:
				'I passaggi comprano la stessa cosa dell’interpolazione, ma con un’altra moneta: tempo effettivo invece di tempo GPU. Otto passaggi richiedono circa otto volte il tempo, ma non possono mai costarti fotogrammi reali. Questo li rende la leva giusta alle alte risoluzioni, dove l’interpolazione non tiene il passo, e con tempi di posa rapidi, dove un singolo passaggio raccoglie pochissimi campioni. Usarli entrambi insieme è di solito il peggio dei due — competono per lo stesso budget per fotogramma.',

			bracket: 'Bracketing dei tempi',
			bracketBody:
				'Produce un’immagine per ogni tempo di posa uguale o più rapido di quello scelto, da una singola cattura. Uno scatto a 1/60 ti dà anche 1/125, 1/250, 1/500 e 1/1000 — lo stesso istante con scie via via più corte — così puoi scegliere l’effetto dopo, invece di tirare a indovinare e riscattare.',
			bracketCostBody:
				'Non costa quasi tempo aggiuntivo. Ogni tempo termina sullo stesso fotogramma e differisce solo per quanto indietro arriva, quindi un tempo più rapido è semplicemente la coda dei fotogrammi che stanno già passando: vengono riempiti tutti da un solo passaggio del replay.',
			bracketMemoryBody:
				'Ciò che costa davvero è la memoria. Ogni tempo ha bisogno del proprio accumulatore a piena risoluzione, quindi undici tempi richiedono undici volte la memoria video di uno solo, che in 8K è più di quanta ne abbiano la maggior parte delle schede. La cattura lo verifica prima di iniziare e rifiuta anziché far crashare iRacing: se un bracketing viene rifiutato, abbassa la risoluzione o scegli un tempo più rapido, il che accorcia anche la scala.',
			bracketNamingBody:
				'Il tempo che hai scelto viene salvato con il nome consueto ed è quello che compare nella galleria; gli altri restano accanto, con il loro tempo di posa nel nome del file.',

			highlights: 'Recupero delle alte luci',
			highlightsBody:
				'Esalta le alte luci prossime al clipping prima che i fotogrammi vengano sommati, poi annulla l’esaltazione alla fine. iRacing consegna un’immagine già sottoposta a tone mapping, quindi un faro e un muro bianco arrivano con lo stesso valore; mediarli trasforma una luce intensa che attraversa parte dell’esposizione in una macchia grigia invece che in una scia luminosa. Questo riporta la non linearità dove ce l’ha un sensore reale. Si misura in stop; 0 la disattiva e non cambia assolutamente nulla.',

			whatItSaves: 'Che cosa salva',
			whatItSavesBody:
				'Dimensioni, ritaglio della filigrana e formato del file seguono gli stessi controlli di uno screenshot normale — le impostazioni Risoluzione e Ritaglia filigrana qui sopra e il formato di output nelle impostazioni. La riga «Output» in cima alla barra laterale mostra esattamente ciò che otterrai.',
			whatItSavesPngBody:
				'Scegliere PNG scrive un vero master a 16 bit, utile se intendi fare la color correction dopo, più un’anteprima a 8 bit per la galleria. È anche molto più lento da scrivere alle alte risoluzioni: un PNG a 16 bit da 33 megapixel richiede una decina di secondi, mentre lo stesso fotogramma in JPEG meno di uno.',

			troubleshooting: 'Se il risultato non convince',
			troubleGhosts:
				'<b>Fantasmi distinti invece di una scia uniforme</b> — troppo pochi campioni. Usa una velocità di riproduzione più lenta, più passaggi o una risoluzione inferiore.',
			troubleShutter:
				'<b>Non sai quale tempo volevi</b> — attiva il bracketing dei tempi e decidi dopo, a parità di attesa.',
			troubleHighlights:
				'<b>Alte luci bruciate o piatte</b> — prova da 3 a 5 stop di recupero delle alte luci.',
			troubleBlack:
				'<b>Un’immagine nera</b> — iRacing è a schermo intero esclusivo. Imposta Display &gt; Full Screen su OFF.',
			troubleSidecar:
				'Ogni scatto registra le impostazioni esatte usate, il numero di campioni e quanto uniformemente sono caduti, in un file .json nella cartella dei registri accanto ad app.log. Vengono conservati gli ultimi 20 scatti — un bracketing conta come uno — così lo scatto di cui stai chiedendo è ancora lì mentre lo chiedi.',
		},

		faq: {
			blackShot: 'Lo scatto è nero, ma l’interfaccia di iRacing si vede',
			blackShotBody:
				'La cattura ha funzionato: l’interfaccia è stata disegnata, quindi un fotogramma vero è arrivato allo strumento. A mancare è la scena 3D, perché iRacing l’ha resa nera. Diverse telecamere meno convenzionali fanno così — quella delle sospensioni è la più frequente. Passa a una telecamera normale (abitacolo, inseguimento o una delle telecamere TV) e riprendi lo stesso momento.',
			blackShotFullscreenBody:
				'Se l’immagine è nera <i>compresa</i> l’interfaccia e ogni telecamera si comporta allo stesso modo, la causa è un’altra: iRacing è a schermo intero esclusivo, che nulla al di fuori del simulatore può catturare. Imposta Display &gt; Full Screen su OFF.',

			cameraReset: 'iRacing sposta la mia telecamera prima di scattare',
			cameraResetBody:
				'È la selezione automatica delle inquadrature di iRacing, non questo strumento. Finché è attiva, iRacing continua a scegliere le telecamere da sé e torna a un’inquadratura predefinita nell’istante in cui parte la cattura, così quello che ottieni non è lo scatto che avevi preparato.',
			cameraResetFixBody:
				'Disattivala nello strumento telecamere di iRacing (Ctrl+F12), in <b>Camera &gt; Config &gt; Preferences</b>: l’interruttore <b>Shot Selection</b> etichettato <b>Automatic</b>. Con quello spento la telecamera resta esattamente dove l’hai messa, sia per gli screenshot normali sia per le lunghe esposizioni.',
		},
	},

	update: {
		checking: 'Ricerca di aggiornamenti…',
		newVersion: 'Una nuova versione',
		availableBusy:
			'{version} è disponibile. È in corso una cattura — potrai scaricarla non appena sarà terminata.',
		available: '{version} è disponibile. Fai clic per scaricarla.',
		downloading: 'Download di {version}…',
		downloadingPercent: 'Download di {version} — {percent}%',
		downloadedBusy:
			'{version} è pronta. È in corso una cattura, quindi verrà installata alla chiusura dell’applicazione.',
		downloaded: '{version} è pronta. Fai clic per riavviare e installarla.',
		failed: 'Controllo aggiornamenti non riuscito: {error}',
		unknownError: 'errore sconosciuto',
		neverChecked:
			'Non è ancora stato effettuato alcun controllo degli aggiornamenti (stai usando la v{version}).',
		upToDate: 'Stai usando la versione più recente (v{version}).',

		alreadyDownloading: 'L’aggiornamento è già in fase di download.',
		alreadyDownloaded: 'L’aggiornamento è già stato scaricato.',
		nothingToDownload: 'Non c’è alcun aggiornamento da scaricare.',
		captureInProgress:
			'È in corso una cattura. Riprova quando sarà terminata.',
		nothingToInstall: 'Nessun aggiornamento pronto per l’installazione.',
		captureInProgressInstall:
			'È in corso una cattura. L’aggiornamento si installerà da solo alla chiusura dell’applicazione.',
		devBuildOnly:
			'Il controllo degli aggiornamenti funziona solo in una versione installata.',

		installTitle: 'Installa aggiornamento',
		installMessage: 'Installare la versione {version}?',
		installFallbackVersion: 'aggiornamento',
		installDetail:
			'L’applicazione si chiuderà e si riaprirà una volta installato l’aggiornamento. Se scegli «Più tardi», si installerà da solo alla prossima chiusura.',
		installConfirm: 'Riavvia e installa',
		installLater: 'Più tardi',
	},

	filenameFields: {
		categories: {
			Track: 'Pista',
			Driver: 'Pilota',
			Session: 'Sessione',
			Meta: 'Meta',
		},
		track: 'Pista',
		trackFull: 'Pista completa',
		trackCity: 'Città',
		trackCountry: 'Paese',
		trackType: 'Tipo di pista',
		driver: 'Pilota',
		driverAbbrev: 'Pilota abbreviato',
		driverInitials: 'Iniziali',
		team: 'Team',
		carNumber: 'N. vettura',
		car: 'Vettura',
		carFull: 'Vettura completa',
		carClass: 'Classe vettura',
		iRating: 'iRating',
		sessionType: 'Tipo di sessione',
		sessionName: 'Nome sessione',
		lap: 'Giro',
		date: 'Data',
		time: 'Ora',
		datetime: 'Data+ora',
		counter: 'Contatore',
	},

	iracingConfig: {
		projections:
			'Disattiva «Render Scene Using 3 Projections» in iRacing (scheda Display > Monitor) per evitare bande verticali negli screenshot',
	},

	graphicsProfiles: {
		title: 'Profili grafici',
		description:
			'Salva configurazioni grafiche di iRacing e passa dall’una all’altra: un assetto a tre schermi per correre e uno a schermo singolo per gli screenshot.',
		iracingRunning:
			'Chiudi iRacing prima di cambiare. All’uscita riscrive la propria configurazione grafica, annullando la modifica.',
		activeHeading: 'Configurazione attuale',
		active: {
			clean: 'Corrisponde al profilo {name}.',
			modified: {
				one: 'Basata su {name}, con {count} impostazione modificata da allora.',
				other: 'Basata su {name}, con {count} impostazioni modificate da allora.',
			},
			modifiedUnknownCount: 'Basata su {name}, modificata da allora.',
			unknown: 'Non corrisponde a nessun profilo salvato.',
			missing: 'Nessuna configurazione grafica di iRacing trovata.',
		},
		badge: {
			active: 'Attivo',
			modified: 'Modificato',
		},
		empty: {
			title: 'Nessun profilo salvato per ora.',
			body: 'Salva la configurazione attuale di iRacing come profilo oppure importa un file .ini esistente.',
		},
		invalidProfile: 'Non è una configurazione grafica',
		warnings: {
			autoCfgIncomplete: 'Verrà reimpostato da iRacing',
		},
		actions: {
			apply: 'Applica',
			overwrite: 'Aggiorna dall’attuale',
			rename: 'Rinomina',
			export: 'Esporta',
			delete: 'Elimina',
			save: 'Salva',
			cancel: 'Annulla',
			saveCurrent: 'Salva l’attuale come…',
			import: 'Importa…',
			openFolder: 'Apri cartella',
		},
		prompt: {
			namePlaceholder: 'Nome del profilo',
			deleteConfirm: 'Eliminare {name}?',
		},
		feedback: {
			applied: '{name} applicato. Avvia iRacing perché abbia effetto.',
			saved: 'Salvato come {name}.',
			overwritten: '{name} aggiornato dalla configurazione attuale.',
			renamed: 'Rinominato in {name}.',
			deleted: '{name} eliminato.',
			imported: 'Importato come {name}.',
			exported: '{name} esportato.',
		},
		errors: {
			empty: 'Inserisci un nome per il profilo.',
			illegalCharacters:
				'Il nome di un profilo non può contenere nessuno di questi caratteri: < > : " / \\ | ? *',
			reservedName: 'Quel nome è riservato da Windows. Scegline un altro.',
			trailingDotOrSpace:
				'Il nome di un profilo non può terminare con un punto o uno spazio.',
			tooLong: 'Quel nome è troppo lungo.',
			duplicate: 'Esiste già un profilo con quel nome.',
			profileNotFound: 'Non è stato più possibile trovare quel profilo.',
			profileExists: 'Esiste già un profilo con quel nome.',
			duplicateContent:
				'Esiste già un profilo con esattamente queste impostazioni: {name}.',
			noActiveConfig:
				'Non è stata trovata alcuna configurazione grafica di iRacing da salvare.',
			invalidIni:
				'Quel file non è una configurazione grafica di iRacing, quindi non è stato usato.',
			iracingRunning:
				'Chiudi prima iRacing: all’uscita sovrascriverebbe la modifica.',
			ioError: 'Impossibile scrivere il file. Non è stato modificato nulla.',
		},
	},

	wgc: {
		cursorCaveat:
			'Il puntatore del mouse può comparire nelle catture su questa versione di Windows. Windows 10 versione 2004 ha introdotto il controllo che lo nasconde.',
		addonUnavailable:
			'Non è stato possibile caricare il componente di cattura ad alta fedeltà su questo sistema.',
		osUnsupported:
			'Windows.Graphics.Capture non è disponibile su questa versione di Windows. Richiede Windows 10 versione 1903 o successiva.',
		nativeCaptureOff: 'La cattura ad alta fedeltà (WGC) è disattivata',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing è a schermo intero esclusivo, quindi lo screenshot risulterebbe nero. In iRacing imposta Display > Full Screen su OFF (usa Borderless o Windowed) e riprova.',
		exclusiveFullscreenUnattributed:
			'Un’applicazione è a schermo intero esclusivo, il che produce una cattura nera. Se iRacing è a schermo intero, imposta Display > Full Screen su OFF (usa Borderless o Windowed) e riprova.',
		unknownError: 'Errore sconosciuto dello screenshot',
		outputTooSmall: 'La cattura è troppo piccola ({width}x{height})',
		blackFrame:
			'Il fotogramma catturato è nero — la sorgente di cattura potrebbe non aver funzionato (su alcune configurazioni Windows i contenuti accelerati dalla GPU non si lasciano catturare)',
		noSource:
			'Nessuna sorgente di cattura del desktop trovata per la finestra {windowId}',
		metadataTimeout:
			'Tempo scaduto in attesa dei metadati video della cattura',
		noVideoFrame:
			'Il flusso di cattura non ha prodotto alcun fotogramma video',
		dimensionTimeout:
			'Tempo scaduto in attesa delle dimensioni della finestra {width}x{height}; si procede con {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'È già in corso una cattura.',
		needsNativeCapture:
			'La lunga esposizione richiede la cattura ad alta fedeltà (WGC). Attivala nelle impostazioni per usarla.',
		unavailable: 'La lunga esposizione non è disponibile su questa macchina.',
		noTelemetry:
			'La lunga esposizione richiede la telemetria di replay di iRacing. Verifica che il simulatore sia in esecuzione e all’interno di una sessione.',
		windowNotFound: 'Finestra di iRacing non trovata.',
		cancelled: 'Cattura annullata.',
		seekTimeout:
			'Il replay non ha raggiunto il fotogramma {frame} in tempo. Potrebbe essere ancora in caricamento.',
		noPasses: 'Una cattura deve eseguire almeno un passaggio.',
		playbackStalled:
			'Il replay non è partito. Verifica che iRacing non sia stato messo in pausa da un altro strumento.',
		exposureTimeout:
			'L’esposizione non ha raggiunto il fotogramma {frame} entro {seconds} s.',
		endedEarly:
			'L’esposizione è terminata prima di raggiungere l’istante selezionato.',
		noFramesPresented:
			'iRacing non ha presentato alcun fotogramma da catturare.',
		subFrameNoSamples:
			'Questo tempo di posa è più breve di un fotogramma di replay e iRacing non ne ha renderizzato nessuno al suo interno. Prova una velocità di riproduzione più lenta, o il tempo di posa immediatamente più lungo.',
		noSamples:
			'Non è stato accumulato alcun fotogramma. iRacing potrebbe aver smesso di renderizzare durante l’esposizione.',
		blankCapture:
			'Tutti i fotogrammi catturati erano neri, quindi non c’è alcuna immagine da salvare. Verifica che iRacing sia in modalità finestra o senza bordi anziché a schermo intero esclusivo e che gli resti memoria video libera a questa risoluzione: abbassare la risoluzione di cattura è la prova più rapida.',
		frozenCapture:
			'iRacing ha presentato {samples} fotogrammi durante l’esposizione, ma erano tutti identici: questa immagine è uno scatto singolo e non una lunga esposizione. iRacing non ha renderizzato nulla di nuovo mentre il replay scorreva.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'La GPU non ha restituito alcuna immagine.',
		bracketShortfall:
			'Il bracketing ha richiesto {asked} tempi ma ne sono tornati {returned} — gli altri non si sono risolti, oppure questa versione del componente di cattura è precedente al bracketing.',
	},

	validation: {
		windowBeforeStart:
			'L’esposizione richiede {frames} fotogrammi di replay prima dell’istante selezionato, ma questo si trova solo a {anchor} fotogrammi dall’inizio del replay. Scegli un istante successivo o un tempo di posa più rapido.',
		pastEnd: 'L’istante selezionato è oltre la fine del replay.',
		sessionChanged:
			'Il replay è passato a un’altra sessione da quando questo scatto è stato impostato. Seleziona di nuovo l’istante.',
		singleSampleMultiPass:
			'Questo tempo di posa è così breve che vi cade circa un solo fotogramma per passaggio, quindi {passes} passaggi raccolgono all’incirca {passes} campioni. Una velocità di riproduzione o un tempo di posa più lenti ne portano molti di più.',
		singleSample:
			'Questo tempo di posa è così breve che vi cadrà un solo fotogramma, quindi il risultato non avrà alcuna sfocatura di movimento. Una velocità di riproduzione o un tempo di posa più lenti portano campioni.',
		bracketVsInterpolation:
			'Il bracketing dei tempi e l’interpolazione dei fotogrammi {factor}x non possono funzionare insieme, quindi questo scatto sarà eseguito senza interpolazione. Disattiva il bracketing se i fotogrammi intermedi contano più dei tempi aggiuntivi.',
		passesVsInterpolation:
			'Sono attivi sia i passaggi multipli sia l’interpolazione {factor}x. Competono tra loro: l’interpolazione rallenta ogni passaggio al punto da fargli perdere fotogrammi reali, così la stessa attesa compra meno campioni reali di quanti ne comprerebbero i soli passaggi. Disattivare l’interpolazione di solito dà uno scatto migliore.',
		shortOfTarget:
			'Anche a velocità 1/{divisor} questa esposizione raggiunge circa {samples} campioni, meno dei {target} richiesti. Usa un tempo di posa più lungo per ottenerne di più.',
		longCaptureEscalate:
			'Questa cattura riproduce il replay a velocità 1/{divisor} per circa {duration} di tempo reale{passSuffix} e non può essere accelerata una volta avviata. {advice}',
		longCaptureWarn:
			'Questa cattura richiederà circa {duration} di tempo reale a velocità di riproduzione 1/{divisor}{passSuffix}.',
		passSuffix: ', distribuiti su {passes} passaggi sullo stesso istante',
		adviceFewerPasses: 'Meno passaggi finiscono prima, con meno campioni.',
		adviceFasterPlayback:
			'Una velocità di riproduzione più alta finisce prima, con meno campioni.',
		pastLogCap:
			'Si prevede che questa cattura raccolga circa {samples} campioni su {passes} passaggi, oltre i {cap} che il registro diagnostico può contenere. L’immagine non ne risente — solo i dati di uniformità e di intervallo descriveranno la prima parte della cattura.',
		interpolationLossy:
			'A queste dimensioni, l’interpolazione {factor}x è già costata campioni reali a questa macchina. Valuta un fattore più basso, una risoluzione inferiore o, in alternativa, più passaggi.',
	},

	duration: {
		zero: '0 secondi',
		seconds: {
			one: '{count} secondo',
			other: '{count} secondi',
		},
		minutes: {
			one: '{count} minuto',
			other: '{count} minuti',
		},
		minutesSeconds: '{minutes} min {seconds} s',
	},
};

export default it;
