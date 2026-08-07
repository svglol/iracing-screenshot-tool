// French. Translated from en.ts — see that file's header before editing.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats
// are what the user sees in iRacing's own settings and on their hardware.

import type { Catalog } from './index';

const fr: Catalog = {
	notice: {
		danger: 'Problèmes',
		warning: 'À savoir',
		info: 'Remarques',
	},

	promo: {
		greeting: 'Merci d’utiliser iRacing Screenshot Tool !',
		signature: 'Conçu et maintenu par AR Media Solutions.',
	},

	changelog: {
		title: 'Journal des modifications',
		untitledRelease: 'Version',
	},

	gallery: {
		menu: {
			openExternally: 'Ouvrir dans une autre application',
			openFolder: 'Ouvrir le dossier',
			copy: 'Copier',
			delete: 'Supprimer',
		},
		copiedToClipboard: '{name} copié dans le presse-papiers',
	},

	sidebar: {
		resolution: 'Résolution',
		width: 'Largeur',
		height: 'Hauteur',
		output: 'Sortie :',
		cropWatermark: 'Rogner le filigrane',
		keepAspectRatio: 'Conserver le rapport d’image',
		screenshot: 'Capture d’écran',
		custom: 'Personnalisée',
		vramStatus: '{adapter}{free} libres sur {total}',
		savedSuccessfully: '{name} enregistré avec succès',
		screenshotFailed: 'Échec de la capture : {message}',
		errorLogPrefix: 'Journal : ',
		notices: {
			exclusiveFullscreen:
				'iRacing est en plein écran exclusif — les captures seront noires. Dans iRacing, mettez Display > Full Screen sur OFF (Borderless ou Windowed) pour permettre la capture.',
			vramRisk:
				'{resolution} nécessite environ {needed} de VRAM en plus, mais seuls {free} sont libres — iRacing va probablement manquer de mémoire et planter.',
			vramCaution:
				'{resolution} laisse peu de marge de VRAM ({free} libres) et peut planter sur les combinaisons circuit/voiture les plus lourdes.',
			switchResolution: 'Passer en {resolution}',
			vramStatic:
				'Les résolutions élevées peuvent faire planter iRacing si la VRAM vient à manquer. Certaines combinaisons circuit/voiture demandent davantage de VRAM.',
			reshade:
				'Après avoir appuyé sur le bouton de capture dans iRacing Screenshot Tool, vous devrez utiliser votre raccourci de capture ReShade.',
			crop: 'Le rognage du filigrane zoome légèrement l’image finale. Les zones proches des bords de l’écran seront coupées.',
			aspectRatio:
				'« Conserver le rapport d’image » ajuste la hauteur de la capture au rapport de votre écran (par exemple 21:9 ultra-large) au lieu du 16:9 par défaut. La résolution choisie définit la largeur.',
		},
	},

	settings: {
		title: 'Paramètres',
		version: 'Version - {version}',
		changelog: 'Journal des modifications',
		openLogsFolder: 'Ouvrir le dossier des journaux',
		checkForUpdates: 'Rechercher des mises à jour',
		updateCheckFailed: 'Échec de la recherche de mise à jour : {message}',

		language: 'Langue',
		languageDescription:
			'La langue utilisée dans toute l’application. Détectée depuis Windows au premier lancement.',

		screenshotFolder: 'Dossier des captures',
		selectFolder: 'Choisir un dossier',
		screenshotKeybind: 'Raccourci de capture',
		editBind: 'Modifier le raccourci',

		customFilenameFormat: 'Format de nom de fichier personnalisé',
		customFilenameFormatDescription:
			'Utiliser un modèle personnalisé au lieu du format par défaut ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Cliquez sur les champs pour les ajouter au format. Saisissez directement les séparateurs (-, _, etc.).',
		reset: 'Réinitialiser',
		preview: 'Aperçu :',

		outputFormat: 'Format de sortie',
		formatJpeg: 'JPEG (qualité maximale)',
		formatPng: 'PNG (sans perte)',
		formatWebp: 'WebP (qualité 95 %)',

		disableTooltips: 'Masquer les conseils',
		disableTooltipsDescription:
			'Laissez-moi tranquille, je sais ce que je fais',

		cropTopLeft: 'Préférer le rognage du filigrane en haut à gauche',
		cropTopLeftDescription:
			'Ne rogne que le coin inférieur droit (3 %). Si l’option est désactivée, la capture est rognée uniformément sur tous les côtés (6 % au total) pour un résultat centré.',

		manualWindowRestore: 'Restauration manuelle de la fenêtre',
		manualWindowRestoreDescription:
			'Remplace la restauration automatique de la fenêtre par une position et une taille personnalisées. Utile en ultra-large ou en Nvidia Surround.',
		left: 'Gauche',
		top: 'Haut',
		width: 'Largeur',
		height: 'Hauteur',
		restoreNow: 'Restaurer maintenant',

		nativeCapture: 'Capture haute fidélité (WGC)',
		nativeCaptureDescription:
			'Capture les couleurs réelles sans sous-échantillonnage via Windows.Graphics.Capture au lieu du pipeline par défaut (qui sous-échantillonne la couleur). Bascule automatiquement en cas d’échec d’une capture.',
		nativeCaptureUnavailable:
			'Indisponible sur ce système — la capture haute fidélité ne peut pas fonctionner ici.',
		nativeCaptureUnverified:
			'Windows indique que c’est pris en charge, mais une capture de test n’est pas revenue. Les captures basculeront automatiquement si l’échec persiste.',

		reshade: 'Mode de compatibilité ReShade',
		reshadeDescription:
			'Avec ReShade, vous devez d’abord utiliser le raccourci d’iRacing Screenshot Tool ou appuyer sur le bouton, puis utiliser votre raccourci de capture ReShade une fois la fenêtre d’iRacing redimensionnée.',
		reshadeIni: 'Fichier INI de ReShade',
		selectFile: 'Choisir un fichier',
	},

	longExposure: {
		title: 'Pose longue',
		shutter: 'Vitesse d’obturation',
		playbackSpeed: 'Vitesse de lecture',
		playbackAuto: 'Automatique (d’après l’objectif d’échantillons)',
		playbackRealTime: '1x (temps réel)',
		targetSamples: 'Objectif d’échantillons',
		advanced: 'Avancé',
		defaultsSummary: '{count} valeurs par défaut',

		weighting: 'Pondération',
		weightingBox: 'Box (uniforme)',
		weightingLinear: 'Linéaire (net à la fin)',
		weightingEase: 'Ease (tête plus nette, longue traîne)',

		interpolation: 'Interpolation d’images',
		interpolationOff: 'Désactivée',
		interpolation2: '2× (une image intermédiaire)',
		interpolation4: '4× (trois images intermédiaires)',
		interpolation8: '8× (sept images intermédiaires)',

		passes: 'Passes',
		passes1: '1 (passe unique)',
		passes2: '2× — deux fois plus d’attente',
		passes4: '4× — quatre fois plus d’attente',
		passes8: '8× — huit fois plus d’attente',

		bracket: 'Bracketing des vitesses',
		highlightRecovery: 'Récupération des hautes lumières (IL)',

		cancel: 'Annuler',
		saved: 'Pose longue enregistrée — {count} échantillons',
		failed: 'Échec de la pose longue',

		modified: {
			weighting_linear: 'linéaire',
			weighting_ease: 'ease',
			interpolation: 'interpolation {factor}×',
			passes: {
				one: '{count} passe',
				other: '{count} passes',
			},
			bracketed: 'bracketing',
			recovery: 'récupération de {stops} IL',
		},

		progress: {
			working: 'Traitement…',
			seeking: 'Recherche…{pass}',
			accumulating: 'Exposition… {count} échantillons{pass}',
			resolving: 'Développement…',
			restoring: 'Restauration du replay…',
			pass: ' (passe {current} sur {total})',
		},

		notices: {
			needsNativeCapture:
				'La pose longue nécessite la capture haute fidélité (WGC), actuellement désactivée. Activez-la dans les paramètres pour utiliser la pose longue.',
			unavailableWithReason:
				'La pose longue est indisponible sur cette machine : {reason}',
			unavailable: 'La pose longue est indisponible sur cette machine.',
			interpolationCost:
				'L’interpolation invente des images entre les images réelles pour lisser la traînée. Elle coûte du temps GPU par image : comparez donc le nombre d’échantillons réels de la prise enregistrée avec la même prise sans interpolation. Si ce nombre baisse, elle achète des échantillons inventés avec des échantillons réels.',
			passesAndInterpolation:
				'Les passes et l’interpolation se disputent le même budget par image. Avec les deux activées, chaque passe capture moins d’images réelles — désactiver l’interpolation donne généralement une meilleure prise pour la même attente.',
			passes:
				'Chaque passe rejoue le même instant et rattrape les images que les autres ont manquées : la traînée devient plus régulière, pas plus lumineuse. Idéal sur les vitesses rapides, où une seule passe ne recueille qu’une poignée d’échantillons.',
			interpolationUnsupported:
				'L’interpolation d’images nécessite un GPU NVIDIA Turing ou plus récent{adapter}. Tout le reste de la pose longue fonctionne normalement.',
			interpolationAdapter: ' (cette capture s’exécute sur {adapter})',
			reshade:
				'La pose longue capture nativement et n’utilise pas ReShade : les effets ReShade n’apparaîtront donc pas dans le résultat.',
		},
	},

	help: {
		title: 'Aide',
		sections: 'Sections d’aide',
		tabGeneral: 'Général',
		tabLongExposure: 'Pose longue',

		general: {
			iracingSettings: 'Paramètres iRacing',
			borderless:
				'iRacing doit fonctionner en mode Windowed Borderless (fenêtré sans bordure)',
			vram: 'Au moins 8 Go de VRAM sont recommandés pour des captures en 8K ou plus',
			newerContent:
				'Les circuits et voitures récents demandent davantage de VRAM',
			shrinkUi:
				'Réduisez l’interface au minimum avant de prendre une capture si vous utilisez l’option de rognage du filigrane. « Control+PageDown » la réduit ; si cela ne fonctionne pas, vous devrez peut-être réinitialiser le zoom de l’interface dans les paramètres d’iRacing.',

			screenshotFolder: 'Dossier des captures',
			screenshotFolderBody:
				'Les captures sont enregistrées par défaut dans « C:\\Users\\user\\Pictures\\Screenshots » ; cela peut être modifié dans les paramètres.',

			screenshotHotkey: 'Raccourci de capture',
			screenshotHotkeyBody:
				'Par défaut, « Control + PrintScreen » prend une capture avec les réglages actuels ; cela peut être modifié dans les paramètres.',

			issues: 'Problèmes',
			issuesBody: 'En cas de problème, merci de le signaler sur le',
			discord: 'Discord',

			instructions: 'Instructions',
			step1: 'iRacing <b>doit</b> fonctionner en mode Windowed Borderless',
			step2: 'Lancez iRacing et placez la caméra à l’endroit souhaité pour la capture',
			step3: 'Choisissez la résolution voulue (essayez des résolutions plus basses avant de passer en 8K)',
			step4: 'Décidez si vous voulez rogner le filigrane iRacing ; si oui, réduisez d’abord l’interface d’iRacing à sa plus petite taille avec « Control + PageDown »',
			step5: 'Appuyez sur le bouton de capture ou utilisez le raccourci « Control + PrintScreen » pour prendre les captures',
			step6: 'Selon la résolution choisie, cela peut prendre quelques secondes ; l’opération est terminée lorsque la fenêtre d’iRacing retrouve sa taille normale',
			step7: 'Votre capture sera enregistrée dans « C:\\Users\\{User}\\Pictures\\Screenshots »',
		},

		longExposure: {
			whatItDoes: 'Ce que ça fait',
			whatItDoesBody:
				'Une pose longue fond de nombreuses images d’un replay en une seule, comme le fait un obturateur laissé ouvert : ce qui est immobile reste net, ce qui bouge laisse une traînée. L’outil pilote lui-même le replay, capture chaque image présentée par le simulateur et les additionne sur le GPU.',

			shutter: 'Vitesse d’obturation',
			shutterBody:
				'La durée de l’exposition <i>en temps de replay</i>, d’une fraction d’image de replay jusqu’à dix secondes. C’est ce réglage qui détermine la longueur des traînées. Les vitesses plus lentes recueillent aussi plus d’images et ont donc moins besoin de tout ce qui suit ; les crans les plus rapides couvrent une seule image de replay et ne recueillent qu’une poignée d’échantillons.',

			playback: 'Vitesse de lecture',
			playbackBody:
				'Le replay est lu au ralenti pendant la capture de l’exposition : le simulateur présente donc plus d’images par seconde de temps de replay et le mélange obtient plus d’échantillons. 1/16 recueille environ seize fois plus d’images que le temps réel — et prend seize fois plus de temps réel. C’est le compromis principal de ce panneau : de la patience contre de la douceur.',
			playbackAutoBody:
				'« Automatique (d’après l’objectif d’échantillons) » choisit la vitesse à votre place à partir de l’<b>objectif d’échantillons</b> : l’outil détermine la lecture la plus rapide qui atteint encore le nombre demandé. Indiquez plutôt une vitesse explicite si vous préférez plafonner l’attente.',

			weighting: 'Pondération',
			weightingBody:
				'La contribution de chaque image capturée au résultat. <b>Box</b> les pondère toutes également et donne une traînée uniforme. <b>Linéaire</b> monte vers la fin de la fenêtre : le sujet est le plus net là où il a terminé et s’estompe le long de son trajet. <b>Ease</b> reprend la même idée avec une tête plus nette et une traîne plus longue.',

			interpolation: 'Interpolation d’images',
			interpolationBody:
				'Invente des images supplémentaires entre les images réelles à l’aide du moteur de flux optique du GPU, comblant les trous le long de la traînée. Nécessite une carte NVIDIA Turing ou plus récente et est entièrement masquée sur le matériel qui ne le permet pas.',
			interpolationCostBody:
				'Ce n’est pas gratuit : cela coûte du temps GPU sur chaque image capturée, et le budget est d’une image iRacing. Si elle ne suit pas, elle commence à manquer des images <i>réelles</i> pour en fabriquer des synthétiques, ce qui est une perte nette — la traînée ressort plus courte et plus grossière. Le coût évolue avec les mégapixels multipliés par le facteur : ce qui est confortable en 2560×1440 n’est pas viable en 8K. Pour vérifier, photographiez deux fois le même instant, avec et sans, et comparez le nombre d’échantillons réels ; l’application vous avertit aussi après coup si une prise est restée courte.',

			passes: 'Passes',
			passesBody:
				'Visite plusieurs fois le même instant en accumulant dans une seule image. Chaque passe attrape des images que les autres ont manquées, la traînée devient donc plus régulière — pas plus lumineuse, car le résultat est normalisé par la quantité de lumière réellement reçue par chaque pixel.',
			passesTradeBody:
				'Les passes achètent la même chose que l’interpolation, dans une autre monnaie : du temps réel plutôt que du temps GPU. Huit passes prennent environ huit fois plus longtemps, mais elles ne peuvent jamais vous coûter d’images réelles. C’est donc le bon levier aux hautes résolutions, où l’interpolation ne suit pas, et sur les vitesses rapides, où une seule passe recueille très peu d’échantillons. Utiliser les deux à la fois est généralement le pire des deux mondes — elles se disputent le même budget par image.',

			bracket: 'Bracketing des vitesses',
			bracketBody:
				'Produit une image par cran d’obturation égal ou plus rapide que celui choisi, à partir d’une seule capture. Une prise à 1/60 vous donne aussi 1/125, 1/250, 1/500 et 1/1000 — le même instant avec des traînées de plus en plus courtes — ce qui vous permet de choisir le rendu après coup au lieu de deviner et de refaire la prise.',
			bracketCostBody:
				'Cela ne coûte presque aucun temps supplémentaire. Chaque cran se termine sur la même image et ne diffère que par la profondeur de son retour en arrière : une vitesse plus rapide n’est que la fin des images qui défilent déjà — elles sont toutes remplies à partir d’une seule passe du replay.',
			bracketMemoryBody:
				'Ce que cela coûte, c’est de la mémoire. Chaque cran a besoin de son propre accumulateur en pleine résolution : onze crans demandent donc onze fois la mémoire vidéo d’un seul, ce qui, en 8K, dépasse ce dont disposent la plupart des cartes. La capture vérifie ce point avant de démarrer et refuse plutôt que de faire planter iRacing. Si un bracketing est refusé, baissez la résolution ou choisissez une vitesse plus rapide — ce qui raccourcit aussi l’échelle.',
			bracketNamingBody:
				'Le cran que vous avez choisi est enregistré sous le nom habituel et c’est celui qui apparaît dans la galerie ; les autres se placent à côté, avec leur vitesse dans le nom de fichier.',

			highlights: 'Récupération des hautes lumières',
			highlightsBody:
				'Amplifie les hautes lumières proches de l’écrêtage avant l’addition des images, puis annule l’amplification à la fin. iRacing fournit une image déjà tonemappée : un phare et un mur blanc arrivent donc à la même valeur, et en moyenner cela transforme une lumière vive traversant une partie de l’exposition en une tache grise plutôt qu’en une traînée lumineuse. Cette option remet la non-linéarité là où un vrai capteur la place. Mesurée en IL ; 0 désactive l’option et ne change strictement rien.',

			whatItSaves: 'Ce qui est enregistré',
			whatItSavesBody:
				'La taille, le rognage du filigrane et le format de fichier suivent les mêmes réglages qu’une capture normale — les options Résolution et Rogner le filigrane ci-dessus, et le format de sortie dans les paramètres. La ligne « Sortie » en haut de la barre latérale indique exactement ce que vous obtiendrez.',
			whatItSavesPngBody:
				'Choisir PNG écrit un véritable master 16 bits, ce qui vaut la peine si vous comptez étalonner la prise ensuite, plus un aperçu 8 bits pour la galerie. C’est aussi beaucoup plus lent à écrire en haute résolution — un PNG 16 bits de 33 mégapixels demande une dizaine de secondes là où la même image en JPEG prend moins d’une seconde.',

			troubleshooting: 'Si le résultat semble incorrect',
			troubleGhosts:
				'<b>Des images fantômes distinctes au lieu d’une traînée régulière</b> — trop peu d’échantillons. Utilisez une vitesse de lecture plus lente, plus de passes, ou une résolution plus basse.',
			troubleShutter:
				'<b>Vous ne savez pas quelle vitesse vous vouliez</b> — activez le bracketing des vitesses et décidez après coup, pour la même attente.',
			troubleHighlights:
				'<b>Hautes lumières brûlées ou plates</b> — essayez 3 à 5 IL de récupération des hautes lumières.',
			troubleBlack:
				'<b>Une image noire</b> — iRacing est en plein écran exclusif. Mettez Display &gt; Full Screen sur OFF.',
			troubleSidecar:
				'Chaque prise consigne les réglages exacts utilisés, le nombre d’échantillons et leur régularité, dans un fichier .json placé dans le dossier des journaux à côté d’app.log. Les 20 dernières prises sont conservées — un bracketing compte pour une — de sorte que la prise sur laquelle vous vous interrogez est encore là pendant que vous vous interrogez.',
		},
	},

	update: {
		checking: 'Recherche de mises à jour…',
		newVersion: 'Une nouvelle version',
		availableBusy:
			'{version} est disponible. Une capture est en cours — vous pourrez la télécharger une fois celle-ci terminée.',
		available: '{version} est disponible. Cliquez pour la télécharger.',
		downloading: 'Téléchargement de {version}…',
		downloadingPercent: 'Téléchargement de {version} — {percent} %',
		downloadedBusy:
			'{version} est prête. Une capture est en cours : elle s’installera à la fermeture de l’application.',
		downloaded:
			'{version} est prête. Cliquez pour redémarrer et l’installer.',
		failed: 'Échec de la recherche de mise à jour : {error}',
		unknownError: 'erreur inconnue',
		neverChecked:
			'Aucune recherche de mise à jour n’a encore été faite (vous êtes en v{version}).',
		upToDate: 'Vous êtes sur la dernière version (v{version}).',

		alreadyDownloading: 'La mise à jour est déjà en cours de téléchargement.',
		alreadyDownloaded: 'La mise à jour est déjà téléchargée.',
		nothingToDownload: 'Aucune mise à jour à télécharger.',
		captureInProgress:
			'Une capture est en cours. Réessayez une fois celle-ci terminée.',
		nothingToInstall: 'Aucune mise à jour prête à être installée.',
		captureInProgressInstall:
			'Une capture est en cours. La mise à jour s’installera d’elle-même à la fermeture de l’application.',
		devBuildOnly:
			'La recherche de mises à jour ne fonctionne que dans une version installée.',

		installTitle: 'Installer la mise à jour',
		installMessage: 'Installer la version {version} ?',
		installFallbackVersion: 'mise à jour',
		installDetail:
			'L’application se fermera et se rouvrira une fois la mise à jour installée. Si vous choisissez « Plus tard », elle s’installera d’elle-même à la prochaine fermeture.',
		installConfirm: 'Redémarrer et installer',
		installLater: 'Plus tard',
	},

	filenameFields: {
		categories: {
			Track: 'Circuit',
			Driver: 'Pilote',
			Session: 'Session',
			Meta: 'Méta',
		},
		track: 'Circuit',
		trackFull: 'Circuit complet',
		trackCity: 'Ville',
		trackCountry: 'Pays',
		trackType: 'Type de circuit',
		driver: 'Pilote',
		driverAbbrev: 'Pilote abrégé',
		driverInitials: 'Initiales',
		team: 'Équipe',
		carNumber: 'N° voiture',
		car: 'Voiture',
		carFull: 'Voiture complète',
		carClass: 'Catégorie',
		iRating: 'iRating',
		sessionType: 'Type de session',
		sessionName: 'Nom de session',
		lap: 'Tour',
		date: 'Date',
		time: 'Heure',
		datetime: 'Date+heure',
		counter: 'Compteur',
	},

	iracingConfig: {
		projections:
			'Désactivez « Render Scene Using 3 Projections » dans iRacing (onglet Display > Monitor) pour éviter les bandes verticales dans les captures',
	},

	wgc: {
		cursorCaveat:
			'Le curseur de la souris peut apparaître dans les captures sur cette version de Windows. Windows 10 version 2004 a ajouté le réglage qui le masque.',
		addonUnavailable:
			'Le composant de capture haute fidélité n’a pas pu être chargé sur ce système.',
		osUnsupported:
			'Windows.Graphics.Capture n’est pas disponible sur cette version de Windows. Il faut Windows 10 version 1903 ou plus récent.',
		nativeCaptureOff: 'La capture haute fidélité (WGC) est désactivée',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing est en plein écran exclusif : la capture serait donc noire. Dans iRacing, mettez Display > Full Screen sur OFF (utilisez Borderless ou Windowed) puis réessayez.',
		exclusiveFullscreenUnattributed:
			'Une application fonctionne en plein écran exclusif, ce qui produit une capture noire. Si iRacing est en plein écran, mettez Display > Full Screen sur OFF (utilisez Borderless ou Windowed) puis réessayez.',
		unknownError: 'Erreur de capture inconnue',
		outputTooSmall: 'La capture est trop petite ({width}x{height})',
		blackFrame:
			'L’image capturée est noire — la source de capture a peut-être échoué (le contenu accéléré par le GPU peut ne pas se capturer sur certaines configurations Windows)',
		noSource:
			'Aucune source de capture du bureau trouvée pour la fenêtre {windowId}',
		metadataTimeout:
			'Délai dépassé en attendant les métadonnées vidéo de la capture',
		noVideoFrame: 'Le flux de capture n’a produit aucune image vidéo',
		dimensionTimeout:
			'Délai dépassé en attendant les dimensions de fenêtre {width}x{height} ; poursuite avec {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'Une capture est déjà en cours.',
		needsNativeCapture:
			'La pose longue nécessite la capture haute fidélité (WGC). Activez-la dans les paramètres pour l’utiliser.',
		unavailable: 'La pose longue n’est pas disponible sur cette machine.',
		noTelemetry:
			'La pose longue nécessite la télémétrie de replay d’iRacing. Vérifiez que le simulateur est lancé et dans une session.',
		windowNotFound: 'Fenêtre iRacing introuvable.',
		cancelled: 'Capture annulée.',
		seekTimeout:
			'Le replay n’a pas atteint l’image {frame} à temps. Il est peut-être encore en cours de chargement.',
		noPasses: 'Une capture doit effectuer au moins une passe.',
		playbackStalled:
			'Le replay n’a pas démarré. Vérifiez qu’iRacing n’est pas mis en pause par un autre outil.',
		exposureTimeout:
			'L’exposition n’a pas atteint l’image {frame} en moins de {seconds} s.',
		endedEarly:
			'L’exposition s’est terminée avant d’atteindre l’instant choisi.',
		noFramesPresented: 'iRacing n’a présenté aucune image à capturer.',
		subFrameNoSamples:
			'Cette vitesse d’obturation est plus courte qu’une image de replay, et iRacing n’a rendu aucune image pendant ce laps de temps. Essayez une vitesse de lecture plus lente, ou le cran d’obturation immédiatement plus lent.',
		noSamples:
			'Aucune image n’a été accumulée. iRacing a peut-être cessé de rendre pendant l’exposition.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'Le GPU n’a renvoyé aucune image.',
		bracketShortfall:
			'Le bracketing a demandé {asked} crans mais {returned} sont revenus — les autres n’ont pas pu être résolus, ou cette version du composant de capture est antérieure au bracketing.',
	},

	validation: {
		windowBeforeStart:
			'L’exposition nécessite {frames} images de replay avant l’instant choisi, or celui-ci ne se situe qu’à {anchor} images du début du replay. Choisissez un instant plus tardif ou une vitesse plus rapide.',
		pastEnd: 'L’instant choisi se situe après la fin du replay.',
		sessionChanged:
			'Le replay est passé à une autre session depuis la préparation de cette prise. Sélectionnez à nouveau l’instant.',
		singleSampleMultiPass:
			'Cette vitesse est si courte qu’environ une seule image y tombe par passe : {passes} passes ne recueillent donc qu’environ {passes} échantillons. Une vitesse de lecture plus lente ou une vitesse d’obturation plus lente en apporte bien davantage.',
		singleSample:
			'Cette vitesse est si courte qu’une seule image y tombera : le résultat n’aura donc aucun flou de mouvement. Une vitesse de lecture plus lente ou une vitesse d’obturation plus lente apporte des échantillons.',
		bracketVsInterpolation:
			'Le bracketing des vitesses et l’interpolation d’images {factor}x ne peuvent pas fonctionner ensemble : cette prise sera donc faite sans interpolation. Désactivez le bracketing si les images intermédiaires comptent plus pour vous que les crans supplémentaires.',
		passesVsInterpolation:
			'Le multi-passe et l’interpolation {factor}x sont tous deux activés. Ils se concurrencent : l’interpolation ralentit chaque passe au point de lui coûter des images réelles, si bien que la même attente achète moins d’échantillons réels que les passes seules. Désactiver l’interpolation donne généralement une meilleure prise.',
		shortOfTarget:
			'Même à la vitesse 1/{divisor}, cette exposition n’atteint qu’environ {samples} échantillons, en deçà des {target} demandés. Utilisez une vitesse d’obturation plus lente pour en obtenir davantage.',
		longCaptureEscalate:
			'Cette capture lit le replay à la vitesse 1/{divisor} pendant environ {duration} de temps réel{passSuffix}, et ne peut pas être accélérée une fois lancée. {advice}',
		longCaptureWarn:
			'Cette capture prendra environ {duration} de temps réel à la vitesse de lecture 1/{divisor}{passSuffix}.',
		passSuffix: ', réparties sur {passes} passes sur le même instant',
		adviceFewerPasses:
			'Moins de passes se terminent plus tôt, avec moins d’échantillons.',
		adviceFasterPlayback:
			'Une vitesse de lecture plus rapide se termine plus tôt, avec moins d’échantillons.',
		pastLogCap:
			'Cette capture devrait recueillir environ {samples} échantillons sur {passes} passes, au-delà des {cap} que contient le journal de diagnostic. L’image n’est pas affectée — seules les mesures de régularité et d’écart décriront la première partie de la capture.',
		interpolationLossy:
			'À cette taille, l’interpolation {factor}x a déjà coûté des échantillons réels à cette machine. Envisagez un facteur plus faible, une résolution plus basse, ou davantage de passes à la place.',
	},

	duration: {
		zero: '0 seconde',
		seconds: {
			one: '{count} seconde',
			other: '{count} secondes',
		},
		minutes: {
			one: '{count} minute',
			other: '{count} minutes',
		},
		minutesSeconds: '{minutes} min {seconds} s',
	},
};

export default fr;
