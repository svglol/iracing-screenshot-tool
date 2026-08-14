// Portuguese (European). Translated from en.ts — see that file's header before
// editing.
//
// Product and technology names stay untranslated: iRacing, ReShade, Discord,
// Windows.Graphics.Capture, WGC, VRAM, GPU, NVIDIA Turing and the file formats.

import type { Catalog } from './index';

const pt: Catalog = {
	notice: {
		danger: 'Problemas',
		warning: 'A ter em conta',
		info: 'Notas',
	},

	promo: {
		greeting: 'Obrigado por usar o iRacing Screenshot Tool!',
		signature: 'Criado e mantido pela AR Media Solutions.',
	},

	changelog: {
		title: 'Registo de alterações',
		untitledRelease: 'Versão',
	},

	gallery: {
		menu: {
			openExternally: 'Abrir noutra aplicação',
			openFolder: 'Abrir pasta',
			copy: 'Copiar',
			delete: 'Eliminar',
		},
		copiedToClipboard: '{name} copiado para a área de transferência',
	},

	sidebar: {
		resolution: 'Resolução',
		width: 'Largura',
		height: 'Altura',
		output: 'Saída:',
		cropWatermark: 'Recortar marca de água',
		keepAspectRatio: 'Manter proporção',
		screenshot: 'Captura',
		custom: 'Personalizada',
		vramStatus: '{adapter}{free} livres de {total}',
		savedSuccessfully: '{name} guardado com sucesso',
		screenshotFailed: 'A captura falhou: {message}',
		errorLogPrefix: 'Registo: ',
		notices: {
			exclusiveFullscreen:
				'O iRacing está em ecrã inteiro exclusivo — as capturas ficarão pretas. No iRacing, coloca Display > Full Screen em OFF (Borderless ou Windowed) para permitir a captura.',
			vramRisk:
				'{resolution} precisa de cerca de {needed} de VRAM adicional, mas só {free} estão livres — o iRacing irá provavelmente ficar sem memória e fechar.',
			vramCaution:
				'{resolution} deixa pouca margem de VRAM ({free} livres) e pode falhar em combinações exigentes de pista e carro.',
			switchResolution: 'Mudar para {resolution}',
			vramStatic:
				'Resoluções elevadas podem fazer o iRacing falhar se ficares sem VRAM. Certas combinações de pista e carro exigem mais VRAM.',
			reshade:
				'Depois de premires o botão de captura no iRacing Screenshot Tool, terás de premir o atalho de captura do ReShade.',
			crop: 'Recortar a marca de água aproxima ligeiramente a imagem final. As zonas junto às margens do ecrã ficarão cortadas.',
			aspectRatio:
				'«Manter proporção» ajusta a altura da captura à proporção do teu monitor (por exemplo 21:9 ultrapanorâmico) em vez do 16:9 predefinido. A resolução escolhida define a largura.',
		},
	},

	settings: {
		title: 'Definições',
		version: 'Versão - {version}',
		changelog: 'Registo de alterações',
		openLogsFolder: 'Abrir pasta de registos',
		checkForUpdates: 'Procurar atualizações',
		updateCheckFailed: 'A procura de atualizações falhou: {message}',

		language: 'Idioma',
		languageDescription:
			'O idioma usado em toda a aplicação. Detetado a partir do Windows no primeiro arranque.',

		screenshotFolder: 'Pasta das capturas',
		selectFolder: 'Escolher pasta',
		screenshotKeybind: 'Atalho de captura',
		editBind: 'Editar atalho',

		customFilenameFormat: 'Formato de nome de ficheiro personalizado',
		customFilenameFormatDescription:
			'Usar um padrão próprio em vez do predefinido ({track}-{driver}-{counter})',
		filenameFieldsHint:
			'Clica nos campos para os adicionar ao formato. Escreve os separadores (-, _, etc.) diretamente.',
		reset: 'Repor',
		preview: 'Pré-visualização:',

		outputFormat: 'Formato de saída',
		formatJpeg: 'JPEG (qualidade máxima)',
		formatPng: 'PNG (sem perdas)',
		formatWebp: 'WebP (qualidade 95%)',

		disableTooltips: 'Ocultar sugestões',
		disableTooltipsDescription: 'Deixa-me em paz, eu sei o que estou a fazer',

		cropTopLeft:
			'Preferir recorte da marca de água no canto superior esquerdo',
		cropTopLeftDescription:
			'Recorta apenas o canto inferior direito (3%). Quando desativado, a captura é recortada por igual em todos os lados (6% no total), dando um resultado centrado.',

		manualWindowRestore: 'Restauro manual da janela',
		manualWindowRestoreDescription:
			'Substitui o restauro automático da janela por uma posição e um tamanho próprios. Útil para quem usa ultrapanorâmico ou Nvidia Surround.',
		left: 'Esquerda',
		top: 'Topo',
		width: 'Largura',
		height: 'Altura',
		restoreNow: 'Restaurar agora',

		nativeCapture: 'Captura de alta fidelidade (WGC)',
		nativeCaptureDescription:
			'Captura cor real sem subamostragem através do Windows.Graphics.Capture em vez do pipeline predefinido (que subamostra a cor). Recorre automaticamente à alternativa se uma captura falhar.',
		nativeCaptureUnavailable:
			'Indisponível neste sistema — a captura de alta fidelidade não pode funcionar aqui.',
		nativeCaptureUnverified:
			'O Windows indica que é suportada, mas uma captura de teste não chegou a devolver resultado. As capturas recorrerão automaticamente à alternativa se continuar a falhar.',

		reshade: 'Modo de compatibilidade com ReShade',
		reshadeDescription:
			'Ao usar o ReShade terás de usar primeiro o atalho do iRacing Screenshot Tool ou premir o botão e, depois de a janela do iRacing ser redimensionada, usar o teu atalho de captura do ReShade.',
		reshadeIni: 'INI do ReShade',
		selectFile: 'Escolher ficheiro',
	},

	longExposure: {
		title: 'Longa exposição',
		shutter: 'Obturador',
		playbackSpeed: 'Velocidade de reprodução',
		playbackAuto: 'Automática (a partir do objetivo de amostras)',
		playbackRealTime: '1x (tempo real)',
		targetSamples: 'Objetivo de amostras',
		advanced: 'Avançado',
		defaultsSummary: '{count} valores predefinidos',

		weighting: 'Ponderação',
		weightingBox: 'Box (uniforme)',
		weightingLinear: 'Linear (nítida no fim)',
		weightingEase: 'Ease (cabeça mais nítida, cauda longa)',

		interpolation: 'Interpolação de fotogramas',
		interpolationOff: 'Desativada',
		interpolation2: '2× (um fotograma intermédio)',
		interpolation4: '4× (três fotogramas intermédios)',
		interpolation8: '8× (sete fotogramas intermédios)',

		passes: 'Passagens',
		passes1: '1 (passagem única)',
		passes2: '2× — o dobro da espera',
		passes4: '4× — quatro vezes a espera',
		passes8: '8× — oito vezes a espera',

		bracket: 'Bracketing de obturador',
		highlightRecovery: 'Recuperação de altas luzes (stops)',

		cancel: 'Cancelar',
		saved: 'Longa exposição guardada — {count} amostras',
		failed: 'A longa exposição falhou',

		modified: {
			weighting_linear: 'linear',
			weighting_ease: 'ease',
			interpolation: 'interpolação {factor}×',
			passes: {
				one: '{count} passagem',
				other: '{count} passagens',
			},
			bracketed: 'bracketing',
			recovery: 'recuperação de {stops} stops',
		},

		progress: {
			working: 'A processar…',
			seeking: 'A procurar…{pass}',
			accumulating: 'A expor… {count} amostras{pass}',
			resolving: 'A revelar…',
			restoring: 'A restaurar a repetição…',
			pass: ' (passagem {current} de {total})',
		},

		notices: {
			needsNativeCapture:
				'A longa exposição precisa da captura de alta fidelidade (WGC), que está desativada. Ativa-a nas definições para poderes usá-la.',
			unavailableWithReason:
				'A longa exposição está indisponível nesta máquina: {reason}',
			unavailable: 'A longa exposição está indisponível nesta máquina.',
			interpolationCost:
				'A interpolação inventa fotogramas entre os reais para suavizar o rasto. Custa tempo de GPU por fotograma, por isso compara o número de amostras reais da captura guardada com a mesma captura sem interpolação: se esse número descer, está a comprar amostras inventadas com amostras reais.',
			passesAndInterpolation:
				'As passagens e a interpolação competem pelo mesmo orçamento por fotograma. Com ambas ativas, cada passagem capta menos fotogramas reais — desativar a interpolação costuma dar uma captura melhor com a mesma espera.',
			passes:
				'Cada passagem repete o mesmo instante e apanha fotogramas que as outras falharam, pelo que o rasto fica mais uniforme e não mais claro. Ideal em obturadores rápidos, onde uma única passagem recolhe pouquíssimas amostras.',
			interpolationUnsupported:
				'A interpolação de fotogramas exige uma GPU NVIDIA Turing ou mais recente{adapter}. Tudo o resto na longa exposição funciona normalmente.',
			interpolationAdapter: ' (esta captura corre em {adapter})',
			reshade:
				'A longa exposição capta de forma nativa e não usa o ReShade, pelo que os efeitos do ReShade não aparecerão no resultado.',
		},
	},

	help: {
		title: 'Ajuda',
		sections: 'Secções de ajuda',
		tabGeneral: 'Geral',
		tabLongExposure: 'Longa exposição',
		tabFaq: 'FAQ',

		general: {
			iracingSettings: 'Definições do iRacing',
			borderless: 'O iRacing tem de estar em Windowed Borderless',
			vram: 'São recomendados pelo menos 8 GB de VRAM para capturas em 8K ou superior',
			newerContent: 'Pistas e carros mais recentes exigem mais VRAM',
			shrinkUi:
				'Reduz a interface ao mínimo antes de captar se usares a opção de recortar a marca de água; «Control+PageDown» reduz-la. Se não resultar, poderás ter de repor o zoom da interface nas definições do iRacing.',

			screenshotFolder: 'Pasta das capturas',
			screenshotFolderBody:
				'Por predefinição, as capturas são guardadas em «C:\\Users\\user\\Pictures\\Screenshots»; isto pode ser alterado nas definições.',

			screenshotHotkey: 'Atalho de captura',
			screenshotHotkeyBody:
				'Por predefinição, «Control + PrintScreen» faz uma captura com as definições atuais; isto pode ser alterado nas definições.',

			issues: 'Problemas',
			issuesBody: 'Se tiveres algum problema, comunica-o no',
			discord: 'Discord',

			instructions: 'Instruções',
			step1: 'O iRacing <b>tem</b> de estar em modo Windowed Borderless',
			step2: 'Inicia o iRacing e coloca a câmara na posição a partir da qual queres captar',
			step3: 'Escolhe a resolução pretendida (experimenta resoluções mais baixas antes de passares a 8K)',
			step4: 'Decide se queres recortar a marca de água do iRacing; se sim, terás primeiro de reduzir a interface do iRacing ao tamanho mínimo com «Control + PageDown»',
			step5: 'Prime o botão de captura ou usa o atalho «Control + PrintScreen» para captar',
			step6: 'Consoante a resolução escolhida, isto pode demorar alguns segundos; quando a janela do iRacing voltar ao tamanho normal, está concluído',
			step7: 'A tua captura será guardada em «C:\\Users\\{User}\\Pictures\\Screenshots»',
		},

		longExposure: {
			whatItDoes: 'O que faz',
			whatItDoesBody:
				'Uma longa exposição funde muitos fotogramas de uma repetição numa só imagem, tal como deixar o obturador de uma câmara aberto: o que está parado fica nítido, o que se move deixa rasto. A ferramenta comanda a própria repetição, capta cada fotograma apresentado pelo simulador e soma-os na GPU.',

			shutter: 'Obturador',
			shutterBody:
				'Quanto tempo dura a exposição <i>em tempo de repetição</i>, de uma fração de um fotograma de repetição até dez segundos. É esta definição que determina o comprimento dos rastos. Obturadores mais lentos recolhem também mais fotogramas, pelo que precisam menos de tudo o que se segue; os passos mais rápidos abrangem um único fotograma de repetição e recolhem apenas um punhado de amostras.',

			playback: 'Velocidade de reprodução',
			playbackBody:
				'A repetição é reproduzida em câmara lenta enquanto a exposição é captada, pelo que o simulador apresenta mais fotogramas por segundo de tempo de repetição e a mistura obtém mais amostras. 1/16 recolhe cerca de dezasseis vezes mais fotogramas do que o tempo real — e demora dezasseis vezes mais em tempo real. É o compromisso principal deste painel: paciência em troca de suavidade.',
			playbackAutoBody:
				'«Automática (a partir do objetivo de amostras)» escolhe a velocidade por ti a partir do <b>objetivo de amostras</b>: a ferramenta calcula a reprodução mais rápida que ainda atinge o número pedido. Define antes uma velocidade explícita se preferires limitar a espera.',

			weighting: 'Ponderação',
			weightingBody:
				'Quanto cada fotograma captado contribui para o resultado. <b>Box</b> pondera-os todos por igual, dando um rasto uniforme. <b>Linear</b> aumenta em direção ao fim da janela, pelo que o motivo fica mais nítido onde terminou e se esbate ao longo do seu percurso. <b>Ease</b> é a mesma ideia com uma cabeça mais nítida e uma cauda mais longa.',

			interpolation: 'Interpolação de fotogramas',
			interpolationBody:
				'Inventa fotogramas adicionais entre os reais usando o motor de fluxo ótico da GPU, preenchendo as falhas ao longo do rasto. Exige uma placa NVIDIA Turing ou mais recente e fica totalmente oculta em hardware que não o consegue fazer.',
			interpolationCostBody:
				'Não é gratuita: custa tempo de GPU em cada fotograma captado, e o orçamento é um fotograma do iRacing. Se não acompanhar, começa a falhar fotogramas <i>reais</i> para fabricar sintéticos, o que é uma perda líquida — o rasto sai mais curto e mais grosseiro. O custo escala com os megapíxeis vezes o fator, pelo que o que é confortável a 2560×1440 não é viável em 8K. Para verificar, capta o mesmo instante duas vezes, com e sem, e compara o número de amostras reais; a aplicação também te avisa depois se uma captura ficou aquém.',

			passes: 'Passagens',
			passesBody:
				'Visita o mesmo instante várias vezes, acumulando numa só imagem. Cada passagem apanha fotogramas que as outras falharam, pelo que o rasto fica mais uniforme — não mais claro, porque o resultado é normalizado pela luz que efetivamente chegou a cada píxel.',
			passesTradeBody:
				'As passagens compram o mesmo que a interpolação, mas noutra moeda: tempo real em vez de tempo de GPU. Oito passagens demoram cerca de oito vezes mais, mas nunca te podem custar fotogramas reais. Isso faz delas a alavanca certa em resoluções altas, onde a interpolação não acompanha, e em obturadores rápidos, onde uma única passagem recolhe muito poucas amostras. Usar as duas ao mesmo tempo é normalmente o pior dos dois mundos — competem pelo mesmo orçamento por fotograma.',

			bracket: 'Bracketing de obturador',
			bracketBody:
				'Produz uma imagem por cada passo de obturador igual ou mais rápido do que o escolhido, a partir de uma única captura. Uma captura a 1/60 dá-te também 1/125, 1/250, 1/500 e 1/1000 — o mesmo instante com rastos progressivamente mais curtos — para que possas escolher o resultado depois, em vez de adivinhar e repetir.',
			bracketCostBody:
				'Não custa praticamente tempo adicional. Todos os passos terminam no mesmo fotograma e diferem apenas em quão atrás alcançam, pelo que um obturador mais rápido é simplesmente a cauda dos fotogramas que já estão a passar — são todos preenchidos numa só passagem da repetição.',
			bracketMemoryBody:
				'O que custa mesmo é memória. Cada passo precisa do seu próprio acumulador em resolução completa, pelo que onze passos precisam de onze vezes a memória de vídeo de um só, o que em 8K é mais do que a maioria das placas tem. A captura verifica isto antes de começar e recusa em vez de fazer o iRacing falhar; se um bracketing for recusado, baixa a resolução ou escolhe um obturador mais rápido — o que também encurta a escada.',
			bracketNamingBody:
				'O passo que escolheste é guardado com o nome habitual e é o que aparece na galeria; os restantes ficam ao lado, com o respetivo obturador no nome do ficheiro.',

			highlights: 'Recuperação de altas luzes',
			highlightsBody:
				'Realça as altas luzes próximas do corte antes de os fotogramas serem somados e desfaz o realce no fim. O iRacing entrega uma imagem à qual já foi aplicado mapeamento tonal, pelo que um farol e uma parede branca chegam com o mesmo valor; fazer a média disso transforma uma luz intensa que atravessa parte da exposição numa mancha cinzenta em vez de um rasto luminoso. Isto devolve a não linearidade ao sítio onde um sensor real a tem. Medida em stops; 0 desativa-a e não altera absolutamente nada.',

			whatItSaves: 'O que guarda',
			whatItSavesBody:
				'Tamanho, recorte da marca de água e formato de ficheiro seguem os mesmos controlos de uma captura normal — as definições Resolução e Recortar marca de água acima e o formato de saída nas definições. A linha «Saída» no topo da barra lateral mostra exatamente o que vais obter.',
			whatItSavesPngBody:
				'Escolher PNG escreve um verdadeiro master de 16 bits, o que compensa se pretenderes fazer correção de cor depois, mais uma pré-visualização de 8 bits para a galeria. É também muito mais lento de escrever em resoluções altas — um PNG de 16 bits com 33 megapíxeis demora cerca de dez segundos, ao passo que o mesmo fotograma em JPEG demora menos de um.',

			troubleshooting: 'Se o resultado parecer errado',
			troubleGhosts:
				'<b>Fantasmas separados em vez de um rasto suave</b> — amostras a menos. Usa uma velocidade de reprodução mais lenta, mais passagens ou uma resolução mais baixa.',
			troubleShutter:
				'<b>Não sabes que obturador querias</b> — ativa o bracketing de obturador e decide depois, com a mesma espera.',
			troubleHighlights:
				'<b>Altas luzes queimadas ou sem contraste</b> — experimenta 3 a 5 stops de recuperação de altas luzes.',
			troubleBlack:
				'<b>Uma imagem preta</b> — o iRacing está em ecrã inteiro exclusivo. Coloca Display &gt; Full Screen em OFF.',
			troubleSidecar:
				'Cada captura regista as definições exatas que usou, o número de amostras e a uniformidade com que caíram, num ficheiro .json na pasta de registos, junto ao app.log. São mantidas as últimas 20 capturas — um bracketing conta como uma — pelo que a captura sobre a qual estás a perguntar ainda lá está enquanto perguntas.',
		},

		faq: {
			blackShot: 'A captura sai preta, mas a interface do iRacing aparece',
			blackShotBody:
				'A captura em si funcionou: a interface foi desenhada, portanto chegou um fotograma real à ferramenta. O que falta é a cena 3D, porque o iRacing a desenhou a preto. Várias das câmaras menos convencionais fazem isto, e a da suspensão é a mais frequente. Muda para uma câmara normal (habitáculo, perseguição ou uma das câmaras de TV) e repete a captura do mesmo momento.',
			blackShotFullscreenBody:
				'Se a imagem sair preta <i>incluindo</i> a interface e todas as câmaras se comportarem da mesma forma, a causa é outra: o iRacing está em ecrã inteiro exclusivo, que nada fora do simulador consegue capturar. Coloca Display &gt; Full Screen em OFF.',

			cameraReset: 'O iRacing mexe na minha câmara antes de fazer a captura',
			cameraResetBody:
				'É a seleção automática de planos do próprio iRacing, não esta ferramenta. Enquanto estiver ligada, o iRacing continua a escolher as câmaras sozinho e volta a um enquadramento predefinido no instante em que a captura começa, pelo que o que recebes não é a captura que tinhas preparado.',
			cameraResetFixBody:
				'Desliga-a na ferramenta de câmaras do iRacing (Ctrl+F12), em <b>Camera &gt; Config &gt; Preferences</b>: o interruptor <b>Shot Selection</b> com a etiqueta <b>Automatic</b>. Com ele desligado a câmara fica exatamente onde a puseste, tanto nas capturas normais como nas longas exposições.',
		},
	},

	update: {
		checking: 'A procurar atualizações…',
		newVersion: 'Uma nova versão',
		availableBusy:
			'{version} está disponível. Está uma captura em curso — poderás transferi-la assim que terminar.',
		available: '{version} está disponível. Clica para a transferir.',
		downloading: 'A transferir {version}…',
		downloadingPercent: 'A transferir {version} — {percent}%',
		downloadedBusy:
			'{version} está pronta. Está uma captura em curso, por isso será instalada quando fechares a aplicação.',
		downloaded: '{version} está pronta. Clica para reiniciar e instalar.',
		failed: 'A procura de atualizações falhou: {error}',
		unknownError: 'erro desconhecido',
		neverChecked:
			'Ainda não foram procuradas atualizações (estás na v{version}).',
		upToDate: 'Estás na versão mais recente (v{version}).',

		alreadyDownloading: 'A atualização já está a ser transferida.',
		alreadyDownloaded: 'A atualização já foi transferida.',
		nothingToDownload: 'Não há nenhuma atualização para transferir.',
		captureInProgress:
			'Está uma captura em curso. Tenta novamente assim que terminar.',
		nothingToInstall: 'Não há nenhuma atualização pronta a instalar.',
		captureInProgressInstall:
			'Está uma captura em curso. A atualização instalar-se-á sozinha quando fechares a aplicação.',
		devBuildOnly:
			'A procura de atualizações só funciona numa versão instalada.',

		installTitle: 'Instalar atualização',
		installMessage: 'Instalar a versão {version}?',
		installFallbackVersion: 'atualização',
		installDetail:
			'A aplicação irá fechar e reabrir assim que a atualização estiver instalada. Se escolheres «Mais tarde», ela instalar-se-á sozinha da próxima vez que fechares a aplicação.',
		installConfirm: 'Reiniciar e instalar',
		installLater: 'Mais tarde',
	},

	filenameFields: {
		categories: {
			Track: 'Pista',
			Driver: 'Piloto',
			Session: 'Sessão',
			Meta: 'Meta',
		},
		track: 'Pista',
		trackFull: 'Pista completa',
		trackCity: 'Cidade',
		trackCountry: 'País',
		trackType: 'Tipo de pista',
		driver: 'Piloto',
		driverAbbrev: 'Piloto abreviado',
		driverInitials: 'Iniciais',
		team: 'Equipa',
		carNumber: 'N.º do carro',
		car: 'Carro',
		carFull: 'Carro completo',
		carClass: 'Classe do carro',
		iRating: 'iRating',
		sessionType: 'Tipo de sessão',
		sessionName: 'Nome da sessão',
		lap: 'Volta',
		date: 'Data',
		time: 'Hora',
		datetime: 'Data+hora',
		counter: 'Contador',
	},

	iracingConfig: {
		projections:
			'Desativa «Render Scene Using 3 Projections» no iRacing (separador Display > Monitor) para evitar bandas verticais nas capturas',
	},

	graphicsProfiles: {
		title: 'Perfis gráficos',
		description:
			'Guarda configurações gráficas do iRacing e alterna entre elas — uma para correr, uma para capturas, uma para gravar vídeo. O iRacing carrega a configuração ao arrancar e volta a escrevê-la ao sair, por isso uma troca feita com ele a correr é desfeita: <b>troca de configuração apenas com o simulador fechado</b>.',
		iracingRunning:
			'Fecha o iRacing antes de trocar. Ao sair, volta a escrever a sua configuração gráfica, o que anularia a alteração.',
		activeHeading: 'Configuração atual',
		active: {
			clean: 'Corresponde ao teu perfil {name}.',
			modified: {
				one: 'Baseada em {name}, com {count} definição alterada desde então.',
				other: 'Baseada em {name}, com {count} definições alteradas desde então.',
			},
			modifiedUnknownCount: 'Baseada em {name}, alterada desde então.',
			unknown: 'Não corresponde a nenhum perfil guardado.',
			missing: 'Não foi encontrada nenhuma configuração gráfica do iRacing.',
		},
		badge: {
			active: 'Ativo',
			modified: 'Alterado',
		},
		empty: {
			title: 'Ainda não há perfis guardados.',
			body: 'Guarda a tua configuração atual do iRacing como perfil ou importa um ficheiro .ini existente.',
		},
		invalidProfile: 'Não é uma configuração gráfica',
		warnings: {
			autoCfgIncomplete: 'Será reposto pelo iRacing',
		},
		actions: {
			load: 'Carregar',
			overwrite: 'Atualizar a partir da atual',
			rename: 'Mudar o nome',
			export: 'Exportar',
			delete: 'Eliminar',
			save: 'Guardar',
			cancel: 'Cancelar',
			saveCurrent: 'Guardar a atual como…',
			import: 'Importar…',
			openFolder: 'Abrir pasta',
		},
		prompt: {
			namePlaceholder: 'Nome do perfil',
			deleteConfirm: 'Eliminar {name}?',
		},
		feedback: {
			loaded: '{name} carregado. Inicia o iRacing para ter efeito.',
			saved: 'Guardado como {name}.',
			overwritten: '{name} atualizado a partir da configuração atual.',
			renamed: 'Nome alterado para {name}.',
			deleted: '{name} eliminado.',
			imported: 'Importado como {name}.',
			exported: '{name} exportado.',
		},
		errors: {
			empty: 'Introduz um nome para o perfil.',
			illegalCharacters:
				'O nome de um perfil não pode conter nenhum destes caracteres: < > : " / \\ | ? *',
			reservedName: 'Esse nome está reservado pelo Windows. Escolhe outro.',
			trailingDotOrSpace:
				'O nome de um perfil não pode terminar com um ponto ou um espaço.',
			tooLong: 'Esse nome é demasiado longo.',
			duplicate: 'Já existe um perfil com esse nome.',
			profileNotFound: 'Já não foi possível encontrar esse perfil.',
			profileExists: 'Já existe um perfil com esse nome.',
			duplicateContent:
				'Já existe um perfil com exatamente estas definições: {name}.',
			noActiveConfig:
				'Não foi encontrada nenhuma configuração gráfica do iRacing para guardar.',
			invalidIni:
				'Esse ficheiro não é uma configuração gráfica do iRacing, por isso não foi usado.',
			iracingRunning:
				'Fecha primeiro o iRacing — ao sair iria substituir a alteração.',
			ioError: 'Não foi possível escrever o ficheiro. Nada foi alterado.',
		},
	},

	wgc: {
		cursorCaveat:
			'O cursor do rato pode aparecer nas capturas nesta versão do Windows. O Windows 10 versão 2004 acrescentou o controlo que o oculta.',
		addonUnavailable:
			'Não foi possível carregar o componente de captura de alta fidelidade neste sistema.',
		osUnsupported:
			'O Windows.Graphics.Capture não está disponível nesta versão do Windows. Requer o Windows 10 versão 1903 ou mais recente.',
		nativeCaptureOff: 'A captura de alta fidelidade (WGC) está desativada',
	},

	capture: {
		exclusiveFullscreen:
			'O iRacing está em ecrã inteiro exclusivo, pelo que a captura ficaria preta. No iRacing, coloca Display > Full Screen em OFF (usa Borderless ou Windowed) e tenta novamente.',
		exclusiveFullscreenUnattributed:
			'Há uma aplicação em ecrã inteiro exclusivo, o que produz uma captura preta. Se o iRacing estiver em ecrã inteiro, coloca Display > Full Screen em OFF (usa Borderless ou Windowed) e tenta novamente.',
		unknownError: 'Erro de captura desconhecido',
		outputTooSmall: 'A captura é demasiado pequena ({width}x{height})',
		blackFrame:
			'O fotograma captado está preto — a fonte de captura pode ter falhado (em algumas configurações do Windows, o conteúdo acelerado por GPU não se deixa captar)',
		noSource:
			'Não foi encontrada nenhuma fonte de captura do ambiente de trabalho para a janela {windowId}',
		metadataTimeout:
			'Tempo esgotado à espera dos metadados de vídeo da captura',
		noVideoFrame: 'O fluxo de captura não produziu nenhum fotograma de vídeo',
		dimensionTimeout:
			'Tempo esgotado à espera das dimensões de janela {width}x{height}; a prosseguir com {actualWidth}x{actualHeight}',
	},

	longExposureCapture: {
		busy: 'Já está uma captura em curso.',
		needsNativeCapture:
			'A longa exposição precisa da captura de alta fidelidade (WGC). Ativa-a nas definições para a usares.',
		unavailable: 'A longa exposição não está disponível nesta máquina.',
		noTelemetry:
			'A longa exposição precisa da telemetria de repetição do iRacing. Verifica se o simulador está a correr e dentro de uma sessão.',
		windowNotFound: 'Janela do iRacing não encontrada.',
		cancelled: 'Captura cancelada.',
		seekTimeout:
			'A repetição não chegou ao fotograma {frame} a tempo. Pode ainda estar a carregar.',
		noPasses: 'Uma captura tem de executar pelo menos uma passagem.',
		playbackStalled:
			'A repetição não começou a reproduzir. Verifica se o iRacing não foi colocado em pausa por outra ferramenta.',
		exposureTimeout:
			'A exposição não chegou ao fotograma {frame} em {seconds} s.',
		endedEarly:
			'A exposição terminou antes de alcançar o instante selecionado.',
		noFramesPresented:
			'O iRacing não apresentou nenhum fotograma para captar.',
		subFrameNoSamples:
			'Este obturador é mais curto do que um fotograma de repetição, e o iRacing não desenhou nenhum dentro dele. Experimenta uma velocidade de reprodução mais lenta, ou o passo de obturador imediatamente mais lento.',
		noSamples:
			'Não foi acumulado nenhum fotograma. O iRacing pode ter deixado de desenhar durante a exposição.',
		blankCapture:
			'Todos os fotogramas captados estavam pretos, por isso não há imagem para guardar. Verifique se o iRacing está em modo de janela ou sem margens em vez de ecrã inteiro exclusivo e se ainda tem memória de vídeo livre nesta resolução — baixar a resolução de captura é o mais rápido de experimentar.',
		frozenCapture:
			'O iRacing apresentou {samples} fotogramas durante a exposição, mas eram todos iguais, pelo que esta imagem é uma fotografia estática e não uma exposição longa. O iRacing não desenhou nada de novo enquanto a repetição avançava.',
		withNativeError: '{reason} ({error})',
		resolveFailed: 'A GPU não devolveu nenhuma imagem.',
		bracketShortfall:
			'O bracketing pediu {asked} passos mas voltaram {returned} — os restantes não se resolveram, ou esta versão do componente de captura é anterior ao bracketing.',
	},

	validation: {
		windowBeforeStart:
			'A exposição precisa de {frames} fotogramas de repetição antes do instante selecionado, mas este está apenas a {anchor} fotogramas do início. Escolhe um instante posterior ou um obturador mais rápido.',
		pastEnd: 'O instante selecionado está para além do fim da repetição.',
		sessionChanged:
			'A repetição mudou para outra sessão desde que esta captura foi preparada. Volta a selecionar o instante.',
		singleSampleMultiPass:
			'Este obturador é tão curto que só cai nele cerca de um fotograma por passagem, pelo que {passes} passagens recolhem aproximadamente {passes} amostras. Uma velocidade de reprodução ou um obturador mais lentos rendem muito mais.',
		singleSample:
			'Este obturador é tão curto que só um fotograma cairá dentro dele, pelo que o resultado não terá desfoque de movimento. Uma velocidade de reprodução ou um obturador mais lentos rendem amostras.',
		bracketVsInterpolation:
			'O bracketing de obturador e a interpolação de fotogramas {factor}x não podem funcionar em conjunto, pelo que esta captura será feita sem interpolação. Desativa o bracketing se os fotogramas intermédios te importarem mais do que os passos adicionais.',
		passesVsInterpolation:
			'Estão ativas tanto as passagens múltiplas como a interpolação {factor}x. Competem entre si: a interpolação abranda cada passagem o suficiente para lhe custar fotogramas reais, pelo que a mesma espera compra menos amostras reais do que as passagens sozinhas. Desativar a interpolação costuma dar uma captura melhor.',
		shortOfTarget:
			'Mesmo à velocidade 1/{divisor}, esta exposição chega a cerca de {samples} amostras, aquém das {target} pedidas. Usa um obturador mais lento para obteres mais.',
		longCaptureEscalate:
			'Esta captura reproduz a repetição à velocidade 1/{divisor} durante cerca de {duration} de tempo real{passSuffix}, e não pode ser acelerada depois de iniciada. {advice}',
		longCaptureWarn:
			'Esta captura demorará cerca de {duration} de tempo real à velocidade de reprodução 1/{divisor}{passSuffix}.',
		passSuffix:
			', distribuídas por {passes} passagens sobre o mesmo instante',
		adviceFewerPasses:
			'Menos passagens terminam mais cedo, com menos amostras.',
		adviceFasterPlayback:
			'Uma velocidade de reprodução mais alta termina mais cedo, com menos amostras.',
		pastLogCap:
			'Prevê-se que esta captura recolha cerca de {samples} amostras ao longo de {passes} passagens, acima das {cap} que o registo de diagnóstico comporta. A imagem não é afetada — apenas os valores de uniformidade e de intervalo descreverão a primeira parte da captura.',
		interpolationLossy:
			'Neste tamanho, a interpolação {factor}x já custou amostras reais a esta máquina. Considera um fator mais baixo, uma resolução mais baixa ou, em alternativa, mais passagens.',
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
};

export default pt;
