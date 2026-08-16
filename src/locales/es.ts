// Spanish. Translated from en.ts — see that file's header before editing.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.

import type { Catalog } from './index';

const es: Catalog = {
	notice: {
		danger: 'Problemas',
		warning: 'Conviene saber',
		info: 'Notas',
	},

	promo: {
		greeting: '¡Gracias por usar iRacing Screenshot Tool!',
		signature: 'Creado y mantenido por AR Media Solutions.',
	},

	changelog: {
		title: 'Registro de cambios',
		untitledRelease: 'Versión',
	},

	gallery: {
		menu: {
			openExternally: 'Abrir con otra aplicación',
			openFolder: 'Abrir carpeta',
			copy: 'Copiar',
			delete: 'Eliminar',
		},
		copiedToClipboard: '{name} copiado al portapapeles',
	},

	sidebar: {
		resolution: 'Resolución',
		width: 'Ancho',
		height: 'Alto',
		output: 'Salida:',
		cropWatermark: 'Recortar marca de agua',
		keepAspectRatio: 'Mantener relación de aspecto',
		screenshot: 'Captura',
		custom: 'Personalizada',
		vramStatus: '{adapter}{free} libres de {total}',
		savedSuccessfully: '{name} guardado correctamente',
		screenshotFailed: 'Error en la captura: {message}',
		errorLogPrefix: 'Registro: ',
		notices: {
			exclusiveFullscreen:
				'iRacing está en pantalla completa exclusiva — las capturas saldrán en negro. En iRacing, pon Display > Full Screen en OFF (Borderless o Windowed) para permitir la captura.',
			vramRisk:
				'{resolution} necesita unos {needed} más de VRAM, pero solo hay {free} libres — es probable que iRacing se quede sin memoria y se cierre.',
			vramCaution:
				'{resolution} deja poco margen de VRAM ({free} libres) y puede fallar en combinaciones exigentes de circuito y coche.',
			switchResolution: 'Cambiar a {resolution}',
			vramStatic:
				'Las resoluciones altas pueden hacer que iRacing falle si te quedas sin VRAM. Ciertas combinaciones de circuito y coche requieren más VRAM.',
			reshade:
				'Después de pulsar el botón de captura en iRacing Screenshot Tool, tendrás que pulsar tu atajo de captura de ReShade.',
			crop: 'Recortar la marca de agua acerca ligeramente la imagen final. Las zonas cercanas a los bordes de la pantalla quedarán cortadas.',
			aspectRatio:
				'«Mantener relación de aspecto» ajusta el alto de la captura a la relación de tu monitor (por ejemplo 21:9 ultrapanorámico) en lugar del 16:9 predeterminado. La resolución elegida define el ancho.',
		},
	},

	settings: {
		title: 'Ajustes',
		version: 'Versión - {version}',
		changelog: 'Registro de cambios',
		openLogsFolder: 'Abrir carpeta de registros',
		checkForUpdates: 'Buscar actualizaciones',
		updateCheckFailed: 'Error al buscar actualizaciones: {message}',

		language: 'Idioma',
		languageDescription:
			'El idioma usado en toda la aplicación. Se detecta desde Windows la primera vez que se ejecuta.',

		screenshotFolder: 'Carpeta de capturas',
		selectFolder: 'Elegir carpeta',
		screenshotKeybind: 'Atajo de captura',
		editBind: 'Editar atajo',

		customFilenameFormat: 'Formato de nombre personalizado',
		customFilenameFormatDescription:
			'Usar un patrón propio en lugar del predeterminado ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Haz clic en los campos para añadirlos al formato. Escribe los separadores (-, _, etc.) directamente.',
		reset: 'Restablecer',
		preview: 'Vista previa:',

		outputFormat: 'Formato de salida',
		formatJpeg: 'JPEG (máxima calidad)',
		formatPng: 'PNG (sin pérdidas)',
		formatWebp: 'WebP (calidad 95 %)',

		disableTooltips: 'Ocultar consejos',
		disableTooltipsDescription: 'Déjame en paz, sé lo que hago',

		cropTopLeft: 'Preferir recorte de marca de agua arriba a la izquierda',
		cropTopLeftDescription:
			'Recorta solo la esquina inferior derecha (3 %). Si está desactivado, la captura se recorta por igual en todos los lados (6 % en total) para un resultado centrado.',

		manualWindowRestore: 'Restauración manual de ventana',
		manualWindowRestoreDescription:
			'Sustituye la restauración automática de la ventana por una posición y un tamaño propios. Útil para quien usa ultrapanorámica o Nvidia Surround.',
		left: 'Izquierda',
		top: 'Arriba',
		width: 'Ancho',
		height: 'Alto',
		restoreNow: 'Restaurar ahora',

		nativeCapture: 'Captura de alta fidelidad (WGC)',
		nativeCaptureDescription:
			'Captura color real sin submuestreo mediante Windows.Graphics.Capture en lugar del método predeterminado (que submuestrea el color). Recurre automáticamente al método alternativo si una captura falla.',
		nativeCaptureUnavailable:
			'No disponible en este sistema — la captura de alta fidelidad no puede funcionar aquí.',
		nativeCaptureUnverified:
			'Windows indica que es compatible, pero una captura de prueba no llegó a completarse. Las capturas recurrirán al método alternativo si sigue fallando.',

		reshade: 'Modo de compatibilidad con ReShade',
		reshadeDescription:
			'Con ReShade tendrás que usar primero el atajo de iRacing Screenshot Tool o pulsar el botón, y después usar tu atajo de captura de ReShade una vez que la ventana de iRacing haya cambiado de tamaño.',
		reshadeIni: 'INI de ReShade',
		selectFile: 'Elegir archivo',
	},

	longExposure: {
		title: 'Exposición larga',
		shutter: 'Obturación',
		playbackSpeed: 'Velocidad de reproducción',
		playbackAuto: 'Automática (según el objetivo de muestras)',
		playbackRealTime: '1x (tiempo real)',
		targetSamples: 'Objetivo de muestras',
		advanced: 'Avanzado',
		defaultsSummary: '{count} valores predeterminados',

		weighting: 'Ponderación',
		weightingBox: 'Box (uniforme)',
		weightingLinear: 'Lineal (nítida al final)',
		weightingEase: 'Ease (cabeza más nítida, cola larga)',

		interpolation: 'Interpolación de fotogramas',
		interpolationOff: 'Desactivada',
		interpolation2: '2× (un fotograma intermedio)',
		interpolation4: '4× (tres fotogramas intermedios)',
		interpolation8: '8× (siete fotogramas intermedios)',

		passes: 'Pasadas',
		passes1: '1 (una sola pasada)',
		passes2: '2× — el doble de espera',
		passes4: '4× — cuatro veces la espera',
		passes8: '8× — ocho veces la espera',

		bracket: 'Horquillado de obturación',
		highlightRecovery: 'Recuperación de altas luces (pasos)',

		cancel: 'Cancelar',
		saved: 'Exposición larga guardada — {count} muestras',
		failed: 'Error en la exposición larga',

		modified: {
			weighting_linear: 'lineal',
			weighting_ease: 'ease',
			interpolation: 'interpolación {factor}×',
			passes: {
				one: '{count} pasada',
				other: '{count} pasadas',
			},
			bracketed: 'horquillado',
			recovery: 'recuperación de {stops} pasos',
		},

		progress: {
			working: 'Trabajando…',
			seeking: 'Buscando…{pass}',
			accumulating: 'Exponiendo… {count} muestras{pass}',
			resolving: 'Revelando…',
			restoring: 'Restaurando la repetición…',
			pass: ' (pasada {current} de {total})',
		},

		notices: {
			needsNativeCapture:
				'La exposición larga necesita la captura de alta fidelidad (WGC), que está desactivada. Actívala en los ajustes para poder usarla.',
			unavailableWithReason:
				'La exposición larga no está disponible en este equipo: {reason}',
			unavailable: 'La exposición larga no está disponible en este equipo.',
			interpolationCost:
				'La interpolación inventa fotogramas entre los reales para suavizar la estela. Cuesta tiempo de GPU por fotograma, así que compara el número de muestras reales de la toma guardada con la misma toma sin interpolación: si esa cifra baja, está comprando muestras inventadas con muestras reales.',
			passesAndInterpolation:
				'Las pasadas y la interpolación compiten por el mismo presupuesto por fotograma. Con ambas activadas, cada pasada captura menos fotogramas reales — desactivar la interpolación suele dar una toma mejor con la misma espera.',
			passes:
				'Cada pasada repite el mismo instante y recoge fotogramas que las demás perdieron, de modo que la estela queda más uniforme, no más brillante. Va especialmente bien en obturaciones rápidas, donde una sola pasada recoge pocas muestras.',
			interpolationUnsupported:
				'La interpolación de fotogramas requiere una GPU NVIDIA Turing o más reciente{adapter}. Todo lo demás de la exposición larga funciona con normalidad.',
			interpolationAdapter: ' (esta captura se ejecuta en {adapter})',
			reshade:
				'La exposición larga captura de forma nativa y no usa ReShade, por lo que los efectos de ReShade no aparecerán en el resultado.',
		},
	},

	help: {
		title: 'Ayuda',
		sections: 'Secciones de ayuda',
		tabGeneral: 'General',
		tabLongExposure: 'Exposición larga',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'Ajustes de iRacing',
			borderless: 'iRacing debe ejecutarse en Windowed Borderless',
			vram: 'Se recomiendan al menos 8 GB de VRAM para capturas de 8K o superiores',
			newerContent:
				'Los circuitos y coches más recientes requieren más VRAM',
			shrinkUi:
				'Reduce la interfaz al mínimo antes de hacer la captura si usas la opción de recortar la marca de agua; «Control+PageDown» la reduce. Si no funciona, quizá tengas que restablecer el zoom de la interfaz en los ajustes de iRacing.',

			screenshotFolder: 'Carpeta de capturas',
			screenshotFolderBody:
				'Las capturas se guardan de forma predeterminada en «C:\\Users\\user\\Pictures\\Screenshots»; esto se puede cambiar en los ajustes.',

			screenshotHotkey: 'Atajo de captura',
			screenshotHotkeyBody:
				'De forma predeterminada, «Control + PrintScreen» hace una captura con los ajustes actuales; esto se puede cambiar en los ajustes.',

			issues: 'Problemas',
			issuesBody: 'Si tienes algún problema, comunícalo en el',
			discord: 'Discord',

			instructions: 'Instrucciones',
			step1: 'iRacing <b>debe</b> ejecutarse en modo Windowed Borderless',
			step2: 'Ejecuta iRacing y coloca la cámara en la posición desde la que quieras hacer la captura',
			step3: 'Elige la resolución deseada (prueba resoluciones más bajas antes de pasar a 8K)',
			step4: 'Decide si quieres recortar la marca de agua de iRacing; si es así, primero tendrás que reducir la interfaz de iRacing al tamaño mínimo con «Control + PageDown»',
			step5: 'Pulsa el botón de captura o usa el atajo «Control + PrintScreen» para tomar las capturas',
			step6: 'Según la resolución elegida, esto puede tardar unos segundos; cuando la ventana de iRacing recupere su tamaño normal, habrá terminado',
			step7: 'Tu captura se guardará en «C:\\Users\\{User}\\Pictures\\Screenshots»',
		},

		longExposure: {
			whatItDoes: 'Qué hace',
			whatItDoesBody:
				'Una exposición larga funde muchos fotogramas de una repetición en una sola imagen, igual que dejar abierto el obturador de una cámara: lo que está quieto queda nítido y lo que se mueve deja estela. La herramienta controla la propia repetición, captura cada fotograma que presenta el simulador y los suma en la GPU.',

			shutter: 'Obturación',
			shutterBody:
				'Cuánto dura la exposición <i>en tiempo de repetición</i>, desde una fracción de un fotograma de repetición hasta diez segundos. Este ajuste es el que decide la longitud de las estelas. Las obturaciones más largas también recogen más fotogramas, así que necesitan menos ayuda de todo lo demás; los pasos más rápidos abarcan un único fotograma de repetición y recogen apenas unas pocas muestras.',

			playback: 'Velocidad de reproducción',
			playbackBody:
				'La repetición se reproduce a cámara lenta mientras se captura la exposición, de modo que el simulador presenta más fotogramas por segundo de tiempo de repetición y la mezcla obtiene más muestras. 1/16 recoge unas dieciséis veces más fotogramas que el tiempo real, y tarda dieciséis veces más en tiempo real. Este es el compromiso principal del panel: paciencia a cambio de suavidad.',
			playbackAutoBody:
				'«Automática (según el objetivo de muestras)» elige la velocidad por ti a partir del <b>objetivo de muestras</b>: la herramienta calcula la reproducción más rápida que aún alcanza la cifra que has pedido. Fija una velocidad concreta si prefieres limitar la espera.',

			weighting: 'Ponderación',
			weightingBody:
				'Cuánto aporta cada fotograma capturado al resultado. <b>Box</b> los pondera todos por igual y da una estela uniforme. <b>Lineal</b> aumenta hacia el final de la ventana, de modo que el sujeto queda más nítido donde terminó y se desvanece a lo largo de su trayectoria. <b>Ease</b> es la misma idea con una cabeza más nítida y una cola más larga.',

			interpolation: 'Interpolación de fotogramas',
			interpolationBody:
				'Inventa fotogramas adicionales entre los reales usando el motor de flujo óptico de la GPU, rellenando los huecos de la estela. Requiere una tarjeta NVIDIA Turing o más reciente y se oculta por completo en hardware que no puede hacerlo.',
			interpolationCostBody:
				'No sale gratis: cuesta tiempo de GPU en cada fotograma capturado, y el presupuesto es un fotograma de iRacing. Si no da abasto, empieza a perder fotogramas <i>reales</i> para fabricar otros sintéticos, lo que supone una pérdida neta: la estela sale más corta y más basta. El coste escala con los megapíxeles multiplicados por el factor, así que lo que resulta cómodo a 2560×1440 no es viable en 8K. Para comprobarlo, fotografía el mismo instante dos veces, con y sin, y compara el número de muestras reales; la aplicación también te avisa después si una toma se ha quedado corta.',

			passes: 'Pasadas',
			passesBody:
				'Visita el mismo instante varias veces, acumulando en una sola imagen. Cada pasada recoge fotogramas que las demás no llegaron a captar, así que la estela queda más uniforme, no más brillante, porque el resultado se normaliza según la luz que realmente llegó a cada píxel.',
			passesTradeBody:
				'Las pasadas compran lo mismo que la interpolación, pero con otra moneda: tiempo real en lugar de tiempo de GPU. Ocho pasadas tardan unas ocho veces más, pero nunca pueden costarte fotogramas reales. Eso las convierte en la palanca adecuada en resoluciones altas, donde la interpolación no da abasto, y en obturaciones rápidas, donde una sola pasada recoge muy pocas muestras. Usar ambas a la vez suele ser lo peor de las dos: compiten por el mismo presupuesto por fotograma.',

			bracket: 'Horquillado de obturación',
			bracketBody:
				'Genera una imagen por cada paso de obturación igual o más rápido que el elegido, a partir de una sola captura. Una toma a 1/60 te da también 1/125, 1/250, 1/500 y 1/1000 — el mismo instante con estelas cada vez más cortas — para que elijas el resultado después en lugar de adivinar y repetir la toma.',
			bracketCostBody:
				'Apenas cuesta tiempo adicional. Todos los pasos terminan en el mismo fotograma y solo se diferencian en hasta dónde retroceden, así que una obturación más rápida es simplemente el final de los fotogramas que ya están pasando: todos se rellenan con una sola pasada de la repetición.',
			bracketMemoryBody:
				'Lo que sí cuesta es memoria. Cada paso necesita su propio acumulador a resolución completa, así que once pasos necesitan once veces la memoria de vídeo de uno, que en 8K es más de la que tienen la mayoría de las tarjetas. La captura lo comprueba antes de empezar y se niega en lugar de hacer que iRacing falle; si se rechaza un horquillado, baja la resolución o elige una obturación más rápida, lo que además acorta la escalera.',
			bracketNamingBody:
				'El paso que elegiste se guarda con el nombre habitual y es el que aparece en la galería; los demás quedan junto a él con su obturación en el nombre del archivo.',

			highlights: 'Recuperación de altas luces',
			highlightsBody:
				'Realza las altas luces cercanas al recorte antes de sumar los fotogramas y deshace ese realce al final. iRacing entrega una imagen a la que ya se ha aplicado el mapeo tonal, así que un faro y una pared blanca llegan con el mismo valor; promediar eso convierte una luz intensa que atraviesa parte de la exposición en un borrón gris en lugar de una estela luminosa. Esto devuelve la no linealidad al lugar donde la tiene un sensor real. Se mide en pasos; 0 la desactiva y no cambia absolutamente nada.',

			whatItSaves: 'Qué guarda',
			whatItSavesBody:
				'El tamaño, el recorte de la marca de agua y el formato de archivo siguen los mismos controles que una captura normal: los ajustes de Resolución y Recortar marca de agua de arriba, y el formato de salida en los ajustes. La línea «Salida» en la parte superior de la barra lateral muestra exactamente lo que vas a obtener.',
			whatItSavesPngBody:
				'Elegir PNG escribe un máster real de 16 bits, algo que merece la pena si vas a etalonar la toma después, además de una vista previa de 8 bits para la galería. También es mucho más lento de escribir en resoluciones altas: un PNG de 16 bits y 33 megapíxeles tarda unos diez segundos, mientras que el mismo fotograma en JPEG tarda menos de uno.',

			troubleshooting: 'Si el resultado no se ve bien',
			troubleGhosts:
				'<b>Fantasmas separados en lugar de una estela suave</b> — muy pocas muestras. Usa una velocidad de reproducción más lenta, más pasadas o una resolución más baja.',
			troubleShutter:
				'<b>No sabes qué obturación querías</b> — activa el horquillado de obturación y decide después, con la misma espera.',
			troubleHighlights:
				'<b>Altas luces quemadas o planas</b> — prueba entre 3 y 5 pasos de recuperación de altas luces.',
			troubleBlack:
				'<b>Una imagen negra</b> — iRacing está en pantalla completa exclusiva. Pon Display &gt; Full Screen en OFF.',
			troubleSidecar:
				'Cada toma registra los ajustes exactos que usó, el número de muestras y lo uniformemente que se repartieron, en un archivo .json dentro de la carpeta de registros, junto a app.log. Se conservan las últimas 20 tomas — un horquillado cuenta como una — de modo que la toma por la que preguntas sigue ahí mientras preguntas.',
		},

		faq: {
			blackShot: 'La toma sale negra, pero se ve la interfaz de iRacing',
			blackShotBody:
				'La captura sí funcionó: la interfaz se dibujó, así que llegó un fotograma real a la herramienta. Lo que falta es la escena 3D, porque iRacing la renderizó en negro. Varias de las cámaras menos convencionales hacen esto, y la de la suspensión es la más habitual. Cambia a una cámara normal (cabina, persecución o cualquiera de las cámaras de TV) y repite la toma del mismo momento.',
			blackShotFullscreenBody:
				'Si la imagen sale negra <i>incluida</i> la interfaz y todas las cámaras se comportan igual, la causa es otra: iRacing está en pantalla completa exclusiva, que nada fuera del simulador puede capturar. Pon Display &gt; Full Screen en OFF.',

			cameraReset: 'iRacing mueve mi cámara antes de hacer la captura',
			cameraResetBody:
				'Es la selección automática de planos del propio iRacing, no esta herramienta. Mientras está activada, iRacing sigue eligiendo las cámaras por su cuenta y vuelve a un encuadre por defecto justo cuando arranca la captura, así que lo que obtienes no es la toma que habías preparado.',
			cameraResetFixBody:
				'Desactívala en la herramienta de cámaras de iRacing (Ctrl+F12), en <b>Camera &gt; Config &gt; Preferences</b>: el interruptor <b>Shot Selection</b> etiquetado como <b>Automatic</b>. Con él apagado la cámara se queda exactamente donde la pusiste, tanto en capturas normales como en exposiciones largas.',
		},
	},

	update: {
		checking: 'Buscando actualizaciones…',
		newVersion: 'Una versión nueva',
		availableBusy:
			'{version} está disponible. Hay una captura en curso — podrás descargarla cuando termine.',
		available: '{version} está disponible. Haz clic para descargarla.',
		downloading: 'Descargando {version}…',
		downloadingPercent: 'Descargando {version} — {percent} %',
		downloadedBusy:
			'{version} está lista. Hay una captura en curso, así que se instalará cuando cierres la aplicación.',
		downloaded: '{version} está lista. Haz clic para reiniciar e instalarla.',
		failed: 'Error al buscar actualizaciones: {error}',
		unknownError: 'error desconocido',
		neverChecked: 'Todavía no se han buscado actualizaciones.',
		upToDate: 'Tienes la última versión.',

		alreadyDownloading: 'La actualización ya se está descargando.',
		alreadyDownloaded: 'La actualización ya se ha descargado.',
		nothingToDownload: 'No hay ninguna actualización que descargar.',
		captureInProgress:
			'Hay una captura en curso. Vuelve a intentarlo cuando termine.',
		nothingToInstall: 'No hay ninguna actualización lista para instalar.',
		captureInProgressInstall:
			'Hay una captura en curso. La actualización se instalará sola cuando cierres la aplicación.',
		devBuildOnly:
			'La búsqueda de actualizaciones solo funciona en una versión instalada.',

		installTitle: 'Instalar actualización',
		installMessage: '¿Instalar la versión {version}?',
		installFallbackVersion: 'actualización',
		installDetail:
			'La aplicación se cerrará y volverá a abrirse una vez instalada la actualización. Si eliges «Más tarde», se instalará sola la próxima vez que cierres la aplicación.',
		installConfirm: 'Reiniciar e instalar',
		installLater: 'Más tarde',
	},

	filenameFields: {
		categories: {
			Track: 'Circuito',
			Driver: 'Piloto',
			Session: 'Sesión',
			Meta: 'Meta',
		},
		track: 'Circuito',
		trackFull: 'Circuito completo',
		trackCity: 'Ciudad',
		trackCountry: 'País',
		trackType: 'Tipo de circuito',
		driver: 'Piloto',
		driverAbbrev: 'Piloto abreviado',
		driverInitials: 'Iniciales',
		team: 'Equipo',
		carNumber: 'N.º coche',
		car: 'Coche',
		carFull: 'Coche completo',
		carClass: 'Clase de coche',
		iRating: 'iRating',
		sessionType: 'Tipo de sesión',
		sessionName: 'Nombre de sesión',
		lap: 'Vuelta',
		date: 'Fecha',
		time: 'Hora',
		datetime: 'Fecha+hora',
		counter: 'Contador',
	},

	iracingConfig: {
		projections:
			'Desactiva «Render Scene Using 3 Projections» en iRacing (pestaña Display > Monitor) para evitar bandas verticales en las capturas',
	},

	graphicsProfiles: {
		title: 'Perfiles gráficos',
		description:
			'Guarda configuraciones gráficas de iRacing y cambia entre ellas: una para competir, otra para capturas, otra para grabar vídeo. iRacing carga la configuración al arrancar y la vuelve a escribir al salir, así que un cambio hecho mientras está en marcha se deshace: <b>cambia de configuración solo con el simulador cerrado</b>.',
		iracingRunning:
			'Cierra iRacing antes de cambiar. Al salir reescribe su configuración gráfica, lo que deshacía el cambio.',
		activeHeading: 'Configuración actual',
		active: {
			clean: 'Coincide con tu perfil {name}.',
			modified: {
				one: 'Basada en {name}, con {count} ajuste modificado desde entonces.',
				other: 'Basada en {name}, con {count} ajustes modificados desde entonces.',
			},
			modifiedUnknownCount: 'Basada en {name}, con cambios posteriores.',
			unknown: 'No coincide con ningún perfil guardado.',
			missing: 'No se encontró ninguna configuración gráfica de iRacing.',
		},
		badge: {
			active: 'Activo',
			modified: 'Modificado',
		},
		picker: {
			unknown: 'No matching profile',
			missing: 'No configuration',
		},
		empty: {
			title: 'Aún no hay perfiles guardados.',
			body: 'Guarda tu configuración actual de iRacing como perfil o importa un archivo .ini existente.',
		},
		invalidProfile: 'No es una configuración gráfica',
		warnings: {
			autoCfgIncomplete: 'iRacing lo restablecerá',
		},
		actions: {
			load: 'Cargar',
			overwrite: 'Actualizar desde la actual',
			rename: 'Renombrar',
			export: 'Exportar',
			delete: 'Eliminar',
			save: 'Guardar',
			cancel: 'Cancelar',
			saveCurrent: 'Guardar actual como…',
			import: 'Importar…',
			openFolder: 'Abrir carpeta',
		},
		prompt: {
			namePlaceholder: 'Nombre del perfil',
			deleteConfirm: '¿Eliminar {name}?',
		},
		feedback: {
			loaded: '{name} cargado. Inicia iRacing para que tenga efecto.',
			saved: 'Guardado como {name}.',
			overwritten: '{name} actualizado a partir de la configuración actual.',
			renamed: 'Renombrado a {name}.',
			deleted: '{name} eliminado.',
			imported: 'Importado como {name}.',
			exported: '{name} exportado.',
		},
		errors: {
			empty: 'Introduce un nombre para el perfil.',
			illegalCharacters:
				'El nombre de un perfil no puede contener ninguno de estos caracteres: < > : " / \\ | ? *',
			reservedName: 'Ese nombre está reservado por Windows. Elige otro.',
			trailingDotOrSpace:
				'El nombre de un perfil no puede terminar en punto ni en espacio.',
			tooLong: 'Ese nombre es demasiado largo.',
			duplicate: 'Ya existe un perfil con ese nombre.',
			profileNotFound: 'Ya no se ha podido encontrar ese perfil.',
			profileExists: 'Ya existe un perfil con ese nombre.',
			duplicateContent:
				'Ya existe un perfil con exactamente estos ajustes: {name}.',
			noActiveConfig:
				'No se encontró ninguna configuración gráfica de iRacing que guardar.',
			invalidIni:
				'Ese archivo no es una configuración gráfica de iRacing, así que no se usó.',
			iracingRunning:
				'Cierra iRacing primero: sobrescribiría el cambio al salir.',
			ioError: 'No se pudo escribir el archivo. No se ha cambiado nada.',
		},
	},

	wgc: {
		cursorCaveat:
			'El cursor del ratón puede aparecer en las capturas en esta versión de Windows. Windows 10 versión 2004 añadió el control que lo oculta.',
		addonUnavailable:
			'No se pudo cargar el componente de captura de alta fidelidad en este sistema.',
		osUnsupported:
			'Windows.Graphics.Capture no está disponible en esta versión de Windows. Necesita Windows 10 versión 1903 o posterior.',
		nativeCaptureOff: 'La captura de alta fidelidad (WGC) está desactivada',
	},

	capture: {
		exclusiveFullscreen:
			'iRacing está en pantalla completa exclusiva, así que la captura saldría en negro. En iRacing, pon Display > Full Screen en OFF (usa Borderless o Windowed) y vuelve a intentarlo.',
		exclusiveFullscreenUnattributed:
			'Hay una aplicación en pantalla completa exclusiva, lo que produce una captura en negro. Si iRacing está en pantalla completa, pon Display > Full Screen en OFF (usa Borderless o Windowed) y vuelve a intentarlo.',
		unknownError: 'Error de captura desconocido',
		outputTooSmall: 'La captura es demasiado pequeña ({width}x{height})',
		blackFrame:
			'El fotograma capturado está en negro — puede que la fuente de captura haya fallado (el contenido acelerado por GPU no siempre se puede capturar en algunas configuraciones de Windows)',
		noSource:
			'No se encontró ninguna fuente de captura de escritorio para la ventana {windowId}',
		metadataTimeout:
			'Se agotó el tiempo de espera de los metadatos de vídeo de la captura',
		noVideoFrame: 'El flujo de captura no produjo ningún fotograma de vídeo',
		dimensionTimeout:
			'Se agotó el tiempo de espera de las dimensiones de ventana {width}x{height}; se continúa con {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'Ya hay una captura en curso.',
		needsNativeCapture:
			'La exposición larga necesita la captura de alta fidelidad (WGC). Actívala en los ajustes para usarla.',
		unavailable: 'La exposición larga no está disponible en este equipo.',
		noTelemetry:
			'La exposición larga necesita la telemetría de repetición de iRacing. Comprueba que el simulador está en marcha y dentro de una sesión.',
		windowNotFound: 'No se encontró la ventana de iRacing.',
		cancelled: 'Captura cancelada.',
		seekTimeout:
			'La repetición no llegó al fotograma {frame} a tiempo. Puede que aún se esté cargando.',
		noPasses: 'Una captura debe ejecutar al menos una pasada.',
		playbackStalled:
			'La repetición no se puso en marcha. Comprueba que iRacing no esté pausado por otra herramienta.',
		exposureTimeout:
			'La exposición no llegó al fotograma {frame} en {seconds} s.',
		endedEarly:
			'La exposición terminó antes de llegar al instante seleccionado.',
		noFramesPresented: 'iRacing no presentó ningún fotograma que capturar.',
		subFrameNoSamples:
			'Esta obturación es más corta que un fotograma de repetición, e iRacing no renderizó ninguno dentro de ella. Prueba una velocidad de reproducción más lenta o el siguiente paso de obturación más lento.',
		noSamples:
			'No se acumuló ningún fotograma. Puede que iRacing dejara de renderizar durante la exposición.',
		blankCapture:
			'Todos los fotogramas capturados eran negros, así que no hay imagen que guardar. Comprueba que iRacing esté en modo ventana o sin bordes en lugar de pantalla completa exclusiva, y que aún le quede memoria de vídeo libre a esta resolución: bajar la resolución de captura es lo más rápido de probar.',
		frozenCapture:
			'iRacing mostró {samples} fotogramas durante la exposición, pero todos eran idénticos, así que esta imagen es una foto fija y no una exposición larga. iRacing no renderizó nada nuevo mientras avanzaba la repetición.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'La GPU no devolvió ninguna imagen.',
		bracketShortfall:
			'El horquillado pidió {asked} pasos pero volvieron {returned} — el resto no se pudo resolver, o esta versión del componente de captura es anterior al horquillado.',
	},

	validation: {
		windowBeforeStart:
			'La exposición necesita {frames} fotogramas de repetición antes del instante seleccionado, pero este solo está a {anchor} fotogramas del inicio. Elige un instante posterior o una obturación más rápida.',
		pastEnd:
			'El instante seleccionado está más allá del final de la repetición.',
		sessionChanged:
			'La repetición ha cambiado a otra sesión desde que se preparó esta toma. Vuelve a seleccionar el instante.',
		singleSampleMultiPass:
			'Esta obturación es tan corta que solo cae en ella alrededor de un fotograma por pasada, así que {passes} pasadas recogen aproximadamente {passes} muestras. Una velocidad de reproducción o una obturación más lentas dan muchas más.',
		singleSample:
			'Esta obturación es tan corta que solo caerá un fotograma dentro de ella, así que el resultado no tendrá desenfoque de movimiento. Una velocidad de reproducción o una obturación más lentas aportan muestras.',
		bracketVsInterpolation:
			'El horquillado de obturación y la interpolación de fotogramas {factor}x no pueden funcionar a la vez, así que esta toma se hará sin interpolación. Desactiva el horquillado si los fotogramas intermedios te importan más que los pasos adicionales.',
		passesVsInterpolation:
			'Están activadas tanto las pasadas múltiples como la interpolación {factor}x. Compiten entre sí: la interpolación ralentiza cada pasada lo suficiente como para costarle fotogramas reales, de modo que la misma espera compra menos muestras reales que las pasadas por sí solas. Desactivar la interpolación suele dar una toma mejor.',
		shortOfTarget:
			'Incluso a velocidad 1/{divisor}, esta exposición alcanza unas {samples} muestras, por debajo de las {target} solicitadas. Usa una obturación más lenta para obtener más.',
		longCaptureEscalate:
			'Esta captura reproduce la repetición a velocidad 1/{divisor} durante unos {duration} de tiempo real{passSuffix}, y no se puede acelerar una vez iniciada. {advice}',
		longCaptureWarn:
			'Esta captura tardará unos {duration} de tiempo real a velocidad de reproducción 1/{divisor}{passSuffix}.',
		passSuffix: ', repartidas en {passes} pasadas sobre el mismo instante',
		adviceFewerPasses: 'Menos pasadas terminan antes, con menos muestras.',
		adviceFasterPlayback:
			'Una velocidad de reproducción más rápida termina antes, con menos muestras.',
		pastLogCap:
			'Se prevé que esta captura recoja unas {samples} muestras en {passes} pasadas, más de las {cap} que admite el registro de diagnóstico. La imagen no se ve afectada — solo las cifras de uniformidad y de huecos describirán la primera parte de la captura.',
		interpolationLossy:
			'A este tamaño, la interpolación {factor}x ya le ha costado muestras reales a este equipo. Considera un factor menor, una resolución más baja o más pasadas en su lugar.',
	},

	duration: {
		zero: '0 segundos',
		seconds: {
			one: '{count} segundo',
			other: '{count} segundos',
		},
		minutes: {
			one: '{count} minuto',
			other: '{count} minutos',
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

export default es;
