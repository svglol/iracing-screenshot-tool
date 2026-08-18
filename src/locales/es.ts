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

			tripleBands: 'There are vertical bands in my triple-screen shots',
			tripleBandsBody:
				'They are a side effect of two iRacing settings working together: multi-projection (the SMP setting) and bezel correction. On the monitors themselves the picture looks right — the correction exists to line the scene up across the physical frames — but in the captured image the corrected regions show up as vertical bands where one screen meets the next.',
			tripleBandsFixBody:
				"Either change fixes it: set the <b>bezel width</b> to <b>0 mm</b> in iRacing's graphics options, which takes effect immediately, or turn off <b>multi-projection (SMP)</b>, which takes effect after an iRacing restart.",
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
			unknown: 'Ningún perfil coincide',
			missing: 'Sin configuración',
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
		title: 'Editor de configuración de iRacing',
		nav: {
			home: 'Capturas',
			config: 'Configuración de iRacing',
		},
		tabs: {
			monitor: 'Monitor / Pantalla',
			graphics: 'Gráficos',
		},
		mode: {
			label: 'Editando ahora la configuración:',
			// Mode names come from iRacing's own filenames; Legacy is the bare
			// rendererDX11.ini only old-website launches still read.
			legacy: 'Antigua',
		},
		actions: {
			save: 'Guardar cambios',
			discard: 'Descartar',
			reload: 'Recargar',
			browse: 'Examinar…',
		},
		state: {
			dirty: {
				one: '{count} cambio sin guardar',
				other: '{count} cambios sin guardar',
			},
			saved: 'Cambios guardados en {file}',
			simRunning:
				'iRacing está en marcha. Mantiene estos ajustes en memoria y reescribe el archivo al salir, así que los cambios hechos ahora se perderían. Cierra iRacing para editar.',
			stale: 'Este archivo ha cambiado en el disco desde que se cargó — normalmente porque iRacing lo reescribe al salir. Recarga para ver los valores actuales.',
			keyMissing: 'No está presente en este archivo',
			noModes:
				'No se encontró ningún archivo de configuración de renderizado en {folder}. Inicia iRacing una vez para crearlos, o indícale a la herramienta cuál es tu carpeta de iRacing.',
			loadFailed: 'No se pudo leer el archivo de configuración.',
			discardConfirm: '¿Descartar {count} cambios sin guardar?',
		},
		folder: {
			label: 'Carpeta de iRacing',
			autoDetected: 'Detectada automáticamente',
			reset: 'Usar detección automática',
			help: 'Donde iRacing guarda sus archivos de configuración. Déjalo vacío para detectar automáticamente la carpeta Documents\\iRacing.',
		},
		errors: {
			iracingRunning:
				'Cierra iRacing primero: sobrescribiría el cambio al salir.',
			staleFile:
				'El archivo ha cambiado en el disco desde que se cargó. Recarga e inténtalo de nuevo.',
			validationFailed:
				'Uno de los valores no es válido. No se ha cambiado nada.',
			keyNotFound:
				'Faltaba un ajuste en el archivo, así que no se ha cambiado nada. Recarga e inténtalo de nuevo.',
			fileNotFound: 'El archivo de configuración ya no existe.',
			ioError: 'No se pudo escribir el archivo. No se ha cambiado nada.',
		},
		groups: {
			window: 'Posición de la ventana',
			fullscreen: 'Pantalla completa',
			quality: 'Calidad y detalle',
			aa: 'Suavizado y nitidez',
			post: 'Posprocesado',
			perf: 'Rendimiento',
			misc: 'Varios',
		},
		// Shared tier vocabulary for enum settings.
		levels: {
			off: 'Desactivado',
			low: 'Bajo',
			medium: 'Medio',
			high: 'Alto',
			max: 'Máximo',
			ultra: 'Ultra',
		},
		nvReflex: {
			off: 'Desactivado',
			on: 'Activado',
			onBoost: 'Boost',
		},
		shadowDetail: {
			fewer: 'Menos sombras',
			maximum: 'Sombras al máximo',
		},
		aaMethod: {
			none: 'Ninguno',
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
			soft: 'Suave',
			neutral: 'Neutro',
			sharp: 'Nítido',
			simple: 'Simple',
		},
		dnsmFilter: {
			off: 'Desactivado',
			simple: 'Simple',
			pcf4: 'PCF4',
			pcf4p: 'PCF4P',
			pcf8p: 'PCF8P',
			pcf16p: 'PCF16P',
		},
		dynamicShadowMaps: {
			off: 'Desactivados',
			mainView: 'En la vista principal',
			mainViewMirrors: 'En la vista principal y los retrovisores',
		},
		hideObstructions: {
			none: 'Ninguna',
			halo: 'Ocultar el halo',
			pillarRollcage: 'Ocultar los pilares A y la jaula antivuelco',
			everything: 'Ocultarlo todo',
		},
		replayScope: {
			label: 'Aplicar también a los gráficos de repetición',
		},
		// Inline hints under a field whose pending value cannot be saved. Only
		// numeric inputs can go invalid (switches and dropdowns cannot), and
		// every bounded numeric in the schema carries both bounds.
		invalid: {
			intRange: 'Introduce un número entero entre {min} y {max}.',
			int: 'Introduce un número entero.',
			floatRange: 'Introduce un número entre {min} y {max}.',
			float: 'Introduce un número.',
		},
		layout: {
			title: 'Disposición de los monitores',
			primary: 'Principal',
			windowTarget: 'Ventana de iRacing',
			estimated:
				'Estimada — Windows e iRacing numeran las pantallas de forma distinta, así que el resaltado se determina por posición.',
		},
		settings: {
			display: {
				border: { label: 'Borde de la ventana' },
				windowedXPos: { label: 'Margen izquierdo de la ventana' },
				windowedYPos: { label: 'Margen superior de la ventana' },
				windowedWidth: { label: 'Ancho de la ventana' },
				windowedHeight: { label: 'Alto de la ventana' },
				windowedMaximized: { label: 'Iniciar maximizada' },
				windowedAlignment: {
					label: 'Alineación de la ventana',
					help: 'iRacing no documenta este valor. Déjalo como está a menos que sepas qué índice de alineación quieres.',
				},
				fullScreen: { label: 'Pantalla completa' },
				fullScreenWidth: { label: 'Ancho en pantalla completa' },
				fullScreenHeight: { label: 'Alto en pantalla completa' },
				fullScreenDepth: {
					label: 'Profundidad de color en pantalla completa',
					help: 'Bits por píxel. 32 en prácticamente cualquier sistema moderno.',
				},
				RefreshRate: {
					label: 'Frecuencia de actualización',
					help: '0 usa la frecuencia de actualización predeterminada de la pantalla.',
				},
			},
			graphics: {
				ShaderQuality: { label: 'Calidad del sombreado' },
				ShadowDetail: { label: 'Detalle de las sombras' },
				DynamicShadowMaps: {
					label: 'Mapas de sombras dinámicas',
					help: 'Mapas de sombras para los coches y otros objetos en movimiento. Solo de día.',
				},
				DNSMFilter: {
					label: 'Filtro de mapas de sombras',
					help: 'El filtro usado para los mapas de sombras dinámicas nocturnas.',
				},
				CarDetail: { label: 'Detalle de los coches' },
				PitObjectDetail: { label: 'Detalle de los objetos de boxes' },
				CrowdDetail: { label: 'Detalle del público' },
				GrandstandDetail: { label: 'Detalle de las gradas' },
				ObjectDetail: { label: 'Detalle de los objetos' },
				FoliageDetail: { label: 'Detalle de la vegetación' },
				ParticleDetail: { label: 'Detalle de las partículas' },
				ParticlesFullRes: { label: 'Partículas a resolución completa' },
				MirrorDetail: { label: 'Más detalle en los retrovisores' },
				MaxCockpitMirrors: { label: 'Máximo de retrovisores en la cabina' },
				AntiAliasMethod: { label: 'Método de suavizado' },
				MSAASamples: { label: 'Muestras de MSAA' },
				MSAAUseFilter: { label: 'Filtro de MSAA' },
				Sharpening: { label: 'Nitidez' },
				SharpeningAmount: {
					label: 'Cantidad de nitidez',
					help: 'Intensidad del filtro de nitidez.',
				},
				FSRSharpness: {
					label: 'Nitidez de FSR',
					help: 'Nitidez usada cuando el escalado de resolución amplía con FSR.',
				},
				AutoExposure: {
					label: 'Exposición automática',
					help: 'Solo funciona mientras el renderizado HDR está activado.',
				},
				SSAO: { label: 'Oclusión ambiental (SSAO)' },
				SSRLevel: {
					label: 'Reflejos en espacio de pantalla',
					help: 'Bajo renderiza los reflejos a menor resolución; Alto, a resolución completa.',
				},
				SSRRainOnly: {
					label: 'Reflejos solo con lluvia',
					help: 'Limita los reflejos en espacio de pantalla a la pista mojada: las opciones Low Rain y High Rain del simulador.',
				},
				HeatHaze: { label: 'Distorsión por calor' },
				DepthOfField: { label: 'Profundidad de campo' },
				MotionBlurStrength: {
					label: 'Intensidad del desenfoque de movimiento',
				},
				Distortion: { label: 'Distorsión de lente' },
				EnableHDR: { label: 'Renderizado HDR' },
				LimitFrameRate: { label: 'Limitar la tasa de fotogramas' },
				DesiredFPSLimit: { label: 'Límite de la tasa de fotogramas' },
				VerticalSync: { label: 'Sincronización vertical' },
				NvReflexMode: { label: 'NVIDIA Reflex' },
				MaxPreRenderedFrames: {
					label: 'Máximo de fotogramas prerrenderizados',
					help: 'Cuántos fotogramas puede la GPU ir por detrás de la CPU. 1 es lo normal; 0 desactiva la cola para configuraciones multi-GPU.',
				},
				SysMemToUseMB: { label: 'Memoria del sistema a usar' },
				VidMemToUseMB: { label: 'Memoria de vídeo a usar' },
				MaxCarsToDraw: { label: 'Máximo de coches a dibujar' },
				MaxCarsToDrawInMirrors: {
					label: 'Máximo de coches en los retrovisores',
				},
				VirtualMirrors: { label: 'Retrovisores virtuales' },
				UIScale: { label: 'Escala de la UI' },
				EnableTireMarks: { label: 'Marcas de neumáticos' },
				HideCockpitObstructions: {
					label: 'Ocultar obstrucciones de la cabina',
				},
				HeadlightLevel: { label: 'Calidad de los faros' },
			},
		},
	},
};

export default es;
